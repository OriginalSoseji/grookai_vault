import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(source(relativePath));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const MIGRATION_HASH = "6D3A3020D74E6B114792A917D2A57FBCCA64DFCB2A2F25364148491ED6317DE7";
const ROLLBACK_HASH = "1A56D2C5BEAC42E02B5858640BE2AD579CFE6470EFE3F39D0B932F10E68EA96C";
const READBACK_HASH = "FA4B3B3C2BE417A400F037190513B0A3E9622813F7DDE3DA017C7316B32E1FFA";
const candidatePath = "docs/sql/mee_core_quality_scoring_read_model_v1_migration_candidate.sql";
const migrationPath = "supabase/migrations/20260625110000_market_evidence_quality_scoring_read_model_v1.sql";
const rollbackPath = "docs/sql/mee_core_quality_scoring_read_model_v1_rollback_dry_run.sql";
const readbackPath = "docs/sql/mee_core_quality_scoring_read_model_v1_schema_readback.sql";
const reportPath =
  "docs/audits/market_evidence_engine_v1/MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1/report.json";
const scriptPath = "scripts/audits/market_evidence_quality_scoring_read_model_schema_candidate_v1.mjs";

test("MEE quality scoring schema candidate files and hashes are stable", () => {
  const candidate = source(candidatePath);
  const migration = source(migrationPath);
  const rollback = source(rollbackPath);
  const readback = source(readbackPath);

  assert.equal(candidate, migration);
  assert.equal(sha256(candidate), MIGRATION_HASH);
  assert.equal(sha256(migration), MIGRATION_HASH);
  assert.equal(sha256(rollback), ROLLBACK_HASH);
  assert.equal(sha256(readback), READBACK_HASH);
});

test("MEE quality scoring schema candidate creates only the internal quality view", () => {
  const stripped = stripSqlComments(source(candidatePath));

  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_candidate_quality_scores_v1/i);
  assert.match(stripped, /with\s*\(\s*security_invoker\s*=\s*true\s*\)/i);
  assert.match(stripped, /from\s+public\.market_evidence_review_dispositions/i);
  assert.match(stripped, /from\s+public\.market_listing_card_candidates/i);
  assert.match(stripped, /false\s+as\s+can_auto_confirm_internal_candidate/i);
  assert.match(stripped, /false\s+as\s+publishable/i);
  assert.match(stripped, /false\s+as\s+app_visible/i);
  assert.match(stripped, /false\s+as\s+market_truth/i);
});

test("MEE quality scoring schema candidate is service-role only", () => {
  const stripped = stripSqlComments(source(candidatePath));

  assert.match(
    stripped,
    /revoke\s+all\s+on\s+public\.v_market_evidence_candidate_quality_scores_v1\s+from\s+public,\s+anon,\s+authenticated/i,
  );
  assert.match(
    stripped,
    /grant\s+select\s+on\s+public\.v_market_evidence_candidate_quality_scores_v1\s+to\s+service_role/i,
  );
});

test("MEE quality scoring schema candidate does not publish or mutate pricing", () => {
  const stripped = stripSqlComments(source(candidatePath));

  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bon\s+conflict\b/i);
  assert.doesNotMatch(stripped, /\bpricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bv_card_pricing_ui_v1\b/i);
  assert.doesNotMatch(stripped, /\bjusttcg\b/i);
});

test("MEE quality scoring rollback proof stays rollback-only", () => {
  const stripped = stripSqlComments(source(rollbackPath));

  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /drop\s+view\s+if\s+exists\s+public\.v_market_evidence_candidate_quality_scores_v1/i);
  assert.match(stripped, /true::boolean\s+as\s+rollback_only/i);
  assert.match(stripped, /rollback\s*;\s*$/i);
  assert.doesNotMatch(stripped, /commit\s*;/i);
});

test("MEE quality scoring schema candidate report preserves boundaries and approval prompt", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-CANDIDATE-V1");
  assert.equal(report.mode, "plan_only_local_schema_candidate");
  assert.equal(report.migration_hash_sha256, MIGRATION_HASH);
  assert.equal(report.rollback_dry_run_sql_hash_sha256, ROLLBACK_HASH);
  assert.equal(report.readback_sql_hash_sha256, READBACK_HASH);
  assert.deepEqual(report.proposed_objects, ["public.v_market_evidence_candidate_quality_scores_v1"]);
  assert.deepEqual(report.findings, []);
  assert.match(report.approval_prompt, /Approve real MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-V1/);
  assert.match(report.approval_prompt, new RegExp(MIGRATION_HASH));

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE quality scoring schema candidate artifacts are present and generator remains local", () => {
  const script = source(scriptPath);

  for (const artifactPath of [
    candidatePath,
    migrationPath,
    rollbackPath,
    readbackPath,
    reportPath,
    "docs/audits/market_evidence_engine_v1/MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1.md",
    "docs/contracts/MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1.md",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1.md",
    "docs/checkpoints/market_evidence_engine/MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1.md",
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
  assert.doesNotMatch(script, /execFileSync\(\s*["']supabase/i);
  assert.doesNotMatch(script, /\bsupabase\s+db\b/i);
  assert.doesNotMatch(script, /\bfetch\s*\(/i);
  assert.doesNotMatch(script, /\bhttps\.request\b/i);
});
