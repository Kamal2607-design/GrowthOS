/**
 * Deterministic goal-relevance safeguard for daily planner suggestions.
 *
 * Goal membership (is the goal active and in the planner context?) is
 * checked separately by daily-planner-quality.service.js. This module
 * answers a different question: does an assigned goal plausibly fit the
 * suggestion?
 *
 * The rules are intentionally conservative. A suggestion is rejected only
 * when the evidence is explicit:
 * - the goal is labelled as a test/placeholder goal in its own text, or
 * - both the suggestion and the goal clearly belong to known life domains
 *   and those domains do not overlap.
 *
 * Anything else (broad goals, generic suggestions, null goal IDs) is
 * allowed. No goal is identified by its numeric ID.
 */

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/*
 * Only unambiguous vocabulary belongs here. Words with common meanings in
 * more than one domain ("run", "program", "model", "client", "raise") are
 * deliberately excluded so that they cannot cause a false rejection.
 */
const PLANNER_DOMAINS = {
  health_fitness: [
    'fitness', 'workout', 'exercise', 'exercising', 'gym',
    'strength training', 'cardio', 'hiit', 'yoga', 'stretching',
    'jog', 'jogging', 'abs', 'abdominal', 'six pack', 'sixpack',
    'core workout', 'plank', 'crunch', 'crunches', 'squat', 'lunge',
    'push up', 'pushup', 'pull up', 'pullup', 'sit up', 'situp',
    'burpee', 'deadlift', 'leg raise', 'mountain climber', 'reps',
    'muscle', 'body fat', 'fat loss', 'weight loss', 'lose weight',
    'diet', 'meal', 'meal prep', 'calorie', 'protein', 'nutrition',
    'nutritional', 'food', 'eat', 'eating', 'snack', 'sugar',
    'fasting', 'hydration', 'water intake', 'sleep', 'health',
    'healthy',
  ],

  software_ai: [
    'code', 'coding', 'coder', 'programming', 'programmer', 'software',
    'developer', 'engineer', 'engineering', 'javascript', 'typescript',
    'node js', 'nodejs', 'python', 'sql', 'postgres', 'postgresql',
    'database', 'api', 'backend', 'back end', 'frontend', 'front end',
    'full stack', 'fullstack', 'web app', 'react', 'docker', 'git',
    'github', 'deploy', 'deployment', 'debug', 'debugging', 'refactor',
    'refactoring', 'algorithm', 'data structure', 'leetcode',
    'system design', 'unit test', 'pull request', 'repository', 'ai',
    'artificial intelligence', 'machine learning', 'ml', 'llm', 'rag',
    'embedding', 'prompt engineering', 'neural network', 'prisma',
  ],

  career_finance: [
    'career', 'job', 'interview', 'resume', 'linkedin', 'portfolio',
    'salary', 'salaries', 'income', 'money', 'earn', 'earning',
    'earnings', 'freelance', 'freelancing', 'hiring', 'recruiter',
    'promotion', 'pay raise', 'budget', 'budgeting', 'saving',
    'savings', 'invest', 'investing', 'investment', 'expense', 'debt',
    'finance', 'financial', 'revenue',
  ],
};

const DOMAIN_PATTERNS = Object.entries(PLANNER_DOMAINS).map(
  ([domain, terms]) => ({
    domain,
    // Terms are matched on whole words, with an optional plural "s".
    pattern: new RegExp(
      `(?:^| )(?:${terms.map(escapeRegExp).join('|')})s?(?= |$)`,
    ),
  }),
);

/*
 * Explicit labels only. A goal with little or no activity is NOT a
 * placeholder; only its own title/description can mark it as one.
 */
const PLACEHOLDER_TITLE_PREFIXES = [
  /^\s*(?:test|dummy|placeholder|fixture)\s*[-:–—|]/i,
  /^\s*[[(]\s*(?:test|dummy|placeholder|fixture)\s*[\])]/i,
];

const PLACEHOLDER_PHRASES = [
  'test goal',
  'test fixture',
  'testing purposes',
  'placeholder',
  'dummy goal',
  'sample goal',
  'insufficient data goal',
  'insufficient data test',
  'insufficient data testing',
];

const PLACEHOLDER_PATTERN = new RegExp(
  `(?:^| )(?:${PLACEHOLDER_PHRASES.map(escapeRegExp).join('|')})(?= |$)`,
);

export function detectPlannerDomains(value) {
  const text = normalizeText(value);

  if (!text) {
    return [];
  }

  return DOMAIN_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ domain }) => domain);
}

export function isPlaceholderGoal(goal) {
  if (!goal || typeof goal !== 'object') {
    return false;
  }

  const title = String(goal.title ?? '');

  if (
    PLACEHOLDER_TITLE_PREFIXES.some((prefix) => prefix.test(title))
  ) {
    return true;
  }

  return PLACEHOLDER_PATTERN.test(
    normalizeText(`${title} ${goal.description ?? ''}`),
  );
}

/**
 * Returns { relevant, reason, suggestionDomains, goalDomains }.
 *
 * reason is one of:
 * - unassigned           goalId is null
 * - goal_not_in_context  goalId is not among the supplied active goals
 * - placeholder_goal     the goal is explicitly labelled as test data
 * - undetermined         not enough signal to judge; allowed
 * - domain_match         suggestion and goal share a domain
 * - domain_mismatch      both have clear domains and none overlap
 */
export function assessSuggestionGoalRelevance(
  suggestion,
  activeGoals,
) {
  const goalId = suggestion?.goalId ?? null;

  if (goalId === null) {
    return {
      relevant: true,
      reason: 'unassigned',
      suggestionDomains: [],
      goalDomains: [],
    };
  }

  const goal = (Array.isArray(activeGoals) ? activeGoals : []).find(
    (candidate) => candidate.id === goalId,
  );

  if (!goal) {
    return {
      relevant: false,
      reason: 'goal_not_in_context',
      suggestionDomains: [],
      goalDomains: [],
    };
  }

  if (isPlaceholderGoal(goal)) {
    return {
      relevant: false,
      reason: 'placeholder_goal',
      suggestionDomains: [],
      goalDomains: [],
    };
  }

  // Reasoning is excluded: it usually restates the goal, which would
  // make every suggestion look relevant.
  const suggestionDomains = detectPlannerDomains(
    `${suggestion.title ?? ''} ${suggestion.description ?? ''}`,
  );

  const goalDomains = detectPlannerDomains(
    `${goal.title ?? ''} ${goal.description ?? ''}`,
  );

  if (!suggestionDomains.length || !goalDomains.length) {
    return {
      relevant: true,
      reason: 'undetermined',
      suggestionDomains,
      goalDomains,
    };
  }

  const sharesDomain = suggestionDomains.some(
    (domain) => goalDomains.includes(domain),
  );

  return {
    relevant: sharesDomain,
    reason: sharesDomain ? 'domain_match' : 'domain_mismatch',
    suggestionDomains,
    goalDomains,
  };
}
