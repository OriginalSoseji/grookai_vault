import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildDeletionDecision,
  classifyReference,
  planFingerprint,
  targetFingerprint,
} from '../../backend/account_deletion/account_deletion_policy_v1.mjs';

const worker = fs.readFileSync('scripts/ops/account_deletion_worker_v1.mjs', 'utf8');
const exercise = fs.readFileSync(
  'scripts/audits/release_account_deletion_disposable_exercise_v1.mjs',
  'utf8',
);
const runbook = fs.readFileSync('docs/release/ACCOUNT_DELETION_OPERATIONS_V1.md', 'utf8');

function reference(overrides = {}) {
  return {
    schema_name: 'public',
    table_name: 'public_profiles',
    column_name: 'user_id',
    nullable: false,
    delete_action: 'CASCADE',
    row_count: 1,
    ...overrides,
  };
}

test('cascade rows permit hard deletion when no retained history exists', () => {
  const references = [reference()];
  const decision = buildDeletionDecision({ references, activeOwnedBinders: 0 });
  assert.equal(decision.decision, 'hard_delete_allowed');
  assert.equal(decision.hard_delete_allowed, true);
});

test('active Binder ownership blocks account deletion', () => {
  const decision = buildDeletionDecision({ references: [], activeOwnedBinders: 1 });
  assert.equal(decision.decision, 'manual_binder_resolution_required');
  assert.equal(decision.hard_delete_allowed, false);
});

test('required operational history routes to anonymized retention', () => {
  const references = [reference({
    table_name: 'card_execution_events',
    column_name: 'initiated_by_user_id',
    delete_action: 'NO ACTION',
  })];
  const decision = buildDeletionDecision({ references, activeOwnedBinders: 0 });
  assert.equal(decision.decision, 'soft_delete_and_anonymized_retention_required');
  assert.equal(decision.hard_delete_allowed, false);
});

test('unknown populated blockers fail closed', () => {
  const unknown = reference({ table_name: 'unknown_history', delete_action: 'RESTRICT' });
  assert.equal(classifyReference(unknown).policy, 'unclassified_hard_delete_blocker');
  const decision = buildDeletionDecision({ references: [unknown], activeOwnedBinders: 0 });
  assert.equal(decision.decision, 'policy_repair_required');
});

test('artifacts use a one-way target fingerprint', () => {
  const userId = '91a3822d-30c5-48f8-9a09-97e57b73152d';
  const fingerprint = targetFingerprint(userId);
  assert.equal(fingerprint.length, 64);
  assert.doesNotMatch(fingerprint, new RegExp(userId, 'i'));
});

test('plan fingerprint is deterministic and excludes timestamps', () => {
  const base = {
    version: 'ACCOUNT_DELETION_WORKER_V1',
    policy_version: 'ACCOUNT_DELETION_POLICY_V1',
    request_ticket_hash: 'b'.repeat(64),
    target_fingerprint: 'a'.repeat(64),
    target_exists: true,
    target_soft_deleted: false,
    references: [],
    storage: [],
    active_owned_binders: 0,
    decision: { decision: 'hard_delete_allowed' },
    boundaries: { raw_user_id_in_artifact: false },
  };
  assert.equal(
    planFingerprint({ ...base, generated_at: '2026-01-01T00:00:00Z' }),
    planFingerprint({ ...base, generated_at: '2026-02-01T00:00:00Z' }),
  );
  assert.notEqual(
    planFingerprint(base),
    planFingerprint({ ...base, target_soft_deleted: true }),
  );
});

test('apply requires exact plan acknowledgement and removes Storage first', () => {
  assert.match(worker, /GROOKAI_ACCOUNT_DELETION_ACK/);
  assert.match(worker, /expectedPlanSha256/);
  assert.match(worker, /await removeStorageObjects\(service, storageRows\)/);
  assert.match(worker, /service\.auth\.admin\.deleteUser\(userId, false\)/);
  assert.match(worker, /Account deletion readback did not reconcile to zero/);
});

test('runbook forbids browser service keys and documents retained-history path', () => {
  assert.match(runbook, /Never place the service key/i);
  assert.match(runbook, /soft_delete_and_anonymized_retention_required/);
  assert.match(runbook, /Do not force a hard delete/i);
});

test('production exercise is restricted to a disposable account created in-process', () => {
  assert.match(exercise, /codex-release-deletion-/);
  assert.match(exercise, /example\.invalid/);
  assert.match(exercise, /disposable_account_created_by_execution: true/);
  assert.match(exercise, /real_user_touched: false/);
  assert.match(exercise, /if \(!completed && userId\)/);
});
