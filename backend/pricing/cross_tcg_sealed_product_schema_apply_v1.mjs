import { createHash } from "node:crypto";

import {
  SEALED_FUNCTIONS_V1,
  SEALED_INDEXES_V1,
  SEALED_MIGRATION_PLAN_FINGERPRINT,
  SEALED_MIGRATION_SHA256,
  SEALED_POLICIES_V1,
  SEALED_PROTECTED_RELATIONS_V1,
  SEALED_RESERVED_MIGRATION_NAME,
  SEALED_RESERVED_MIGRATION_VERSION,
  SEALED_TABLES_V1,
  SEALED_TRIGGERS_V1,
} from "./cross_tcg_sealed_product_schema_preflight_v1.mjs";

export const SEALED_SCHEMA_APPLY_VERSION =
  "CROSS_TCG_SEALED_PRODUCT_SCHEMA_APPLY_READBACK_V1";
export const SEALED_SCHEMA_PREFLIGHT_FINGERPRINT =
  "791bfb677a432b8ec9f7d8d027830fc96b21f40ccfbd0c0a528f1833baca28f7";
export const SEALED_PROTECTED_SCHEMA_FINGERPRINT =
  "1224bc0fa350de813e0055b22ed95080b381a0986ed040b1823b9cdb3349bccb";
export const SEALED_SCHEMA_APPLY_APPROVAL_ENV =
  "CROSS_TCG_SEALED_SCHEMA_APPLY_APPROVAL";

export const SEALED_SCHEMA_PATH =
  "supabase/migrations/20260814060000_cross_tcg_sealed_product_domain_v1.sql";
export const SEALED_SCHEMA_CANDIDATE_PATH =
  "docs/sql/cross_tcg_sealed_product_domain_v1_migration_candidate.sql";
export const SEALED_SCHEMA_PREFLIGHT_SUMMARY_PATH =
  "docs/audits/pricing/cross_tcg_sealed_product_schema_security_preflight_v1/" +
  "2026-08-14T06-09-28-890Z_production_read_only/summary.json";
export const SEALED_SCHEMA_PLAN_PATH =
  "docs/audits/pricing/cross_tcg_sealed_product_schema_apply_v1/" +
  "schema_apply_plan_v1/plan.json";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

export function stableJsonSealedSchemaApplyV1(value) {
  return JSON.stringify(stable(value));
}

export function sealedSchemaApplySha256V1(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stripSealedMigrationTransactionWrapperV1(sql) {
  const withoutBegin = sql.replace(
    /(^|\r?\n)\s*begin;\s*(?=\r?\n)/i,
    "$1",
  );
  const withoutCommit = withoutBegin.replace(
    /\r?\n\s*commit;\s*$/i,
    "\n",
  );
  if (withoutCommit === sql) {
    throw new Error("Migration transaction wrapper was not isolated");
  }
  return withoutCommit;
}

export function splitSealedMigrationStatementsV1(sql) {
  const statements = [];
  let current = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockCommentDepth = 0;
  let dollarTag = null;

  const push = () => {
    const value = current.trim();
    if (value) statements.push(value);
    current = "";
  };

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1] ?? "";

    if (lineComment) {
      current += character;
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockCommentDepth > 0) {
      current += character;
      if (character === "/" && next === "*") {
        current += next;
        blockCommentDepth += 1;
        index += 1;
      } else if (character === "*" && next === "/") {
        current += next;
        blockCommentDepth -= 1;
        index += 1;
      }
      continue;
    }
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = null;
      } else {
        current += character;
      }
      continue;
    }
    if (singleQuoted) {
      current += character;
      if (character === "'" && next === "'") {
        current += next;
        index += 1;
      } else if (character === "'") {
        singleQuoted = false;
      }
      continue;
    }
    if (doubleQuoted) {
      current += character;
      if (character === '"' && next === '"') {
        current += next;
        index += 1;
      } else if (character === '"') {
        doubleQuoted = false;
      }
      continue;
    }

    if (character === "-" && next === "-") {
      current += character + next;
      lineComment = true;
      index += 1;
    } else if (character === "/" && next === "*") {
      current += character + next;
      blockCommentDepth = 1;
      index += 1;
    } else if (character === "'") {
      current += character;
      singleQuoted = true;
    } else if (character === '"') {
      current += character;
      doubleQuoted = true;
    } else if (character === "$") {
      const match = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length - 1;
      } else {
        current += character;
      }
    } else if (character === ";") {
      push();
    } else {
      current += character;
    }
  }
  push();
  if (singleQuoted || doubleQuoted || dollarTag || blockCommentDepth > 0) {
    throw new Error("Migration SQL ended inside a quoted or commented region");
  }
  return statements;
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

export function buildSealedMigrationInventoryV1(sql) {
  const tableStatements = splitSealedMigrationStatementsV1(sql)
    .map((statement) => ({
      statement,
      table: statement.match(/^create\s+table\s+public\.([a-z0-9_]+)/i)?.[1] ?? null,
    }))
    .filter((entry) => entry.table);
  const tables = tableStatements.map((entry) => entry.table);
  const triggers = [...sql.matchAll(/create\s+trigger\s+([a-z0-9_]+)/gi)]
    .map((match) => match[1]);
  const indexes = [...sql.matchAll(/create\s+(?:unique\s+)?index\s+([a-z0-9_]+)/gi)]
    .map((match) => match[1]);
  const constraints = [...sql.matchAll(/constraint\s+([a-z0-9_]+)\s+/gi)]
    .map((match) => match[1]);
  const uniqueConstraints = [...sql.matchAll(
    /constraint\s+([a-z0-9_]+)\s+(?:primary\s+key|unique)\b/gi,
  )].map((match) => match[1]);
  const primaryKeyIndexes = tables.map((table) => `${table}_pkey`);
  const implicitForeignKeys = tableStatements.flatMap(({ statement, table }) =>
    [...statement.matchAll(
      /^[ \t]*([a-z][a-z0-9_]*)[ \t]+[a-z][a-z0-9_]*(?:\([^)]*\))?[^,\r\n]*\breferences\s+public\./gmi,
    )].map((match) => `${table}_${match[1]}_fkey`),
  );
  return {
    tables: sortedUnique(tables),
    functions: [...SEALED_FUNCTIONS_V1],
    triggers: sortedUnique(triggers),
    explicit_indexes: sortedUnique(indexes),
    all_indexes: sortedUnique([...indexes, ...uniqueConstraints, ...primaryKeyIndexes]),
    constraints: sortedUnique([
      ...constraints,
      ...primaryKeyIndexes,
      ...implicitForeignKeys,
    ]),
    policies: [...SEALED_POLICIES_V1]
      .map(([table_name, policy_name]) => ({ table_name, policy_name })),
  };
}

export function buildSealedSchemaApplyPlanV1({
  migrationSql,
  preflightSummary,
}) {
  const migrationSha256 = sealedSchemaApplySha256V1(migrationSql);
  if (migrationSha256 !== SEALED_MIGRATION_SHA256) {
    throw new Error(`Migration hash changed: ${migrationSha256}`);
  }
  if (
    preflightSummary.preflight_fingerprint_sha256 !==
      SEALED_SCHEMA_PREFLIGHT_FINGERPRINT ||
    preflightSummary.status !== "pass"
  ) {
    throw new Error("Frozen production preflight is not exact and passing");
  }
  if (
    preflightSummary.migration_plan_fingerprint !==
      SEALED_MIGRATION_PLAN_FINGERPRINT
  ) {
    throw new Error("Migration plan fingerprint changed");
  }
  const statements = splitSealedMigrationStatementsV1(migrationSql);
  const ledgerRow = {
    version: SEALED_RESERVED_MIGRATION_VERSION,
    name: SEALED_RESERVED_MIGRATION_NAME,
    statements,
  };
  const ledgerFingerprint = sealedSchemaApplySha256V1(
    stableJsonSealedSchemaApplyV1(ledgerRow),
  );
  const inventory = buildSealedMigrationInventoryV1(migrationSql);
  const frozenCore = {
    version: SEALED_SCHEMA_APPLY_VERSION,
    preflight_fingerprint_sha256: SEALED_SCHEMA_PREFLIGHT_FINGERPRINT,
    migration_plan_fingerprint_sha256: SEALED_MIGRATION_PLAN_FINGERPRINT,
    migration_sha256: migrationSha256,
    migration_version: SEALED_RESERVED_MIGRATION_VERSION,
    migration_name: SEALED_RESERVED_MIGRATION_NAME,
    ledger_fingerprint_sha256: ledgerFingerprint,
    ledger_statement_count: statements.length,
    protected_schema_fingerprint_sha256: SEALED_PROTECTED_SCHEMA_FINGERPRINT,
    inventory,
    timeouts: {
      lock_timeout: "5s",
      statement_timeout: "180s",
      idle_in_transaction_session_timeout: "60s",
    },
    boundaries: {
      schema_only: true,
      sealed_data_rows: 0,
      protected_table_dml: 0,
      app_roles_with_table_access: 0,
      app_publication: false,
      storage_writes: false,
      deployment: false,
      mtg_progress_is_external: true,
    },
  };
  const planFingerprint = sealedSchemaApplySha256V1(
    stableJsonSealedSchemaApplyV1(frozenCore),
  );
  const guardToken = [
    "EXECUTE_CROSS_TCG_SEALED_SCHEMA_ONLY",
    SEALED_SCHEMA_PREFLIGHT_FINGERPRINT,
    SEALED_MIGRATION_PLAN_FINGERPRINT,
    SEALED_MIGRATION_SHA256,
    planFingerprint,
    "ZERO_SEALED_DATA_ROWS",
  ].join(":");
  return {
    ...frozenCore,
    apply_plan_fingerprint_sha256: planFingerprint,
    approval_env: SEALED_SCHEMA_APPLY_APPROVAL_ENV,
    guard_token: guardToken,
    ledger_row: ledgerRow,
  };
}

function keySet(rows, key) {
  return sortedUnique((rows ?? []).map((row) => row[key]));
}

function compareExactNames(findings, actualRows, key, expected, label) {
  const actual = keySet(actualRows, key);
  const wanted = sortedUnique(expected);
  if (stableJsonSealedSchemaApplyV1(actual) !== stableJsonSealedSchemaApplyV1(wanted)) {
    findings.push(`${label}_inventory_mismatch`);
  }
}

export function evaluateSealedSchemaReadbackV1({
  plan,
  readback,
  requireReadOnly = true,
  requireClosed = true,
}) {
  const findings = [];
  const inventory = plan.inventory;
  compareExactNames(findings, readback.tables, "table_name", inventory.tables, "table");
  compareExactNames(findings, readback.constraints, "constraint_name",
    inventory.constraints, "constraint");
  compareExactNames(findings, readback.indexes, "index_name", inventory.all_indexes,
    "index");
  compareExactNames(findings, readback.triggers, "trigger_name", inventory.triggers,
    "trigger");
  compareExactNames(findings, readback.functions, "signature", inventory.functions,
    "function");

  if ((readback.tables ?? []).some((row) => !row.rls_enabled)) {
    findings.push("rls_not_enabled");
  }
  if ((readback.tables ?? []).some((row) => !row.rls_forced)) {
    findings.push("rls_not_forced");
  }
  if ((readback.tables ?? []).some((row) => Number(row.row_count) !== 0)) {
    findings.push("sealed_data_rows_present");
  }

  const expectedPolicies = inventory.policies
    .map((row) => `${row.table_name}:${row.policy_name}`).sort();
  const actualPolicies = (readback.policies ?? [])
    .map((row) => `${row.table_name}:${row.policy_name}`).sort();
  if (stableJsonSealedSchemaApplyV1(actualPolicies) !==
      stableJsonSealedSchemaApplyV1(expectedPolicies)) {
    findings.push("policy_inventory_mismatch");
  }
  for (const policy of readback.policies ?? []) {
    if (
      policy.command !== "ALL" ||
      !String(policy.roles).includes("service_role") ||
      !/true/i.test(String(policy.using_expression)) ||
      !/true/i.test(String(policy.check_expression))
    ) {
      findings.push(`policy_contract_mismatch:${policy.policy_name}`);
    }
  }

  const expectedTableGrants = inventory.tables.flatMap((table) =>
    (table === "sealed_product_release_pointer" ? ["SELECT"] : ["INSERT", "SELECT"])
      .map((privilege) => `${table}:service_role:${privilege}`),
  ).sort();
  const actualTableGrants = (readback.table_grants ?? [])
    .map((row) => `${row.table_name}:${row.grantee}:${row.privilege_type}`).sort();
  if (stableJsonSealedSchemaApplyV1(actualTableGrants) !==
      stableJsonSealedSchemaApplyV1(expectedTableGrants)) {
    findings.push("table_grant_inventory_mismatch");
  }

  const expectedRoutineGrants = [
    "sealed_product_freeze_release_v1:service_role:EXECUTE",
    "sealed_product_set_active_release_v1:service_role:EXECUTE",
  ].sort();
  const actualRoutineGrants = (readback.routine_grants ?? [])
    .map((row) => `${row.routine_name}:${row.grantee}:${row.privilege_type}`).sort();
  if (stableJsonSealedSchemaApplyV1(actualRoutineGrants) !==
      stableJsonSealedSchemaApplyV1(expectedRoutineGrants)) {
    findings.push("routine_grant_inventory_mismatch");
  }

  for (const row of readback.functions ?? []) {
    const shouldDefiner = row.signature.startsWith("sealed_product_freeze_release_v1(") ||
      row.signature.startsWith("sealed_product_set_active_release_v1(");
    if (row.security_definer !== shouldDefiner) {
      findings.push(`function_security_mismatch:${row.signature}`);
    }
    const configuration = (row.configuration ?? []).join(" ");
    if (!configuration.includes("search_path=pg_catalog, public")) {
      findings.push(`function_search_path_mismatch:${row.signature}`);
    }
  }

  if ((readback.app_role_privileges ?? []).some((row) => row.has_any_privilege)) {
    findings.push("app_role_has_sealed_privilege");
  }
  const expectedLedger = [plan.ledger_row];
  if (stableJsonSealedSchemaApplyV1(readback.migration_ledger) !==
      stableJsonSealedSchemaApplyV1(expectedLedger)) {
    findings.push("migration_ledger_mismatch");
  }
  if (requireReadOnly && readback.transaction_read_only !== "on") {
    findings.push("readback_transaction_not_read_only");
  }
  if (requireClosed && readback.transaction_closed_before_artifacts !== true) {
    findings.push("readback_transaction_not_closed");
  }
  if (readback.protected_schema_fingerprint_sha256 !==
      plan.protected_schema_fingerprint_sha256) {
    findings.push("protected_schema_fingerprint_mismatch");
  }
  if (readback.mtg?.release_status !== "hidden") {
    findings.push("mtg_release_not_hidden");
  }
  return [...new Set(findings)];
}

export function evaluateSealedAttributableWritesV1(rows) {
  return (rows ?? [])
    .filter((row) =>
      Number(row.inserted) !== 0 ||
      Number(row.updated) !== 0 ||
      Number(row.deleted) !== 0 ||
      Number(row.hot_updated) !== 0,
    )
    .map((row) => `protected_table_dml:${row.table_name}`);
}

export function classifyConcurrentMtgDeltaV1(before, after) {
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
    attribution: "external_concurrent_mtg_pipeline_not_sealed_schema_apply",
  };
}

export const SEALED_SCHEMA_APPLY_EXPECTED = Object.freeze({
  tables: SEALED_TABLES_V1,
  functions: SEALED_FUNCTIONS_V1,
  indexes: SEALED_INDEXES_V1,
  policies: SEALED_POLICIES_V1,
  triggers: SEALED_TRIGGERS_V1,
  protected_relations: SEALED_PROTECTED_RELATIONS_V1,
});
