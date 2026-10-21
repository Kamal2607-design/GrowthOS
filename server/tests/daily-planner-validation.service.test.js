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


test('rejects an exact duplicate of a pending suggestion', () => {
  const context = createContext();

  context.pendingSuggestions = [
    {
      id: 44,
      title: 'Solve one LeetCode problem',
      goalId: 4,
      priority: 1,
    },
  ];

  assert.throws(
    () =>
      validateSuggestionAgainstContext(
        createSuggestion('Solve one LeetCode problem'),
        context,
      ),
  );
});


test(
  'rejects a goal absent from active planner context',
  () => {
    const suggestion = {
      ...createSuggestion(
        'Complete one workout'
      ),
      goalId: 6,
    };

    assert.throws(
      () =>
        validateSuggestionAgainstContext(
          suggestion,
          createContext()
        ),
      {
        message:
          'DAILY_PLANNER_GOAL_NOT_ACTIVE_IN_CONTEXT',
      }
    );
  }
);

test(
  'allows a suggestion without a goal',
  () => {
    const suggestion = {
      ...createSuggestion(
        'Build one small AI feature'
      ),
      goalId: null,
    };

    assert.equal(
      validateSuggestionAgainstContext(
        suggestion,
        createContext()
      ),
      suggestion
    );
  }
);

test(
  'rejects a highly overlapping existing action title',
  () => {
    const context = createContext();

    context.currentActions.pending = [
      {
        id: 55,
        title:
          'Review recent coding solutions',
      },
    ];

    assert.throws(
      () =>
        validateSuggestionAgainstContext(
          createSuggestion(
            'Review recent coding solutions today'
          ),
          context
        ),
      {
        message:
          'DUPLICATE_EXISTING_ACTION',
      }
    );
  }
);

test(
  'rejects a highly overlapping pending suggestion',
  () => {
    const context = createContext();

    context.pendingSuggestions = [
      {
        id: 56,
        title:
          'Build one small AI feature',
      },
    ];

    assert.throws(
      () =>
        validateSuggestionAgainstContext(
          createSuggestion(
            'Build one small AI feature today'
          ),
          context
        ),
      {
        message:
          'DUPLICATE_PENDING_SUGGESTION',
      }
    );
  }
);

test(
  'rejects a highly overlapping suggestion in the same batch',
  () => {
    const suggestions = [
      createSuggestion(
        'Review recent coding solutions'
      ),
      createSuggestion(
        'Review recent coding solutions today'
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
