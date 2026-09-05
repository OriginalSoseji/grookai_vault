import { createHash } from 'node:crypto';

import { stableJson } from './one_piece_canonical_import_staging_v1.mjs';

export const MTG_SEALED_IMAGE_POINTER_APPLY_VERSION_V1 =
  'MTG_SEALED_IMAGE_POINTER_DURABLE_APPLY_V1';
export const MTG_SEALED_IMAGE_POINTER_APPLY_APPROVAL_ENV_V1 =
  'MTG_SEALED_IMAGE_POINTER_APPLY_APPROVAL';
export const MTG_SEALED_IMAGE_POINTER_CONTRACT_V1 =
  'SEALED_PRODUCT_IMAGE_RELEASE_POINTER_V1';

export function hashMtgSealedImagePointerApplyV1(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return createHash('sha256').update(bytes).digest('hex');
}

function stableHash(value) {
  return hashMtgSealedImagePointerApplyV1(stableJson(value));
}

export function buildMtgSealedImagePointerApplyPlanV1({
  repository,
  pointerPreflight,
  repairState,
  sourcePointerCanaryFingerprint,
  sourceImageReleasePlanFingerprint,
  sourceDurableApplyExecutionFingerprint,
}) {
  if (pointerPreflight?.valid !== true ||
      pointerPreflight?.transaction_read_only !== true ||
      pointerPreflight?.state?.authority?.current_image_release_id !== null) {
    throw new Error('Pointer apply requires a valid read-only null-pointer preflight');
  }
  const repairedDefinition = repairState?.pointer_function?.definition ?? '';
  if (repairState?.transaction_read_only !== true ||
      Number(repairState?.migration_ledger?.count) !== 1 ||
      repairState?.migration_ledger?.version !== '20260905040000' ||
      !/on\s+conflict\s+on\s+constraint\s+sealed_product_image_release_pointer_pkey/i
        .test(repairedDefinition) ||
      Number(repairState?.pointer?.count) !== 0) {
    throw new Error('Durable pointer function repair is not exactly present');
  }
  const candidate = pointerPreflight.state.candidate;
  const release = pointerPreflight.state.release;
  const core = {
    version: MTG_SEALED_IMAGE_POINTER_APPLY_VERSION_V1,
    mode: 'durable_pointer_apply',
    producer_commit_sha: repository.head_sha,
    producer_branch: repository.branch,
    tracked_worktree_clean: repository.tracked_worktree_clean,
    game_key: 'mtg',
    source_pointer_canary_fingerprint_sha256: sourcePointerCanaryFingerprint,
    source_image_release_plan_fingerprint_sha256:
      sourceImageReleasePlanFingerprint,
    source_durable_image_release_apply_execution_fingerprint_sha256:
      sourceDurableApplyExecutionFingerprint,
    pointer_function_repair: {
      migration_version: repairState.migration_ledger.version,
      migration_name: repairState.migration_ledger.name,
      migration_sha256:
        '195e104b60d7a356a49b131800074455636a4cde946c04dc94aabf036ff8f818',
      function_definition_sha256:
        hashMtgSealedImagePointerApplyV1(repairedDefinition),
    },
    target_image_release_id: release.id,
    target_image_release_manifest_fingerprint_sha256:
      release.manifest_fingerprint,
    required_active_price_release_id: release.source_price_release_id,
    expected_current_image_release_id: null,
    changed_by: release.frozen_by,
    pointer_contract_version: MTG_SEALED_IMAGE_POINTER_CONTRACT_V1,
    selected_signing_candidate: candidate,
    expected_visibility: {
      mtg_catalog: 'signed_in',
      mtg_sealed: 'hidden',
      signing_authorized_after_pointer: false,
    },
    pointer_preflight_fingerprint_sha256: stableHash(pointerPreflight),
    repair_readback_fingerprint_sha256: stableHash(repairState),
    protected_baseline_fingerprint_sha256: stableHash({
      authority: pointerPreflight.state.authority,
      image_tables: pointerPreflight.state.image_tables,
      table_grants: pointerPreflight.state.table_grants,
      routine_grants: pointerPreflight.state.routine_grants,
      lineage: pointerPreflight.state.lineage,
      release: pointerPreflight.state.release,
      candidate: pointerPreflight.state.candidate,
      rpc_v3_deployed: pointerPreflight.state.rpc_v3_deployed,
    }),
    timeouts: {
      lock_timeout: '5s', statement_timeout: '180s',
      idle_in_transaction_session_timeout: '60s',
    },
    boundaries: {
      durable_pointer_inserts: 1,
      durable_pointer_updates: 0,
      image_evidence_writes: 0,
      storage_operations: 0,
      pricing_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      signer_deployments: 0,
      rpc_deployments: 0,
      client_activations: 0,
      cross_game_writes: 0,
      deletes: 0,
    },
  };
  const fingerprint = stableHash(core);
  const approval = `I approve the durable MTG sealed image-pointer activation ` +
    `only from execution commit ${core.producer_commit_sha}, using activation ` +
    `plan fingerprint ${fingerprint}, target image release ` +
    `${core.target_image_release_id}, target manifest ` +
    `${core.target_image_release_manifest_fingerprint_sha256}, active price ` +
    `release ${core.required_active_price_release_id}, and expected current ` +
    `pointer null. This authorizes exactly one compare-and-swap pointer insert. ` +
    `It authorizes no image evidence, Storage, pricing, visibility, Vault, ` +
    `signer, RPC, client, cross-game, update, delete, or cleanup operation.`;
  return { ...core, activation_plan_fingerprint_sha256: fingerprint,
    approval_env: MTG_SEALED_IMAGE_POINTER_APPLY_APPROVAL_ENV_V1,
    required_approval_message: approval, guard_token: approval };
}

export function validateMtgSealedImagePointerApplyPlanV1(plan) {
  const findings = [];
  const { activation_plan_fingerprint_sha256: fingerprint,
    approval_env: _approvalEnv, required_approval_message: _approval,
    guard_token: _guard, ...core } = plan ?? {};
  if (fingerprint !== stableHash(core)) findings.push('fingerprint_mismatch');
  if (plan?.version !== MTG_SEALED_IMAGE_POINTER_APPLY_VERSION_V1 ||
      plan?.mode !== 'durable_pointer_apply') findings.push('mode_mismatch');
  if (!/^[0-9a-f]{40}$/.test(plan?.producer_commit_sha ?? '') ||
      plan?.tracked_worktree_clean !== true) findings.push('producer_invalid');
  if (plan?.game_key !== 'mtg' ||
      plan?.expected_current_image_release_id !== null ||
      plan?.pointer_contract_version !== MTG_SEALED_IMAGE_POINTER_CONTRACT_V1) {
    findings.push('pointer_contract_mismatch');
  }
  if (!/^[0-9a-f]{64}$/.test(
    plan?.source_pointer_canary_fingerprint_sha256 ?? '') ||
      !/^[0-9a-f]{64}$/.test(
        plan?.source_image_release_plan_fingerprint_sha256 ?? '') ||
      !/^[0-9a-f]{64}$/.test(
        plan?.source_durable_image_release_apply_execution_fingerprint_sha256 ?? '')) {
    findings.push('source_authority_invalid');
  }
  const expectedBoundaries = { durable_pointer_inserts: 1,
    durable_pointer_updates: 0, image_evidence_writes: 0,
    storage_operations: 0, pricing_writes: 0, visibility_writes: 0,
    vault_writes: 0, signer_deployments: 0, rpc_deployments: 0,
    client_activations: 0, cross_game_writes: 0, deletes: 0 };
  if (stableJson(plan?.boundaries) !== stableJson(expectedBoundaries)) {
    findings.push('boundary_mismatch');
  }
  return { valid: findings.length === 0, findings };
}

function pointerMatchesPlan(pointer, plan) {
  return pointer?.game_key === 'mtg' &&
    pointer?.image_release_id === plan?.target_image_release_id &&
    pointer?.previous_image_release_id === null &&
    pointer?.pointer_contract_version === MTG_SEALED_IMAGE_POINTER_CONTRACT_V1 &&
    pointer?.changed_by === plan?.changed_by;
}

export function evaluateMtgSealedImagePointerApplyPrecommitV1(proof) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(proof?.preflight?.valid !== true, 'fresh_preflight_failed');
  add(proof?.transaction_local_preflight?.valid !== true,
    'transaction_preflight_failed');
  add(proof?.transaction?.started !== true ||
    proof?.transaction?.committed !== false ||
    proof?.transaction?.rolled_back !== false, 'transaction_state_invalid');
  add(!pointerMatchesPlan(proof?.transaction_pointer_readback, proof?.plan),
    'pointer_readback_mismatch');
  add(proof?.release_price_binding_valid !== true,
    'release_price_binding_failed');
  add(proof?.candidate_structural_eligibility_with_pointer !== true,
    'candidate_eligibility_failed');
  add(proof?.visibility?.catalog_visible !== true ||
    proof?.visibility?.sealed_visible !== false ||
    proof?.signing_authorized_after_pointer !== false,
  'hidden_visibility_or_signing_boundary_failed');
  add(proof?.rpc_v3_deployed !== false, 'rpc_v3_state_mismatch');
  const writes = proof?.write_attribution ?? [];
  add(writes.length !== 1 ||
    writes[0]?.table_name !== 'sealed_product_image_release_pointer' ||
    Number(writes[0]?.inserted) !== 1 || Number(writes[0]?.updated) !== 0 ||
    Number(writes[0]?.deleted) !== 0 || Number(writes[0]?.hot_updated) !== 0,
  'write_attribution_mismatch');
  return { valid: findings.length === 0, findings };
}

export function evaluateMtgSealedImagePointerApplyReadbackV1(proof) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(proof?.committed !== true || proof?.precommit_validation?.valid !== true,
    'commit_not_prevalidated');
  add(proof?.independent_readback?.transaction_read_only !== true ||
    proof?.independent_readback?.transaction_closed_before_artifacts !== true,
  'independent_readback_boundary_failed');
  add(!pointerMatchesPlan(proof?.independent_readback?.pointer, proof?.plan),
    'durable_pointer_readback_mismatch');
  add(proof?.independent_readback?.release_price_binding_valid !== true ||
    proof?.independent_readback?.candidate_structural_eligibility !== true,
  'durable_authority_chain_failed');
  add(proof?.independent_readback?.catalog_visible !== true ||
    proof?.independent_readback?.sealed_visible !== false ||
    proof?.independent_readback?.signing_authorized !== false,
  'durable_hidden_signing_boundary_failed');
  add(proof?.independent_readback?.protected_state_unchanged !== true ||
    proof?.independent_readback?.security_boundary_unchanged !== true,
  'durable_protected_boundary_drift');
  add(proof?.stale_null_compare_and_swap?.rejected !== true ||
    proof?.stale_null_compare_and_swap?.sqlstate !== '40001' ||
    proof?.stale_null_compare_and_swap?.pointer_unchanged !== true,
  'compare_and_swap_replay_not_proven');
  return { valid: findings.length === 0, findings };
}
