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

const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1.md";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1/report.json";
const manifestPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1/blocker_resolution_manifest.json";
const summaryPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1/blocker_resolution_summary.json";
const preflightPath = "docs/sql/mee_publication_gate_candidate_blocker_resolution_v1_preflight.sql";
const readbackPath = "docs/sql/mee_publication_gate_candidate_blocker_resolution_v1_readback.sql";

test("blocker resolution package is plan-only", () => {
  const report = loadJson(reportPath);
  const manifest = loadJson(manifestPath);

  assert.equal(report.package_id, "MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1");
  assert.equal(manifest.package_id, report.package_id);
  assert.equal(report.remote_apply, false);
  assert.equal(report.db_writes, false);
  assert.equal(report.function_invocation, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.source_fetches, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
  assert.equal(report.apply_candidate_generated, false);
});

test("all held confirmation rows are classified into resolution lanes", () => {
  const manifest = loadJson(manifestPath);
  const summary = loadJson(summaryPath);

  assert.equal(manifest.total_rows, 470);
  assert.equal(manifest.rows.length, 470);
  assert.equal(summary.total_rows, 470);
  assert.deepEqual(manifest.evidence_lanes, { raw_single: 378, slab: 92 });
  assert.deepEqual(manifest.primary_resolution_lanes, {
    special_lane_manual_review: 338,
    matcher_confidence_review: 42,
    high_value_manual_review: 30,
    exclusion_flag_review: 60,
  });
});

test("blocker resolution keeps universal blockers visible", () => {
  const manifest = loadJson(manifestPath);

  assert.equal(manifest.blocker_counts.matcher_confidence_review_required, 470);
  assert.equal(manifest.blocker_counts.candidate_evidence_review_required, 470);
  assert.equal(manifest.blocker_counts.special_lane_policy_required, 383);
  assert.equal(manifest.blocker_counts.high_value_manual_review_required, 103);
  assert.equal(manifest.blocker_counts.exclusion_flag_review_required, 60);
});

test("blocker resolution does not generate confirmation actions", () => {
  const manifest = loadJson(manifestPath);

  assert.equal(manifest.apply_candidate_generated, false);
  assert.equal(manifest.rows.every((row) => row.can_generate_confirm_internal_candidate_apply === false), true);
});

test("blocker resolution SQL is read-only and does not invoke actions", () => {
  const sql = `${read(preflightPath)}\n${read(readbackPath)}`;

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /apply_market_evidence_review_action_v1\s*\(/i);
  assert.doesNotMatch(sql, /\bpricing_observations\s*\(/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
});

test("blocker resolution artifacts exist and hash", () => {
  for (const artifactPath of [markdownPath, reportPath, manifestPath, summaryPath, preflightPath, readbackPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});

