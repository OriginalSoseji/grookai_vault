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

const packageId = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1";
const reportPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1/report.json";
const rowManifestPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1/row_manifest.jsonl";
const readbackSqlPath = "docs/sql/mee_core_internal_classification_review_queue_audit_v1_readback.sql";

function loadReport() {
  return JSON.parse(read(reportPath));
}

function loadManifestRows() {
  return read(rowManifestPath).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

test("MEE core classification review queue audit captures the blocked queue", () => {
  const report = loadReport();
  const rows = loadManifestRows();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "run_only_classification_review_queue_read_only_audit");
  assert.equal(report.package_fingerprint_sha256, "bc5cbb94b2c69c50a6155a7c9b5e854348fa199c352f389299626693393713f5");
  assert.deepEqual(report.findings, []);
  assert.equal(report.audit.row_count, 19);
  assert.equal(rows.length, 19);
  assert.equal(new Set(rows.map((row) => row.disposition_id)).size, 19);
  assert.deepEqual(report.audit.summary, {
    active_only_rows: 19,
    classification_blocked_rows: 19,
    exclusion_flagged_rows: 6,
    needs_review_rows: 19,
    no_raw_or_slab_classification_rows: 19,
    no_rollup_eligible_rows: 19,
    package_id: "MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_QUEUE_AUDIT_V1",
    pending_classification_rows: 19,
    pricing_observations_count: 0,
    public_flag_rows: 0,
    public_pricing_view_references: 0,
  });
  assert.deepEqual(report.audit.recommendations, {
    inspect_classification_rules: 13,
    inspect_exclusion_and_classification_rules: 6,
  });
});

test("MEE core classification review queue audit manifest keeps rows blocked and internal", () => {
  const rows = loadManifestRows();

  for (const [index, row] of rows.entries()) {
    assert.equal(row.package_id, packageId);
    assert.equal(row.row_index, index + 1);
    assert.equal(row.review.lane, "classification_review");
    assert.equal(row.review.status, "pending");
    assert.equal(row.review.disposition, "review_pending_classification_fix");
    assert.equal(row.review.needs_review, true);
    assert.equal(row.review.evidence_lane, "classification_blocked");
    assert.equal(row.review.dashboard_queue, "classification_blocked_queue");
    assert.equal(row.evidence.active_listing_evidence_count > 0, true);
    assert.equal(row.evidence.reference_evidence_count, 0);
    assert.equal(row.evidence.rollup_eligible_count, 0);
    assert.equal(row.evidence.raw_single_count, 0);
    assert.equal(row.evidence.slab_count, 0);
    assert.equal(row.evidence.internal_rollup_candidate, false);
    assert.equal(row.boundary.publishable, false);
    assert.equal(row.boundary.app_visible, false);
    assert.equal(row.boundary.market_truth, false);
    assert.equal(row.boundary.publication_gate_candidate, false);
    assert.equal(row.boundary.can_publish_price_directly, false);
    assert.equal(row.recommendation.target_state, "blocked_until_classification_fixed");
    assert.equal(row.recommendation.public_pricing_allowed, false);
    assert.match(row.gv_id, /^GV-PK-/);
  }

  assert.equal(rows.filter((row) => row.recommendation.action === "inspect_classification_rules").length, 13);
  assert.equal(
    rows.filter((row) => row.recommendation.action === "inspect_exclusion_and_classification_rules").length,
    6,
  );
});

test("MEE core classification review queue audit preserves the exact blocked ids", () => {
  const report = loadReport();

  assert.deepEqual(report.audit.gv_ids, [
    "GV-PK-DF-98",
    "GV-PK-DR-94",
    "GV-PK-HL-93",
    "GV-PK-LM-86",
    "GV-PK-MA-89",
    "GV-PK-MA-92",
    "GV-PK-MA-95",
    "GV-PK-MCD-2014-11",
    "GV-PK-MCD-2016-6",
    "GV-PK-MCD-2019-4",
    "GV-PK-MEP-053",
    "GV-PK-MEP-067",
    "GV-PK-PR-NP-5",
    "GV-PK-RG-107",
    "GV-PK-TK-tk-bw-e-13",
    "GV-PK-TK-tk-bw-z-4",
    "GV-PK-TRR-14",
    "GV-PK-WCD-2009-STALLGON-13-LEGENDS_AWAKENED-144-MEWTWO_LVX",
    "GV-PK-WCD-2016-NINJA_BLITZ-01-BREAKPOINT-41-GRENINJA_BREAK",
  ]);
  assert.deepEqual(report.next_recommendation, {
    package_id: "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1",
    reason:
      "Every classification_review row is blocked before rollup eligibility because the evidence has not been safely classified as raw_single or slab. Decide whether to fix classification rules or mark specific rows blocked.",
    allowed_scope:
      "Plan only. No DB writes, no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
  });
});

test("MEE core classification review queue audit hashes and artifacts are stable", () => {
  const report = loadReport();

  assert.equal(sha256(read(rowManifestPath)), report.hashes.row_manifest_sha256);
  assert.equal(sha256(read(readbackSqlPath)), report.hashes.readback_sql_sha256);
  assert.equal(report.hashes.row_manifest_sha256, "a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205");
  assert.equal(report.hashes.readback_sql_sha256, "135fc0fcd37a35a8a755d8c2db34be3f8acd26bd59f3a4a068e265bb1a2bc1c0");

  for (const artifactPath of [
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1.md",
    reportPath,
    rowManifestPath,
    readbackSqlPath,
    "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_QUEUE_AUDIT_V1.md",
    "scripts/audits/market_evidence_classification_review_queue_audit_v1.mjs",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true);
  }
});

test("MEE core classification review queue audit generator stays read-only", () => {
  const report = loadReport();
  const script = read("scripts/audits/market_evidence_classification_review_queue_audit_v1.mjs");
  const sql = read(readbackSqlPath);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  assert.match(script, /db_writes: false/);
  assert.match(script, /provider_calls: false/);
  assert.match(script, /source_fetches: false/);
  assert.match(script, /public_pricing_views: false/);
  assert.match(script, /app_visible_pricing: false/);
  assert.match(script, /public_price_rollups: false/);
  assert.match(sql, /classification_review/);
  assert.match(sql, /review_pending_classification_fix/);
  assert.match(sql, /classification_blocked/);
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
