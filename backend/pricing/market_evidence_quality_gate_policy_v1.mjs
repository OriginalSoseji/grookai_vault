import {
  evaluateMarketEvidenceAssignmentV1,
} from "./market_evidence_assignment_policy_v1.mjs";

export const MARKET_EVIDENCE_QUALITY_GATE_POLICY_VERSION_V1 =
  "MEE_EVIDENCE_QUALITY_GATE_POLICY_V1";

const BLOCKING_FLAGS = new Set([
  "blocking_exclusion_flag",
  "candidate_still_needs_review",
  "cleanup_quarantined",
  "high_ask_bucket_not_model_input",
  "high_price_outlier",
  "low_price_outlier",
  "missing_or_invalid_price",
  "missing_review_gate",
  "unsafe_direct_publish_flag",
]);

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function qualityFlags(row) {
  return Array.isArray(row?.quality_flags) ? row.quality_flags.filter(Boolean) : [];
}

function laneKind(row) {
  const evidenceType = String(row?.evidence_type ?? row?.source_type ?? "").toLowerCase();
  const title = String(row?.raw_title ?? row?.listing_title ?? "").toLowerCase();
  if (evidenceType.includes("slab") || title.includes(" psa ") || title.includes(" cgc ") || title.includes(" bgs ")) {
    return "slab";
  }
  return "raw_single";
}

export function evaluateMarketEvidenceQualityGateV1(row = {}) {
  const assignment = row.assignment_result ?? evaluateMarketEvidenceAssignmentV1(row);
  const flags = qualityFlags(row);
  const score = numberOrNull(row.evidence_quality_score ?? row.quality_score);
  const price = numberOrNull(row.normalized_price ?? row.raw_price);
  const reasons = [];

  if (!assignment.accepted) reasons.push("assignment_not_accepted");
  if (price === null || price <= 0) reasons.push("missing_or_invalid_price");
  if (row.can_publish_price_directly === true) reasons.push("unsafe_direct_publish_flag");
  if (row.needs_review !== true) reasons.push("missing_review_gate");
  if (row.model_eligible === false) reasons.push("model_ineligible");
  if (flags.some((flag) => BLOCKING_FLAGS.has(flag))) reasons.push("blocking_quality_flag");
  if (score !== null && score < 0.35) reasons.push("quality_score_below_internal_floor");

  const internalEligible = reasons.length === 0;
  return {
    policy_version: MARKET_EVIDENCE_QUALITY_GATE_POLICY_VERSION_V1,
    quality_gate_state: internalEligible ? "rollup_eligible_internal" : "quality_review_required",
    card_print_id: row.card_print_id ?? null,
    gv_id: row.gv_id ?? null,
    source: row.source ?? null,
    source_type: row.source_type ?? null,
    lane: assignment.lane,
    evidence_lane: laneKind(row),
    normalized_price: price,
    evidence_quality_score: score,
    model_eligible: row.model_eligible !== false,
    rollup_eligible_internal: internalEligible,
    reasons,
    needs_review: true,
    publishable: false,
    app_visible: false,
    market_truth: false,
  };
}

export function assertMarketEvidenceQualityGateSafeV1(result) {
  if (!result || typeof result !== "object") {
    throw new Error("[mee-quality-gate] result is required");
  }
  if (result.publishable !== false || result.app_visible !== false || result.market_truth !== false) {
    throw new Error("[mee-quality-gate] quality gate cannot publish evidence");
  }
  return true;
}
