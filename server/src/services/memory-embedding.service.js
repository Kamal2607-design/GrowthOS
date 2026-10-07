import { db } from '../prisma/db.ts';

import {
  generateEmbedding,
} from './ai/embedding.service.js';

import {
  createSha256Hash,
} from '../utils/hash.util.js';

export async function generateMemoryEmbedding(
  userId,
  memoryId
) {
  if (!Number.isInteger(memoryId)) {
    throw new Error(
      'INVALID_MEMORY_ID'
    );
  }

  const memory =
    await db.orm.public.Memory.first({
      id: memoryId,
      userId,
    });

  if (!memory) {
    throw new Error(
      'MEMORY_NOT_FOUND'
    );
  }

  if (
    memory.normalizationStatus !==
    'completed'
  ) {
    throw new Error(
      'MEMORY_NOT_NORMALIZED'
    );
  }

  if (
    !memory.normalizedContent ||
    !memory.normalizedContent.trim()
  ) {
    throw new Error(
      'NORMALIZED_CONTENT_REQUIRED'
    );
  }

  const normalizedContent =
    memory.normalizedContent.trim();

  const contentHash =
    createSha256Hash(
      normalizedContent
    );

  const existingEmbedding =
    await db.orm.public.MemoryEmbedding.first({
      memoryId,
    });

  /*
   * If an embedding already exists for
   * exactly the same normalized content,
   * return it without calling Ollama.
   */
  if (
    existingEmbedding &&
    existingEmbedding.status ===
      'completed' &&
    existingEmbedding.contentHash ===
      contentHash
  ) {
    return {
      memory,
      embedding: existingEmbedding,
      generated: false,
    };
  }

  if (existingEmbedding) {
    await db.orm.public.MemoryEmbedding
      .where({
        memoryId,
      })
      .update({
        status: 'processing',
        contentHash,
      });
  } else {
    await db.orm.public.MemoryEmbedding.create({
      memoryId,
      model: 'nomic-embed-text',
      dimensions: 768,
      contentHash,
      status: 'processing',
    });
  }

  try {
    const result =
      await generateEmbedding(
        normalizedContent
      );

    /*
     * Prisma cannot treat Unsupported("vector")
     * like a normal scalar in the ORM layer.
     *
     * We therefore store the vector using
     * PostgreSQL SQL through the database layer.
     */

  await db.orm.public.MemoryEmbedding
    .where({
      memoryId,
    })
    .update({
      embedding: result.embedding,
      model: result.model,
      dimensions: result.dimensions,
      contentHash,
      status: 'completed',
    });

    const updatedEmbedding =
      await db.orm.public.MemoryEmbedding.first({
        memoryId,
      });

    return {
      memory,
      embedding: updatedEmbedding,
      generated: true,
    };
  } catch (error) {
    await db.orm.public.MemoryEmbedding
      .where({
        memoryId,
      })
      .update({
        status: 'failed',
      });

    throw error;
  }
}