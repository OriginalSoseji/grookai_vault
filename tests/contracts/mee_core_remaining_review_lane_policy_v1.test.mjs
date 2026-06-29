import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const packageId = "MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1.md";
const contractPath = "docs/contracts/MEE_CORE_REMAINING_REVIEW_LANE_POLICY_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_CORE_REMAINING_REVIEW_LANE_POLICY_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_REMAINING_REVIEW_LANE_POLICY_V1.md";
const scriptPath = "scripts/audits/market_evidence_remaining_review_lane_policy_v1.mjs";

test("MEE remaining review lane policy separates safe internal cleanup from candidate confirmation", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_remaining_review_lane_policy");
  assert.equal(report.package_fingerprint_sha256, "36d1a319e964101534ca41899ee9df7860143e88a5db9c1aa14dcee28fdbf46f");
  assert.equal(report.policy_status, "ready_for_batch_plan_generation");
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.automation.safe_now_after_this_policy, {
    reference_metric_defer_more_evidence_rows: 911,
    reference_only_defer_active_market_evidence_rows: 4,
    unknown_block_evidence_rows: 18,
    total_rows: 933,
  });
  assert.deepEqual(report.automation.not_auto_safe, {
    raw_single_candidate_rows: 224,
    raw_single_high_signal_rows: 10,
    slab_candidate_rows: 36,
    total_rows: 270,
  });
});

test("MEE remaining review lane policy keeps public pricing and provider truth blocked", () => {
  const report = loadJson(reportPath);

  assert.deepEqual(report.hard_boundaries, {
    providers_create_market_truth: false,
    active_listings_are_market_truth: false,
    reference_metrics_are_market_truth: false,
    review_actions_can_publish_prices: false,
    review_actions_can_set_public_flags: false,
    public_pricing_requires_separate_publish_gate: true,
    nightly_automation_may_run_safe_internal_actions_only: true,
  });
  assert.deepEqual(report.public_boundary, {
    app_visible_rows: 0,
    can_publish_price_directly_rows: 0,
    market_truth_rows: 0,
    publication_gate_candidate_rows: 0,
    publishable_rows: 0,
  });
});

test("MEE remaining review lane policy never auto-confirms raw or slab candidates", () => {
  const report = loadJson(reportPath);
  const rawSinglePolicies = report.policy_rows.filter((row) => row.evidence_lane === "raw_single");
  const slabPolicies = report.policy_rows.filter((row) => row.evidence_lane === "slab");

  assert.equal(rawSinglePolicies.every((row) => row.automation_class === "manual_or_threshold_required"), true);
  assert.equal(slabPolicies.every((row) => row.automation_class === "manual_or_threshold_required"), true);
  assert.equal(report.policy_rows.some((row) => row.action === "confirm_internal_candidate"), false);
});

test("MEE remaining review lane policy artifacts are present and generator is local", () => {
  const script = read(scriptPath);

  for (const artifactPath of [reportPath, reportMdPath, contractPath, checkpointPath, planPath, scriptPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
  assert.doesNotMatch(script, /\bsupabase\b/i);
  assert.doesNotMatch(script, /\bfetch\s*\(/i);
  assert.doesNotMatch(script, /\bhttps\.request\b/i);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
});
