import {
  areLikelyDuplicateTitles,
  isActivePlannerGoal,
} from './daily-planner-quality.service.js';

import {
  assessSuggestionGoalRelevance,
} from './daily-planner-goal-relevance.service.js';

import {
  findUnsupportedReflectionClaim,
} from './daily-planner-grounding.service.js';

// Rejection errors carry the offending title so a retry can
// tell the model exactly what to avoid.
export function createPlannerRejection(code, suggestion) {
  const error = new Error(code);
  error.suggestionTitle =
    typeof suggestion?.title === 'string' ? suggestion.title : null;
  return error;
}

export function isDuplicateSuggestion(
  suggestion,
  existingItems
) {
  return (existingItems ?? []).some(
    (item) =>
      areLikelyDuplicateTitles(
        suggestion?.title,
        item?.title
      )
  );
}

export function validateSuggestionAgainstContext(
  suggestion,
  context
) {
  if (
    !suggestion ||
    typeof suggestion.title !== 'string' ||
    !suggestion.title.trim()
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTION_TITLE'
    );
  }

  if (
    !isActivePlannerGoal(
      suggestion.goalId,
      context.activeGoals ?? []
    )
  ) {
    throw createPlannerRejection(
      'DAILY_PLANNER_GOAL_NOT_ACTIVE_IN_CONTEXT',
      suggestion
    );
  }

  const relevance =
    assessSuggestionGoalRelevance(
      suggestion,
      context.activeGoals ?? []
    );

  if (relevance.reason === 'placeholder_goal') {
    throw createPlannerRejection(
      'DAILY_PLANNER_GOAL_IS_PLACEHOLDER',
      suggestion
    );
  }

  if (relevance.reason === 'domain_mismatch') {
    throw createPlannerRejection(
      'DAILY_PLANNER_GOAL_MISMATCH',
      suggestion
    );
  }

  if (
    findUnsupportedReflectionClaim(
      suggestion,
      context
    )
  ) {
    throw createPlannerRejection(
      'DAILY_PLANNER_UNSUPPORTED_REFLECTION_CLAIM',
      suggestion
    );
  }

  const existingActions = [
    ...(context.currentActions?.pending ?? []),
    ...(context.currentActions?.inProgress ?? []),
  ];

  if (
    isDuplicateSuggestion(
      suggestion,
      existingActions
    )
  ) {
    throw createPlannerRejection(
      'DUPLICATE_EXISTING_ACTION',
      suggestion
    );
  }

  if (
    isDuplicateSuggestion(
      suggestion,
      context.pendingSuggestions ?? []
    )
  ) {
    throw createPlannerRejection(
      'DUPLICATE_PENDING_SUGGESTION',
      suggestion
    );
  }

  return suggestion;
}

/**
 * Splits a plan into new suggestions and repeats of existing work
 * (pending/in-progress Actions, pending Suggestions, or an earlier entry in
 * the same plan). Repeats are harmless and are dropped rather than failing
 * the whole plan; everything else is still validated strictly.
 */
export function partitionDuplicateSuggestions(
  suggestions,
  context
) {
  const existingActions = [
    ...(context.currentActions?.pending ?? []),
    ...(context.currentActions?.inProgress ?? []),
  ];

  const fresh = [];
  const duplicates = [];

  for (const suggestion of suggestions ?? []) {
    let code = null;

    if (isDuplicateSuggestion(suggestion, existingActions)) {
      code = 'DUPLICATE_EXISTING_ACTION';
    } else if (
      isDuplicateSuggestion(suggestion, context.pendingSuggestions ?? [])
    ) {
      code = 'DUPLICATE_PENDING_SUGGESTION';
    } else if (isDuplicateSuggestion(suggestion, fresh)) {
      code = 'DUPLICATE_GENERATED_SUGGESTION';
    }

    if (code) {
      duplicates.push({ suggestion, code });
    } else {
      fresh.push(suggestion);
    }
  }

  return { fresh, duplicates };
}

export function validateDailyPlannerSuggestions(
  suggestions,
  context
) {
  if (!Array.isArray(suggestions)) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTIONS'
    );
  }

  const accepted = [];

  for (const suggestion of suggestions) {
    validateSuggestionAgainstContext(
      suggestion,
      context
    );

    if (
      isDuplicateSuggestion(
        suggestion,
        accepted
      )
    ) {
      throw createPlannerRejection(
        'DUPLICATE_GENERATED_SUGGESTION',
        suggestion
      );
    }

    accepted.push(suggestion);
  }

  return accepted;
}
