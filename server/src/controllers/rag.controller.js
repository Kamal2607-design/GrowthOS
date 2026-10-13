import {
  generateRagResponse,
} from '../services/rag.service.js';

export async function generateRagAnswer(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const {
      query,
    } = req.body;

    const result =
      await generateRagResponse(
        userId,
        query
      );

    return res.status(200).json({
      success: true,
      query: result.query,
      answer: result.answer,
      contextSummary:
        result.contextSummary,
    });
  } catch (error) {
    console.error(
      'RAG generation error:',
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
      'RAG_QUERY_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
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
          'AI returned an invalid JSON response',
      });
    }

    if (
      error.message.startsWith(
        'INVALID_AI_RESPONSE'
      )
    ) {
      return res.status(502).json({
        success: false,
        error:
          'AI returned an invalid response structure',
      });
    }

    return res.status(500).json({
      success: false,
      error:
        'Failed to generate personalized response',
    });
  }
}