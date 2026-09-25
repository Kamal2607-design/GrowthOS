#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/27a0b87d82871b77872d7bcab00e2781025a4838105de0d9ca1df787e67dfacf/contract';
import startContract from '../../snapshots/27a0b87d82871b77872d7bcab00e2781025a4838105de0d9ca1df787e67dfacf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e1e0ed6733a439641be7fb15ed06bc07c88c2c2fc3e2c6315b7836d6fa6dfd1e/contract';
import endContract from '../../snapshots/e1e0ed6733a439641be7fb15ed06bc07c88c2c2fc3e2c6315b7836d6fa6dfd1e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'actionSuggestion',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('goalId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('priority', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('reasoning', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('ai'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'action',
        column: col('suggestionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'action',
        constraint: 'action_suggestionId_key',
        columns: ['suggestionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'actionSuggestion',
        index: 'actionSuggestion_goalId_idx_8733343e',
        columns: ['goalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'actionSuggestion',
        index: 'actionSuggestion_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'actionSuggestion',
        index: 'actionSuggestion_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'actionSuggestion',
        foreignKey: {
          name: 'actionSuggestion_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'actionSuggestion',
        foreignKey: {
          name: 'actionSuggestion_goalId_fkey',
          columns: ['goalId'],
          references: { schema: 'public', table: 'goal', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action',
        foreignKey: {
          name: 'action_suggestionId_fkey',
          columns: ['suggestionId'],
          references: { schema: 'public', table: 'actionSuggestion', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
