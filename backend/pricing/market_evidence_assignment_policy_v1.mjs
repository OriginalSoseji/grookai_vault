export const MARKET_EVIDENCE_ASSIGNMENT_POLICY_VERSION_V1 =
  "MEE_GVID_ASSIGNMENT_POLICY_V1";

const STRONG_CONFIDENCE = new Set([
  "high",
  "exact_candidate",
  "tcgdex_external_mapping_active",
]);

const REVIEW_CONFIDENCE = new Set([
  "medium",
  "none",
  "low",
  "unverified_payload_match",
]);

const BLOCKING_FLAGS = new Set([
  "ambiguous_variant",
  "foreign_language",
  "graded_or_slab",
  "lot_or_bundle",
  "proxy_or_reprint",
  "sealed_product",
  "source_terms_unclear",
  "world_championship_replica",
  "wrong_finish",
  "wrong_number",
  "wrong_print_run",
  "wrong_set",
]);

function text(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function flags(row) {
  return Array.isArray(row?.exclusion_flags) ? row.exclusion_flags.filter(Boolean) : [];
}

export function classifyMarketEvidenceLaneV1(row = {}) {
  const gvId = text(row.gv_id ?? row.card?.gv_id);
  const setName = lower(row.set_name ?? row.card?.set_name ?? row.raw_payload?.set_name);

  if (gvId.startsWith("GV-PK-WCD-") || setName.includes("world championship")) return "world_championship";
  if (gvId.startsWith("GV-PK-MCD-") || setName.includes("mcdonald")) return "mcdonalds";
  if (gvId.startsWith("GV-PK-TK-") || setName.includes("trainer kit")) return "trainer_kit";
  if (gvId.startsWith("GV-PK-MEP-") || setName.includes("mega evolution promo")) return "mep";
  if (gvId.startsWith("GV-PK-BASE1-") && /-(FIRST-EDITION|SHADOWLESS|1999-2000)$/.test(gvId)) {
    return "base_print_run";
  }
  if (gvId.includes("-PR-") || setName.includes("promo")) return "promo";
  return "ordinary";
}

export function evaluateMarketEvidenceAssignmentV1(row = {}) {
  const cardPrintId = text(row.card_print_id);
  const gvId = text(row.gv_id);
  const source = text(row.source);
  const sourceType = text(row.source_type);
  const confidence = text(row.match_confidence_hint);
  const lane = classifyMarketEvidenceLaneV1(row);
  const rowFlags = flags(row);
  const reasons = [];

  if (!cardPrintId) reasons.push("missing_card_print_id");
  if (!gvId) reasons.push("missing_gv_id");
  if (!source) reasons.push("missing_source");
  if (rowFlags.some((flag) => BLOCKING_FLAGS.has(flag))) reasons.push("blocking_exclusion_flag");
  if (!STRONG_CONFIDENCE.has(confidence)) reasons.push(`insufficient_match_confidence:${confidence || "missing"}`);

  if (sourceType === "active_listing" && row.title_gate?.passes === false) {
    reasons.push("active_listing_title_gate_failed");
  }

  if (
    sourceType === "active_listing" &&
    ["world_championship", "mcdonalds", "trainer_kit", "mep", "base_print_run"].includes(lane) &&
    confidence !== "exact_candidate"
  ) {
    reasons.push(`special_lane_requires_exact_active_listing_match:${lane}`);
  }

  const accepted = reasons.length === 0;
  return {
    policy_version: MARKET_EVIDENCE_ASSIGNMENT_POLICY_VERSION_V1,
    assignment_state: accepted ? "assignment_accepted" : "assignment_needs_review",
    card_print_id: cardPrintId || null,
    gv_id: gvId || null,
    source: source || null,
    source_type: sourceType || null,
    lane,
    match_confidence_hint: confidence || null,
    accepted,
    reasons,
    needs_review: true,
    publishable: false,
    app_visible: false,
    market_truth: false,
  };
}

export function assertMarketEvidenceAssignmentSafeV1(result) {
  if (!result || typeof result !== "object") {
    throw new Error("[mee-assignment] result is required");
  }
  if (result.publishable !== false || result.app_visible !== false || result.market_truth !== false) {
    throw new Error("[mee-assignment] assignment policy cannot publish evidence");
  }
  return true;
}
