import {
  createActionSuggestion,
  getActionSuggestions,
  getActionSuggestionById,
  acceptActionSuggestion,
  rejectActionSuggestion,
} from '../services/action-suggestion.service.js';

export async function createCurrentUserActionSuggestion(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const {
      title,
      description,
      goalId,
      priority,
      reasoning,
      source,
    } = req.body ?? {};

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Suggestion title is required',
      });
    }

    const suggestion =
      await createActionSuggestion(userId, {
        title,
        description,
        goalId:
          goalId === undefined || goalId === null
            ? goalId
            : Number(goalId),
        priority,
        reasoning,
        source,
      });

    return res.status(201).json({
      success: true,
      message: 'Action suggestion created successfully',
      suggestion,
    });
  } catch (error) {
    console.error(
      'Create action suggestion error:',
      error
    );

    if (
      error.message === 'SUGGESTION_TITLE_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Suggestion title is required',
      });
    }

    if (error.message === 'INVALID_GOAL_ID') {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal id',
      });
    }

    if (error.message === 'GOAL_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    if (
      error.message === 'INVALID_SUGGESTION_SOURCE'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid suggestion source',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create action suggestion',
    });
  }
}

export async function getCurrentUserActionSuggestions(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const { status, goalId } = req.query;

    const suggestions =
      await getActionSuggestions(userId, {
        status,
        goalId:
          goalId === undefined
            ? undefined
            : Number(goalId),
      });

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error(
      'Get action suggestions error:',
      error
    );

    if (
      error.message === 'INVALID_SUGGESTION_STATUS'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid suggestion status',
      });
    }

    if (error.message === 'INVALID_GOAL_ID') {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal id',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch action suggestions',
    });
  }
}

export async function getCurrentUserActionSuggestion(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const suggestionId = Number(req.params.id);

    if (!Number.isInteger(suggestionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid suggestion id',
      });
    }

    const suggestion =
      await getActionSuggestionById(
        userId,
        suggestionId
      );

    return res.status(200).json({
      success: true,
      suggestion,
    });
  } catch (error) {
    console.error(
      'Get action suggestion error:',
      error
    );

    if (
      error.message === 'SUGGESTION_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Action suggestion not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch action suggestion',
    });
  }
}

export async function acceptCurrentUserActionSuggestion(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const suggestionId = Number(req.params.id);

    if (!Number.isInteger(suggestionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid suggestion id',
      });
    }

    const result =
      await acceptActionSuggestion(
        userId,
        suggestionId
      );

    return res.status(200).json({
      success: true,
      message: 'Action suggestion accepted',
      suggestion: result.suggestion,
      action: result.action,
    });
  } catch (error) {
    console.error(
      'Accept action suggestion error:',
      error
    );

    if (
      error.message === 'SUGGESTION_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Action suggestion not found',
      });
    }

    if (
      error.message === 'SUGGESTION_NOT_PENDING'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Action suggestion is no longer pending',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to accept action suggestion',
    });
  }
}

export async function rejectCurrentUserActionSuggestion(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const suggestionId = Number(req.params.id);

    if (!Number.isInteger(suggestionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid suggestion id',
      });
    }

    const suggestion =
      await rejectActionSuggestion(
        userId,
        suggestionId
      );

    return res.status(200).json({
      success: true,
      message: 'Action suggestion rejected',
      suggestion,
    });
  } catch (error) {
    console.error(
      'Reject action suggestion error:',
      error
    );

    if (
      error.message === 'SUGGESTION_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Action suggestion not found',
      });
    }

    if (
      error.message === 'SUGGESTION_NOT_PENDING'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Action suggestion is no longer pending',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to reject action suggestion',
    });
  }
}