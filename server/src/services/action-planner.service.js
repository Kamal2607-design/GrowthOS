import {
  assembleContext,
} from './context-assembly.service.js';

import {
  generateActionPlan,
} from './ai/action-planner-ai.service.js';

import {
  createActionSuggestion,
} from './action-suggestion.service.js';

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
   * 3. Validate goal IDs against the
   *    actual context before creating
   *    database records.
   */
  const validGoalIds =
    new Set(
      context.goals.map(
        (goal) => goal.id
      )
    );

  const suggestions = [];

  for (
    const suggestion
      of plan.suggestions
  ) {
    let goalId =
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

    const createdSuggestion =
      await createActionSuggestion(
        userId,
        {
          title:
            suggestion.title,

          description:
            suggestion.description,

          goalId,

          priority:
            suggestion.priority,

          reasoning:
            suggestion.reasoning,

          source: 'ai',
        }
      );

    suggestions.push(
      createdSuggestion
    );
  }

  return {
    query: normalizedQuery,
    suggestions,
  };
}