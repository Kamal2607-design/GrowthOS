import { db } from '../prisma/db.ts';

import {
  generateActionSuggestions,
} from './ai/action-suggestion-ai.service.js';

import {
  createActionSuggestion,
} from './action-suggestion.service.js';

import {
  filterNewSuggestions,
  loadOpenTitles,
} from './suggestion-dedupe.service.js';

/**
 * Asks Qwen for actions toward one goal and stores the new ones as pending
 * suggestions. Suggestions that repeat open work are skipped, and the batch
 * is written in one transaction. Nothing becomes an Action until the user
 * accepts it.
 */
export async function generateGoalActionSuggestions(
  userId,
  goalId,
  dependencies = {},
) {
  const generate =
    dependencies.generateActionSuggestions ?? generateActionSuggestions;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('INVALID_USER_ID');
  }

  if (!Number.isInteger(goalId) || goalId <= 0) {
    throw new Error('INVALID_GOAL_ID');
  }

  const goal = await db.orm.public.Goal.first({ id: goalId, userId });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  const [vision, openTitles] = await Promise.all([
    db.orm.public.Vision.first({ userId }),
    loadOpenTitles(db, userId),
  ]);

  const candidates = await generate({
    vision,
    goal,
    existingTitles: openTitles,
  });

  return db.transaction(async (tx) => {
    // Re-read inside the transaction so concurrent requests cannot both
    // insert the same suggestion.
    const { fresh, skipped } = filterNewSuggestions(
      candidates,
      await loadOpenTitles(tx, userId),
    );

    const suggestions = [];

    for (const candidate of fresh) {
      suggestions.push(
        await createActionSuggestion(
          userId,
          {
            goalId,
            title: candidate.title,
            description: candidate.description,
            reasoning: candidate.reasoning,
            priority: candidate.priority,
            source: 'ai',
          },
          tx,
        ),
      );
    }

    return {
      suggestions,
      skippedCount: skipped.length,
    };
  });
}
