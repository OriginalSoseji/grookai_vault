import { createHash } from "node:crypto";

export const ONE_PIECE_CATEGORY_ID = 68;
export const ONE_PIECE_CANONICAL_CATALOG_CANDIDATE_V1 =
  "ONE_PIECE_CANONICAL_CATALOG_CANDIDATE_V1";
export const ONE_PIECE_IDENTITY_KEY_VERSION =
  "ONE_PIECE_TCGPLAYER_PRINT_IDENTITY_V1";

const CARD_TYPES = new Map([
  ["character", "character"],
  ["don", "don"],
  ["don!!", "don"],
  ["event", "event"],
  ["leader", "leader"],
  ["stage", "stage"],
]);

const SEALED_PATTERNS = [
  ["booster_box", /\bbooster box\b/i],
  ["booster_case", /\bbooster case\b|\bcase of\b/i],
  ["booster_pack", /\bbooster pack\b/i],
  ["display", /\bdisplay\b/i],
  ["starter_deck", /\bstarter decks?\b/i],
  ["deck_set", /\bdeck set\b/i],
  ["ultra_deck", /\bultra deck\b/i],
  ["double_pack", /\bdouble pack\b/i],
  ["gift_collection", /\bgift collection\b/i],
  ["premium_card_collection", /\bpremium card collection\b/i],
  ["devil_fruits_collection", /\bdevil fruits collection\b/i],
  ["sealed_bundle", /\bsealed (?:promotional )?bundle\b/i],
  ["collection_box", /\b(?:collection|illustration) box\b/i],
  ["edition_box", /\bedition box\b/i],
  ["special_don_set", /\bspecial don!*!? set\b/i],
  ["event_pack", /\bevent pack\b/i],
  ["winner_pack", /\bwinner pack\b/i],
  ["tournament_pack", /\btournament pack\b/i],
  ["promotion_pack", /\bpromotion pack\b/i],
  ["collection_set", /\bcollection set\b/i],
  ["booster_set", /\bbooster set\b/i],
  ["pack", /\bpack\b/i],
  ["kit", /\bkit\b/i],
  ["set_of_multiple", /\bset of \d+\b/i],
];

const ACCESSORY_PATTERNS = [
  ["binder", /\bbinder\b|\bportfolio\b/i],
  ["deck_box", /\bdeck box\b/i],
  ["playmat", /\bplay ?mat\b/i],
  ["sleeves", /\bcard sleeves?\b|\bsleeves?\b/i],
  ["storage_box", /\bstorage box\b/i],
];

const TREATMENT_PATTERNS = [
  ["alternate_art", /\balternate art\b|\balt art\b/i],
  ["manga", /\bmanga\b/i],
  ["parallel", /\bparallel\b/i],
  ["winner", /\bwinner\b/i],
  ["tournament", /\btournament\b/i],
  ["championship", /\bchampionship\b/i],
  ["treasure_cup", /\btreasure cup\b/i],
  ["pre_release", /\bpre[- ]?release\b/i],
  ["anniversary", /\banniversary\b/i],
  ["serialized", /\b(?:serialized|serial numbered)\b|\b\d+\/\d+\b/i],
  ["gold", /\bgold\b/i],
];

const HARD_PACKAGING_SIGNALS = new Set([
  "booster_box",
  "booster_case",
  "booster_pack",
  "display",
  "starter_deck",
  "deck_set",
  "ultra_deck",
  "double_pack",
  "gift_collection",
  "premium_card_collection",
  "devil_fruits_collection",
  "sealed_bundle",
  "collection_box",
  "edition_box",
  "special_don_set",
  "collection_set",
  "booster_set",
  "pack",
  "kit",
  "set_of_multiple",
]);

function clean(value) {
  return String(value ?? "").trim();
}

function cleanLower(value) {
  return clean(value).toLowerCase();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeFieldName(value) {
  return cleanLower(value).replace(/[^a-z0-9]+/g, "");
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).map(clean).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function parseDate(value) {
  const text = clean(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoDate(value) {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : null;
}

function normalizedCardType(value) {
  return CARD_TYPES.get(cleanLower(value)) ?? null;
}

export function onePieceExtendedDataV1(extendedData) {
  if (!Array.isArray(extendedData)) {
    return { valid: false, fields: {}, entries: [] };
  }

  const fields = {};
  const entries = [];
  for (const rawEntry of extendedData) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const field = normalizeFieldName(rawEntry.name);
    const value = clean(rawEntry.value);
    if (!field || !value) continue;
    entries.push({ field, value });
    fields[field] ??= [];
    fields[field].push(value);
  }
  for (const field of Object.keys(fields)) fields[field] = uniqueSorted(fields[field]);
  return { valid: true, fields, entries };
}

function firstField(fields, ...names) {
  for (const name of names) {
    const value = fields[normalizeFieldName(name)]?.[0];
    if (value) return value;
  }
  return null;
}

function patternSignals(value, patterns) {
  return patterns.filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
}

function cardNumberFormat(value) {
  const number = clean(value).toUpperCase();
  if (!number) return null;
  if (/^OP\d{2}-\d{3}$/.test(number)) return "booster";
  if (/^ST\d{2}-\d{3}$/.test(number)) return "starter";
  if (/^EB\d{2}-\d{3}$/.test(number)) return "extra_booster";
  if (/^P-\d{3}$/.test(number)) return "promo";
  return "explicit_nonstandard";
}

function explicitLanguageClaim(name) {
  const normalized = cleanLower(name);
  const claims = [
    ["en", /\benglish\b/],
    ["fr", /\bfrench\b/],
    ["de", /\bgerman\b/],
    ["it", /\bitalian\b/],
    ["ja", /\bjapanese\b/],
    ["ko", /\bkorean\b/],
    ["pt", /\bportuguese\b/],
    ["es", /\bspanish\b/],
    ["zh", /\bchinese\b/],
  ].filter(([, pattern]) => pattern.test(normalized));
  if (claims.length === 1) {
    return { normalized: claims[0][0], authority: "explicit_product_name", explicit: true };
  }
  if (claims.length > 1) {
    return { normalized: null, authority: "conflicting_product_name", explicit: true };
  }
  return {
    normalized: "en",
    authority: "tcgplayer_category_68_default_unverified",
    explicit: false,
  };
}

function releaseState(row, asOfDate) {
  const presaleInfo =
    row?.presale_info && typeof row.presale_info === "object" && !Array.isArray(row.presale_info)
      ? row.presale_info
      : {};
  const releasedOn = isoDate(presaleInfo.releasedOn ?? row?.published_on);
  const asOf = parseDate(`${asOfDate}T23:59:59.999Z`);
  const released = parseDate(releasedOn);
  const explicitPresale = presaleInfo.isPresale === true;
  const futureRelease = Boolean(asOf && released && released.getTime() > asOf.getTime());
  return {
    explicit_presale: explicitPresale,
    released_on: releasedOn,
    future_release: futureRelease,
    current_release_eligible: !explicitPresale && !futureRelease,
  };
}

function normalizedPriceLanes(sourcePriceLanes) {
  return (sourcePriceLanes ?? [])
    .map((row) => ({
      source_price_row_identity: clean(row.source_price_row_identity) || null,
      subtype_name_normalized: cleanLower(row.subtype_name_normalized),
      observed_on: isoDate(row.observed_on),
      positive_market_signal: Number(row.market_price) > 0,
    }))
    .filter((row) => row.subtype_name_normalized)
    .sort((left, right) =>
      `${left.subtype_name_normalized}:${left.source_price_row_identity}`.localeCompare(
        `${right.subtype_name_normalized}:${right.source_price_row_identity}`,
      ),
    );
}

export function classifyOnePieceSourceProductV1(row = {}, options = {}) {
  const asOfDate = clean(options.asOfDate) || new Date().toISOString().slice(0, 10);
  const productId = Number(row.product_id);
  const categoryId = Number(row.category_id);
  const name = clean(row.name);
  const groupName = clean(row.group_name);
  const extended = onePieceExtendedDataV1(row.extended_data);
  const number = firstField(extended.fields, "number");
  const rawCardType = firstField(extended.fields, "cardtype", "card type");
  const cardType = normalizedCardType(rawCardType);
  const rarity = firstField(extended.fields, "rarity");
  const structuredDon = cardType === "don" || cleanLower(rarity) === "don!!";
  const titleDon = /\bdon!*!?\s*card\b/i.test(name);
  const sealedSignals = patternSignals(name, SEALED_PATTERNS);
  const outerTitle = name.replace(/\([^)]*\)/g, " ");
  const outerTitleSealedSignals = patternSignals(outerTitle, SEALED_PATTERNS);
  const hardPackagingConflict = outerTitleSealedSignals.some((signal) =>
    HARD_PACKAGING_SIGNALS.has(signal),
  );
  const accessorySignals = patternSignals(name, ACCESSORY_PATTERNS);
  const treatmentSignals = patternSignals(name, TREATMENT_PATTERNS);
  const hasStructuredCardEvidence = Boolean(number || cardType || rarity);
  const release = releaseState(row, asOfDate);
  const language = explicitLanguageClaim(name);
  const reasons = [];
  let classification = "ambiguous_quarantine";
  let singleKind = null;

  if (!Number.isInteger(productId) || productId <= 0) reasons.push("invalid_product_id");
  if (categoryId !== ONE_PIECE_CATEGORY_ID) reasons.push("wrong_category");
  if (!name) reasons.push("missing_product_name");
  if (!extended.valid) reasons.push("malformed_extended_data");
  if (!language.normalized) reasons.push("conflicting_language_claims");

  const structuralFailure = reasons.length > 0;
  if (!structuralFailure && hardPackagingConflict && hasStructuredCardEvidence) {
    reasons.push("packaging_and_card_evidence_conflict");
  } else if (!structuralFailure && number && cardType) {
    classification = "exact_single_card_candidate";
    singleKind = cardType === "don" ? "don_card" : "numbered_card";
    reasons.push("explicit_number_and_cardtype");
  } else if (!structuralFailure && structuredDon && !hardPackagingConflict) {
    classification = "exact_single_card_candidate";
    singleKind = "don_card";
    reasons.push("structured_don_card_evidence");
  } else if (
    !structuralFailure &&
    titleDon &&
    !sealedSignals.length &&
    (cleanLower(rarity) === "don!!" || cleanLower(rawCardType) === "don!!")
  ) {
    classification = "exact_single_card_candidate";
    singleKind = "don_card";
    reasons.push("title_and_structured_don_card_evidence");
  } else if (!structuralFailure && sealedSignals.length && !hasStructuredCardEvidence) {
    classification = "sealed_product_candidate";
    reasons.push("explicit_packaged_product_name_without_card_metadata");
  } else if (!structuralFailure && accessorySignals.length && !hasStructuredCardEvidence) {
    reasons.push("non_card_accessory_signal");
  } else if (!structuralFailure && number && !cardType) {
    reasons.push("number_without_supported_cardtype");
  } else if (!structuralFailure && cardType && !number) {
    reasons.push("unnumbered_non_don_card");
  } else if (!structuralFailure && titleDon && !structuredDon) {
    reasons.push("title_only_don_signal");
  } else if (!structuralFailure) {
    reasons.push("insufficient_single_or_sealed_evidence");
  }

  const promotionState =
    classification === "exact_single_card_candidate"
      ? row.source_active === false
        ? "inactive_source_hold"
        : release.current_release_eligible
          ? "current_candidate"
          : "future_or_presale_hold"
      : classification === "sealed_product_candidate"
        ? "separate_sealed_catalog"
        : "quarantine";

  const priceLanes = normalizedPriceLanes(row.source_price_lanes);
  const identityPayload =
    classification === "exact_single_card_candidate"
      ? {
          source: "tcgplayer",
          category_id: categoryId,
          product_id: productId,
          group_id: Number.isInteger(Number(row.group_id)) ? Number(row.group_id) : null,
          product_name: name,
          card_number: number ? clean(number).toUpperCase() : null,
          card_number_format: cardNumberFormat(number),
          card_type: cardType,
          rarity: clean(rarity) || null,
          language,
          treatment_claims: uniqueSorted(treatmentSignals),
        }
      : null;

  return {
    candidate_version: ONE_PIECE_CANONICAL_CATALOG_CANDIDATE_V1,
    source_product_id: Number.isInteger(productId) ? productId : null,
    source_category_id: Number.isInteger(categoryId) ? categoryId : null,
    source_group_id: Number.isInteger(Number(row.group_id)) ? Number(row.group_id) : null,
    source_group_name: groupName || null,
    source_product_name: name || null,
    source_active: row.source_active !== false,
    classification,
    classification_reasons: uniqueSorted(reasons),
    single_card_kind: singleKind,
    promotion_state: promotionState,
    release,
    language,
    card_evidence: {
      number: number ? clean(number).toUpperCase() : null,
      number_format: cardNumberFormat(number),
      card_type: cardType,
      raw_card_type: clean(rawCardType) || null,
      rarity: clean(rarity) || null,
      structured_don: structuredDon,
      title_don: titleDon,
    },
    product_signals: {
      sealed: uniqueSorted(sealedSignals),
      accessory: uniqueSorted(accessorySignals),
      treatments: uniqueSorted(treatmentSignals),
    },
    identity_domain:
      classification === "exact_single_card_candidate"
        ? "one_piece_tcgplayer_print"
        : null,
    identity_key_version:
      classification === "exact_single_card_candidate"
        ? ONE_PIECE_IDENTITY_KEY_VERSION
        : null,
    identity_payload: identityPayload,
    identity_key_hash: identityPayload ? sha256(JSON.stringify(identityPayload)) : null,
    parent_gv_id:
      classification === "exact_single_card_candidate"
        ? `GV-OP-TCGP-${productId}`
        : null,
    exact_source_product_mapping:
      classification === "exact_single_card_candidate"
        ? `tcgplayer:${productId}`
        : null,
    source_price_lanes: priceLanes,
    source_image_reference: clean(row.image_url) || null,
    source_image_policy: "reference_only_until_self_hosted_and_hashed",
    publishable: false,
    canonical_write_authorized: false,
    sealed_write_authorized: false,
  };
}

export function reconcileOnePieceCatalogV1(rows = [], options = {}) {
  const classified = rows
    .map((row) => classifyOnePieceSourceProductV1(row, options))
    .sort((left, right) => (left.source_product_id ?? 0) - (right.source_product_id ?? 0));
  const seenProducts = new Set();
  const duplicateProductIds = new Set();
  const priceLaneOwners = new Map();

  for (const row of classified) {
    if (seenProducts.has(row.source_product_id)) duplicateProductIds.add(row.source_product_id);
    seenProducts.add(row.source_product_id);
    if (row.classification !== "exact_single_card_candidate") continue;
    for (const lane of row.source_price_lanes) {
      const key = lane.source_price_row_identity ??
        `${row.source_product_id}:${lane.subtype_name_normalized}`;
      const owners = priceLaneOwners.get(key) ?? [];
      owners.push(row.parent_gv_id);
      priceLaneOwners.set(key, owners);
    }
  }

  const laneCollisions = [...priceLaneOwners.entries()]
    .filter(([, owners]) => new Set(owners).size !== 1)
    .map(([sourcePriceRowIdentity, owners]) => ({
      source_price_row_identity: sourcePriceRowIdentity,
      owners: uniqueSorted(owners),
    }))
    .sort((left, right) =>
      left.source_price_row_identity.localeCompare(right.source_price_row_identity),
    );

  const count = (predicate) => classified.filter(predicate).length;
  return {
    candidate_version: ONE_PIECE_CANONICAL_CATALOG_CANDIDATE_V1,
    rows: classified,
    counts: {
      source_products: classified.length,
      exact_single_card_candidates: count(
        (row) => row.classification === "exact_single_card_candidate",
      ),
      numbered_card_candidates: count((row) => row.single_card_kind === "numbered_card"),
      don_card_candidates: count((row) => row.single_card_kind === "don_card"),
      sealed_product_candidates: count(
        (row) => row.classification === "sealed_product_candidate",
      ),
      ambiguous_quarantined: count(
        (row) => row.classification === "ambiguous_quarantine",
      ),
      current_single_candidates: count((row) => row.promotion_state === "current_candidate"),
      future_or_presale_holds: count(
        (row) => row.promotion_state === "future_or_presale_hold",
      ),
      inactive_source_holds: count((row) => row.promotion_state === "inactive_source_hold"),
      source_price_lanes: classified.reduce(
        (total, row) => total + row.source_price_lanes.length,
        0,
      ),
      exact_single_source_price_lanes: classified
        .filter((row) => row.classification === "exact_single_card_candidate")
        .reduce((total, row) => total + row.source_price_lanes.length, 0),
    },
    duplicate_source_product_ids: [...duplicateProductIds].sort((a, b) => a - b),
    source_price_lane_collisions: laneCollisions,
    preserved_source_product_count: classified.length,
    publishable: false,
    database_writes_authorized: false,
  };
}
