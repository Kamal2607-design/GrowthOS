import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeActionSuggestions,
} from '../src/services/ai/action-suggestion-ai.service.js';

import {
  filterNewSuggestions,
} from '../src/services/suggestion-dedupe.service.js';

import {
  buildActionSuggestionPrompt,
} from '../src/services/ai/action-prompt.service.js';

import {
  buildDailyPlannerPrompt,
  describePlannerRejection,
} from '../src/services/ai/daily-planner-prompt.service.js';

test('normalises per-goal AI suggestions and drops unusable entries', () => {
  const result = normalizeActionSuggestions({
    suggestions: [
      { title: '  Ship one feature ', description: 'Do it', reasoning: 'Why', priority: 2 },
      { title: 42, description: 'bad title' },
      null,
      { title: 'Write tests', priority: 9 },
      { title: '   ' },
    ],
  });

  assert.deepEqual(result, [
    { title: 'Ship one feature', description: 'Do it', reasoning: 'Why', priority: 2 },
    { title: 'Write tests', description: null, reasoning: null, priority: 3 },
  ]);
});

test('rejects a response without a suggestions array', () => {
  assert.throws(() => normalizeActionSuggestions({}), { message: 'INVALID_AI_SUGGESTIONS' });
  assert.throws(() => normalizeActionSuggestions(null), { message: 'INVALID_AI_SUGGESTIONS' });
});

test('caps per-goal suggestions at five', () => {
  const result = normalizeActionSuggestions({
    suggestions: Array.from({ length: 8 }, (_, index) => ({ title: `Task ${index}` })),
  });

  assert.equal(result.length, 5);
});

test('filters suggestions that repeat open work or each other', () => {
  const { fresh, skipped } = filterNewSuggestions(
    [
      { title: 'Solve one LeetCode problem' },
      { title: 'Build one small AI feature' },
      { title: 'Build one small AI feature today' },
      { title: 'Do a 15 minute core workout' },
    ],
    ['Solve one LeetCode problem', 'Practice coding challenges'],
  );

  assert.deepEqual(fresh.map((item) => item.title), [
    'Build one small AI feature',
    'Do a 15 minute core workout',
  ]);
  assert.equal(skipped.length, 2);
});

test('per-goal prompt lists already planned work', () => {
  const prompt = buildActionSuggestionPrompt({
    vision: { statement: 'Become an AI builder' },
    goal: { title: 'Ship GrowthOS', description: null },
    existingTitles: ['Solve one LeetCode problem'],
  });

  assert.match(prompt, /ALREADY PLANNED[\s\S]*- Solve one LeetCode problem/);
  assert.match(prompt, /Do not repeat or reword anything listed under ALREADY PLANNED/);
  assert.match(prompt, /Statement: Become an AI builder/);
});

test('daily planner prompt explains a rejected previous attempt', () => {
  const prompt = buildDailyPlannerPrompt({
    date: '2026-10-21',
    previousAttempt: {
      code: 'DAILY_PLANNER_GOAL_IS_PLACEHOLDER',
      rejectedTitle: 'Review and adjust diet plan',
    },
  });

  assert.match(prompt, /PREVIOUS ATTEMPT REJECTED/);
  assert.match(prompt, /test\/placeholder goal/);
  assert.match(prompt, /Rejected suggestion: "Review and adjust diet plan"/);
});

test('daily planner prompt has no rejection section on a first attempt', () => {
  assert.doesNotMatch(buildDailyPlannerPrompt({ date: '2026-10-21' }), /PREVIOUS ATTEMPT/);
});

test('describes unknown rejection codes generically', () => {
  assert.match(describePlannerRejection('SOMETHING_ELSE'), /required structure/);
});
