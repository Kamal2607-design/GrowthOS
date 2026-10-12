import { db } from '../prisma/db.ts';

import {
  generateEmbedding,
} from './ai/embedding.service.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

export async function searchMemories(
  userId,
  query,
  limit = DEFAULT_LIMIT
) {
  if (!Number.isInteger(userId)) {
    throw new Error('INVALID_USER_ID');
  }

  if (
    !query ||
    typeof query !== 'string' ||
    !query.trim()
  ) {
    throw new Error('SEARCH_QUERY_REQUIRED');
  }

  const normalizedQuery = query.trim();

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT
  ) {
    throw new Error(
      `SEARCH_LIMIT_INVALID: limit must be between 1 and ${MAX_LIMIT}`
    );
  }

  /*
   * 1. Generate embedding for the user's query.
   *
   * nomic-embed-text produces 768 dimensions,
   * matching MemoryEmbedding.embedding.
   */
  const embeddingResult =
    await generateEmbedding(normalizedQuery);

  if (embeddingResult.dimensions !== 768) {
    throw new Error(
      `INVALID_QUERY_EMBEDDING_DIMENSIONS: expected 768, received ${embeddingResult.dimensions}`
    );
  }

  /*
   * pgvector accepts vector literals such as:
   *
   * [0.123, -0.456, 0.789, ...]
   *
   * We send the entire vector as a parameter and
   * explicitly cast it to PostgreSQL's vector type.
   */
  const vectorLiteral =
    `[${embeddingResult.embedding.join(',')}]`;

  /*
   * IMPORTANT:
   *
   * Memory has:
   *
   * @@map("memory")
   *
   * therefore the PostgreSQL table is:
   *
   * memory
   *
   * MemoryEmbedding has no @@map, therefore:
   *
   * "MemoryEmbedding"
   */

  const plan = db.raw.sql`
    SELECT
      me."memoryId" AS "memoryId",
      m.content AS "content",
      m."normalizedContent" AS "normalizedContent",
      (
        1 - (
          me.embedding
          <=> CAST(${vectorLiteral} AS vector)
        )
      ) AS "similarity"
    FROM "MemoryEmbedding" me
    INNER JOIN memory m
      ON m.id = me."memoryId"
    WHERE
      m."userId" = ${userId}
      AND m.status = 'active'
      AND m."normalizationStatus" = 'completed'
      AND me.status = 'completed'
      AND me.embedding IS NOT NULL
    ORDER BY
      me.embedding
      <=> CAST(${vectorLiteral} AS vector)
      ASC
    LIMIT ${limit}
  `
    .returnsRow({
      memoryId: 'pg/int4@1',
      content: 'pg/text@1',
      normalizedContent: {
        codecId: 'pg/text@1',
        nullable: true,
      },
      similarity: 'pg/float8@1',
    })
    .build();

  const results =
    await db.runtime().query(plan);

  return {
    query: normalizedQuery,
    results,
  };
}