function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isDuplicateSuggestion(
  suggestion,
  existingItems
) {
  const normalizedTitle =
    normalizeText(
      suggestion.title
    );

  if (!normalizedTitle) {
    return false;
  }

  return existingItems.some(
    (item) =>
      normalizeText(item.title) ===
      normalizedTitle
  );
}

export function validateSuggestionAgainstContext(
  suggestion,
  context
) {
  const existingActions = [
    ...(context.currentActions?.pending ??
      []),
    ...(context.currentActions
      ?.inProgress ?? []),
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
  const accepted = [];

  for (const suggestion of suggestions) {
    validateSuggestionAgainstContext(
      suggestion,
      context
    );

    const duplicateInCurrentResponse =
      isDuplicateSuggestion(
        suggestion,
        accepted
      );

    if (
      duplicateInCurrentResponse
    ) {
      throw new Error(
        'DUPLICATE_GENERATED_SUGGESTION'
      );
    }

    accepted.push(suggestion);
  }

  return accepted;
}