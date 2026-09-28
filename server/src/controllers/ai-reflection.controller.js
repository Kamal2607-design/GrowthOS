import {
  analyzeReflectionAndCreateSuggestions,
} from '../services/reflection-analysis.service.js';

export async function analyzeUserReflection(req, res) {
  try {
    const userId = req.user.id;

    const reflectionId = Number(req.params.id);

    if (!Number.isInteger(reflectionId)) {
      return res.status(400).json({
        error: 'Invalid reflection ID',
      });
    }

    console.log(
      `Analyzing reflection ${reflectionId} for user ${userId}`
    );

    const result =
      await analyzeReflectionAndCreateSuggestions(
        userId,
        reflectionId
      );

    return res.status(200).json({
      success: true,
      message: 'Reflection analyzed successfully',
      analysis: result.analysis,
      suggestions: result.suggestions,
    });

  } catch (error) {
    console.error(
      'Analyze reflection error:',
      error
    );

    if (error.message === 'REFLECTION_NOT_FOUND') {
      return res.status(404).json({
        error: 'Reflection not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to analyze reflection',
    });
  }
}