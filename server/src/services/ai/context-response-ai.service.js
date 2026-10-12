import {
  generateWithQwen,
} from './qwen.service.js';

import {
  buildContextResponsePrompt,
} from './context-response-prompt.service.js';

function parseQwenJson(response) {
  if (!response) {
    throw new Error(
      'QWEN_EMPTY_RESPONSE'
    );
  }

  try {
    return JSON.parse(response);
  } catch (error) {
    throw new Error(
      'QWEN_INVALID_JSON_RESPONSE'
    );
  }
}

function validateResponse(result) {
  if (
    !result ||
    typeof result !== 'object'
  ) {
    throw new Error(
      'INVALID_AI_RESPONSE'
    );
  }

  if (
    typeof result.answer !== 'string' ||
    !result.answer.trim()
  ) {
    throw new Error(
      'INVALID_AI_RESPONSE_ANSWER'
    );
  }

  if (
    !Array.isArray(result.keyInsights)
  ) {
    throw new Error(
      'INVALID_AI_RESPONSE_INSIGHTS'
    );
  }

  if (
    !Array.isArray(
      result.recommendedActions
    )
  ) {
    throw new Error(
      'INVALID_AI_RESPONSE_ACTIONS'
    );
  }

  for (
    const action of result.recommendedActions
  ) {
    if (
      !action ||
      typeof action !== 'object' ||
      typeof action.title !== 'string' ||
      typeof action.reason !== 'string'
    ) {
      throw new Error(
        'INVALID_AI_RECOMMENDED_ACTION'
      );
    }
  }

  return result;
}

export async function generateContextResponse(
  context
) {
  const prompt =
    buildContextResponsePrompt(
      context
    );

  const result =
    await generateWithQwen(prompt);

  const parsed =
    parseQwenJson(
      result.response
    );

  return validateResponse(parsed);
}