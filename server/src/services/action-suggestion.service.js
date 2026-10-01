import { db } from '../prisma/db.ts';

const VALID_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'expired',
];

const VALID_SOURCES = [
  'ai',
  'manual',
];

async function verifyGoalOwnership(userId, goalId) {
  if (goalId === null || goalId === undefined) {
    return;
  }

  const goal = await db.orm.public.Goal.first({
    id: goalId,
    userId,
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }
}

async function verifyReflectionOwnership(
  userId,
  reflectionId
) {
  if (
    reflectionId === null ||
    reflectionId === undefined
  ) {
    return;
  }

  const reflection =
    await db.orm.public.Reflection.first({
      id: reflectionId,
      userId,
    });

  if (!reflection) {
    throw new Error('REFLECTION_NOT_FOUND');
  }
}

export async function createActionSuggestion(
  userId,
  {
    title,
    description,
    goalId,
    reflectionId,
    priority,
    reasoning,
    source,
  }
) {
  if (!title || !title.trim()) {
    throw new Error(
      'SUGGESTION_TITLE_REQUIRED'
    );
  }

  if (
    goalId !== undefined &&
    goalId !== null &&
    !Number.isInteger(goalId)
  ) {
    throw new Error('INVALID_GOAL_ID');
  }

  if (
    reflectionId !== undefined &&
    reflectionId !== null &&
    !Number.isInteger(reflectionId)
  ) {
    throw new Error(
      'INVALID_REFLECTION_ID'
    );
  }

  const suggestionSource =
    source || 'ai';

  if (!VALID_SOURCES.includes(suggestionSource)) {
    throw new Error(
      'INVALID_SUGGESTION_SOURCE'
    );
  }

  await verifyGoalOwnership(
    userId,
    goalId
  );

  await verifyReflectionOwnership(
    userId,
    reflectionId
  );

  const suggestion =
    await db.orm.public.ActionSuggestion.create({
      userId,

      goalId:
        goalId ?? null,

      reflectionId:
        reflectionId ?? null,

      title: title.trim(),

      description:
        description?.trim() || null,

      priority:
        priority ?? 0,

      reasoning:
        reasoning?.trim() || null,

      status: 'pending',

      source: suggestionSource,
    });

  return suggestion;
}

export async function getActionSuggestions(
  userId,
  {
    status,
    goalId,
    reflectionId,
  } = {}
) {
  const filter = {
    userId,
  };

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error('INVALID_SUGGESTION_STATUS');
    }

    filter.status = status;
  }

  if (goalId !== undefined) {
    if (!Number.isInteger(goalId)) {
      throw new Error('INVALID_GOAL_ID');
    }

    filter.goalId = goalId;
  }

  if (reflectionId !== undefined) {
  if (!Number.isInteger(reflectionId)) {
    throw new Error('INVALID_REFLECTION_ID');
  }

  filter.reflectionId = reflectionId;
}

  const suggestions =
    await db.orm.public.ActionSuggestion
      .where(filter)
      .all();

  return suggestions;
}

export async function getActionSuggestionById(
  userId,
  suggestionId
) {
  const suggestion =
    await db.orm.public.ActionSuggestion.first({
      id: suggestionId,
      userId,
    });

  if (!suggestion) {
    throw new Error('SUGGESTION_NOT_FOUND');
  }

  return suggestion;
}

export async function acceptActionSuggestion(
  userId,
  suggestionId
) {
  const suggestion =
    await db.orm.public.ActionSuggestion.first({
      id: suggestionId,
      userId,
    });

  if (!suggestion) {
    throw new Error('SUGGESTION_NOT_FOUND');
  }

  if (suggestion.status !== 'pending') {
    throw new Error('SUGGESTION_NOT_PENDING');
  }

  // Create the real Action from the suggestion.
  const action =
    await db.orm.public.Action.create({
      userId,
      goalId: suggestion.goalId,
      suggestionId: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      status: 'pending',
      priority: suggestion.priority,
      dueDate: null,
      completedAt: null,
    });

  // Mark the suggestion as accepted.
  const updatedSuggestion =
    await db.orm.public.ActionSuggestion
      .where({
        id: suggestion.id,
        userId,
      })
      .update({
        status: 'accepted',
      });

  return {
    suggestion: updatedSuggestion,
    action,
  };
}

export async function rejectActionSuggestion(
  userId,
  suggestionId
) {
  const suggestion =
    await db.orm.public.ActionSuggestion.first({
      id: suggestionId,
      userId,
    });

  if (!suggestion) {
    throw new Error('SUGGESTION_NOT_FOUND');
  }

  if (suggestion.status !== 'pending') {
    throw new Error('SUGGESTION_NOT_PENDING');
  }

  const updatedSuggestion =
    await db.orm.public.ActionSuggestion
      .where({
        id: suggestionId,
        userId,
      })
      .update({
        status: 'rejected',
      });

  return updatedSuggestion;
}