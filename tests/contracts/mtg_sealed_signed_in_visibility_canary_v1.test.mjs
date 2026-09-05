import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedCanaryPlanV1,
  evaluateMtgSealedCanaryProofV1,
  MTG_SEALED_CANARY_IMAGE_MANIFEST_V1,
  MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
  MTG_SEALED_CANARY_OBJECT_PATH_V1,
  MTG_SEALED_CANARY_OBJECT_SHA256_V1,
  MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
  validateMtgSealedCanaryPreflightV1,
} from '../../backend/pricing/mtg_sealed_signed_in_visibility_canary_v1.mjs';

const operator = fs.readFileSync(
  'scripts/audits/mtg_sealed_signed_in_visibility_canary_v1.mjs', 'utf8');
const policy = fs.readFileSync(
  'backend/pricing/mtg_sealed_signed_in_visibility_canary_v1.mjs', 'utf8');
const webClient = fs.readFileSync(
  'apps/web/src/lib/sealed/mtgSealedClientV1.ts', 'utf8');
const flutterClient = fs.readFileSync(
  'lib/services/sealed/mtg_sealed_client_v1.dart', 'utf8');

function preflight() {
  return {
    project_ref: 'ycdxbpibncqcchqiihfz',
    release_control: { game_key: 'mtg', release_status: 'hidden',
      release_version: 'baseline', evidence: {}, activated_at: null,
      activated_by: null, updated_at: '2026-09-05 00:00:00+00' },
    catalog_visibility: 'signed_in',
    authority: { price_release_id: MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
      image_release_id: MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
      image_manifest: MTG_SEALED_CANARY_IMAGE_MANIFEST_V1,
      active_price_members: '2182', active_image_members: '2149' },
    candidate: { storage_bucket: 'user-card-images',
      object_path: MTG_SEALED_CANARY_OBJECT_PATH_V1,
      content_sha256: MTG_SEALED_CANARY_OBJECT_SHA256_V1,
      structurally_authorized: true },
    hidden_rpc_rows: 0,
    hidden_signing_authorized: false,
    privileges: { anonymous_rpc_execute: false,
      authenticated_rpc_execute: true },
    clients: { web_enabled: false, flutter_enabled: false },
    protected_state: { pointer: MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1 },
  };
}

function proof() {
  return {
    preflight_findings: [],
    auth_fixture: { created: true, signed_in: true },
    hidden: { authenticated_rpc_status: 200, authenticated_rpc_rows: 0,
      authenticated_signer_status: 404, anonymous_rpc_status: 401,
      anonymous_signer_status: 401 },
    active: { release_status: 'signed_in', authenticated_rpc_rows: 100,
      selected_candidate_returned: true, authenticated_signer_status: 200,
      signed_image_status: 200,
      signed_image_sha256: MTG_SEALED_CANARY_OBJECT_SHA256_V1,
      anonymous_rpc_status: 401, anonymous_rpc_rows: 0,
      anonymous_signer_status: 401 },
    rollback: { release_control_exact: true, protected_state_exact: true,
      post_restore_authenticated_rpc_rows: 0, auth_user_absent: true,
      auth_reference_rows: 0 },
    timing: { visibility_open_seconds: 2.5 },
  };
}

test('preflight locks exact image and price authority while sealed is hidden', () => {
  assert.deepEqual(validateMtgSealedCanaryPreflightV1(preflight()), []);
  for (const [mutate, finding] of [
    [(value) => { value.release_control.release_status = 'signed_in'; },
      'sealed_visibility_not_hidden'],
    [(value) => { value.authority.image_release_id = 'wrong'; },
      'image_release_mismatch'],
    [(value) => { value.candidate.structurally_authorized = false; },
      'candidate_not_structurally_authorized'],
    [(value) => { value.clients.web_enabled = true; },
      'web_client_not_disabled'],
  ]) {
    const value = preflight();
    mutate(value);
    assert.ok(validateMtgSealedCanaryPreflightV1(value)
      .some((entry) => entry.code === finding));
  }
});

test('plan permits only a transient control transition and disposable auth', () => {
  const plan = buildMtgSealedCanaryPlanV1({
    repository: { branch: 'agent/mtg-sealed-image-migration-promotion-v1',
      head_sha: 'a'.repeat(40), tracked_worktree_clean: true },
    preflight: preflight(),
  });
  assert.equal(plan.transition.from, 'hidden');
  assert.equal(plan.transition.temporary, 'signed_in');
  assert.equal(plan.transition.restore, 'exact_baseline_row');
  assert.equal(plan.boundaries.temporary_visibility_updates, 2);
  assert.equal(plan.boundaries.durable_visibility_change, false);
  assert.equal(plan.boundaries.storage_writes, 0);
  assert.equal(plan.boundaries.pricing_writes, 0);
  assert.equal(plan.boundaries.client_activations, 0);
  assert.match(plan.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
});

test('proof requires live authenticated reads, byte equality, and zero residue', () => {
  assert.equal(evaluateMtgSealedCanaryProofV1(proof()).passed, true);
  const cases = [
    [(value) => { value.active.authenticated_rpc_rows = 0; },
      'active_authenticated_rpc_empty'],
    [(value) => { value.active.signed_image_sha256 = '0'.repeat(64); },
      'signed_image_hash_mismatch'],
    [(value) => { value.rollback.release_control_exact = false; },
      'release_control_not_exactly_restored'],
    [(value) => { value.rollback.auth_reference_rows = 1; },
      'auth_reference_residue'],
    [(value) => { value.active.anonymous_rpc_status = 200; },
      'active_anonymous_rpc_not_denied'],
  ];
  for (const [mutate, finding] of cases) {
    const value = proof();
    mutate(value);
    const result = evaluateMtgSealedCanaryProofV1(value);
    assert.equal(result.passed, false);
    assert.ok(result.findings.some((entry) => entry.code === finding));
  }
});

test('operator freezes, restores, and sanitizes the disposable-auth canary', () => {
  assert.match(operator, /Release control changed after frozen preflight/);
  assert.match(operator, /Refusing to overwrite release control not owned/);
  assert.match(operator, /release_status='signed_in'/);
  assert.match(operator, /release_status=\$1,release_version=\$2,evidence=\$3/);
  assert.match(operator, /admin\.createUser/);
  assert.match(operator, /signInWithPassword/);
  assert.match(operator, /admin\.deleteUser/);
  assert.match(operator, /raw_user_id_persisted: false/);
  assert.match(operator, /signed_url_persisted: false/);
  assert.match(operator, /begin transaction read only/);
  assert.doesNotMatch(operator, /Promise\.all/);
});

test('the canary cannot expose disabled web or Flutter clients', () => {
  assert.match(webClient, /MTG_SEALED_CLIENT_V1_ENABLED = false as const/);
  assert.match(flutterClient, /kMtgSealedClientV1Enabled = false;/);
  assert.match(operator, /clients: clientBoundaries\(\)/);
  assert.match(policy, /client_activations: 0/);
});
