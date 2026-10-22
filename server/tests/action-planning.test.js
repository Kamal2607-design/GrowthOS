import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildActionSuggestionPrompt,
} from '../src/services/ai/action-prompt.service.js';

import {
  assertValidPlannerGoalReferences,
} from '../src/services/action-planner.service.js';

const GOAL = {
  id: 4,
  title: 'Become a strong Full Stack AI Engineer',
  description: 'Build full-stack and AI engineering skills.',
};

test('action prompt renders the vision record instead of [object Object]', () => {
  const prompt = buildActionSuggestionPrompt({
    vision: {
      id: 1,
      userId: 1,
      statement: 'Become an independent AI product builder',
      values: 'Learning, consistency',
      identity: null,
      futureSelf: '',
    },
    goal: GOAL,
  });

  assert.doesNotMatch(prompt, /\[object Object\]/);
  assert.match(
    prompt,
    /USER VISION:\nStatement: Become an independent AI product builder\nValues: Learning, consistency\n/,
  );
  assert.doesNotMatch(prompt, /Identity:|Future Self:/);
});

test('action prompt handles a missing vision', () => {
  for (const vision of [null, undefined, {}]) {
    const prompt = buildActionSuggestionPrompt({ vision, goal: GOAL });

    assert.match(prompt, /USER VISION:\nNo vision provided\./);
  }
});

test('action prompt still accepts a plain-text vision', () => {
  const prompt = buildActionSuggestionPrompt({
    vision: 'Ship useful AI products',
    goal: GOAL,
  });

  assert.match(prompt, /USER VISION:\nShip useful AI products\n/);
});

test('planner batch validation accepts valid and null goal IDs', () => {
  assert.doesNotThrow(() =>
    assertValidPlannerGoalReferences(
      [{ goalId: 4 }, { goalId: null }],
      [GOAL],
    ),
  );
});

test('planner batch validation rejects the whole plan for one bad goal', () => {
  // The invalid reference is last: the old loop would already have
  // persisted the first two suggestions before throwing.
  assert.throws(
    () =>
      assertValidPlannerGoalReferences(
        [{ goalId: 4 }, { goalId: null }, { goalId: 99 }],
        [GOAL],
      ),
    { message: 'AI_SUGGESTION_REFERENCES_INVALID_GOAL' },
  );
});
