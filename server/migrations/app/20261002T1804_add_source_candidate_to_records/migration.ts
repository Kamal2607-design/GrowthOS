#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/83d61faac86ccaa2dcbcd0f564d2bdafa7a20e0023683a0fba2549ad6f642fb1/contract';
import startContract from '../../snapshots/83d61faac86ccaa2dcbcd0f564d2bdafa7a20e0023683a0fba2549ad6f642fb1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a0edcd043b2b961e8ae9ca504b78a58314fc27c771eff86ef84ea4e131c313bf/contract';
import endContract from '../../snapshots/a0edcd043b2b961e8ae9ca504b78a58314fc27c771eff86ef84ea4e131c313bf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
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
        column: col('sourceCandidateId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'action',
        constraint: 'action_sourceCandidateId_key',
        columns: ['sourceCandidateId'],
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
