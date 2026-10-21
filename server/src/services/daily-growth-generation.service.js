import {
  getTodayDailyContext,
} from './daily-growth-loop.service.js';

import {
  buildDailyPlannerContext,
} from './daily-planner-context.builder.js';

import {
  generateDailyActionPlan,
} from './ai/daily-planner-ai.service.js';

import {
  validateDailyPlannerSuggestions,
} from './ai/daily-planner-validation.service.js';

import {
  persistDailyActionSuggestions,
} from './daily-planner-persistence.service.js';

import {
  buildDailyPlannerIntelligenceContext,
} from './daily-planner-intelligence-context.service.js';

export async function generateDailyGrowthSuggestions(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('INVALID_USER_ID');
  }

  const dailyContext =
    await getTodayDailyContext(userId);

  const plannerContext =
    buildDailyPlannerContext(dailyContext);

  const intelligenceContext =
    await buildDailyPlannerIntelligenceContext(
      userId,
      plannerContext,
    );

  const enrichedPlannerContext = {
    ...plannerContext,
    ...intelligenceContext,
  };
  console.log('Daily planner intelligence summary:', {
  relevantMemoryCount: enrichedPlannerContext.relevantMemories.length,
  goalProgressCount: enrichedPlannerContext.goalProgress.length,
  dataQuality: enrichedPlannerContext.dataQuality,
});
  const plan =
    await generateDailyActionPlan(enrichedPlannerContext);

  const validatedSuggestions =
    validateDailyPlannerSuggestions(
      plan.suggestions,
      enrichedPlannerContext,
    );

  const validatedPlan = {
    ...plan,
    suggestions: validatedSuggestions,
  };

  return persistDailyActionSuggestions(
    userId,
    enrichedPlannerContext,
    validatedPlan,
  );
}