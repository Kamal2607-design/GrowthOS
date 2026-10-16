function getLocalDateKey(value, timeZoneId) {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return Temporal.Instant
      .from(value)
      .toZonedDateTimeISO(timeZoneId)
      .toPlainDate()
      .toString();
  } catch {
    return null;
  }
}

function isRelevantToActiveGoals(record, activeGoalIds) {
  return record.goalId === null ||
    record.goalId === undefined ||
    activeGoalIds.has(record.goalId);
}

function sortByInstantDescending(records, fieldName, compareInstants) {
  return [...records].sort((a, b) => {
    try {
      return compareInstants(a[fieldName], b[fieldName]);
    } catch {
      return 0;
    }
  });
}

/**
 * Pure response builder exported so the daily-context rules can be tested
 * independently of the database. Production passes the runtime-local date
 * converter; tests can pass a deterministic converter.
 */
export function buildDailyContext({
  date,
  timeZoneId,
  vision,
  goals,
  actions,
  suggestions,
  reflections,
  reflectionAnalysis,
  dateKeyForInstant = (value) => getLocalDateKey(value, timeZoneId),
  compareInstants = (left, right) => Temporal.Instant.compare(
    Temporal.Instant.from(right),
    Temporal.Instant.from(left),
  ),
}) {
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const activeGoalIds = new Set(activeGoals.map((goal) => goal.id));

  // Keep actions associated with active goals, plus actions that are not
  // associated with a goal. This matches the existing context-assembly rule.
  const relevantActions = actions.filter((action) =>
    isRelevantToActiveGoals(action, activeGoalIds)
  );

  const actionsToday = relevantActions.filter((action) =>
    dateKeyForInstant(action.dueDate) === date ||
    dateKeyForInstant(action.createdAt) === date ||
    dateKeyForInstant(action.completedAt) === date
  );

  const overdueActions = relevantActions.filter((action) => {
    if (!['pending', 'in_progress'].includes(action.status)) {
      return false;
    }

    const dueDate = dateKeyForInstant(action.dueDate);
    return dueDate !== null && dueDate < date;
  });

  const pendingActions = relevantActions.filter(
    (action) => action.status === 'pending'
  );

  const inProgressActions = relevantActions.filter(
    (action) => action.status === 'in_progress'
  );

  const completedToday = relevantActions.filter(
    (action) => action.status === 'completed' &&
      dateKeyForInstant(action.completedAt) === date
  );

  const todayReflections = sortByInstantDescending(
    reflections.filter(
      (reflection) =>
        dateKeyForInstant(reflection.reflectionDate) === date
    ),
    'reflectionDate',
    compareInstants,
  );

  const todayReflection = todayReflections[0] || null;

  const pendingSuggestions = suggestions.filter((suggestion) =>
    suggestion.status === 'pending' && (
      isRelevantToActiveGoals(suggestion, activeGoalIds) ||
      (todayReflection && suggestion.reflectionId === todayReflection.id)
    )
  );

  return {
    date,
    timeZone: timeZoneId,
    vision: vision || null,
    goals: {
      active: activeGoals,
    },
    actions: {
      today: actionsToday,
      pending: pendingActions,
      inProgress: inProgressActions,
      completedToday,
      overdue: overdueActions,
    },
    suggestions: {
      pending: pendingSuggestions,
    },
    reflection: todayReflection,
    reflectionAnalysis: todayReflection ? reflectionAnalysis : null,
    summary: {
      activeGoals: activeGoals.length,
      actionsToday: actionsToday.length,
      pendingActions: pendingActions.length,
      inProgressActions: inProgressActions.length,
      completedToday: completedToday.length,
      overdueActions: overdueActions.length,
      pendingSuggestions: pendingSuggestions.length,
      hasReflection: Boolean(todayReflection),
      hasReflectionAnalysis: Boolean(todayReflection && reflectionAnalysis),
    },
  };
}

