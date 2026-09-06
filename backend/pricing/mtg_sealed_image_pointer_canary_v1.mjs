import { createHash } from 'node:crypto';

import { stableJson } from './one_piece_canonical_import_staging_v1.mjs';

export const MTG_SEALED_IMAGE_POINTER_CANARY_VERSION_V1 =
  'MTG_SEALED_IMAGE_POINTER_ROLLBACK_CANARY_V1';
export const MTG_SEALED_IMAGE_POINTER_CONTRACT_VERSION_V1 =
  'SEALED_PRODUCT_IMAGE_RELEASE_POINTER_V1';

export function hashMtgSealedImagePointerCanaryV1(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return createHash('sha256').update(bytes).digest('hex');
}

function hashStable(value) {
  return hashMtgSealedImagePointerCanaryV1(stableJson(value));
}

export function buildMtgSealedImagePointerCanaryPlanV1({
  repository,
  productionPreflight,
  sourceImageReleasePlanFingerprint,
  sourceDurableApplyExecutionFingerprint,
  releaseId,
  releaseManifestFingerprint,
  sourcePriceReleaseId,
  changedBy,
  candidate,
}) {
  const core = {
    version: MTG_SEALED_IMAGE_POINTER_CANARY_VERSION_V1,
    mode: 'production_rollback_only',
    producer_commit_sha: repository.head_sha,
    producer_branch: repository.branch,
    tracked_worktree_clean: repository.tracked_worktree_clean,
    game_key: 'mtg',
    source_image_release_plan_fingerprint_sha256:
      sourceImageReleasePlanFingerprint,
    source_durable_apply_execution_fingerprint_sha256:
      sourceDurableApplyExecutionFingerprint,
    target_image_release_id: releaseId,
    target_image_release_manifest_fingerprint_sha256:
      releaseManifestFingerprint,
    required_active_price_release_id: sourcePriceReleaseId,
    expected_current_image_release_id: null,
    changed_by: changedBy,
    pointer_contract_version:
      MTG_SEALED_IMAGE_POINTER_CONTRACT_VERSION_V1,
    pointer_function:
      'sealed_product_set_active_image_release_v1(uuid,uuid,uuid)',
    selected_signing_candidate: candidate,
    expected_visibility: {
      mtg_catalog: 'signed_in',
      mtg_sealed: 'hidden',
      authenticated_catalog_visible: true,
      authenticated_sealed_visible: false,
      authenticated_signing_authorized_with_pointer: false,
    },
    rpc_v3_expectation: 'not_deployed_candidate_only',
    production_preflight_fingerprint_sha256: hashStable(productionPreflight),
    timeouts: {
      lock_timeout: '5s',
      statement_timeout: '180s',
      idle_in_transaction_session_timeout: '60s',
    },
    boundaries: {
      durable_database_writes: 0,
      transient_pointer_inserts: 1,
      storage_operations: 0,
      evidence_release_writes: 0,
      pricing_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      signer_deployments: 0,
      client_activations: 0,
      cross_game_writes: 0,
      updates: 0,
      deletes: 0,
    },
  };
  return { ...core, canary_fingerprint_sha256: hashStable(core) };
}

export function validateMtgSealedImagePointerCanaryPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { canary_fingerprint_sha256: fingerprint, ...core } = plan ?? {};
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const sha256 = /^[0-9a-f]{64}$/;
  add(plan?.version !== MTG_SEALED_IMAGE_POINTER_CANARY_VERSION_V1,
    'version_mismatch');
  add(plan?.mode !== 'production_rollback_only', 'mode_mismatch');
  add(fingerprint !== hashStable(core), 'fingerprint_mismatch');
  add(!/^[0-9a-f]{40}$/.test(plan?.producer_commit_sha ?? ''),
    'producer_commit_invalid');
  add(plan?.producer_branch !==
    'agent/mtg-sealed-image-migration-promotion-v1',
  'producer_branch_invalid');
  add(plan?.tracked_worktree_clean !== true, 'tracked_worktree_not_clean');
  add(plan?.game_key !== 'mtg', 'game_scope_mismatch');
  add(!sha256.test(plan?.source_image_release_plan_fingerprint_sha256 ?? '') ||
    !sha256.test(plan?.source_durable_apply_execution_fingerprint_sha256 ?? '') ||
    !sha256.test(plan?.target_image_release_manifest_fingerprint_sha256 ?? '') ||
    !sha256.test(plan?.production_preflight_fingerprint_sha256 ?? ''),
  'source_authority_invalid');
  add(!uuid.test(plan?.target_image_release_id ?? '') ||
    !uuid.test(plan?.required_active_price_release_id ?? '') ||
    !uuid.test(plan?.changed_by ?? ''), 'release_authority_invalid');
  add(plan?.expected_current_image_release_id !== null,
    'expected_pointer_not_null');
  add(plan?.pointer_contract_version !==
    MTG_SEALED_IMAGE_POINTER_CONTRACT_VERSION_V1,
  'pointer_contract_mismatch');
  add(plan?.pointer_function !==
    'sealed_product_set_active_image_release_v1(uuid,uuid,uuid)',
  'pointer_function_mismatch');
  add(!plan?.selected_signing_candidate?.object_path ||
    plan?.selected_signing_candidate?.storage_bucket !== 'user-card-images' ||
    !/^sealed\/mtg\/sha256\/[0-9a-f]{2}\/[0-9a-f]{64}\.(jpg|png|gif|webp)$/
      .test(plan?.selected_signing_candidate?.object_path ?? ''),
  'signing_candidate_invalid');
  add(plan?.expected_visibility?.mtg_catalog !== 'signed_in' ||
    plan?.expected_visibility?.mtg_sealed !== 'hidden' ||
    plan?.expected_visibility?.authenticated_catalog_visible !== true ||
    plan?.expected_visibility?.authenticated_sealed_visible !== false ||
    plan?.expected_visibility?.authenticated_signing_authorized_with_pointer !==
      false, 'visibility_expectation_invalid');
  add(plan?.rpc_v3_expectation !== 'not_deployed_candidate_only',
    'rpc_v3_expectation_invalid');
  const forbidden = ['durable_database_writes', 'storage_operations',
    'evidence_release_writes', 'pricing_writes', 'visibility_writes',
    'vault_writes', 'signer_deployments', 'client_activations',
    'cross_game_writes', 'updates', 'deletes'];
  add(forbidden.some((key) => Number(plan?.boundaries?.[key]) !== 0),
    'boundary_overclaim');
  add(Number(plan?.boundaries?.transient_pointer_inserts) !== 1,
    'transient_pointer_count_mismatch');
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateMtgSealedImagePointerRollbackCanaryV1(proof) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(proof?.preflight?.valid !== true, 'fresh_preflight_failed');
  add(proof?.transaction_local_preflight?.valid !== true,
    'transaction_local_preflight_failed');
  add(proof?.transaction?.started !== true ||
    proof?.transaction?.committed !== false ||
    proof?.transaction?.rolled_back !== true,
  'transaction_state_invalid');
  const pointer = proof?.transaction_pointer_readback ?? {};
  add(pointer.game_key !== 'mtg' ||
    pointer.image_release_id !== proof?.plan?.target_image_release_id ||
    pointer.previous_image_release_id !== null ||
    pointer.pointer_contract_version !==
      MTG_SEALED_IMAGE_POINTER_CONTRACT_VERSION_V1 ||
    pointer.changed_by !== proof?.plan?.changed_by,
  'transaction_pointer_readback_mismatch');
  add(proof?.release_price_binding_valid !== true,
    'release_price_binding_failed');
  add(proof?.candidate_structural_eligibility_with_pointer !== true,
    'candidate_structural_eligibility_failed');
  add(proof?.visibility?.catalog_visible !== true ||
    proof?.visibility?.sealed_visible !== false,
  'visibility_boundary_mismatch');
  add(proof?.signing_authorized_before_pointer !== false ||
    proof?.signing_authorized_with_hidden_pointer !== false,
  'signing_boundary_mismatch');
  add(proof?.rpc_v3_deployed !== false, 'rpc_v3_state_mismatch');
  const writes = proof?.write_attribution ?? [];
  add(writes.length !== 1 ||
    writes[0]?.table_name !== 'sealed_product_image_release_pointer' ||
    Number(writes[0]?.inserted) !== 1 ||
    Number(writes[0]?.updated) !== 0 ||
    Number(writes[0]?.deleted) !== 0 ||
    Number(writes[0]?.hot_updated) !== 0,
  'write_attribution_mismatch');
  add(proof?.post_rollback?.transaction_read_only !== true,
    'post_rollback_not_read_only');
  add(proof?.post_rollback?.pointer_is_null !== true,
    'post_rollback_pointer_residue');
  add(proof?.post_rollback?.release_unchanged !== true,
    'post_rollback_release_drift');
  add(proof?.post_rollback?.protected_boundaries_unchanged !== true,
    'post_rollback_protected_boundary_drift');
  add(proof?.post_rollback?.security_boundary_unchanged !== true,
    'post_rollback_security_boundary_drift');
  add(proof?.post_rollback?.full_preflight_valid !== true,
    'post_rollback_full_preflight_failed');
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
