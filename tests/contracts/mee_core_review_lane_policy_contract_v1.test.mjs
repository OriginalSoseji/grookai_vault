import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const packageId = "MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1.md";
const planMdPath = "docs/plans/market_evidence_engine_v1/MEE_CORE_REVIEW_LANE_POLICY_CONTRACT_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_CORE_REVIEW_LANE_POLICY_CONTRACT_V1.md";
const contractPath = "docs/contracts/MEE_CORE_REVIEW_LANE_POLICY_CONTRACT_V1.md";
const scriptPath = "scripts/audits/market_evidence_review_lane_policy_contract_v1.mjs";

function loadReport() {
  return JSON.parse(read(reportPath));
}

test("MEE core review lane policy contract is explicit and plan-only", () => {
  const report = loadReport();

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_only_review_lane_policy_contract");
  assert.equal(report.package_fingerprint_sha256, "ff2746becc6bc77d927734b7cb7ff5122d085bfbfbd08e0d39ab87949689394a");
  assert.deepEqual(report.findings, []);
  assert.equal(report.lane_policies.length, 8);
  assert.deepEqual(report.automation_classes, {
    auto_safe_internal: 3,
    reviewer_or_explicit_policy_required: 2,
    hold_until_reference_policy: 1,
    hold_until_manual_review: 1,
    no_action: 1,
  });
});

test("MEE core review lane policy contract blocks provider truth and public writes", () => {
  const report = loadReport();

  assert.deepEqual(report.global_policy, {
    providers_create_market_truth: false,
    active_listings_are_market_truth: false,
    reference_metrics_are_market_truth: false,
    review_actions_can_publish_prices: false,
    lane_policy_can_write_pricing_observations: false,
    lane_policy_can_write_ebay_active_prices_latest: false,
    lane_policy_can_set_public_flags: false,
    public_pricing_requires_separate_publish_gate: true,
    post_ingest_orchestrator_is_plan_only_until_batch_workflow: true,
  });
});

test("MEE core review lane policy contract defines only three auto-safe internal actions", () => {
  const report = loadReport();
  const autoSafe = report.lane_policies.filter((policy) => policy.automation_class === "auto_safe_internal");

  assert.deepEqual(
    autoSafe.map((policy) => policy.policy_id),
    [
      "low_signal_monitor_auto_monitor",
      "classification_blocked_request_reclassification",
      "mixed_raw_slab_require_split",
    ],
  );
  assert.deepEqual(
    autoSafe.map((policy) => policy.action_name),
    ["confirm_monitor_only", "request_reclassification", "require_split"],
  );
  assert.equal(autoSafe.every((policy) => policy.can_be_in_batch_apply === true), true);
  assert.equal(autoSafe.every((policy) => policy.can_be_publish_gate_candidate === false), true);
});

test("MEE core review lane policy contract holds publish-adjacent candidate actions", () => {
  const report = loadReport();
  const raw = report.lane_policies.find((policy) => policy.policy_id === "raw_single_internal_candidate_review_hold");
  const slab = report.lane_policies.find((policy) => policy.policy_id === "slab_internal_candidate_review_hold");
  const reference = report.lane_policies.find((policy) => policy.policy_id === "reference_metric_hold");
  const unknown = report.lane_policies.find((policy) => policy.policy_id === "unknown_evidence_manual_hold");

  assert.equal(raw.action_name, "confirm_internal_candidate");
  assert.equal(raw.automation_class, "reviewer_or_explicit_policy_required");
  assert.equal(raw.can_be_in_batch_apply, false);
  assert.equal(raw.can_be_publish_gate_candidate, true);
  assert.equal(slab.action_name, "confirm_internal_candidate");
  assert.equal(slab.automation_class, "reviewer_or_explicit_policy_required");
  assert.equal(slab.can_be_in_batch_apply, false);
  assert.equal(slab.can_be_publish_gate_candidate, true);
  assert.equal(reference.automation_class, "hold_until_reference_policy");
  assert.equal(reference.can_be_in_batch_apply, false);
  assert.equal(reference.can_be_publish_gate_candidate, false);
  assert.equal(unknown.automation_class, "hold_until_manual_review");
  assert.equal(unknown.can_be_in_batch_apply, false);
});

test("MEE core review lane policy contract maps current orchestrator impact", () => {
  const report = loadReport();

  assert.deepEqual(report.current_policy_impact, {
    current_orchestrator_package: "MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1",
    current_orchestrator_fingerprint: "876e629b79ac08463dff8506b5b9a08921179c9f93d7b5afbacfeaa4388e6a8f",
    safe_internal_action_count: 550,
    held_action_count: 1203,
    safe_internal_actions_by_action: {
      require_split: 550,
    },
    held_actions_by_action: {
      confirm_internal_candidate: 270,
      defer_more_evidence: 929,
      defer_active_market_evidence: 4,
    },
    safe_internal_actions_allowed_now: ["confirm_monitor_only", "request_reclassification", "require_split"],
    current_safe_internal_action_to_apply_next: "require_split",
    current_safe_internal_action_rows_to_apply_next: 550,
  });
});

test("MEE core review lane policy contract advances but does not complete foundation", () => {
  const report = loadReport();

  assert.deepEqual(report.foundation_status, {
    foundation_before_this_package: "not_complete",
    blocker_satisfied_by_this_package: "lane_policy_contract",
    foundation_after_this_package: "not_complete",
    remaining_blockers: ["batch_review_action_workflow", "publish_gate_contract", "runbook"],
  });
  assert.deepEqual(report.next_recommendation, {
    package_id: "MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1",
    reason:
      "Lane policy is now explicit. The next foundation blocker is turning orchestrator-safe actions into one approved batch package with preflight, apply, readback, rollback, and public-boundary proofs.",
    allowed_scope:
      "Schema/plan only if needed. No acquisition, no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
  });
});

test("MEE core review lane policy contract artifacts are present", () => {
  const report = loadReport();

  assert.deepEqual(report.source_hashes, {
    foundation_completion: "cda42f72bb5317f5dec349dc59d3a097285f1a55a087384a4af153235a175184",
    post_ingest_orchestrator: "8fe9e0d7f842949f4390562a26067f57647f40deaba0c8842bb87072a1475d5e",
    review_action_workflow: "25808d09ec42fe5151a912bfff568354e468dd19ca2253b6b79994d3bb35d2bb",
  });

  for (const artifactPath of [reportPath, reportMdPath, planMdPath, checkpointPath, contractPath, scriptPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});

test("MEE core review lane policy contract generator stays read-only", () => {
  const report = loadReport();
  const script = read(scriptPath);
  const contract = read(contractPath);

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
  assert.match(contract, /public_pricing_requires_separate_publish_gate/);
  assert.match(contract, /Remaining blockers/);

  assert.doesNotMatch(script, /\bsupabase\b/i);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\bmerge\s+into\b/i);
  assert.doesNotMatch(script, /\bon\s+conflict\b/i);
  assert.doesNotMatch(script, /\bebay_active_prices_latest\b/i);
});
