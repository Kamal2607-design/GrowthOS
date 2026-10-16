import {
  getTodayDailyContext,
} from '../services/daily-growth-loop.service.js';

import {
  generateDailyGrowthSuggestions,
} from '../services/daily-growth-generation.service.js';

const DEPENDENCY_FAILURES = new Set([
  'DAILY_CONTEXT_VISION_FETCH_FAILED',
  'DAILY_CONTEXT_GOALS_FETCH_FAILED',
  'DAILY_CONTEXT_ACTIONS_FETCH_FAILED',
  'DAILY_CONTEXT_SUGGESTIONS_FETCH_FAILED',
  'DAILY_CONTEXT_REFLECTIONS_FETCH_FAILED',
  'DAILY_CONTEXT_REFLECTION_ANALYSIS_FETCH_FAILED',
]);

export async function getTodayDailyGrowthContext(req, res) {
  try {
    const context = await getTodayDailyContext(req.user.id);

    return res.status(200).json({
      success: true,
      context,
    });
  } catch (error) {
    console.error('Daily growth context error:', {
      code: error.code || error.message,
      cause: error.cause?.message,
    });

    const errorCode = error.code || error.message;

    if (errorCode === 'INVALID_USER_ID') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        code: errorCode,
      });
    }

    if (DEPENDENCY_FAILURES.has(errorCode)) {
      return res.status(503).json({
        success: false,
        error: 'Daily context is temporarily unavailable',
        code: errorCode,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve daily growth context',
      code: 'DAILY_CONTEXT_FAILED',
    });
  }
}

export async function generateDailyGrowthSuggestionsController(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const result =
      await generateDailyGrowthSuggestions(userId);

    return res.status(201).json({
      success: true,
      createdCount: result.createdCount,
      suggestions: result.suggestions,
    });
  } catch (error) {
    console.error(
      'Daily growth suggestion generation error:',
      error
    );

    switch (error.message) {
      case 'INVALID_USER_ID':
        return res.status(400).json({
          success: false,
          error: 'Invalid authenticated user',
        });

      case 'DAILY_PLANNER_CONTEXT_REQUIRED':
      case 'INVALID_DAILY_PLANNER_PLAN':
      case 'INVALID_DAILY_PLANNER_COUNT':
      case 'INVALID_DAILY_PLANNER_SUGGESTION_TITLE':
      case 'INVALID_DAILY_PLANNER_SUGGESTION_DESCRIPTION':
      case 'INVALID_DAILY_PLANNER_SUGGESTION_REASONING':
      case 'INVALID_DAILY_PLANNER_SUGGESTION_PRIORITY':
      case 'INVALID_DAILY_PLANNER_SUGGESTION_GOAL_ID':
      case 'INVALID_REFLECTION_ID':
      case 'INVALID_NORMALIZED_SUGGESTION_TITLE':
        return res.status(422).json({
          success: false,
          error: error.message,
        });

      case 'DUPLICATE_EXISTING_ACTION':
      case 'DUPLICATE_PENDING_SUGGESTION':
      case 'DUPLICATE_GENERATED_SUGGESTION':
        return res.status(409).json({
          success: false,
          error: error.message,
        });

      case 'DAILY_PLANNER_GOAL_NOT_ACTIVE_OR_OWNED':
        return res.status(409).json({
          success: false,
          error: 'One or more suggested goals are no longer active or owned by the user',
        });

      case 'DAILY_PLANNER_REFLECTION_NOT_OWNED':
        return res.status(409).json({
          success: false,
          error: 'The reflection referenced by the planner is no longer available',
        });

      default:
        return res.status(500).json({
          success: false,
          error: 'Failed to generate daily growth suggestions',
        });
    }
  }
}