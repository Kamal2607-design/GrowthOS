import { db } from '../prisma/db.ts';

import {
  searchMemories,
} from './memory-retrieval.service.js';

const DEFAULT_MEMORY_LIMIT = 5;
const DEFAULT_REFLECTION_LIMIT = 5;
const DEFAULT_ACTION_LIMIT = 10;

const OPEN_ACTION_STATUSES = ['pending', 'in_progress'];

function timeOf(value) {
  const time = new Date(String(value ?? '')).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function newestFirst(field) {
  return (a, b) => timeOf(b[field]) - timeOf(a[field]);
}

/*
 * A memory-search failure (for example the embedding model being
 * offline) must not fail the whole request, but it must not look like
 * "no relevant memories" either.
 */
async function searchMemoriesSafely(userId, query) {
  try {
    const result = await searchMemories(userId, query, DEFAULT_MEMORY_LIMIT);
    return { memories: result.results, memoryStatus: 'available' };
  } catch (error) {
    console.error('Context memory search failed:', error.message);
    return { memories: [], memoryStatus: 'unavailable' };
  }
}

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
    searchMemoriesSafely(
      userId,
      normalizedQuery
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
  // Open actions first (newest first), then the most recently
  // finished ones; cancelled actions are not useful context.
  const relevantActions = actions.filter(
    (action) =>
      action.status !== 'cancelled' &&
      (action.goalId === null || activeGoalIds.has(action.goalId))
  );

  const recentActions = [
    ...relevantActions
      .filter((action) => OPEN_ACTION_STATUSES.includes(action.status))
      .sort(newestFirst('createdAt')),
    ...relevantActions
      .filter((action) => !OPEN_ACTION_STATUSES.includes(action.status))
      .sort(newestFirst('completedAt')),
  ].slice(0, DEFAULT_ACTION_LIMIT);

  const recentReflections = [...reflections]
    .sort(newestFirst('reflectionDate'))
    .slice(0, DEFAULT_REFLECTION_LIMIT);

  return {
    query: normalizedQuery,

    memories: memoryResult.memories,

    memoryStatus: memoryResult.memoryStatus,

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