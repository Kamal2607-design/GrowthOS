#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3fbc469e3e70ef3fc8a1cf142559d981ba193912ca577193521f9bf23ca3f42b/contract';
import startContract from '../../snapshots/3fbc469e3e70ef3fc8a1cf142559d981ba193912ca577193521f9bf23ca3f42b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ccb8d29e3ee0fd8cc739633e56d74adbbd7f8b8b611fae21a228e2d544a50bc0/contract';
import endContract from '../../snapshots/ccb8d29e3ee0fd8cc739633e56d74adbbd7f8b8b611fae21a228e2d544a50bc0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
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
      this.createIndex({
        schema: 'public',
        table: 'memory',
        index: 'memory_userId_normalizationStatus_idx_a7fd81b8',
        columns: ['userId', 'normalizationStatus'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
