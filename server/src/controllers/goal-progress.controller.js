import {
  getGoalProgress,
  analyzeGoalProgressForUser,
} from '../services/goal-progress.service.js';

function handleGoalProgressError(
  res,
  error
) {
  console.error(
    'Goal progress error:',
    error
  );

  switch (error.message) {
    case 'GOAL_NOT_FOUND':
      return res.status(404).json({
        error: 'Goal not found',
      });

    default:
      return res.status(500).json({
        error:
          'Failed to process goal progress',
      });
  }
}

export async function getUserGoalProgress(
  req,
  res
) {
  try {
    const userId =
      req.user.id;

    const goalId =
      Number(req.params.id);

    if (
      !Number.isInteger(goalId) ||
      goalId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid goal ID',
      });
    }

    const progress =
      await getGoalProgress(
        userId,
        goalId
      );

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    return handleGoalProgressError(
      res,
      error
    );
  }
}

export async function analyzeUserGoalProgress(
  req,
  res
) {
  try {
    const userId =
      req.user.id;

    const goalId =
      Number(req.params.id);

    if (
      !Number.isInteger(goalId) ||
      goalId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid goal ID',
      });
    }

    console.log(
      `Analyzing goal progress for goal ${goalId}, user ${userId}`
    );

    const result =
      await analyzeGoalProgressForUser(
        userId,
        goalId
      );

    return res.status(200).json({
      success: true,
      message:
        'Goal progress analyzed successfully',
      progress: result.progress,
      activity: result.activity,
      reflectionCorrelation:
        result.reflectionCorrelation,
      aiAnalysis:
        result.aiAnalysis,
    });
  } catch (error) {
    return handleGoalProgressError(
      res,
      error
    );
  }
}