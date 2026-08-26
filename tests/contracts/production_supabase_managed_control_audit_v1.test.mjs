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

test('final restore-drill report schema closes the restore measurement independently of replacement debt', () => {
  const result = evaluateManagedControlV1({
    project: PROJECT,
    backupInventory: { ...BACKUPS, pitr_enabled: true },
    restoreEvidence: {
      schema_version: 'PRODUCTION_SUPABASE_RESTORE_DRILL_FINAL_REPORT_V1',
      status: 'passed',
      production_replacement_readiness: 'blocked_provider_collation_followup',
      source: { project_ref: PROJECT.ref, production_writes: false },
      destination: { project_ref: 'dkuiaiorwirujnrmbpvq' },
      schedule_isolation: { result: 'passed', production_target_executions: 0 },
      reconciliation: {
        status: 'passed',
        migration_ledger_match: true,
        schema_match: true,
        schema_column_match: true,
        rls_policy_match: true,
        function_match: true,
        relation_grant_match: true,
        routine_grant_match: true
      },
      signed_in_smoke: { status: 'passed' },
      boundaries: { production_database_writes: false, production_restore_in_place: false }
    },
    now: NOW
  });
  assert.equal(result.status, 'healthy');
  assert.equal(result.metrics.restore_exercise_verified, true);
});

test('final restore-drill report rejects source mutation or same-project targets', () => {
  const base = {
    status: 'passed',
    source: { project_ref: PROJECT.ref, production_writes: false },
    destination: { project_ref: 'dkuiaiorwirujnrmbpvq' },
    schedule_isolation: { result: 'passed', production_target_executions: 0 },
    reconciliation: {
      status: 'passed',
      migration_ledger_match: true,
      schema_match: true,
      schema_column_match: true,
      rls_policy_match: true,
      function_match: true,
      relation_grant_match: true,
      routine_grant_match: true
    },
    signed_in_smoke: { status: 'passed' },
    boundaries: { production_database_writes: false, production_restore_in_place: false }
  };
  const sourceMutation = evaluateManagedControlV1({
    project: PROJECT,
    backupInventory: BACKUPS,
    restoreEvidence: { ...base, source: { ...base.source, production_writes: true } },
    now: NOW
  });
  const sameProject = evaluateManagedControlV1({
    project: PROJECT,
    backupInventory: BACKUPS,
    restoreEvidence: { ...base, destination: { project_ref: PROJECT.ref } },
    now: NOW
  });
  assert.equal(sourceMutation.metrics.restore_exercise_verified, false);
  assert.equal(sameProject.metrics.restore_exercise_verified, false);
});

test('audit CLI remains read-only and never invokes restore or project mutation commands', () => {
  const source = fs.readFileSync('scripts/audits/production_supabase_managed_control_audit_v1.mjs', 'utf8');
  assert.match(source, /\['projects', 'list'/);
  assert.match(source, /\['backups', 'list'/);
  assert.doesNotMatch(source, /\['backups', 'restore'/);
  assert.doesNotMatch(source, /\['projects', '(?:create|delete)'/);
});
