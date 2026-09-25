import {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
} from '../services/goal.service.js';

export async function createCurrentUserGoal(req, res) {
  try {
    const userId = req.user.id;

    const {
      title,
      description,
      status,
      priority,
      targetDate,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Goal title is required',
      });
    }

    const goal = await createGoal(userId, {
      title,
      description,
      status,
      priority,
      targetDate,
    });

    return res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      goal,
    });
  } catch (error) {
    console.error('Create goal error:', error);

    if (error.message === 'GOAL_TITLE_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Goal title is required',
      });
    }

    if (error.message === 'INVALID_GOAL_STATUS') {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal status',
      });
    }

    if (error.message === 'INVALID_TARGET_DATE') {
  return res.status(400).json({
    success: false,
    message: 'Invalid target date',
  });
}

    return res.status(500).json({
      success: false,
      message: 'Failed to create goal',
    });
  }
}

export async function getCurrentUserGoals(req, res) {
  try {
    const userId = req.user.id;

    const { status } = req.query;

    const goals = await getGoals(userId, {
      status,
    });

    return res.status(200).json({
      success: true,
      goals,
    });
  } catch (error) {
    console.error('Get goals error:', error);

    if (error.message === 'INVALID_GOAL_STATUS') {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal status',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
    });
  }
}

export async function getCurrentUserGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = Number(req.params.id);

    if (!Number.isInteger(goalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal id',
      });
    }

    const goal = await getGoalById(userId, goalId);

    return res.status(200).json({
      success: true,
      goal,
    });
  } catch (error) {
    console.error('Get goal error:', error);

    if (error.message === 'GOAL_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch goal',
    });
  }
}

export async function updateCurrentUserGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = Number(req.params.id);

    if (!Number.isInteger(goalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal id',
      });
    }

    const {
      title,
      description,
      status,
      priority,
      targetDate,
    } = req.body;

    if (
      title === undefined &&
      description === undefined &&
      status === undefined &&
      priority === undefined &&
      targetDate === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required for update',
      });
    }

    const goal = await updateGoal(userId, goalId, {
      title,
      description,
      status,
      priority,
      targetDate,
    });

    return res.status(200).json({
      success: true,
      message: 'Goal updated successfully',
      goal,
    });
  } catch (error) {
    console.error('Update goal error:', error);

    if (error.message === 'GOAL_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    if (error.message === 'GOAL_TITLE_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Goal title is required',
      });
    }

    if (error.message === 'INVALID_GOAL_STATUS') {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal status',
      });
    }

    if (error.message === 'INVALID_TARGET_DATE') {
        return res.status(400).json({
         success: false,
         message: 'Invalid target date',
        });
    }

    if (error.message === 'NO_GOAL_FIELDS_TO_UPDATE') {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required for update',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update goal',
    });
  }
}

export async function deleteCurrentUserGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = Number(req.params.id);

    if (!Number.isInteger(goalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal id',
      });
    }

    await deleteGoal(userId, goalId);

    return res.status(200).json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    console.error('Delete goal error:', error);

    if (error.message === 'GOAL_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete goal',
    });
  }
}