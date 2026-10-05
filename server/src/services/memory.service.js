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
  {
    type,
    content,
    source,
    importance,
    status,
  }
) {
  if (!Number.isInteger(memoryId)) {
    throw new Error('INVALID_MEMORY_ID');
  }

  await getMemoryById(userId, memoryId);

  const updateData = {};

  if (type !== undefined) {
    validateMemoryType(type);
    updateData.type = type;
  }

  if (content !== undefined) {
    if (
      typeof content !== 'string' ||
      !content.trim()
    ) {
      throw new Error('MEMORY_CONTENT_REQUIRED');
    }

    updateData.content = content.trim();
  }

  if (source !== undefined) {
    validateMemorySource(source);
    updateData.source = source;
  }

  if (importance !== undefined) {
    validateImportance(importance);
    updateData.importance = importance;
  }

  if (status !== undefined) {
    validateMemoryStatus(status);
    updateData.status = status;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('NO_MEMORY_FIELDS_TO_UPDATE');
  }

  return db.orm.public.Memory
    .where({
      id: memoryId,
      userId,
    })
    .update(updateData);
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