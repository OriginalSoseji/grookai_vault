import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-ACTION-MODEL-V1/report.json";
const manifestPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-ACTION-MODEL-V1/schema_manifest.json";
const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-ACTION-MODEL-V1.md";
const contractPath = "docs/contracts/MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1.md";
const migrationPath = "supabase/migrations/20260625120000_market_listing_candidate_cleanup_action_model_v1.sql";
const candidateSqlPath = "docs/sql/mee_candidate_cleanup_action_model_v1_migration_candidate.sql";
const rollbackPath = "docs/sql/mee_candidate_cleanup_action_model_v1_rollback_dry_run.sql";
const readbackPath = "docs/sql/mee_candidate_cleanup_action_model_v1_readback.sql";

const expectedActions = [
  "keep_review",
  "quarantine_candidate",
  "require_matcher_reclassify",
  "require_special_lane_policy",
  "require_high_value_review",
  "defer_until_more_evidence",
];

const expectedStates = [
  "review_open",
  "quarantined",
  "needs_matcher_reclassify",
  "needs_special_lane_policy",
  "needs_high_value_review",
  "deferred_more_evidence",
];

test("candidate cleanup action model report is plan-only", () => {
  const report = loadJson(reportPath);
  const manifest = loadJson(manifestPath);

  assert.equal(report.package_id, "MEE-CANDIDATE-CLEANUP-ACTION-MODEL-V1");
  assert.equal(manifest.package_id, report.package_id);
  assert.equal(report.remote_apply, false);
  assert.equal(report.db_writes, false);
  assert.equal(report.function_invocation, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.source_fetches, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
  assert.deepEqual(report.findings, []);
});

test("candidate cleanup action model defines expected actions and states", () => {
  const manifest = loadJson(manifestPath);

  assert.deepEqual(manifest.allowed_cleanup_actions, expectedActions);
  assert.deepEqual(manifest.allowed_cleanup_states, expectedStates);
  assert.equal(manifest.proposed_objects.tables[0], "public.market_listing_candidate_cleanup_events");
  assert.deepEqual(manifest.proposed_objects.views, [
    "public.v_market_listing_candidate_cleanup_current_v1",
    "public.v_market_listing_candidate_cleanup_card_summary_v1",
  ]);
  assert.equal(manifest.no_update_grant, true);
  assert.equal(manifest.no_delete_grant, true);
});

test("candidate cleanup migration is append-only and internal-only", () => {
  const sql = stripSqlComments(read(migrationPath));

  assert.match(sql, /create\s+table\s+if\s+not\s+exists\s+public\.market_listing_candidate_cleanup_events/i);
  assert.match(sql, /candidate_id\s+uuid\s+not\s+null\s+references\s+public\.market_listing_card_candidates\(id\)/i);
  assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_market_listing_candidate_cleanup_current_v1/i);
  assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_market_listing_candidate_cleanup_card_summary_v1/i);
  assert.match(sql, /alter\s+table\s+public\.market_listing_candidate_cleanup_events\s+enable\s+row\s+level\s+security/i);
  assert.match(sql, /grant\s+select,\s+insert\s+on\s+public\.market_listing_candidate_cleanup_events\s+to\s+service_role/i);
  assert.match(sql, /grant\s+select\s+on\s+public\.v_market_listing_candidate_cleanup_current_v1\s+to\s+service_role/i);
  assert.match(sql, /grant\s+select\s+on\s+public\.v_market_listing_candidate_cleanup_card_summary_v1\s+to\s+service_role/i);
  assert.match(sql, /revoke\s+all\s+on\s+public\.market_listing_candidate_cleanup_events\s+from\s+public,\s+anon,\s+authenticated/i);

  for (const action of expectedActions) {
    assert.match(sql, new RegExp(`'${action}'`));
  }

  assert.match(sql, /can_publish_price_directly\s+=\s+false/i);
  assert.match(sql, /publishable\s+=\s+false/i);
  assert.match(sql, /app_visible\s+=\s+false/i);
  assert.match(sql, /market_truth\s+=\s+false/i);
  assert.match(sql, /can_publish_price_directly_at_action\s+=\s+false/i);

  assert.doesNotMatch(sql, /grant\s+.*update/i);
  assert.doesNotMatch(sql, /grant\s+.*delete/i);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.market_listing_card_candidates\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\s+public\.market_listing_card_candidates\b/i);
  assert.doesNotMatch(sql, /apply_market_evidence_review_action_v1\s*\(/i);
});

test("candidate cleanup migration mirror and hashes are stable", () => {
  const report = loadJson(reportPath);
  const migration = read(migrationPath);
  const candidate = read(candidateSqlPath);
  const rollback = read(rollbackPath);
  const readback = read(readbackPath);

  assert.equal(candidate, migration);
  assert.equal(sha256(migration), report.artifact_hashes_sha256[migrationPath]);
  assert.equal(sha256(candidate), report.artifact_hashes_sha256[candidateSqlPath]);
  assert.equal(sha256(rollback), report.artifact_hashes_sha256[rollbackPath]);
  assert.equal(sha256(readback), report.artifact_hashes_sha256[readbackPath]);
});

test("candidate cleanup rollback proof is rollback-only", () => {
  const sql = stripSqlComments(read(rollbackPath));

  assert.match(sql, /^\s*begin;/i);
  assert.match(sql, /drop\s+view\s+if\s+exists\s+public\.v_market_listing_candidate_cleanup_card_summary_v1/i);
  assert.match(sql, /drop\s+view\s+if\s+exists\s+public\.v_market_listing_candidate_cleanup_current_v1/i);
  assert.match(sql, /drop\s+table\s+if\s+exists\s+public\.market_listing_candidate_cleanup_events/i);
  assert.match(sql, /rollback;\s*$/i);
  assert.doesNotMatch(sql, /commit;/i);
});

test("candidate cleanup action model artifacts exist", () => {
  for (const artifactPath of [
    reportPath,
    manifestPath,
    markdownPath,
    contractPath,
    planPath,
    migrationPath,
    candidateSqlPath,
    rollbackPath,
    readbackPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});

