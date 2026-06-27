import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const packageId = "MEE-CORE-FOUNDATION-COMPLETE-V2";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-FOUNDATION-COMPLETE-V2/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-FOUNDATION-COMPLETE-V2.md";
const contractPath = "docs/contracts/MEE_CORE_FOUNDATION_COMPLETE_V2.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_FOUNDATION_COMPLETE_V2.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_CORE_FOUNDATION_COMPLETE_V2.md";
const scriptPath = "scripts/audits/market_evidence_foundation_complete_v2.mjs";

test("MEE foundation complete V2 marks the current foundation complete", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "foundation_complete_current_state_checkpoint");
  assert.equal(report.package_fingerprint_sha256, "080439dc0d69dcff9835e8dc09a707bbb3303f04485547a526d36ba8a646e756");
  assert.equal(report.foundation_status, "complete_internal_quality_gated");
  assert.equal(report.public_pricing_allowed_now, false);
  assert.equal(report.acquisition_allowed_by_this_package, false);
  assert.deepEqual(report.findings, []);
});

test("MEE foundation complete V2 captures current review and quality state", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.current_review_state, {
    remaining_safe_internal_action_rows: 0,
    reviewer_candidate_rows: 0,
    split_required_rows: 550,
    classification_blocked_rows: 19,
    monitor_resolved_rows: 380,
    reference_policy_hold_rows: 0,
    unknown_evidence_rows: 0,
    public_boundary_rows: 0,
  });
  assert.deepEqual(report.current_quality_state, {
    candidate_evidence_rows: 0,
    low_match_confidence_rows: 0,
    lane_mismatch_rows: 0,
    hard_exclusion_rows: 0,
    manual_policy_rows: 0,
    quality_rollup_eligible_rows: 0,
  });
});

test("MEE foundation complete V2 separates next-layer work from foundation blockers", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.remaining_non_foundation_work, [
    "remote_apply_quality_scoring_internal_view_if_desired",
    "nightly_scheduler_orchestration_at_3_to_4am",
    "future_publish_gate_apply_package_after_review_thresholds_are_real",
    "future_identity_confidence_v2_enhancement_for_new_ingests",
    "future_lane_reclassification_model_for_new_ingests",
    "future_manual_policy_model_for_new_ingests",
  ]);
});

test("MEE foundation complete V2 keeps all public and write boundaries blocked", () => {
  const report = loadJson(reportPath);

  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE foundation complete V2 artifacts are present and generator remains local", () => {
  const script = read(scriptPath);

  for (const artifactPath of [reportPath, reportMdPath, contractPath, planPath, checkpointPath, scriptPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
  assert.doesNotMatch(script, /\bsupabase\b/i);
  assert.doesNotMatch(script, /\bfetch\s*\(/i);
  assert.doesNotMatch(script, /\bhttps\.request\b/i);
});
