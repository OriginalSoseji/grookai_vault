import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedImagePointerCanaryPlanV1,
  evaluateMtgSealedImagePointerRollbackCanaryV1,
  validateMtgSealedImagePointerCanaryPlanV1,
} from '../../backend/pricing/mtg_sealed_image_pointer_canary_v1.mjs';

const script = fs.readFileSync(
  'scripts/audits/mtg_sealed_image_pointer_rollback_canary_v1.mjs', 'utf8');

function plan() {
  return buildMtgSealedImagePointerCanaryPlanV1({
    repository: {
      branch: 'agent/mtg-sealed-image-migration-promotion-v1',
      head_sha: 'a'.repeat(40),
      tracked_worktree_clean: true,
    },
    productionPreflight: { valid: true, pointer: null },
    sourceImageReleasePlanFingerprint: 'b'.repeat(64),
    sourceDurableApplyExecutionFingerprint: 'c'.repeat(64),
    releaseId: '86b207e6-4f73-5d9a-af40-864c47256c38',
    releaseManifestFingerprint: 'd'.repeat(64),
    sourcePriceReleaseId: '25626032-7d72-5542-a8e0-7a6532c2f776',
    changedBy: 'ff463879-026a-5ee2-8326-59e2d8b9b665',
    candidate: {
      storage_bucket: 'user-card-images',
      object_path: `sealed/mtg/sha256/ee/${'e'.repeat(64)}.jpg`,
      content_sha256: 'e'.repeat(64),
    },
  });
}

function validProof() {
  const value = plan();
  return {
    plan: value,
    preflight: { valid: true },
    transaction_local_preflight: { valid: true },
    transaction: { started: true, committed: false, rolled_back: true },
    transaction_pointer_readback: {
      game_key: 'mtg',
      image_release_id: value.target_image_release_id,
      previous_image_release_id: null,
      pointer_contract_version: 'SEALED_PRODUCT_IMAGE_RELEASE_POINTER_V1',
      changed_by: value.changed_by,
    },
    release_price_binding_valid: true,
    candidate_structural_eligibility_with_pointer: true,
    visibility: { catalog_visible: true, sealed_visible: false },
    signing_authorized_before_pointer: false,
    signing_authorized_with_hidden_pointer: false,
    rpc_v3_deployed: false,
    write_attribution: [{
      table_name: 'sealed_product_image_release_pointer',
      inserted: 1,
      updated: 0,
      deleted: 0,
      hot_updated: 0,
    }],
    post_rollback: {
      transaction_read_only: true,
      pointer_is_null: true,
      release_unchanged: true,
      protected_boundaries_unchanged: true,
      security_boundary_unchanged: true,
      full_preflight_valid: true,
    },
  };
}

test('pointer rollback plan is deterministic, exact, and fingerprinted', () => {
  const left = plan();
  const right = plan();
  assert.equal(left.canary_fingerprint_sha256,
    right.canary_fingerprint_sha256);
  assert.equal(left.mode, 'production_rollback_only');
  assert.equal(left.expected_current_image_release_id, null);
  assert.equal(left.boundaries.transient_pointer_inserts, 1);
  assert.equal(left.boundaries.durable_database_writes, 0);
  assert.deepEqual(validateMtgSealedImagePointerCanaryPlanV1(left), {
    valid: true,
    findings: [],
  });
});

test('plan fails closed on pointer, authority, candidate, and boundary drift', () => {
  const value = plan();
  value.expected_current_image_release_id = value.target_image_release_id;
  value.source_image_release_plan_fingerprint_sha256 = 'bad';
  value.selected_signing_candidate.object_path = 'sealed/one_piece/object.jpg';
  value.boundaries.visibility_writes = 1;
  const result = validateMtgSealedImagePointerCanaryPlanV1(value);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('fingerprint_mismatch'));
  assert.ok(result.findings.includes('expected_pointer_not_null'));
  assert.ok(result.findings.includes('source_authority_invalid'));
  assert.ok(result.findings.includes('signing_candidate_invalid'));
  assert.ok(result.findings.includes('boundary_overclaim'));
});

test('exact rollback proof passes at the hidden signing boundary', () => {
  assert.deepEqual(evaluateMtgSealedImagePointerRollbackCanaryV1(
    validProof()), { valid: true, findings: [] });
});

test('proof fails on signing, visibility, pointer, and rollback residue', () => {
  const proof = validProof();
  proof.signing_authorized_with_hidden_pointer = true;
  proof.visibility.sealed_visible = true;
  proof.transaction_pointer_readback.previous_image_release_id =
    proof.plan.target_image_release_id;
  proof.post_rollback.pointer_is_null = false;
  const result = evaluateMtgSealedImagePointerRollbackCanaryV1(proof);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('transaction_pointer_readback_mismatch'));
  assert.ok(result.findings.includes('visibility_boundary_mismatch'));
  assert.ok(result.findings.includes('signing_boundary_mismatch'));
  assert.ok(result.findings.includes('post_rollback_pointer_residue'));
});

test('proof fails on extra writes, durable commit, or RPC deployment drift', () => {
  const proof = validProof();
  proof.transaction.committed = true;
  proof.rpc_v3_deployed = true;
  proof.write_attribution.push({ table_name: 'sealed_product_variants',
    inserted: 0, updated: 1, deleted: 0, hot_updated: 0 });
  const result = evaluateMtgSealedImagePointerRollbackCanaryV1(proof);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('transaction_state_invalid'));
  assert.ok(result.findings.includes('rpc_v3_state_mismatch'));
  assert.ok(result.findings.includes('write_attribution_mismatch'));
});

test('operator is rollback-only and exercises full evidence boundaries', () => {
  assert.match(script, /--execute-rollback-canary/);
  assert.match(script, /tracked_worktree_clean/);
  assert.match(script, /begin transaction isolation level repeatable read/);
  assert.match(script,
    /select \* from\s+public\.sealed_product_set_active_image_release_v1/);
  assert.match(script, /mtg_sealed_image_object_signing_authorized_v1/);
  assert.match(script, /assertion\.assertion_state='exact_verified'/);
  assert.match(script, /mapping\.source_provider='tcgplayer'/);
  assert.match(script, /variant\.language_code='en'/);
  assert.match(script, /await client\.query\('rollback'\)/);
  assert.doesNotMatch(script, /await client\.query\('commit'\)/);
  assert.doesNotMatch(script,
    /select \* from\s+public\.get_active_sealed_product_pricing_v3/);
  assert.doesNotMatch(script, /storage\.from|fetch\(/);
});
