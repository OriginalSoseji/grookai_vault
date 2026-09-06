import crypto from 'node:crypto';

export const MTG_SEALED_SIGNED_IN_VISIBILITY_CANARY_VERSION_V1 =
  'MTG_SEALED_SIGNED_IN_VISIBILITY_CANARY_V1';
export const MTG_SEALED_CANARY_PROJECT_REF_V1 =
  'ycdxbpibncqcchqiihfz';
export const MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1 =
  '25626032-7d72-5542-a8e0-7a6532c2f776';
export const MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1 =
  '86b207e6-4f73-5d9a-af40-864c47256c38';
export const MTG_SEALED_CANARY_IMAGE_MANIFEST_V1 =
  '7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2';
export const MTG_SEALED_CANARY_BUCKET_V1 = 'user-card-images';
export const MTG_SEALED_CANARY_OBJECT_PATH_V1 =
  'sealed/mtg/sha256/e9/e944f88ee4a707c018793b9069ff9625ddff2c2d1d30d31ea2219308ffd503cd.jpg';
export const MTG_SEALED_CANARY_OBJECT_SHA256_V1 =
  'e944f88ee4a707c018793b9069ff9625ddff2c2d1d30d31ea2219308ffd503cd';

export function stableMtgSealedCanaryV1(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableMtgSealedCanaryV1).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableMtgSealedCanaryV1(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashMtgSealedCanaryV1(value) {
  const input = Buffer.isBuffer(value) || typeof value === 'string'
    ? value
    : stableMtgSealedCanaryV1(value);
  return crypto.createHash('sha256').update(input).digest('hex');
}

function finding(findings, condition, code, actual, expected) {
  if (!condition) findings.push({ code, actual, expected });
}

export function validateMtgSealedCanaryPreflightV1(preflight) {
  const findings = [];
  finding(findings, preflight?.project_ref === MTG_SEALED_CANARY_PROJECT_REF_V1,
    'project_ref_mismatch', preflight?.project_ref ?? null,
    MTG_SEALED_CANARY_PROJECT_REF_V1);
  finding(findings, preflight?.release_control?.release_status === 'hidden',
    'sealed_visibility_not_hidden',
    preflight?.release_control?.release_status ?? null, 'hidden');
  finding(findings, preflight?.catalog_visibility === 'signed_in',
    'catalog_visibility_not_signed_in', preflight?.catalog_visibility ?? null,
    'signed_in');
  finding(findings,
    preflight?.authority?.price_release_id ===
      MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
    'price_release_mismatch', preflight?.authority?.price_release_id ?? null,
    MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1);
  finding(findings,
    preflight?.authority?.image_release_id ===
      MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
    'image_release_mismatch', preflight?.authority?.image_release_id ?? null,
    MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1);
  finding(findings,
    preflight?.authority?.image_manifest ===
      MTG_SEALED_CANARY_IMAGE_MANIFEST_V1,
    'image_manifest_mismatch', preflight?.authority?.image_manifest ?? null,
    MTG_SEALED_CANARY_IMAGE_MANIFEST_V1);
  finding(findings, Number(preflight?.authority?.active_price_members) === 2182,
    'active_price_member_count_mismatch',
    preflight?.authority?.active_price_members ?? null, 2182);
  finding(findings, Number(preflight?.authority?.active_image_members) === 2149,
    'active_image_member_count_mismatch',
    preflight?.authority?.active_image_members ?? null, 2149);
  finding(findings, preflight?.candidate?.storage_bucket ===
      MTG_SEALED_CANARY_BUCKET_V1,
    'candidate_bucket_mismatch', preflight?.candidate?.storage_bucket ?? null,
    MTG_SEALED_CANARY_BUCKET_V1);
  finding(findings, preflight?.candidate?.object_path ===
      MTG_SEALED_CANARY_OBJECT_PATH_V1,
    'candidate_path_mismatch', preflight?.candidate?.object_path ?? null,
    MTG_SEALED_CANARY_OBJECT_PATH_V1);
  finding(findings, preflight?.candidate?.content_sha256 ===
      MTG_SEALED_CANARY_OBJECT_SHA256_V1,
    'candidate_hash_mismatch', preflight?.candidate?.content_sha256 ?? null,
    MTG_SEALED_CANARY_OBJECT_SHA256_V1);
  finding(findings, preflight?.candidate?.structurally_authorized === true,
    'candidate_not_structurally_authorized',
    preflight?.candidate?.structurally_authorized ?? null, true);
  finding(findings, Number(preflight?.hidden_rpc_rows) === 0,
    'hidden_rpc_leak', preflight?.hidden_rpc_rows ?? null, 0);
  finding(findings, preflight?.hidden_signing_authorized === false,
    'hidden_signing_leak', preflight?.hidden_signing_authorized ?? null, false);
  finding(findings, preflight?.privileges?.anonymous_rpc_execute === false,
    'anonymous_rpc_execute_not_denied',
    preflight?.privileges?.anonymous_rpc_execute ?? null, false);
  finding(findings, preflight?.privileges?.authenticated_rpc_execute === true,
    'authenticated_rpc_execute_missing',
    preflight?.privileges?.authenticated_rpc_execute ?? null, true);
  finding(findings, preflight?.clients?.web_enabled === false,
    'web_client_not_disabled', preflight?.clients?.web_enabled ?? null, false);
  finding(findings, preflight?.clients?.flutter_enabled === false,
    'flutter_client_not_disabled',
    preflight?.clients?.flutter_enabled ?? null, false);
  return findings;
}

export function buildMtgSealedCanaryPlanV1({ repository, preflight }) {
  const findings = validateMtgSealedCanaryPreflightV1(preflight);
  if (findings.length > 0) {
    throw new Error(`Canary preflight invalid: ${findings.map((entry) =>
      entry.code).join(',')}`);
  }
  const plan = {
    canary_version: MTG_SEALED_SIGNED_IN_VISIBILITY_CANARY_VERSION_V1,
    repository: {
      branch: repository.branch,
      head_sha: repository.head_sha,
      tracked_worktree_clean: repository.tracked_worktree_clean,
    },
    project_ref: MTG_SEALED_CANARY_PROJECT_REF_V1,
    baseline_release_control: preflight.release_control,
    baseline_release_control_sha256:
      hashMtgSealedCanaryV1(preflight.release_control),
    protected_state_sha256: hashMtgSealedCanaryV1(preflight.protected_state),
    authority: preflight.authority,
    selected_candidate: preflight.candidate,
    transition: {
      from: 'hidden',
      temporary: 'signed_in',
      restore: 'exact_baseline_row',
      maximum_open_seconds: 300,
    },
    authentication_fixture: {
      type: 'disposable_confirmed_supabase_auth_user',
      email_persisted_in_artifacts: false,
      password_persisted_in_artifacts: false,
      raw_user_id_persisted_in_artifacts: false,
      delete_and_verify_absent: true,
    },
    required_proofs: {
      authenticated_rpc_v3_rows: '>=1',
      selected_candidate_in_rpc_v3: true,
      authenticated_signer_status: 200,
      signed_image_sha256: MTG_SEALED_CANARY_OBJECT_SHA256_V1,
      anonymous_rpc_rows: 0,
      anonymous_signer_status: 401,
      post_restore_authenticated_rpc_rows: 0,
    },
    boundaries: {
      temporary_visibility_updates: 2,
      durable_visibility_change: false,
      auth_fixture_create_delete_only: true,
      pricing_writes: 0,
      pointer_writes: 0,
      storage_writes: 0,
      vault_writes: 0,
      client_activations: 0,
      cross_game_writes: 0,
      anonymous_visibility: false,
    },
  };
  return {
    ...plan,
    plan_fingerprint_sha256: hashMtgSealedCanaryV1(plan),
  };
}

export function evaluateMtgSealedCanaryProofV1(proof) {
  const findings = [];
  finding(findings, proof?.preflight_findings?.length === 0,
    'preflight_failed', proof?.preflight_findings ?? null, []);
  finding(findings, proof?.auth_fixture?.created === true,
    'auth_fixture_not_created', proof?.auth_fixture?.created ?? null, true);
  finding(findings, proof?.auth_fixture?.signed_in === true,
    'auth_fixture_not_signed_in', proof?.auth_fixture?.signed_in ?? null, true);
  finding(findings, Number(proof?.hidden?.authenticated_rpc_rows) === 0,
    'hidden_authenticated_rpc_leak',
    proof?.hidden?.authenticated_rpc_rows ?? null, 0);
  finding(findings, proof?.hidden?.authenticated_rpc_status === 200,
    'hidden_authenticated_rpc_request_failed',
    proof?.hidden?.authenticated_rpc_status ?? null, 200);
  finding(findings, proof?.hidden?.authenticated_signer_status === 404,
    'hidden_authenticated_signer_not_denied',
    proof?.hidden?.authenticated_signer_status ?? null, 404);
  finding(findings, proof?.hidden?.anonymous_signer_status === 401,
    'hidden_anonymous_signer_not_denied',
    proof?.hidden?.anonymous_signer_status ?? null, 401);
  finding(findings, proof?.hidden?.anonymous_rpc_status !== 200,
    'hidden_anonymous_rpc_not_denied',
    proof?.hidden?.anonymous_rpc_status ?? null, 'non-200 denial');
  finding(findings, proof?.active?.release_status === 'signed_in',
    'canary_not_activated', proof?.active?.release_status ?? null, 'signed_in');
  finding(findings, Number(proof?.active?.authenticated_rpc_rows) >= 1,
    'active_authenticated_rpc_empty',
    proof?.active?.authenticated_rpc_rows ?? null, '>=1');
  finding(findings, proof?.active?.selected_candidate_returned === true,
    'selected_candidate_not_returned',
    proof?.active?.selected_candidate_returned ?? null, true);
  finding(findings, proof?.active?.authenticated_signer_status === 200,
    'active_authenticated_signer_failed',
    proof?.active?.authenticated_signer_status ?? null, 200);
  finding(findings, proof?.active?.signed_image_status === 200,
    'signed_image_readback_failed', proof?.active?.signed_image_status ?? null,
    200);
  finding(findings, proof?.active?.signed_image_sha256 ===
      MTG_SEALED_CANARY_OBJECT_SHA256_V1,
    'signed_image_hash_mismatch', proof?.active?.signed_image_sha256 ?? null,
    MTG_SEALED_CANARY_OBJECT_SHA256_V1);
  finding(findings, Number(proof?.active?.anonymous_rpc_rows) === 0,
    'active_anonymous_rpc_leak', proof?.active?.anonymous_rpc_rows ?? null, 0);
  finding(findings, proof?.active?.anonymous_rpc_status !== 200,
    'active_anonymous_rpc_not_denied',
    proof?.active?.anonymous_rpc_status ?? null, 'non-200 denial');
  finding(findings, proof?.active?.anonymous_signer_status === 401,
    'active_anonymous_signer_not_denied',
    proof?.active?.anonymous_signer_status ?? null, 401);
  finding(findings, proof?.rollback?.release_control_exact === true,
    'release_control_not_exactly_restored',
    proof?.rollback?.release_control_exact ?? null, true);
  finding(findings, proof?.rollback?.protected_state_exact === true,
    'protected_state_changed', proof?.rollback?.protected_state_exact ?? null,
    true);
  finding(findings,
    Number(proof?.rollback?.post_restore_authenticated_rpc_rows) === 0,
    'post_restore_rpc_leak',
    proof?.rollback?.post_restore_authenticated_rpc_rows ?? null, 0);
  finding(findings, proof?.rollback?.auth_user_absent === true,
    'auth_user_residue', proof?.rollback?.auth_user_absent ?? null, true);
  finding(findings, Number(proof?.rollback?.auth_reference_rows) === 0,
    'auth_reference_residue', proof?.rollback?.auth_reference_rows ?? null, 0);
  finding(findings, Number(proof?.timing?.visibility_open_seconds) <= 300,
    'visibility_window_exceeded',
    proof?.timing?.visibility_open_seconds ?? null, '<=300');
  return {
    status: findings.length === 0
      ? 'mtg_sealed_signed_in_visibility_canary_passed_zero_residue'
      : 'mtg_sealed_signed_in_visibility_canary_failed',
    passed: findings.length === 0,
    findings,
  };
}
