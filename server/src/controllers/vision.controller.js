import {
  getVision,
  createVision,
  updateVision,
  deleteVision,
} from '../services/vision.service.js';

export async function getCurrentVision(req, res) {
  try {
    const vision = await getVision(req.user.id);

    if (!vision) {
      return res.status(404).json({
        success: false,
        message: 'Vision not found',
      });
    }

    return res.status(200).json({
      success: true,
      vision,
    });
  } catch (error) {
    console.error('Get vision error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vision',
    });
  }
}

export async function createCurrentVision(req, res) {
  try {
    const {
      statement,
      values,
      identity,
      futureSelf,
    } = req.body;

    if (!statement || !statement.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vision statement is required',
      });
    }

    const vision = await createVision(req.user.id, {
      statement,
      values,
      identity,
      futureSelf,
    });

    return res.status(201).json({
      success: true,
      message: 'Vision created successfully',
      vision,
    });
  } catch (error) {
    if (error.message === 'VISION_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        message: 'Vision already exists for this user',
      });
    }

    if (error.message === 'VISION_STATEMENT_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Vision statement is required',
      });
    }

    console.error('Create vision error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create vision',
    });
  }
}

export async function updateCurrentVision(req, res) {
  try {
    const {
      statement,
      values,
      identity,
      futureSelf,
    } = req.body;

    if (
      statement === undefined &&
      values === undefined &&
      identity === undefined &&
      futureSelf === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required for update',
      });
    }

    if (
      statement !== undefined &&
      statement !== null &&
      !statement.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vision statement cannot be empty',
      });
    }

    const vision = await updateVision(req.user.id, {
      statement,
      values,
      identity,
      futureSelf,
    });

    return res.status(200).json({
      success: true,
      message: 'Vision updated successfully',
      vision,
    });
  } catch (error) {
    if (error.message === 'VISION_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Vision not found',
      });
    }

    console.error('Update vision error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update vision',
    });
  }
}

export async function deleteCurrentVision(req, res) {
  try {
    await deleteVision(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Vision deleted successfully',
    });
  } catch (error) {
    if (error.message === 'VISION_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Vision not found',
      });
    }

    console.error('Delete vision error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete vision',
    });
  }
}