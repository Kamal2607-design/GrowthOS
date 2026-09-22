import { db } from '../prisma/db.ts';

const VALID_STATUSES = [
  'active',
  'completed',
  'paused',
  'abandoned',
];

function parseTargetDate(value) {
  if (value === null) {
    return null;
  }

  const instant = Temporal.Instant.from(value);

  return instant;
}

export async function createGoal(
  userId,
  {
    title,
    description,
    status,
    priority,
    targetDate,
  }
) {
  if (!title || !title.trim()) {
    throw new Error('GOAL_TITLE_REQUIRED');
  }

  if (status && !VALID_STATUSES.includes(status)) {
    throw new Error('INVALID_GOAL_STATUS');
  }

  let parsedTargetDate = null;

  if (targetDate !== undefined && targetDate !== null) {
    try {
      parsedTargetDate = parseTargetDate(targetDate);
    } catch {
      throw new Error('INVALID_TARGET_DATE');
    }
  }

  const goal = await db.orm.public.Goal.create({
    userId,
    title: title.trim(),
    description: description?.trim() || null,
    status: status || 'active',
    priority: priority ?? 0,
    targetDate: parsedTargetDate,
  });

  return goal;
}

export async function getGoals(userId, { status } = {}) {
  const filter = {
    userId,
  };

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error('INVALID_GOAL_STATUS');
    }

    filter.status = status;
  }

  const goals = await db.orm.public.Goal
    .where(filter)
    .all();

  return goals;
}

export async function getGoalById(userId, goalId) {
  const goal = await db.orm.public.Goal.first({
    id: goalId,
    userId,
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  return goal;
}

export async function updateGoal(
  userId,
  goalId,
  {
    title,
    description,
    status,
    priority,
    targetDate,
  }
) {
  const existingGoal = await db.orm.public.Goal.first({
    id: goalId,
    userId,
  });

  if (!existingGoal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  if (
    title !== undefined &&
    (title === null || !title.trim())
  ) {
    throw new Error('GOAL_TITLE_REQUIRED');
  }

  if (
    status !== undefined &&
    !VALID_STATUSES.includes(status)
  ) {
    throw new Error('INVALID_GOAL_STATUS');
  }

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

  if (status !== undefined) {
    updateData.status = status;
  }

  if (priority !== undefined) {
    updateData.priority = priority;
  }

  if (targetDate !== undefined) {
    if (targetDate === null) {
      updateData.targetDate = null;
    } else {
      try {
        updateData.targetDate =
          parseTargetDate(targetDate);
      } catch {
        throw new Error('INVALID_TARGET_DATE');
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('NO_GOAL_FIELDS_TO_UPDATE');
  }

  const updatedGoal = await db.orm.public.Goal
    .where({
      id: goalId,
      userId,
    })
    .update(updateData);

  return updatedGoal;
}

export async function deleteGoal(userId, goalId) {
  const existingGoal = await db.orm.public.Goal.first({
    id: goalId,
    userId,
  });

  if (!existingGoal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  const deletedGoal = await db.orm.public.Goal
    .where({
      id: goalId,
      userId,
    })
    .delete();

  return deletedGoal;
}