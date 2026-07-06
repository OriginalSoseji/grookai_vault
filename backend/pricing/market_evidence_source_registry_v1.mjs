const ALLOWED_SOURCE_TYPES = new Set([
  'active_listing',
  'sold_comp_candidate',
  'reference_price',
  'marketplace_product_candidate',
  'user_uploaded_export',
  'manual_review_candidate',
]);

const ALLOWED_SOURCES = new Set([
  'ebay_active',
  'ebay_sold_candidate',
  'ebay_user_export',
  'pokemontcg_io_reference',
  'pricecharting_reference',
  'tcgdex_cardmarket_reference',
  'tcgdex_tcgplayer_reference',
  'tcgcsv_reference',
  'tcgplayer_reference_candidate',
  'tcgplayer_user_export',
  'manual_review_candidate',
]);

const ALLOWED_CONFIDENCE_HINTS = new Set([
  'none',
  'low',
  'medium',
  'high',
  'exact_candidate',
]);

const ALLOWED_EXCLUSION_FLAGS = new Set([
  'lot_or_bundle',
  'sealed_product',
  'graded_or_slab',
  'foreign_language',
  'proxy_or_reprint',
  'wrong_set',
  'wrong_number',
  'wrong_finish',
  'wrong_print_run',
  'world_championship_replica',
  'ambiguous_variant',
  'missing_price',
  'missing_source_url',
  'source_terms_unclear',
  'manual_review_required',
]);

export const MARKET_EVIDENCE_SOURCE_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    source: 'ebay_active',
    label: 'eBay Active Listings',
    source_type: 'active_listing',
    acquisition_mode: 'approved_api',
    pricing_lane: 'market_evidence',
    truth_role: 'asking_price_signal',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'Current asking prices are evidence, not value. They require classification, mapping, and liquidity weighting.',
  }),
  Object.freeze({
    source: 'ebay_sold_candidate',
    label: 'eBay Sold Candidate',
    source_type: 'sold_comp_candidate',
    acquisition_mode: 'approved_path_required',
    pricing_lane: 'market_evidence',
    truth_role: 'sold_comp_candidate',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'Sold/completed evidence is stronger than asking price, but access and matching must be approved before use.',
  }),
  Object.freeze({
    source: 'pricecharting_reference',
    label: 'PriceCharting Reference',
    source_type: 'reference_price',
    acquisition_mode: 'licensed_export_optional',
    pricing_lane: 'reference',
    truth_role: 'reference_signal',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'Optional licensed/export benchmark. Reference pricing can corroborate market evidence, but it is not Grookai market truth or a required engine dependency.',
  }),
  Object.freeze({
    source: 'pokemontcg_io_reference',
    label: 'PokemonTCG.io Reference',
    source_type: 'reference_price',
    acquisition_mode: 'free_api_reference',
    pricing_lane: 'reference',
    truth_role: 'free_reference_signal',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'Free/reference API lane for embedded TCGplayer USD and Cardmarket EUR price buckets. Useful for broad coverage, but not Market Truth.',
  }),
  Object.freeze({
    source: 'ebay_user_export',
    label: 'eBay User/Admin Export',
    source_type: 'user_uploaded_export',
    acquisition_mode: 'operator_uploaded_export',
    pricing_lane: 'market_evidence',
    truth_role: 'uploaded_market_export_candidate',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'User-owned or admin-provided eBay exports avoid live API dependence. Rows still require identity mapping, condition parsing, and review before truth.',
  }),
  Object.freeze({
    source: 'tcgplayer_reference_candidate',
    label: 'TCGplayer Reference Candidate',
    source_type: 'marketplace_product_candidate',
    acquisition_mode: 'approved_path_required',
    pricing_lane: 'reference',
    truth_role: 'marketplace_product_reference',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'Marketplace product pages can help coverage and mapping, but exact condition/finish identity must be proven.',
  }),
  Object.freeze({
    source: 'tcgcsv_reference',
    label: 'TCGCSV TCGplayer Reference',
    source_type: 'reference_price',
    acquisition_mode: 'public_snapshot_api',
    pricing_lane: 'reference',
    truth_role: 'free_reference_signal',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'Public TCGCSV TCGplayer product and price snapshots. Useful for broad USD reference evidence, but not Market Truth.',
  }),
  Object.freeze({
    source: 'tcgdex_tcgplayer_reference',
    label: 'TCGDex TCGplayer Reference',
    source_type: 'reference_price',
    acquisition_mode: 'free_api_reference',
    pricing_lane: 'reference',
    truth_role: 'free_reference_signal',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'TCGDex embedded TCGplayer price buckets. Useful for broad mapped reference coverage, but every row remains evidence, not price truth.',
  }),
  Object.freeze({
    source: 'tcgdex_cardmarket_reference',
    label: 'TCGDex Cardmarket Reference',
    source_type: 'reference_price',
    acquisition_mode: 'free_api_reference',
    pricing_lane: 'reference',
    truth_role: 'free_reference_signal',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'TCGDex embedded Cardmarket price buckets. EUR reference evidence can corroborate other sources, but cannot publish directly.',
  }),
  Object.freeze({
    source: 'tcgplayer_user_export',
    label: 'TCGplayer User/Admin Export',
    source_type: 'user_uploaded_export',
    acquisition_mode: 'operator_uploaded_export',
    pricing_lane: 'reference',
    truth_role: 'uploaded_marketplace_export_candidate',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'User-owned or admin-provided TCGplayer exports can seed reference evidence without API access. They remain reviewed evidence, not direct prices.',
  }),
  Object.freeze({
    source: 'manual_review_candidate',
    label: 'Manual Review Candidate',
    source_type: 'manual_review_candidate',
    acquisition_mode: 'operator_curated',
    pricing_lane: 'review',
    truth_role: 'human_review_queue',
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    notes: 'For ambiguous or high-value evidence that should be reviewed before it can influence model inputs.',
  }),
]);

export const MARKET_EVIDENCE_OBJECT_CONTRACT_V1 = Object.freeze({
  required_fields: Object.freeze([
    'card_print_id',
    'gv_id',
    'source',
    'source_type',
    'source_url',
    'raw_title',
    'raw_price',
    'currency',
    'condition_hint',
    'finish_hint',
    'observed_at',
    'match_confidence_hint',
    'exclusion_flags',
    'needs_review',
  ]),
  allowed_sources: Object.freeze(Array.from(ALLOWED_SOURCES).sort()),
  allowed_source_types: Object.freeze(Array.from(ALLOWED_SOURCE_TYPES).sort()),
  allowed_confidence_hints: Object.freeze(Array.from(ALLOWED_CONFIDENCE_HINTS).sort()),
  allowed_exclusion_flags: Object.freeze(Array.from(ALLOWED_EXCLUSION_FLAGS).sort()),
});

function normalizeText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`[market-evidence] raw_price must be a non-negative number or null: ${value}`);
  }
  return Math.round(number * 100) / 100;
}

function normalizeObservedAt(value) {
  const text = normalizeText(value);
  if (!text) {
    return new Date().toISOString();
  }
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`[market-evidence] observed_at is invalid: ${value}`);
  }
  return date.toISOString();
}

function normalizeExclusionFlags(flags) {
  if (flags === null || flags === undefined) {
    return [];
  }
  if (!Array.isArray(flags)) {
    throw new Error('[market-evidence] exclusion_flags must be an array');
  }
  const normalized = [];
  for (const flag of flags) {
    const text = normalizeText(flag);
    if (!text) {
      continue;
    }
    if (!ALLOWED_EXCLUSION_FLAGS.has(text)) {
      throw new Error(`[market-evidence] unknown exclusion flag: ${text}`);
    }
    if (!normalized.includes(text)) {
      normalized.push(text);
    }
  }
  return normalized.sort();
}

export function getMarketEvidenceSourceV1(source) {
  const normalizedSource = normalizeText(source);
  return MARKET_EVIDENCE_SOURCE_REGISTRY_V1.find((entry) => entry.source === normalizedSource) ?? null;
}

export function createMarketEvidenceCandidateV1(input) {
  const source = normalizeText(input?.source);
  const registryEntry = getMarketEvidenceSourceV1(source);
  if (!registryEntry) {
    throw new Error(`[market-evidence] unknown source: ${source}`);
  }

  const sourceType = normalizeText(input?.source_type) ?? registryEntry.source_type;
  if (!ALLOWED_SOURCE_TYPES.has(sourceType)) {
    throw new Error(`[market-evidence] unknown source_type: ${sourceType}`);
  }
  if (sourceType !== registryEntry.source_type) {
    throw new Error(`[market-evidence] source_type ${sourceType} does not match registry type ${registryEntry.source_type}`);
  }

  const cardPrintId = normalizeText(input?.card_print_id);
  const gvId = normalizeText(input?.gv_id);
  if (!cardPrintId) {
    throw new Error('[market-evidence] card_print_id is required');
  }
  if (!gvId) {
    throw new Error('[market-evidence] gv_id is required');
  }

  const sourceUrl = normalizeText(input?.source_url);
  const rawTitle = normalizeText(input?.raw_title);
  const confidence = normalizeText(input?.match_confidence_hint) ?? 'none';
  if (!ALLOWED_CONFIDENCE_HINTS.has(confidence)) {
    throw new Error(`[market-evidence] unknown match_confidence_hint: ${confidence}`);
  }

  const exclusionFlags = normalizeExclusionFlags(input?.exclusion_flags);
  const needsReview = Boolean(input?.needs_review ?? registryEntry.requires_review_before_truth);
  const rawPrice = normalizePrice(input?.raw_price);
  const missingSourceUrl = !sourceUrl;
  const missingPrice = rawPrice === null;
  const computedFlags = new Set(exclusionFlags);
  if (missingSourceUrl) {
    computedFlags.add('missing_source_url');
  }
  if (missingPrice) {
    computedFlags.add('missing_price');
  }
  if (needsReview) {
    computedFlags.add('manual_review_required');
  }

  return {
    card_print_id: cardPrintId,
    gv_id: gvId,
    source,
    source_type: sourceType,
    source_url: sourceUrl,
    raw_title: rawTitle,
    raw_price: rawPrice,
    currency: normalizeText(input?.currency) ?? 'USD',
    condition_hint: normalizeText(input?.condition_hint),
    finish_hint: normalizeText(input?.finish_hint),
    observed_at: normalizeObservedAt(input?.observed_at),
    match_confidence_hint: confidence,
    exclusion_flags: Array.from(computedFlags).sort(),
    needs_review: needsReview || computedFlags.size > exclusionFlags.length,
    raw_payload: input?.raw_payload ?? null,
    contract_version: 'MARKET_EVIDENCE_OBJECT_CONTRACT_V1',
    can_publish_price_directly: false,
  };
}

export function assertMarketEvidenceRegistrySafeV1() {
  for (const entry of MARKET_EVIDENCE_SOURCE_REGISTRY_V1) {
    if (!ALLOWED_SOURCES.has(entry.source)) {
      throw new Error(`[market-evidence] unregistered source: ${entry.source}`);
    }
    if (!ALLOWED_SOURCE_TYPES.has(entry.source_type)) {
      throw new Error(`[market-evidence] unregistered source_type: ${entry.source_type}`);
    }
    if (entry.can_publish_price_directly !== false) {
      throw new Error(`[market-evidence] source cannot publish price directly: ${entry.source}`);
    }
  }
  return true;
}
