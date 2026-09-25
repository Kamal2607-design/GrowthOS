import {
  createReflection,
  getReflections,
  getReflectionById,
  updateReflection,
  deleteReflection,
} from '../services/reflection.service.js';

function handleReflectionError(res, error) {
  console.error('Reflection error:', error);

  switch (error.message) {
    case 'REFLECTION_CONTENT_REQUIRED':
      return res.status(400).json({
        error: 'Reflection content is required',
      });

    case 'INVALID_MOOD':
      return res.status(400).json({
        error: 'Invalid mood',
      });

    case 'INVALID_PRODUCTIVITY':
      return res.status(400).json({
        error:
          'Productivity must be an integer between 1 and 10',
      });

    case 'INVALID_REFLECTION_DATE':
      return res.status(400).json({
        error: 'Invalid reflection date',
      });

    case 'REFLECTION_DATE_CANNOT_BE_NULL':
      return res.status(400).json({
        error: 'Reflection date cannot be null',
      });

    case 'REFLECTION_NOT_FOUND':
      return res.status(404).json({
        error: 'Reflection not found',
      });

    case 'NO_REFLECTION_FIELDS_TO_UPDATE':
      return res.status(400).json({
        error: 'No reflection fields provided for update',
      });

    default:
      return res.status(500).json({
        error: 'Internal server error',
      });
  }
}

export async function createUserReflection(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const {
      content,
      mood,
      productivity,
      highlights,
      challenges,
      learnings,
      reflectionDate,
    } = req.body || {};

    const reflection =
      await createReflection(
        userId,
        {
          content,
          mood,
          productivity,
          highlights,
          challenges,
          learnings,
          reflectionDate,
        }
      );

    return res.status(201).json({
      success: true,
      message: 'Reflection created successfully',
      reflection,
    });
  } catch (error) {
    return handleReflectionError(res, error);
  }
}

export async function getUserReflections(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const reflections =
      await getReflections(userId);

    return res.status(200).json({
      success: true,
      reflections,
    });
  } catch (error) {
    return handleReflectionError(res, error);
  }
}

export async function getUserReflectionById(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const reflectionId =
      Number(req.params.id);

    if (!Number.isInteger(reflectionId)) {
      return res.status(400).json({
        error: 'Invalid reflection ID',
      });
    }

    const reflection =
      await getReflectionById(
        userId,
        reflectionId
      );

    return res.status(200).json({
      success: true,
      reflection,
    });
  } catch (error) {
    return handleReflectionError(res, error);
  }
}

export async function updateUserReflection(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const reflectionId =
      Number(req.params.id);

    if (!Number.isInteger(reflectionId)) {
      return res.status(400).json({
        error: 'Invalid reflection ID',
      });
    }

    const {
      content,
      mood,
      productivity,
      highlights,
      challenges,
      learnings,
      reflectionDate,
    } = req.body || {};

    const reflection =
      await updateReflection(
        userId,
        reflectionId,
        {
          content,
          mood,
          productivity,
          highlights,
          challenges,
          learnings,
          reflectionDate,
        }
      );

    return res.status(200).json({
      success: true,
      message: 'Reflection updated successfully',
      reflection,
    });
  } catch (error) {
    return handleReflectionError(res, error);
  }
}

export async function deleteUserReflection(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const reflectionId =
      Number(req.params.id);

    if (!Number.isInteger(reflectionId)) {
      return res.status(400).json({
        error: 'Invalid reflection ID',
      });
    }

    await deleteReflection(
      userId,
      reflectionId
    );

    return res.status(200).json({
      success: true,
      message: 'Reflection deleted successfully',
    });
  } catch (error) {
    return handleReflectionError(res, error);
  }
}