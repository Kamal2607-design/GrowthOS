#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b2b410abcba1e19c6ecf86367ed70c03db3464b2222043595a083541ff109f23/contract';
import endContract from '../../snapshots/b2b410abcba1e19c6ecf86367ed70c03db3464b2222043595a083541ff109f23/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e1e0ed6733a439641be7fb15ed06bc07c88c2c2fc3e2c6315b7836d6fa6dfd1e/contract';
import startContract from '../../snapshots/e1e0ed6733a439641be7fb15ed06bc07c88c2c2fc3e2c6315b7836d6fa6dfd1e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'reflectionAnalysis',
        columns: [
          col('challenges', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('goalAlignment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('highlights', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('learnings', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('moodAnalysis', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('productivityAnalysis', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recommendedActions', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reflectionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('summary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'actionSuggestion',
        column: col('reflectionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'reflectionAnalysis',
        constraint: 'reflectionAnalysis_reflectionId_key',
        columns: ['reflectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'actionSuggestion',
        index: 'actionSuggestion_reflectionId_idx_c6b8fe2f',
        columns: ['reflectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reflectionAnalysis',
        index: 'reflectionAnalysis_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'actionSuggestion',
        foreignKey: {
          name: 'actionSuggestion_reflectionId_fkey',
          columns: ['reflectionId'],
          references: { schema: 'public', table: 'reflection', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reflectionAnalysis',
        foreignKey: {
          name: 'reflectionAnalysis_reflectionId_fkey',
          columns: ['reflectionId'],
          references: { schema: 'public', table: 'reflection', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reflectionAnalysis',
        foreignKey: {
          name: 'reflectionAnalysis_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
