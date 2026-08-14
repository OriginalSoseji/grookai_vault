import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceSourceExpectationV1,
  compareOnePieceProtectedSnapshotsV1,
  evaluateOnePieceSourceSnapshotV1,
  evaluateOnePieceStagingFootprintAbsentV1,
  evaluateOnePieceTransactionSecurityV1,
  ONE_PIECE_ROLLBACK_APPROVAL,
  ONE_PIECE_STAGING_OBJECTS,
  PINNED_ONE_PIECE_CANARY_PLAN_SHA256,
  PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256,
  PROTECTED_TABLES_V1,
  stripExactMigrationTransactionV1,
  verifyOnePieceRollbackExecutionInputsV1,
} from "../../backend/pricing/one_piece_canonical_import_rollback_canary_v1.mjs";
import { executeOnePieceProductionRollbackCanaryV1 } from "../../scripts/audits/one_piece_canonical_import_rollback_canary_v1.mjs";
import { onePieceDatabaseSslConfigV1 } from "../../scripts/audits/one_piece_canonical_import_rollback_db_v1.mjs";
import {
  evaluateIndependentOnePiecePostRollbackV1,
  independentlyVerifyOnePieceRollbackV1,
} from "../../scripts/audits/one_piece_canonical_import_post_rollback_verify_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLAN_FILE = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "one_piece_canonical_import_staging_and_canary_v1",
  "e55e334b828db7b3",
  "canary_plan.json",
);
const MANIFEST_FILE = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "one_piece_canonical_catalog_readiness_v1",
  "2026-08-14T04-53-27-691Z",
  "source_product_manifest.jsonl.gz",
);
const MIGRATION_FILE = path.join(
  ROOT,
  "supabase",
  "migration_drafts",
  "20260814010000_one_piece_canonical_import_staging_v1.sql",
);
const PLAN = JSON.parse(fs.readFileSync(PLAN_FILE, "utf8"));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function absentFootprint() {
  return {
    tables: Object.fromEntries(ONE_PIECE_STAGING_OBJECTS.tables.map((name) => [name, false])),
    function_present: false,
    policies: [],
    triggers: [],
    indexes: [],
    migration_recorded: false,
  };
}

function sourceSnapshot(expectation) {
  return {
    category: { category_id: expectation.category_id },
    group: {
      group_id: expectation.group.group_id,
      name: expectation.group.name,
      published_on: expectation.group.published_on,
      source_active: true,
      catalog_metadata_status: "current",
    },
    products: structuredClone(expectation.products),
    price_lanes: structuredClone(expectation.price_lanes),
  };
}

function readOnlyProof(expectation) {
  return {
    transaction_read_only: true,
    default_transaction_read_only: true,
    protected_boundaries: {
      tables: {
        "public.games": { present: true, row_count: "2" },
        "public.vault_items": { present: true, row_count: "100" },
      },
      mtg_scope: { game_count: "1", card_count: "3000" },
    },
    source: sourceSnapshot(expectation),
    staging_footprint: absentFootprint(),
    plan_fingerprint: PINNED_ONE_PIECE_CANARY_PLAN_SHA256,
  };
}

function executorArgs(outDir) {
  return {
    execute: true,
    plan: PLAN_FILE,
    manifest: MANIFEST_FILE,
    migrationDraft: MIGRATION_FILE,
    outDir,
  };
}

test("database SSL policy supports local tunnels without weakening remote TLS", () => {
  assert.equal(onePieceDatabaseSslConfigV1("postgresql://user:pass@localhost:5432/db"), false);
  assert.equal(onePieceDatabaseSslConfigV1("postgresql://user:pass@127.0.0.1:6543/db"), false);
  assert.equal(onePieceDatabaseSslConfigV1("postgresql://user:pass@[::1]:5432/db"), false);
  assert.deepEqual(
    onePieceDatabaseSslConfigV1("postgresql://user:pass@db.example.com:5432/db"),
    { rejectUnauthorized: false },
  );
  assert.throws(() => onePieceDatabaseSslConfigV1(null), /required/);
});

test("production source readback normalizes date and missing price evidence", () => {
  const databaseSource = fs.readFileSync(
    path.join(ROOT, "scripts", "audits", "one_piece_canonical_import_rollback_db_v1.mjs"),
    "utf8",
  );
  assert.match(databaseSource, /published_on::date::text as published_on/);
  assert.match(databaseSource, /coalesce\(market_price > 0, false\) as positive_market_signal/);
  assert.doesNotMatch(databaseSource, /Promise\.all\(\[\s*captureOnePieceProtectedBoundariesV1/);
});

test("frozen migration, plan, and full manifest pass exact local preflight", () => {
  const result = verifyOnePieceRollbackExecutionInputsV1({
    plan: PLAN,
    migrationDraft: fs.readFileSync(MIGRATION_FILE),
    compressedManifest: fs.readFileSync(MANIFEST_FILE),
  });
  assert.equal(result.valid, true, result.issues.join("\n"));
  assert.equal(result.migration_draft_sha256, PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256);
  assert.equal(result.manifest_row_count, 7261);
  assert.equal(result.selected_manifest_row_count, 21);
});

test("local preflight fails closed on migration or plan drift", () => {
  const changedMigration = Buffer.concat([
    fs.readFileSync(MIGRATION_FILE),
    Buffer.from("\n-- drift\n"),
  ]);
  const migrationResult = verifyOnePieceRollbackExecutionInputsV1({
    plan: PLAN,
    migrationDraft: changedMigration,
    compressedManifest: fs.readFileSync(MANIFEST_FILE),
  });
  assert.equal(migrationResult.valid, false);
  assert.match(migrationResult.issues.join("\n"), /migration_draft_sha256_mismatch/);

  const changedPlan = structuredClone(PLAN);
  changedPlan.staging_rows[0].language_key = "ja";
  const planResult = verifyOnePieceRollbackExecutionInputsV1({
    plan: changedPlan,
    migrationDraft: fs.readFileSync(MIGRATION_FILE),
    compressedManifest: fs.readFileSync(MANIFEST_FILE),
  });
  assert.equal(planResult.valid, false);
  assert.match(planResult.issues.join("\n"), /fingerprint|language/i);
});

test("migration wrapper removes only exact outer delimiters", () => {
  assert.equal(stripExactMigrationTransactionV1("begin;\nselect 1;\ncommit;").trim(), "select 1;");
  assert.throws(() => stripExactMigrationTransactionV1("select 1;"));
  assert.throws(() =>
    stripExactMigrationTransactionV1("begin;\nbegin;\nselect 1;\ncommit;\ncommit;"),
  );
});

test("selected source evidence rejects product, group, and price-lane drift", () => {
  const expectation = buildOnePieceSourceExpectationV1(PLAN);
  assert.deepEqual(evaluateOnePieceSourceSnapshotV1(expectation, sourceSnapshot(expectation)), []);

  const changedProduct = sourceSnapshot(expectation);
  changedProduct.products[0].payload_hash = "f".repeat(64);
  assert.deepEqual(evaluateOnePieceSourceSnapshotV1(expectation, changedProduct), [
    "source_product_drift",
  ]);

  const changedGroup = sourceSnapshot(expectation);
  changedGroup.group.name = "Changed";
  assert.deepEqual(evaluateOnePieceSourceSnapshotV1(expectation, changedGroup), [
    "source_group_drift",
  ]);

  const changedPrice = sourceSnapshot(expectation);
  changedPrice.price_lanes.pop();
  assert.deepEqual(evaluateOnePieceSourceSnapshotV1(expectation, changedPrice), [
    "source_price_lane_drift",
  ]);
});

test("post-rollback footprint and protected snapshots fail on any residue or count drift", () => {
  assert.deepEqual(evaluateOnePieceStagingFootprintAbsentV1(absentFootprint()), []);
  const residue = absentFootprint();
  residue.tables[ONE_PIECE_STAGING_OBJECTS.tables[0]] = true;
  residue.function_present = true;
  assert.deepEqual(evaluateOnePieceStagingFootprintAbsentV1(residue), [
    `staging_table_present:${ONE_PIECE_STAGING_OBJECTS.tables[0]}`,
    "staging_function_present",
  ]);

  const before = readOnlyProof(buildOnePieceSourceExpectationV1(PLAN)).protected_boundaries;
  assert.deepEqual(compareOnePieceProtectedSnapshotsV1(before, structuredClone(before)), []);
  const changed = structuredClone(before);
  changed.tables["public.vault_items"].row_count = "101";
  assert.deepEqual(compareOnePieceProtectedSnapshotsV1(before, changed), [
    "protected_table_counts_changed",
  ]);
});

test("protected snapshot inventory spans every required production domain", () => {
  for (const relation of [
    "public.card_prints",
    "public.sealed_products",
    "public.market_price_current_publication",
    "public.pricing_observations",
    "public.vault_item_instances",
    "public.catalog_game_release_controls",
    "public.mtg_canonical_import_rows",
    "supabase_migrations.schema_migrations",
  ]) {
    assert.equal(PROTECTED_TABLES_V1.includes(relation), true, relation);
  }
});

test("security policy accepts only service-role select/insert with immutable triggers", () => {
  const denied = { select: false, insert: false, update: false, delete: false };
  const service = { select: true, insert: true, update: false, delete: false };
  const security = {
    batch_rls_enabled: true,
    row_rls_enabled: true,
    privileges: {
      anon: { batch: { ...denied }, row: { ...denied } },
      authenticated: { batch: { ...denied }, row: { ...denied } },
      service_role: { batch: { ...service }, row: { ...service } },
    },
    policies: [
      { tablename: "one_piece_canonical_import_batches", policyname: "one_piece_import_batches_service_insert", cmd: "INSERT" },
      { tablename: "one_piece_canonical_import_batches", policyname: "one_piece_import_batches_service_select", cmd: "SELECT" },
      { tablename: "one_piece_canonical_import_rows", policyname: "one_piece_import_rows_service_insert", cmd: "INSERT" },
      { tablename: "one_piece_canonical_import_rows", policyname: "one_piece_import_rows_service_select", cmd: "SELECT" },
    ],
    triggers: [...ONE_PIECE_STAGING_OBJECTS.triggers],
    function_present: true,
  };
  assert.deepEqual(evaluateOnePieceTransactionSecurityV1(security), []);
  security.privileges.authenticated.row.select = true;
  assert.deepEqual(evaluateOnePieceTransactionSecurityV1(security), [
    "authenticated_row_select_privilege_present",
  ]);
});

test("executor blocks before a database callback when exact approval is absent", async () => {
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), "one-piece-no-approval-"));
  let databaseCalls = 0;
  await assert.rejects(
    executeOnePieceProductionRollbackCanaryV1({
      args: executorArgs(outDir),
      approval: "wrong",
      captureReadOnly: async () => {
        databaseCalls += 1;
      },
      runTransaction: async () => {
        databaseCalls += 1;
      },
      repository: {
        commit_sha: "a".repeat(40),
        branch: "agent/one-piece-ingestion-readiness-v1",
        tracked_worktree_clean: true,
      },
    }),
    /Exact approval is missing/,
  );
  assert.equal(databaseCalls, 0);
  assert.equal(fs.existsSync(path.join(outDir, "failure.json")), true);
});

test("executor orchestration uses separate baseline and post-rollback proofs", async () => {
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), "one-piece-pass-"));
  const proofObjects = [];
  const execution = await executeOnePieceProductionRollbackCanaryV1({
    args: executorArgs(outDir),
    approval: ONE_PIECE_ROLLBACK_APPROVAL,
    captureReadOnly: async ({ sourceExpectation, applicationName }) => {
      const proof = readOnlyProof(sourceExpectation);
      proof.application_name = applicationName;
      proofObjects.push(proof);
      return proof;
    },
    runTransaction: async () => ({
      transaction_started: true,
      transaction_read_only: "off",
      rollback_attempted: true,
      rollback_succeeded: true,
      transaction_readback: {
        batch_count: 1,
        row_count: 21,
        update_rejected: true,
        delete_rejected: true,
      },
      findings: [],
    }),
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true,
    },
  });
  assert.equal(execution.result.status, "rollback_canary_passed_zero_durable_change");
  assert.equal(proofObjects.length, 2);
  assert.notEqual(proofObjects[0].application_name, proofObjects[1].application_name);
  assert.equal(fs.existsSync(path.join(outDir, "transaction_proof.json")), true);
  assert.equal(fs.existsSync(path.join(outDir, "post_rollback_proof.json")), true);
  const hashes = JSON.parse(fs.readFileSync(path.join(outDir, "artifact_hashes.json")));
  for (const [name, expected] of Object.entries(hashes.artifacts)) {
    assert.equal(sha256(fs.readFileSync(path.join(outDir, name))), expected);
  }
});

test("executor still performs fresh post-rollback proof after a transaction failure", async () => {
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), "one-piece-fail-"));
  let readOnlyCalls = 0;
  await assert.rejects(
    executeOnePieceProductionRollbackCanaryV1({
      args: executorArgs(outDir),
      approval: ONE_PIECE_ROLLBACK_APPROVAL,
      captureReadOnly: async ({ sourceExpectation }) => {
        readOnlyCalls += 1;
        return readOnlyProof(sourceExpectation);
      },
      runTransaction: async () => {
        const error = new Error("transaction-local rejection");
        error.databaseProof = {
          transaction_started: true,
          transaction_read_only: "off",
          rollback_attempted: true,
          rollback_succeeded: true,
          findings: ["test_failure"],
        };
        throw error;
      },
      repository: {
        commit_sha: "a".repeat(40),
        branch: "agent/one-piece-ingestion-readiness-v1",
        tracked_worktree_clean: true,
      },
    }),
    /transaction-local rejection/,
  );
  assert.equal(readOnlyCalls, 2);
  const failure = JSON.parse(fs.readFileSync(path.join(outDir, "failure.json")));
  assert.equal(failure.rollback_succeeded, true);
  assert.equal(failure.fresh_post_rollback_attempted, true);
});

test("independent verifier blocks residue and accepts a clean fresh snapshot", () => {
  const expectation = buildOnePieceSourceExpectationV1(PLAN);
  const production = readOnlyProof(expectation);
  const executionSummary = {
    status: "rollback_canary_passed_zero_durable_change",
    canary_plan_fingerprint_sha256: PINNED_ONE_PIECE_CANARY_PLAN_SHA256,
    migration_draft_sha256: PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256,
    manifest_logical_sha256: PLAN.manifest_logical_sha256,
    selected_source_rows: 21,
    authorized_durable_rows: 0,
    findings: [],
    database_proof: {
      baseline: structuredClone(production),
      post_rollback: structuredClone(production),
      transaction: {
        transaction_read_only: "off",
        rollback_attempted: true,
        rollback_succeeded: true,
        transaction_readback: {
          batch_count: 1,
          row_count: 21,
          update_rejected: true,
          delete_rejected: true,
        },
        findings: [],
      },
    },
  };
  assert.deepEqual(
    evaluateIndependentOnePiecePostRollbackV1({
      plan: PLAN,
      executionSummary,
      production,
      sourceExpectation: expectation,
    }),
    [],
  );
  production.staging_footprint.policies.push("residual_policy");
  assert.deepEqual(
    evaluateIndependentOnePiecePostRollbackV1({
      plan: PLAN,
      executionSummary,
      production,
      sourceExpectation: expectation,
    }),
    ["staging_policies_present"],
  );
});

test("independent verifier rejects a failed execution summary before database access", async () => {
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), "one-piece-independent-block-"));
  const executionFile = path.join(outDir, "failed-summary.json");
  await fsp.writeFile(
    executionFile,
    `${JSON.stringify({ status: "blocked" }, null, 2)}\n`,
    "utf8",
  );
  let databaseCalls = 0;
  await assert.rejects(
    independentlyVerifyOnePieceRollbackV1({
      args: {
        verify: true,
        plan: PLAN_FILE,
        manifest: MANIFEST_FILE,
        migrationDraft: MIGRATION_FILE,
        executionSummary: executionFile,
        outDir: path.join(outDir, "verify"),
      },
      captureReadOnly: async () => {
        databaseCalls += 1;
      },
      repository: {
        commit_sha: "a".repeat(40),
        branch: "agent/one-piece-ingestion-readiness-v1",
      },
    }),
    /Execution summary failed local verification/,
  );
  assert.equal(databaseCalls, 0);
});

test("database executor contains rollback but no commit path", () => {
  const source = fs.readFileSync(
    path.join(
      ROOT,
      "scripts",
      "audits",
      "one_piece_canonical_import_rollback_db_v1.mjs",
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /client\.query\(["'`]commit["'`]\)/i);
  assert.match(source, /finally\s*\{[\s\S]*client\.query\(["'`]rollback["'`]\)/i);
  assert.match(source, /begin transaction isolation level serializable/i);
  assert.match(source, /begin transaction isolation level repeatable read read only/i);
});
