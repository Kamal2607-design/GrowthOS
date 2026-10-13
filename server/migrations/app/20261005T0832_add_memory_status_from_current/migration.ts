#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3fbc469e3e70ef3fc8a1cf142559d981ba193912ca577193521f9bf23ca3f42b/contract';
import endContract from '../../snapshots/3fbc469e3e70ef3fc8a1cf142559d981ba193912ca577193521f9bf23ca3f42b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a0edcd043b2b961e8ae9ca504b78a58314fc27c771eff86ef84ea4e131c313bf/contract';
import startContract from '../../snapshots/a0edcd043b2b961e8ae9ca504b78a58314fc27c771eff86ef84ea4e131c313bf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'memory',
        column: col('status', 'text', {
          notNull: true,
          default: lit('active'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'memory',
        index: 'memory_userId_status_idx_e4a128ba',
        columns: ['userId', 'status'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
