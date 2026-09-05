import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedImagePointerApplyPlanV1,
  evaluateMtgSealedImagePointerApplyPrecommitV1,
  evaluateMtgSealedImagePointerApplyReadbackV1,
  validateMtgSealedImagePointerApplyPlanV1,
} from '../../backend/pricing/mtg_sealed_image_pointer_apply_v1.mjs';

const script = fs.readFileSync(
  'scripts/audits/mtg_sealed_image_pointer_apply_v1.mjs', 'utf8');

function pointerPreflight() {
  return { valid: true, transaction_read_only: true,
    state: {
      authority: { current_image_release_id: null },
      image_tables: [], table_grants: [], routine_grants: [], lineage: {},
      release: { id: '86b207e6-4f73-5d9a-af40-864c47256c38',
        release_state: 'frozen',
        source_price_release_id: '25626032-7d72-5542-a8e0-7a6532c2f776',
        manifest_fingerprint: 'a'.repeat(64),
        frozen_by: 'ff463879-026a-5ee2-8326-59e2d8b9b665' },
      candidate: { storage_bucket: 'user-card-images',
        object_path: `sealed/mtg/sha256/bb/${'b'.repeat(64)}.jpg`,
        content_sha256: 'b'.repeat(64) },
      rpc_v3_deployed: false,
    } };
}

function repairState() {
  return { transaction_read_only: true,
    migration_ledger: { count: 1, version: '20260905040000',
      name: 'sealed_product_image_pointer_conflict_repair_v1' },
    pointer: { count: 0, image_release_id: null },
    pointer_function: { definition: `create function x() returns void as $$
      begin insert into p(game_key) values ('mtg')
      on conflict on constraint sealed_product_image_release_pointer_pkey
      do update set game_key=excluded.game_key; end $$ language plpgsql;` } };
}

function plan() {
  return buildMtgSealedImagePointerApplyPlanV1({
    repository: { branch: 'agent/mtg-sealed-image-migration-promotion-v1',
      head_sha: 'c'.repeat(40), tracked_worktree_clean: true },
    pointerPreflight: pointerPreflight(), repairState: repairState(),
    sourcePointerCanaryFingerprint: 'd'.repeat(64),
    sourceImageReleasePlanFingerprint: 'e'.repeat(64),
    sourceDurableApplyExecutionFingerprint: 'f'.repeat(64),
  });
}

function pointer(value) {
  return { game_key: 'mtg', image_release_id: value.target_image_release_id,
    previous_image_release_id: null,
    pointer_contract_version: 'SEALED_PRODUCT_IMAGE_RELEASE_POINTER_V1',
    changed_by: value.changed_by };
}

function precommit() {
  const value = plan();
  return { plan: value, preflight: { valid: true },
    transaction_local_preflight: { valid: true },
    transaction: { started: true, committed: false, rolled_back: false },
    transaction_pointer_readback: pointer(value),
    release_price_binding_valid: true,
    candidate_structural_eligibility_with_pointer: true,
    visibility: { catalog_visible: true, sealed_visible: false },
    signing_authorized_after_pointer: false, rpc_v3_deployed: false,
    write_attribution: [{ table_name: 'sealed_product_image_release_pointer',
      inserted: 1, updated: 0, deleted: 0, hot_updated: 0 }] };
}

test('durable pointer plan is exact, deterministic, and separately authorized', () => {
  const left = plan();
  const right = plan();
  assert.equal(left.activation_plan_fingerprint_sha256,
    right.activation_plan_fingerprint_sha256);
  assert.equal(left.expected_current_image_release_id, null);
  assert.equal(left.boundaries.durable_pointer_inserts, 1);
  assert.equal(left.boundaries.visibility_writes, 0);
  assert.deepEqual(validateMtgSealedImagePointerApplyPlanV1(left),
    { valid: true, findings: [] });
  assert.match(left.required_approval_message,
    new RegExp(left.activation_plan_fingerprint_sha256));
});

test('plan refuses absent repair or non-null pointer authority', () => {
  const current = pointerPreflight();
  current.state.authority.current_image_release_id = 'already-active';
  assert.throws(() => buildMtgSealedImagePointerApplyPlanV1({
    repository: { head_sha: 'a'.repeat(40), tracked_worktree_clean: true },
    pointerPreflight: current, repairState: repairState(),
    sourcePointerCanaryFingerprint: 'a'.repeat(64),
    sourceImageReleasePlanFingerprint: 'b'.repeat(64),
    sourceDurableApplyExecutionFingerprint: 'c'.repeat(64),
  }), /null-pointer preflight/);
  const missingRepair = repairState();
  missingRepair.migration_ledger.count = 0;
  assert.throws(() => buildMtgSealedImagePointerApplyPlanV1({
    repository: { head_sha: 'a'.repeat(40), tracked_worktree_clean: true },
    pointerPreflight: pointerPreflight(), repairState: missingRepair,
    sourcePointerCanaryFingerprint: 'a'.repeat(64),
    sourceImageReleasePlanFingerprint: 'b'.repeat(64),
    sourceDurableApplyExecutionFingerprint: 'c'.repeat(64),
  }), /repair is not exactly present/);
});

test('exact precommit proof passes', () => {
  assert.deepEqual(evaluateMtgSealedImagePointerApplyPrecommitV1(precommit()),
    { valid: true, findings: [] });
});

test('precommit fails on hidden signing, pointer, or write drift', () => {
  const proof = precommit();
  proof.signing_authorized_after_pointer = true;
  proof.transaction_pointer_readback.previous_image_release_id =
    proof.plan.target_image_release_id;
  proof.write_attribution[0].updated = 1;
  const result = evaluateMtgSealedImagePointerApplyPrecommitV1(proof);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('pointer_readback_mismatch'));
  assert.ok(result.findings.includes('hidden_visibility_or_signing_boundary_failed'));
  assert.ok(result.findings.includes('write_attribution_mismatch'));
});

test('durable readback requires exact pointer and stale-CAS rejection', () => {
  const before = precommit();
  const precommitValidation =
    evaluateMtgSealedImagePointerApplyPrecommitV1(before);
  const proof = { plan: before.plan, committed: true,
    precommit_validation: precommitValidation,
    independent_readback: { transaction_read_only: true,
      transaction_closed_before_artifacts: true, pointer: pointer(before.plan),
      release_price_binding_valid: true,
      candidate_structural_eligibility: true,
      catalog_visible: true, sealed_visible: false, signing_authorized: false,
      protected_state_unchanged: true, security_boundary_unchanged: true },
    stale_null_compare_and_swap: { rejected: true, sqlstate: '40001',
      pointer_unchanged: true } };
  assert.deepEqual(evaluateMtgSealedImagePointerApplyReadbackV1(proof),
    { valid: true, findings: [] });
  proof.stale_null_compare_and_swap.rejected = false;
  assert.ok(evaluateMtgSealedImagePointerApplyReadbackV1(proof).findings
    .includes('compare_and_swap_replay_not_proven'));
});

test('operator has one guarded commit path and no adjacent system writes', () => {
  assert.match(script, /argument === '--plan'/);
  assert.match(script, /argument === '--apply'/);
  assert.match(script, /MTG_SEALED_IMAGE_POINTER_APPLY_APPROVAL_ENV_V1/);
  assert.match(script,
    /select \* from\s+public\.sealed_product_set_active_image_release_v1/);
  assert.equal((script.match(/await client\.query\('commit'\)/g) ?? []).length, 1);
  assert.match(script, /sqlstate === '40001'/);
  assert.doesNotMatch(script, /storage\.from|fetch\(/);
  assert.doesNotMatch(script, /update public\.|delete from public\./i);
});
