import {
  searchMemories,
} from '../services/memory-retrieval.service.js';

export async function searchUserMemories(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const {
      query,
      limit,
    } = req.body ?? {};

    let parsedLimit = 5;

    if (limit !== undefined) {
      parsedLimit = Number(limit);

      if (!Number.isInteger(parsedLimit)) {
        return res.status(400).json({
          success: false,
          error: 'Limit must be an integer',
        });
      }
    }

    const result =
      await searchMemories(
        userId,
        query,
        parsedLimit
      );

    return res.status(200).json({
      success: true,
      query: result.query,
      results: result.results,
    });
  } catch (error) {
    console.error(
      'Memory semantic search error:',
      error
    );

    if (
      error.message ===
      'SEARCH_QUERY_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

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
      error.message.startsWith(
        'SEARCH_LIMIT_INVALID'
      )
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error.message.startsWith(
        'INVALID_QUERY_EMBEDDING_DIMENSIONS'
      )
    ) {
      return res.status(500).json({
        success: false,
        error:
          'Query embedding dimensions do not match memory embeddings',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to search memories',
    });
  }
}