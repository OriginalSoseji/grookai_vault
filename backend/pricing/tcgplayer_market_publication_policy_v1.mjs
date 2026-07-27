export const TCGPLAYER_MARKET_PUBLICATION_POLICY_V1 =
  "TCGPLAYER_MARKET_PUBLICATION_POLICY_V1";

export const TCGPLAYER_MARKET_FRESHNESS_HOURS_V1 = 36;

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
  } = {},
) {
  const reasons = [];
  const sourceProductId = positiveInteger(row.source_product_id);
  const marketPrice = finiteNumber(row.market_price);
  const mappingCount = Number(row.card_print_mapping_count ?? 0);
  const printingMappingCount = Number(row.card_printing_mapping_count ?? 0);
  const identityDomainCount = Number(row.identity_domain_count ?? 0);
  const sourceFinishedAt = new Date(row.source_sync_finished_at ?? "");
  const sourceAgeHours = Number.isFinite(sourceFinishedAt.getTime())
    ? (now.getTime() - sourceFinishedAt.getTime()) / 3_600_000
    : null;
  const normalizedFinish =
    clean(row.normalized_finish_key) ||
    normalizeTcgplayerMarketSubtypeV1(row.source_subtype_name);
  const sourceProductName = clean(row.source_product_name);
  const cardRarity = clean(row.card_rarity);

  if (Number(row.category_id) !== 3) reasons.push("not_pokemon_category");
  if (sourceProductId === null) reasons.push("invalid_source_product_id");
  if (row.source_product_active !== true) reasons.push("source_product_inactive");
  if (clean(row.source_product_catalog_status) !== "current") {
    reasons.push("source_product_not_current");
  }
  if (row.has_printed_number_evidence !== true) {
    reasons.push("missing_printed_number_evidence");
  }
  if (EXCLUDED_PRODUCT_PATTERN.test(sourceProductName) || /code card/i.test(cardRarity)) {
    reasons.push("unsupported_product_kind");
  }
  if (clean(row.currency).toUpperCase() !== "USD") reasons.push("unsupported_currency");
  if (marketPrice === null || marketPrice <= 0) reasons.push("missing_positive_market_price");
  if (!clean(row.source_payload_hash)) reasons.push("missing_source_payload_hash");
  if (!clean(row.source_observation_id)) reasons.push("missing_source_observation_id");
  if (!clean(row.source_sync_run_id)) reasons.push("missing_source_sync_run_id");
  if (clean(row.source_sync_mode) !== "current_full_sync") {
    reasons.push("not_current_source_sync");
  }
  if (clean(row.source_sync_status) !== "completed") {
    reasons.push("source_sync_not_completed");
  }
  if (sourceAgeHours === null) {
    reasons.push("missing_source_sync_finished_at");
  } else {
    if (sourceAgeHours < -0.1) reasons.push("source_sync_time_in_future");
    if (sourceAgeHours > freshnessHours) reasons.push("source_observation_stale");
  }
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

  const uniqueReasons = [...new Set(reasons)].sort();
  const eligible = uniqueReasons.length === 0;

  return {
    policy_version: TCGPLAYER_MARKET_PUBLICATION_POLICY_V1,
    decision: eligible ? "publish" : "quarantine",
    eligible,
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
      source_sync_finished_at: clean(row.source_sync_finished_at) || null,
      source_age_hours:
        sourceAgeHours === null ? null : Math.round(sourceAgeHours * 1000) / 1000,
      card_print_mapping_count: mappingCount,
      card_printing_mapping_count: printingMappingCount,
      identity_domain_count: identityDomainCount,
      identity_domain: clean(row.identity_domain) || null,
      source_subtype_name: clean(row.source_subtype_name) || null,
      normalized_finish_key: normalizedFinish || null,
      canonical_finish_key: clean(row.finish_key) || null,
      market_price_is_source_field: true,
      supporting_prices_do_not_set_market_close: true,
    },
  };
}

