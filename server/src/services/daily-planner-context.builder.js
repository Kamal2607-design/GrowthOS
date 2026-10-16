function safeParseJson(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapVision(vision) {
  if (!vision) {
    return null;
  }

  return {
    statement: vision.statement ?? null,
    values: vision.values ?? null,
    identity: vision.identity ?? null,
    futureSelf: vision.futureSelf ?? null,
  };
}

function mapGoals(goals) {
  return (goals?.active ?? []).map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description ?? null,
    priority: goal.priority ?? 0,
    targetDate: goal.targetDate ?? null,
  }));
}

function mapAction(action) {
  return {
    id: action.id,
    title: action.title,
    description: action.description ?? null,
    goalId: action.goalId ?? null,
    priority: action.priority ?? 0,
    status: action.status,
    dueDate: action.dueDate ?? null,
    completedAt: action.completedAt ?? null,
  };
}

function mapActions(actions) {
  return {
    pending: (actions?.pending ?? []).map(mapAction),
    inProgress: (actions?.inProgress ?? []).map(mapAction),
    completedToday: (actions?.completedToday ?? []).map(mapAction),
    overdue: (actions?.overdue ?? []).map(mapAction),
  };
}

function mapSuggestion(suggestion) {
  return {
    id: suggestion.id,
    title: suggestion.title,
    description: suggestion.description ?? null,
    goalId: suggestion.goalId ?? null,
    priority: suggestion.priority ?? 0,
    reasoning: suggestion.reasoning ?? null,
    reflectionId: suggestion.reflectionId ?? null,
    source: suggestion.source ?? null,
  };
}

function mapSuggestions(suggestions) {
  return (suggestions?.pending ?? []).map(mapSuggestion);
}

function mapReflection(reflection) {
  if (!reflection) {
    return null;
  }

  return {
    id: reflection.id,
    content: reflection.content ?? null,
    mood: reflection.mood ?? null,
    productivity: reflection.productivity ?? null,
    highlights: reflection.highlights ?? null,
    challenges: reflection.challenges ?? null,
    learnings: reflection.learnings ?? null,
  };
}

function mapReflectionAnalysis(analysis) {
  if (!analysis) {
    return null;
  }

  return {
    summary: analysis.summary ?? null,
    challenges: safeParseJson(analysis.challenges, []),
    learnings: safeParseJson(analysis.learnings, []),
    highlights: safeParseJson(analysis.highlights, []),
    goalAlignment: safeParseJson(analysis.goalAlignment, []),
    progressAnalysis: safeParseJson(analysis.progressAnalysis, null),
    recommendedActions: safeParseJson(analysis.recommendedActions, []),
  };
}

/**
 * Converts the existing Daily Growth Context into the smaller,
 * planner-specific context consumed by the AI Action Planner.
 *
 * This function is intentionally pure:
 * - no database access
 * - no Ollama/Qwen calls
 * - no ActionSuggestion creation
 * - no Action creation
 * - no mutation
 */
export function buildDailyPlannerContext(dailyGrowthContext) {
  if (!dailyGrowthContext || typeof dailyGrowthContext !== 'object') {
    throw new Error('Daily Growth context is required.');
  }

  return {
    date: dailyGrowthContext.date ?? null,
    timeZone: dailyGrowthContext.timeZone ?? null,

    vision: mapVision(dailyGrowthContext.vision),

    activeGoals: mapGoals(dailyGrowthContext.goals),

    currentActions: mapActions(dailyGrowthContext.actions),

    pendingSuggestions: mapSuggestions(
      dailyGrowthContext.suggestions
    ),

    reflection: mapReflection(
      dailyGrowthContext.reflection
    ),

    reflectionAnalysis: mapReflectionAnalysis(
      dailyGrowthContext.reflectionAnalysis
    ),
  };
}