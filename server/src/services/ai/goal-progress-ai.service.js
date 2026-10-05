import { generateWithQwen } from './qwen.service.js';

import {
  buildGoalProgressPrompt,
} from './goal-progress-prompt.service.js';

export async function analyzeGoalProgress({
  goal,
  progress,
  activity,
  reflectionCorrelation,
}) {
  const prompt =
    buildGoalProgressPrompt({
      goal,
      progress,
      activity,
      reflectionCorrelation,
    });

  console.log(
    'Sending goal progress analysis prompt to Qwen...'
  );

  const result =
    await generateWithQwen(prompt);

  console.log(
    'Qwen goal progress response:'
  );

  console.log(result.response);

  let parsed;

  try {
    parsed = JSON.parse(result.response);
  } catch (error) {
    console.error(
      'Failed to parse Qwen goal progress JSON:',
      error
    );

    console.error(
      'Raw Qwen response:',
      result.response
    );

    throw new Error(
      'Qwen returned an invalid goal progress analysis JSON response.'
    );
  }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error(
            'Qwen returned an empty goal progress analysis.'
        );
        }

        if (
        parsed.id !== undefined &&
        parsed.title !== undefined &&
        parsed.summary === undefined
        ) {
        throw new Error(
            'Qwen returned the goal object instead of a goal progress analysis.'
        );
    }

  if (
    typeof parsed.summary !== 'string' ||
    !parsed.summary.trim()
  ) {
    throw new Error(
      'Qwen goal progress summary is invalid.'
    );
  }

  const validProgressLevels = [
    'not_started',
    'low',
    'moderate',
    'good',
    'excellent',
  ];

  if (
    !validProgressLevels.includes(
      parsed.progressLevel
    )
  ) {
    throw new Error(
      'Qwen returned an invalid goal progress level.'
    );
  }

  const validTrends = [
    'improving',
    'stable',
    'declining',
    'insufficient_data',
  ];

  if (
    !validTrends.includes(parsed.trend)
  ) {
    throw new Error(
      'Qwen returned an invalid goal progress trend.'
    );
  }

  if (!Array.isArray(parsed.strengths)) {
    throw new Error(
      'Qwen goal progress strengths must be an array.'
    );
  }

  if (!Array.isArray(parsed.blockers)) {
    throw new Error(
      'Qwen goal progress blockers must be an array.'
    );
  }

  if (!Array.isArray(parsed.reflectionInsights)) {
    throw new Error(
      'Qwen goal progress reflectionInsights must be an array.'
    );
  }

  if (!Array.isArray(parsed.recommendations)) {
    throw new Error(
      'Qwen goal progress recommendations must be an array.'
    );
  }

  const recommendations =
    parsed.recommendations.map(
      (recommendation) => {
        if (
          !recommendation ||
          typeof recommendation !== 'object'
        ) {
          throw new Error(
            'Qwen returned an invalid goal recommendation.'
          );
        }

        if (
          typeof recommendation.title !== 'string' ||
          !recommendation.title.trim()
        ) {
          throw new Error(
            'Qwen goal recommendation title is invalid.'
          );
        }

        if (
          typeof recommendation.reason !== 'string' ||
          !recommendation.reason.trim()
        ) {
          throw new Error(
            'Qwen goal recommendation reason is invalid.'
          );
        }

        return {
          title: recommendation.title.trim(),
          reason: recommendation.reason.trim(),
        };
      }
    );

  return {
    summary: parsed.summary.trim(),

    progressLevel:
      parsed.progressLevel,

    trend:
      parsed.trend,

    strengths:
      parsed.strengths.filter(
        (item) =>
          typeof item === 'string' &&
          item.trim()
      ),

    blockers:
      parsed.blockers.filter(
        (item) =>
          typeof item === 'string' &&
          item.trim()
      ),

    reflectionInsights:
      parsed.reflectionInsights.filter(
        (item) =>
          typeof item === 'string' &&
          item.trim()
      ),

    recommendations,
  };
}