import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");

const FAST_READBACK_REPORT =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1/report.json";

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

function countStatus(currentStatus, predicate) {
  return currentStatus.filter(predicate).reduce((sum, row) => sum + Number(row.rows), 0);
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column.key] ?? "")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });

const fastReadback = readJson(FAST_READBACK_REPORT);
const currentStatus = fastReadback.current_status ?? [];

const laneCounts = {
  raw_single_candidate_rows: countStatus(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.evidence_lane === "raw_single" &&
      row.review_lane === "candidate_review" &&
      row.review_status === "pending",
  ),
  raw_single_high_signal_rows: countStatus(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.evidence_lane === "raw_single" &&
      row.review_lane === "high_signal_review" &&
      row.review_status === "pending",
  ),
  slab_candidate_rows: countStatus(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.evidence_lane === "slab" &&
      row.review_lane === "candidate_review" &&
      row.review_status === "pending",
  ),
  reference_candidate_rows: countStatus(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.evidence_lane === "reference_metric" &&
      row.review_lane === "candidate_review" &&
      row.review_status === "pending",
  ),
  reference_high_signal_rows: countStatus(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.evidence_lane === "reference_metric" &&
      row.review_lane === "high_signal_review" &&
      row.review_status === "pending",
  ),
  reference_only_rows: countStatus(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.evidence_lane === "reference_metric" &&
      row.review_lane === "reference_only_review" &&
      row.review_status === "pending",
  ),
  unknown_rows: countStatus(
    currentStatus,
    (row) => row.needs_review === true && row.evidence_lane === "unknown" && row.review_status === "pending",
  ),
};

const policyRows = [
  {
    lane: "candidate_review",
    evidence_lane: "raw_single",
    current_rows: laneCounts.raw_single_candidate_rows,
    action: "manual_review_or_future_threshold",
    automation_class: "manual_or_threshold_required",
    publication_gate_candidate: false,
    reason:
      "Raw active listing evidence can be useful, but confirmation can make it publish-gate-adjacent. It cannot auto-confirm without a separate threshold contract.",
  },
  {
    lane: "high_signal_review",
    evidence_lane: "raw_single",
    current_rows: laneCounts.raw_single_high_signal_rows,
    action: "priority_manual_review",
    automation_class: "manual_or_threshold_required",
    publication_gate_candidate: false,
    reason:
      "High signal raw evidence should be reviewed first, but not auto-published and not auto-confirmed as market truth.",
  },
  {
    lane: "candidate_review",
    evidence_lane: "slab",
    current_rows: laneCounts.slab_candidate_rows,
    action: "manual_review_or_future_threshold",
    automation_class: "manual_or_threshold_required",
    publication_gate_candidate: false,
    reason:
      "Slab evidence belongs in a separate lane from raw singles. It can support slab-specific internal review only.",
  },
  {
    lane: "candidate_review, high_signal_review",
    evidence_lane: "reference_metric",
    current_rows: laneCounts.reference_candidate_rows + laneCounts.reference_high_signal_rows,
    action: "defer_more_evidence",
    automation_class: "auto_safe_internal_after_policy",
    publication_gate_candidate: false,
    reason:
      "Reference metrics are evidence, not market truth. They should be resolved out of review pressure until active market evidence exists.",
  },
  {
    lane: "reference_only_review",
    evidence_lane: "reference_metric",
    current_rows: laneCounts.reference_only_rows,
    action: "defer_active_market_evidence",
    automation_class: "auto_safe_internal_after_policy",
    publication_gate_candidate: false,
    reason:
      "Pure reference-only rows require active market evidence before they can become pricing candidates.",
  },
  {
    lane: "candidate_review",
    evidence_lane: "unknown",
    current_rows: laneCounts.unknown_rows,
    action: "block_evidence",
    automation_class: "auto_safe_internal_after_policy",
    publication_gate_candidate: false,
    reason:
      "Unknown evidence cannot be reviewed as a pricing candidate. It should be blocked until classification repair or source replay.",
  },
];

const automation = {
  safe_now_after_this_policy: {
    reference_metric_defer_more_evidence_rows: laneCounts.reference_candidate_rows + laneCounts.reference_high_signal_rows,
    reference_only_defer_active_market_evidence_rows: laneCounts.reference_only_rows,
    unknown_block_evidence_rows: laneCounts.unknown_rows,
    total_rows:
      laneCounts.reference_candidate_rows +
      laneCounts.reference_high_signal_rows +
      laneCounts.reference_only_rows +
      laneCounts.unknown_rows,
  },
  not_auto_safe: {
    raw_single_candidate_rows: laneCounts.raw_single_candidate_rows,
    raw_single_high_signal_rows: laneCounts.raw_single_high_signal_rows,
    slab_candidate_rows: laneCounts.slab_candidate_rows,
    total_rows: laneCounts.raw_single_candidate_rows + laneCounts.raw_single_high_signal_rows + laneCounts.slab_candidate_rows,
  },
};

const reportBasis = {
  package_id: PACKAGE_ID,
  source_fast_readback_fingerprint: fastReadback.package_fingerprint_sha256,
  lane_counts: laneCounts,
  policy_rows: policyRows,
  automation,
  public_boundary: fastReadback.public_boundary,
  findings: [],
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "plan_only_remaining_review_lane_policy",
  package_fingerprint_sha256: sha256Json(reportBasis),
  policy_status: "ready_for_batch_plan_generation",
  hard_boundaries: {
    providers_create_market_truth: false,
    active_listings_are_market_truth: false,
    reference_metrics_are_market_truth: false,
    review_actions_can_publish_prices: false,
    review_actions_can_set_public_flags: false,
    public_pricing_requires_separate_publish_gate: true,
    nightly_automation_may_run_safe_internal_actions_only: true,
  },
};

const policyTable = markdownTable(policyRows, [
  { key: "lane", label: "lane" },
  { key: "evidence_lane", label: "evidence" },
  { key: "current_rows", label: "rows" },
  { key: "action", label: "action" },
  { key: "automation_class", label: "class" },
]);

const markdown = `# ${PACKAGE_ID}

## Status

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Status: \`${report.policy_status}\`
- Source fast readback: \`${report.source_fast_readback_fingerprint}\`

## Purpose

Finish the remaining review-lane policy after mixed raw/slab split rows were routed.

This package does not apply actions. It defines what can be automated later and what must stay manual or threshold-gated.

## Policy

${policyTable}

## Safe Internal Actions After This Policy

- Reference metric defer-more-evidence rows: \`${automation.safe_now_after_this_policy.reference_metric_defer_more_evidence_rows}\`
- Reference-only defer-active-market-evidence rows: \`${automation.safe_now_after_this_policy.reference_only_defer_active_market_evidence_rows}\`
- Unknown block-evidence rows: \`${automation.safe_now_after_this_policy.unknown_block_evidence_rows}\`
- Total safe internal rows: \`${automation.safe_now_after_this_policy.total_rows}\`

## Not Auto Safe

- Raw single candidate rows: \`${automation.not_auto_safe.raw_single_candidate_rows}\`
- Raw single high-signal rows: \`${automation.not_auto_safe.raw_single_high_signal_rows}\`
- Slab candidate rows: \`${automation.not_auto_safe.slab_candidate_rows}\`
- Total manual or threshold-required rows: \`${automation.not_auto_safe.total_rows}\`

## Boundaries

No public pricing may be produced by this policy.

No app-visible pricing may be produced by this policy.

Reference metrics and active listings remain evidence, not truth.
`;

const checkpoint = `# ${PACKAGE_ID}

The remaining MEE review lanes are now policy-defined.

Safe internal actions that can be batched later:

- \`${automation.safe_now_after_this_policy.reference_metric_defer_more_evidence_rows}\` reference metric rows to \`defer_more_evidence\`
- \`${automation.safe_now_after_this_policy.reference_only_defer_active_market_evidence_rows}\` reference-only rows to \`defer_active_market_evidence\`
- \`${automation.safe_now_after_this_policy.unknown_block_evidence_rows}\` unknown rows to \`block_evidence\`

Manual or threshold-required rows:

- \`${automation.not_auto_safe.total_rows}\` raw/slab market candidate rows

This preserves the foundation rule: evidence providers do not create public price truth.
`;

const plan = `# ${PACKAGE_ID}

Next implementation step:

1. Generate one safe internal batch package for the \`${automation.safe_now_after_this_policy.total_rows}\` policy-safe rows.
2. Do not include the \`${automation.not_auto_safe.total_rows}\` raw/slab candidate rows in that batch.
3. Keep all action events and dispositions non-public.
4. After apply, run the fast post-ingest review readback.
5. Later, define a separate threshold/reviewer workflow for raw/slab candidate confirmation.
`;

writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), markdown);
writeFileSync(path.join(CONTRACT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), markdown);
writeFileSync(path.join(CHECKPOINT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), checkpoint);
writeFileSync(path.join(PLAN_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), plan);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      policy_status: report.policy_status,
      automation,
      findings: report.findings,
    },
    null,
    2,
  ),
);
