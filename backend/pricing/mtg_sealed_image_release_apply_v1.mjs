import { createHash } from 'node:crypto';

import { stableJson } from './one_piece_canonical_import_staging_v1.mjs';

export const MTG_SEALED_IMAGE_RELEASE_APPLY_VERSION_V1 =
  'MTG_SEALED_IMAGE_RELEASE_APPLY_V1';
export const MTG_SEALED_IMAGE_RELEASE_APPLY_APPROVAL_ENV_V1 =
  'MTG_SEALED_IMAGE_RELEASE_APPLY_APPROVAL';
export const MTG_SEALED_IMAGE_RELEASE_APPLY_EXPECTED_COUNTS_V1 = Object.freeze({
  evidence: 2182,
  objects: 2141,
  assertions: 2149,
  releases: 1,
  release_members: 2149,
  exclusions: 33,
  total_insert_rows: 8622,
});

export function hashMtgSealedImageReleaseApplyV1(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return createHash('sha256').update(bytes).digest('hex');
}

function hashStable(value) {
  return hashMtgSealedImageReleaseApplyV1(stableJson(value));
}

function expectedCounts(plan) {
  return {
    evidence: Number(plan?.datasets?.evidence?.row_count ?? -1),
    objects: Number(plan?.datasets?.objects?.row_count ?? -1),
    assertions: Number(plan?.datasets?.assertions?.row_count ?? -1),
    releases: Number(plan?.datasets?.releases?.row_count ?? -1),
    release_members: Number(plan?.datasets?.release_members?.row_count ?? -1),
    exclusions: Number(plan?.datasets?.exclusions?.row_count ?? -1),
  };
}

export function buildMtgSealedImageReleaseExecutionPlanV1({
  repository,
  sourcePlan,
  sourceArtifactManifestSha256,
  sourceArtifactHashes,
  productionPreflight,
  mode,
}) {
  if (!['rollback_canary', 'durable_apply'].includes(mode)) {
    throw new Error('Execution mode must be rollback_canary or durable_apply');
  }
  const counts = expectedCounts(sourcePlan);
  const totalInsertRows = counts.evidence + counts.objects + counts.assertions +
    counts.releases + counts.release_members;
  const core = {
    version: MTG_SEALED_IMAGE_RELEASE_APPLY_VERSION_V1,
    mode,
    producer_commit_sha: repository.head_sha,
    producer_branch: repository.branch,
    tracked_worktree_clean: repository.tracked_worktree_clean,
    game_key: sourcePlan.game_key,
    source_price_release_id: sourcePlan.source_price_release_id,
    source_coverage_fingerprint_sha256:
      sourcePlan.source_coverage_fingerprint_sha256,
    source_durable_execution_fingerprint_sha256:
      sourcePlan.source_durable_execution_fingerprint_sha256,
    source_image_release_plan_fingerprint_sha256:
      sourcePlan.plan_fingerprint_sha256,
    source_artifact_manifest_sha256: sourceArtifactManifestSha256,
    source_artifact_hashes: sourceArtifactHashes,
    release_id: sourcePlan.release_id,
    release_manifest_fingerprint_sha256:
      sourcePlan.release_manifest_fingerprint_sha256,
    expected_counts: { ...counts, total_insert_rows: totalInsertRows },
    production_preflight_fingerprint_sha256: hashStable(productionPreflight),
    expected_current_image_release_id:
      productionPreflight.current_image_release_id ?? null,
    insert_order: [
      'sealed_product_image_evidence',
      'sealed_product_image_objects',
      'sealed_product_variant_image_assertions',
      'sealed_product_image_releases',
      'sealed_product_image_release_members',
    ],
    freeze_function:
      'sealed_product_freeze_image_release_v1(uuid,text,uuid)',
    pointer_function_called: false,
    timeouts: {
      lock_timeout: '5s',
      statement_timeout: '300s',
      idle_in_transaction_session_timeout: '90s',
    },
    boundaries: {
      storage_operations: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      signer_deployments: 0,
      client_activations: 0,
      cross_game_writes: 0,
      updates: mode === 'rollback_canary' ? 0 : 1,
      deletes: 0,
      durable_database_writes: mode === 'rollback_canary' ? 0 : totalInsertRows + 1,
    },
  };
  const executionFingerprint = hashStable(core);
  const approval = `I approve the durable MTG sealed database image-evidence ` +
    `release apply from execution commit ${repository.head_sha}, using source ` +
    `coverage fingerprint ${sourcePlan.source_coverage_fingerprint_sha256}, ` +
    `durable Storage execution fingerprint ` +
    `${sourcePlan.source_durable_execution_fingerprint_sha256}, image release ` +
    `plan fingerprint ${sourcePlan.plan_fingerprint_sha256}, and execution ` +
    `fingerprint ${executionFingerprint}. This authorizes one transaction ` +
    `inserting exactly ${counts.evidence} evidence rows, ${counts.objects} ` +
    `object rows, ${counts.assertions} assertions, 1 draft release, and ` +
    `${counts.release_members} release members, then freezing that release ` +
    `after exact manifest verification. It authorizes no image pointer, ` +
    `Storage, pricing, visibility, Vault, signer, client, cross-game, ` +
    `separate update, or delete operation.`;
  return {
    ...core,
    execution_fingerprint_sha256: executionFingerprint,
    approval_env: MTG_SEALED_IMAGE_RELEASE_APPLY_APPROVAL_ENV_V1,
    required_durable_apply_authority: approval,
  };
}

export function validateMtgSealedImageReleaseExecutionPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const {
    execution_fingerprint_sha256: fingerprint,
    approval_env: _approvalEnv,
    required_durable_apply_authority: _authority,
    ...core
  } = plan ?? {};
  add(plan?.version !== MTG_SEALED_IMAGE_RELEASE_APPLY_VERSION_V1,
    'version_mismatch');
  add(!['rollback_canary', 'durable_apply'].includes(plan?.mode),
    'mode_invalid');
  add(fingerprint !== hashStable(core), 'execution_fingerprint_mismatch');
  add(!/^[0-9a-f]{40}$/.test(plan?.producer_commit_sha ?? ''),
    'producer_commit_invalid');
  add(plan?.tracked_worktree_clean !== true, 'tracked_worktree_not_clean');
  add(stableJson(plan?.expected_counts) !== stableJson(
    MTG_SEALED_IMAGE_RELEASE_APPLY_EXPECTED_COUNTS_V1), 'count_mismatch');
  add(plan?.pointer_function_called !== false, 'pointer_call_included');
  const forbidden = ['storage_operations', 'image_pointer_writes',
    'pricing_writes', 'visibility_writes', 'vault_writes',
    'signer_deployments', 'client_activations', 'cross_game_writes', 'deletes'];
  add(forbidden.some((key) => Number(plan?.boundaries?.[key]) !== 0),
    'forbidden_boundary_overclaim');
  add(plan?.mode === 'rollback_canary' &&
    (Number(plan?.boundaries?.durable_database_writes) !== 0 ||
      Number(plan?.boundaries?.updates) !== 0),
  'rollback_boundary_overclaim');
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

function allExactReadbacks(readbacks) {
  return ['evidence', 'objects', 'assertions', 'releases', 'release_members']
    .every((key) => readbacks?.[key]?.exact === true &&
      Number(readbacks[key].mismatch_count) === 0);
}

const EXPECTED_WRITE_ATTRIBUTION = Object.freeze({
  sealed_product_image_evidence: { inserted: 2182, updated: 0, deleted: 0 },
  sealed_product_image_objects: { inserted: 2141, updated: 0, deleted: 0 },
  sealed_product_variant_image_assertions:
    { inserted: 2149, updated: 0, deleted: 0 },
  sealed_product_image_releases: { inserted: 1, updated: 1, deleted: 0 },
  sealed_product_image_release_members:
    { inserted: 2149, updated: 0, deleted: 0 },
});

function evaluateTransactionPayload(proof, findings) {
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(proof?.preflight?.valid !== true, 'fresh_preflight_failed');
  add(proof?.transaction_local_preflight?.valid !== true,
    'transaction_local_preflight_failed');
  add(!allExactReadbacks(proof?.transaction_readback),
    'inside_transaction_exact_readback_failed');
  add(proof?.database_manifest_fingerprint !==
    proof?.planned_manifest_fingerprint, 'database_manifest_mismatch');
  add(proof?.release_state !== 'frozen', 'release_not_frozen_in_transaction');
  add(Number(proof?.excluded_evidence_without_assertion_count) !== 33,
    'exclusion_boundary_mismatch');
  add(Number(proof?.transaction_image_pointer_count) !== 0,
    'image_pointer_changed_in_transaction');
  const writes = new Map((proof?.write_attribution ?? [])
    .map((row) => [row.table_name, row]));
  add(writes.size !== Object.keys(EXPECTED_WRITE_ATTRIBUTION).length,
    'write_attribution_table_count_mismatch');
  for (const [table, expected] of Object.entries(EXPECTED_WRITE_ATTRIBUTION)) {
    const actual = writes.get(table);
    add(!actual || Number(actual.inserted) !== expected.inserted ||
      Number(actual.updated) !== expected.updated ||
      Number(actual.deleted) !== expected.deleted ||
      Number(actual.hot_updated) !== 0,
    `write_attribution_mismatch:${table}`);
  }
}

export function evaluateMtgSealedImageReleasePrecommitV1(proof) {
  const findings = [];
  evaluateTransactionPayload(proof, findings);
  if (proof?.transaction?.started !== true ||
      proof?.transaction?.committed !== false ||
      proof?.transaction?.rolled_back !== false) {
    findings.push('precommit_transaction_state_invalid');
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateMtgSealedImageReleaseRollbackV1(proof) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  evaluateTransactionPayload(proof, findings);
  add(proof?.transaction?.started !== true ||
    proof?.transaction?.committed !== false ||
    proof?.transaction?.rolled_back !== true, 'transaction_state_invalid');
  add(proof?.post_rollback?.transaction_read_only !== true,
    'post_rollback_not_read_only');
  add(proof?.post_rollback?.zero_target_rows !== true,
    'post_rollback_target_residue');
  add(proof?.post_rollback?.image_pointer_unchanged !== true,
    'post_rollback_pointer_drift');
  add(proof?.post_rollback?.protected_boundaries_unchanged !== true,
    'post_rollback_protected_boundary_drift');
  add(proof?.post_rollback?.security_boundary_unchanged !== true,
    'post_rollback_security_boundary_drift');
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateMtgSealedImageReleaseDurableReadbackV1(proof) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(proof?.committed !== true, 'durable_apply_not_committed');
  add(proof?.precommit_validation?.valid !== true,
    'durable_precommit_validation_failed');
  add(proof?.transaction_read_only !== true,
    'durable_verification_not_read_only');
  add(!allExactReadbacks(proof?.readback), 'durable_exact_readback_failed');
  add(proof?.release_state !== 'frozen', 'durable_release_not_frozen');
  add(proof?.database_manifest_fingerprint !==
    proof?.planned_manifest_fingerprint, 'durable_manifest_mismatch');
  add(Number(proof?.image_pointer_write_count) !== 0,
    'durable_pointer_boundary_breached');
  add(Number(proof?.excluded_evidence_without_assertion_count) !== 33,
    'durable_exclusion_boundary_mismatch');
  add(proof?.protected_boundaries_unchanged !== true,
    'durable_protected_boundary_drift');
  add(proof?.security_boundary_unchanged !== true,
    'durable_security_boundary_drift');
  add(proof?.zero_row_idempotency_ready !== true,
    'durable_idempotency_not_proven');
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
