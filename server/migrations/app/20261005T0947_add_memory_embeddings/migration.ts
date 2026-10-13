#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2f48f8f0ff75be76449acef955aa7b6024c0438cbb51bf88873c8eb2fa0481fc/contract';
import startContract from '../../snapshots/2f48f8f0ff75be76449acef955aa7b6024c0438cbb51bf88873c8eb2fa0481fc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ccb8d29e3ee0fd8cc739633e56d74adbbd7f8b8b611fae21a228e2d544a50bc0/contract';
import endContract from '../../snapshots/ccb8d29e3ee0fd8cc739633e56d74adbbd7f8b8b611fae21a228e2d544a50bc0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'documentCandidate',
        columns: [
          col('content', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('documentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('importance', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('sourceIndex', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        column: col('sourceCandidateId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'goal',
        column: col('sourceCandidateId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'memory',
        column: col('normalizationStatus', 'text', {
          notNull: true,
          default: lit('pending'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'memory',
        column: col('normalizedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'memory',
        column: col('normalizedContent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'memory',
        column: col('sourceCandidateId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'memory',
        column: col('status', 'text', {
          notNull: true,
          default: lit('active'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'action',
        constraint: 'action_sourceCandidateId_key',
        columns: ['sourceCandidateId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'documentCandidate',
        constraint: 'documentCandidate_documentId_type_sourceIndex_key',
        columns: ['documentId', 'type', 'sourceIndex'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'goal',
        constraint: 'goal_sourceCandidateId_key',
        columns: ['sourceCandidateId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'memory',
        constraint: 'memory_sourceCandidateId_key',
        columns: ['sourceCandidateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentCandidate',
        index: 'documentCandidate_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentCandidate',
        index: 'documentCandidate_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentCandidate',
        index: 'documentCandidate_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentCandidate',
        index: 'documentCandidate_userId_status_idx_e4a128ba',
        columns: ['userId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memory',
        index: 'memory_userId_normalizationStatus_idx_a7fd81b8',
        columns: ['userId', 'normalizationStatus'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memory',
        index: 'memory_userId_status_idx_e4a128ba',
        columns: ['userId', 'status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentCandidate',
        foreignKey: {
          name: 'documentCandidate_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentCandidate',
        foreignKey: {
          name: 'documentCandidate_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'document', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'action',
        foreignKey: {
          name: 'action_sourceCandidateId_fkey',
          columns: ['sourceCandidateId'],
          references: { schema: 'public', table: 'documentCandidate', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'goal',
        foreignKey: {
          name: 'goal_sourceCandidateId_fkey',
          columns: ['sourceCandidateId'],
          references: { schema: 'public', table: 'documentCandidate', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'memory',
        foreignKey: {
          name: 'memory_sourceCandidateId_fkey',
          columns: ['sourceCandidateId'],
          references: { schema: 'public', table: 'documentCandidate', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
