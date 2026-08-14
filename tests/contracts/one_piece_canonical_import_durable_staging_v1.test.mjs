import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceDurableStagingPlanV1,
  sha256,
  validateOnePieceDurableStagingSqlV1,
  verifyOnePieceDurableStagingPlanV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_v1.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION_FILE = path.join(
  ROOT,
  "docs",
  "sql",
  "one_piece_canonical_import_durable_staging_schema_v1_migration_candidate.sql",
);
const ROLLBACK_FILE = path.join(
  ROOT,
  "docs",
  "sql",
  "one_piece_canonical_import_durable_staging_schema_v1_rollback_candidate.sql",
);
const OLD_DRAFT = path.join(
  ROOT,
  "supabase",
  "migration_drafts",
  "20260814010000_one_piece_canonical_import_staging_v1.sql",
);
const SCRIPT = fs.readFileSync(
  path.join(ROOT, "scripts", "audits", "one_piece_canonical_import_durable_staging_plan_v1.mjs"),
  "utf8",
);
const MIGRATION_SQL = fs.readFileSync(MIGRATION_FILE, "utf8");
const ROLLBACK_SQL = fs.readFileSync(ROLLBACK_FILE, "utf8");

function fixturePlan() {
  return buildOnePieceDurableStagingPlanV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
    },
    migrationCandidateFile: "docs/sql/migration.sql",
    migrationCandidateSha256: sha256(MIGRATION_SQL),
    rollbackCandidateFile: "docs/sql/rollback.sql",
    rollbackCandidateSha256: sha256(ROLLBACK_SQL),
    executionSummaryFile: "execution/summary.json",
    executionSummarySha256: "b".repeat(64),
    executionStatus: "rollback_canary_passed_zero_durable_change",
    independentSummaryFile: "independent/summary.json",
    independentSummarySha256: "c".repeat(64),
    independentStatus: "rollback_independently_verified",
  });
}

test("passed rollback-only One Piece migration draft remains byte-identical", () => {
  assert.equal(
    sha256(fs.readFileSync(OLD_DRAFT)),
    "7eece6ff093de56b5cbea6a0a1f03a5a9b469789f11de233ac9fab90b4e80591",
  );
});

test("durable candidate remains unapplied and separate from the passed canary draft", () => {
  assert.equal(fs.existsSync(MIGRATION_FILE), true);
  assert.equal(
    fs.existsSync(
      path.join(
        ROOT,
        "supabase",
        "migrations",
        "20260814120000_one_piece_canonical_import_durable_staging_v1.sql",
      ),
    ),
    false,
  );
  assert.notEqual(sha256(MIGRATION_SQL), sha256(fs.readFileSync(OLD_DRAFT)));
});

test("durable candidate is FORCE-RLS service-only immutable evidence staging", () => {
  const validation = validateOnePieceDurableStagingSqlV1({
    migrationSql: MIGRATION_SQL,
    rollbackSql: ROLLBACK_SQL,
  });
  assert.deepEqual(validation, { valid: true, findings: [] });
  assert.match(MIGRATION_SQL, /staging_mode = 'durable_service_only'/);
  assert.match(MIGRATION_SQL, /source_category_id = 68/);
  assert.match(MIGRATION_SQL, /authorized_durable_batch_rows = 1/);
  assert.match(MIGRATION_SQL, /authorized_durable_staging_rows > 0/);
  assert.doesNotMatch(MIGRATION_SQL, /grant\s+(?:all|update|delete|execute)/i);
});

test("rollback candidate refuses populated staging and later migrations", () => {
  assert.match(ROLLBACK_SQL, /batch_rows <> 0 or staging_rows <> 0/i);
  assert.match(ROLLBACK_SQL, /later_migrations <> 0/i);
  assert.match(ROLLBACK_SQL, /where version = '20260814120000'/i);
  assert.doesNotMatch(
    ROLLBACK_SQL,
    /(?:drop|delete from|truncate)\s+public\.(?:games|sets|card_prints|card_printings|sealed_products|vault_items)/i,
  );
});

test("durable schema plan validates and keeps every current mutation boundary closed", () => {
  const plan = fixturePlan();
  assert.deepEqual(verifyOnePieceDurableStagingPlanV1(plan), {
    valid: true,
    findings: [],
  });
  assert.equal(plan.apply_contract.expected_durable_data_rows, 0);
  assert.equal(plan.production_read_only_preflight.database_writes, false);
  assert.equal(plan.security_contract.service_role_function_execute, false);
  assert.equal(plan.security_contract.app_rpc, false);
});

test("durable schema plan fails closed on fingerprint or boundary drift", () => {
  const plan = fixturePlan();
  plan.boundaries.canonical_promotion = true;
  const result = verifyOnePieceDurableStagingPlanV1(plan);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("plan_fingerprint_mismatch"));
  assert.ok(result.findings.includes("current_gate_boundary_open"));
});

test("offline generator has no database or environment imports", () => {
  assert.doesNotMatch(SCRIPT, /from\s+["']pg["']/);
  assert.doesNotMatch(SCRIPT, /marketEvidenceDbUrl|new Client\s*\(/);
  assert.doesNotMatch(SCRIPT, /backend\/env\.mjs/);
});
