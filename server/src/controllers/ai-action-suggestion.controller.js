import {
  generateGoalActionSuggestions,
} from '../services/goal-suggestion.service.js';

export async function generateSuggestionsForGoal(req, res) {
  const goalId = Number(req.params.goalId);

  if (!Number.isInteger(goalId) || goalId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid goal ID',
    });
  }

  try {
    const result = await generateGoalActionSuggestions(
      req.user.id,
      goalId,
    );

    return res.status(201).json({
      success: true,
      message:
        result.suggestions.length > 0
          ? 'Action suggestions generated successfully'
          : 'No new suggestions: everything proposed is already planned',
      suggestions: result.suggestions,
      skippedCount: result.skippedCount,
    });
  } catch (error) {
    console.error(
      'Generate goal action suggestions error:',
      error.message,
    );

    if (error.message === 'GOAL_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    if (error.message?.startsWith('OLLAMA_')) {
      return res.status(503).json({
        success: false,
        message: 'The AI planner is temporarily unavailable',
        code: 'AI_UNAVAILABLE',
      });
    }

    if (
      error.message === 'QWEN_INVALID_JSON_RESPONSE' ||
      error.message === 'INVALID_AI_SUGGESTIONS'
    ) {
      return res.status(502).json({
        success: false,
        message: 'The AI returned an unusable plan. Try again.',
        code: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to generate action suggestions',
    });
  }
}
