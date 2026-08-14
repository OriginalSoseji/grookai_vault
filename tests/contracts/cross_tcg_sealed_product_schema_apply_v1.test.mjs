import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildSealedSchemaApplyPlanV1,
  classifyConcurrentMtgDeltaV1,
  evaluateSealedAttributableWritesV1,
  evaluateSealedSchemaReadbackV1,
  SEALED_SCHEMA_APPLY_APPROVAL_ENV,
  SEALED_SCHEMA_PREFLIGHT_FINGERPRINT,
  sealedSchemaApplySha256V1,
  splitSealedMigrationStatementsV1,
  stableJsonSealedSchemaApplyV1,
  stripSealedMigrationTransactionWrapperV1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs";

const MIGRATION =
  "supabase/migrations/20260814060000_cross_tcg_sealed_product_domain_v1.sql";
const CANDIDATE =
  "docs/sql/cross_tcg_sealed_product_domain_v1_migration_candidate.sql";
const PREFLIGHT =
  "docs/audits/pricing/cross_tcg_sealed_product_schema_security_preflight_v1/" +
  "2026-08-14T06-09-28-890Z_production_read_only/summary.json";
const WRITER = "scripts/audits/cross_tcg_sealed_product_schema_apply_v1.mjs";
const VERIFIER =
  "scripts/audits/cross_tcg_sealed_product_schema_post_apply_readback_v1.mjs";

async function planFixture() {
  const [migrationSql, candidateSql, preflightText] = await Promise.all([
    fs.readFile(MIGRATION, "utf8"),
    fs.readFile(CANDIDATE, "utf8"),
    fs.readFile(PREFLIGHT, "utf8"),
  ]);
  return {
    migrationSql,
    candidateSql,
    plan: buildSealedSchemaApplyPlanV1({
      migrationSql,
      preflightSummary: JSON.parse(preflightText),
    }),
  };
}

function validReadback(plan) {
  const tables = plan.inventory.tables.map((table_name) => ({
    table_name,
    owner_name: "postgres",
    rls_enabled: true,
    rls_forced: true,
    row_count: 0,
  }));
  const constraints = plan.inventory.constraints.map((constraint_name) => ({
    table_name: "fixture",
    constraint_name,
    validated: true,
  }));
  const indexes = plan.inventory.all_indexes.map((index_name) => ({
    table_name: "fixture",
    index_name,
  }));
  const functions = plan.inventory.functions.map((signature) => ({
    signature,
    security_definer: signature.startsWith("sealed_product_freeze_release_v1(") ||
      signature.startsWith("sealed_product_set_active_release_v1("),
    configuration: ["search_path=pg_catalog, public"],
  }));
  const triggers = plan.inventory.triggers.map((trigger_name) => ({
    table_name: "fixture",
    trigger_name,
  }));
  const policies = plan.inventory.policies.map(({ table_name, policy_name }) => ({
    table_name,
    policy_name,
    roles: "{service_role}",
    command: "ALL",
    using_expression: "true",
    check_expression: "true",
  }));
  const table_grants = plan.inventory.tables.flatMap((table_name) =>
    (table_name === "sealed_product_release_pointer" ? ["SELECT"] : ["INSERT", "SELECT"])
      .map((privilege_type) => ({
        table_name,
        grantee: "service_role",
        privilege_type,
      })),
  );
  return {
    transaction_read_only: "on",
    transaction_closed_before_artifacts: true,
    tables,
    constraints,
    indexes,
    functions,
    triggers,
    policies,
    table_grants,
    routine_grants: [
      { routine_name: "sealed_product_freeze_release_v1", grantee: "service_role",
        privilege_type: "EXECUTE" },
      { routine_name: "sealed_product_set_active_release_v1", grantee: "service_role",
        privilege_type: "EXECUTE" },
    ],
    app_role_privileges: plan.inventory.tables.flatMap((table_name) =>
      ["anon", "authenticated"].map((role_name) => ({
        role_name,
        table_name,
        has_any_privilege: false,
      })),
    ),
    service_role_effective_table_privileges: plan.inventory.tables.map(
      (table_name) => ({
        table_name,
        has_select: true,
        has_insert: table_name !== "sealed_product_release_pointer",
        has_update: false,
        has_delete: false,
        has_truncate: false,
        has_references: false,
        has_trigger: false,
      }),
    ),
    effective_function_privileges: ["anon", "authenticated", "service_role"]
      .flatMap((role_name) => plan.inventory.functions.map((signature) => ({
        role_name,
        signature,
        has_execute: role_name === "service_role" && (
          signature.startsWith("sealed_product_freeze_release_v1(") ||
          signature.startsWith("sealed_product_set_active_release_v1(")
        ),
      }))),
    migration_ledger: [structuredClone(plan.ledger_row)],
    protected_schema_fingerprint_sha256: plan.protected_schema_fingerprint_sha256,
    mtg: { release_status: "hidden" },
  };
}

test("migration is the exact reviewed byte payload", async () => {
  const { migrationSql, candidateSql } = await planFixture();
  assert.equal(Buffer.from(migrationSql).equals(Buffer.from(candidateSql)), true);
  assert.equal(
    sealedSchemaApplySha256V1(migrationSql),
    "f588987c10cdb80f641d6da8ca0f4892afdb6b0d7175fe6e2c0cdc2c6be972d0",
  );
});

test("frozen plan binds exact preflight, ledger, inventory, and guard token", async () => {
  const { plan } = await planFixture();
  assert.equal(plan.preflight_fingerprint_sha256, SEALED_SCHEMA_PREFLIGHT_FINGERPRINT);
  assert.equal(plan.ledger_statement_count, 93);
  assert.equal(plan.ledger_fingerprint_sha256,
    "a6eda9822abe8a0f7a684107ad0ac2c63a35a75f13f7c6bcdc932ea48e2ffd99");
  assert.equal(plan.apply_plan_fingerprint_sha256,
    "c908fe55a4459b0b0e80bdd375ff8090ee84ad71d552ee21f9b8aaa195d14221");
  assert.equal(plan.inventory.tables.length, 10);
  assert.equal(plan.inventory.constraints.length, 89);
  assert.equal(plan.inventory.all_indexes.length, 34);
  assert.equal(plan.inventory.functions.length, 5);
  assert.equal(plan.inventory.triggers.length, 10);
  assert.equal(plan.inventory.policies.length, 10);
  assert.match(plan.guard_token, /^EXECUTE_CROSS_TCG_SEALED_SCHEMA_ONLY:/);
  assert.equal(plan.approval_env, SEALED_SCHEMA_APPLY_APPROVAL_ENV);
});

test("statement splitting preserves function bodies and exact source order", async () => {
  const { migrationSql, plan } = await planFixture();
  const statements = splitSealedMigrationStatementsV1(migrationSql);
  assert.deepEqual(statements, plan.ledger_row.statements);
  assert.match(statements[0], /begin$/i);
  assert.match(statements.at(-1), /^commit$/i);
  assert.equal(statements.filter((statement) =>
    /create function public\.sealed_product_/i.test(statement)).length, 5);
});

test("transaction wrapper stripping leaves only the migration body", async () => {
  const { migrationSql } = await planFixture();
  const body = stripSealedMigrationTransactionWrapperV1(migrationSql);
  assert.doesNotMatch(body, /(^|\n)\s*begin;\s*(\n|$)/i);
  assert.doesNotMatch(body, /(^|\n)\s*commit;\s*$/i);
  assert.match(body, /create table public\.sealed_product_families/);
});

test("valid exact schema readback passes", async () => {
  const { plan } = await planFixture();
  assert.deepEqual(evaluateSealedSchemaReadbackV1({
    plan,
    readback: validReadback(plan),
  }), []);
});

test("RLS, row, grant, ledger, and protected-schema drift fail closed", async () => {
  const { plan } = await planFixture();
  const readback = validReadback(plan);
  readback.tables[0].rls_forced = false;
  readback.tables[1].row_count = 1;
  readback.app_role_privileges[0].has_any_privilege = true;
  readback.service_role_effective_table_privileges[0].has_update = true;
  readback.effective_function_privileges.find((row) =>
    row.role_name === "anon").has_execute = true;
  readback.migration_ledger[0].name = "wrong";
  readback.protected_schema_fingerprint_sha256 = "0".repeat(64);
  const findings = evaluateSealedSchemaReadbackV1({ plan, readback });
  assert.ok(findings.includes("rls_not_forced"));
  assert.ok(findings.includes("sealed_data_rows_present"));
  assert.ok(findings.includes("app_role_has_sealed_privilege"));
  assert.ok(findings.some((finding) =>
    finding.startsWith("service_role_effective_table_privilege_mismatch:")));
  assert.ok(findings.some((finding) =>
    finding.startsWith("effective_function_privilege_mismatch:anon:")));
  assert.ok(findings.includes("migration_ledger_mismatch"));
  assert.ok(findings.includes("protected_schema_fingerprint_mismatch"));
});

test("transaction-local protected writes are the attribution authority", () => {
  assert.deepEqual(evaluateSealedAttributableWritesV1([
    { table_name: "card_prints", inserted: 0, updated: 0, deleted: 0, hot_updated: 0 },
  ]), []);
  assert.deepEqual(evaluateSealedAttributableWritesV1([
    { table_name: "card_prints", inserted: 1, updated: 0, deleted: 0, hot_updated: 0 },
  ]), ["protected_table_dml:card_prints"]);
});

test("concurrent MTG growth is external and does not become sealed attribution", () => {
  const result = classifyConcurrentMtgDeltaV1(
    { game_count: 1, set_count: 80, card_count: 7000, printing_count: 11000,
      import_batch_count: 80, import_row_count: 100000, release_status: "hidden" },
    { game_count: 1, set_count: 86, card_count: 7600, printing_count: 11900,
      import_batch_count: 86, import_row_count: 110000, release_status: "hidden" },
  );
  assert.equal(result.nondecreasing, true);
  assert.equal(result.delta.card_count, 600);
  assert.equal(result.attribution,
    "external_concurrent_mtg_pipeline_not_sealed_schema_apply");
});

test("migration contains no protected domain relation references or data DML", async () => {
  const { migrationSql } = await planFixture();
  assert.doesNotMatch(migrationSql,
    /public\.(card_prints|card_printings|vault_|market_price_|mtg_canonical_|games|sets)\b/i);
  const topLevelStatements = splitSealedMigrationStatementsV1(migrationSql)
    .filter((statement) => !/^create function\b/i.test(statement));
  assert.equal(topLevelStatements.some((statement) =>
    /^(insert\s+into|update\s+|delete\s+from|truncate\s+)/i.test(statement)), false);
});

test("writer and independent verifier preserve the execution boundary", async () => {
  const [writer, verifier] = await Promise.all([
    fs.readFile(WRITER, "utf8"),
    fs.readFile(VERIFIER, "utf8"),
  ]);
  assert.match(writer, /--execute-schema-apply/);
  assert.match(writer, /pg_stat_xact_user_tables/);
  assert.match(writer, /set local lock_timeout/);
  assert.match(writer, /set local statement_timeout/);
  assert.match(writer, /insert into supabase_migrations\.schema_migrations/);
  assert.match(writer, /await client\.query\("rollback"\)/);
  assert.doesNotMatch(writer, /supabase\s+db\s+push/i);
  assert.match(verifier, /set default_transaction_read_only = on/);
  assert.match(verifier, /begin read only/);
  assert.match(verifier, /transaction_closed_before_artifacts = true/);
});

test("checked-in frozen plan is reproducible", async () => {
  const { plan } = await planFixture();
  const checkedIn = JSON.parse(await fs.readFile(
    "docs/audits/pricing/cross_tcg_sealed_product_schema_apply_v1/" +
      "schema_apply_plan_v1/plan.json",
    "utf8",
  ));
  assert.equal(stableJsonSealedSchemaApplyV1(checkedIn),
    stableJsonSealedSchemaApplyV1(plan));
});
