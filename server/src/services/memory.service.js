import { db } from '../prisma/db.ts';

const MEMORY_TYPES = [
  'fact',
  'preference',
  'experience',
  'learning',
  'belief',
  'insight',
];

const MEMORY_SOURCES = [
  'document',
  'reflection',
  'goal',
  'vision',
  'user',
  'ai',
];

const MEMORY_STATUSES = [
  'active',
  'archived',
];

function validateMemoryType(type) {
  if (!MEMORY_TYPES.includes(type)) {
    throw new Error('INVALID_MEMORY_TYPE');
  }
}

function validateMemorySource(source) {
  if (
    source !== undefined &&
    source !== null &&
    !MEMORY_SOURCES.includes(source)
  ) {
    throw new Error('INVALID_MEMORY_SOURCE');
  }
}

function validateMemoryStatus(status) {
  if (!MEMORY_STATUSES.includes(status)) {
    throw new Error('INVALID_MEMORY_STATUS');
  }
}

function validateImportance(importance) {
  if (
    importance !== undefined &&
    importance !== null &&
    (
      !Number.isInteger(importance) ||
      importance < 1 ||
      importance > 5
    )
  ) {
    throw new Error('INVALID_MEMORY_IMPORTANCE');
  }
}

export async function createMemory(
  userId,
  {
    type,
    content,
    source = null,
    importance = 1,
    status = 'active',
    sourceCandidateId = null,
  }
) {
  if (!type) {
    throw new Error('MEMORY_TYPE_REQUIRED');
  }

  validateMemoryType(type);
  validateMemorySource(source);
  validateMemoryStatus(status);
  validateImportance(importance);

  if (
    !content ||
    typeof content !== 'string' ||
    !content.trim()
  ) {
    throw new Error('MEMORY_CONTENT_REQUIRED');
  }

  const cleanedContent = content.trim();

  // ------------------------------------
  // Source candidate duplicate protection
  // ------------------------------------

  if (sourceCandidateId !== null) {
    if (!Number.isInteger(sourceCandidateId)) {
      throw new Error('INVALID_SOURCE_CANDIDATE_ID');
    }

    const candidate =
      await db.orm.public.DocumentCandidate.first({
        id: sourceCandidateId,
        userId,
      });

    if (!candidate) {
      throw new Error('SOURCE_CANDIDATE_NOT_FOUND');
    }

    const existingMemory =
      await db.orm.public.Memory.first({
        sourceCandidateId,
      });

    if (existingMemory) {
      return existingMemory;
    }
  }

  // ------------------------------------
  // Exact duplicate protection
  // ------------------------------------

  const existingMemory =
    await db.orm.public.Memory.first({
      userId,
      type,
      content: cleanedContent,
      status: 'active',
    });

  if (existingMemory) {
    return existingMemory;
  }

  // ------------------------------------
  // Create memory
  // ------------------------------------

  const memory =
    await db.orm.public.Memory.create({
      userId,
      type,
      content: cleanedContent,
      source,
      importance,
      status,
      sourceCandidateId,
    });

  return memory;
}

export async function getMemories(
  userId,
  {
    type,
    status = 'active',
  } = {}
) {
  if (type !== undefined) {
    validateMemoryType(type);
  }

  if (status !== undefined && status !== null) {
    validateMemoryStatus(status);
  }

  const filters = {
    userId,
  };

  if (type) {
    filters.type = type;
  }

  if (status) {
    filters.status = status;
  }

  return db.orm.public.Memory
    .where(filters)
    .all();
}

export async function getMemoryById(
  userId,
  memoryId
) {
  if (!Number.isInteger(memoryId)) {
    throw new Error('INVALID_MEMORY_ID');
  }

  const memory =
    await db.orm.public.Memory.first({
      id: memoryId,
      userId,
    });

  if (!memory) {
    throw new Error('MEMORY_NOT_FOUND');
  }

  return memory;
}

export async function updateMemory(
  userId,
  memoryId,
  updates
) {
  if (!Number.isInteger(memoryId)) {
    throw new Error('INVALID_MEMORY_ID');
  }

  const memory =
    await db.orm.public.Memory.first({
      id: memoryId,
      userId,
    });

  if (!memory) {
    throw new Error('MEMORY_NOT_FOUND');
  }

  const {
    type,
    content,
    source,
    importance,
    status,
  } = updates;

  const updateData = {};

  if (type !== undefined) {
    updateData.type = type;
  }

  if (source !== undefined) {
    updateData.source = source;
  }

  if (importance !== undefined) {
    updateData.importance = importance;
  }

  if (status !== undefined) {
    updateData.status = status;
  }

  /*
   * Track whether the actual memory content changed.
   *
   * If content changes, the existing:
   * - normalizedContent
   * - normalizationStatus
   * - normalizedAt
   * - embedding
   *
   * are no longer valid for the new content.
   */
  let contentChanged = false;

  if (content !== undefined) {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new Error('MEMORY_CONTENT_REQUIRED');
    }

    if (trimmedContent !== memory.content) {
      contentChanged = true;

      updateData.content = trimmedContent;

      /*
       * Invalidate normalization.
       */
      updateData.normalizedContent = null;
      updateData.normalizationStatus = 'pending';
      updateData.normalizedAt = null;
    }
  }

  /*
   * Update the Memory record.
   */
  const updatedMemory =
    await db.orm.public.Memory
      .where({
        id: memoryId,
        userId,
      })
      .update(updateData);

  /*
   * If the raw memory content changed,
   * the existing embedding is also stale.
   *
   * Keep the embedding row so we can regenerate
   * it later, but mark it as pending.
   */
  if (contentChanged) {
    const existingEmbedding =
      await db.orm.public.MemoryEmbedding.first({
        memoryId,
      });

    if (existingEmbedding) {
      await db.orm.public.MemoryEmbedding
        .where({
          memoryId,
        })
        .update({
          status: 'pending',
        });
    }
  }

  return updatedMemory;
}

export async function archiveMemory(
  userId,
  memoryId
) {
  if (!Number.isInteger(memoryId)) {
    throw new Error('INVALID_MEMORY_ID');
  }

  await getMemoryById(userId, memoryId);

  return db.orm.public.Memory
    .where({
      id: memoryId,
      userId,
    })
    .update({
      status: 'archived',
    });
}

export async function deleteMemory(
  userId,
  memoryId
) {
  if (!Number.isInteger(memoryId)) {
    throw new Error('INVALID_MEMORY_ID');
  }

  await getMemoryById(userId, memoryId);

  return db.orm.public.Memory
    .where({
      id: memoryId,
      userId,
    })
    .delete();
}

export {
  MEMORY_TYPES,
  MEMORY_SOURCES,
  MEMORY_STATUSES,
};