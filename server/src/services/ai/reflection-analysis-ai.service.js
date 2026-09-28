import { generateWithQwen } from './qwen.service.js';

import {
  buildReflectionAnalysisPrompt,
} from './reflection-prompt.service.js';

export async function analyzeReflection({
  reflection,
  vision,
  goals,
  actions,
}) {
  const prompt =
    buildReflectionAnalysisPrompt({
      reflection,
      vision,
      goals,
      actions,
    });

  console.log(
    'Sending reflection analysis prompt to Qwen...'
  );

  const result =
    await generateWithQwen(prompt);

  console.log(
    'Qwen reflection analysis response:'
  );

  console.log(result.response);

  let parsed;

  try {
    parsed = JSON.parse(result.response);
  } catch (error) {
    console.error(
      'Failed to parse Qwen reflection JSON:',
      error
    );

    console.error(
      'Raw Qwen response:',
      result.response
    );

    throw new Error(
      'Qwen returned an invalid reflection analysis JSON response.'
    );
  }

  if (!parsed) {
    throw new Error(
      'Qwen returned an empty reflection analysis.'
    );
  }

  if (
    typeof parsed.summary !== 'string' ||
    typeof parsed.moodAnalysis !== 'string' ||
    typeof parsed.productivityAnalysis !== 'string'
  ) {
    throw new Error(
      'Qwen reflection analysis has an invalid structure.'
    );
  }

  if (!Array.isArray(parsed.highlights)) {
    throw new Error(
      'Qwen reflection analysis highlights must be an array.'
    );
  }

  if (!Array.isArray(parsed.challenges)) {
    throw new Error(
      'Qwen reflection analysis challenges must be an array.'
    );
  }

  if (!Array.isArray(parsed.learnings)) {
    throw new Error(
      'Qwen reflection analysis learnings must be an array.'
    );
  }

  if (!Array.isArray(parsed.goalAlignment)) {
    throw new Error(
      'Qwen reflection analysis goalAlignment must be an array.'
    );
  }

  if (!Array.isArray(parsed.recommendedActions)) {
    throw new Error(
      'Qwen reflection analysis recommendedActions must be an array.'
    );
  }

  return {
    summary: parsed.summary,
    moodAnalysis: parsed.moodAnalysis,
    productivityAnalysis:
      parsed.productivityAnalysis,

    highlights: parsed.highlights,
    challenges: parsed.challenges,
    learnings: parsed.learnings,

    goalAlignment:
      parsed.goalAlignment.map((item) => ({
        goal: item.goal,
        alignment: item.alignment,
        reason: item.reason,
      })),

    recommendedActions:
      parsed.recommendedActions.map((action) => ({
        title: action.title,
        reason: action.reason,
      })),
  };
}