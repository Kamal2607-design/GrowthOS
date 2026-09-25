import {
  createAction,
  getActions,
  getActionById,
  updateAction,
  deleteAction,
} from '../services/action.service.js';

export async function createCurrentUserAction(req, res) {
  try {
    const userId = req.user.id;

    const {
      title,
      description,
      goalId,
      suggestionId,
      status,
      priority,
      dueDate,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Action title is required',
      });
    }

    const action = await createAction(userId, {
      title,
      description,
      goalId:
        goalId === undefined || goalId === null
          ? goalId
          : Number(goalId),
      suggestionId:
        suggestionId === undefined ||
        suggestionId === null
          ? suggestionId
          : Number(suggestionId),
      status,
      priority,
      dueDate,
    });

    return res.status(201).json({
      success: true,
      message: 'Action created successfully',
      action,
    });
  } catch (error) {
    console.error('Create action error:', error);

    if (error.message === 'ACTION_TITLE_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Action title is required',
      });
    }

    if (error.message === 'INVALID_ACTION_STATUS') {
      return res.status(400).json({
        success: false,
        message: 'Invalid action status',
      });
    }

    if (error.message === 'INVALID_GOAL_ID') {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal id',
      });
    }

    if (error.message === 'INVALID_SUGGESTION_ID') {
      return res.status(400).json({
        success: false,
        message: 'Invalid suggestion id',
      });
    }

    if (error.message === 'GOAL_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    if (error.message === 'SUGGESTION_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Action suggestion not found',
      });
    }

    if (error.message === 'SUGGESTION_NOT_PENDING') {
      return res.status(400).json({
        success: false,
        message:
          'Action suggestion is no longer pending',
      });
    }

    if (error.message === 'INVALID_DUE_DATE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid due date',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create action',
    });
  }
}

export async function getCurrentUserActions(req, res) {
  try {
    const userId = req.user.id;

    const { status, goalId } = req.query;

    const actions = await getActions(userId, {
      status,
      goalId:
        goalId === undefined
          ? undefined
          : Number(goalId),
    });

    return res.status(200).json({
      success: true,
      actions,
    });
  } catch (error) {
    console.error('Get actions error:', error);

    if (error.message === 'INVALID_ACTION_STATUS') {
      return res.status(400).json({
        success: false,
        message: 'Invalid action status',
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
      message: 'Failed to fetch actions',
    });
  }
}

export async function getCurrentUserAction(req, res) {
  try {
    const userId = req.user.id;
    const actionId = Number(req.params.id);

    if (!Number.isInteger(actionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action id',
      });
    }

    const action = await getActionById(
      userId,
      actionId
    );

    return res.status(200).json({
      success: true,
      action,
    });
  } catch (error) {
    console.error('Get action error:', error);

    if (error.message === 'ACTION_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Action not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch action',
    });
  }
}

export async function updateCurrentUserAction(req, res) {
  try {
    const userId = req.user.id;
    const actionId = Number(req.params.id);

    if (!Number.isInteger(actionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action id',
      });
    }

    const {
      title,
      description,
      goalId,
      status,
      priority,
      dueDate,
    } = req.body ?? {};

    if (
      title === undefined &&
      description === undefined &&
      goalId === undefined &&
      status === undefined &&
      priority === undefined &&
      dueDate === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          'At least one field is required for update',
      });
    }

    const action = await updateAction(
      userId,
      actionId,
      {
        title,
        description,
        goalId:
          goalId === undefined ||
          goalId === null
            ? goalId
            : Number(goalId),
        status,
        priority,
        dueDate,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Action updated successfully',
      action,
    });
  } catch (error) {
    console.error('Update action error:', error);

    if (error.message === 'ACTION_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Action not found',
      });
    }

    if (error.message === 'ACTION_TITLE_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Action title is required',
      });
    }

    if (error.message === 'INVALID_ACTION_STATUS') {
      return res.status(400).json({
        success: false,
        message: 'Invalid action status',
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

    if (error.message === 'INVALID_DUE_DATE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid due date',
      });
    }

    if (error.message === 'NO_ACTION_FIELDS_TO_UPDATE') {
      return res.status(400).json({
        success: false,
        message:
          'At least one field is required for update',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update action',
    });
  }
}

export async function deleteCurrentUserAction(req, res) {
  try {
    const userId = req.user.id;
    const actionId = Number(req.params.id);

    if (!Number.isInteger(actionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action id',
      });
    }

    await deleteAction(userId, actionId);

    return res.status(200).json({
      success: true,
      message: 'Action deleted successfully',
    });
  } catch (error) {
    console.error('Delete action error:', error);

    if (error.message === 'ACTION_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Action not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete action',
    });
  }
}