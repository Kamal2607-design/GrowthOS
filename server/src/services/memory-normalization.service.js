import { db } from '../prisma/db.ts';

import {
  normalizeMemoryWithAI,
} from './ai/memory-normalization-ai.service.js';

const NORMALIZATION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
];

export async function normalizeMemory(
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

  if (
    memory.normalizationStatus === 'completed' &&
    memory.normalizedContent
  ) {
    return memory;
  }

  await db.orm.public.Memory
    .where({
      id: memoryId,
      userId,
    })
    .update({
      normalizationStatus: 'processing',
    });

  try {
    const normalized =
      await normalizeMemoryWithAI(
        memory
      );

    const updatedMemory =
      await db.orm.public.Memory
        .where({
          id: memoryId,
          userId,
        })
        .update({
          normalizedContent:
            normalized.normalizedContent,

          normalizationStatus:
            'completed',

          normalizedAt:
             Temporal.Now.instant(),
        });

    return updatedMemory;
  } catch (error) {
    await db.orm.public.Memory
      .where({
        id: memoryId,
        userId,
      })
      .update({
        normalizationStatus: 'failed',
      });

    throw error;
  }
}

export async function normalizePendingMemories(
  userId
) {
  const memories =
    await db.orm.public.Memory
      .where({
        userId,
        normalizationStatus: 'pending',
      })
      .all();

  const results = [];

  for (const memory of memories) {
    try {
      const normalized =
        await normalizeMemory(
          userId,
          memory.id
        );

      results.push({
        success: true,
        memory: normalized,
      });
    } catch (error) {
      results.push({
        success: false,
        memoryId: memory.id,
        error: error.message,
      });
    }
  }

  return results;
}