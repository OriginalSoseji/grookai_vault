import { createHash } from 'node:crypto';

import { splitSealedMigrationStatementsV1 } from
  './cross_tcg_sealed_product_schema_apply_v1.mjs';
import { stableJson } from './one_piece_canonical_import_staging_v1.mjs';

export const MTG_SEALED_IMAGE_POINTER_REPAIR_VERSION_V1 =
  'MTG_SEALED_IMAGE_POINTER_CONFLICT_REPAIR_V1';
export const MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_VERSION_V1 =
  '20260905040000';
export const MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_FILENAME_V1 =
  '20260905040000_sealed_product_image_pointer_conflict_repair_v1.sql';
export const MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_NAME_V1 =
  'sealed_product_image_pointer_conflict_repair_v1';
export const MTG_SEALED_IMAGE_POINTER_REPAIR_APPROVAL_ENV_V1 =
  'MTG_SEALED_IMAGE_POINTER_REPAIR_APPROVAL';
export const MTG_SEALED_IMAGE_RELEASE_ID_V1 =
  '86b207e6-4f73-5d9a-af40-864c47256c38';
export const MTG_SEALED_IMAGE_RELEASE_MANIFEST_V1 =
  '7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2';
export const MTG_SEALED_PRICE_RELEASE_ID_V1 =
  '25626032-7d72-5542-a8e0-7a6532c2f776';

export function hashMtgSealedImagePointerRepairV1(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return createHash('sha256').update(bytes).digest('hex');
}

function stableHash(value) {
  return hashMtgSealedImagePointerRepairV1(stableJson(value));
}

export function mtgSealedImagePointerRepairProtectedStateFingerprintV1(state) {
  return stableHash({
    pointer: state.pointer,
    authority: state.authority,
    protected_counts: state.protected_counts,
  });
}

function sortedGrants(grants) {
  return (grants ?? []).map((row) =>
    `${row.grantee}:${row.privilege_type}`).sort();
}

export function evaluateMtgSealedImagePointerRepairPreflightV1(preflight, {
  requireReadOnly = true,
} = {}) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(preflight?.project_ref !== 'rksadomjkuoxvrbhsmxu',
    'production_project_mismatch');
  add(requireReadOnly && preflight?.transaction_read_only !== true,
    'preflight_not_read_only');
  add(Number(preflight?.migration_ledger?.count) !== 0,
    'migration_ledger_collision');
  add(preflight?.migration_ledger?.later_versions?.length !== 0,
    'later_migration_present');
  const routine = preflight?.pointer_function ?? {};
  add(routine.present !== true || routine.security_definer !== true ||
    routine.volatility !== 'v' ||
    !(routine.configuration ?? []).includes('search_path=pg_catalog, public'),
  'pointer_function_security_drift');
  add(!/on\s+conflict\s*\(game_key\)/i.test(routine.definition ?? '') ||
    /on\s+conflict\s+on\s+constraint\s+sealed_product_image_release_pointer_pkey/i
      .test(routine.definition ?? ''), 'broken_function_baseline_mismatch');
  add(stableJson(sortedGrants(preflight?.routine_grants)) !==
    stableJson(['service_role:EXECUTE']), 'routine_grant_drift');
  add(Number(preflight?.pointer?.count) !== 0 ||
    preflight?.pointer?.image_release_id != null, 'pointer_not_null');
  const authority = preflight?.authority ?? {};
  add(authority.image_release_id !== MTG_SEALED_IMAGE_RELEASE_ID_V1 ||
    authority.image_release_state !== 'frozen' ||
    authority.image_release_manifest !== MTG_SEALED_IMAGE_RELEASE_MANIFEST_V1 ||
    Number(authority.image_release_member_count) !== 2149,
  'image_release_authority_drift');
  add(authority.price_release_id !== MTG_SEALED_PRICE_RELEASE_ID_V1 ||
    authority.price_release_state !== 'frozen' ||
    Number(authority.price_release_member_count) !== 2182,
  'price_release_authority_drift');
  add(authority.catalog_visibility !== 'signed_in' ||
    authority.sealed_visibility !== 'hidden', 'visibility_drift');
  return { valid: findings.length === 0, findings };
}

export function buildMtgSealedImagePointerRepairPlanV1({
  repository,
  migrationSql,
  preflight,
}) {
  const preflightValidation =
    evaluateMtgSealedImagePointerRepairPreflightV1(preflight);
  if (!preflightValidation.valid) {
    throw new Error(`Invalid repair preflight: ${preflightValidation.findings.join(',')}`);
  }
  const statements = splitSealedMigrationStatementsV1(migrationSql);
  const migrationSha256 = hashMtgSealedImagePointerRepairV1(migrationSql);
  const core = {
    version: MTG_SEALED_IMAGE_POINTER_REPAIR_VERSION_V1,
    producer_commit_sha: repository.head_sha,
    producer_branch: repository.branch,
    tracked_worktree_clean: repository.tracked_worktree_clean,
    migration: {
      version: MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_VERSION_V1,
      filename: MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_FILENAME_V1,
      name: MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_NAME_V1,
      sha256: migrationSha256,
      statement_count: statements.length,
    },
    preflight_fingerprint_sha256: stableHash(preflight),
    protected_state_fingerprint_sha256:
      mtgSealedImagePointerRepairProtectedStateFingerprintV1(preflight),
    baseline_function_definition_sha256:
      hashMtgSealedImagePointerRepairV1(preflight.pointer_function.definition),
    expected_repair: {
      function: 'sealed_product_set_active_image_release_v1(uuid,uuid,uuid)',
      conflict_target:
        'sealed_product_image_release_pointer_pkey',
      routine_grants: ['service_role:EXECUTE'],
    },
    timeouts: {
      lock_timeout: '5s',
      statement_timeout: '180s',
      idle_in_transaction_session_timeout: '60s',
    },
    boundaries: {
      migration_ledger_rows: 1,
      function_replacements: 1,
      durable_data_rows: 0,
      pointer_writes: 0,
      storage_operations: 0,
      image_evidence_writes: 0,
      pricing_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      client_changes: 0,
      cross_game_writes: 0,
      deletes: 0,
    },
    ledger_row: {
      version: MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_VERSION_V1,
      name: MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_NAME_V1,
      statements,
    },
  };
  const applyFingerprint = stableHash(core);
  const approval = `I approve applying only production migration ` +
    `${core.migration.filename} with SHA-256 ${migrationSha256} from ` +
    `execution commit ${core.producer_commit_sha} using apply-plan fingerprint ` +
    `${applyFingerprint}. This authorizes one migration-ledger row and one ` +
    `function replacement repairing only the image-pointer conflict target. ` +
    `It authorizes no pointer, image evidence, Storage, pricing, visibility, ` +
    `Vault, client, cross-game, update, delete, or cleanup operation.`;
  return { ...core, apply_plan_fingerprint_sha256: applyFingerprint,
    approval_env: MTG_SEALED_IMAGE_POINTER_REPAIR_APPROVAL_ENV_V1,
    required_approval_message: approval, guard_token: approval };
}

export function validateMtgSealedImagePointerRepairPlanV1(plan) {
  const findings = [];
  const { apply_plan_fingerprint_sha256: fingerprint,
    approval_env: _approvalEnv, required_approval_message: _approval,
    guard_token: _guard, ...core } = plan ?? {};
  if (fingerprint !== stableHash(core)) findings.push('plan_fingerprint_mismatch');
  if (plan?.version !== MTG_SEALED_IMAGE_POINTER_REPAIR_VERSION_V1) {
    findings.push('plan_version_mismatch');
  }
  if (!/^[0-9a-f]{40}$/.test(plan?.producer_commit_sha ?? '') ||
      plan?.tracked_worktree_clean !== true) findings.push('producer_invalid');
  if (plan?.migration?.version !==
      MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_VERSION_V1 ||
      plan?.migration?.filename !==
      MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_FILENAME_V1 ||
      !/^[0-9a-f]{64}$/.test(plan?.migration?.sha256 ?? '')) {
    findings.push('migration_authority_invalid');
  }
  const allowed = { migration_ledger_rows: 1, function_replacements: 1,
    durable_data_rows: 0, pointer_writes: 0, storage_operations: 0,
    image_evidence_writes: 0, pricing_writes: 0, visibility_writes: 0,
    vault_writes: 0, client_changes: 0, cross_game_writes: 0, deletes: 0 };
  if (stableJson(plan?.boundaries) !== stableJson(allowed)) {
    findings.push('boundary_mismatch');
  }
  return { valid: findings.length === 0, findings };
}

export function evaluateMtgSealedImagePointerRepairReadbackV1({
  plan,
  readback,
  baselineProtectedStateFingerprint,
  requireReadOnly = true,
  requireClosed = true,
}) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add((requireReadOnly && readback?.transaction_read_only !== true) ||
    (requireClosed && readback?.transaction_closed_before_artifacts !== true),
  'independent_readback_boundary_failed');
  add(Number(readback?.migration_ledger?.count) !== 1 ||
    readback?.migration_ledger?.version !== plan?.migration?.version ||
    readback?.migration_ledger?.name !== plan?.migration?.name ||
    Number(readback?.migration_ledger?.statement_count) !==
      Number(plan?.migration?.statement_count), 'migration_ledger_mismatch');
  const routine = readback?.pointer_function ?? {};
  add(routine.present !== true || routine.security_definer !== true ||
    routine.volatility !== 'v' ||
    !(routine.configuration ?? []).includes('search_path=pg_catalog, public') ||
    !/on\s+conflict\s+on\s+constraint\s+sealed_product_image_release_pointer_pkey/i
      .test(routine.definition ?? '') ||
    /on\s+conflict\s*\(game_key\)/i.test(routine.definition ?? ''),
  'function_repair_readback_mismatch');
  add(stableJson(sortedGrants(readback?.routine_grants)) !==
    stableJson(['service_role:EXECUTE']), 'routine_grant_readback_mismatch');
  add(Number(readback?.pointer?.count) !== 0 ||
    readback?.pointer?.image_release_id != null, 'pointer_write_detected');
  const protectedFingerprint =
    mtgSealedImagePointerRepairProtectedStateFingerprintV1(readback);
  add(protectedFingerprint !== baselineProtectedStateFingerprint,
    'protected_state_drift');
  return { valid: findings.length === 0, findings,
    protected_state_fingerprint_sha256: protectedFingerprint };
}
