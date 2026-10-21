import {
  generateWithQwen,
} from './qwen.service.js';

import {
  buildDailyPlannerPrompt,
} from './daily-planner-prompt.service.js';


function parseQwenJson(response) {
  if (!response) {
    throw new Error(
      'QWEN_EMPTY_RESPONSE'
    );
  }

  try {
    return JSON.parse(response);
  } catch {
    throw new Error(
      'QWEN_INVALID_JSON_RESPONSE'
    );
  }
}

function validateSuggestionStructure(
  suggestion
) {
  if (
    !suggestion ||
    typeof suggestion !== 'object'
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTION'
    );
  }

  if (
    typeof suggestion.title !== 'string' ||
    !suggestion.title.trim()
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTION_TITLE'
    );
  }

  if (
    typeof suggestion.description !==
      'string' ||
    !suggestion.description.trim()
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTION_DESCRIPTION'
    );
  }

  if (
    typeof suggestion.reasoning !==
      'string' ||
    !suggestion.reasoning.trim()
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTION_REASONING'
    );
  }

  if (
    !Number.isInteger(
      suggestion.priority
    ) ||
    suggestion.priority < 1 ||
    suggestion.priority > 5
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTION_PRIORITY'
    );
  }

  if (
    suggestion.goalId !== null &&
    !Number.isInteger(
      suggestion.goalId
    )
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTION_GOAL_ID'
    );
  }
}

function validateDailyPlannerResponse(
  result,
  context
) {
  if (
    !result ||
    typeof result !== 'object'
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_RESPONSE'
    );
  }

  if (
    !Array.isArray(result.suggestions)
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_SUGGESTIONS'
    );
  }

  if (
    result.suggestions.length < 1 ||
    result.suggestions.length > 3
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_COUNT'
    );
  }

  const activeGoalIds = new Set(
    (context.activeGoals ?? []).map(
      (goal) => goal.id
    )
  );

  for (
    const suggestion of result.suggestions
  ) {
    validateSuggestionStructure(
      suggestion
    );

    if (
      suggestion.goalId !== null &&
      !activeGoalIds.has(
        suggestion.goalId
      )
    ) {
      throw new Error(
        'INVALID_DAILY_PLANNER_GOAL_REFERENCE'
      );
    }
  }

  return result;
}

export async function generateDailyActionPlan(
  context
) {
  const prompt =
    buildDailyPlannerPrompt(
      context
    );

  const result =
    // Plain JSON mode: measured with qwen3:4b, a JSON-schema format made
    // the model copy existing tasks far more often. The token cap stops
    // runaway output (a truncated reply fails validation and is retried).
    await generateWithQwen(prompt, {
      maxTokens: 1024,
    });

  console.log(
    'Qwen Daily Planner Response:',
    result.response
  );

  const parsed =
  parseQwenJson(
    result.response
  );

  // Structural checks only. Context rules (duplicates, goal relevance,
  // grounding) are applied by the generation service, which can drop
  // repeats and retry.
  return validateDailyPlannerResponse(
    parsed,
    context
  );
}