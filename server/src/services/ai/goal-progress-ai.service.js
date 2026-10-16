
import { generateWithQwen } from './qwen.service.js';

import {
  buildGoalProgressPrompt,
} from './goal-progress-prompt.service.js';

const goalProgressSchema = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
    },
    progressLevel: {
      type: 'string',
      enum: [
        'not_started',
        'low',
        'moderate',
        'good',
        'excellent',
      ],
    },
    trend: {
      type: 'string',
      enum: [
        'improving',
        'stable',
        'declining',
        'insufficient_data',
      ],
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    blockers: {
      type: 'array',
      items: { type: 'string' },
    },
    reflectionInsights: {
      type: 'array',
      items: { type: 'string' },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['title', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'summary',
    'progressLevel',
    'trend',
    'strengths',
    'blockers',
    'reflectionInsights',
    'recommendations',
  ],
  additionalProperties: false,
};

export async function analyzeGoalProgress({
  goal,
  progress,
  activity,
  reflectionCorrelation,
}) {
  const prompt = buildGoalProgressPrompt({
    goal,
    progress,
    activity,
    reflectionCorrelation,
  });

  console.log(
    'Sending goal progress analysis prompt to Qwen...'
  );

  const result = await generateWithQwen(prompt, {
    format: goalProgressSchema,
  });

  console.log('Qwen goal progress response:');
  console.log(result.response);

  let parsed;

  try {
    parsed = JSON.parse(result.response);
  } catch (error) {
    console.error(
      'Failed to parse Qwen goal progress JSON:',
      error
    );

    throw new Error(
      'Qwen returned an invalid goal progress analysis JSON response.'
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      'Qwen returned an empty or invalid goal progress analysis.'
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

  if (!validProgressLevels.includes(parsed.progressLevel)) {
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

  if (!validTrends.includes(parsed.trend)) {
    throw new Error(
      'Qwen returned an invalid goal progress trend.'
    );
  }

  for (const field of [
    'strengths',
    'blockers',
    'reflectionInsights',
  ]) {
    if (
      !Array.isArray(parsed[field]) ||
      !parsed[field].every(
        (item) =>
          typeof item === 'string' &&
          item.trim().length > 0
      )
    ) {
      throw new Error(
        `Qwen goal progress ${field} must be an array of non-empty strings.`
      );
    }
  }

  if (!Array.isArray(parsed.recommendations)) {
    throw new Error(
      'Qwen goal progress recommendations must be an array.'
    );
  }

  const recommendations = parsed.recommendations.map(
    (recommendation) => {
      if (
        !recommendation ||
        typeof recommendation !== 'object' ||
        Array.isArray(recommendation) ||
        typeof recommendation.title !== 'string' ||
        !recommendation.title.trim() ||
        typeof recommendation.reason !== 'string' ||
        !recommendation.reason.trim()
      ) {
        throw new Error(
          'Qwen returned an invalid goal recommendation.'
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
    progressLevel: parsed.progressLevel,
    trend: parsed.trend,
    strengths: parsed.strengths.map((item) => item.trim()),
    blockers: parsed.blockers.map((item) => item.trim()),
    reflectionInsights: parsed.reflectionInsights.map(
      (item) => item.trim()
    ),
    recommendations,
  };
}
