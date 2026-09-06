import { createHash } from 'node:crypto';

import {
  splitSealedMigrationStatementsV1,
  stripSealedMigrationTransactionWrapperV1,
} from './cross_tcg_sealed_product_schema_apply_v1.mjs';

export const MTG_SEALED_RPC_V3_GATE_VERSION =
  'MTG_SEALED_RPC_V3_MIGRATION_GATE_V1';
export const MTG_SEALED_RPC_V3_MIGRATION_VERSION = '20260905070000';
export const MTG_SEALED_RPC_V3_MIGRATION_NAME =
  'mtg_sealed_image_backed_pricing_rpc_v3';
export const MTG_SEALED_RPC_V3_MIGRATION_FILENAME =
  `${MTG_SEALED_RPC_V3_MIGRATION_VERSION}_${MTG_SEALED_RPC_V3_MIGRATION_NAME}.sql`;
export const MTG_SEALED_RPC_V3_SIGNATURE =
  'public.get_active_sealed_product_pricing_v3(text,text,integer,integer)';
export const MTG_SEALED_RPC_V3_CANDIDATE_SHA256 =
  '5e3872f8d433d0e360a3039ba62a5a6d009c6a36ad0112479cb298220450a5a2';
export const MTG_SEALED_RPC_V3_IMAGE_RELEASE_ID =
  '86b207e6-4f73-5d9a-af40-864c47256c38';
export const MTG_SEALED_RPC_V3_IMAGE_MANIFEST =
  '7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2';
export const MTG_SEALED_RPC_V3_PRICE_RELEASE_ID =
  '25626032-7d72-5542-a8e0-7a6532c2f776';

export function stableMtgSealedRpcV3Json(value) {
  const stable = (entry) => {
    if (Array.isArray(entry)) return entry.map(stable);
    if (entry && typeof entry === 'object') {
      return Object.fromEntries(Object.keys(entry).sort()
        .map((key) => [key, stable(entry[key])]));
    }
    return entry;
  };
  return JSON.stringify(stable(value));
}

export function hashMtgSealedRpcV3(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildMtgSealedRpcV3Plan({
  repository,
  migrationSql,
  candidateSql,
  preflight,
}) {
  const preflightFindings = validateMtgSealedRpcV3Preflight(preflight);
  if (preflightFindings.length) {
    throw new Error(`RPC V3 preflight failed: ${preflightFindings.join(',')}`);
  }
  const statements = splitSealedMigrationStatementsV1(migrationSql);
  const core = {
    version: MTG_SEALED_RPC_V3_GATE_VERSION,
    producer_commit_sha: repository.head_sha,
    producer_branch: repository.branch,
    tracked_worktree_clean: repository.tracked_worktree_clean,
    candidate_sha256: hashMtgSealedRpcV3(candidateSql),
    migration: {
      version: MTG_SEALED_RPC_V3_MIGRATION_VERSION,
      name: MTG_SEALED_RPC_V3_MIGRATION_NAME,
      filename: MTG_SEALED_RPC_V3_MIGRATION_FILENAME,
      sha256: hashMtgSealedRpcV3(migrationSql),
      statement_count: statements.length,
    },
    target: {
      function_signature: MTG_SEALED_RPC_V3_SIGNATURE,
      image_release_id: MTG_SEALED_RPC_V3_IMAGE_RELEASE_ID,
      image_manifest: MTG_SEALED_RPC_V3_IMAGE_MANIFEST,
      price_release_id: MTG_SEALED_RPC_V3_PRICE_RELEASE_ID,
    },
    preflight_fingerprint_sha256: hashMtgSealedRpcV3(
      stableMtgSealedRpcV3Json(preflight)),
    protected_baseline: preflight.protected_state,
    structural_evidence: preflight.structural_evidence,
    ledger_row: {
      version: MTG_SEALED_RPC_V3_MIGRATION_VERSION,
      name: MTG_SEALED_RPC_V3_MIGRATION_NAME,
      statements,
    },
    timeouts: {
      lock_timeout: '5s',
      statement_timeout: '180s',
      idle_in_transaction_session_timeout: '60s',
    },
    boundaries: {
      migration_ledger_inserts: 1,
      function_creates_or_replacements: 1,
      data_writes: 0,
      storage_operations: 0,
      pricing_writes: 0,
      pointer_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      signer_deployments: 0,
      client_activations: 0,
      cross_game_writes: 0,
      deletes: 0,
    },
  };
  return {
    ...core,
    apply_plan_fingerprint_sha256: hashMtgSealedRpcV3(
      stableMtgSealedRpcV3Json(core)),
  };
}

export function validateMtgSealedRpcV3Preflight(preflight) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(preflight?.transaction_read_only !== 'on', 'preflight_not_read_only');
  add(preflight?.transaction_closed_before_artifacts !== true,
    'preflight_transaction_not_closed');
  add(preflight?.project_ref_match !== true, 'project_ref_mismatch');
  add(preflight?.migration_ledger_count !== 0, 'migration_already_applied');
  add(preflight?.function_present !== false, 'rpc_v3_already_present');
  add((preflight?.missing_prerequisites ?? []).length !== 0,
    'missing_prerequisites');
  add(preflight?.authority?.image_release_id !==
    MTG_SEALED_RPC_V3_IMAGE_RELEASE_ID, 'image_pointer_mismatch');
  add(preflight?.authority?.image_manifest !== MTG_SEALED_RPC_V3_IMAGE_MANIFEST,
    'image_manifest_mismatch');
  add(preflight?.authority?.price_release_id !==
    MTG_SEALED_RPC_V3_PRICE_RELEASE_ID, 'price_pointer_mismatch');
  add(preflight?.authority?.image_release_state !== 'frozen' ||
    preflight?.authority?.price_release_state !== 'frozen',
  'release_not_frozen');
  add(preflight?.authority?.image_source_price_release_id !==
    MTG_SEALED_RPC_V3_PRICE_RELEASE_ID, 'release_binding_mismatch');
  add(preflight?.authority?.catalog_visibility !== 'signed_in' ||
    preflight?.authority?.sealed_visibility !== 'hidden', 'visibility_drift');
  add(Number(preflight?.structural_evidence?.eligible_rows) <= 0,
    'no_structurally_eligible_rows');
  add(Number(preflight?.structural_evidence?.missing_image_rows) < 0,
    'missing_image_evidence_invalid');
  return findings;
}

export function validateMtgSealedRpcV3Readback({
  plan,
  readback,
  requireReadOnly = true,
  requireClosed = true,
}) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(requireReadOnly && readback?.transaction_read_only !== 'on',
    'readback_not_read_only');
  add(requireClosed && readback?.transaction_closed_before_artifacts !== true,
    'readback_transaction_not_closed');
  add(readback?.function?.signature !== MTG_SEALED_RPC_V3_SIGNATURE,
    'function_signature_mismatch');
  add(readback?.function?.volatility !== 's', 'function_not_stable');
  add(readback?.function?.security_definer !== true,
    'function_not_security_definer');
  add(!(readback?.function?.configuration ?? [])
    .includes('search_path=pg_catalog, public'), 'function_search_path_mismatch');
  add(readback?.function?.anon_execute !== false ||
    readback?.function?.public_execute !== false ||
    readback?.function?.authenticated_execute !== true ||
    readback?.function?.service_role_execute !== true,
  'function_acl_mismatch');
  add(readback?.function?.definition_contract_valid !== true,
    'function_definition_contract_mismatch');
  add(readback?.ledger?.version !== plan?.migration?.version ||
    readback?.ledger?.name !== plan?.migration?.name ||
    Number(readback?.ledger?.statement_count) !==
      Number(plan?.migration?.statement_count), 'migration_ledger_mismatch');
  add(stableMtgSealedRpcV3Json(readback?.protected_state) !==
    stableMtgSealedRpcV3Json(plan?.protected_baseline),
  'protected_state_changed');
  add(readback?.behavior?.authenticated_hidden_rows !== 0,
    'authenticated_hidden_visibility_leak');
  add(readback?.behavior?.service_role_hidden_rows !== 0,
    'service_role_hidden_visibility_leak');
  add(readback?.behavior?.anonymous_execute_denied !== true,
    'anonymous_execution_not_denied');
  add(stableMtgSealedRpcV3Json(readback?.structural_evidence) !==
    stableMtgSealedRpcV3Json(plan?.structural_evidence),
  'structural_evidence_drift');
  return findings;
}

export { stripSealedMigrationTransactionWrapperV1 };
