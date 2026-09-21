#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/27a0b87d82871b77872d7bcab00e2781025a4838105de0d9ca1df787e67dfacf/contract';
import endContract from '../../snapshots/27a0b87d82871b77872d7bcab00e2781025a4838105de0d9ca1df787e67dfacf/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/4db0d577e363203db009caa6dcd0735069de3cca3f2be8c820792c3338037f3b/contract';
import startContract from '../../snapshots/4db0d577e363203db009caa6dcd0735069de3cca3f2be8c820792c3338037f3b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropNotNull({ schema: 'public', table: 'user', column: 'passwordHash' })];
  }
}

MigrationCLI.run(import.meta.url, M);
