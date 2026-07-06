import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const MIGRATION_HASH = "E175C56D372A5AAF50464535A344562198C596A98A5273398AD001B1BF3339BD";
const DRY_RUN_HASH = "1E4EFBC6392D8F1FE95382072B07987ED08D93E9D9ED4A5EA6B5B2E7913B2036";
const READBACK_HASH = "1028BFA91ACCD43F128AA2E9BB874278AF988C25B7A216D5AC12C9C5AB41AEC2";

test("MEE core internal review dispositions schema candidate files and hashes are stable", () => {
  const candidate = source("docs/sql/mee_core_internal_review_dispositions_v1_migration_candidate.sql");
  const migration = source("supabase/migrations/20260625080000_market_evidence_review_dispositions_v1.sql");
  const dryRun = source("docs/sql/mee_core_internal_review_dispositions_v1_rollback_dry_run.sql");
  const readback = source("docs/sql/mee_core_internal_review_dispositions_v1_readback.sql");

  assert.equal(sha256(candidate), MIGRATION_HASH);
  assert.equal(sha256(migration), MIGRATION_HASH);
  assert.equal(sha256(dryRun), DRY_RUN_HASH);
  assert.equal(sha256(readback), READBACK_HASH);
  assert.equal(candidate, migration);

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1.md",
    "docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1/report.json",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core internal review dispositions schema candidate creates only the contracted internal table", () => {
  const stripped = stripSqlComments(
    source("docs/sql/mee_core_internal_review_dispositions_v1_migration_candidate.sql"),
  );

  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  assert.match(stripped, /create\s+table\s+if\s+not\s+exists\s+public\.market_evidence_review_dispositions/i);
  assert.match(stripped, /alter\s+table\s+public\.market_evidence_review_dispositions\s+enable\s+row\s+level\s+security/i);
  assert.match(stripped, /create\s+policy\s+market_evidence_review_dispositions_service_role_all/i);
  assert.match(stripped, /1::int\s+as\s+proposed_table_count/i);
  assert.match(stripped, /4::int\s+as\s+proposed_index_count/i);
  assert.match(stripped, /1::int\s+as\s+proposed_service_role_policy_count/i);
});

test("MEE core internal review dispositions schema candidate enforces review workflow vocabulary", () => {
  const stripped = stripSqlComments(
    source("docs/sql/mee_core_internal_review_dispositions_v1_migration_candidate.sql"),
  );

  for (const token of [
    "high_signal_review",
    "candidate_review",
    "classification_review",
    "reference_only_review",
    "low_signal_monitor",
    "review_confirmed_internal_candidate",
    "review_split_required",
    "review_blocked",
    "review_defer_more_evidence",
    "review_reclassify",
    "review_blocked_classification",
    "review_reference_crosscheck",
    "review_defer_active_market_evidence",
  ]) {
    assert.match(stripped, new RegExp(`'${token}'`, "i"));
  }
});

test("MEE core internal review dispositions schema candidate cannot publish prices", () => {
  const stripped = stripSqlComments(
    source("docs/sql/mee_core_internal_review_dispositions_v1_migration_candidate.sql"),
  );

  assert.match(stripped, /publication_gate_candidate\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /can_publish_price_directly\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /publishable\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /app_visible\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /market_truth\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /market_evidence_review_dispositions_no_public_direct_check/i);
  assert.match(stripped, /publication_gate_candidate\s*=\s*false[\s\S]*can_publish_price_directly\s*=\s*false[\s\S]*publishable\s*=\s*false[\s\S]*app_visible\s*=\s*false[\s\S]*market_truth\s*=\s*false/i);

  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bon\s+conflict\b/i);
  assert.doesNotMatch(stripped, /\bpricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bv_card_pricing_ui_v1\b/i);
});

test("MEE core internal review dispositions schema candidate is service-role only", () => {
  const stripped = stripSqlComments(
    source("docs/sql/mee_core_internal_review_dispositions_v1_migration_candidate.sql"),
  );

  assert.match(stripped, /revoke\s+all\s+on\s+public\.market_evidence_review_dispositions\s+from\s+public,\s+anon,\s+authenticated/i);
  assert.match(stripped, /grant\s+select,\s+insert,\s+update\s+on\s+public\.market_evidence_review_dispositions\s+to\s+service_role/i);
  assert.doesNotMatch(stripped, /\bto\s+(anon|authenticated|public)\b/i);
});

test("MEE core internal review dispositions rollback proof stays rollback-only", () => {
  const stripped = stripSqlComments(source("docs/sql/mee_core_internal_review_dispositions_v1_rollback_dry_run.sql"));

  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /rollback\s*;\s*$/i);
  assert.doesNotMatch(stripped, /commit\s*;/i);
  assert.match(stripped, /create\s+table\s+if\s+not\s+exists\s+public\.market_evidence_review_dispositions/i);
  assert.match(stripped, /true::boolean\s+as\s+rollback_only/i);
});

test("MEE core internal review dispositions report preserves boundaries", () => {
  const report = JSON.parse(
    source("docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1/report.json"),
  );

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SCHEMA-CANDIDATE-V1");
  assert.equal(report.mode, "plan_only_local_schema_candidate");
  assert.equal(report.migration_hash_sha256, MIGRATION_HASH);
  assert.equal(report.sql_candidate_hash_sha256, MIGRATION_HASH);
  assert.equal(report.rollback_dry_run_sql_hash_sha256, DRY_RUN_HASH);
  assert.equal(report.readback_sql_hash_sha256, READBACK_HASH);
  assert.deepEqual(report.proposed_objects, ["public.market_evidence_review_dispositions"]);
  assert.deepEqual(report.findings, []);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});
