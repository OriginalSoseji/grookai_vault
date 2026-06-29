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

test("MEE core internal review dashboard read model report is complete and non-public", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DASHBOARD-READ-MODEL-V1/report.json"),
  );

  assert.equal(report.package_id, "MEE-CORE-INTERNAL-REVIEW-DASHBOARD-READ-MODEL-V1");
  assert.equal(report.mode, "plan_only_internal_review_dashboard_read_model");
  assert.deepEqual(report.findings, []);

  assert.equal(report.audit.disposition_summary.disposition_rows, 2152);
  assert.equal(report.audit.disposition_summary.publication_gate_candidate_rows, 0);
  assert.equal(report.audit.disposition_summary.direct_publish_rows, 0);
  assert.equal(report.audit.disposition_summary.publishable_rows, 0);
  assert.equal(report.audit.disposition_summary.app_visible_rows, 0);
  assert.equal(report.audit.disposition_summary.market_truth_rows, 0);

  assert.equal(report.audit.join_summary.disposition_rows, 2152);
  assert.equal(report.audit.join_summary.joined_review_queue_rows, 2152);
  assert.equal(report.audit.join_summary.joined_signal_summary_rows, 2152);
  assert.equal(report.audit.join_summary.missing_review_queue_rows, 0);
  assert.equal(report.audit.join_summary.missing_signal_summary_rows, 0);

  assert.deepEqual(report.audit.dashboard_queues, [
    { dashboard_queue: "reference_only_queue", card_count: 915, handoff_candidate_count: 0 },
    { dashboard_queue: "mixed_raw_slab_split_queue", card_count: 574, handoff_candidate_count: 0 },
    { dashboard_queue: "standard_candidate_review", card_count: 460, handoff_candidate_count: 0 },
    { dashboard_queue: "low_signal_monitor", card_count: 156, handoff_candidate_count: 0 },
    { dashboard_queue: "classification_blocked_queue", card_count: 19, handoff_candidate_count: 0 },
    { dashboard_queue: "unknown_evidence_review", card_count: 18, handoff_candidate_count: 0 },
    { dashboard_queue: "high_signal_candidate_queue", card_count: 10, handoff_candidate_count: 0 },
  ]);

  assert.equal(report.audit.public_boundary.pricing_observations_count, 0);
  assert.equal(report.audit.public_boundary.public_pricing_view_references, 0);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core internal review dashboard read model hashes match generated artifacts", () => {
  const report = JSON.parse(
    read("docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DASHBOARD-READ-MODEL-V1/report.json"),
  );
  const viewSql = read("docs/sql/mee_core_internal_review_dashboard_read_model_v1_view_candidates.sql");
  const readbackSql = read("docs/sql/mee_core_internal_review_dashboard_read_model_v1_readback.sql");

  assert.equal(sha256(viewSql), report.hashes.sql_candidate_sha256);
  assert.equal(sha256(readbackSql), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.sql_candidate_sha256, "65f203935d8ed436e8fbf88c5c8548438940b16761e88c52c06b8a6c6e131c0e");
  assert.equal(report.hashes.readback_sql_sha256, "f455ed5f6b8eb74ba1b8feafe44d2a37e30976e350cb157ee6f1af5fd502e337");
});

test("MEE core internal review dashboard SQL candidates stay internal-only", () => {
  const stripped = stripSqlComments(read("docs/sql/mee_core_internal_review_dashboard_read_model_v1_view_candidates.sql"));

  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_review_dashboard_queue_v1/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_review_dashboard_status_summary_v1/i);
  assert.match(stripped, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_review_dashboard_blocker_queue_v1/i);
  assert.match(stripped, /with\s*\(\s*security_invoker\s*=\s*true\s*\)/i);
  assert.match(stripped, /revoke\s+all\s+on\s+public\.v_market_evidence_review_dashboard_queue_v1\s+from\s+public,\s+anon,\s+authenticated/i);
  assert.match(stripped, /grant\s+select\s+on\s+public\.v_market_evidence_review_dashboard_queue_v1\s+to\s+service_role/i);
  assert.match(stripped, /false\s+as\s+publishable/i);
  assert.match(stripped, /false\s+as\s+app_visible/i);
  assert.match(stripped, /false\s+as\s+market_truth/i);

  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bon\s+conflict\b/i);
  assert.doesNotMatch(stripped, /\bpricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bv_card_pricing_ui_v1\b/i);
});

test("MEE core internal review dashboard generator stays plan-only", () => {
  const script = read("scripts/audits/market_evidence_review_dashboard_read_model_v1.mjs");

  assert.match(script, /MEE-CORE-INTERNAL-REVIEW-DASHBOARD-READ-MODEL-V1/);
  assert.match(script, /remote_migration_apply: false/);
  assert.match(script, /db_writes: false/);
  assert.match(script, /provider_calls: false/);
  assert.match(script, /source_fetches: false/);
  assert.match(script, /public_pricing_views: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.match(script, /public_price_rollups: false/);

  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
  assert.doesNotMatch(script, /\.from\([^)]*\)\.update\s*\(/);
  assert.doesNotMatch(script, /\.rpc\s*\(/);
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /https\.request/);

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DASHBOARD-READ-MODEL-V1.md",
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-DASHBOARD-READ-MODEL-V1/report.json",
    "docs/sql/mee_core_internal_review_dashboard_read_model_v1_view_candidates.sql",
    "docs/sql/mee_core_internal_review_dashboard_read_model_v1_readback.sql",
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});
