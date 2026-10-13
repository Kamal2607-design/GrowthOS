import { generateWithQwen } from './qwen.service.js';

import {
  buildMemoryNormalizationPrompt,
} from './memory-normalization-prompt.service.js';

export async function normalizeMemoryWithAI(
  memory
) {
  const prompt =
    buildMemoryNormalizationPrompt({
      memory,
    });

  console.log(
    'Sending memory normalization prompt to Qwen...'
  );

  const result =
    await generateWithQwen(prompt);

  console.log(
    'Qwen memory normalization response:'
  );

  console.log(result.response);

  let parsed;

  try {
    parsed = JSON.parse(result.response);
  } catch (error) {
    console.error(
      'Failed to parse memory normalization JSON:',
      error
    );

    console.error(
      'Raw Qwen response:',
      result.response
    );

    throw new Error(
      'Qwen returned invalid memory normalization JSON.'
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object'
  ) {
    throw new Error(
      'Qwen returned an empty memory normalization response.'
    );
  }
  if (
    parsed.type !== undefined ||
    parsed.content !== undefined ||
    parsed.source !== undefined ||
    parsed.importance !== undefined
    ) {
    throw new Error(
        'Qwen returned the raw memory object instead of normalized memory.'
    );
    }

  if (
    typeof parsed.normalizedContent !== 'string' ||
    !parsed.normalizedContent.trim()
  ) {
    throw new Error(
      'Qwen normalized memory content is invalid.'
    );
  }

  return {
    normalizedContent:
      parsed.normalizedContent.trim(),
  };
}