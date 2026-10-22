
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  areExactTitleDuplicates,
  areLikelyDuplicateTitles,
  isActivePlannerGoal,
} from '../src/services/ai/daily-planner-quality.service.js';

test('detects exact titles after normalization', () => {
  assert.equal(
    areExactTitleDuplicates(
      '  Build   an AI feature! ',
      'build an ai feature'
    ),
    true
  );
});

test('detects highly overlapping titles', () => {
  assert.equal(
    areLikelyDuplicateTitles(
      'Review recent coding solutions',
      'Review recent coding solutions today'
    ),
    true
  );
});

test('does not flag unrelated titles', () => {
  assert.equal(
    areLikelyDuplicateTitles(
      'Build an AI feature',
      'Complete a workout'
    ),
    false
  );
});

test('does not flag a legitimate refinement with limited overlap', () => {
  assert.equal(
    areLikelyDuplicateTitles(
      'Practice coding challenges',
      'Solve one LeetCode problem'
    ),
    false
  );
});

test('accepts a null goal ID', () => {
  assert.equal(
    isActivePlannerGoal(null, [
      { id: 4, title: 'Become a strong AI engineer' },
    ]),
    true
  );
});

test('accepts a goal present in the active planner context', () => {
  assert.equal(
    isActivePlannerGoal(4, [
      { id: 4, title: 'Become a strong AI engineer' },
    ]),
    true
  );
});

test('rejects a goal absent from the active planner context', () => {
  assert.equal(
    isActivePlannerGoal(6, [
      { id: 4, title: 'Become a strong AI engineer' },
    ]),
    false
  );
});

test('ignores filler words when comparing titles', () => {
  assert.equal(
    areLikelyDuplicateTitles(
      'Complete a short AI engineering task',
      'Complete one AI engineering coding task'
    ),
    true
  );
});

test('does not flag different tasks on the same topic', () => {
  assert.equal(
    areLikelyDuplicateTitles(
      'Review one recent coding task for improvements',
      'Complete one AI engineering coding task'
    ),
    false
  );
  assert.equal(
    areLikelyDuplicateTitles(
      'Track one fitness metric for abs',
      'Complete one set of leg raises'
    ),
    false
  );
});
