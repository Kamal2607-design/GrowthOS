
function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean);
}

const CONCEPT_GROUPS = [
  new Set([
    'leetcode',
    'coding',
    'code',
    'programming',
    'problem',
    'problems',
    'challenge',
    'challenges',
  ]),
  new Set([
    'leg',
    'legs',
    'raise',
    'raises',
    'crunch',
    'crunches',
    'abs',
    'abdominal',
  ]),
  new Set([
    'food',
    'meal',
    'meals',
    'calorie',
    'calories',
    'diet',
    'nutrition',
    'journal',
    'track',
    'tracking',
    'log',
    'logging',
  ]),
  new Set([
    'review',
    'reviews',
    'solution',
    'solutions',
    'problem',
    'problems',
    'coding',
    'code',
  ]),
];

function conceptSignature(value) {
  const tokens = new Set(tokenize(value));

  return CONCEPT_GROUPS
    .map((group, index) => ({
      index,
      matched: [...tokens].some((token) =>
        group.has(token)
      ),
    }))
    .filter((item) => item.matched)
    .map((item) => item.index);
}

function hasSharedConcept(left, right) {
  const leftConcepts = new Set(
    conceptSignature(left)
  );

  return conceptSignature(right).some(
    (concept) => leftConcepts.has(concept)
  );
}


function tokenOverlapRatio(left, right) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersection = [...leftTokens].filter(
    (token) => rightTokens.has(token)
  ).length;

  // Compare against the shorter title so adding a
  // small qualifier such as "today" doesn't hide
  // an otherwise obvious duplicate.
  const shorterSize = Math.min(
    leftTokens.size,
    rightTokens.size
  );

  return intersection / shorterSize;
}

export function areExactTitleDuplicates(left, right) {
  return normalizeText(left) === normalizeText(right);
}

/**
 * Conservative title similarity check.
 *
 * This does not establish that two actions are
 * semantically identical. It flags likely overlaps
 * for review by the caller.
 */

export function areLikelyDuplicateTitles(left, right) {
  if (areExactTitleDuplicates(left, right)) {
    return true;
  }

  if (!normalizeText(left) || !normalizeText(right)) {
    return false;
  }

  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  const shorterTokens =
    leftTokens.size <= rightTokens.size
      ? leftTokens
      : rightTokens;

  const longerTokens =
    leftTokens.size <= rightTokens.size
      ? rightTokens
      : leftTokens;

  // Avoid treating very short titles as duplicates
  // merely because they appear inside another title.
  if (shorterTokens.size < 3) {
    return false;
  }

  const sharedTokenCount = [...shorterTokens].filter(
    (token) => longerTokens.has(token)
  ).length;

  const containmentRatio =
    sharedTokenCount / shorterTokens.size;

  return containmentRatio >= 0.8;
}

/**
 * Check whether a goal ID exists among the active
 * goals supplied to the planner.
 *
 * This verifies membership, not semantic relevance.
 */
export function isActivePlannerGoal(goalId, activeGoals) {
  if (goalId === null) {
    return true;
  }

  return (
    Number.isInteger(goalId) &&
    Array.isArray(activeGoals) &&
    activeGoals.some(
      (goal) => goal.id === goalId
    )
  );
}
