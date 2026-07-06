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

const MIGRATION_HASH = "5D26257DB0C987922B942E56D7E8924901784A31FDCCDE9C21740EA0CA30D5E1";
const DRY_RUN_HASH = "9796D2B503BC9C86987CEB7E0CEB53E24EAF91EA41C4A3A8C58BD8B7500426AB";

test("MEE core internal evidence read model schema candidate files and hashes are stable", () => {
  const candidate = source("docs/sql/mee_core_internal_evidence_read_model_v1_migration_candidate.sql");
  const migration = source("supabase/migrations/20260625070000_market_evidence_internal_read_model_v1.sql");
  const dryRun = source("docs/sql/mee_core_internal_evidence_read_model_v1_rollback_dry_run.sql");
  const readback = source("docs/sql/mee_core_internal_evidence_read_model_v1_readback.sql");

  assert.equal(sha256(candidate), MIGRATION_HASH);
  assert.equal(sha256(migration), MIGRATION_HASH);
  assert.equal(sha256(dryRun), DRY_RUN_HASH);
  assert.equal(candidate, migration);
  assert.match(readback, /MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1_READBACK/);

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1.md",
    "docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1/report.json",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core internal evidence read model migration candidate creates only the contracted internal views", () => {
  const stripped = stripSqlComments(
    source("docs/sql/mee_core_internal_evidence_read_model_v1_migration_candidate.sql"),
  );

  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_card_signal_summary_v1/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_card_review_queue_v1/i);
  assert.match(stripped, /with\s*\(\s*security_invoker\s*=\s*true\s*\)/i);
  assert.match(stripped, /from\s+public\.market_evidence_lifecycle_events/i);
  assert.match(stripped, /from\s+public\.market_evidence_observations/i);
  assert.match(stripped, /false\s+as\s+publishable/i);
  assert.match(stripped, /false\s+as\s+app_visible/i);
  assert.match(stripped, /false\s+as\s+market_truth/i);
});

test("MEE core internal evidence read model migration candidate is service-role oriented", () => {
  const stripped = stripSqlComments(
    source("docs/sql/mee_core_internal_evidence_read_model_v1_migration_candidate.sql"),
  );

  for (const viewName of [
    "v_market_evidence_card_signal_summary_v1",
    "v_market_evidence_card_review_queue_v1",
  ]) {
    assert.match(
      stripped,
      new RegExp(`revoke\\s+all\\s+on\\s+public\\.${viewName}\\s+from\\s+public,\\s+anon,\\s+authenticated`, "i"),
    );
    assert.match(stripped, new RegExp(`grant\\s+select\\s+on\\s+public\\.${viewName}\\s+to\\s+service_role`, "i"));
  }
});

test("MEE core internal evidence read model migration candidate does not publish or mutate app pricing", () => {
  const stripped = stripSqlComments(
    source("docs/sql/mee_core_internal_evidence_read_model_v1_migration_candidate.sql"),
  );

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

test("MEE core internal evidence read model rollback proof stays rollback-only", () => {
  const stripped = stripSqlComments(source("docs/sql/mee_core_internal_evidence_read_model_v1_rollback_dry_run.sql"));

  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /rollback\s*;\s*$/i);
  assert.doesNotMatch(stripped, /commit\s*;/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_card_signal_summary_v1/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_card_review_queue_v1/i);
  assert.match(stripped, /true::boolean\s+as\s+rollback_only/i);
});

test("MEE core internal evidence read model schema candidate report preserves boundaries", () => {
  const report = JSON.parse(
    source("docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1/report.json"),
  );

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-EVIDENCE-READ-MODEL-SCHEMA-CANDIDATE-V1");
  assert.equal(report.mode, "plan_only_local_schema_candidate");
  assert.equal(report.migration_hash_sha256, MIGRATION_HASH);
  assert.equal(report.sql_candidate_hash_sha256, MIGRATION_HASH);
  assert.equal(report.rollback_dry_run_sql_hash_sha256, DRY_RUN_HASH);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.proposed_objects, [
    "public.v_market_evidence_card_signal_summary_v1",
    "public.v_market_evidence_card_review_queue_v1",
  ]);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});
