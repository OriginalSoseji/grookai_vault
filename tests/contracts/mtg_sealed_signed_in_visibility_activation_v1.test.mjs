import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedVisibilityActivationCandidateV1,
  buildMtgSealedVisibilityActivationPlanV1,
  evaluateMtgSealedVisibilityActivationReadbackV1,
  expectedMtgSealedActiveEvidenceV1,
  MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_VERSION_V1,
  MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_VERSION_V1,
  validateMtgSealedVisibilityActivationPlanV1,
  validateMtgSealedVisibilityActivationPreflightV1,
  validateMtgSealedVisibilityRollbackProofV1,
} from '../../backend/pricing/mtg_sealed_signed_in_visibility_activation_v1.mjs';
import {
  MTG_SEALED_CANARY_IMAGE_MANIFEST_V1,
  MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
  MTG_SEALED_CANARY_OBJECT_PATH_V1,
  MTG_SEALED_CANARY_OBJECT_SHA256_V1,
  MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
} from '../../backend/pricing/mtg_sealed_signed_in_visibility_canary_v1.mjs';

const operator = fs.readFileSync(
  'scripts/audits/mtg_sealed_signed_in_visibility_activation_v1.mjs', 'utf8');
const webClient = fs.readFileSync(
  'apps/web/src/lib/sealed/mtgSealedClientV1.ts', 'utf8');
const flutterClient = fs.readFileSync(
  'lib/services/sealed/mtg_sealed_client_v1.dart', 'utf8');

function repository() {
  return { branch: 'agent/mtg-sealed-image-migration-promotion-v1',
    head_sha: 'a'.repeat(40), tracked_worktree_clean: true };
}

function preflight() {
  return {
    project_ref: 'ycdxbpibncqcchqiihfz',
    release_control: { game_key: 'mtg', release_status: 'hidden',
      release_version: 'SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1_MTG_HIDDEN',
      evidence: { default: 'fail_closed' }, activated_at: null,
      activated_by: null, updated_at: '2026-09-05 00:00:00+00' },
    catalog_visibility: 'signed_in',
    authority: { price_release_id: MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
      image_release_id: MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
      image_manifest: MTG_SEALED_CANARY_IMAGE_MANIFEST_V1,
      active_price_members: '2182', active_image_members: '2149' },
    candidate: { storage_bucket: 'user-card-images',
      object_path: MTG_SEALED_CANARY_OBJECT_PATH_V1,
      content_sha256: MTG_SEALED_CANARY_OBJECT_SHA256_V1,
      canonical_name: 'Kamigawa: Neon Dynasty - Theme Booster [Green]',
      structurally_authorized: true },
    hidden_rpc_rows: 0,
    hidden_signing_authorized: false,
    privileges: { anonymous_rpc_execute: false,
      authenticated_rpc_execute: true },
    clients: { web_enabled: false, flutter_enabled: false },
    protected_state: { price_pointer: MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
      image_pointer: MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
      mtg_sealed_control: { release_status: 'hidden' } },
  };
}

function rollbackProof() {
  return { transaction: { started: true, committed: false,
    rolled_back: true, updated_rows: 1, release_status: 'signed_in',
    authenticated_rpc_rows: 2144,
    authenticated_rpc_fingerprint: 'b'.repeat(64),
    signing_authorized: true, stale_cas_updated_rows: 0 },
  post_rollback: { release_control_exact: true,
    protected_state_exact: true, hidden_rpc_rows: 0,
    hidden_signing_authorized: false } };
}

function plan() {
  const candidatePlan = buildMtgSealedVisibilityActivationCandidateV1({
    repository: repository(), preflight: preflight() });
  return buildMtgSealedVisibilityActivationPlanV1({ candidatePlan,
    rollbackProof: rollbackProof() });
}

function readback(value) {
  return { release_control: { game_key: 'mtg', release_status: 'signed_in',
    release_version: value.active_row_projection.release_version,
    evidence: value.active_row_projection.evidence,
    activated_at: '2026-09-05 01:00:00+00',
    activated_by: value.active_row_projection.activated_by,
    updated_at: '2026-09-05 01:00:00+00' },
  authenticated: { rpc_rows: 1, selected_candidate_returned: true,
    rpc_status: 200, signer_status: 200, signed_image_status: 200,
    signed_image_sha256: MTG_SEALED_CANARY_OBJECT_SHA256_V1 },
  anonymous: { rpc_status: 401, rpc_rows: 0, signer_status: 401 },
  protected_state_exact_except_control: true,
  clients: { web_enabled: false, flutter_enabled: false },
  auth_user_absent: true, auth_reference_rows: 0, execution_error: null };
}

test('preflight requires exact hidden baseline, authority, and disabled clients', () => {
  assert.deepEqual(validateMtgSealedVisibilityActivationPreflightV1({
    repository: repository(), preflight: preflight() }), []);
  const drift = preflight();
  drift.release_control.release_version = 'unexpected';
  const findings = validateMtgSealedVisibilityActivationPreflightV1({
    repository: repository(), preflight: drift });
  assert.ok(findings.some((entry) =>
    entry.code === 'baseline_release_version_mismatch'));
});

test('activation plan is deterministic, evidence-bound, and rollback-ready', () => {
  const left = plan();
  const right = plan();
  assert.deepEqual(left, right);
  assert.match(left.activation_plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(left.rollback_plan.rollback_plan_fingerprint_sha256,
    /^[0-9a-f]{64}$/);
  assert.equal(left.active_row_projection.release_status, 'signed_in');
  assert.equal(left.active_row_projection.release_version,
    MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_VERSION_V1);
  assert.equal(left.active_row_projection.activated_by,
    MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_VERSION_V1);
  assert.equal(left.active_row_projection.evidence.
    activation_plan_fingerprint_sha256,
  left.activation_plan_fingerprint_sha256);
  assert.equal(left.boundaries.client_activations, 0);
  assert.equal(left.boundaries.anonymous_visibility, false);
  assert.equal(validateMtgSealedVisibilityActivationPlanV1(left).valid, true);
});

test('fingerprint and boundary tampering blocks the plan', () => {
  const value = plan();
  value.boundaries.storage_writes = 1;
  const result = validateMtgSealedVisibilityActivationPlanV1(value);
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((entry) => entry.code ===
    'activation_fingerprint_recalculation_mismatch'));
  assert.ok(result.findings.some((entry) => entry.code ===
    'storage_writes_not_zero'));
});

test('rollback proof requires visibility, corpus evidence, replay rejection, and exact restoration', () => {
  assert.equal(validateMtgSealedVisibilityRollbackProofV1(
    rollbackProof()).valid, true);
  for (const [mutate, code] of [
    [(value) => { value.transaction.authenticated_rpc_rows = 0; },
      'rollback_transaction_rpc_empty'],
    [(value) => { value.transaction.stale_cas_updated_rows = 1; },
      'rollback_transaction_replay_not_rejected'],
    [(value) => { value.post_rollback.protected_state_exact = false; },
      'post_rollback_protected_state_mismatch'],
  ]) {
    const value = rollbackProof();
    mutate(value);
    const result = validateMtgSealedVisibilityRollbackProofV1(value);
    assert.equal(result.valid, false);
    assert.ok(result.findings.some((entry) => entry.code === code));
  }
});

test('active evidence never authorizes clients or anonymous visibility', () => {
  const value = plan();
  const evidence = expectedMtgSealedActiveEvidenceV1(
    value.activation_plan_fingerprint_sha256, value.baseline_release_control);
  assert.equal(evidence.visibility, 'signed_in');
  assert.equal(evidence.anonymous_visibility, false);
  assert.equal(evidence.web_client_enabled, false);
  assert.equal(evidence.flutter_client_enabled, false);
});

test('durable readback requires real-auth success, anonymous denial, and no residue', () => {
  const value = plan();
  assert.equal(evaluateMtgSealedVisibilityActivationReadbackV1({ plan: value,
    transaction: { committed: true, updated_rows: 1 },
    readback: readback(value) }).valid, true);
  const bad = readback(value);
  bad.authenticated.signed_image_sha256 = '0'.repeat(64);
  bad.clients.web_enabled = true;
  const result = evaluateMtgSealedVisibilityActivationReadbackV1({ plan: value,
    transaction: { committed: true, updated_rows: 1 }, readback: bad });
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((entry) =>
    entry.code === 'signed_image_hash_mismatch'));
  assert.ok(result.findings.some((entry) => entry.code === 'web_client_enabled'));
});

test('operator enforces exact CAS, rollback, real-auth readback, and bounded writes', () => {
  assert.match(operator, /pg_advisory_xact_lock/);
  assert.match(operator, /evidence=\$6::jsonb/);
  assert.match(operator, /activated_at is not distinct from \$7::timestamptz/);
  assert.match(operator, /stale_cas_updated_rows/);
  assert.match(operator, /n_tup_ins\+n_tup_upd\+n_tup_del/);
  assert.doesNotMatch(operator, /n_tup_upd\+n_tup_hot_upd/);
  assert.match(operator, /rollback_transaction_proof\.json/);
  assert.match(operator, /createAuthFixture/);
  assert.match(operator, /deleteAuthFixture/);
  assert.match(operator, /verifyAuthResidue/);
  assert.match(operator, /automaticRollback = await restoreBaseline/);
  assert.match(operator, /Refusing to overwrite release control not owned/);
  assert.doesNotMatch(operator, /delete from public\./i);
  assert.doesNotMatch(operator, /storage\.objects\s+set/i);
});

test('web and Flutter remain hard-disabled throughout backend activation', () => {
  assert.match(webClient, /MTG_SEALED_CLIENT_V1_ENABLED = false as const/);
  assert.match(flutterClient, /kMtgSealedClientV1Enabled = false;/);
  assert.match(operator, /result\.clients = post\.clients/);
});
