#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/39cfaf59bdb798546c0a6dda21e6ddf4b7c54d301d2a6881a2b9391bb6fbbad8/contract';
import endContract from '../../snapshots/39cfaf59bdb798546c0a6dda21e6ddf4b7c54d301d2a6881a2b9391bb6fbbad8/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b2b410abcba1e19c6ecf86367ed70c03db3464b2222043595a083541ff109f23/contract';
import startContract from '../../snapshots/b2b410abcba1e19c6ecf86367ed70c03db3464b2222043595a083541ff109f23/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'reflectionAnalysis',
        column: col('progressAnalysis', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
