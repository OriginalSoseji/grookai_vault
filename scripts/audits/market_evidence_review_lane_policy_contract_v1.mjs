import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");
const REPORT_JSON = path.join(ARTIFACT_DIR, "report.json");
const REPORT_MD = path.join(AUDIT_DIR, `${PACKAGE_ID}.md`);
const PLAN_MD = path.join(PLAN_DIR, "MEE_CORE_REVIEW_LANE_POLICY_CONTRACT_V1.md");
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, "MEE_CORE_REVIEW_LANE_POLICY_CONTRACT_V1.md");
const CONTRACT_MD = path.join(CONTRACT_DIR, "MEE_CORE_REVIEW_LANE_POLICY_CONTRACT_V1.md");

const SOURCE_REPORTS = {
  foundation_completion:
    "docs/audits/market_evidence_engine_v1/MEE-CORE-FOUNDATION-COMPLETION-PLAN-V1/report.json",
  post_ingest_orchestrator:
    "docs/audits/market_evidence_engine_v1/MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1/report.json",
  review_action_workflow: "docs/contracts/MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1.md",
};

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256Text(JSON.stringify(stable(value)));
}

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const foundation = readJson(SOURCE_REPORTS.foundation_completion);
const orchestrator = readJson(SOURCE_REPORTS.post_ingest_orchestrator);
const actionWorkflowText = read(SOURCE_REPORTS.review_action_workflow);
const sourceHashes = Object.fromEntries(
  Object.entries(SOURCE_REPORTS).map(([key, relativePath]) => [key, sha256Text(read(relativePath))]),
);

const globalPolicy = {
  providers_create_market_truth: false,
  active_listings_are_market_truth: false,
  reference_metrics_are_market_truth: false,
  review_actions_can_publish_prices: false,
  lane_policy_can_write_pricing_observations: false,
  lane_policy_can_write_ebay_active_prices_latest: false,
  lane_policy_can_set_public_flags: false,
  public_pricing_requires_separate_publish_gate: true,
  post_ingest_orchestrator_is_plan_only_until_batch_workflow: true,
};

const lanePolicies = [
  {
    policy_id: "low_signal_monitor_auto_monitor",
    review_lane: "low_signal_monitor",
    evidence_lane: "*",
    eligible_statuses: ["pending", "in_review", "resolved"],
    eligible_dispositions: ["*"],
    action_name: "confirm_monitor_only",
    reason_code: null,
    automation_class: "auto_safe_internal",
    resulting_status: "resolved",
    resulting_disposition: "monitor_only",
    can_be_in_batch_apply: true,
    can_be_publish_gate_candidate: false,
    rationale: "Low-signal evidence is explicitly not enough for candidate pricing; it can be resolved to monitor-only.",
  },
  {
    policy_id: "classification_blocked_request_reclassification",
    review_lane: "classification_review",
    evidence_lane: "classification_blocked",
    eligible_statuses: ["pending", "in_review"],
    eligible_dispositions: ["review_pending_classification_fix"],
    action_name: "request_reclassification",
    reason_code: "classification_noise",
    automation_class: "auto_safe_internal",
    resulting_status: "blocked",
    resulting_disposition: "review_reclassify",
    can_be_in_batch_apply: true,
    can_be_publish_gate_candidate: false,
    rationale: "Classification-blocked evidence cannot be confirmed; routing it back to reclassification is safe and internal.",
  },
  {
    policy_id: "mixed_raw_slab_require_split",
    review_lane: ["candidate_review", "high_signal_review"],
    evidence_lane: "mixed_raw_slab",
    eligible_statuses: ["pending", "in_review"],
    eligible_dispositions: ["review_pending_candidate", "review_pending_high_signal"],
    action_name: "require_split",
    reason_code: "mixed_raw_slab_requires_split",
    automation_class: "auto_safe_internal",
    resulting_status: "blocked",
    resulting_disposition: "review_split_required",
    can_be_in_batch_apply: true,
    can_be_publish_gate_candidate: false,
    rationale:
      "Raw singles and slabs must never be rolled together. Split-required blocks the row until the evidence is separated.",
  },
  {
    policy_id: "raw_single_internal_candidate_review_hold",
    review_lane: ["candidate_review", "high_signal_review"],
    evidence_lane: "raw_single",
    eligible_statuses: ["pending", "in_review"],
    eligible_dispositions: ["review_pending_candidate", "review_pending_high_signal"],
    action_name: "confirm_internal_candidate",
    reason_code: "approved_internal_raw_single_signal",
    automation_class: "reviewer_or_explicit_policy_required",
    resulting_status: "resolved",
    resulting_disposition: "review_confirmed_internal_candidate",
    can_be_in_batch_apply: false,
    can_be_publish_gate_candidate: true,
    rationale:
      "Raw-single signals may become internal candidates, but confirmation can feed a future publish gate and therefore requires explicit review/policy.",
  },
  {
    policy_id: "slab_internal_candidate_review_hold",
    review_lane: ["candidate_review", "high_signal_review"],
    evidence_lane: "slab",
    eligible_statuses: ["pending", "in_review"],
    eligible_dispositions: ["review_pending_candidate", "review_pending_high_signal"],
    action_name: "confirm_internal_candidate",
    reason_code: "approved_internal_slab_signal",
    automation_class: "reviewer_or_explicit_policy_required",
    resulting_status: "resolved",
    resulting_disposition: "review_confirmed_internal_candidate",
    can_be_in_batch_apply: false,
    can_be_publish_gate_candidate: true,
    rationale:
      "Slab signals may become internal candidates, but confirmation can feed a future publish gate and therefore requires explicit review/policy.",
  },
  {
    policy_id: "reference_metric_hold",
    review_lane: ["candidate_review", "high_signal_review", "reference_only_review"],
    evidence_lane: "reference_metric",
    eligible_statuses: ["pending", "in_review"],
    eligible_dispositions: ["review_pending_candidate", "review_pending_high_signal", "review_pending_reference_only"],
    action_name: "defer_more_evidence_or_defer_active_market_evidence",
    reason_code: "reference_only_no_market_support",
    automation_class: "hold_until_reference_policy",
    resulting_status: "pending_or_resolved",
    resulting_disposition: "policy_dependent",
    can_be_in_batch_apply: false,
    can_be_publish_gate_candidate: false,
    rationale:
      "Reference metrics are evidence, not market truth. They must hold until reference-only policy and active-market support rules are explicit.",
  },
  {
    policy_id: "unknown_evidence_manual_hold",
    review_lane: "*",
    evidence_lane: "unknown",
    eligible_statuses: ["pending", "in_review"],
    eligible_dispositions: ["*"],
    action_name: "defer_more_evidence",
    reason_code: "manual_hold",
    automation_class: "hold_until_manual_review",
    resulting_status: "pending_or_resolved",
    resulting_disposition: "policy_dependent",
    can_be_in_batch_apply: false,
    can_be_publish_gate_candidate: false,
    rationale: "Unknown evidence cannot be safely actioned without manual inspection or stronger classification.",
  },
  {
    policy_id: "terminal_no_action",
    review_lane: "*",
    evidence_lane: "*",
    eligible_statuses: ["blocked", "resolved"],
    eligible_dispositions: ["*"],
    action_name: null,
    reason_code: null,
    automation_class: "no_action",
    resulting_status: "unchanged",
    resulting_disposition: "unchanged",
    can_be_in_batch_apply: false,
    can_be_publish_gate_candidate: false,
    rationale: "Resolved or blocked rows are already routed. They should not be reprocessed without a new explicit package.",
  },
];

const automationClasses = lanePolicies.reduce((acc, policy) => {
  acc[policy.automation_class] = (acc[policy.automation_class] ?? 0) + 1;
  return acc;
}, {});

const currentPolicyImpact = {
  current_orchestrator_package: orchestrator.package_id,
  current_orchestrator_fingerprint: orchestrator.package_fingerprint_sha256,
  safe_internal_action_count: orchestrator.action_plan.safe_internal_action_count,
  held_action_count: orchestrator.action_plan.held_action_count,
  safe_internal_actions_by_action: {
    require_split: orchestrator.action_plan.action_counts.require_split,
  },
  held_actions_by_action: {
    confirm_internal_candidate: orchestrator.action_plan.action_counts.confirm_internal_candidate,
    defer_more_evidence: orchestrator.action_plan.action_counts.defer_more_evidence,
    defer_active_market_evidence: orchestrator.action_plan.action_counts.defer_active_market_evidence,
  },
  safe_internal_actions_allowed_now: ["confirm_monitor_only", "request_reclassification", "require_split"],
  current_safe_internal_action_to_apply_next: "require_split",
  current_safe_internal_action_rows_to_apply_next: orchestrator.action_plan.action_counts.require_split,
};

const foundationStatus = {
  foundation_before_this_package: foundation.foundation_status,
  blocker_satisfied_by_this_package: "lane_policy_contract",
  foundation_after_this_package: "not_complete",
  remaining_blockers: ["batch_review_action_workflow", "publish_gate_contract", "runbook"],
};

const findings = [];
if (foundation.next_sequence[1] !== "MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1 plan only") {
  findings.push("foundation_next_sequence_lane_policy_mismatch");
}
if (orchestrator.next_recommendation.package_id !== PACKAGE_ID) findings.push("orchestrator_next_recommendation_mismatch");
if (!actionWorkflowText.includes("confirm_internal_candidate")) findings.push("review_action_workflow_missing_confirm_action");
if (orchestrator.public_boundary.app_visible_rows !== 0) findings.push("orchestrator_public_boundary_app_visible_present");
if (orchestrator.object_counts.pricing_observations_count !== 0) findings.push("pricing_observations_present");

const reportPayload = {
  global_policy: globalPolicy,
  lane_policies: lanePolicies,
  automation_classes: automationClasses,
  current_policy_impact: currentPolicyImpact,
  foundation_status: foundationStatus,
  source_hashes: sourceHashes,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_review_lane_policy_contract",
  package_fingerprint_sha256: sha256Json(reportPayload),
  global_policy: globalPolicy,
  lane_policies: lanePolicies,
  automation_classes: automationClasses,
  current_policy_impact: currentPolicyImpact,
  foundation_status: foundationStatus,
  next_recommendation: {
    package_id: "MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1",
    reason:
      "Lane policy is now explicit. The next foundation blocker is turning orchestrator-safe actions into one approved batch package with preflight, apply, readback, rollback, and public-boundary proofs.",
    allowed_scope:
      "Schema/plan only if needed. No acquisition, no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
  },
  source_hashes: sourceHashes,
  findings,
  boundary_proof: {
    db_writes: false,
    function_invocation: false,
    action_event_inserts: false,
    disposition_updates: false,
    provider_calls: false,
    source_fetches: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  },
};

function renderPolicyTable(policies) {
  return policies
    .map((policy) => {
      const lane = Array.isArray(policy.review_lane) ? policy.review_lane.join(", ") : policy.review_lane;
      return `- \`${policy.policy_id}\`: lane=\`${lane}\`, evidence=\`${policy.evidence_lane}\`, action=\`${policy.action_name ?? "none"}\`, class=\`${policy.automation_class}\`, publish_gate_candidate=\`${policy.can_be_publish_gate_candidate}\``;
    })
    .join("\n");
}

function renderMarkdown(value) {
  return [
    "# MEE Core Review Lane Policy Contract V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Status: plan only",
    "",
    "## Purpose",
    "",
    "Define reusable post-ingest review lane policy before any batch review action workflow or publish gate exists.",
    "",
    "## Global Policy",
    "",
    ...Object.entries(value.global_policy).map(([key, val]) => `- ${key}: \`${val}\``),
    "",
    "## Lane Policies",
    "",
    renderPolicyTable(value.lane_policies),
    "",
    "## Current Policy Impact",
    "",
    `- Safe internal action rows: \`${value.current_policy_impact.safe_internal_action_count}\``,
    `- Held action rows: \`${value.current_policy_impact.held_action_count}\``,
    `- Current safe action to apply next: \`${value.current_policy_impact.current_safe_internal_action_to_apply_next}\``,
    `- Current safe rows to apply next: \`${value.current_policy_impact.current_safe_internal_action_rows_to_apply_next}\``,
    "",
    "## Foundation Status",
    "",
    `- Satisfies blocker: \`${value.foundation_status.blocker_satisfied_by_this_package}\``,
    `- Foundation after this package: \`${value.foundation_status.foundation_after_this_package}\``,
    `- Remaining blockers: ${value.foundation_status.remaining_blockers.map((blocker) => `\`${blocker}\``).join(", ")}`,
    "",
    "## Findings",
    "",
    value.findings.length === 0 ? "- None" : value.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
  ].join("\n");
}

const planMd = `# MEE Core Review Lane Policy Contract V1

Status: plan only

## Role In Foundation

This package completes the lane-policy blocker. It does not complete the whole MEE foundation.

## Policy Summary

- Auto-safe internal actions: \`confirm_monitor_only\`, \`request_reclassification\`, \`require_split\`.
- Held actions: \`confirm_internal_candidate\`, reference-metric deferrals, unknown/manual holds.
- No lane policy may write pricing, create market truth, or set public/app-visible flags.
- Publish-gate eligibility is only a future handoff concept and still requires \`MEE-CORE-PUBLISH-GATE-CONTRACT-V1\`.

## Next

Build \`MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1\` so current safe internal actions can be handled as one package instead of lane-by-lane approvals.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });
writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD, renderMarkdown(report));
writeFileSync(PLAN_MD, planMd);
writeFileSync(CHECKPOINT_MD, renderMarkdown(report));
writeFileSync(CONTRACT_MD, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      automation_classes: report.automation_classes,
      current_policy_impact: report.current_policy_impact,
      foundation_status: report.foundation_status,
      findings: report.findings,
      next_recommendation: report.next_recommendation,
    },
    null,
    2,
  ),
);
