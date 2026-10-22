import {
  generateWithQwen,
} from './qwen.service.js';

import {
  buildActionPlannerPrompt,
} from './action-planner-prompt.service.js';

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

function validateActionPlannerResponse(
  result
) {
  if (
    !result ||
    typeof result !== 'object'
  ) {
    throw new Error(
      'INVALID_ACTION_PLANNER_RESPONSE'
    );
  }

  if (
    !Array.isArray(result.suggestions)
  ) {
    throw new Error(
      'INVALID_ACTION_PLANNER_SUGGESTIONS'
    );
  }

  if (
    result.suggestions.length < 1 ||
    result.suggestions.length > 3
  ) {
    throw new Error(
      'INVALID_ACTION_PLANNER_COUNT'
    );
  }

  for (
    const suggestion of result.suggestions
  ) {
    if (
      !suggestion ||
      typeof suggestion !== 'object'
    ) {
      throw new Error(
        'INVALID_ACTION_SUGGESTION'
      );
    }

    if (
      typeof suggestion.title !== 'string' ||
      !suggestion.title.trim()
    ) {
      throw new Error(
        'INVALID_ACTION_SUGGESTION_TITLE'
      );
    }

    if (
      typeof suggestion.description !==
        'string' ||
      !suggestion.description.trim()
    ) {
      throw new Error(
        'INVALID_ACTION_SUGGESTION_DESCRIPTION'
      );
    }

    if (
      typeof suggestion.reasoning !==
        'string' ||
      !suggestion.reasoning.trim()
    ) {
      throw new Error(
        'INVALID_ACTION_SUGGESTION_REASONING'
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
        'INVALID_ACTION_SUGGESTION_PRIORITY'
      );
    }

    if (
      suggestion.goalId !== null &&
      !Number.isInteger(
        suggestion.goalId
      )
    ) {
      throw new Error(
        'INVALID_ACTION_SUGGESTION_GOAL_ID'
      );
    }
  }

  return result;
}

export async function generateActionPlan(
  context
) {
  const prompt =
    buildActionPlannerPrompt(
      context
    );

  const result =
    await generateWithQwen(prompt, {
      maxTokens: 1024,
    });

    console.log(
    'Qwen Action Planner Response:',
    result.response
  );

  const parsed =
    parseQwenJson(
      result.response
    );

  return validateActionPlannerResponse(
    parsed
  );
}