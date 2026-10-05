import {
  createMemory,
  getMemories,
  getMemoryById,
  updateMemory,
  archiveMemory,
  deleteMemory,
} from '../services/memory.service.js';

import {
  normalizeMemory,
  normalizePendingMemories,
} from '../services/memory-normalization.service.js';

export async function createUserMemory(req, res) {
  try {
    const userId = req.user.id;

    const memory = await createMemory(
      userId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: 'Memory created successfully',
      memory,
    });
  } catch (error) {
    console.error(
      'Create memory error:',
      error
    );

    const clientErrors = {
      MEMORY_TYPE_REQUIRED: 'Memory type is required.',
      INVALID_MEMORY_TYPE: 'Invalid memory type.',
      INVALID_MEMORY_SOURCE: 'Invalid memory source.',
      INVALID_MEMORY_STATUS: 'Invalid memory status.',
      INVALID_MEMORY_IMPORTANCE: 'Importance must be an integer between 1 and 5.',
      MEMORY_CONTENT_REQUIRED: 'Memory content is required.',
      INVALID_SOURCE_CANDIDATE_ID: 'Invalid source candidate ID.',
      SOURCE_CANDIDATE_NOT_FOUND: 'Source candidate not found.',
    };

    if (clientErrors[error.message]) {
      return res.status(400).json({
        error: clientErrors[error.message],
      });
    }

    return res.status(500).json({
      error: 'Failed to create memory',
    });
  }
}

export async function getUserMemories(req, res) {
  try {
    const userId = req.user.id;

    const {
      type,
      status,
    } = req.query;

    const memories = await getMemories(
      userId,
      {
        type,
        status,
      }
    );

    return res.status(200).json({
      success: true,
      memories,
    });
  } catch (error) {
    console.error(
      'Get memories error:',
      error
    );

    if (
      error.message === 'INVALID_MEMORY_TYPE' ||
      error.message === 'INVALID_MEMORY_STATUS'
    ) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to fetch memories',
    });
  }
}

export async function getUserMemoryById(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const memoryId = Number(req.params.id);

    const memory =
      await getMemoryById(
        userId,
        memoryId
      );

    return res.status(200).json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error(
      'Get memory error:',
      error
    );

    if (
      error.message === 'INVALID_MEMORY_ID'
    ) {
      return res.status(400).json({
        error: 'Invalid memory ID',
      });
    }

    if (
      error.message === 'MEMORY_NOT_FOUND'
    ) {
      return res.status(404).json({
        error: 'Memory not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to fetch memory',
    });
  }
}

export async function updateUserMemory(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const memoryId = Number(req.params.id);

    const memory =
      await updateMemory(
        userId,
        memoryId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: 'Memory updated successfully',
      memory,
    });
  } catch (error) {
    console.error(
      'Update memory error:',
      error
    );

    const clientErrors = {
      INVALID_MEMORY_ID:
        'Invalid memory ID.',
      INVALID_MEMORY_TYPE:
        'Invalid memory type.',
      INVALID_MEMORY_SOURCE:
        'Invalid memory source.',
      INVALID_MEMORY_STATUS:
        'Invalid memory status.',
      INVALID_MEMORY_IMPORTANCE:
        'Importance must be an integer between 1 and 5.',
      MEMORY_CONTENT_REQUIRED:
        'Memory content is required.',
      NO_MEMORY_FIELDS_TO_UPDATE:
        'No memory fields provided for update.',
    };

    if (clientErrors[error.message]) {
      return res.status(400).json({
        error: clientErrors[error.message],
      });
    }

    if (
      error.message === 'MEMORY_NOT_FOUND'
    ) {
      return res.status(404).json({
        error: 'Memory not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to update memory',
    });
  }
}

export async function archiveUserMemory(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const memoryId = Number(req.params.id);

    const memory =
      await archiveMemory(
        userId,
        memoryId
      );

    return res.status(200).json({
      success: true,
      message: 'Memory archived successfully',
      memory,
    });
  } catch (error) {
    console.error(
      'Archive memory error:',
      error
    );

    if (
      error.message === 'INVALID_MEMORY_ID'
    ) {
      return res.status(400).json({
        error: 'Invalid memory ID',
      });
    }

    if (
      error.message === 'MEMORY_NOT_FOUND'
    ) {
      return res.status(404).json({
        error: 'Memory not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to archive memory',
    });
  }
}

export async function deleteUserMemory(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const memoryId = Number(req.params.id);

    await deleteMemory(
      userId,
      memoryId
    );

    return res.status(200).json({
      success: true,
      message: 'Memory deleted successfully',
    });
  } catch (error) {
    console.error(
      'Delete memory error:',
      error
    );

    if (
      error.message === 'INVALID_MEMORY_ID'
    ) {
      return res.status(400).json({
        error: 'Invalid memory ID',
      });
    }

    if (
      error.message === 'MEMORY_NOT_FOUND'
    ) {
      return res.status(404).json({
        error: 'Memory not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to delete memory',
    });
  }
}

export async function normalizeUserMemory(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const memoryId = Number(req.params.id);

    const memory =
      await normalizeMemory(
        userId,
        memoryId
      );

    return res.status(200).json({
      success: true,
      message: 'Memory normalized successfully',
      memory,
    });
  } catch (error) {
    console.error(
      'Normalize memory error:',
      error
    );

    if (
      error.message === 'INVALID_MEMORY_ID'
    ) {
      return res.status(400).json({
        error: 'Invalid memory ID',
      });
    }

    if (
      error.message === 'MEMORY_NOT_FOUND'
    ) {
      return res.status(404).json({
        error: 'Memory not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to normalize memory',
    });
  }
}

export async function normalizePendingUserMemories(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const results =
      await normalizePendingMemories(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        'Pending memories normalization completed',
      results,
    });
  } catch (error) {
    console.error(
      'Normalize pending memories error:',
      error
    );

    return res.status(500).json({
      error:
        'Failed to normalize pending memories',
    });
  }
}