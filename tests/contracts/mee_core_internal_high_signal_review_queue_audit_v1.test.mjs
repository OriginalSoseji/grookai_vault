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

const packageId = "MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-QUEUE-AUDIT-V1";
const reportPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-QUEUE-AUDIT-V1/report.json";
const rowManifestPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-QUEUE-AUDIT-V1/row_manifest.jsonl";
const readbackSqlPath = "docs/sql/mee_core_internal_high_signal_review_queue_audit_v1_readback.sql";
const scriptPath = "scripts/audits/market_evidence_high_signal_review_queue_audit_v1.mjs";

function loadReport() {
  return JSON.parse(read(reportPath));
}

function loadManifestRows() {
  return read(rowManifestPath).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

test("MEE core high-signal review queue audit captures the internal queue shape", () => {
  const report = loadReport();
  const rows = loadManifestRows();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "run_only_high_signal_review_queue_read_only_audit");
  assert.equal(report.package_fingerprint_sha256, "0a490fcfe4678c659ca5436df7fdfb3c5bacfdabeb107abb425d69503b96e788");
  assert.deepEqual(report.findings, []);
  assert.equal(report.audit.row_count, 213);
  assert.equal(rows.length, 213);
  assert.equal(new Set(rows.map((row) => row.disposition_id)).size, 213);
  assert.deepEqual(report.audit.summary, {
    active_listing_involved_rows: 16,
    exclusion_flagged_rows: 213,
    internal_rollup_candidate_rows: 213,
    mixed_raw_slab_count_rows: 6,
    mixed_raw_slab_lane_rows: 6,
    needs_review_rows: 213,
    package_id: "MEE_CORE_INTERNAL_HIGH_SIGNAL_REVIEW_QUEUE_AUDIT_V1",
    pending_high_signal_rows: 213,
    pricing_observations_count: 0,
    public_flag_rows: 0,
    public_pricing_view_references: 0,
    quality_flagged_rows: 213,
    raw_single_lane_rows: 10,
    reference_involved_rows: 213,
    reference_metric_lane_rows: 197,
    reference_only_rows: 197,
    rollup_threshold_ready_rows: 213,
    slab_lane_rows: 0,
    source_family_ready_rows: 213,
  });
  assert.deepEqual(report.audit.recommendations, {
    plan_confirm_internal_raw_single_candidate: 10,
    plan_reference_crosscheck_or_hold: 197,
    plan_require_split: 6,
  });
});

test("MEE core high-signal review queue audit preserves lane separation", () => {
  const report = loadReport();

  assert.deepEqual(report.audit.lane_summary, [
    {
      active_listing_evidence_count: 0,
      evidence_count: 5055,
      evidence_lane: "reference_metric",
      exclusion_flag_count: 5055,
      quality_flag_count: 1075,
      raw_single_count: 0,
      reference_evidence_count: 5055,
      rollup_eligible_count: 4355,
      rows: 197,
      slab_count: 0,
    },
    {
      active_listing_evidence_count: 784,
      evidence_count: 860,
      evidence_lane: "raw_single",
      exclusion_flag_count: 83,
      quality_flag_count: 746,
      raw_single_count: 71,
      reference_evidence_count: 76,
      rollup_eligible_count: 124,
      rows: 10,
      slab_count: 0,
    },
    {
      active_listing_evidence_count: 696,
      evidence_count: 721,
      evidence_lane: "mixed_raw_slab",
      exclusion_flag_count: 28,
      quality_flag_count: 646,
      raw_single_count: 48,
      reference_evidence_count: 25,
      rollup_eligible_count: 77,
      rows: 6,
      slab_count: 11,
    },
  ]);
});

test("MEE core high-signal review queue manifest keeps rows internal", () => {
  const rows = loadManifestRows();

  for (const [index, row] of rows.entries()) {
    assert.equal(row.package_id, packageId);
    assert.equal(row.row_index, index + 1);
    assert.equal(row.review.lane, "high_signal_review");
    assert.equal(row.review.status, "pending");
    assert.equal(row.review.disposition, "review_pending_high_signal");
    assert.equal(row.review.needs_review, true);
    assert.equal(row.evidence.internal_rollup_candidate, true);
    assert.equal(row.evidence.source_family_count >= 2, true);
    assert.equal(row.evidence.rollup_eligible_count >= 10, true);
    assert.equal(row.boundary.publishable, false);
    assert.equal(row.boundary.app_visible, false);
    assert.equal(row.boundary.market_truth, false);
    assert.equal(row.boundary.publication_gate_candidate, false);
    assert.equal(row.boundary.can_publish_price_directly, false);
    assert.equal(row.recommendation.public_pricing_allowed, false);
    assert.match(row.gv_id, /^GV-PK-/);
  }

  assert.equal(rows.filter((row) => row.recommendation.action === "plan_confirm_internal_raw_single_candidate").length, 10);
  assert.equal(rows.filter((row) => row.recommendation.action === "plan_require_split").length, 6);
  assert.equal(rows.filter((row) => row.recommendation.action === "plan_reference_crosscheck_or_hold").length, 197);
});

test("MEE core high-signal review queue audit hashes and artifacts are stable", () => {
  const report = loadReport();

  assert.equal(sha256(read(rowManifestPath)), report.hashes.row_manifest_sha256);
  assert.equal(sha256(read(readbackSqlPath)), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.row_manifest_sha256, "1b4768cd2c6226a4d45f15d8e0f9d1def25cfdc5eb1671be99b5412adc263e4b");
  assert.equal(report.hashes.readback_sql_sha256, "b53edd77583a86eb0a281f96622db582638595e42063b10e9a0ad9646da524f9");

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-QUEUE-AUDIT-V1.md",
    reportPath,
    rowManifestPath,
    readbackSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_HIGH_SIGNAL_REVIEW_QUEUE_AUDIT_V1.md",
    scriptPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});

test("MEE core high-signal review queue audit recommends action planning without public pricing", () => {
  const report = loadReport();

  assert.deepEqual(report.next_recommendation, {
    package_id: "MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-ACTION-PLAN-V1",
    reason:
      "High-signal rows are internal candidates only. Split mixed raw/slab rows first, then plan separate confirm_internal_candidate packages for raw_single and slab lanes after review.",
    allowed_scope:
      "Plan only. No DB writes, no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
  });
  assert.deepEqual(report.audit.sample_gv_ids.slice(0, 6), [
    "GV-PK-PR-BLW-BW05",
    "GV-PK-PR-BLW-BW09",
    "GV-PK-PR-BLW-BW101",
    "GV-PK-PR-BLW-BW19",
    "GV-PK-PR-BLW-BW72",
    "GV-PK-PR-BLW-BW99",
  ]);
});

test("MEE core high-signal review queue audit generator stays read-only", () => {
  const report = loadReport();
  const script = read(scriptPath);
  const sql = read(readbackSqlPath);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.match(script, /db_writes: false/);
  assert.match(script, /function_invocation: false/);
  assert.match(script, /provider_calls: false/);
  assert.match(script, /source_fetches: false/);
  assert.match(script, /public_pricing_views: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.match(script, /public_price_rollups: false/);
  assert.match(sql, /high_signal_review/);
  assert.match(sql, /review_pending_high_signal/);
  assert.match(sql, /public_pricing_view_references/);

  for (const content of [script, sql]) {
    assert.doesNotMatch(content, /\binsert\s+into\b/i);
    assert.doesNotMatch(content, /\bupdate\s+public\./i);
    assert.doesNotMatch(content, /\bdelete\s+from\b/i);
    assert.doesNotMatch(content, /\bmerge\s+into\b/i);
    assert.doesNotMatch(content, /\bon\s+conflict\b/i);
    assert.doesNotMatch(content, /\bebay_active_prices_latest\b/i);
  }
});
