import { db } from '../prisma/db.ts';

import {
  searchMemories,
} from './memory-retrieval.service.js';

const DEFAULT_MEMORY_LIMIT = 5;
const DEFAULT_REFLECTION_LIMIT = 5;
const DEFAULT_ACTION_LIMIT = 10;

export async function assembleContext(
  userId,
  query
) {
  if (!Number.isInteger(userId)) {
    throw new Error('INVALID_USER_ID');
  }

  if (
    !query ||
    typeof query !== 'string' ||
    !query.trim()
  ) {
    throw new Error('CONTEXT_QUERY_REQUIRED');
  }

  const normalizedQuery = query.trim();

  const [
    memoryResult,
    vision,
    goals,
    actions,
    reflections,
  ] = await Promise.all([
    searchMemories(
      userId,
      normalizedQuery,
      DEFAULT_MEMORY_LIMIT
    ),

    db.orm.public.Vision.first({
      userId,
    }),

    db.orm.public.Goal
      .where({
        userId,
      })
      .all(),

    db.orm.public.Action
      .where({
        userId,
      })
      .all(),

    db.orm.public.Reflection
      .where({
        userId,
      })
      .all(),
  ]);

  const activeGoals = goals.filter(
    (goal) =>
      goal.status === 'active'
  );

  const activeGoalIds = new Set(
    activeGoals.map(
        (goal) => goal.id
    )
    );
    const recentActions =
    actions
        .filter(
        (action) =>
            action.goalId === null ||
            activeGoalIds.has(action.goalId)
        )
        .slice(
        0,
        DEFAULT_ACTION_LIMIT
        );

  const recentReflections =
    reflections.slice(
      0,
      DEFAULT_REFLECTION_LIMIT
    );

  return {
    query: normalizedQuery,

    memories: memoryResult.results,

    vision: vision
      ? {
          id: vision.id,
          statement: vision.statement,
          values: vision.values,
          identity: vision.identity,
          futureSelf: vision.futureSelf,
        }
      : null,

    goals: activeGoals,

    actions: recentActions,

    reflections: recentReflections,
  };
}