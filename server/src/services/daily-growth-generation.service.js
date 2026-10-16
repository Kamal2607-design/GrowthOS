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


export async function generateDailyGrowthSuggestions(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('INVALID_USER_ID');
  }

  // 1. Build the canonical daily context.
  const dailyContext =
    await getTodayDailyContext(userId);

  // 2. Reduce it to the AI planner context.
  const plannerContext =
    buildDailyPlannerContext(dailyContext);

  // 3. Ask Qwen to generate candidate suggestions.
  const plan =
    await generateDailyActionPlan(plannerContext);

  // 4. Validate against the current planner context.
  const validatedSuggestions =
    validateDailyPlannerSuggestions(
      plan.suggestions,
      plannerContext
    );

  const validatedPlan = {
    ...plan,
    suggestions: validatedSuggestions,
  };

  // 5. Persist only after every validation succeeds.
  return persistDailyActionSuggestions(
    userId,
    plannerContext,
    validatedPlan
  );
}