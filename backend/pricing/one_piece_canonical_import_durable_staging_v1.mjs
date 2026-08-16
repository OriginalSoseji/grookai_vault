import { createHash } from "node:crypto";

export const ONE_PIECE_DURABLE_STAGING_PLAN_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_PLAN_V1";
export const ONE_PIECE_DURABLE_STAGING_SCHEMA_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_SCHEMA_V1";
export const ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION = "20260814120000";
export const ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME =
  "one_piece_canonical_import_durable_staging_v1";
export const ONE_PIECE_PASSED_CANARY_PLAN_FINGERPRINT =
  "174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90";
export const ONE_PIECE_PASSED_CANARY_MIGRATION_SHA256 =
  "7eece6ff093de56b5cbea6a0a1f03a5a9b469789f11de233ac9fab90b4e80591";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

export function validateOnePieceDurableStagingSqlV1({ migrationSql, rollbackSql }) {
  const findings = [];
  const requireFinding = (condition, code) => {
    if (!condition) findings.push(code);
  };

  requireFinding(/^begin;/m.test(migrationSql), "migration_missing_begin");
  requireFinding(/commit;\s*$/m.test(migrationSql), "migration_missing_commit");
  requireFinding(
    countMatches(migrationSql, /create table public\.one_piece_canonical_import_/g) === 2,
    "migration_table_inventory_mismatch",
  );
  requireFinding(
    countMatches(migrationSql, /force row level security;/g) === 2,
    "migration_force_rls_inventory_mismatch",
  );
  requireFinding(
    countMatches(migrationSql, /create policy one_piece_import_/g) === 4,
    "migration_policy_inventory_mismatch",
  );
  requireFinding(
    /revoke all on table public\.one_piece_canonical_import_batches[\s\S]*?from public, anon, authenticated, service_role;/i.test(
      migrationSql,
    ),
    "migration_batch_service_role_reset_missing",
  );
  requireFinding(
    /revoke all on table public\.one_piece_canonical_import_rows[\s\S]*?from public, anon, authenticated, service_role;/i.test(
      migrationSql,
    ),
    "migration_row_service_role_reset_missing",
  );
  requireFinding(
    /revoke all on function public\.one_piece_canonical_import_reject_mutation_v1\(\)[\s\S]*?from public, anon, authenticated, service_role;/i.test(
      migrationSql,
    ),
    "migration_function_execute_reset_missing",
  );
  requireFinding(
    countMatches(migrationSql, /grant select, insert on table public\.one_piece_canonical_import_/g) === 2,
    "migration_service_grant_inventory_mismatch",
  );
  requireFinding(
    !/grant\s+(?:all|update|delete|truncate|references|trigger|execute)\b/i.test(migrationSql),
    "migration_broad_grant_detected",
  );
  requireFinding(
    !/to\s+(?:anon|authenticated)\s*;/i.test(migrationSql),
    "migration_client_grant_detected",
  );
  requireFinding(
    !/insert\s+into\s+public\.(?:games|sets|card_prints|card_print_identity|card_printings|external_mappings|external_printing_mappings|sealed_products|market_price|card_price|vault_)/i.test(
      migrationSql,
    ),
    "migration_protected_domain_write_detected",
  );
  requireFinding(
    !/^\s*(?:update|delete\s+from|truncate)\s+public\./im.test(migrationSql),
    "migration_destructive_dml_detected",
  );

  requireFinding(/^begin;/m.test(rollbackSql), "rollback_missing_begin");
  requireFinding(/commit;\s*$/m.test(rollbackSql), "rollback_missing_commit");
  requireFinding(
    /batch_rows <> 0 or staging_rows <> 0/i.test(rollbackSql),
    "rollback_zero_row_guard_missing",
  );
  requireFinding(
    rollbackSql.includes(ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION) &&
      rollbackSql.includes(ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME),
    "rollback_migration_identity_mismatch",
  );
  requireFinding(
    countMatches(rollbackSql, /drop table public\.one_piece_canonical_import_/g) === 2,
    "rollback_table_inventory_mismatch",
  );
  requireFinding(
    countMatches(rollbackSql, /drop function public\.one_piece_canonical_import_reject_mutation_v1\(\);/g) === 1,
    "rollback_function_inventory_mismatch",
  );
  requireFinding(
    !/(?:drop|delete from|truncate)\s+public\.(?:games|sets|card_prints|card_print_identity|card_printings|external_mappings|external_printing_mappings|sealed_products|market_price|card_price|vault_)/i.test(
      rollbackSql,
    ),
    "rollback_protected_domain_write_detected",
  );

  return { valid: findings.length === 0, findings };
}

export function buildOnePieceDurableStagingPlanV1(input) {
  const planCore = {
    plan_version: ONE_PIECE_DURABLE_STAGING_PLAN_VERSION,
    schema_version: ONE_PIECE_DURABLE_STAGING_SCHEMA_VERSION,
    repository: input.repository,
    proposed_migration: {
      version: ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
      name: ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME,
      candidate_file: input.migrationCandidateFile,
      candidate_sha256: input.migrationCandidateSha256,
      target_file:
        `supabase/migrations/${ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION}_` +
        `${ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME}.sql`,
      applied: false,
    },
    rollback_candidate: {
      file: input.rollbackCandidateFile,
      sha256: input.rollbackCandidateSha256,
      zero_row_only: true,
      applied: false,
    },
    passed_rollback_canary: {
      canary_plan_fingerprint_sha256: ONE_PIECE_PASSED_CANARY_PLAN_FINGERPRINT,
      migration_draft_sha256: ONE_PIECE_PASSED_CANARY_MIGRATION_SHA256,
      execution_summary_file: input.executionSummaryFile,
      execution_summary_sha256: input.executionSummarySha256,
      execution_status: input.executionStatus,
      independent_summary_file: input.independentSummaryFile,
      independent_summary_sha256: input.independentSummarySha256,
      independent_status: input.independentStatus,
      durable_objects_after_canary: 0,
      durable_rows_after_canary: 0,
    },
    object_inventory: {
      tables: [
        "public.one_piece_canonical_import_batches",
        "public.one_piece_canonical_import_rows",
      ],
      function: "public.one_piece_canonical_import_reject_mutation_v1()",
      triggers: [
        "one_piece_canonical_import_batches_immutable",
        "one_piece_canonical_import_rows_immutable",
      ],
      policies: [
        "one_piece_import_batches_service_select",
        "one_piece_import_batches_service_insert",
        "one_piece_import_rows_service_select",
        "one_piece_import_rows_service_insert",
      ],
      indexes: [
        "one_piece_canonical_import_batches_group_idx",
        "one_piece_canonical_import_rows_batch_idx",
      ],
    },
    security_contract: {
      rls_enabled: true,
      rls_forced: true,
      anon_privileges: [],
      authenticated_privileges: [],
      service_role_table_privileges: ["SELECT", "INSERT"],
      service_role_function_execute: false,
      update_delete_truncate_references_trigger_denied: true,
      mutation_rejection_triggers: true,
      app_rpc: false,
    },
    apply_contract: {
      schema_only: true,
      expected_durable_tables: 2,
      expected_durable_data_rows: 0,
      migration_ledger_rows: 1,
      global_db_push: false,
      exact_candidate_copy_required: true,
      independent_post_apply_readback_required: true,
    },
    production_read_only_preflight: {
      required: true,
      migration_version_absent: true,
      all_object_names_absent: true,
      no_later_migration_than_proposed_version: true,
      effective_role_privileges_captured: true,
      protected_domain_baseline_captured: true,
      active_mtg_scope_attribution_required: true,
      database_writes: false,
    },
    boundaries: {
      current_gate_database_connections: 0,
      current_gate_database_writes: 0,
      migration_applied: false,
      staging_rows_written: 0,
      canonical_promotion: false,
      app_or_public_visibility: false,
      pricing_publication: false,
      storage_or_image_work: false,
      vault_writes: false,
      mtg_writes: false,
    },
  };
  return {
    ...planCore,
    plan_fingerprint_sha256: sha256(stableJson(planCore)),
  };
}

export function verifyOnePieceDurableStagingPlanV1(plan) {
  const findings = [];
  const requireFinding = (condition, code) => {
    if (!condition) findings.push(code);
  };
  const { plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  requireFinding(
    plan?.plan_version === ONE_PIECE_DURABLE_STAGING_PLAN_VERSION,
    "plan_version_mismatch",
  );
  requireFinding(
    plan?.schema_version === ONE_PIECE_DURABLE_STAGING_SCHEMA_VERSION,
    "schema_version_mismatch",
  );
  requireFinding(
    plan?.plan_fingerprint_sha256 === sha256(stableJson(core)),
    "plan_fingerprint_mismatch",
  );
  requireFinding(
    /^[0-9a-f]{40}$/.test(plan?.repository?.commit_sha ?? ""),
    "repository_commit_missing",
  );
  requireFinding(
    plan?.repository?.branch === "agent/one-piece-ingestion-readiness-v1",
    "repository_branch_mismatch",
  );
  requireFinding(
    plan?.passed_rollback_canary?.execution_status ===
      "rollback_canary_passed_zero_durable_change",
    "passed_canary_status_mismatch",
  );
  requireFinding(
    plan?.passed_rollback_canary?.independent_status === "rollback_independently_verified",
    "independent_canary_status_mismatch",
  );
  requireFinding(
    plan?.passed_rollback_canary?.canary_plan_fingerprint_sha256 ===
      ONE_PIECE_PASSED_CANARY_PLAN_FINGERPRINT,
    "passed_canary_fingerprint_mismatch",
  );
  requireFinding(
    plan?.passed_rollback_canary?.migration_draft_sha256 ===
      ONE_PIECE_PASSED_CANARY_MIGRATION_SHA256,
    "passed_canary_migration_mismatch",
  );
  requireFinding(
    /^[0-9a-f]{64}$/.test(plan?.proposed_migration?.candidate_sha256 ?? ""),
    "migration_candidate_hash_missing",
  );
  requireFinding(
    /^[0-9a-f]{64}$/.test(plan?.rollback_candidate?.sha256 ?? ""),
    "rollback_candidate_hash_missing",
  );
  requireFinding(plan?.proposed_migration?.applied === false, "migration_marked_applied");
  requireFinding(
    plan?.apply_contract?.expected_durable_data_rows === 0,
    "schema_plan_authorizes_data_rows",
  );
  requireFinding(
    plan?.production_read_only_preflight?.database_writes === false,
    "preflight_authorizes_database_writes",
  );
  requireFinding(
    Object.values(plan?.boundaries ?? {}).every(
      (value) => value === false || value === 0,
    ),
    "current_gate_boundary_open",
  );
  return { valid: findings.length === 0, findings };
}
