export const TCGPLAYER_MARKET_PUBLICATION_POLICY_V1 =
  "TCGPLAYER_MARKET_PUBLICATION_POLICY_V1";

export const TCGPLAYER_MARKET_FRESHNESS_HOURS_V1 = 36;
export const TCGPLAYER_MARKET_SUPPRESSION_HOURS_V1 = 72;

const SUPPORTED_FINISHES = new Set(["normal", "holo", "reverse"]);
const EXCLUDED_PRODUCT_PATTERN =
  /\b(booster box|booster pack|code card|theme deck|battle deck|collection box|elite trainer box|tin|sealed)\b/i;

function clean(value) {
  return String(value ?? "").trim();
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeTcgplayerMarketSubtypeV1(value) {
  switch (clean(value).toLowerCase()) {
    case "normal":
      return "normal";
    case "holofoil":
      return "holo";
    case "reverse holofoil":
      return "reverse";
    default:
      return null;
  }
}

export function evaluateTcgplayerMarketQualificationV1(
  row = {},
  {
    now = new Date(),
    freshnessHours = TCGPLAYER_MARKET_FRESHNESS_HOURS_V1,
    suppressionHours = TCGPLAYER_MARKET_SUPPRESSION_HOURS_V1,
  } = {},
) {
  const reasons = [];
  const exclusionReasons = [];
  const sourceProductId = positiveInteger(row.source_product_id);
  const marketPrice = finiteNumber(row.market_price);
  const sourceMappingCount = Number(
    row.source_mapping_count ?? row.card_print_mapping_count ?? 0,
  );
  const mappingCount = Number(row.card_print_mapping_count ?? 0);
  const printingMappingCount = Number(row.card_printing_mapping_count ?? 0);
  const identityDomainCount = Number(row.identity_domain_count ?? 0);
  const duplicateProductRowCount = Number(
    row.duplicate_product_row_count ?? 0,
  );
  const sourceSyncFailedCount = Number(row.source_sync_failed_count ?? 0);
  const sourceArtifactByteSize = Number(row.source_artifact_byte_size ?? 0);
  const sourceFinishedAt = new Date(row.source_sync_finished_at ?? "");
  const sourceAgeHours = Number.isFinite(sourceFinishedAt.getTime())
    ? (now.getTime() - sourceFinishedAt.getTime()) / 3_600_000
    : null;
  const normalizedFinish =
    clean(row.normalized_finish_key) ||
    normalizeTcgplayerMarketSubtypeV1(row.source_subtype_name);
  const sourceProductName = clean(row.source_product_name);
  const cardRarity = clean(row.card_rarity);
  const variantAssignmentStatus = clean(
    row.variant_assignment_status ?? row.derived_variant_assignment_status,
  );

  if (Number(row.category_id) !== 3) exclusionReasons.push("not_pokemon_category");
  if (sourceProductId === null) reasons.push("invalid_source_product_id");
  if (row.source_product_active !== true) reasons.push("source_product_inactive");
  if (clean(row.source_product_catalog_status) !== "current") {
    reasons.push("source_product_not_current");
  }
  if (row.has_printed_number_evidence !== true) {
    reasons.push("missing_printed_number_evidence");
  }
  if (EXCLUDED_PRODUCT_PATTERN.test(sourceProductName) || /code card/i.test(cardRarity)) {
    exclusionReasons.push("unsupported_product_kind");
  }
  if (clean(row.currency).toUpperCase() !== "USD") reasons.push("unsupported_currency");
  if (marketPrice === null || marketPrice <= 0) reasons.push("missing_positive_market_price");
  if (!clean(row.source_row_hash ?? row.source_payload_hash)) {
    reasons.push("missing_source_row_hash");
  }
  if (!clean(row.source_observation_id)) reasons.push("missing_source_observation_id");
  if (!clean(row.source_sync_run_id)) reasons.push("missing_source_sync_run_id");
  if (!clean(row.source_artifact_id)) reasons.push("missing_source_artifact_id");
  if (!clean(row.source_artifact_hash)) reasons.push("missing_source_artifact_hash");
  if (sourceArtifactByteSize <= 0) reasons.push("invalid_source_artifact_size");
  if (!clean(row.source_price_row_identity)) {
    reasons.push("missing_source_price_row_identity");
  }
  if (clean(row.source_sync_mode) !== "current_full_sync") {
    reasons.push("not_current_source_sync");
  }
  if (clean(row.source_sync_status) !== "completed") {
    reasons.push("source_sync_not_completed");
  }
  if (sourceSyncFailedCount !== 0) {
    reasons.push("source_sync_not_reconciled");
  }
  if (sourceAgeHours === null) {
    reasons.push("missing_source_sync_finished_at");
  } else {
    if (sourceAgeHours < -0.1) reasons.push("source_sync_time_in_future");
  }
  if (sourceMappingCount !== 1) {
    reasons.push(
      sourceMappingCount === 0
        ? "missing_active_source_mapping"
        : "ambiguous_active_source_mapping",
    );
  }
  if (!clean(row.source_mapping_id)) reasons.push("missing_source_mapping_identity");
  if (!clean(row.mapping_method)) reasons.push("missing_mapping_method");
  if (mappingCount !== 1) {
    reasons.push(mappingCount === 0 ? "missing_exact_card_mapping" : "ambiguous_card_mapping");
  }
  if (!clean(row.card_print_id) || !clean(row.gv_id)) {
    reasons.push("missing_canonical_card_identity");
  }
  if (identityDomainCount !== 1 || clean(row.identity_domain) !== "pokemon_eng_standard") {
    reasons.push("not_english_standard_identity");
  }
  if (!SUPPORTED_FINISHES.has(normalizedFinish)) {
    reasons.push("unsupported_or_ambiguous_source_subtype");
  }
  if (variantAssignmentStatus !== "exact_child_finish") {
    reasons.push(
      variantAssignmentStatus
        ? "variant_assignment_not_exact_child_finish"
        : "missing_variant_assignment",
    );
  }
  if (printingMappingCount !== 1) {
    reasons.push(
      printingMappingCount === 0
        ? "missing_exact_printing_finish_mapping"
        : "ambiguous_printing_finish_mapping",
    );
  }
  if (
    !clean(row.card_printing_id) ||
    !clean(row.printing_gv_id) ||
    !clean(row.finish_key)
  ) {
    reasons.push("missing_canonical_printing_identity");
  }
  if (
    normalizedFinish &&
    clean(row.finish_key) &&
    normalizedFinish !== clean(row.finish_key)
  ) {
    reasons.push("finish_mapping_conflict");
  }
  if (duplicateProductRowCount !== 1) {
    reasons.push(
      duplicateProductRowCount > 1
        ? "duplicate_source_product_subtype"
        : "missing_source_product_subtype",
    );
  }

  let freshnessResult = "missing";
  if (sourceAgeHours !== null && sourceAgeHours >= -0.1) {
    if (sourceAgeHours <= freshnessHours) freshnessResult = "fresh";
    else if (sourceAgeHours <= suppressionHours) freshnessResult = "delayed";
    else freshnessResult = "suppressed_stale";
  }

  const languageResult =
    identityDomainCount === 1 && clean(row.identity_domain) === "pokemon_eng_standard"
      ? "english"
      : identityDomainCount === 0
        ? "missing"
        : clean(row.identity_domain).includes("_jpn")
          ? "non_english"
          : "ambiguous";
  const finishResult =
    variantAssignmentStatus === "exact_child_finish" &&
    printingMappingCount === 1 &&
    SUPPORTED_FINISHES.has(normalizedFinish)
      ? "exact_child_finish"
      : !normalizedFinish
        ? "unsupported"
        : printingMappingCount > 1
          ? "ambiguous"
          : "missing";
  const sourceIntegrityResult =
    clean(row.source_observation_id) &&
    clean(row.source_sync_run_id) &&
    clean(row.source_artifact_id) &&
    clean(row.source_artifact_hash) &&
    clean(row.source_row_hash ?? row.source_payload_hash) &&
    sourceArtifactByteSize > 0 &&
    clean(row.source_sync_status) === "completed" &&
    sourceSyncFailedCount === 0
      ? "passed"
      : "failed";
  const duplicateProductResult =
    duplicateProductRowCount === 1
      ? "unique"
      : duplicateProductRowCount > 1
        ? "duplicate"
        : "missing";

  let decision;
  let publicationLane;
  const decisionReasons = [...reasons];
  if (exclusionReasons.length > 0) {
    decision = "exclude";
    publicationLane = "excluded";
    decisionReasons.push(...exclusionReasons);
  } else if (decisionReasons.length > 0) {
    decision = "quarantine";
    publicationLane = "quarantine";
  } else if (freshnessResult === "delayed") {
    decision = "delay";
    publicationLane = "freshness_delayed";
    decisionReasons.push("source_freshness_delayed", "source_observation_stale");
  } else if (freshnessResult === "suppressed_stale") {
    decision = "suppress_stale";
    publicationLane = "suppressed_stale";
    decisionReasons.push("source_observation_stale", "source_suppressed_stale");
  } else if (freshnessResult !== "fresh") {
    decision = "quarantine";
    publicationLane = "quarantine";
    decisionReasons.push("missing_source_freshness");
  } else {
    decision = "publish";
    publicationLane = "current";
  }
  if (
    freshnessResult === "delayed" &&
    !decisionReasons.includes("source_observation_stale")
  ) {
    decisionReasons.push("source_freshness_delayed", "source_observation_stale");
  } else if (
    freshnessResult === "suppressed_stale" &&
    !decisionReasons.includes("source_observation_stale")
  ) {
    decisionReasons.push("source_observation_stale", "source_suppressed_stale");
  }

  const uniqueReasons = [...new Set(decisionReasons)].sort();
  const eligible = decision === "publish";

  return {
    policy_version: TCGPLAYER_MARKET_PUBLICATION_POLICY_V1,
    decision,
    eligible,
    publication_lane: publicationLane,
    language_result: languageResult,
    finish_result: finishResult,
    source_integrity_result: sourceIntegrityResult,
    duplicate_product_result: duplicateProductResult,
    freshness_result: freshnessResult,
    reason_codes: uniqueReasons,
    normalized_finish_key: normalizedFinish || null,
    source_age_hours:
      sourceAgeHours === null ? null : Math.round(sourceAgeHours * 1000) / 1000,
    evidence: {
      category_id: Number(row.category_id),
      source_product_active: row.source_product_active === true,
      source_product_catalog_status:
        clean(row.source_product_catalog_status) || null,
      has_printed_number_evidence: row.has_printed_number_evidence === true,
      source_sync_mode: clean(row.source_sync_mode) || null,
      source_sync_status: clean(row.source_sync_status) || null,
      source_sync_failed_count: sourceSyncFailedCount,
      source_sync_finished_at: clean(row.source_sync_finished_at) || null,
      source_age_hours:
        sourceAgeHours === null ? null : Math.round(sourceAgeHours * 1000) / 1000,
      card_print_mapping_count: mappingCount,
      source_mapping_count: sourceMappingCount,
      source_mapping_id: clean(row.source_mapping_id) || null,
      mapping_method: clean(row.mapping_method) || null,
      card_printing_mapping_count: printingMappingCount,
      identity_domain_count: identityDomainCount,
      identity_domain: clean(row.identity_domain) || null,
      source_subtype_name: clean(row.source_subtype_name) || null,
      normalized_finish_key: normalizedFinish || null,
      canonical_finish_key: clean(row.finish_key) || null,
      variant_assignment_id: clean(row.variant_assignment_id) || null,
      variant_assignment_status: variantAssignmentStatus || null,
      duplicate_product_row_count: duplicateProductRowCount,
      source_artifact_id: clean(row.source_artifact_id) || null,
      source_artifact_hash: clean(row.source_artifact_hash) || null,
      source_artifact_byte_size: sourceArtifactByteSize,
      source_price_row_identity:
        clean(row.source_price_row_identity) || null,
      source_row_hash:
        clean(row.source_row_hash ?? row.source_payload_hash) || null,
      language_result: languageResult,
      finish_result: finishResult,
      source_integrity_result: sourceIntegrityResult,
      duplicate_product_result: duplicateProductResult,
      freshness_result: freshnessResult,
      publication_lane: publicationLane,
      market_price_is_source_field: true,
      supporting_prices_do_not_set_market_close: true,
    },
  };
}
