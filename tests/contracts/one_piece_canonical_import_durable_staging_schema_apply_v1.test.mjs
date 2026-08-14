import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildOnePieceSchemaApplyPlanV1,
  classifyOnePieceConcurrentMtgDeltaV1,
  evaluateOnePieceAttributableWritesV1,
  evaluateOnePieceSchemaReadbackV1,
  ONE_PIECE_SCHEMA_APPLY_APPROVAL_ENV,
  ONE_PIECE_SCHEMA_PREFLIGHT_FINGERPRINT,
  splitMigrationStatementsV1,
  stableJsonOnePiecePreflightV1,
  stripMigrationTransactionWrapperV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  sha256OnePiecePreflightV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_preflight_v1.mjs";

const MIGRATION =
  "supabase/migrations/20260814120000_one_piece_canonical_import_durable_staging_v1.sql";
const CANDIDATE =
  "docs/sql/one_piece_canonical_import_durable_staging_schema_v1_migration_candidate.sql";
const PREFLIGHT =
  "docs/audits/pricing/one_piece_canonical_import_durable_staging_preflight_v1/" +
  "2026-08-14T07-12-41-222Z_production_read_only/summary.json";
const WRITER =
  "scripts/audits/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
const VERIFIER =
  "scripts/audits/one_piece_canonical_import_durable_staging_schema_post_apply_readback_v1.mjs";

async function planFixture() {
  const [migrationSql, candidateSql, preflightText] = await Promise.all([
    fs.readFile(MIGRATION, "utf8"),
    fs.readFile(CANDIDATE, "utf8"),
    fs.readFile(PREFLIGHT, "utf8"),
  ]);
  return {
    migrationSql,
    candidateSql,
    plan: buildOnePieceSchemaApplyPlanV1({
      migrationSql,
      preflightSummary: JSON.parse(preflightText),
    }),
  };
}

function validReadback(plan) {
  const constraints = [
    ...plan.inventory.named_constraints.slice(0, 13).map((constraint_name) => ({
      constraint_name, constraint_type: "c", validated: true,
    })),
    ...plan.inventory.named_constraints.slice(13).map((constraint_name) => ({
      constraint_name, constraint_type: "u", validated: true,
    })),
    { constraint_name: "one_piece_canonical_import_batches_pkey",
      constraint_type: "p", validated: true },
    { constraint_name: "one_piece_canonical_import_rows_pkey",
      constraint_type: "p", validated: true },
    { constraint_name: "one_piece_canonical_import_rows_batch_id_fkey",
      constraint_type: "f", validated: true },
    { constraint_name: "generated_payload_fingerprint_unique",
      constraint_type: "u", validated: true },
  ];
  return {
    transaction_read_only: "on",
    transaction_closed_before_artifacts: true,
    tables: plan.inventory.tables.map((table_name) => ({
      table_name, rls_enabled: true, rls_forced: true, row_count: 0,
    })),
    constraints,
    indexes: [
      ...plan.inventory.required_indexes.map((index_name) => ({ index_name })),
      { index_name: "generated_payload_fingerprint_unique" },
    ],
    functions: [{
      signature: "one_piece_canonical_import_reject_mutation_v1()",
      security_definer: true,
      configuration: ["search_path=pg_catalog, public"],
    }],
    triggers: plan.inventory.triggers.map((trigger_name) => ({ trigger_name })),
    policies: plan.inventory.policies.map((row) => ({
      ...row,
      roles: "{service_role}",
      using_expression: row.command === "SELECT"
        ? "(( SELECT auth.role() AS role) = 'service_role'::text)"
        : null,
      check_expression: row.command === "INSERT"
        ? "(( SELECT auth.role() AS role) = 'service_role'::text)"
        : null,
    })),
    table_grants: plan.inventory.tables.flatMap((table_name) =>
      ["INSERT", "SELECT"].map((privilege_type) => ({
        table_name, grantee: "service_role", privilege_type,
      }))),
    routine_grants: [],
    app_role_privileges: plan.inventory.tables.flatMap((table_name) =>
      ["anon", "authenticated"].map((role_name) => ({
        role_name, table_name, has_any_privilege: false,
      }))),
    service_role_effective_table_privileges: plan.inventory.tables.map(
      (table_name) => ({
        table_name,
        has_select: true,
        has_insert: true,
        has_update: false,
        has_delete: false,
        has_truncate: false,
        has_references: false,
        has_trigger: false,
      })),
    effective_function_privileges: ["anon", "authenticated", "service_role"]
      .map((role_name) => ({
        role_name,
        signature: "one_piece_canonical_import_reject_mutation_v1()",
        has_execute: false,
      })),
    migration_ledger: [structuredClone(plan.ledger_row)],
    protected_schema_fingerprint_sha256: plan.protected_schema_fingerprint_sha256,
    mtg: { release_status: "hidden" },
  };
}

test("reserved migration is the exact reviewed candidate", async () => {
  const { migrationSql, candidateSql } = await planFixture();
  assert.equal(Buffer.from(migrationSql).equals(Buffer.from(candidateSql)), true);
  assert.equal(sha256OnePiecePreflightV1(migrationSql),
    "7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a");
});

test("frozen plan binds preflight, ledger, inventory, and guard token", async () => {
  const { plan } = await planFixture();
  assert.equal(plan.preflight_fingerprint_sha256,
    ONE_PIECE_SCHEMA_PREFLIGHT_FINGERPRINT);
  assert.equal(plan.ledger_statement_count, 26);
  assert.equal(plan.ledger_fingerprint_sha256,
    "6895ee219cc369ebb29e0cd66e7f30d41ab805e3c8e6d6b02a74db4ac0ef185f");
  assert.equal(plan.apply_plan_fingerprint_sha256,
    "ee4b70bbfbda797cede83706cccc5234dc9dba619fc23053d02cff6aaad09e58");
  assert.equal(plan.inventory.tables.length, 2);
  assert.equal(plan.inventory.total_index_count, 7);
  assert.deepEqual(plan.inventory.constraint_type_counts, { c: 13, f: 1, p: 2, u: 3 });
  assert.match(plan.guard_token,
    /^EXECUTE_ONE_PIECE_DURABLE_STAGING_SCHEMA_ONLY:/);
  assert.equal(plan.approval_env, ONE_PIECE_SCHEMA_APPLY_APPROVAL_ENV);
});

test("statement splitting and wrapper stripping preserve exact SQL", async () => {
  const { migrationSql, plan } = await planFixture();
  assert.deepEqual(splitMigrationStatementsV1(migrationSql),
    plan.ledger_row.statements);
  const body = stripMigrationTransactionWrapperV1(migrationSql);
  assert.doesNotMatch(body, /(^|\n)\s*begin;\s*(\n|$)/i);
  assert.doesNotMatch(body, /(^|\n)\s*commit;\s*$/i);
  assert.match(body, /create table public\.one_piece_canonical_import_batches/);
});

test("valid zero-row schema readback passes", async () => {
  const { plan } = await planFixture();
  assert.deepEqual(evaluateOnePieceSchemaReadbackV1({
    plan,
    readback: validReadback(plan),
  }), []);
});

test("row, RLS, grant, function, ledger, and protected drift fail closed", async () => {
  const { plan } = await planFixture();
  const readback = validReadback(plan);
  readback.tables[0].row_count = 1;
  readback.tables[1].rls_forced = false;
  readback.service_role_effective_table_privileges[0].has_update = true;
  readback.effective_function_privileges[0].has_execute = true;
  readback.migration_ledger[0].name = "wrong";
  readback.protected_schema_fingerprint_sha256 = "0".repeat(64);
  const findings = evaluateOnePieceSchemaReadbackV1({ plan, readback });
  assert.ok(findings.includes("one_piece_staging_rows_present"));
  assert.ok(findings.includes("rls_not_forced"));
  assert.ok(findings.some((value) => value.startsWith("service_role_excess:")));
  assert.ok(findings.includes("function_effective_execute_boundary_mismatch"));
  assert.ok(findings.includes("migration_ledger_mismatch"));
  assert.ok(findings.includes("protected_schema_fingerprint_mismatch"));
});

test("constraint and index omissions fail closed without relying on generated names", async () => {
  const { plan } = await planFixture();
  const readback = validReadback(plan);
  readback.constraints.pop();
  readback.indexes = readback.indexes.filter((row) =>
    row.index_name !== "one_piece_canonical_import_rows_batch_idx");
  const findings = evaluateOnePieceSchemaReadbackV1({ plan, readback });
  assert.ok(findings.includes("constraint_type_count_mismatch"));
  assert.ok(findings.includes("index_count_mismatch"));
  assert.ok(findings.includes(
    "required_index_missing:one_piece_canonical_import_rows_batch_idx"));
});

test("transaction-local protected writes remain the attribution authority", () => {
  assert.deepEqual(evaluateOnePieceAttributableWritesV1([{
    table_name: "card_prints", inserted: 0, updated: 0, deleted: 0, hot_updated: 0,
  }]), []);
  assert.deepEqual(evaluateOnePieceAttributableWritesV1([{
    table_name: "card_prints", inserted: 1, updated: 0, deleted: 0, hot_updated: 0,
  }]), ["protected_table_dml:card_prints"]);
});

test("concurrent MTG growth stays external, nondecreasing, and hidden", () => {
  const result = classifyOnePieceConcurrentMtgDeltaV1(
    { game_count: 1, set_count: 100, card_count: 10000, printing_count: 15000,
      import_batch_count: 100, import_row_count: 60000, release_status: "hidden" },
    { game_count: 1, set_count: 101, card_count: 10100, printing_count: 15200,
      import_batch_count: 101, import_row_count: 61000, release_status: "hidden" },
  );
  assert.equal(result.nondecreasing, true);
  assert.equal(result.delta.card_count, 100);
  assert.equal(result.attribution,
    "external_concurrent_mtg_pipeline_not_one_piece_schema_apply");
});

test("migration contains no data or protected-domain DML", async () => {
  const { migrationSql } = await planFixture();
  assert.doesNotMatch(migrationSql,
    /public\.(card_prints|card_printings|vault_|market_price_|sealed_product_|mtg_)/i);
  const topLevel = splitMigrationStatementsV1(migrationSql)
    .filter((statement) => !/^create (?:or replace )?function\b/i.test(statement));
  assert.equal(topLevel.some((statement) =>
    /^(insert\s+into|update\s+|delete\s+from|truncate\s+)/i.test(statement)), false);
});

test("writer and verifier preserve exact execution boundaries", async () => {
  const [writer, verifier] = await Promise.all([
    fs.readFile(WRITER, "utf8"),
    fs.readFile(VERIFIER, "utf8"),
  ]);
  assert.match(writer, /--execute-schema-apply/);
  assert.match(writer, /pg_stat_xact_user_tables/);
  assert.match(writer, /set local lock_timeout/);
  assert.match(writer, /insert into supabase_migrations\.schema_migrations/);
  assert.match(writer, /await client\.query\("commit"\)/);
  assert.match(writer, /await client\.query\("rollback"\)/);
  assert.doesNotMatch(writer, /supabase\s+db\s+push/i);
  assert.match(verifier, /set default_transaction_read_only = on/);
  assert.match(verifier, /begin read only/);
  assert.match(verifier, /transaction_closed_before_artifacts = true/);
});

test("checked-in frozen plan is reproducible when present", async () => {
  const { plan } = await planFixture();
  const planPath = "docs/audits/pricing/" +
    "one_piece_canonical_import_durable_staging_schema_apply_v1/" +
    "schema_apply_plan_v1/plan.json";
  const checkedIn = JSON.parse(await fs.readFile(planPath, "utf8"));
  assert.equal(stableJsonOnePiecePreflightV1(checkedIn),
    stableJsonOnePiecePreflightV1(plan));
});
