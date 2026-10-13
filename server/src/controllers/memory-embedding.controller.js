import {
  generateMemoryEmbedding,
} from '../services/memory-embedding.service.js';

export async function generateUserMemoryEmbedding(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const memoryId =
      Number(req.params.id);

    const result =
      await generateMemoryEmbedding(
        userId,
        memoryId
      );

    return res.status(200).json({
      success: true,
      message: result.generated
        ? 'Memory embedding generated successfully'
        : 'Existing memory embedding returned',
      generated: result.generated,
      memory: result.memory,
      embedding: result.embedding,
    });
  } catch (error) {
    console.error(
      'Generate memory embedding error:',
      error
    );

    if (
      error.message ===
      'INVALID_MEMORY_ID'
    ) {
      return res.status(400).json({
        error: 'Invalid memory ID',
      });
    }

    if (
      error.message ===
      'MEMORY_NOT_FOUND'
    ) {
      return res.status(404).json({
        error: 'Memory not found',
      });
    }

    if (
      error.message ===
      'MEMORY_NOT_NORMALIZED'
    ) {
      return res.status(400).json({
        error:
          'Memory must be normalized before generating an embedding',
      });
    }

    if (
      error.message ===
      'NORMALIZED_CONTENT_REQUIRED'
    ) {
      return res.status(400).json({
        error:
          'Normalized memory content is required',
      });
    }

    return res.status(500).json({
      error:
        'Failed to generate memory embedding',
    });
  }
}