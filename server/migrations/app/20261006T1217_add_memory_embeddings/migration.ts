#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ab70552210ea393f686e71e09a908424f484628e9c70944432fd7662ac9050e0/contract';
import endContract from '../../snapshots/ab70552210ea393f686e71e09a908424f484628e9c70944432fd7662ac9050e0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ccb8d29e3ee0fd8cc739633e56d74adbbd7f8b8b611fae21a228e2d544a50bc0/contract';
import startContract from '../../snapshots/ccb8d29e3ee0fd8cc739633e56d74adbbd7f8b8b611fae21a228e2d544a50bc0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'MemoryEmbedding',
        columns: [
          col('contentHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('dimensions', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('embedding', 'vector(768)', {
            codecRef: { codecId: 'pg/vector@1', typeParams: { length: 768 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('memoryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'MemoryEmbedding',
        constraint: 'MemoryEmbedding_memoryId_key',
        columns: ['memoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemoryEmbedding',
        index: 'MemoryEmbedding_model_idx_7426ef1f',
        columns: ['model'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemoryEmbedding',
        index: 'MemoryEmbedding_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MemoryEmbedding',
        foreignKey: {
          name: 'MemoryEmbedding_memoryId_fkey',
          columns: ['memoryId'],
          references: { schema: 'public', table: 'memory', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
