import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-FOUNDATION-COMPLETE-V2";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");

const FAST_READBACK_REPORT =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1/report.json";
const QUALITY_TAXONOMY_REPORT =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-FLAG-TAXONOMY-V1/report.json";
const QUALITY_SCORING_REPORT =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-SCORING-READ-MODEL-V1/report.json";
const CANDIDATE_THRESHOLD_REPORT =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-CANDIDATE-THRESHOLD-SCORING-READ-MODEL-V1/report.json";

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

function boundaryProof() {
  return {
    db_writes: false,
    remote_migration_apply: false,
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
  };
}

function markdownList(rows) {
  return rows.map((row) => `- ${row}`).join("\n");
}

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });

const fastReadback = readJson(FAST_READBACK_REPORT);
const qualityTaxonomy = readJson(QUALITY_TAXONOMY_REPORT);
const qualityScoring = readJson(QUALITY_SCORING_REPORT);
const candidateThreshold = readJson(CANDIDATE_THRESHOLD_REPORT);
const fastSummary = fastReadback.summary ?? {};
const fastPublicBoundaryRows = Object.values(fastReadback.public_boundary ?? {}).reduce(
  (sum, value) => sum + Number(value ?? 0),
  0,
);

const completedFoundationLayers = [
  "provider_agnostic_lifecycle_state_and_transition_history",
  "warehouse_projection_into_lifecycle_observations",
  "internal_card_signal_and_review_queue_read_models",
  "review_disposition_table_and_append_only_action_events",
  "controlled_review_action_function_with_optimistic_locking",
  "safe_internal_review_cleanup_batches",
  "post_ingest_fast_review_readback",
  "candidate_review_threshold_contract",
  "quality_flag_taxonomy",
  "quality_scoring_read_model_candidate",
  "publish_gate_contract_boundary",
];

const remainingNonFoundationWork = [
  "remote_apply_quality_scoring_internal_view_if_desired",
  "nightly_scheduler_orchestration_at_3_to_4am",
  "future_publish_gate_apply_package_after_review_thresholds_are_real",
  "future_identity_confidence_v2_enhancement_for_new_ingests",
  "future_lane_reclassification_model_for_new_ingests",
  "future_manual_policy_model_for_new_ingests",
];

const findings = [];
if (fastSummary.remaining_safe_internal_action_rows !== 0) {
  findings.push("remaining_safe_internal_actions_not_zero");
}
if (fastPublicBoundaryRows !== 0) {
  findings.push("fast_readback_public_boundary_rows_present");
}
if (qualityScoring.gate_summary.quality_rollup_eligible_rows !== 0) {
  findings.push("unexpected_quality_rollup_eligible_rows");
}
if (candidateThreshold.boundary.auto_confirm_rows !== 0) {
  findings.push("unexpected_auto_confirm_rows");
}
if (
  qualityScoring.read_model_status !== "candidate_ready_no_remote_apply" &&
  qualityScoring.read_model_status !== "clear_no_pending_candidate_evidence"
) {
  findings.push("quality_scoring_read_model_not_ready");
}

const reportBasis = {
  package_id: PACKAGE_ID,
  source_fingerprints: {
    fast_readback: fastReadback.package_fingerprint_sha256,
    quality_taxonomy: qualityTaxonomy.package_fingerprint_sha256,
    quality_scoring: qualityScoring.package_fingerprint_sha256,
    candidate_threshold: candidateThreshold.package_fingerprint_sha256,
  },
  foundation_status: findings.length === 0 ? "complete_internal_quality_gated" : "blocked",
  completed_foundation_layers: completedFoundationLayers,
  current_review_state: {
    remaining_safe_internal_action_rows: fastSummary.remaining_safe_internal_action_rows,
    reviewer_candidate_rows: fastSummary.reviewer_candidate_rows,
    split_required_rows: fastSummary.split_required_rows,
    classification_blocked_rows: fastSummary.classification_blocked_rows,
    monitor_resolved_rows: fastSummary.monitor_resolved_rows,
    reference_policy_hold_rows: fastSummary.reference_policy_hold_rows,
    unknown_evidence_rows: fastSummary.unknown_evidence_rows,
    public_boundary_rows: fastPublicBoundaryRows,
  },
  current_quality_state: {
    candidate_evidence_rows: qualityScoring.gate_summary.candidate_evidence_rows,
    low_match_confidence_rows: qualityScoring.gate_summary.low_match_confidence_rows,
    lane_mismatch_rows: qualityScoring.gate_summary.lane_mismatch_rows,
    hard_exclusion_rows: qualityScoring.gate_summary.hard_exclusion_rows,
    manual_policy_rows: qualityScoring.gate_summary.manual_policy_rows,
    quality_rollup_eligible_rows: qualityScoring.gate_summary.quality_rollup_eligible_rows,
  },
  remaining_non_foundation_work: remainingNonFoundationWork,
  findings,
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "foundation_complete_current_state_checkpoint",
  package_fingerprint_sha256: sha256Json(reportBasis),
  public_pricing_allowed_now: false,
  acquisition_allowed_by_this_package: false,
  boundary_proof: boundaryProof(),
};

const markdown = `# ${PACKAGE_ID}

## Status

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Foundation status: \`${report.foundation_status}\`
- Public pricing allowed now: \`${report.public_pricing_allowed_now}\`
- Acquisition allowed by this package: \`${report.acquisition_allowed_by_this_package}\`

## Completed Foundation Layers

${markdownList(completedFoundationLayers)}

## Current Review State

\`\`\`json
${JSON.stringify(report.current_review_state, null, 2)}
\`\`\`

## Current Quality State

\`\`\`json
${JSON.stringify(report.current_quality_state, null, 2)}
\`\`\`

## What Remains

These are not foundation blockers. They are the next implementation layers after the foundation:

${markdownList(remainingNonFoundationWork)}

## Decision

The Market Evidence Engine foundation is complete for internal, quality-gated evidence handling. It is still deliberately unable to publish prices or treat provider evidence as market truth.
`;

const plan = `# ${PACKAGE_ID}

Next operational path:

1. Optionally apply the internal quality-scoring view candidate as a service-role-only read model.
2. Build identity confidence v2 and lane reclassification before confirming candidate evidence.
3. Add nightly 3-4am orchestration only after the quality gate is part of the daily runbook.
4. Keep public pricing as a separate publish-gate project.
`;

const checkpoint = `# ${PACKAGE_ID}

The MEE foundation reset is complete at the internal evidence-engine layer.

Current blockers have been moved out of foundation and into next-layer work:

- Identity confidence v2.
- Lane reclassification.
- Manual policy handling.
- Scheduler orchestration.
- Publish-gate implementation.

No public pricing, acquisition, DB writes, or provider calls were performed by this checkpoint.
`;

writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), markdown);
writeFileSync(path.join(CONTRACT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), markdown);
writeFileSync(path.join(PLAN_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), plan);
writeFileSync(path.join(CHECKPOINT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), checkpoint);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      foundation_status: report.foundation_status,
      current_review_state: report.current_review_state,
      current_quality_state: report.current_quality_state,
      findings,
    },
    null,
    2,
  ),
);
