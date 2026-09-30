#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2f48f8f0ff75be76449acef955aa7b6024c0438cbb51bf88873c8eb2fa0481fc/contract';
import endContract from '../../snapshots/2f48f8f0ff75be76449acef955aa7b6024c0438cbb51bf88873c8eb2fa0481fc/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/39cfaf59bdb798546c0a6dda21e6ddf4b7c54d301d2a6881a2b9391bb6fbbad8/contract';
import startContract from '../../snapshots/39cfaf59bdb798546c0a6dda21e6ddf4b7c54d301d2a6881a2b9391bb6fbbad8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document',
        column: col('extractionMethod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
