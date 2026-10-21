import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateDailyGrowthSuggestions,
  isRetryablePlannerError,
} from '../src/services/daily-growth-generation.service.js';

function dailyContext() {
  return {
    date: '2026-10-21',
    timeZone: 'Asia/Calcutta',
    vision: { statement: 'Become an independent AI product builder.' },
    goals: {
      active: [
        { id: 4, title: 'Become a strong Full Stack AI Engineer', status: 'active' },
        { id: 5, title: 'Get six-pack abs by year-end', status: 'active' },
        { id: 6, title: 'INSUFFICIENT DATA GOAL', status: 'active' },
      ],
    },
    actions: {
      pending: [{ id: 3, title: 'Solve one LeetCode problem', status: 'pending', goalId: 4 }],
      inProgress: [],
      completedToday: [],
      overdue: [],
    },
    suggestions: {
      pending: [{ id: 20, title: 'Complete one set of leg raises', status: 'pending', goalId: 5 }],
    },
    reflection: null,
    reflectionAnalysis: null,
  };
}

function suggestion(overrides = {}) {
  return {
    title: 'Build one small AI feature',
    description: 'Implement one focused feature.',
    reasoning: 'Supports the engineering goal.',
    priority: 2,
    goalId: 4,
    ...overrides,
  };
}

function createDependencies(plans) {
  const calls = { generate: [], persist: [] };
  const queue = [...plans];

  return {
    calls,
    dependencies: {
      getTodayDailyContext: async () => dailyContext(),
      buildDailyPlannerIntelligenceContext: async () => ({
        relevantMemories: [{ memoryId: 1, content: 'Prefers focused tasks.', similarity: 0.8 }],
        goalProgress: [
          { goalId: 4, status: 'available' },
          { goalId: 5, status: 'unavailable' },
        ],
        dataQuality: { memoryStatus: 'available', goalProgressStatus: 'partially_available' },
      }),
      generateDailyActionPlan: async (context) => {
        calls.generate.push(context);
        const next = queue.shift();
        if (next instanceof Error) throw next;
        return next;
      },
      persistDailyActionSuggestions: async (userId, context, plan) => {
        calls.persist.push(plan);
        return { createdCount: plan.suggestions.length, suggestions: plan.suggestions };
      },
    },
  };
}

test('persists a valid first plan and reports the planning context', async () => {
  const { calls, dependencies } = createDependencies([{ suggestions: [suggestion()] }]);

  const result = await generateDailyGrowthSuggestions(1, dependencies);

  assert.equal(result.createdCount, 1);
  assert.equal(result.attempts, 1);
  assert.deepEqual(result.intelligence, {
    relevantMemoryCount: 1,
    goalProgressCount: 1,
    dataQuality: { memoryStatus: 'available', goalProgressStatus: 'partially_available' },
    hasReflection: false,
  });
  assert.equal(calls.generate.length, 1);
  assert.equal(calls.generate[0].previousAttempt, undefined);
});

test('retries once with the rejection reason when the plan repeats a pending suggestion', async () => {
  const { calls, dependencies } = createDependencies([
    { suggestions: [suggestion({ title: 'Complete one set of leg raises', goalId: 5 })] },
    { suggestions: [suggestion({ title: 'Do a 15 minute core workout', goalId: 5 })] },
  ]);

  const result = await generateDailyGrowthSuggestions(1, dependencies);

  assert.equal(result.attempts, 2);
  assert.equal(calls.generate.length, 2);
  assert.deepEqual(calls.generate[1].previousAttempt, {
    code: 'DUPLICATE_PENDING_SUGGESTION',
    rejectedTitle: 'Complete one set of leg raises',
  });
  assert.equal(calls.persist.length, 1);
  assert.equal(calls.persist[0].suggestions[0].title, 'Do a 15 minute core workout');
});

test('retries a plan that uses the placeholder goal', async () => {
  const { calls, dependencies } = createDependencies([
    { suggestions: [suggestion({ title: 'Review and adjust diet plan', goalId: 6 })] },
    { suggestions: [suggestion({ title: 'Review and adjust diet plan', goalId: 5 })] },
  ]);

  const result = await generateDailyGrowthSuggestions(1, dependencies);

  assert.equal(result.attempts, 2);
  assert.equal(calls.generate[1].previousAttempt.code, 'DAILY_PLANNER_GOAL_IS_PLACEHOLDER');
  assert.equal(calls.persist[0].suggestions[0].goalId, 5);
});

test('gives up after the second rejected plan without persisting anything', async () => {
  const { calls, dependencies } = createDependencies([
    { suggestions: [suggestion({ title: 'Solve one LeetCode problem' })] },
    { suggestions: [suggestion({ title: 'Solve one LeetCode problem' })] },
  ]);

  await assert.rejects(
    () => generateDailyGrowthSuggestions(1, dependencies),
    { message: 'DUPLICATE_EXISTING_ACTION' },
  );
  assert.equal(calls.generate.length, 2);
  assert.equal(calls.persist.length, 0);
});

test('retries malformed model output', async () => {
  const { calls, dependencies } = createDependencies([
    new Error('QWEN_INVALID_JSON_RESPONSE'),
    { suggestions: [suggestion()] },
  ]);

  const result = await generateDailyGrowthSuggestions(1, dependencies);

  assert.equal(result.attempts, 2);
  assert.equal(calls.generate[1].previousAttempt.code, 'QWEN_INVALID_JSON_RESPONSE');
});

test('does not retry when the AI service is unreachable', async () => {
  const { calls, dependencies } = createDependencies([
    new Error('OLLAMA_UNREACHABLE: connect ECONNREFUSED'),
    { suggestions: [suggestion()] },
  ]);

  await assert.rejects(
    () => generateDailyGrowthSuggestions(1, dependencies),
    /^Error: OLLAMA_UNREACHABLE/,
  );
  assert.equal(calls.generate.length, 1);
});

test('classifies retryable planner errors', () => {
  assert.equal(isRetryablePlannerError(new Error('DAILY_PLANNER_GOAL_MISMATCH')), true);
  assert.equal(isRetryablePlannerError(new Error('DAILY_PLANNER_GOAL_NOT_ACTIVE_OR_OWNED')), false);
  assert.equal(isRetryablePlannerError(new Error('DAILY_CONTEXT_GOALS_FETCH_FAILED')), false);
  assert.equal(isRetryablePlannerError(null), false);
});

test('keeps new suggestions and drops repeats of existing work', async () => {
  const { calls, dependencies } = createDependencies([
    {
      suggestions: [
        suggestion({ title: 'Solve one LeetCode problem' }),
        suggestion({ title: 'Review one recent coding task for improvements' }),
        suggestion({ title: 'Complete one set of leg raises', goalId: 5 }),
      ],
    },
  ]);

  const result = await generateDailyGrowthSuggestions(1, dependencies);

  assert.equal(result.attempts, 1);
  assert.equal(result.skippedDuplicates, 2);
  assert.deepEqual(
    calls.persist[0].suggestions.map((item) => item.title),
    ['Review one recent coding task for improvements'],
  );
});

test('still rejects a plan whose new suggestion breaks an integrity rule', async () => {
  const { calls, dependencies } = createDependencies([
    {
      suggestions: [
        suggestion({ title: 'Solve one LeetCode problem' }),
        suggestion({ title: 'Do a core workout', goalId: 6 }),
      ],
    },
    { suggestions: [suggestion({ title: 'Do a core workout', goalId: 5 })] },
  ]);

  const result = await generateDailyGrowthSuggestions(1, dependencies);

  assert.equal(result.attempts, 2);
  assert.equal(calls.generate[1].previousAttempt.code, 'DAILY_PLANNER_GOAL_IS_PLACEHOLDER');
  assert.equal(calls.persist[0].suggestions[0].goalId, 5);
});
