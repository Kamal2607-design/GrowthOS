import {
  areLikelyDuplicateTitles,
  isActivePlannerGoal,
} from './daily-planner-quality.service.js';

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
    throw new Error(
      'DAILY_PLANNER_GOAL_NOT_ACTIVE_IN_CONTEXT'
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
    throw new Error(
      'DUPLICATE_EXISTING_ACTION'
    );
  }

  if (
    isDuplicateSuggestion(
      suggestion,
      context.pendingSuggestions ?? []
    )
  ) {
    throw new Error(
      'DUPLICATE_PENDING_SUGGESTION'
    );
  }

  return suggestion;
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
      throw new Error(
        'DUPLICATE_GENERATED_SUGGESTION'
      );
    }

    accepted.push(suggestion);
  }

  return accepted;
}
