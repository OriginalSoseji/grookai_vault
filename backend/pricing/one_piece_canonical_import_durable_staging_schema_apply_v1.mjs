import {
  splitSealedMigrationStatementsV1 as splitMigrationStatementsV1,
  stripSealedMigrationTransactionWrapperV1 as stripMigrationTransactionWrapperV1,
} from "./cross_tcg_sealed_product_schema_apply_v1.mjs";
import {
  ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME,
  ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
  ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
  ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS,
  sha256OnePiecePreflightV1,
  stableJsonOnePiecePreflightV1,
} from "./one_piece_canonical_import_durable_staging_preflight_v1.mjs";

export const ONE_PIECE_SCHEMA_APPLY_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_SCHEMA_APPLY_V1";
export const ONE_PIECE_SCHEMA_PREFLIGHT_FINGERPRINT =
  "636c05c066bb51a80b02b4a84776590d3971ade109e8efa9958ddc6581e81bae";
export const ONE_PIECE_PROTECTED_SCHEMA_FINGERPRINT =
  "fe7c2af6c85d2c65752f2492177ec5e55c65891480ab368714d89f059a383411";
export const ONE_PIECE_SCHEMA_APPLY_APPROVAL_ENV =
  "ONE_PIECE_DURABLE_STAGING_SCHEMA_APPLY_APPROVAL";

export const ONE_PIECE_SCHEMA_PATH =
  "supabase/migrations/20260814120000_one_piece_canonical_import_durable_staging_v1.sql";
export const ONE_PIECE_SCHEMA_CANDIDATE_PATH =
  "docs/sql/one_piece_canonical_import_durable_staging_schema_v1_migration_candidate.sql";
export const ONE_PIECE_SCHEMA_PREFLIGHT_SUMMARY_PATH =
  "docs/audits/pricing/one_piece_canonical_import_durable_staging_preflight_v1/" +
  "2026-08-14T07-12-41-222Z_production_read_only/summary.json";
export const ONE_PIECE_SCHEMA_PLAN_PATH =
  "docs/audits/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1/" +
  "schema_apply_plan_v1/plan.json";

const TABLES = Object.freeze([
  "one_piece_canonical_import_batches",
  "one_piece_canonical_import_rows",
]);
const FUNCTIONS = Object.freeze([
  "one_piece_canonical_import_reject_mutation_v1()",
]);
const TRIGGERS = Object.freeze([
  "one_piece_canonical_import_batches_immutable",
  "one_piece_canonical_import_rows_immutable",
]);
const REQUIRED_INDEXES = Object.freeze([
  "one_piece_canonical_import_batches_group_idx",
  "one_piece_canonical_import_batches_pkey",
  "one_piece_canonical_import_rows_batch_idx",
  "one_piece_canonical_import_rows_batch_ordinal_key",
  "one_piece_canonical_import_rows_batch_product_key",
  "one_piece_canonical_import_rows_pkey",
]);
const NAMED_CONSTRAINTS = Object.freeze([
  "one_piece_import_batches_payload_hash_check",
  "one_piece_import_batches_manifest_hash_check",
  "one_piece_import_batches_migration_hash_check",
  "one_piece_import_batches_commit_check",
  "one_piece_import_batches_category_check",
  "one_piece_import_batches_mode_check",
  "one_piece_import_batches_one_batch_check",
  "one_piece_import_batches_positive_rows_check",
  "one_piece_import_rows_record_class_check",
  "one_piece_import_rows_single_kind_check",
  "one_piece_import_rows_promotion_state_check",
  "one_piece_import_rows_payload_hash_check",
  "one_piece_import_rows_ordinal_check",
  "one_piece_import_rows_batch_product_key",
  "one_piece_import_rows_batch_ordinal_key",
]);
const POLICIES = Object.freeze([
  { table_name: TABLES[0], policy_name: "one_piece_import_batches_service_select",
    command: "SELECT" },
  { table_name: TABLES[0], policy_name: "one_piece_import_batches_service_insert",
    command: "INSERT" },
  { table_name: TABLES[1], policy_name: "one_piece_import_rows_service_select",
    command: "SELECT" },
  { table_name: TABLES[1], policy_name: "one_piece_import_rows_service_insert",
    command: "INSERT" },
]);

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

export function buildOnePieceSchemaApplyPlanV1({ migrationSql, preflightSummary }) {
  const migrationSha256 = sha256OnePiecePreflightV1(migrationSql);
  if (migrationSha256 !== ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256) {
    throw new Error(`Migration hash changed: ${migrationSha256}`);
  }
  if (preflightSummary.status !== "pass" ||
      preflightSummary.preflight_fingerprint_sha256 !==
        ONE_PIECE_SCHEMA_PREFLIGHT_FINGERPRINT) {
    throw new Error("Integrated production preflight is not exact and passing");
  }
  if (preflightSummary.production?.baselines?.schema_fingerprint_sha256 !==
      ONE_PIECE_PROTECTED_SCHEMA_FINGERPRINT) {
    throw new Error("Protected schema fingerprint changed");
  }
  const statements = splitMigrationStatementsV1(migrationSql);
  const ledgerRow = {
    version: ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
    name: ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME,
    statements,
  };
  const ledgerFingerprint = sha256OnePiecePreflightV1(
    stableJsonOnePiecePreflightV1(ledgerRow),
  );
  const inventory = {
    tables: [...TABLES],
    functions: [...FUNCTIONS],
    triggers: [...TRIGGERS],
    required_indexes: [...REQUIRED_INDEXES],
    total_index_count: 7,
    named_constraints: [...NAMED_CONSTRAINTS],
    constraint_type_counts: { c: 13, f: 1, p: 2, u: 3 },
    policies: POLICIES.map((row) => ({ ...row })),
  };
  const frozenCore = {
    version: ONE_PIECE_SCHEMA_APPLY_VERSION,
    preflight_fingerprint_sha256: ONE_PIECE_SCHEMA_PREFLIGHT_FINGERPRINT,
    migration_sha256: migrationSha256,
    migration_version: ONE_PIECE_DURABLE_STAGING_MIGRATION_VERSION,
    migration_name: ONE_PIECE_DURABLE_STAGING_MIGRATION_NAME,
    ledger_fingerprint_sha256: ledgerFingerprint,
    ledger_statement_count: statements.length,
    protected_schema_fingerprint_sha256: ONE_PIECE_PROTECTED_SCHEMA_FINGERPRINT,
    inventory,
    timeouts: {
      lock_timeout: "5s",
      statement_timeout: "180s",
      idle_in_transaction_session_timeout: "60s",
    },
    boundaries: {
      schema_only: true,
      one_piece_staging_rows: 0,
      protected_table_dml: 0,
      app_roles_with_table_access: 0,
      canonical_or_pricing_writes: 0,
      sealed_writes: 0,
      storage_writes: false,
      publication_or_deployment: false,
      mtg_progress_is_external: true,
    },
  };
  const planFingerprint = sha256OnePiecePreflightV1(
    stableJsonOnePiecePreflightV1(frozenCore),
  );
  const guardToken = [
    "EXECUTE_ONE_PIECE_DURABLE_STAGING_SCHEMA_ONLY",
    ONE_PIECE_SCHEMA_PREFLIGHT_FINGERPRINT,
    ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
    planFingerprint,
    "ZERO_ONE_PIECE_STAGING_ROWS",
  ].join(":");
  return {
    ...frozenCore,
    apply_plan_fingerprint_sha256: planFingerprint,
    approval_env: ONE_PIECE_SCHEMA_APPLY_APPROVAL_ENV,
    guard_token: guardToken,
    ledger_row: ledgerRow,
  };
}

function exactNames(findings, rows, key, expected, label) {
  const actual = sortedUnique((rows ?? []).map((row) => row[key]));
  if (stableJsonOnePiecePreflightV1(actual) !==
      stableJsonOnePiecePreflightV1(sortedUnique(expected))) {
    findings.push(`${label}_inventory_mismatch`);
  }
}

export function evaluateOnePieceSchemaReadbackV1({
  plan,
  readback,
  requireReadOnly = true,
  requireClosed = true,
}) {
  const findings = [];
  const inventory = plan.inventory;
  exactNames(findings, readback.tables, "table_name", inventory.tables, "table");
  exactNames(findings, readback.functions, "signature", inventory.functions, "function");
  exactNames(findings, readback.triggers, "trigger_name", inventory.triggers, "trigger");
  if ((readback.tables ?? []).some((row) => !row.rls_enabled)) {
    findings.push("rls_not_enabled");
  }
  if ((readback.tables ?? []).some((row) => !row.rls_forced)) {
    findings.push("rls_not_forced");
  }
  if ((readback.tables ?? []).some((row) => Number(row.row_count) !== 0)) {
    findings.push("one_piece_staging_rows_present");
  }

  const constraintCounts = Object.fromEntries(Object.keys(
    inventory.constraint_type_counts,
  ).map((type) => [type, (readback.constraints ?? [])
    .filter((row) => row.constraint_type === type).length]));
  if (stableJsonOnePiecePreflightV1(constraintCounts) !==
      stableJsonOnePiecePreflightV1(inventory.constraint_type_counts)) {
    findings.push("constraint_type_count_mismatch");
  }
  for (const name of inventory.named_constraints) {
    if (!(readback.constraints ?? []).some((row) => row.constraint_name === name)) {
      findings.push(`named_constraint_missing:${name}`);
    }
  }
  if ((readback.constraints ?? []).some((row) => !row.validated)) {
    findings.push("constraint_not_validated");
  }
  if ((readback.indexes ?? []).length !== inventory.total_index_count) {
    findings.push("index_count_mismatch");
  }
  for (const name of inventory.required_indexes) {
    if (!(readback.indexes ?? []).some((row) => row.index_name === name)) {
      findings.push(`required_index_missing:${name}`);
    }
  }

  const expectedPolicies = inventory.policies.map((row) =>
    `${row.table_name}:${row.policy_name}:${row.command}`).sort();
  const actualPolicies = (readback.policies ?? []).map((row) =>
    `${row.table_name}:${row.policy_name}:${row.command}`).sort();
  if (stableJsonOnePiecePreflightV1(actualPolicies) !==
      stableJsonOnePiecePreflightV1(expectedPolicies)) {
    findings.push("policy_inventory_mismatch");
  }
  for (const policy of readback.policies ?? []) {
    const expression = policy.command === "SELECT"
      ? policy.using_expression
      : policy.check_expression;
    if (!String(policy.roles).includes("service_role") ||
        !/auth\.role\(\).*service_role/i.test(String(expression))) {
      findings.push(`policy_contract_mismatch:${policy.policy_name}`);
    }
  }

  const expectedGrants = inventory.tables.flatMap((table) =>
    ["INSERT", "SELECT"].map((privilege) =>
      `${table}:service_role:${privilege}`)).sort();
  const actualGrants = (readback.table_grants ?? []).map((row) =>
    `${row.table_name}:${row.grantee}:${row.privilege_type}`).sort();
  if (stableJsonOnePiecePreflightV1(actualGrants) !==
      stableJsonOnePiecePreflightV1(expectedGrants)) {
    findings.push("table_grant_inventory_mismatch");
  }
  if ((readback.routine_grants ?? []).length !== 0) {
    findings.push("routine_execute_grant_present");
  }
  if ((readback.app_role_privileges ?? []).some((row) => row.has_any_privilege)) {
    findings.push("app_role_has_one_piece_staging_privilege");
  }
  const effectiveTables = new Map((
    readback.service_role_effective_table_privileges ?? []
  ).map((row) => [row.table_name, row]));
  if (effectiveTables.size !== inventory.tables.length) {
    findings.push("service_role_effective_table_inventory_mismatch");
  }
  for (const table of inventory.tables) {
    const row = effectiveTables.get(table);
    if (!row) continue;
    for (const field of ["has_select", "has_insert"]) {
      if (!row[field]) findings.push(`service_role_missing:${table}:${field}`);
    }
    for (const field of ["has_update", "has_delete", "has_truncate",
      "has_references", "has_trigger"]) {
      if (row[field]) findings.push(`service_role_excess:${table}:${field}`);
    }
  }
  const effectiveFunctions = readback.effective_function_privileges ?? [];
  if (effectiveFunctions.length !== 3 ||
      effectiveFunctions.some((row) => row.has_execute)) {
    findings.push("function_effective_execute_boundary_mismatch");
  }
  for (const row of readback.functions ?? []) {
    if (!row.security_definer) findings.push("function_not_security_definer");
    if (!(row.configuration ?? []).join(" ").includes(
      "search_path=pg_catalog, public")) {
      findings.push("function_search_path_mismatch");
    }
  }
  if (stableJsonOnePiecePreflightV1(readback.migration_ledger ?? []) !==
      stableJsonOnePiecePreflightV1([plan.ledger_row])) {
    findings.push("migration_ledger_mismatch");
  }
  if (readback.protected_schema_fingerprint_sha256 !==
      plan.protected_schema_fingerprint_sha256) {
    findings.push("protected_schema_fingerprint_mismatch");
  }
  if (readback.mtg?.release_status !== "hidden") {
    findings.push("mtg_release_not_hidden");
  }
  if (requireReadOnly && readback.transaction_read_only !== "on") {
    findings.push("readback_transaction_not_read_only");
  }
  if (requireClosed && readback.transaction_closed_before_artifacts !== true) {
    findings.push("readback_transaction_not_closed");
  }
  return [...new Set(findings)];
}

export function evaluateOnePieceAttributableWritesV1(rows) {
  return (rows ?? []).filter((row) =>
    ["inserted", "updated", "deleted", "hot_updated"]
      .some((field) => Number(row[field]) !== 0))
    .map((row) => `protected_table_dml:${row.table_name}`);
}

export function classifyOnePieceConcurrentMtgDeltaV1(before, after) {
  const fields = ["game_count", "set_count", "card_count", "printing_count",
    "import_batch_count", "import_row_count"];
  const delta = Object.fromEntries(fields.map((field) => [
    field,
    Number(after?.[field] ?? 0) - Number(before?.[field] ?? 0),
  ]));
  return {
    delta,
    nondecreasing: fields.every((field) => delta[field] >= 0),
    release_status_before: before?.release_status ?? null,
    release_status_after: after?.release_status ?? null,
    attribution: "external_concurrent_mtg_pipeline_not_one_piece_schema_apply",
  };
}

export {
  splitMigrationStatementsV1,
  stableJsonOnePiecePreflightV1,
  stripMigrationTransactionWrapperV1,
};

export const ONE_PIECE_SCHEMA_APPLY_EXPECTED = Object.freeze({
  tables: TABLES,
  functions: FUNCTIONS,
  triggers: TRIGGERS,
  required_indexes: REQUIRED_INDEXES,
  named_constraints: NAMED_CONSTRAINTS,
  policies: POLICIES,
  protected_relations: ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS,
});
