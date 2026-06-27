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

const packageId = "MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1.md";
const checkpointPath =
  "docs/checkpoints/market_evidence_engine/MEE_CORE_FAST_POST_INGEST_REVIEW_READBACK_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_FAST_POST_INGEST_REVIEW_READBACK_V1.md";
const sqlPath = "docs/sql/mee_core_fast_post_ingest_review_readback_v1.sql";
const scriptPath = "scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs";
const artifactsAvailable = existsSync(new URL(`../../${reportPath}`, import.meta.url));
const artifactTest = artifactsAvailable ? test : test.skip;

artifactTest("MEE fast post-ingest review readback captures current queue summary", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "read_only_fast_post_ingest_review_readback");
  assert.equal(report.package_fingerprint_sha256, "745d9e4ef336e2968de6aa6ada651fdd6ce2a30e1b032af289f3702de1163f55");
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.summary, {
    remaining_safe_internal_action_rows: 0,
    reviewer_candidate_rows: 0,
    reference_policy_hold_rows: 0,
    unknown_evidence_rows: 0,
    split_required_rows: 550,
    classification_blocked_rows: 19,
    monitor_resolved_rows: 380,
    next_recommendation:
      "No safe internal review batch remains. Next work is policy/manual review handling for candidate, reference, and unknown evidence lanes.",
  });
});

artifactTest("MEE fast post-ingest review readback keeps the public boundary sealed", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.public_boundary, {
    app_visible_rows: 0,
    can_publish_price_directly_rows: 0,
    market_truth_rows: 0,
    publication_gate_candidate_rows: 0,
    publishable_rows: 0,
  });
  assert.equal(report.object_counts.pricing_observations_count, 0);
  assert.equal(report.object_counts.public_pricing_view_market_evidence_references, 0);
  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

artifactTest("MEE fast post-ingest review readback uses a lightweight SQL path", () => {
  const report = loadJson(reportPath);
  const sql = read(sqlPath);
  const script = read(scriptPath);

  assert.equal(sha256(sql), report.sql_sha256);
  assert.match(sql, /market_evidence_review_dispositions/);
  assert.match(sql, /market_evidence_review_action_events/);
  assert.doesNotMatch(sql, /v_market_evidence_review_dashboard_queue_v1/);
  assert.doesNotMatch(sql, /v_market_evidence_card_signal_summary_v1/);
  assert.doesNotMatch(sql, /join\s+public\.card_prints/i);

  for (const content of [sql, script]) {
    assert.doesNotMatch(content, /\binsert\s+into\b/i);
    assert.doesNotMatch(content, /\bupdate\s+public\./i);
    assert.doesNotMatch(content, /\bdelete\s+from\b/i);
    assert.doesNotMatch(content, /\bmerge\s+into\b/i);
    assert.doesNotMatch(content, /\bon\s+conflict\b/i);
    assert.doesNotMatch(content, /\bebay_active_prices_latest\b/i);
    assert.doesNotMatch(content, /\bfetch\s*\(/i);
    assert.doesNotMatch(content, /\bhttps\.request\b/i);
  }
});

artifactTest("MEE fast post-ingest review readback artifacts are present", () => {
  for (const artifactPath of [reportPath, reportMdPath, checkpointPath, planPath, sqlPath, scriptPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
