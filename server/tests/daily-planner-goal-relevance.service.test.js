import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessSuggestionGoalRelevance,
  detectPlannerDomains,
  isPlaceholderGoal,
} from '../src/services/ai/daily-planner-goal-relevance.service.js';

const AI_ENGINEERING_GOAL = {
  id: 4,
  title: 'Become a strong Full Stack AI Engineer and make more money',
  description: null,
};

const FITNESS_GOAL = {
  id: 5,
  title: 'Get six-pack abs by year-end',
  description: null,
};

const INSUFFICIENT_DATA_FIXTURE = {
  id: 6,
  title: 'INSUFFICIENT DATA GOAL',
  description: null,
};

function createGoals() {
  return [
    AI_ENGINEERING_GOAL,
    FITNESS_GOAL,
    INSUFFICIENT_DATA_FIXTURE,
  ];
}

function createSuggestion(overrides = {}) {
  return {
    title: 'Build one small AI feature',
    description: 'Implement one focused AI feature in GrowthOS.',
    priority: 2,
    reasoning: 'This supports the active goal.',
    goalId: 4,
    ...overrides,
  };
}

test('accepts an AI engineering suggestion for the AI engineering goal', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion(),
    createGoals(),
  );

  assert.equal(result.relevant, true);
  assert.equal(result.reason, 'domain_match');
});

test('accepts a leg-raise suggestion for the fitness goal', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Complete one set of leg raises',
      description: 'Do one controlled set of leg raises.',
      goalId: 5,
    }),
    createGoals(),
  );

  assert.equal(result.relevant, true);
  assert.equal(result.reason, 'domain_match');
});

test('accepts a diet suggestion for the fitness goal', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Review and adjust diet plan',
      description: 'Check this week\'s meals against your calorie target.',
      goalId: 5,
    }),
    createGoals(),
  );

  assert.equal(result.relevant, true);
});

test('rejects a fitness suggestion assigned to the AI engineering goal', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Complete one set of leg raises',
      description: 'Do one controlled set of leg raises.',
      goalId: 4,
    }),
    createGoals(),
  );

  assert.equal(result.relevant, false);
  assert.equal(result.reason, 'domain_mismatch');
  assert.deepEqual(result.suggestionDomains, ['health_fitness']);
});

test('rejects a coding suggestion assigned to the fitness goal', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Solve one LeetCode problem',
      description: 'Practice one algorithm problem.',
      goalId: 5,
    }),
    createGoals(),
  );

  assert.equal(result.relevant, false);
  assert.equal(result.reason, 'domain_mismatch');
});

test('does not let reasoning hide a goal mismatch', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Complete one set of leg raises',
      description: 'Do one controlled set of leg raises.',
      reasoning: 'This supports your AI engineering career.',
      goalId: 4,
    }),
    createGoals(),
  );

  assert.equal(result.reason, 'domain_mismatch');
});

test('rejects any suggestion assigned to the insufficient-data fixture', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Review and adjust diet plan',
      description: 'Check this week\'s meals.',
      goalId: 6,
    }),
    createGoals(),
  );

  assert.equal(result.relevant, false);
  assert.equal(result.reason, 'placeholder_goal');
});

test('identifies a placeholder goal by its text, not its ID', () => {
  const goals = [
    { id: 6, title: 'Get six-pack abs by year-end' },
    { id: 42, title: 'INSUFFICIENT DATA GOAL' },
  ];

  const realGoalWithId6 = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Complete one set of leg raises',
      description: 'Do one controlled set.',
      goalId: 6,
    }),
    goals,
  );

  const fixtureWithOtherId = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Complete one set of leg raises',
      description: 'Do one controlled set.',
      goalId: 42,
    }),
    goals,
  );

  assert.equal(realGoalWithId6.relevant, true);
  assert.equal(fixtureWithOtherId.reason, 'placeholder_goal');
});

test('accepts a null goal ID', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({ goalId: null }),
    createGoals(),
  );

  assert.equal(result.relevant, true);
  assert.equal(result.reason, 'unassigned');
});

test('allows any suggestion for a broad goal with no clear domain', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Complete one set of leg raises',
      description: 'Do one controlled set.',
      goalId: 7,
    }),
    [
      {
        id: 7,
        title: 'Become the best version of myself',
        description: 'Grow steadily and live with intention.',
      },
    ],
  );

  assert.equal(result.relevant, true);
  assert.equal(result.reason, 'undetermined');
});

test('accepts each domain covered by a multi-domain goal', () => {
  const goals = [
    {
      id: 8,
      title: 'Stay healthy while growing my software career',
      description: null,
    },
  ];

  const fitness = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Do a 20 minute workout',
      description: 'Bodyweight circuit.',
      goalId: 8,
    }),
    goals,
  );

  const coding = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Refactor one backend endpoint',
      description: 'Simplify one route handler.',
      goalId: 8,
    }),
    goals,
  );

  assert.equal(fitness.relevant, true);
  assert.equal(coding.relevant, true);
});

test('allows a generic suggestion with no clear domain', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({
      title: 'Plan tomorrow\'s top three priorities',
      description: 'Write them down before the end of the day.',
      goalId: 5,
    }),
    createGoals(),
  );

  assert.equal(result.relevant, true);
  assert.equal(result.reason, 'undetermined');
});

test('reports a goal that is not in the supplied context', () => {
  const result = assessSuggestionGoalRelevance(
    createSuggestion({ goalId: 99 }),
    createGoals(),
  );

  assert.equal(result.relevant, false);
  assert.equal(result.reason, 'goal_not_in_context');
});

test('does not treat ambiguous words as domain evidence', () => {
  assert.deepEqual(
    detectPlannerDomains('Complete three sets of leg raises'),
    ['health_fitness'],
  );

  assert.deepEqual(
    detectPlannerDomains('Run the training program for the new client'),
    [],
  );
});

test('detects explicit placeholder labels only', () => {
  assert.equal(isPlaceholderGoal(INSUFFICIENT_DATA_FIXTURE), true);
  assert.equal(
    isPlaceholderGoal({ title: 'TEST - Complete one measurable step' }),
    true,
  );
  assert.equal(isPlaceholderGoal({ title: '[Test] Morning routine' }), true);
  assert.equal(
    isPlaceholderGoal({
      title: 'Morning routine',
      description: 'Placeholder goal for UI testing',
    }),
    true,
  );

  assert.equal(
    isPlaceholderGoal({ title: 'Pass the AWS certification test' }),
    false,
  );
  assert.equal(
    isPlaceholderGoal({ title: 'Test drive a new running route' }),
    false,
  );
});

test('does not treat a legitimate goal with little data as a placeholder', () => {
  assert.equal(
    isPlaceholderGoal({
      id: 12,
      title: 'Learn to play the guitar',
      description: null,
      priority: 0,
      targetDate: null,
    }),
    false,
  );
});
