#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4db0d577e363203db009caa6dcd0735069de3cca3f2be8c820792c3338037f3b/contract';
import endContract from '../../snapshots/4db0d577e363203db009caa6dcd0735069de3cca3f2be8c820792c3338037f3b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/7077fa8fbcb16c79a1faff06511f52643fd6fa653eb478a01f1018f4904cf6cb/contract';
import startContract from '../../snapshots/7077fa8fbcb16c79a1faff06511f52643fd6fa653eb478a01f1018f4904cf6cb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'oAuthAccount',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('providerAccountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'oAuthAccount',
        constraint: 'oAuthAccount_provider_providerAccountId_key',
        columns: ['provider', 'providerAccountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oAuthAccount',
        index: 'oAuthAccount_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oAuthAccount',
        foreignKey: {
          name: 'oAuthAccount_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
