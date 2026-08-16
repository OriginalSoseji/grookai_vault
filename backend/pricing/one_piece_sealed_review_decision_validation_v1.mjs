import {
  ONE_PIECE_SEALED_REVIEW_DECISIONS_V1,
} from "./one_piece_sealed_image_review_packet_v1.mjs";
import {
  sha256V1,
  stableJsonV1,
} from "./cross_tcg_sealed_product_domain_v1.mjs";

export const ONE_PIECE_SEALED_REVIEW_DECISION_EXPORT_VERSION =
  "ONE_PIECE_SEALED_IMAGE_REVIEW_DECISIONS_V1";
export const ONE_PIECE_SEALED_REVIEW_DECISION_VALIDATION_VERSION =
  "ONE_PIECE_SEALED_REVIEW_DECISION_VALIDATION_V1";

const CONFIRMATION_KEYS = Object.freeze([
  "source_image_matches_product_label",
  "package_form_visibly_supported",
  "official_family_relationship_supported",
  "language_or_region_visibly_supported",
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function itemFingerprintValid(item) {
  const { review_item_fingerprint_sha256: fingerprint, ...core } = item ?? {};
  return typeof fingerprint === "string" &&
    fingerprint === sha256V1(stableJsonV1(core));
}

function validOptionalCorrection(value) {
  return value === null || isNonEmptyString(value);
}

export function validateOnePieceSealedReviewDecisionExportV1({
  packetSummary,
  reviewItems,
  decisionExport,
}) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const expectedCount = packetSummary?.counts?.review_items;
  const decisions = Array.isArray(decisionExport?.decisions)
    ? decisionExport.decisions
    : [];
  const expectedByFingerprint = new Map();
  const expectedCandidateIds = new Set();
  const expectedSourceProductIds = new Set();

  add(packetSummary?.status !== "sealed_image_review_packet_passed_no_writes",
    "packet_summary_status_mismatch");
  add(!Number.isInteger(expectedCount) || expectedCount <= 0,
    "packet_review_count_invalid");
  add(reviewItems.length !== expectedCount, "packet_item_count_mismatch");

  for (const item of reviewItems) {
    const fingerprint = item?.review_item_fingerprint_sha256;
    add(!itemFingerprintValid(item),
      `packet_item_fingerprint_invalid:${item?.source_product_id ?? "unknown"}`);
    add(expectedByFingerprint.has(fingerprint),
      `packet_item_fingerprint_duplicate:${fingerprint ?? "missing"}`);
    add(expectedCandidateIds.has(item?.candidate_id),
      `packet_candidate_duplicate:${item?.candidate_id ?? "missing"}`);
    add(expectedSourceProductIds.has(item?.source_product_id),
      `packet_source_product_duplicate:${item?.source_product_id ?? "missing"}`);
    expectedByFingerprint.set(fingerprint, item);
    expectedCandidateIds.add(item?.candidate_id);
    expectedSourceProductIds.add(item?.source_product_id);
  }

  add(decisionExport?.version !==
    ONE_PIECE_SEALED_REVIEW_DECISION_EXPORT_VERSION,
  "decision_export_version_mismatch");
  add(decisionExport?.packet_fingerprint_sha256 !==
    packetSummary?.packet_fingerprint_sha256,
  "packet_fingerprint_mismatch");
  add(!isNonEmptyString(decisionExport?.reviewer), "reviewer_required");
  add(!isNonEmptyString(decisionExport?.exported_at) ||
    Number.isNaN(Date.parse(decisionExport?.exported_at ?? "")),
  "exported_at_invalid");
  add(decisionExport?.promotion_authorized !== false,
    "top_level_promotion_authority_overclaim");
  add(decisionExport?.database_apply_authority !== false,
    "top_level_database_authority_overclaim");
  add(decisions.length !== expectedCount, "decision_count_mismatch");

  const seenFingerprints = new Set();
  const seenCandidateIds = new Set();
  const seenSourceProductIds = new Set();
  for (const decision of decisions) {
    const fingerprint = decision?.review_item_fingerprint_sha256;
    const expected = expectedByFingerprint.get(fingerprint);
    const prefix = decision?.source_product_id ?? "unknown";
    add(!expected, `decision_item_not_in_packet:${prefix}`);
    add(seenFingerprints.has(fingerprint),
      `decision_item_duplicate:${fingerprint ?? "missing"}`);
    add(seenCandidateIds.has(decision?.candidate_id),
      `decision_candidate_duplicate:${decision?.candidate_id ?? "missing"}`);
    add(seenSourceProductIds.has(decision?.source_product_id),
      `decision_source_product_duplicate:${prefix}`);
    seenFingerprints.add(fingerprint);
    seenCandidateIds.add(decision?.candidate_id);
    seenSourceProductIds.add(decision?.source_product_id);

    if (!expected) continue;
    add(decision.candidate_id !== expected.candidate_id,
      `decision_candidate_mismatch:${prefix}`);
    add(decision.source_product_id !== expected.source_product_id,
      `decision_source_product_mismatch:${prefix}`);
    add(!expected.allowed_decisions.includes(decision.decision) ||
      !ONE_PIECE_SEALED_REVIEW_DECISIONS_V1.includes(decision.decision),
    `decision_value_invalid:${prefix}`);
    add(decision.promotion_authorized !== false,
      `decision_promotion_authority_overclaim:${prefix}`);
    add(decision.database_apply_authority !== false,
      `decision_database_authority_overclaim:${prefix}`);

    const confirmations = decision.confirmations;
    add(!confirmations || typeof confirmations !== "object" ||
      Array.isArray(confirmations), `confirmations_invalid:${prefix}`);
    for (const key of CONFIRMATION_KEYS) {
      add(typeof confirmations?.[key] !== "boolean",
        `confirmation_value_invalid:${prefix}:${key}`);
    }
    add(Object.keys(confirmations ?? {}).some((key) =>
      !CONFIRMATION_KEYS.includes(key)),
    `confirmation_key_invalid:${prefix}`);
    for (const key of [
      "corrected_package_form",
      "corrected_language_code",
      "corrected_region_code",
      "corrected_wave",
    ]) {
      add(!validOptionalCorrection(decision[key]),
        `correction_value_invalid:${prefix}:${key}`);
    }
    add(typeof decision.evidence_note !== "string",
      `evidence_note_invalid:${prefix}`);

    if (decision.decision === "exact_variant_visually_confirmed") {
      add(!CONFIRMATION_KEYS.every((key) => confirmations?.[key] === true),
        `exact_confirmation_incomplete:${prefix}`);
      add(!isNonEmptyString(decision.evidence_note),
        `exact_confirmation_note_required:${prefix}`);
    }
  }

  for (const item of reviewItems) {
    const prefix = item.source_product_id;
    add(!seenFingerprints.has(item.review_item_fingerprint_sha256),
      `decision_item_missing:${prefix}`);
    add(!seenCandidateIds.has(item.candidate_id),
      `decision_candidate_missing:${prefix}`);
    add(!seenSourceProductIds.has(item.source_product_id),
      `decision_source_product_missing:${prefix}`);
  }

  const decisionCounts = Object.fromEntries(
    ONE_PIECE_SEALED_REVIEW_DECISIONS_V1.map((decision) => [
      decision,
      decisions.filter((row) => row?.decision === decision).length,
    ]),
  );
  const uniqueFindings = [...new Set(findings)];
  const valid = uniqueFindings.length === 0;
  const complete = valid && decisionCounts.unreviewed === 0;
  const resultCore = {
    version: ONE_PIECE_SEALED_REVIEW_DECISION_VALIDATION_VERSION,
    status: !valid
      ? "decision_export_invalid_no_writes"
      : complete
        ? "complete_review_reconciled_no_writes"
        : "partial_review_reconciled_no_writes",
    valid,
    complete,
    packet_fingerprint_sha256:
      packetSummary?.packet_fingerprint_sha256 ?? null,
    decision_export_fingerprint_sha256:
      sha256V1(stableJsonV1(decisionExport ?? null)),
    counts: {
      expected_review_items: expectedCount ?? 0,
      exported_decisions: decisions.length,
      unique_review_item_fingerprints: seenFingerprints.size,
      unique_candidate_ids: seenCandidateIds.size,
      unique_source_product_ids: seenSourceProductIds.size,
      decisions: decisionCounts,
      exact_visual_confirmations:
        decisionCounts.exact_variant_visually_confirmed,
      promotion_authorized: 0,
      database_apply_authorized: 0,
    },
    findings: uniqueFindings,
    boundaries: {
      validation_only: true,
      database_connections: 0,
      database_writes: 0,
      storage_writes: 0,
      canonical_authority: false,
      source_mapping_authority: false,
      pricing_authority: false,
      publication_authority: false,
      app_visibility_enabled: false,
    },
    exact_next_gate: complete
      ? "construct a separately approved exact sealed canonical apply plan from eligible reviewed rows"
      : "complete or repair the human review export and rerun no-write validation",
  };
  return {
    ...resultCore,
    validation_fingerprint_sha256: sha256V1(stableJsonV1(resultCore)),
  };
}
