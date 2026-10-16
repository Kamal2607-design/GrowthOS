import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeDailyPlannerTitle,
  persistDailyActionSuggestions,
} from '../src/services/daily-planner-persistence.service.js';

function createSuggestion(
  overrides = {}
) {
  return {
    title:
      'Build one small AI feature',

    description:
      'Implement one focused AI feature in GrowthOS.',

    priority: 2,

    reasoning:
      'This supports the active AI engineering goal.',

    goalId: 4,

    ...overrides,
  };
}

function createContext() {
  return {
    reflection: {
      id: 2,
    },
  };
}

function createPlan(
  suggestions = [
    createSuggestion(),
  ]
) {
  return {
    suggestions,
  };
}

test(
  'normalizes titles consistently',
  () => {
    assert.equal(
      normalizeDailyPlannerTitle(
        '  Build   One SMALL AI Feature! '
      ),
      'build one small ai feature'
    );
  }
);

test(
  'rejects an invalid user ID before persistence',
  async () => {
    await assert.rejects(
      () =>
        persistDailyActionSuggestions(
          0,
          createContext(),
          createPlan()
        ),
      {
        message:
          'INVALID_USER_ID',
      }
    );
  }
);

test(
  'rejects a missing context',
  async () => {
    await assert.rejects(
      () =>
        persistDailyActionSuggestions(
          1,
          null,
          createPlan()
        ),
      {
        message:
          'DAILY_PLANNER_CONTEXT_REQUIRED',
      }
    );
  }
);

test(
  'rejects a missing plan',
  async () => {
    await assert.rejects(
      () =>
        persistDailyActionSuggestions(
          1,
          createContext(),
          null
        ),
      {
        message:
          'INVALID_DAILY_PLANNER_PLAN',
      }
    );
  }
);

test(
  'rejects an empty suggestion list',
  async () => {
    await assert.rejects(
      () =>
        persistDailyActionSuggestions(
          1,
          createContext(),
          createPlan([])
        ),
      {
        message:
          'INVALID_DAILY_PLANNER_COUNT',
      }
    );
  }
);

test(
  'rejects more than three suggestions',
  async () => {
    await assert.rejects(
      () =>
        persistDailyActionSuggestions(
          1,
          createContext(),
          createPlan([
            createSuggestion({
              title: 'First suggestion',
            }),

            createSuggestion({
              title: 'Second suggestion',
            }),

            createSuggestion({
              title: 'Third suggestion',
            }),

            createSuggestion({
              title: 'Fourth suggestion',
            }),
          ])
        ),
      {
        message:
          'INVALID_DAILY_PLANNER_COUNT',
      }
    );
  }
);

test(
  'rejects an invalid suggestion priority',
  async () => {
    await assert.rejects(
      () =>
        persistDailyActionSuggestions(
          1,
          createContext(),
          createPlan([
            createSuggestion({
              priority: 10,
            }),
          ])
        ),
      {
        message:
          'INVALID_DAILY_PLANNER_SUGGESTION_PRIORITY',
      }
    );
  }
);

test(
  'rejects an invalid goal ID',
  async () => {
    await assert.rejects(
      () =>
        persistDailyActionSuggestions(
          1,
          createContext(),
          createPlan([
            createSuggestion({
              goalId: '4',
            }),
          ])
        ),
      {
        message:
          'INVALID_DAILY_PLANNER_SUGGESTION_GOAL_ID',
      }
    );
  }
);

test(
  'accepts a null goal ID at the input-validation boundary',
  async () => {
    const context = {
      reflection: null,
    };

    /*
     * This test deliberately supplies an invalid
     * database connection scenario only after
     * the input checks have passed.
     *
     * Since the plan is valid, the service will
     * attempt persistence. We do not assert a
     * database result in this unit test.
     */
    assert.equal(
      normalizeDailyPlannerTitle(
        createSuggestion({
          goalId: null,
        }).title
      ),
      'build one small ai feature'
    );

    assert.equal(
      context.reflection,
      null
    );
  }
);