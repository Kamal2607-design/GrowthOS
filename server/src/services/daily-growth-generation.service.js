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
  createPlannerRejection,
  partitionDuplicateSuggestions,
  validateDailyPlannerSuggestions,
} from './ai/daily-planner-validation.service.js';

import {
  persistDailyActionSuggestions,
} from './daily-planner-persistence.service.js';

import {
  buildDailyPlannerIntelligenceContext,
} from './daily-planner-intelligence-context.service.js';

/*
 * A plan rejected for one of these reasons is retried once with the
 * rejection reason in the prompt. A small local model often repeats an
 * existing task or picks the wrong goal; one corrective attempt fixes most
 * of these without weakening validation (invalid suggestions are still
 * never persisted). Infrastructure failures (Ollama, database) are not
 * retried.
 */
const RETRYABLE_PLANNER_ERRORS = new Set([
  'DUPLICATE_EXISTING_ACTION',
  'DUPLICATE_PENDING_SUGGESTION',
  'DUPLICATE_GENERATED_SUGGESTION',
  'DAILY_PLANNER_GOAL_IS_PLACEHOLDER',
  'DAILY_PLANNER_GOAL_MISMATCH',
  'DAILY_PLANNER_UNSUPPORTED_REFLECTION_CLAIM',
  'DAILY_PLANNER_GOAL_NOT_ACTIVE_IN_CONTEXT',
  'INVALID_DAILY_PLANNER_GOAL_REFERENCE',
  'QWEN_EMPTY_RESPONSE',
  'QWEN_INVALID_JSON_RESPONSE',
  'INVALID_DAILY_PLANNER_RESPONSE',
  'INVALID_DAILY_PLANNER_SUGGESTIONS',
  'INVALID_DAILY_PLANNER_COUNT',
  'INVALID_DAILY_PLANNER_SUGGESTION',
  'INVALID_DAILY_PLANNER_SUGGESTION_TITLE',
  'INVALID_DAILY_PLANNER_SUGGESTION_DESCRIPTION',
  'INVALID_DAILY_PLANNER_SUGGESTION_REASONING',
  'INVALID_DAILY_PLANNER_SUGGESTION_PRIORITY',
  'INVALID_DAILY_PLANNER_SUGGESTION_GOAL_ID',
]);

export const MAX_PLANNER_ATTEMPTS = 2;

export function isRetryablePlannerError(error) {
  return RETRYABLE_PLANNER_ERRORS.has(error?.message);
}

export async function generateDailyGrowthSuggestions(
  userId,
  dependencies = {},
) {
  const loadDailyContext =
    dependencies.getTodayDailyContext ?? getTodayDailyContext;
  const loadIntelligence =
    dependencies.buildDailyPlannerIntelligenceContext ??
    buildDailyPlannerIntelligenceContext;
  const generatePlan =
    dependencies.generateDailyActionPlan ?? generateDailyActionPlan;
  const persist =
    dependencies.persistDailyActionSuggestions ?? persistDailyActionSuggestions;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('INVALID_USER_ID');
  }

  const dailyContext =
    await loadDailyContext(userId);

  const plannerContext =
    buildDailyPlannerContext(dailyContext);

  const intelligenceContext =
    await loadIntelligence(
      userId,
      plannerContext,
    );

  const enrichedPlannerContext = {
    ...plannerContext,
    ...intelligenceContext,
  };

  const intelligence = {
    relevantMemoryCount: enrichedPlannerContext.relevantMemories.length,
    goalProgressCount: enrichedPlannerContext.goalProgress.filter(
      (item) => item.status === 'available',
    ).length,
    dataQuality: enrichedPlannerContext.dataQuality,
    hasReflection: Boolean(enrichedPlannerContext.reflection),
  };

  console.log('Daily planner intelligence summary:', intelligence);

  let previousAttempt = null;
  let validatedPlan = null;
  let attempts = 0;
  let skippedDuplicates = 0;

  while (!validatedPlan) {
    attempts += 1;

    const attemptContext = previousAttempt
      ? { ...enrichedPlannerContext, previousAttempt }
      : enrichedPlannerContext;

    try {
      const plan =
        await generatePlan(attemptContext);

      // Repeats of existing work are dropped; if nothing new is left the
      // attempt is rejected (and retried once).
      const { fresh, duplicates } = partitionDuplicateSuggestions(
        plan.suggestions,
        enrichedPlannerContext,
      );

      if (fresh.length === 0) {
        throw createPlannerRejection(
          duplicates[0].code,
          duplicates[0].suggestion,
        );
      }

      validatedPlan = {
        ...plan,
        suggestions: validateDailyPlannerSuggestions(
          fresh,
          enrichedPlannerContext,
        ),
      };
      skippedDuplicates = duplicates.length;
    } catch (error) {
      if (
        attempts >= MAX_PLANNER_ATTEMPTS ||
        !isRetryablePlannerError(error)
      ) {
        throw error;
      }

      console.warn('Daily planner attempt rejected; retrying once:', {
        code: error.message,
        rejectedTitle: error.suggestionTitle ?? null,
      });

      previousAttempt = {
        code: error.message,
        rejectedTitle: error.suggestionTitle ?? null,
      };
    }
  }

  const result = await persist(
    userId,
    enrichedPlannerContext,
    validatedPlan,
  );

  return {
    ...result,
    attempts,
    skippedDuplicates,
    intelligence,
  };
}
