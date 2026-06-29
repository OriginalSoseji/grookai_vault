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

test("MEE core internal review action events schema report is complete", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1/report.json"),
  );

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1");
  assert.equal(report.mode, "plan_only_internal_review_action_events_schema_candidate");
  assert.deepEqual(report.findings, []);

  assert.equal(report.source_workflow.package_id, "MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1");
  assert.equal(report.source_workflow.fingerprint_sha256, "7ac114dcbb32b8b28d4712671c4de268decbb24dcbbda7025d2a0a7ae6386835");
  assert.equal(report.schema_candidate.migration_file, "supabase/migrations/20260625090000_market_evidence_review_action_events_v1.sql");
  assert.equal(report.schema_candidate.table_name, "public.market_evidence_review_action_events");
  assert.equal(report.schema_candidate.proposed_table_count, 1);
  assert.equal(report.schema_candidate.proposed_index_count, 4);
  assert.equal(report.schema_candidate.proposed_service_role_policy_count, 2);
  assert.deepEqual(report.schema_candidate.allowed_actions, expectedActions);
  assert.deepEqual(report.schema_candidate.allowed_reason_codes, expectedReasonCodes);
  assert.deepEqual(report.schema_candidate.grants, ["service_role: select", "service_role: insert"]);
  assert.equal(report.schema_candidate.no_update_grant, true);
  assert.equal(report.schema_candidate.no_delete_grant, true);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core internal review action events schema hashes match generated artifacts", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1/report.json"),
  );
  const migration = read("supabase/migrations/20260625090000_market_evidence_review_action_events_v1.sql");
  const sqlCandidate = read("docs/sql/mee_core_internal_review_action_events_v1_migration_candidate.sql");
  const rollback = read("docs/sql/mee_core_internal_review_action_events_v1_rollback_dry_run.sql");
  const readback = read("docs/sql/mee_core_internal_review_action_events_v1_readback.sql");

  assert.equal(sqlCandidate, migration);
  assert.equal(sha256(migration), report.hashes.migration_sql_sha256);
  assert.equal(sha256(rollback), report.hashes.rollback_dry_run_sql_sha256);
  assert.equal(sha256(readback), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.migration_sql_sha256, "8b56c0f2edd36aac3e47fb376a87c02ee22b31da1202848f44af83a6e9b33216");
  assert.equal(report.hashes.rollback_dry_run_sql_sha256, "17de6731c5e2554dfb6ba2bc44b780d2b73d2c65c4b96f6dc78d66d4d1709df7");
  assert.equal(report.hashes.readback_sql_sha256, "cdd0a1205e37c01a137d7d207ca830bb4d3e3c23df249a2113cf4ff04d2d3b0c");
});

test("MEE core internal review action events migration creates only append-only internal event tracking", () => {
  const sql = stripSqlComments(read("supabase/migrations/20260625090000_market_evidence_review_action_events_v1.sql"));

  assert.match(sql, /create\s+table\s+if\s+not\s+exists\s+public\.market_evidence_review_action_events/i);
  assert.match(sql, /disposition_id\s+uuid\s+not\s+null\s+references\s+public\.market_evidence_review_dispositions\(id\)/i);
  assert.match(sql, /constraint\s+market_evidence_review_action_events_action_check/i);
  assert.match(sql, /constraint\s+market_evidence_review_action_events_reason_check/i);
  assert.match(sql, /constraint\s+market_evidence_review_action_events_reason_required_check/i);
  assert.match(sql, /constraint\s+market_evidence_review_action_events_transition_check/i);
  assert.match(sql, /constraint\s+market_evidence_review_action_events_no_public_direct_check/i);
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

  assert.match(sql, /create\s+policy\s+market_evidence_review_action_events_service_role_select/i);
  assert.match(sql, /create\s+policy\s+market_evidence_review_action_events_service_role_insert/i);
  assert.match(sql, /revoke\s+all\s+on\s+public\.market_evidence_review_action_events\s+from\s+public,\s+anon,\s+authenticated/i);
  assert.match(sql, /grant\s+select,\s+insert\s+on\s+public\.market_evidence_review_action_events\s+to\s+service_role/i);
  assert.doesNotMatch(sql, /grant\s+select,\s+insert,\s+update/i);
  assert.doesNotMatch(sql, /grant\s+.*delete/i);

  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.market_evidence_review_dispositions\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.market_evidence_review_dispositions\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\s+public\.market_evidence_review_dispositions\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bv_card_pricing_ui_v1\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
});

test("MEE core internal review action events rollback proof is rollback-only", () => {
  const sql = stripSqlComments(read("docs/sql/mee_core_internal_review_action_events_v1_rollback_dry_run.sql"));

  assert.match(sql, /^\s*begin;/i);
  assert.match(sql, /drop\s+table\s+if\s+exists\s+public\.market_evidence_review_action_events/i);
  assert.match(sql, /rollback;\s*$/i);
  assert.match(sql, /rollback_only/i);
  assert.match(sql, /false::boolean\s+as\s+persisted_change/i);
  assert.doesNotMatch(sql, /commit;/i);
});

test("MEE core internal review action events generator stays local and plan-only", () => {
  const script = read("scripts/audits/market_evidence_review_action_events_schema_candidate_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1/);
  assert.match(script, /remote_migration_apply: false/);
  assert.match(script, /db_writes: false/);
  assert.match(script, /provider_calls: false/);
  assert.match(script, /source_fetches: false/);
  assert.match(script, /disposition_updates: false/);
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
    "supabase/migrations/20260625090000_market_evidence_review_action_events_v1.sql",
    "docs/sql/mee_core_internal_review_action_events_v1_migration_candidate.sql",
    "docs/sql/mee_core_internal_review_action_events_v1_rollback_dry_run.sql",
    "docs/sql/mee_core_internal_review_action_events_v1_readback.sql",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1/report.json",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
