import { db } from '../prisma/db.ts';

import {
  analyzeGoalProgress,
} from './ai/goal-progress-ai.service.js';

const ACTIVITY_DAYS = 30;

const VALID_ACTION_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

function toJsDate(value) {
  if (!value) {
    return null;
  }

  if (
    value.epochMilliseconds !== undefined
  ) {
    return new Date(
      Number(value.epochMilliseconds)
    );
  }

  return new Date(value);
}

function startOfDay(date) {
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function endOfDay(date) {
  const result = new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
}

function formatDate(date) {
  return date
    .toISOString()
    .slice(0, 10);
}

function calculateCompletionPercentage(
  completed,
  total
) {
  if (total === 0) {
    return 0;
  }

  return Math.round(
    (completed / total) * 100
  );
}

function calculateActionStats(actions) {
  const totalActions =
    actions.length;

  const completedActions =
    actions.filter(
      (action) =>
        action.status === 'completed'
    ).length;

  const pendingActions =
    actions.filter(
      (action) =>
        action.status === 'pending'
    ).length;

  const inProgressActions =
    actions.filter(
      (action) =>
        action.status === 'in_progress'
    ).length;

  const cancelledActions =
    actions.filter(
      (action) =>
        action.status === 'cancelled'
    ).length;

  const activeActions =
    actions.filter(
      (action) =>
        action.status !== 'cancelled'
    ).length;

  return {
    totalActions,
    completedActions,
    pendingActions,
    inProgressActions,
    cancelledActions,
    activeActions,
    completionPercentage:
      calculateCompletionPercentage(
        completedActions,
        activeActions
      ),
  };
}

function calculateDailyActivity(
  actions,
  days = ACTIVITY_DAYS
) {
  const today =
    startOfDay(new Date());

  const activity = [];

  for (
    let offset = days - 1;
    offset >= 0;
    offset--
  ) {
    const day =
      new Date(today);

    day.setDate(
      day.getDate() - offset
    );

    const nextDay =
      new Date(day);

    nextDay.setDate(
      nextDay.getDate() + 1
    );

    const createdCount =
      actions.filter(
        (action) => {
          const createdAt =
            toJsDate(
              action.createdAt
            );

          return (
            createdAt &&
            createdAt >= day &&
            createdAt < nextDay
          );
        }
      ).length;

    const completedCount =
      actions.filter(
        (action) => {
          const completedAt =
            toJsDate(
              action.completedAt
            );

          return (
            completedAt &&
            completedAt >= day &&
            completedAt < nextDay
          );
        }
      ).length;

    activity.push({
      date: formatDate(day),
      createdCount,
      completedCount,
      activityCount:
        createdCount +
        completedCount,
    });
  }

  return activity;
}

function calculateTrend(activity) {
  if (!activity.length) {
    return {
      trend: 'insufficient_data',
      recentCompleted: 0,
      previousCompleted: 0,
    };
  }

  const midpoint =
    Math.floor(
      activity.length / 2
    );

  const firstHalf =
    activity.slice(
      0,
      midpoint
    );

  const secondHalf =
    activity.slice(
      midpoint
    );

  const recentCompleted =
    secondHalf.reduce(
      (total, day) =>
        total + day.completedCount,
      0
    );

  const previousCompleted =
    firstHalf.reduce(
      (total, day) =>
        total + day.completedCount,
      0
    );

  let trend =
    'stable';

  if (
    recentCompleted >
    previousCompleted
  ) {
    trend = 'improving';
  } else if (
    recentCompleted <
    previousCompleted
  ) {
    trend = 'declining';
  }

  if (
    recentCompleted === 0 &&
    previousCompleted === 0
  ) {
    trend = 'insufficient_data';
  }

  return {
    trend,
    recentCompleted,
    previousCompleted,
  };
}

function calculateStreak(activity) {
  let streak = 0;

  for (
    let index =
      activity.length - 1;
    index >= 0;
    index--
  ) {
    if (
      activity[index]
        .activityCount > 0
    ) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function parseGoalAlignment(value) {
  if (!value) {
    return [];
  }

  if (
    Array.isArray(value)
  ) {
    return value;
  }

  if (
    typeof value !== 'string'
  ) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function goalMatchesAlignment(
  alignmentItem,
  goal
) {
  if (
    !alignmentItem ||
    typeof alignmentItem !== 'object'
  ) {
    return false;
  }

  const goalReference =
    typeof alignmentItem.goal === 'string'
      ? alignmentItem.goal
          .trim()
          .toLowerCase()
      : '';

  if (!goalReference) {
    return false;
  }

  const goalTitle =
    goal.title
      .trim()
      .toLowerCase();

  return (
    goalReference === goalTitle ||
    goalReference.includes(goalTitle) ||
    goalTitle.includes(goalReference)
  );
}

async function getGoalForUser(
  userId,
  goalId
) {
  const goal =
    await db.orm.public.Goal.first({
      id: goalId,
      userId,
    });

  if (!goal) {
    throw new Error(
      'GOAL_NOT_FOUND'
    );
  }

  return goal;
}

async function getGoalActions(
  userId,
  goalId
) {
  return await db.orm.public.Action
    .where({
      userId,
      goalId,
    })
    .all();
}

async function getUserReflections(
  userId
) {
  return await db.orm.public.Reflection
    .where({
      userId,
    })
    .all();
}

async function getReflectionAnalyses(
  userId
) {
  return await db.orm.public.ReflectionAnalysis
    .where({
      userId,
    })
    .all();
}

async function buildReflectionCorrelation({
  userId,
  goal,
}) {
  const reflections =
    await getUserReflections(
      userId
    );

  const analyses =
    await getReflectionAnalyses(
      userId
    );

  const analysesByReflectionId =
    new Map();

  for (const analysis of analyses) {
    analysesByReflectionId.set(
      analysis.reflectionId,
      analysis
    );
  }

  const correlatedReflections = [];

  for (const reflection of reflections) {
    const analysis =
      analysesByReflectionId.get(
        reflection.id
      );

    if (!analysis) {
      continue;
    }

    const goalAlignment =
      parseGoalAlignment(
        analysis.goalAlignment
      );

    const matchedAlignment =
      goalAlignment.filter(
        (item) =>
          goalMatchesAlignment(
            item,
            goal
          )
      );

    if (
      matchedAlignment.length === 0
    ) {
      continue;
    }

    correlatedReflections.push({
      reflectionId:
        reflection.id,

      reflectionDate:
        reflection.reflectionDate,

      content:
        reflection.content,

      mood:
        reflection.mood,

      productivity:
        reflection.productivity,

      goalAlignment:
        matchedAlignment,

      progressAnalysis:
        analysis.progressAnalysis
          ? parseJsonValue(
              analysis.progressAnalysis
            )
          : null,

      summary:
        analysis.summary,
    });
  }

  correlatedReflections.sort(
    (a, b) => {
      const dateA =
        toJsDate(
          a.reflectionDate
        )?.getTime() ?? 0;

      const dateB =
        toJsDate(
          b.reflectionDate
        )?.getTime() ?? 0;

      return dateB - dateA;
    }
  );

  return correlatedReflections;
}

function parseJsonValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value === 'object'
  ) {
    return value;
  }

  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function buildGoalProgress(
  userId,
  goalId
) {
  const goal =
    await getGoalForUser(
      userId,
      goalId
    );

  const actions =
    await getGoalActions(
      userId,
      goalId
    );

  const progress =
    calculateActionStats(
      actions
    );

  const dailyActivity =
    calculateDailyActivity(
      actions,
      ACTIVITY_DAYS
    );

  const trend =
    calculateTrend(
      dailyActivity
    );

  const streak =
    calculateStreak(
      dailyActivity
    );

  const reflectionCorrelation =
    await buildReflectionCorrelation({
      userId,
      goal,
    });

  const lastActivity =
    [...actions]
      .map(
        (action) => {
          const completedAt =
            toJsDate(
              action.completedAt
            );

          const createdAt =
            toJsDate(
              action.createdAt
            );

          return (
            completedAt ||
            createdAt
          );
        }
      )
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.getTime() -
          a.getTime()
      )[0] || null;

  return {
    goal: {
      id: goal.id,
      title: goal.title,
      description:
        goal.description,
      status: goal.status,
      priority: goal.priority,
      targetDate:
        goal.targetDate,
      createdAt:
        goal.createdAt,
      updatedAt:
        goal.updatedAt,
    },

    progress,

    activity: {
      periodDays:
        ACTIVITY_DAYS,

      daily:
        dailyActivity,

      trend:
        trend.trend,

      recentCompleted:
        trend.recentCompleted,

      previousCompleted:
        trend.previousCompleted,

      currentActivityStreak:
        streak,

      lastActivity:
        lastActivity
          ? lastActivity.toISOString()
          : null,
    },

    reflectionCorrelation: {
      count:
        reflectionCorrelation.length,

      reflections:
        reflectionCorrelation,
    },
  };
}

export async function getGoalProgress(
  userId,
  goalId
) {
  return await buildGoalProgress(
    userId,
    goalId
  );
}

export async function analyzeGoalProgressForUser(
  userId,
  goalId
) {
  const progress =
    await buildGoalProgress(
      userId,
      goalId
    );

  const analysis =
    await analyzeGoalProgress({
      goal: progress.goal,
      progress: progress.progress,
      activity: progress.activity,
      reflectionCorrelation:
        progress.reflectionCorrelation,
    });

  return {
    ...progress,
    aiAnalysis: analysis,
  };
}