/**
 * Mirrors the server's explicit test/placeholder goal rule
 * (server/src/services/ai/daily-planner-goal-relevance.service.js) so the UI
 * can label goals the planner ignores. Detection is text-based only: a goal
 * with little activity is never treated as a placeholder.
 */

const PREFIXES = [
  /^\s*(?:test|dummy|placeholder|fixture)\s*[-:–—|]/i,
  /^\s*[[(]\s*(?:test|dummy|placeholder|fixture)\s*[\])]/i,
];

const PHRASES =
  /(?:^| )(?:test goal|test fixture|testing purposes|placeholder|dummy goal|sample goal|insufficient data goal|insufficient data test|insufficient data testing)(?= |$)/;

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isPlaceholderGoal(goal) {
  if (!goal) {
    return false;
  }

  const title = String(goal.title ?? '');

  if (PREFIXES.some((prefix) => prefix.test(title))) {
    return true;
  }

  return PHRASES.test(normalize(`${title} ${goal.description ?? ''}`));
}

export function shortGoalName(goal) {
  if (!goal?.title) {
    return '';
  }

  return goal.title.length > 36 ? `${goal.title.slice(0, 34).trimEnd()}…` : goal.title;
}

export const GOAL_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
];
