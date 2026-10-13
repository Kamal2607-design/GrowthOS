import {
  assembleContext,
} from '../services/context-assembly.service.js';

export async function getUserContext(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const {
      query,
    } = req.body;

    const context =
      await assembleContext(
        userId,
        query
      );

    return res.status(200).json({
      success: true,
      context,
    });
  } catch (error) {
    console.error(
      'Context assembly error:',
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
      'CONTEXT_QUERY_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to assemble user context',
    });
  }
}