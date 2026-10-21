
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDailyPlannerIntelligenceContext,
} from '../src/services/daily-planner-intelligence-context.service.js';

function createPlannerContext(overrides = {}) {
  return {
    vision: {
      statement: 'Become a strong AI engineer',
      values: 'Learning and consistency',
      identity: 'Full Stack Developer',
      futureSelf: 'AI engineering professional',
    },

    activeGoals: [
      {
        id: 4,
        title: 'Become a strong Full Stack AI Engineer',
        description: 'Build strong full-stack and AI engineering skills',
      },
    ],

    currentActions: {
      pending: [
        {
          id: 10,
          title: 'Build one focused AI feature',
        },
      ],
      inProgress: [],
    },

    reflection: {
      content: 'I need to be more consistent.',
    },

    ...overrides,
  };
}

function createGoalProgress(overrides = {}) {
  return {
    goal: {
      id: 4,
      title: 'Become a strong Full Stack AI Engineer',
    },

    progress: {
      totalActions: 4,
      completedActions: 2,
      pendingActions: 1,
      inProgressActions: 1,
      cancelledActions: 0,
      activeActions: 4,
      completionPercentage: 50,
    },

    activity: {
      trend: 'improving',
      recentCompleted: 2,
      previousCompleted: 0,
      currentActivityStreak: 1,
    },

    reflectionCorrelation: {
      count: 1,
      reflections: [],
    },

    ...overrides,
  };
}

function createDependencies(overrides = {}) {
  return {
    searchMemories: async () => ({
      query: 'test query',
      results: [
        {
          memoryId: 21,
          content: 'Focused tasks help me learn consistently.',
          similarity: 0.82,
        },
      ],
    }),

    getGoalProgress: async () => createGoalProgress(),

    ...overrides,
  };
}

test('retrieves relevant memories and objective goal progress', async () => {
  const result = await buildDailyPlannerIntelligenceContext(
    7,
    createPlannerContext(),
    createDependencies(),
  );

  assert.equal(result.relevantMemories.length, 1);
  assert.equal(result.relevantMemories[0].memoryId, 21);
  assert.equal(
    result.relevantMemories[0].content,
    'Focused tasks help me learn consistently.',
  );

  assert.equal(result.goalProgress.length, 1);
  assert.equal(result.goalProgress[0].goalId, 4);
  assert.equal(result.goalProgress[0].status, 'available');
  assert.equal(
    result.goalProgress[0].progress.completionPercentage,
    50,
  );
  assert.equal(result.goalProgress[0].activity.trend, 'improving');

  assert.equal(result.dataQuality.memoryStatus, 'available');
  assert.equal(result.dataQuality.goalProgressStatus, 'available');
});

test('passes the user ID, query, and memory limit to memory search', async () => {
  let receivedArguments;

  const dependencies = createDependencies({
    searchMemories: async (...args) => {
      receivedArguments = args;

      return {
        query: args[1],
        results: [],
      };
    },
  });

  await buildDailyPlannerIntelligenceContext(
    7,
    createPlannerContext(),
    dependencies,
  );

  assert.equal(receivedArguments[0], 7);
  assert.equal(receivedArguments[2], 5);
  assert.match(receivedArguments[1], /Become a strong AI engineer/);
  assert.match(receivedArguments[1], /Become a strong Full Stack AI Engineer/);
  assert.match(receivedArguments[1], /Build one focused AI feature/);
});

test('marks memory retrieval unavailable when search throws', async () => {
  const dependencies = createDependencies({
    searchMemories: async () => {
      throw new Error('Embedding service unavailable');
    },
  });

  const result = await buildDailyPlannerIntelligenceContext(
    7,
    createPlannerContext(),
    dependencies,
  );

  assert.deepEqual(result.relevantMemories, []);
  assert.equal(result.dataQuality.memoryStatus, 'unavailable');

  // Goal progress should still be retrieved independently.
  assert.equal(result.dataQuality.goalProgressStatus, 'available');
  assert.equal(result.goalProgress[0].status, 'available');
});

test('marks memory search not requested when there is no usable query', async () => {
  let memorySearchCalled = false;

  const dependencies = createDependencies({
    searchMemories: async () => {
      memorySearchCalled = true;

      return {
        results: [],
      };
    },
  });

  const result = await buildDailyPlannerIntelligenceContext(
    7,
    createPlannerContext({
      vision: null,
      activeGoals: [],
      currentActions: {
        pending: [],
        inProgress: [],
      },
      reflection: null,
    }),
    dependencies,
  );

  assert.equal(memorySearchCalled, false);
  assert.deepEqual(result.relevantMemories, []);
  assert.equal(result.dataQuality.memoryStatus, 'not_requested');
  assert.equal(
    result.dataQuality.goalProgressStatus,
    'not_applicable',
  );
});

test('marks an individual goal unavailable when progress retrieval fails', async () => {
  const dependencies = createDependencies({
    getGoalProgress: async () => {
      throw new Error('Goal progress database error');
    },
  });

  const result = await buildDailyPlannerIntelligenceContext(
    7,
    createPlannerContext(),
    dependencies,
  );

  assert.equal(result.goalProgress.length, 1);
  assert.equal(result.goalProgress[0].goalId, 4);
  assert.equal(result.goalProgress[0].status, 'unavailable');

  assert.equal(result.goalProgress[0].progress, null);
  assert.equal(result.goalProgress[0].activity, null);
  assert.equal(result.goalProgress[0].reflectionCorrelation, null);

  assert.equal(result.dataQuality.goalProgressStatus, 'unavailable');
});

test('supports partial goal-progress availability', async () => {
  const plannerContext = createPlannerContext({
    activeGoals: [
      { id: 4, title: 'AI engineering goal' },
      { id: 6, title: 'Consistency goal' },
    ],
  });

  const dependencies = createDependencies({
    getGoalProgress: async (userId, goalId) => {
      if (goalId === 6) {
        throw new Error('Progress unavailable for goal 6');
      }

      return createGoalProgress();
    },
  });

  const result = await buildDailyPlannerIntelligenceContext(
    7,
    plannerContext,
    dependencies,
  );

  assert.equal(result.goalProgress.length, 2);
  assert.equal(result.goalProgress[0].status, 'available');
  assert.equal(result.goalProgress[1].status, 'unavailable');

  assert.equal(
    result.dataQuality.goalProgressStatus,
    'partially_available',
  );
});

test('does not request goal progress when there are no active goals', async () => {
  let goalProgressCalled = false;

  const dependencies = createDependencies({
    getGoalProgress: async () => {
      goalProgressCalled = true;

      return createGoalProgress();
    },
  });

  const result = await buildDailyPlannerIntelligenceContext(
    7,
    createPlannerContext({
      activeGoals: [],
    }),
    dependencies,
  );

  assert.equal(goalProgressCalled, false);
  assert.deepEqual(result.goalProgress, []);
  assert.equal(result.dataQuality.goalProgressStatus, 'not_applicable');
});

test('rejects an invalid user ID', async () => {
  await assert.rejects(
    () =>
      buildDailyPlannerIntelligenceContext(
        0,
        createPlannerContext(),
        createDependencies(),
      ),
    {
      message: 'INVALID_USER_ID',
    },
  );
});

test('rejects a missing planner context', async () => {
  await assert.rejects(
    () =>
      buildDailyPlannerIntelligenceContext(
        7,
        null,
        createDependencies(),
      ),
    {
      message: 'DAILY_PLANNER_CONTEXT_REQUIRED',
    },
  );
});
