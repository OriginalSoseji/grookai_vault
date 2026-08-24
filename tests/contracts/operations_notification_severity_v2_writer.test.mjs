import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  validateAppliedStateV2,
  validatePreflightStateV2
} from '../../scripts/ops/operations_notification_severity_v2_writer.mjs';

const source = fs.readFileSync('scripts/ops/operations_notification_severity_v2_writer.mjs', 'utf8');

function privateState(overrides = {}) {
  return {
    ledger_count: 0,
    ledger_name: null,
    latest_version: '20260824033000',
    later_version_count: 0,
    event_row_count: 4,
    severity_counts: { critical: 4 },
    constraint_definition: "CHECK ((severity = 'critical'::text))",
    enqueue_function_definition: "if v_severity <> 'critical' then",
    rls_enabled: true,
    anon_select: false,
    authenticated_select: false,
    anon_function_execute: false,
    authenticated_function_execute: false,
    service_function_execute: true,
    ...overrides
  };
}

test('preflight requires the exact clean migration head and private authority', () => {
  assert.deepEqual(validatePreflightStateV2(privateState()), []);
  assert.ok(validatePreflightStateV2(privateState({ latest_version: 'wrong' })).includes('unexpected_migration_head'));
  assert.ok(validatePreflightStateV2(privateState({ anon_select: true })).includes('operations_alert_authority_not_private'));
});

test('applied state preserves rows and proves all severity terms', () => {
  const before = privateState();
  const after = privateState({
    ledger_count: 1,
    ledger_name: 'operations_notification_severity_v2',
    latest_version: '20260824043000',
    constraint_definition: "CHECK ((severity = ANY (ARRAY['critical', 'high', 'warning', 'info'])))",
    enqueue_function_definition: "if v_severity not in ('critical', 'high', 'warning', 'info') then"
  });
  assert.deepEqual(validateAppliedStateV2(before, after), []);
  assert.ok(validateAppliedStateV2(before, { ...after, event_row_count: 5 }).includes('event_rows_changed'));
});

test('writer performs one atomic migration and exact ledger write with dry-run rollback', () => {
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /insert into supabase_migrations\.schema_migrations/);
  assert.match(source, /mode === 'apply' \? 'commit' : 'rollback'/);
  assert.match(source, /Migration SHA mismatch/);
  assert.match(source, /collector_notification_rows_created: 0/);
  assert.doesNotMatch(source, /\b(?:delete|truncate)\s+(?:from\s+)?public\./i);
});
