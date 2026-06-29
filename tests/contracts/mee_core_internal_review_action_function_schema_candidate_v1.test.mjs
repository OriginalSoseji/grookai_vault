import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const expectedActions = [
  "start_review",
  "confirm_internal_candidate",
  "require_split",
  "block_evidence",
  "block_classification",
  "request_reclassification",
  "defer_more_evidence",
  "reference_crosscheck",
  "defer_active_market_evidence",
  "confirm_monitor_only",
];

const expectedReasonCodes = [
  "approved_internal_raw_single_signal",
  "approved_internal_slab_signal",
  "mixed_raw_slab_requires_split",
  "classification_noise",
  "wrong_identity",
  "unresolved_match_ambiguity",
  "lot_bulk_sealed_proxy_noise",
  "reference_only_no_market_support",
  "low_signal_sample",
  "insufficient_source_independence",
  "stale_signal",
  "special_lane_ambiguous",
  "manual_hold",
];

test("MEE core internal review action function schema report is complete", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-CANDIDATE-V1/report.json"),
  );

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-CANDIDATE-V1");
  assert.equal(report.mode, "plan_only_internal_review_action_function_schema_candidate");
  assert.deepEqual(report.findings, []);

  assert.equal(report.source_workflow.package_id, "MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1");
  assert.equal(report.source_workflow.fingerprint_sha256, "7ac114dcbb32b8b28d4712671c4de268decbb24dcbbda7025d2a0a7ae6386835");
  assert.equal(report.source_action_events_schema.package_id, "MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1");
  assert.equal(report.source_action_events_schema.migration_hash_sha256, "8b56c0f2edd36aac3e47fb376a87c02ee22b31da1202848f44af83a6e9b33216");

  assert.equal(report.schema_candidate.migration_file, "supabase/migrations/20260625100000_market_evidence_review_action_function_v1.sql");
  assert.equal(report.schema_candidate.function_name, "public.apply_market_evidence_review_action_v1");
  assert.equal(report.schema_candidate.proposed_function_count, 1);
  assert.deepEqual(report.schema_candidate.allowed_actions, expectedActions);
  assert.deepEqual(report.schema_candidate.allowed_reason_codes, expectedReasonCodes);
  assert.deepEqual(report.schema_candidate.grants, ["service_role: execute"]);
  assert.equal(report.schema_candidate.optimistic_locking, true);
  assert.equal(report.schema_candidate.public_flags_forced_false, true);
  assert.deepEqual(report.schema_candidate.writes_when_invoked, [
    "insert one market_evidence_review_action_events row",
    "update only the matching market_evidence_review_dispositions row",
  ]);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core internal review action function schema hashes match generated artifacts", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-CANDIDATE-V1/report.json"),
  );
  const migration = read("supabase/migrations/20260625100000_market_evidence_review_action_function_v1.sql");
  const sqlCandidate = read("docs/sql/mee_core_internal_review_action_function_v1_migration_candidate.sql");
  const noop = read("docs/sql/mee_core_internal_review_action_function_v1_noop_dry_run.sql");
  const rollback = read("docs/sql/mee_core_internal_review_action_function_v1_rollback_dry_run.sql");
  const readback = read("docs/sql/mee_core_internal_review_action_function_v1_readback.sql");

  assert.equal(sqlCandidate, migration);
  assert.equal(sha256(migration), report.hashes.migration_sql_sha256);
  assert.equal(sha256(noop), report.hashes.noop_dry_run_sql_sha256);
  assert.equal(sha256(rollback), report.hashes.rollback_dry_run_sql_sha256);
  assert.equal(sha256(readback), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.migration_sql_sha256, "99132c3c9f7f17715acfe8e67b26f1b5cd9811d69734a21ffb7ecf795a76de3b");
  assert.equal(report.hashes.noop_dry_run_sql_sha256, "dfa5a9ec92581af2fc82e2da2a2ea274a48e3feb7f43b3ec48c98e9f5dac504a");
  assert.equal(report.hashes.rollback_dry_run_sql_sha256, "32b575f360899b009a345a4014e224226e4c9ca2442c1c4dd6c580ba665b14a7");
  assert.equal(report.hashes.readback_sql_sha256, "3d3c8462aa7a1f88ca4c9dbc772cc35ea57f33e32701bf174a804ab089697b15");
});

test("MEE core internal review action function migration creates only the guarded function", () => {
  const sql = stripSqlComments(read("supabase/migrations/20260625100000_market_evidence_review_action_function_v1.sql"));

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.apply_market_evidence_review_action_v1/i);
  assert.match(sql, /security\s+definer/i);
  assert.match(sql, /set\s+search_path\s+=\s+public,\s+pg_temp/i);
  assert.match(sql, /for\s+update/i);
  assert.match(sql, /v_row\.updated_at\s+is\s+distinct\s+from\s+p_expected_updated_at/i);
  assert.match(sql, /review_disposition_optimistic_lock_failed/i);
  assert.match(sql, /insert\s+into\s+public\.market_evidence_review_action_events/i);
  assert.match(sql, /update\s+public\.market_evidence_review_dispositions/i);
  assert.match(sql, /where\s+id\s+=\s+v_row\.id\s+and\s+updated_at\s+is\s+not\s+distinct\s+from\s+p_expected_updated_at/i);
  assert.match(sql, /publication_gate_candidate\s+=\s+false/i);
  assert.match(sql, /can_publish_price_directly\s+=\s+false/i);
  assert.match(sql, /publishable\s+=\s+false/i);
  assert.match(sql, /app_visible\s+=\s+false/i);
  assert.match(sql, /market_truth\s+=\s+false/i);

  for (const action of expectedActions) {
    assert.match(sql, new RegExp(`'${action}'`));
  }
  for (const reasonCode of expectedReasonCodes) {
    assert.match(sql, new RegExp(`'${reasonCode}'`));
  }

  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.apply_market_evidence_review_action_v1/i);
  assert.match(sql, /from\s+public,\s+anon,\s+authenticated/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.apply_market_evidence_review_action_v1/i);
  assert.match(sql, /to\s+service_role/i);

  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bv_card_pricing_ui_v1\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /\bcreate\s+table\b/i);
});

test("MEE core internal review action function no-op and rollback SQL do not invoke the function", () => {
  const noop = stripSqlComments(read("docs/sql/mee_core_internal_review_action_function_v1_noop_dry_run.sql"));
  const rollback = stripSqlComments(read("docs/sql/mee_core_internal_review_action_function_v1_rollback_dry_run.sql"));

  assert.match(noop, /function_invoked/i);
  assert.match(noop, /false::boolean\s+as\s+function_invoked/i);
  assert.match(noop, /false::boolean\s+as\s+disposition_updates/i);
  assert.match(noop, /false::boolean\s+as\s+action_event_inserts/i);
  assert.match(noop, /from\s+pg_proc/i);
  assert.doesNotMatch(noop, /apply_market_evidence_review_action_v1\s*\(/i);
  assert.doesNotMatch(noop, /\binsert\s+into\b/i);
  assert.doesNotMatch(noop, /\bupdate\s+public\./i);
  assert.doesNotMatch(noop, /\bdelete\s+from\b/i);

  assert.match(rollback, /^\s*begin;/i);
  assert.match(rollback, /drop\s+function\s+if\s+exists\s+public\.apply_market_evidence_review_action_v1/i);
  assert.match(rollback, /rollback;\s*$/i);
  assert.match(rollback, /false::boolean\s+as\s+persisted_change/i);
  assert.doesNotMatch(rollback, /commit;/i);
});

test("MEE core internal review action function generator stays local and plan-only", () => {
  const script = read("scripts/audits/market_evidence_review_action_function_schema_candidate_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-CANDIDATE-V1/);
  assert.match(script, /remote_migration_apply: false/);
  assert.match(script, /db_writes: false/);
  assert.match(script, /provider_calls: false/);
  assert.match(script, /source_fetches: false/);
  assert.match(script, /actual_action_event_inserts: false/);
  assert.match(script, /actual_disposition_updates: false/);
  assert.match(script, /public_pricing_views: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.match(script, /public_price_rollups: false/);

  assert.doesNotMatch(script, /execFileSync\s*\(\s*["']supabase["']/);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.from\([^)]*\)\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /https\.request/);

  for (const artifactPath of [
    "supabase/migrations/20260625100000_market_evidence_review_action_function_v1.sql",
    "docs/sql/mee_core_internal_review_action_function_v1_migration_candidate.sql",
    "docs/sql/mee_core_internal_review_action_function_v1_noop_dry_run.sql",
    "docs/sql/mee_core_internal_review_action_function_v1_rollback_dry_run.sql",
    "docs/sql/mee_core_internal_review_action_function_v1_readback.sql",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-CANDIDATE-V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-CANDIDATE-V1/report.json",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
