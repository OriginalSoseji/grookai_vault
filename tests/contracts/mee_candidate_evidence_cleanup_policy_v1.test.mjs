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

const contractPath = "docs/contracts/MEE_CANDIDATE_EVIDENCE_CLEANUP_POLICY_V1.md";
const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1.md";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/report.json";
const policyManifestPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/policy_manifest.json";
const cleanupManifestPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/candidate_cleanup_manifest.json";
const cleanupSummaryPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/candidate_cleanup_summary.json";
const candidateSchemaPath = "docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/candidate_schema.json";
const preflightPath = "docs/sql/mee_candidate_evidence_cleanup_policy_v1_preflight.sql";
const readbackPath = "docs/sql/mee_candidate_evidence_cleanup_policy_v1_readback.sql";

test("candidate evidence cleanup policy is plan-only", () => {
  const report = loadJson(reportPath);
  const manifest = loadJson(policyManifestPath);

  assert.equal(report.package_id, "MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1");
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

test("candidate cleanup audit covers the held publication-gate rows", () => {
  const summary = loadJson(cleanupSummaryPath);
  const cleanupManifest = loadJson(cleanupManifestPath);

  assert.equal(summary.total_gate_rows, 470);
  assert.equal(summary.total_card_prints_with_candidates, 470);
  assert.equal(summary.total_candidate_rows, 52630);
  assert.equal(cleanupManifest.rows.length, 470);
  assert.deepEqual(summary.candidate_match_status_counts, { needs_review: 52630 });
});

test("candidate cleanup outcomes are deterministic and non-public", () => {
  const summary = loadJson(cleanupSummaryPath);

  assert.deepEqual(summary.candidate_cleanup_outcomes, {
    require_special_lane_policy: 39180,
    quarantine_candidate: 1671,
    require_matcher_reclassify: 9610,
    require_high_value_review: 2169,
  });
  assert.equal(summary.public_boundary_candidate_rows, 0);
});

test("candidate cleanup SQL is read-only and does not invoke actions", () => {
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

test("candidate cleanup artifacts exist and hash", () => {
  for (const artifactPath of [
    contractPath,
    markdownPath,
    reportPath,
    policyManifestPath,
    cleanupManifestPath,
    cleanupSummaryPath,
    candidateSchemaPath,
    preflightPath,
    readbackPath,
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});
