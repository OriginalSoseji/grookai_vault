import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateRestorePreflightV1
} from '../../scripts/audits/production_supabase_restore_preflight_v1.mjs';

const NOW = new Date('2026-08-24T20:00:00.000Z');
const SOURCE = 'ycdxbpibncqcchqiihfz';
const DESTINATION = 'abcdefghijklmnopqrst';
const ORGANIZATION = 'rksadomjkuoxvrbhsmxu';

function input(overrides = {}) {
  return {
    projects: [{ ref: SOURCE, organization_id: ORGANIZATION, name: 'Production', region: 'us-east-2', status: 'ACTIVE_HEALTHY' }],
    backupInventory: {
      walg_enabled: true,
      backups: [{ inserted_at: '2026-08-24T19:12:52.617Z', is_physical_backup: true, status: 'COMPLETED' }]
    },
    sourceSnapshot: {
      database_bytes: 228_000_000_000,
      schema_fingerprint_sha256: 'a'.repeat(64),
      migration_ledger_fingerprint_sha256: 'b'.repeat(64)
    },
    sourceProjectRef: SOURCE,
    organizationId: ORGANIZATION,
    destinationProjectRef: null,
    destinationIsolationConfirmed: false,
    destinationCapacityGb: null,
    now: NOW,
    ...overrides
  };
}

test('restore preflight blocks when no isolated destination exists', () => {
  const result = evaluateRestorePreflightV1(input());
  assert.equal(result.status, 'blocked');
  assert.equal(result.restore_execution_allowed, false);
  assert.equal(result.minimum_destination_capacity_gb, 274);
  assert.ok(result.findings.some((row) => row.code === 'isolated_destination_not_supplied'));
});

test('restore preflight can never select production as destination', () => {
  const result = evaluateRestorePreflightV1(input({ destinationProjectRef: SOURCE, destinationCapacityGb: 400 }));
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some((row) => row.code === 'production_selected_as_restore_destination'));
});

test('restore preflight requires destination isolation and capacity evidence', () => {
  const projects = [...input().projects, { ref: DESTINATION, organization_id: ORGANIZATION, name: 'Restore Drill', region: 'us-east-2', status: 'ACTIVE_HEALTHY' }];
  const unconfirmed = evaluateRestorePreflightV1(input({ projects, destinationProjectRef: DESTINATION, destinationCapacityGb: 200 }));
  assert.ok(unconfirmed.findings.some((row) => row.code === 'destination_isolation_not_confirmed'));
  assert.ok(unconfirmed.findings.some((row) => row.code === 'destination_capacity_insufficient'));

  const ready = evaluateRestorePreflightV1(input({
    projects,
    destinationProjectRef: DESTINATION,
    destinationIsolationConfirmed: true,
    destinationCapacityGb: 400
  }));
  assert.equal(ready.status, 'ready_for_restore_authorization');
  assert.equal(ready.restore_execution_allowed, false);
  assert.deepEqual(ready.findings, []);
});

test('restore preflight blocks stale backups and missing source fingerprints', () => {
  const result = evaluateRestorePreflightV1(input({
    backupInventory: {
      walg_enabled: true,
      backups: [{ inserted_at: '2026-08-20T00:00:00.000Z', is_physical_backup: true, status: 'COMPLETED' }]
    },
    sourceSnapshot: { database_bytes: 228_000_000_000 }
  }));
  assert.ok(result.findings.some((row) => row.code === 'source_backup_stale'));
  assert.ok(result.findings.some((row) => row.code === 'source_schema_fingerprint_missing'));
  assert.ok(result.findings.some((row) => row.code === 'source_migration_fingerprint_missing'));
});
