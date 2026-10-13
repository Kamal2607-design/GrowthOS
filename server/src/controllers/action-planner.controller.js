import {
  generateActionSuggestions,
} from '../services/action-planner.service.js';

export async function generateActionPlanController(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const {
      query,
    } = req.body;

    const result =
      await generateActionSuggestions(
        userId,
        query
      );

    return res.status(200).json({
      success: true,
      query: result.query,
      suggestions:
        result.suggestions,
    });
  } catch (error) {
    console.error(
      'Action planner error:',
      error
    );

    if (
      error.message ===
      'INVALID_USER_ID'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    if (
      error.message ===
      'ACTION_PLANNER_QUERY_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    if (
      error.message ===
      'AI_SUGGESTION_REFERENCES_INVALID_GOAL'
    ) {
      return res.status(502).json({
        success: false,
        error:
          'AI returned an invalid goal reference',
      });
    }

    if (
      error.message.startsWith(
        'INVALID_ACTION_PLANNER'
      ) ||
      error.message.startsWith(
        'INVALID_ACTION_SUGGESTION'
      )
    ) {
      return res.status(502).json({
        success: false,
        error:
          'AI returned an invalid action plan',
      });
    }

    if (
      error.message ===
      'QWEN_EMPTY_RESPONSE'
    ) {
      return res.status(502).json({
        success: false,
        error:
          'AI returned an empty response',
      });
    }

    if (
      error.message ===
      'QWEN_INVALID_JSON_RESPONSE'
    ) {
      return res.status(502).json({
        success: false,
        error:
          'AI returned invalid JSON',
      });
    }

    return res.status(500).json({
      success: false,
      error:
        'Failed to generate action suggestions',
    });
  }
}