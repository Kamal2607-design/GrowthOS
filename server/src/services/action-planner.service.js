import { db } from '../prisma/db.ts';

import {
  assembleContext,
} from './context-assembly.service.js';

import {
  generateActionPlan,
} from './ai/action-planner-ai.service.js';

import {
  createActionSuggestion,
} from './action-suggestion.service.js';

import {
  filterNewSuggestions,
  loadOpenTitles,
} from './suggestion-dedupe.service.js';

import {
  assessSuggestionGoalRelevance,
} from './ai/daily-planner-goal-relevance.service.js';

/**
 * Rejects the whole plan if any suggestion references a goal
 * outside the assembled context. Runs before anything is written.
 */
export function assertValidPlannerGoalReferences(
  suggestions,
  goals
) {
  const validGoalIds =
    new Set(
      (goals ?? []).map(
        (goal) => goal.id
      )
    );

  for (const suggestion of suggestions) {
    const goalId =
      suggestion.goalId;

    if (
      goalId !== null &&
      !validGoalIds.has(goalId)
    ) {
      console.error(
        'Invalid AI goal reference:',
        {
          goalId,
          validGoalIds: [
            ...validGoalIds,
          ],
        }
      );

      throw new Error(
        'AI_SUGGESTION_REFERENCES_INVALID_GOAL'
      );
    }
  }
}

export async function generateActionSuggestions(
  userId,
  query
) {
  if (!Number.isInteger(userId)) {
    throw new Error(
      'INVALID_USER_ID'
    );
  }

  if (
    !query ||
    typeof query !== 'string' ||
    !query.trim()
  ) {
    throw new Error(
      'ACTION_PLANNER_QUERY_REQUIRED'
    );
  }

  const normalizedQuery =
    query.trim();

  /*
   * 1. Build the user's current context.
   */
  const context =
    await assembleContext(
      userId,
      normalizedQuery
    );

  /*
   * 2. Ask Qwen for possible next actions.
   */
  const plan =
    await generateActionPlan(
      context
    );

  /*
   * 3. Validate goal IDs for the whole
   *    plan before creating any records.
   */
  assertValidPlannerGoalReferences(
    plan.suggestions,
    context.goals
  );

  /*
   * 4. A suggestion filed under a test goal or an
   *    unrelated goal keeps its content but loses
   *    the goal link.
   */
  const candidates = plan.suggestions.map(
    (suggestion) => {
      const relevance =
        assessSuggestionGoalRelevance(
          suggestion,
          context.goals
        );

      return relevance.reason === 'placeholder_goal' ||
        relevance.reason === 'domain_mismatch'
        ? { ...suggestion, goalId: null }
        : suggestion;
    }
  );

  /*
   * 5. Skip anything that repeats open work, then
   *    persist the rest in one transaction so a
   *    failure leaves none of them behind.
   */
  let skippedCount = 0;

  const suggestions =
    await db.transaction(async (tx) => {
      const { fresh, skipped } =
        filterNewSuggestions(
          candidates,
          await loadOpenTitles(tx, userId)
        );

      skippedCount = skipped.length;

      const created = [];

      for (
        const suggestion
          of fresh
      ) {
        const createdSuggestion =
          await createActionSuggestion(
            userId,
            {
              title:
                suggestion.title,

              description:
                suggestion.description,

              goalId:
                suggestion.goalId,

              priority:
                suggestion.priority,

              reasoning:
                suggestion.reasoning,

              source: 'ai',
            },
            tx
          );

        created.push(
          createdSuggestion
        );
      }

      return created;
    });

  return {
    query: normalizedQuery,
    suggestions,
    skippedCount,
  };
}