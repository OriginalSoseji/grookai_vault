import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { evaluateManagedControlV1 } from '../../scripts/audits/production_supabase_managed_control_audit_v1.mjs';

const NOW = new Date('2026-08-24T05:00:00.000Z');
const PROJECT = { ref: 'ycdxbpibncqcchqiihfz', status: 'ACTIVE_HEALTHY' };
const BACKUPS = {
  pitr_enabled: false,
  walg_enabled: true,
  backups: Array.from({ length: 7 }, (_, index) => ({
    inserted_at: new Date(Date.parse('2026-08-23T12:00:00.000Z') - index * 86_400_000).toISOString(),
    is_physical_backup: true,
    status: 'COMPLETED'
  }))
};

test('fresh seven-day physical backup chain is incomplete only for PITR and restore proof', () => {
  const result = evaluateManagedControlV1({ project: PROJECT, backupInventory: BACKUPS, now: NOW });
  assert.equal(result.status, 'incomplete');
  assert.equal(result.summary.critical, 0);
  assert.equal(result.summary.high, 0);
  assert.equal(result.metrics.completed_physical_backup_count, 7);
  assert.equal(result.metrics.restore_exercise_verified, false);
});

test('stale or discontinuous backup evidence fails the gate', () => {
  const stale = evaluateManagedControlV1({
    project: PROJECT,
    backupInventory: { ...BACKUPS, backups: BACKUPS.backups.map((row) => ({ ...row, inserted_at: new Date(Date.parse(row.inserted_at) - 3 * 86_400_000).toISOString() })) },
    now: NOW
  });
  const discontinuous = evaluateManagedControlV1({
    project: PROJECT,
    backupInventory: { ...BACKUPS, backups: BACKUPS.backups.map((row, index) => index === 1 ? { ...row, inserted_at: '2026-08-20T12:00:00.000Z' } : row) },
    now: NOW
  });
  assert.equal(stale.status, 'failed');
  assert.equal(discontinuous.status, 'failed');
});

test('reconciled nonproduction restore evidence closes the restore measurement', () => {
  const result = evaluateManagedControlV1({
    project: PROJECT,
    backupInventory: { ...BACKUPS, pitr_enabled: true },
    restoreEvidence: {
      status: 'succeeded',
      production_source_project_ref: PROJECT.ref,
      target_environment: 'nonproduction',
      production_mutations: false,
      reconciliation: { mismatches: 0 }
    },
    now: NOW
  });
  assert.equal(result.status, 'healthy');
  assert.equal(result.metrics.restore_exercise_verified, true);
});

test('audit CLI remains read-only and never invokes restore or project mutation commands', () => {
  const source = fs.readFileSync('scripts/audits/production_supabase_managed_control_audit_v1.mjs', 'utf8');
  assert.match(source, /\['projects', 'list'/);
  assert.match(source, /\['backups', 'list'/);
  assert.doesNotMatch(source, /\['backups', 'restore'/);
  assert.doesNotMatch(source, /\['projects', '(?:create|delete)'/);
});
