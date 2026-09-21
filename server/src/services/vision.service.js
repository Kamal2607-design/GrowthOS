import { db } from '../prisma/db.ts';

export async function getVision(userId) {
  const vision = await db.orm.public.Vision.first({
    userId,
  });

  return vision;
}

export async function createVision(
  userId,
  {
    statement,
    values,
    identity,
    futureSelf,
  }
) {
  if (!statement || !statement.trim()) {
    throw new Error('VISION_STATEMENT_REQUIRED');
  }

  const existingVision = await db.orm.public.Vision.first({
    userId,
  });

  if (existingVision) {
    throw new Error('VISION_ALREADY_EXISTS');
  }

  const vision = await db.orm.public.Vision.create({
    userId,
    statement: statement.trim(),
    values: values?.trim() || null,
    identity: identity?.trim() || null,
    futureSelf: futureSelf?.trim() || null,
  });

  return vision;
}

export async function updateVision(
  userId,
  {
    statement,
    values,
    identity,
    futureSelf,
  }
) {
  const existingVision = await db.orm.public.Vision.first({
    userId,
  });

  if (!existingVision) {
    throw new Error('VISION_NOT_FOUND');
  }

  const updateData = {};

  if (statement !== undefined) {
    updateData.statement =
      statement === null ? null : statement.trim();
  }

  if (values !== undefined) {
    updateData.values =
      values === null ? null : values.trim();
  }

  if (identity !== undefined) {
    updateData.identity =
      identity === null ? null : identity.trim();
  }

  if (futureSelf !== undefined) {
    updateData.futureSelf =
      futureSelf === null ? null : futureSelf.trim();
  }

  const updatedVision =
    await db.orm.public.Vision
      .where({
        id: existingVision.id,
      })
      .update(updateData);

  return updatedVision;
}

export async function deleteVision(userId) {
  const existingVision = await db.orm.public.Vision.first({
    userId,
  });

  if (!existingVision) {
    throw new Error('VISION_NOT_FOUND');
  }

  const deletedVision =
    await db.orm.public.Vision
      .where({
        id: existingVision.id,
      })
      .delete();

  return deletedVision;
}