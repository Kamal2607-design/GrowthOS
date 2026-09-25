import { db } from '../prisma/db.ts';

const VALID_MOODS = [
  'very_bad',
  'bad',
  'neutral',
  'good',
  'very_good',
];

function parseInstant(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Temporal.Instant.from(value);
}

function validateProductivity(productivity) {
  if (productivity === undefined || productivity === null) {
    return;
  }

  if (
    !Number.isInteger(productivity) ||
    productivity < 1 ||
    productivity > 10
  ) {
    throw new Error('INVALID_PRODUCTIVITY');
  }
}

function validateMood(mood) {
  if (
    mood !== undefined &&
    mood !== null &&
    !VALID_MOODS.includes(mood)
  ) {
    throw new Error('INVALID_MOOD');
  }
}

export async function createReflection(
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
) {
  if (!content || !content.trim()) {
    throw new Error('REFLECTION_CONTENT_REQUIRED');
  }

  validateMood(mood);
  validateProductivity(productivity);

  let parsedReflectionDate = Temporal.Now.instant();

  if (
    reflectionDate !== undefined &&
    reflectionDate !== null
  ) {
    try {
      parsedReflectionDate = parseInstant(reflectionDate);
    } catch {
      throw new Error('INVALID_REFLECTION_DATE');
    }
  }

  const reflection =
    await db.orm.public.Reflection.create({
      userId,
      content: content.trim(),
      mood: mood ?? null,
      productivity: productivity ?? null,
      highlights: highlights?.trim() || null,
      challenges: challenges?.trim() || null,
      learnings: learnings?.trim() || null,
      reflectionDate: parsedReflectionDate,
    });

  return reflection;
}

export async function getReflections(
  userId,
  {
    startDate,
    endDate,
  } = {}
) {
  const filter = {
    userId,
  };

  /*
   * Prisma 8 filtering can be stricter than
   * traditional Prisma clients, so keep the
   * initial CRUD query simple.
   *
   * Date filtering can be added using the
   * appropriate Prisma 8 filter expression
   * after the basic CRUD is verified.
   */

  const reflections =
    await db.orm.public.Reflection
      .where(filter)
      .all();

  return reflections;
}

export async function getReflectionById(
  userId,
  reflectionId
) {
  const reflection =
    await db.orm.public.Reflection.first({
      id: reflectionId,
      userId,
    });

  if (!reflection) {
    throw new Error('REFLECTION_NOT_FOUND');
  }

  return reflection;
}

export async function updateReflection(
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
) {
  const existingReflection =
    await db.orm.public.Reflection.first({
      id: reflectionId,
      userId,
    });

  if (!existingReflection) {
    throw new Error('REFLECTION_NOT_FOUND');
  }

  if (
    content !== undefined &&
    (content === null || !content.trim())
  ) {
    throw new Error('REFLECTION_CONTENT_REQUIRED');
  }

  validateMood(mood);
  validateProductivity(productivity);

  const updateData = {};

  if (content !== undefined) {
    updateData.content = content.trim();
  }

  if (mood !== undefined) {
    updateData.mood = mood;
  }

  if (productivity !== undefined) {
    updateData.productivity = productivity;
  }

  if (highlights !== undefined) {
    updateData.highlights =
      highlights === null
        ? null
        : highlights.trim();
  }

  if (challenges !== undefined) {
    updateData.challenges =
      challenges === null
        ? null
        : challenges.trim();
  }

  if (learnings !== undefined) {
    updateData.learnings =
      learnings === null
        ? null
        : learnings.trim();
  }

  if (reflectionDate !== undefined) {
    if (reflectionDate === null) {
      throw new Error('REFLECTION_DATE_CANNOT_BE_NULL');
    }

    try {
      updateData.reflectionDate =
        parseInstant(reflectionDate);
    } catch {
      throw new Error('INVALID_REFLECTION_DATE');
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error(
      'NO_REFLECTION_FIELDS_TO_UPDATE'
    );
  }

  const updatedReflection =
    await db.orm.public.Reflection
      .where({
        id: reflectionId,
        userId,
      })
      .update(updateData);

  return updatedReflection;
}

export async function deleteReflection(
  userId,
  reflectionId
) {
  const existingReflection =
    await db.orm.public.Reflection.first({
      id: reflectionId,
      userId,
    });

  if (!existingReflection) {
    throw new Error('REFLECTION_NOT_FOUND');
  }

  const deletedReflection =
    await db.orm.public.Reflection
      .where({
        id: reflectionId,
        userId,
      })
      .delete();

  return deletedReflection;
}