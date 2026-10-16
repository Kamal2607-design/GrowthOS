import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isDuplicateSuggestion,
  validateSuggestionAgainstContext,
  validateDailyPlannerSuggestions,
} from '../src/services/ai/daily-planner-validation.service.js';

function createSuggestion(
  title
) {
  return {
    title,
    description:
      'Complete this task.',
    priority: 2,
    reasoning:
      'This supports the current goal.',
    goalId: 4,
  };
}

function createContext() {
  return {
    activeGoals: [
      {
        id: 4,
        title:
          'Become a strong AI engineer',
      },
    ],

    currentActions: {
      pending: [
        {
          id: 12,
          title:
            'Complete one AI engineering coding task',
        },
      ],

      inProgress: [
        {
          id: 13,
          title:
            'Study advanced Node.js patterns',
        },
      ],
    },

    pendingSuggestions: [
      {
        id: 21,
        title:
          'Practice coding challenges',
      },
    ],
  };
}

test(
  'detects exact normalized title duplicates',
  () => {
    const duplicate =
      isDuplicateSuggestion(
        createSuggestion(
          '  Practice   coding challenges '
        ),
        [
          {
            title:
              'practice coding challenges',
          },
        ]
      );

    assert.equal(
      duplicate,
      true
    );
  }
);

test(
  'allows a different suggestion',
  () => {
    const duplicate =
      isDuplicateSuggestion(
        createSuggestion(
          'Build one small AI feature'
        ),
        [
          {
            title:
              'Practice coding challenges',
          },
        ]
      );

    assert.equal(
      duplicate,
      false
    );
  }
);

test(
  'rejects duplicate existing action',
  () => {
    assert.throws(
      () =>
        validateSuggestionAgainstContext(
          createSuggestion(
            'Complete one AI engineering coding task'
          ),
          createContext()
        ),
      {
        message:
          'DUPLICATE_EXISTING_ACTION',
      }
    );
  }
);

test(
  'rejects duplicate pending suggestion',
  () => {
    assert.throws(
      () =>
        validateSuggestionAgainstContext(
          createSuggestion(
            'Practice coding challenges'
          ),
          createContext()
        ),
      {
        message:
          'DUPLICATE_PENDING_SUGGESTION',
      }
    );
  }
);

test(
  'rejects duplicate suggestions generated in same response',
  () => {
    const suggestions = [
      createSuggestion(
        'Build one small AI feature'
      ),
      createSuggestion(
        'Build one small AI feature'
      ),
    ];

    assert.throws(
      () =>
        validateDailyPlannerSuggestions(
          suggestions,
          createContext()
        ),
      {
        message:
          'DUPLICATE_GENERATED_SUGGESTION',
      }
    );
  }
);

test(
  'accepts unique suggestions',
  () => {
    const suggestions = [
      createSuggestion(
        'Build one small AI feature'
      ),
      createSuggestion(
        'Review one difficult coding concept'
      ),
    ];

    const result =
      validateDailyPlannerSuggestions(
        suggestions,
        createContext()
      );

    assert.equal(
      result.length,
      2
    );
  }
);