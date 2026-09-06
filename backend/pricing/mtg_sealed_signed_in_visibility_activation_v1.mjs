import crypto from 'node:crypto';

import {
  MTG_SEALED_CANARY_IMAGE_MANIFEST_V1,
  MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
  MTG_SEALED_CANARY_OBJECT_SHA256_V1,
  MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
  MTG_SEALED_CANARY_PROJECT_REF_V1,
  stableMtgSealedCanaryV1,
  validateMtgSealedCanaryPreflightV1,
} from './mtg_sealed_signed_in_visibility_canary_v1.mjs';

export const MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_VERSION_V1 =
  'MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_V1';
export const MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_VERSION_V1 =
  'MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_V1';
export const MTG_SEALED_SIGNED_IN_VISIBILITY_ROLLBACK_VERSION_V1 =
  'MTG_SEALED_SIGNED_IN_VISIBILITY_ROLLBACK_V1';
export const MTG_SEALED_SIGNED_IN_VISIBILITY_APPROVAL_ENV_V1 =
  'MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_APPROVED_V1';
export const MTG_SEALED_SIGNED_IN_VISIBILITY_ROLLBACK_ENV_V1 =
  'MTG_SEALED_SIGNED_IN_VISIBILITY_ROLLBACK_APPROVED_V1';
export const MTG_SEALED_SOURCE_CANARY_PLAN_FINGERPRINT_V1 =
  'a3facd708a9c0fb6f29d856e12f21b6ba1195ee51743064b0bd7c5e34a50978f';
export const MTG_SEALED_SOURCE_CANARY_PRODUCER_SHA_V1 =
  '33496cf9297bbed16e7d6df95ea69c03b317acf7';

export function hashMtgSealedVisibilityActivationV1(value) {
  const input = Buffer.isBuffer(value) || typeof value === 'string'
    ? value
    : stableMtgSealedCanaryV1(value);
  return crypto.createHash('sha256').update(input).digest('hex');
}

function add(findings, condition, code, actual, expected) {
  if (!condition) findings.push({ code, actual, expected });
}

function isSha(value, length) {
  return new RegExp(`^[0-9a-f]{${length}}$`).test(value ?? '');
}

export function expectedMtgSealedActiveEvidenceV1(planFingerprint, baseline) {
  return {
    activation_plan_fingerprint_sha256: planFingerprint,
    baseline_release_control_sha256:
      hashMtgSealedVisibilityActivationV1(baseline),
    source_canary_plan_fingerprint_sha256:
      MTG_SEALED_SOURCE_CANARY_PLAN_FINGERPRINT_V1,
    source_canary_producer_sha: MTG_SEALED_SOURCE_CANARY_PRODUCER_SHA_V1,
    price_release_id: MTG_SEALED_CANARY_PRICE_RELEASE_ID_V1,
    image_release_id: MTG_SEALED_CANARY_IMAGE_RELEASE_ID_V1,
    image_manifest_fingerprint_sha256:
      MTG_SEALED_CANARY_IMAGE_MANIFEST_V1,
    visibility: 'signed_in',
    anonymous_visibility: false,
    web_client_enabled: false,
    flutter_client_enabled: false,
  };
}

export function validateMtgSealedVisibilityActivationPreflightV1({
  repository,
  preflight,
}) {
  const findings = [...validateMtgSealedCanaryPreflightV1(preflight)];
  add(findings,
    repository?.branch === 'agent/mtg-sealed-image-migration-promotion-v1',
    'branch_mismatch', repository?.branch ?? null,
    'agent/mtg-sealed-image-migration-promotion-v1');
  add(findings, isSha(repository?.head_sha, 40), 'producer_sha_invalid',
    repository?.head_sha ?? null, '40-character lowercase SHA');
  add(findings, repository?.tracked_worktree_clean === true,
    'tracked_worktree_dirty', repository?.tracked_worktree_clean ?? null, true);
  add(findings, preflight?.project_ref === MTG_SEALED_CANARY_PROJECT_REF_V1,
    'production_project_mismatch', preflight?.project_ref ?? null,
    MTG_SEALED_CANARY_PROJECT_REF_V1);
  add(findings, preflight?.release_control?.game_key === 'mtg',
    'release_control_game_mismatch',
    preflight?.release_control?.game_key ?? null, 'mtg');
  add(findings,
    preflight?.release_control?.release_version ===
      'SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1_MTG_HIDDEN',
    'baseline_release_version_mismatch',
    preflight?.release_control?.release_version ?? null,
    'SEALED_PRODUCT_VISIBILITY_BOUNDARY_V1_MTG_HIDDEN');
  add(findings, preflight?.release_control?.activated_at == null,
    'baseline_activation_time_not_null',
    preflight?.release_control?.activated_at ?? null, null);
  add(findings, preflight?.release_control?.activated_by == null,
    'baseline_activator_not_null',
    preflight?.release_control?.activated_by ?? null, null);
  return findings;
}

export function buildMtgSealedVisibilityActivationCandidateV1({
  repository,
  preflight,
}) {
  const findings = validateMtgSealedVisibilityActivationPreflightV1({
    repository,
    preflight,
  });
  if (findings.length > 0) {
    throw new Error(`Activation preflight invalid: ${findings.map((entry) =>
      entry.code).join(',')}`);
  }
  const candidate = {
    activation_version: MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_VERSION_V1,
    repository,
    project_ref: MTG_SEALED_CANARY_PROJECT_REF_V1,
    source_canary: {
      producer_sha: MTG_SEALED_SOURCE_CANARY_PRODUCER_SHA_V1,
      plan_fingerprint_sha256:
        MTG_SEALED_SOURCE_CANARY_PLAN_FINGERPRINT_V1,
      authenticated_rpc_rows: 1,
      signed_image_sha256: MTG_SEALED_CANARY_OBJECT_SHA256_V1,
      release_control_exactly_restored: true,
      auth_residue_rows: 0,
    },
    baseline_release_control: preflight.release_control,
    baseline_release_control_sha256:
      hashMtgSealedVisibilityActivationV1(preflight.release_control),
    protected_state_sha256:
      hashMtgSealedVisibilityActivationV1(preflight.protected_state),
    authority: preflight.authority,
    selected_candidate: preflight.candidate,
    proposed_transition: {
      game_key: 'mtg',
      from: 'hidden',
      to: 'signed_in',
      release_version:
        MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_VERSION_V1,
      maximum_rows: 1,
      compare_and_swap: 'exact_complete_baseline_row',
    },
    boundaries: {
      release_control_updates: 1,
      catalog_writes: 0,
      price_release_or_pointer_writes: 0,
      image_release_or_pointer_writes: 0,
      storage_writes: 0,
      vault_writes: 0,
      client_activations: 0,
      cross_game_writes: 0,
      anonymous_visibility: false,
    },
  };
  return {
    ...candidate,
    candidate_plan_fingerprint_sha256:
      hashMtgSealedVisibilityActivationV1(candidate),
  };
}

export function validateMtgSealedVisibilityRollbackProofV1(proof) {
  const findings = [];
  add(findings, proof?.transaction?.started === true,
    'rollback_transaction_not_started', proof?.transaction?.started ?? null,
    true);
  add(findings, proof?.transaction?.committed === false,
    'rollback_transaction_committed', proof?.transaction?.committed ?? null,
    false);
  add(findings, proof?.transaction?.rolled_back === true,
    'rollback_transaction_not_rolled_back',
    proof?.transaction?.rolled_back ?? null, true);
  add(findings, Number(proof?.transaction?.updated_rows) === 1,
    'rollback_update_count_mismatch',
    proof?.transaction?.updated_rows ?? null, 1);
  add(findings, proof?.transaction?.release_status === 'signed_in',
    'rollback_transaction_not_signed_in',
    proof?.transaction?.release_status ?? null, 'signed_in');
  add(findings, Number(proof?.transaction?.authenticated_rpc_rows) > 0,
    'rollback_transaction_rpc_empty',
    proof?.transaction?.authenticated_rpc_rows ?? null, '>0');
  add(findings, isSha(proof?.transaction?.authenticated_rpc_fingerprint, 64),
    'rollback_transaction_rpc_fingerprint_invalid',
    proof?.transaction?.authenticated_rpc_fingerprint ?? null,
    '64-character SHA-256');
  add(findings, proof?.transaction?.signing_authorized === true,
    'rollback_transaction_signing_not_authorized',
    proof?.transaction?.signing_authorized ?? null, true);
  add(findings, proof?.transaction?.stale_cas_updated_rows === 0,
    'rollback_transaction_replay_not_rejected',
    proof?.transaction?.stale_cas_updated_rows ?? null, 0);
  add(findings, proof?.post_rollback?.release_control_exact === true,
    'post_rollback_release_control_mismatch',
    proof?.post_rollback?.release_control_exact ?? null, true);
  add(findings, proof?.post_rollback?.protected_state_exact === true,
    'post_rollback_protected_state_mismatch',
    proof?.post_rollback?.protected_state_exact ?? null, true);
  add(findings, Number(proof?.post_rollback?.hidden_rpc_rows) === 0,
    'post_rollback_rpc_leak', proof?.post_rollback?.hidden_rpc_rows ?? null, 0);
  add(findings, proof?.post_rollback?.hidden_signing_authorized === false,
    'post_rollback_signing_leak',
    proof?.post_rollback?.hidden_signing_authorized ?? null, false);
  return {
    valid: findings.length === 0,
    status: findings.length === 0
      ? 'durable_visibility_rollback_proven_no_writes'
      : 'durable_visibility_rollback_proof_failed',
    findings,
  };
}

export function buildMtgSealedVisibilityActivationPlanV1({
  candidatePlan,
  rollbackProof,
}) {
  const proofValidation = validateMtgSealedVisibilityRollbackProofV1(
    rollbackProof);
  if (!proofValidation.valid) {
    throw new Error(`Rollback proof invalid: ${proofValidation.findings.map(
      (entry) => entry.code).join(',')}`);
  }
  const core = {
    ...candidatePlan,
    rollback_proof: {
      status: proofValidation.status,
      authenticated_rpc_rows:
        rollbackProof.transaction.authenticated_rpc_rows,
      authenticated_rpc_fingerprint:
        rollbackProof.transaction.authenticated_rpc_fingerprint,
      release_control_exact: true,
      protected_state_exact: true,
      stale_cas_rejected: true,
    },
  };
  const planFingerprint = hashMtgSealedVisibilityActivationV1(core);
  const activeEvidence = expectedMtgSealedActiveEvidenceV1(planFingerprint,
    candidatePlan.baseline_release_control);
  const plan = {
    ...core,
    active_row_projection: {
      game_key: 'mtg',
      release_status: 'signed_in',
      release_version:
        MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_VERSION_V1,
      evidence: activeEvidence,
      activated_at: 'database_clock_timestamp',
      activated_by:
        MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_VERSION_V1,
      updated_at: 'database_clock_timestamp',
    },
    activation_plan_fingerprint_sha256: planFingerprint,
  };
  const rollbackCore = {
    rollback_version: MTG_SEALED_SIGNED_IN_VISIBILITY_ROLLBACK_VERSION_V1,
    activation_plan_fingerprint_sha256: planFingerprint,
    expected_active_projection: plan.active_row_projection,
    restore_release_control: candidatePlan.baseline_release_control,
    restore_release_control_sha256:
      candidatePlan.baseline_release_control_sha256,
    maximum_rows: 1,
    compare_and_swap: 'exact_activation_evidence_and_release_version',
    boundaries: candidatePlan.boundaries,
  };
  return {
    ...plan,
    activation_guard_token: hashMtgSealedVisibilityActivationV1({
      action: 'activate_mtg_sealed_signed_in_visibility',
      plan_fingerprint_sha256: planFingerprint,
    }),
    rollback_plan: {
      ...rollbackCore,
      rollback_plan_fingerprint_sha256:
        hashMtgSealedVisibilityActivationV1(rollbackCore),
    },
  };
}

export function validateMtgSealedVisibilityActivationPlanV1(plan) {
  const findings = [];
  const fingerprint = plan?.activation_plan_fingerprint_sha256;
  add(findings, isSha(fingerprint, 64), 'activation_fingerprint_invalid',
    fingerprint ?? null, '64-character SHA-256');
  const { active_row_projection: ignoredProjection,
    activation_plan_fingerprint_sha256: ignoredFingerprint,
    activation_guard_token: ignoredGuard, rollback_plan: ignoredRollback,
    ...fingerprintCore } = plan ?? {};
  add(findings, hashMtgSealedVisibilityActivationV1(fingerprintCore) ===
      fingerprint,
  'activation_fingerprint_recalculation_mismatch', fingerprint ?? null,
  hashMtgSealedVisibilityActivationV1(fingerprintCore));
  add(findings,
    plan?.active_row_projection?.evidence?.
      activation_plan_fingerprint_sha256 === fingerprint,
    'active_evidence_fingerprint_mismatch',
    plan?.active_row_projection?.evidence?.
      activation_plan_fingerprint_sha256 ?? null, fingerprint ?? null);
  add(findings,
    plan?.active_row_projection?.release_status === 'signed_in',
    'active_projection_not_signed_in',
    plan?.active_row_projection?.release_status ?? null, 'signed_in');
  add(findings, plan?.boundaries?.release_control_updates === 1,
    'release_control_boundary_mismatch',
    plan?.boundaries?.release_control_updates ?? null, 1);
  for (const field of ['catalog_writes', 'price_release_or_pointer_writes',
    'image_release_or_pointer_writes', 'storage_writes', 'vault_writes',
    'client_activations', 'cross_game_writes']) {
    add(findings, Number(plan?.boundaries?.[field]) === 0,
      `${field}_not_zero`, plan?.boundaries?.[field] ?? null, 0);
  }
  add(findings, plan?.boundaries?.anonymous_visibility === false,
    'anonymous_visibility_not_false',
    plan?.boundaries?.anonymous_visibility ?? null, false);
  add(findings, isSha(plan?.rollback_plan?.rollback_plan_fingerprint_sha256,
    64), 'rollback_fingerprint_invalid',
    plan?.rollback_plan?.rollback_plan_fingerprint_sha256 ?? null,
    '64-character SHA-256');
  const { rollback_plan_fingerprint_sha256: ignoredRollbackFingerprint,
    ...rollbackCore } = plan?.rollback_plan ?? {};
  add(findings, hashMtgSealedVisibilityActivationV1(rollbackCore) ===
      plan?.rollback_plan?.rollback_plan_fingerprint_sha256,
  'rollback_fingerprint_recalculation_mismatch',
  plan?.rollback_plan?.rollback_plan_fingerprint_sha256 ?? null,
  hashMtgSealedVisibilityActivationV1(rollbackCore));
  return { valid: findings.length === 0, findings };
}

export function evaluateMtgSealedVisibilityActivationReadbackV1({
  plan,
  transaction,
  readback,
}) {
  const findings = [];
  const expected = plan?.active_row_projection;
  add(findings, transaction?.committed === true,
    'activation_not_committed', transaction?.committed ?? null, true);
  add(findings, Number(transaction?.updated_rows) === 1,
    'activation_update_count_mismatch', transaction?.updated_rows ?? null, 1);
  add(findings, readback?.release_control?.release_status === 'signed_in',
    'release_control_not_signed_in',
    readback?.release_control?.release_status ?? null, 'signed_in');
  add(findings,
    readback?.release_control?.release_version === expected?.release_version,
    'release_version_mismatch',
    readback?.release_control?.release_version ?? null,
    expected?.release_version ?? null);
  add(findings,
    stableMtgSealedCanaryV1(readback?.release_control?.evidence) ===
      stableMtgSealedCanaryV1(expected?.evidence),
    'activation_evidence_mismatch', readback?.release_control?.evidence ?? null,
    expected?.evidence ?? null);
  add(findings, readback?.release_control?.activated_at != null,
    'activation_time_missing', readback?.release_control?.activated_at ?? null,
    'non-null');
  add(findings,
    readback?.release_control?.activated_by === expected?.activated_by,
    'activator_mismatch', readback?.release_control?.activated_by ?? null,
    expected?.activated_by ?? null);
  add(findings, Number(readback?.authenticated?.rpc_rows) > 0,
    'authenticated_rpc_empty', readback?.authenticated?.rpc_rows ?? null,
    '>0');
  add(findings, readback?.authenticated?.rpc_status === 200,
    'authenticated_rpc_failed',
    readback?.authenticated?.rpc_status ?? null, 200);
  add(findings, readback?.authenticated?.selected_candidate_returned === true,
    'selected_candidate_missing',
    readback?.authenticated?.selected_candidate_returned ?? null, true);
  add(findings, readback?.authenticated?.signer_status === 200,
    'authenticated_signer_failed',
    readback?.authenticated?.signer_status ?? null, 200);
  add(findings, readback?.authenticated?.signed_image_status === 200,
    'signed_image_readback_failed',
    readback?.authenticated?.signed_image_status ?? null, 200);
  add(findings,
    readback?.authenticated?.signed_image_sha256 ===
      MTG_SEALED_CANARY_OBJECT_SHA256_V1,
    'signed_image_hash_mismatch',
    readback?.authenticated?.signed_image_sha256 ?? null,
    MTG_SEALED_CANARY_OBJECT_SHA256_V1);
  add(findings, Number(readback?.anonymous?.rpc_rows) === 0,
    'anonymous_rpc_leak', readback?.anonymous?.rpc_rows ?? null, 0);
  add(findings, readback?.anonymous?.rpc_status !== 200,
    'anonymous_rpc_not_denied', readback?.anonymous?.rpc_status ?? null,
    'non-200');
  add(findings, readback?.anonymous?.signer_status === 401,
    'anonymous_signer_not_denied',
    readback?.anonymous?.signer_status ?? null, 401);
  add(findings, readback?.protected_state_exact_except_control === true,
    'protected_state_changed',
    readback?.protected_state_exact_except_control ?? null, true);
  add(findings, readback?.clients?.web_enabled === false,
    'web_client_enabled', readback?.clients?.web_enabled ?? null, false);
  add(findings, readback?.clients?.flutter_enabled === false,
    'flutter_client_enabled', readback?.clients?.flutter_enabled ?? null, false);
  add(findings, readback?.auth_user_absent === true,
    'auth_user_residue', readback?.auth_user_absent ?? null, true);
  add(findings, Number(readback?.auth_reference_rows) === 0,
    'auth_reference_residue', readback?.auth_reference_rows ?? null, 0);
  add(findings, readback?.execution_error == null,
    'readback_execution_error', readback?.execution_error ?? null, null);
  return {
    valid: findings.length === 0,
    status: findings.length === 0
      ? 'mtg_sealed_signed_in_visibility_durably_active'
      : 'mtg_sealed_signed_in_visibility_readback_failed',
    findings,
  };
}
