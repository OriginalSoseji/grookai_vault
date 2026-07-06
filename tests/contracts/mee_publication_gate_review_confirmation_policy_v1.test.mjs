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

const contractPath = "docs/contracts/MEE_PUBLICATION_GATE_REVIEW_CONFIRMATION_POLICY_V1.md";
const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1.md";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/report.json";
const policyManifestPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/policy_manifest.json";
const enrichedAuditPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/enriched_candidate_policy_audit.json";
const preflightPath = "docs/sql/mee_publication_gate_review_confirmation_policy_v1_preflight.sql";
const readbackPath = "docs/sql/mee_publication_gate_review_confirmation_policy_v1_readback.sql";

test("publication gate confirmation policy is plan-only", () => {
  const manifest = loadJson(policyManifestPath);
  const report = loadJson(reportPath);

  assert.equal(manifest.package_id, "MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1");
  assert.equal(report.package_id, manifest.package_id);
  assert.equal(manifest.remote_apply, false);
  assert.equal(manifest.db_writes, false);
  assert.equal(manifest.function_invocation, false);
  assert.equal(manifest.provider_calls, false);
  assert.equal(manifest.source_fetches, false);
  assert.equal(manifest.public_pricing_views, false);
  assert.equal(manifest.app_visible_pricing, false);
  assert.equal(manifest.apply_candidate_generated, false);
});

test("confirmation policy has deterministic lane thresholds", () => {
  const manifest = loadJson(policyManifestPath);

  assert.equal(manifest.hard_requirements.minimum_match_confidence, 0.9);
  assert.deepEqual(manifest.hard_requirements.review_lane, ["candidate_review", "high_signal_review"]);
  assert.deepEqual(manifest.hard_requirements.review_status, ["pending", "in_review"]);
  assert.equal(manifest.lane_thresholds.raw_single.minimum_matched_listing_count, 5);
  assert.equal(manifest.lane_thresholds.raw_single.minimum_distinct_seller_count, 3);
  assert.equal(manifest.lane_thresholds.raw_single.stale_after_days, 14);
  assert.equal(manifest.lane_thresholds.slab.minimum_matched_listing_count, 3);
  assert.equal(manifest.lane_thresholds.slab.minimum_distinct_seller_count, 2);
  assert.equal(manifest.lane_thresholds.slab.stale_after_days, 30);
});

test("current review-confirmation rows are all policy holds", () => {
  const manifest = loadJson(policyManifestPath);
  const audit = loadJson(enrichedAuditPath);

  assert.equal(audit.rows.length, 470);
  assert.equal(manifest.current_audit.total_review_confirmation_rows, 470);
  assert.equal(manifest.current_audit.policy_hold_rows, 470);
  assert.equal(manifest.current_audit.policy_confirmable_rows, 0);
  assert.equal(manifest.current_audit.by_lane.raw_single.rows, 378);
  assert.equal(manifest.current_audit.by_lane.slab.rows, 92);
  assert.equal(audit.rows.every((row) => row.policy_bucket === "policy_hold"), true);
});

test("current holds include universal confidence and review blockers", () => {
  const manifest = loadJson(policyManifestPath);

  assert.equal(manifest.current_audit.hold_reasons.match_confidence_below_policy, 470);
  assert.equal(manifest.current_audit.hold_reasons.candidate_rows_still_need_review, 470);
  assert.equal(manifest.current_audit.hold_reasons.special_lane_manual_review, 383);
  assert.equal(manifest.current_audit.hold_reasons.high_value_manual_review, 103);
  assert.equal(manifest.current_audit.hold_reasons.exclusion_flags_present, 60);
});

test("confirmation policy SQL is read-only and does not invoke actions", () => {
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

test("confirmation policy artifacts exist and hash", () => {
  for (const artifactPath of [contractPath, markdownPath, reportPath, policyManifestPath, enrichedAuditPath, preflightPath, readbackPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});

