import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedImageReleaseExecutionPlanV1,
  evaluateMtgSealedImageReleaseDurableReadbackV1,
  evaluateMtgSealedImageReleasePrecommitV1,
  evaluateMtgSealedImageReleaseRollbackV1,
  MTG_SEALED_IMAGE_RELEASE_APPLY_EXPECTED_COUNTS_V1,
  validateMtgSealedImageReleaseExecutionPlanV1,
} from '../../backend/pricing/mtg_sealed_image_release_apply_v1.mjs';

const script = fs.readFileSync(
  'scripts/audits/mtg_sealed_image_release_rollback_canary_v1.mjs', 'utf8');
const applyScript = fs.readFileSync(
  'scripts/audits/mtg_sealed_image_release_apply_v1.mjs', 'utf8');

function sourcePlan() {
  return {
    game_key: 'mtg',
    source_price_release_id: '25626032-7d72-5542-a8e0-7a6532c2f776',
    source_coverage_fingerprint_sha256: 'a'.repeat(64),
    source_durable_execution_fingerprint_sha256: 'b'.repeat(64),
    plan_fingerprint_sha256: 'c'.repeat(64),
    release_id: '86b207e6-4f73-5d9a-af40-864c47256c38',
    release_manifest_fingerprint_sha256: 'd'.repeat(64),
    datasets: {
      evidence: { row_count: 2182 },
      objects: { row_count: 2141 },
      assertions: { row_count: 2149 },
      releases: { row_count: 1 },
      release_members: { row_count: 2149 },
      exclusions: { row_count: 33 },
    },
  };
}

function plan(mode = 'rollback_canary') {
  return buildMtgSealedImageReleaseExecutionPlanV1({
    repository: { branch: 'agent/mtg-sealed-image-migration-promotion-v1',
      head_sha: 'e'.repeat(40), tracked_worktree_clean: true },
    sourcePlan: sourcePlan(),
    sourceArtifactManifestSha256: 'f'.repeat(64),
    sourceArtifactHashes: { 'run_plan.json': { bytes: 100, sha256: '1'.repeat(64) } },
    productionPreflight: { valid: true, current_image_release_id: null },
    mode,
  });
}

function validRollbackProof() {
  const exact = (count) => ({ exact: true, expected_count: count,
    actual_count: count, table_count: count, mismatch_count: 0 });
  return {
    preflight: { valid: true },
    transaction_local_preflight: { valid: true },
    transaction: { started: true, committed: false, rolled_back: true },
    transaction_readback: {
      evidence: exact(2182), objects: exact(2141), assertions: exact(2149),
      releases: exact(1), release_members: exact(2149),
    },
    database_manifest_fingerprint: 'a'.repeat(64),
    planned_manifest_fingerprint: 'a'.repeat(64),
    release_state: 'frozen',
    excluded_evidence_without_assertion_count: 33,
    transaction_image_pointer_count: 0,
    write_attribution: [
      ['sealed_product_image_evidence', 2182, 0],
      ['sealed_product_image_objects', 2141, 0],
      ['sealed_product_variant_image_assertions', 2149, 0],
      ['sealed_product_image_releases', 1, 1],
      ['sealed_product_image_release_members', 2149, 0],
    ].map(([table_name, inserted, updated]) => ({ table_name, inserted,
      updated, deleted: 0, hot_updated: 0 })),
    post_rollback: { transaction_read_only: true, zero_target_rows: true,
      image_pointer_unchanged: true, protected_boundaries_unchanged: true,
      security_boundary_unchanged: true },
  };
}

function validPostApplyProof() {
  const transaction = validRollbackProof();
  return {
    committed: true,
    precommit_validation: evaluateMtgSealedImageReleasePrecommitV1({
      ...transaction,
      transaction: { started: true, committed: false, rolled_back: false },
    }),
    transaction_read_only: true,
    readback: transaction.transaction_readback,
    release_state: 'frozen',
    database_manifest_fingerprint: 'a'.repeat(64),
    planned_manifest_fingerprint: 'a'.repeat(64),
    image_pointer_write_count: 0,
    excluded_evidence_without_assertion_count: 33,
    protected_boundaries_unchanged: true,
    security_boundary_unchanged: true,
    zero_row_idempotency_ready: true,
  };
}

test('rollback and durable execution plans are exact and fingerprinted', () => {
  const rollback = plan();
  const durable = plan('durable_apply');
  assert.deepEqual(rollback.expected_counts,
    MTG_SEALED_IMAGE_RELEASE_APPLY_EXPECTED_COUNTS_V1);
  assert.equal(rollback.boundaries.durable_database_writes, 0);
  assert.equal(rollback.boundaries.updates, 0);
  assert.equal(durable.boundaries.durable_database_writes, 8623);
  assert.equal(durable.boundaries.updates, 1);
  assert.notEqual(rollback.execution_fingerprint_sha256,
    durable.execution_fingerprint_sha256);
  assert.deepEqual(validateMtgSealedImageReleaseExecutionPlanV1(rollback),
    { valid: true, findings: [] });
  assert.deepEqual(validateMtgSealedImageReleaseExecutionPlanV1(durable),
    { valid: true, findings: [] });
  assert.match(durable.required_durable_apply_authority,
    new RegExp(durable.execution_fingerprint_sha256));
});

test('execution plan fails closed on count, pointer, and fingerprint drift', () => {
  const countDrift = plan();
  countDrift.expected_counts.evidence -= 1;
  assert.ok(validateMtgSealedImageReleaseExecutionPlanV1(countDrift).findings
    .includes('count_mismatch'));
  const pointer = plan();
  pointer.pointer_function_called = true;
  assert.ok(validateMtgSealedImageReleaseExecutionPlanV1(pointer).findings
    .includes('pointer_call_included'));
  const fingerprint = plan();
  fingerprint.execution_fingerprint_sha256 = '0'.repeat(64);
  assert.ok(validateMtgSealedImageReleaseExecutionPlanV1(fingerprint).findings
    .includes('execution_fingerprint_mismatch'));
});

test('exact rollback proof with expected write attribution passes', () => {
  assert.deepEqual(evaluateMtgSealedImageReleaseRollbackV1(
    validRollbackProof()), { valid: true, findings: [] });
});

test('durable apply is commit-gated by exact precommit and post-apply proofs', () => {
  const transaction = validRollbackProof();
  const precommit = evaluateMtgSealedImageReleasePrecommitV1({
    ...transaction,
    transaction: { started: true, committed: false, rolled_back: false },
  });
  assert.deepEqual(precommit, { valid: true, findings: [] });
  assert.deepEqual(evaluateMtgSealedImageReleaseDurableReadbackV1(
    validPostApplyProof()), { valid: true, findings: [] });
});

test('durable readback fails on pointer, boundary, or idempotency drift', () => {
  const proof = validPostApplyProof();
  proof.image_pointer_write_count = 1;
  proof.protected_boundaries_unchanged = false;
  proof.zero_row_idempotency_ready = false;
  const result = evaluateMtgSealedImageReleaseDurableReadbackV1(proof);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('durable_pointer_boundary_breached'));
  assert.ok(result.findings.includes('durable_protected_boundary_drift'));
  assert.ok(result.findings.includes('durable_idempotency_not_proven'));
});

test('rollback proof fails on residue, mismatch, pointer, or extra write table', () => {
  const proof = validRollbackProof();
  proof.transaction_readback.objects.exact = false;
  proof.post_rollback.zero_target_rows = false;
  proof.transaction_image_pointer_count = 1;
  proof.write_attribution.push({ table_name: 'card_prints', inserted: 1,
    updated: 0, deleted: 0 });
  const result = evaluateMtgSealedImageReleaseRollbackV1(proof);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('inside_transaction_exact_readback_failed'));
  assert.ok(result.findings.includes('post_rollback_target_residue'));
  assert.ok(result.findings.includes('image_pointer_changed_in_transaction'));
  assert.ok(result.findings.includes('write_attribution_table_count_mismatch'));
});

test('operator requires exact clean producer and never calls pointer activation', () => {
  assert.match(script, /--execute-rollback-canary/);
  assert.match(script, /tracked_worktree_clean/);
  assert.match(script, /expectedPlanFingerprint/);
  assert.match(script, /begin transaction isolation level repeatable read/);
  assert.match(script, /sealed_product_freeze_image_release_v1/);
  assert.match(script, /select \* from\s+public\.sealed_product_freeze_image_release_v1/);
  assert.doesNotMatch(script,
    /\(public\.sealed_product_freeze_image_release_v1\([\s\S]*?\)\)\.\*/);
  assert.match(script, /await client\.query\('rollback'\)/);
  assert.doesNotMatch(script, /sealed_product_set_active_image_release_v1\(/);
  assert.doesNotMatch(script, /storage\.from|fetch\(/);
});

test('durable operator requires exact authority before its sole commit path', () => {
  assert.match(applyScript, /argument === '--apply'/);
  assert.match(applyScript, /argument === '--plan-only'/);
  assert.match(applyScript, /expectedExecutionFingerprint/);
  assert.match(applyScript,
    /MTG_SEALED_IMAGE_RELEASE_APPLY_APPROVAL_ENV_V1/);
  assert.match(applyScript, /evaluateMtgSealedImageReleasePrecommitV1/);
  assert.match(applyScript, /await client\.query\('commit'\)/);
  assert.match(applyScript, /independentPostApplyReadback/);
  assert.match(applyScript, /zero_row_idempotency_ready/);
  assert.doesNotMatch(applyScript,
    /sealed_product_set_active_image_release_v1\(/);
  assert.doesNotMatch(applyScript, /storage\.from|fetch\(/);
});
