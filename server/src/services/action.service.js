import { db } from '../prisma/db.ts';

const VALID_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

function parseInstant(value) {
  if (value === null) {
    return null;
  }

  return Temporal.Instant.from(value);
}

function validateStatus(status) {
  if (
    status !== undefined &&
    !VALID_STATUSES.includes(status)
  ) {
    throw new Error('INVALID_ACTION_STATUS');
  }
}

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

async function verifySuggestionOwnership(
  userId,
  suggestionId
) {
  if (
    suggestionId === null ||
    suggestionId === undefined
  ) {
    return;
  }

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
}

export async function createAction(
  userId,
  {
    title,
    description,
    goalId,
    suggestionId,
    status,
    priority,
    dueDate,
  }
) {
  if (!title || !title.trim()) {
    throw new Error('ACTION_TITLE_REQUIRED');
  }

  validateStatus(status);

  if (
    goalId !== undefined &&
    goalId !== null &&
    !Number.isInteger(goalId)
  ) {
    throw new Error('INVALID_GOAL_ID');
  }

  if (
    suggestionId !== undefined &&
    suggestionId !== null &&
    !Number.isInteger(suggestionId)
  ) {
    throw new Error('INVALID_SUGGESTION_ID');
  }

  await verifyGoalOwnership(userId, goalId);

  await verifySuggestionOwnership(
    userId,
    suggestionId
  );

  let parsedDueDate = null;

  if (dueDate !== undefined && dueDate !== null) {
    try {
      parsedDueDate = parseInstant(dueDate);
    } catch {
      throw new Error('INVALID_DUE_DATE');
    }
  }

  const action = await db.orm.public.Action.create({
    userId,
    goalId: goalId ?? null,
    suggestionId: suggestionId ?? null,
    title: title.trim(),
    description: description?.trim() || null,
    status: status || 'pending',
    priority: priority ?? 0,
    dueDate: parsedDueDate,
    completedAt: null,
  });

  return action;
}

export async function getActions(
  userId,
  {
    status,
    goalId,
  } = {}
) {
  const filter = {
    userId,
  };

  if (status !== undefined) {
    validateStatus(status);
    filter.status = status;
  }

  if (goalId !== undefined) {
    if (!Number.isInteger(goalId)) {
      throw new Error('INVALID_GOAL_ID');
    }

    filter.goalId = goalId;
  }

  const actions = await db.orm.public.Action
    .where(filter)
    .all();

  return actions;
}

export async function getActionById(
  userId,
  actionId
) {
  const action = await db.orm.public.Action.first({
    id: actionId,
    userId,
  });

  if (!action) {
    throw new Error('ACTION_NOT_FOUND');
  }

  return action;
}

export async function updateAction(
  userId,
  actionId,
  {
    title,
    description,
    goalId,
    status,
    priority,
    dueDate,
  }
) {
  const existingAction =
    await db.orm.public.Action.first({
      id: actionId,
      userId,
    });

  if (!existingAction) {
    throw new Error('ACTION_NOT_FOUND');
  }

  if (
    title !== undefined &&
    (title === null || !title.trim())
  ) {
    throw new Error('ACTION_TITLE_REQUIRED');
  }

  validateStatus(status);

  if (
    goalId !== undefined &&
    goalId !== null &&
    !Number.isInteger(goalId)
  ) {
    throw new Error('INVALID_GOAL_ID');
  }

  await verifyGoalOwnership(userId, goalId);

  const updateData = {};

  if (title !== undefined) {
    updateData.title = title.trim();
  }

  if (description !== undefined) {
    updateData.description =
      description === null
        ? null
        : description.trim();
  }

  if (goalId !== undefined) {
    updateData.goalId = goalId;
  }

  if (status !== undefined) {
    updateData.status = status;

    if (status === 'completed') {
      updateData.completedAt =
        Temporal.Now.instant();
    }

    if (
      existingAction.status === 'completed' &&
      status !== 'completed'
    ) {
      updateData.completedAt = null;
    }
  }

  if (priority !== undefined) {
    updateData.priority = priority;
  }

  if (dueDate !== undefined) {
    if (dueDate === null) {
      updateData.dueDate = null;
    } else {
      try {
        updateData.dueDate =
          parseInstant(dueDate);
      } catch {
        throw new Error('INVALID_DUE_DATE');
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('NO_ACTION_FIELDS_TO_UPDATE');
  }

  const updatedAction =
    await db.orm.public.Action
      .where({
        id: actionId,
        userId,
      })
      .update(updateData);

  return updatedAction;
}

export async function deleteAction(
  userId,
  actionId
) {
  const existingAction =
    await db.orm.public.Action.first({
      id: actionId,
      userId,
    });

  if (!existingAction) {
    throw new Error('ACTION_NOT_FOUND');
  }

  const deletedAction =
    await db.orm.public.Action
      .where({
        id: actionId,
        userId,
      })
      .delete();

  return deletedAction;
}