import {
  searchMemories,
} from './memory-retrieval.service.js';

import {
  getGoalProgress,
} from './goal-progress.service.js';

const MEMORY_LIMIT = 5;

function buildMemorySearchQuery(plannerContext) {
  const parts = [
    plannerContext.vision?.statement,
    plannerContext.vision?.values,
    plannerContext.vision?.identity,
    plannerContext.vision?.futureSelf,
    ...(plannerContext.activeGoals ?? []).flatMap((goal) => [
      goal.title,
      goal.description,
    ]),
    ...(plannerContext.currentActions?.pending ?? []).map(
      (action) => action.title,
    ),
    ...(plannerContext.currentActions?.inProgress ?? []).map(
      (action) => action.title,
    ),
    plannerContext.reflection?.content,
  ];

  return parts
    .filter((value) => typeof value === 'string' && value.trim())
    .join('\n')
    .slice(0, 4000)
    .trim();
}

export async function buildDailyPlannerIntelligenceContext(
  userId,
  plannerContext,
  dependencies = {},
) {
  const retrieveMemories = dependencies.searchMemories ?? searchMemories;
  const retrieveGoalProgress = dependencies.getGoalProgress ?? getGoalProgress;
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('INVALID_USER_ID');
  }

  if (!plannerContext || typeof plannerContext !== 'object') {
    throw new Error('DAILY_PLANNER_CONTEXT_REQUIRED');
  }

  const memoryQuery = buildMemorySearchQuery(plannerContext);

  let relevantMemories = [];
  let memoryStatus = 'available';

  if (!memoryQuery) {
    memoryStatus = 'not_requested';
  } else {
    try {
      const memoryResult = await retrieveMemories(
        userId,
        memoryQuery,
        MEMORY_LIMIT,
      );

      relevantMemories = memoryResult.results.map((memory) => ({
        memoryId: memory.memoryId,
        content: memory.content,
        similarity: memory.similarity,
      }));
    } catch (error) {
      // Retrieval failure must not be presented as "no relevant memories".
      memoryStatus = 'unavailable';
      console.error(
        'Daily planner memory retrieval failed:',
        error.message,
      );
    }
  }

  const goalProgressResults = await Promise.all(
    (plannerContext.activeGoals ?? []).map(async (goal) => {
      try {
        const result = await retrieveGoalProgress(userId, goal.id);

        return {
          goalId: goal.id,
          status: 'available',
          progress: result.progress,
          activity: result.activity,
          reflectionCorrelation: result.reflectionCorrelation,
        };
      } catch (error) {
        console.error(
          `Daily planner progress retrieval failed for goal ${goal.id}:`,
          error.message,
        );

        return {
          goalId: goal.id,
          status: 'unavailable',
          progress: null,
          activity: null,
          reflectionCorrelation: null,
        };
      }
    }),
  );

  const availableGoalProgress = goalProgressResults.filter(
    (item) => item.status === 'available',
  ).length;

  let goalProgressStatus = 'available';

  if (goalProgressResults.length === 0) {
    goalProgressStatus = 'not_applicable';
  } else if (availableGoalProgress === 0) {
    goalProgressStatus = 'unavailable';
  } else if (availableGoalProgress < goalProgressResults.length) {
    goalProgressStatus = 'partially_available';
  }

  return {
    relevantMemories,
    goalProgress: goalProgressResults,
    dataQuality: {
      memoryStatus,
      goalProgressStatus,
    },
  };
}
