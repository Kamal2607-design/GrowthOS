import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findUnsupportedReflectionClaim,
} from '../src/services/ai/daily-planner-grounding.service.js';

const NO_REFLECTION = {
  reflection: null,
  reflectionAnalysis: null,
};

const WITH_REFLECTION = {
  reflection: {
    id: 2,
    content: 'Completed one set of leg raises.',
  },
};

function createSuggestion(overrides = {}) {
  return {
    title: 'Complete one set of leg raises',
    description: 'Do one controlled set of leg raises.',
    priority: 2,
    reasoning: 'Builds consistency toward the fitness goal.',
    goalId: 5,
    ...overrides,
  };
}

test('rejects "based on today\'s reflection" when no reflection exists', () => {
  const claim = findUnsupportedReflectionClaim(
    createSuggestion({
      reasoning:
        'Based on today\'s reflection, the user completed leg raises.',
    }),
    NO_REFLECTION,
  );

  assert.equal(claim.field, 'reasoning');
  assert.match(claim.excerpt, /today's reflection/);
});

test('rejects a reflection claim verb when no reflection exists', () => {
  assert.ok(
    findUnsupportedReflectionClaim(
      createSuggestion({
        reasoning: 'Today\'s reflection shows strong progress on abs.',
      }),
      NO_REFLECTION,
    ),
  );
});

test('rejects claims that the user reported something today', () => {
  assert.ok(
    findUnsupportedReflectionClaim(
      createSuggestion({
        reasoning:
          'The user reported earlier today that leg raises felt easy.',
      }),
      NO_REFLECTION,
    ),
  );

  assert.ok(
    findUnsupportedReflectionClaim(
      createSuggestion({
        description:
          'In your reflection today you mentioned skipping the workout.',
      }),
      NO_REFLECTION,
    ),
  );
});

test('handles curly apostrophes and same-day phrasing', () => {
  assert.ok(
    findUnsupportedReflectionClaim(
      createSuggestion({
        reasoning: 'Today’s reflection indicates low energy.',
      }),
      NO_REFLECTION,
    ),
  );

  assert.ok(
    findUnsupportedReflectionClaim(
      createSuggestion({
        reasoning:
          'According to the user\'s same-day reflection, abs work is going well.',
      }),
      NO_REFLECTION,
    ),
  );
});

test('allows a suggestion to write today\'s reflection', () => {
  assert.equal(
    findUnsupportedReflectionClaim(
      createSuggestion({
        title: 'Write today\'s reflection',
        description:
          'Record what you completed and what was difficult in today\'s reflection.',
        reasoning: 'No reflection has been recorded today.',
        goalId: null,
      }),
      NO_REFLECTION,
    ),
    null,
  );
});

test('allows historical memory and past reflection references', () => {
  assert.equal(
    findUnsupportedReflectionClaim(
      createSuggestion({
        reasoning:
          'A past memory mentions leg raises, and your recent reflections ' +
          'mention consistency challenges.',
      }),
      NO_REFLECTION,
    ),
    null,
  );
});

test('allows same-day reflection references when a reflection exists', () => {
  assert.equal(
    findUnsupportedReflectionClaim(
      createSuggestion({
        reasoning:
          'Based on today\'s reflection, the user completed leg raises.',
      }),
      WITH_REFLECTION,
    ),
    null,
  );
});
