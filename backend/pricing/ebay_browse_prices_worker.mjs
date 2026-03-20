// ebay_browse_prices_worker.mjs
// Usage:
//   node backend/pricing/ebay_browse_prices_worker.mjs --card-print-id <uuid> --dry-run
//   node backend/pricing/ebay_browse_prices_worker.mjs --card-print-id <uuid>

// Load environment variables
import '../env.mjs';

import { pathToFileURL } from 'node:url';
import { createBackendClient } from '../supabase_backend_client.mjs';
import { searchActiveListings, fetchItemDetails } from '../clients/ebay_browse_client.mjs';
import {
  getEbayBrowseActiveListingsLimit,
  isEbayBrowseBudgetExceededError,
  logEbayBrowseBudgetConfig,
} from '../clients/ebay_browse_budget_v1.mjs';
import {
  getAcceptedPricingObservationsForBatch,
  insertPricingObservations,
} from './pricing_observation_layer_v1.mjs';

function normalizeTitle(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\/\s\-]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(str) {
  return (str || '').toLowerCase();
}

const STRONG_SLAB_PATTERNS = [
  ' psa ',
  ' bgs ',
  ' cgc ',
  ' sgc ',
  ' tag ',
  ' beckett ',
  ' graded ',
  ' slab ',
  ' cert ',
  ' certificate ',
  ' black label ',
  ' pristine ',
];
const GRADED_CONTEXT_REGEX = /\b(?:psa|bgs|cgc|sgc|tag|beckett)\s*(?:10|[0-9](?:\.[0-9])?)\b/;
const GRADE_SCORE_REGEX = /\b(?:10|[0-9](?:\.[0-9])?)\/10\b/;
const GRADE_PATTERN_REGEXES = [
  /\bgem\s*mint\s*10\b/,
  /\bgem\s*mt\s*10\b/,
  /\bmint\s*10\b/,
  /\bpristine\s*10\b/,
  /\bblack\s*label\s*10\b/,
];
const FIRST_EDITION_PATTERNS = ['1st edition', 'first edition', '1st ed', '1st-ed', '1sted'];
const SHADOWLESS_PATTERNS = ['shadowless', 'no shadow', 'thin border', 'thick border', 'shdw'];
const SEALED_PATTERNS = [
  'booster box',
  'booster pack',
  'etb',
  'elite trainer box',
  'blister',
  'sealed',
  'factory sealed',
  'pack art',
  'artwork pack',
];
const LOT_PATTERNS = [
  ' lot ',
  ' bundle ',
  ' set of ',
  ' all pictured ',
  ' collection ',
  ' job lot ',
  ' playset ',
  ' bulk ',
];
const FAKE_PATTERNS = ['proxy', 'fake', 'reprint', 'replica', 'custom card'];
const REQUIRED_BASE_HINTS = ['base set', 'base1', 'base 1', '1999'];
const NM_CONDITION_PATTERNS = [
  ' near mint ',
  ' nm ',
  ' mint ',
  ' like new ',
  ' nm-m ',
  ' nmm ',
  ' pack fresh ',
  ' nm m ',
];
const LP_CONDITION_PATTERNS = [
  ' lightly played ',
  ' light play ',
  ' lp ',
  ' very good ',
  ' vg ',
  ' good condition ',
  ' excellent ',
  ' ex condition ',
  ' lp-nm ',
  ' lp nm ',
];
const MP_CONDITION_PATTERNS = [
  ' moderately played ',
  ' moderate play ',
  ' mp ',
  ' mod played ',
  ' mod wear ',
  ' some wear ',
  ' played ',
  ' surface wear ',
];
const HP_CONDITION_PATTERNS = [
  ' heavily played ',
  ' heavy play ',
  ' hp ',
  ' major wear ',
  ' beat ',
  ' beat up ',
  ' well loved ',
];
const DMG_CONDITION_PATTERNS = [
  ' damaged ',
  ' dmg ',
  ' crease ',
  ' creases ',
  ' bent ',
  ' ink ',
  ' inked ',
  ' water damage ',
  ' taped ',
  ' stain ',
  ' stains ',
  ' rip ',
  ' ripped ',
  ' tear ',
  ' tears ',
  ' peeled ',
  ' peeling ',
];

function normalizeDescriptor(str) {
  const normalized = normalizeTitle(str);
  return normalized ? ` ${normalized} ` : '';
}

export function detectGradedSignal(text) {
  const descriptor = normalizeDescriptor(text);
  if (!descriptor) {
    return { isGraded: false, tier: null, reason: null };
  }

  if (STRONG_SLAB_PATTERNS.some((pattern) => descriptor.includes(pattern))) {
    return { isGraded: true, tier: 'strong', reason: 'strong_direct_signal' };
  }

  if (GRADED_CONTEXT_REGEX.test(descriptor) || GRADE_SCORE_REGEX.test(descriptor)) {
    return { isGraded: true, tier: 'grade_pattern', reason: 'grader_score_pattern' };
  }

  if (GRADE_PATTERN_REGEXES.some((regex) => regex.test(descriptor))) {
    return { isGraded: true, tier: 'grade_pattern', reason: 'mint_score_pattern' };
  }

  return { isGraded: false, tier: null, reason: null };
}

export function detectConditionBucket(text) {
  const descriptor = normalizeDescriptor(text);
  if (!descriptor) {
    return null;
  }

  const orderedConditionRules = [
    ['dmg', DMG_CONDITION_PATTERNS],
    ['hp', HP_CONDITION_PATTERNS],
    ['lp', LP_CONDITION_PATTERNS],
    ['mp', MP_CONDITION_PATTERNS],
    ['nm', NM_CONDITION_PATTERNS],
  ];

  for (const [bucket, patterns] of orderedConditionRules) {
    if (patterns.some((pattern) => descriptor.includes(pattern))) {
      return bucket;
    }
  }

  return null;
}

function extractDescription(details) {
  if (!details) {
    return '';
  }
  const desc = details.description ?? details.shortDescription ?? '';
  return typeof desc === 'string' ? desc : '';
}

function extractItemSpecifics(details) {
  const specifics = {};
  if (!details || !Array.isArray(details.itemSpecifics)) {
    return specifics;
  }

  for (const spec of details.itemSpecifics) {
    const name = (spec?.name || '').toLowerCase();
    if (!name) {
      continue;
    }
    let value = null;
    if (Array.isArray(spec?.values) && spec.values.length > 0) {
      value = spec.values[0];
    } else if (spec?.value !== undefined) {
      value = spec.value;
    }
    if (value === null || value === undefined) {
      continue;
    }
    specifics[name] = typeof value === 'string' ? value : String(value);
  }

  return specifics;
}

function getListingSkipReasonV3(listing) {
  const title = normalizeText(listing.title);
  const details = listing._details || null;
  const desc = normalizeText(extractDescription(details));
  const specs = extractItemSpecifics(details);

  const lotWords = ['lot', 'bundle', 'set of ', 'x2', 'x3', 'x4', 'x5'];
  const mysteryWords = ['mystery', 'random', 'surprise', 'grab bag'];
  for (const w of lotWords) {
    if (title.includes(w) || desc.includes(w)) return 'lot';
  }
  for (const w of mysteryWords) {
    if (title.includes(w) || desc.includes(w)) return 'mystery';
  }

  const proxyWords = ['proxy', 'reprint', 'custom card', 'fan made', 'replica', 'not original'];
  for (const w of proxyWords) {
    if (title.includes(w) || desc.includes(w)) return 'proxy';
  }

  const notSingleCardPatterns = [
    'no specific charizard is guaranteed',
    'no specific card is guaranteed',
    'you will receive 1 charizard at random',
    'each lot will contain 1 mystery charizard',
    'may receive any charizard',
  ];
  for (const p of notSingleCardPatterns) {
    if (desc.includes(p)) return 'not_single_card';
  }

  const baseSet2Regex = /\bbase set 2\b(?!\/\d)/;
  const isBaseSet2InText =
    baseSet2Regex.test(title) ||
    baseSet2Regex.test(desc) ||
    title.includes('4/130') ||
    desc.includes('4/130');

  if (isBaseSet2InText) {
    return 'wrong_set';
  }

  const langSpec = (specs.language || '').toLowerCase();
  const isNonEnglish =
    langSpec.includes('japanese') ||
    langSpec.includes('spanish') ||
    langSpec.includes('german') ||
    langSpec.includes('portuguese') ||
    langSpec.includes('italian') ||
    title.includes('japanese') ||
    title.includes('spanish') ||
    title.includes('german') ||
    title.includes('portuguese') ||
    title.includes('italian');

  if (isNonEnglish) {
    return 'wrong_lang';
  }

  const setSpec = (specs.set || '').toLowerCase();
  if (setSpec && !setSpec.includes('base set')) {
    return 'wrong_set';
  }

  return null;
}

function buildNumberDescriptor(print) {
  if (!print?.number_plain) {
    return null;
  }
  const numberStr = String(print.number_plain).trim();
  if (!numberStr) {
    return null;
  }

  const totalRaw = print?.total_cards ?? null;
  let totalStr = null;
  if (totalRaw !== null && totalRaw !== undefined) {
    const numeric = Number(totalRaw);
    if (Number.isFinite(numeric) && numeric > 0) {
      totalStr = String(Math.trunc(numeric));
    } else if (typeof totalRaw === 'string' && totalRaw.trim().length > 0) {
      totalStr = totalRaw.trim();
    }
  }

  if (totalStr) {
    return `${numberStr}/${totalStr}`;
  }
  return numberStr;
}

function extractTitleCollectorNumberPlain(title) {
  if (!title) {
    return null;
  }
  const text = String(title);
  const match = /(\d+)\s*\/\s*\d+|#\s*(\d+)/i.exec(text);
  const trailingMatch = /\b(\d{1,3})\b\s*$/i.exec(text);
  const raw = match ? (match[1] ?? match[2] ?? null) : (trailingMatch ? trailingMatch[1] : null);
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return String(parsed);
}

function buildRarityHints(print) {
  const rarity = (print?.rarity || '').toLowerCase();
  if (rarity.includes('secret')) {
    return ['Secret Rare', 'Secret'];
  }

  const numberRaw = print?.number_plain ?? null;
  const totalRaw = print?.total_cards ?? null;
  const numberValue = Number(numberRaw);
  const totalValue = Number(totalRaw);
  if (
    Number.isFinite(numberValue) &&
    Number.isFinite(totalValue) &&
    totalValue > 0 &&
    numberValue > totalValue
  ) {
    return ['Secret Rare', 'Secret'];
  }

  return [];
}

export function buildSearchQueryForPrint(print) {
  const parts = ['Pokemon TCG'];

  if (print?.name) {
    parts.push(print.name);
  }

  if (print?.set_name) {
    parts.push(print.set_name);
  } else if (print?.set_code) {
    parts.push(print.set_code);
  }

  if (print?.set_code) {
    parts.push(String(print.set_code).toUpperCase());
  }

  const numberDescriptor = buildNumberDescriptor(print);
  if (numberDescriptor) {
    parts.push(numberDescriptor);
  }

  const rarityHints = buildRarityHints(print);
  if (rarityHints.length) {
    parts.push(...rarityHints);
  }

  const seen = new Set();
  const dedupedParts = [];
  for (const part of parts) {
    const token = `${part || ''}`.trim();
    if (!token) {
      continue;
    }
    const key = token.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    dedupedParts.push(token);
  }

  return dedupedParts.join(' ').trim();
}

function buildPrintLabel(print) {
  const parts = [];
  if (print?.name) {
    parts.push(print.name);
  }
  if (print?.set_name) {
    parts.push(print.set_name);
  } else if (print?.set_code) {
    parts.push(print.set_code);
  }
  const numberDescriptor = buildNumberDescriptor(print);
  if (numberDescriptor) {
    parts.push(`#${numberDescriptor}`);
  }
  return parts.join(' · ');
}

function getListingUrl(listing) {
  return (
    listing?.raw?.itemWebUrl ||
    listing?.raw?.itemAffiliateWebUrl ||
    null
  );
}

function getListingType(listing) {
  const buyingOption = Array.isArray(listing?.buyingOptions) && listing.buyingOptions.length > 0
    ? listing.buyingOptions[0]
    : null;
  return buyingOption ? String(buyingOption) : null;
}

function buildObservationExternalId(listing, { cardPrintId, observedAt, sequence }) {
  return (
    listing?.itemId ||
    listing?.raw?.itemId ||
    listing?.raw?.legacyItemId ||
    `missing-item-id:${cardPrintId}:${observedAt}:${sequence}`
  );
}

function buildObservationRecord(listing, decision, {
  cardPrintId,
  observedAt,
  sequence,
  validationRunId = null,
}) {
  const baseRawPayload = listing?.raw && typeof listing.raw === 'object'
    ? listing.raw
    : {};

  return {
    card_print_id: cardPrintId,
    source: 'ebay',
    external_id: buildObservationExternalId(listing, { cardPrintId, observedAt, sequence }),
    listing_url: getListingUrl(listing),
    title: listing?.title || null,
    price: listing?.price ?? 0,
    shipping: Number.isFinite(listing?.shippingCost) ? listing.shippingCost : 0,
    currency: listing?.currency || 'USD',
    condition_raw:
      listing?.condition ||
      listing?.conditionDescription ||
      listing?.itemCondition ||
      null,
    listing_type: getListingType(listing),
    match_confidence: decision.matchConfidence,
    mapping_status: decision.mappingStatus,
    classification: decision.classification,
    condition_bucket: decision.bucket ?? null,
    exclusion_reason: decision.exclusionReason ?? null,
    raw_payload: {
      ...baseRawPayload,
      ...(validationRunId ? {
        validation_run_id: validationRunId,
        validation_mode: 'live_validation_v1',
      } : {}),
    },
    observed_at: observedAt,
  };
}

function buildPriceBucketsFromAcceptedObservations(observations) {
  const buckets = {
    nm: [],
    lp: [],
    mp: [],
    hp: [],
    dmg: [],
  };

  for (const observation of observations) {
    const bucket = observation?.condition_bucket;
    const totalPrice = Number(observation?.total_price);
    if (!bucket || !Object.prototype.hasOwnProperty.call(buckets, bucket)) {
      continue;
    }
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      continue;
    }
    buckets[bucket].push(totalPrice);
  }

  return buckets;
}

function parseArgs(argv) {
  const result = {
    dryRun: false,
    cardPrintId: null,
    debug: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--card-print-id') {
      result.cardPrintId = argv[i + 1];
      i += 1;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--debug') {
      result.debug = true;
    }
  }

  return result;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node backend/pricing/ebay_browse_prices_worker.mjs --card-print-id <uuid> [--dry-run]');
  console.log('  add --debug for verbose listing diagnostics');
}

function isAuctionOnly(buyingOptions = []) {
  if (!Array.isArray(buyingOptions) || buyingOptions.length === 0) {
    return false;
  }
  return buyingOptions.every((opt) => `${opt}`.toUpperCase() === 'AUCTION');
}

function isBaseSetPrint(print) {
  const name = (print?.set_name || '').toLowerCase();
  const code = (print?.set_code || '').toLowerCase();
  return name.includes('base set') || code.includes('base1');
}

export function categorizeListing(listing, { dryRun = false, debug = false, print = null } = {}) {
  if (!listing || typeof listing.price !== 'number') {
    return {
      classification: 'staged',
      mappingStatus: 'unmapped',
      exclusionReason: 'invalid_price',
      bucket: null,
      priceTotal: null,
      matchConfidence: 0,
    };
  }

  const normTitle = normalizeTitle(listing.title);
  const condParts = [
    listing.conditionDescription || '',
    listing.itemCondition || '',
    listing.condition || '',
    listing.title || '',
  ];
  const condText = normalizeTitle(condParts.join(' '));
  const descriptor = condText ? ` ${condText} ` : '';
  const paddedTitle = ` ${normTitle} `;

  const logDecision = (keep, reason, bucket = null, extra = {}) => {
    if (debug) {
      console.log('[debug] listing', {
        title: listing.title,
        price: listing.price,
        ebayCondition: listing.condition,
        bucket,
        keep,
        reason,
        ...extra,
      });
    }
  };

  const logSkip = (tag) => {
    if (dryRun || debug) {
      logDecision(false, tag, null);
    }
  };

  const reject = (exclusionReason, mappingStatus = 'ambiguous') => {
    logSkip(exclusionReason);
    return {
      classification: 'rejected',
      mappingStatus,
      exclusionReason,
      bucket: null,
      priceTotal: null,
      matchConfidence: mappingStatus === 'mapped' ? 0.5 : 0,
    };
  };

  const stage = (exclusionReason, mappingStatus = 'ambiguous') => {
    logSkip(exclusionReason);
    return {
      classification: 'staged',
      mappingStatus,
      exclusionReason,
      bucket: null,
      priceTotal: null,
      matchConfidence: mappingStatus === 'mapped' ? 0.6 : 0.25,
    };
  };

  if (!normTitle) {
    return stage('missing_title', 'unmapped');
  }

  if (isAuctionOnly(listing.buyingOptions)) {
    return reject('auction_only');
  }

  const gradedSignal = detectGradedSignal(normTitle);
  if (gradedSignal.isGraded) {
    return reject('graded');
  }

  const requireBaseHints = isBaseSetPrint(print);
  if (requireBaseHints) {
    const hasHint = REQUIRED_BASE_HINTS.some((hint) => normTitle.includes(hint));
    if (!hasHint) {
      return reject('missing_base_hint', 'unmapped');
    }
  }

  if (FIRST_EDITION_PATTERNS.some((pattern) => normTitle.includes(pattern))) {
    return reject('first_edition');
  }

  if (SHADOWLESS_PATTERNS.some((pattern) => normTitle.includes(pattern))) {
    return reject('shadowless');
  }

  if (SEALED_PATTERNS.some((pattern) => normTitle.includes(pattern))) {
    return reject('sealed');
  }

  if (
    LOT_PATTERNS.some((pattern) => paddedTitle.includes(pattern)) ||
    /\bx[2-9]\b/.test(normTitle)
  ) {
    return reject('lot');
  }

  if (FAKE_PATTERNS.some((pattern) => normTitle.includes(pattern))) {
    return reject('fake');
  }

  const priceTotal =
    listing.price + (Number.isFinite(listing.shippingCost) ? listing.shippingCost : 0);
  if (!Number.isFinite(priceTotal) || priceTotal <= 0) {
    return reject('invalid_price', 'unmapped');
  }

  const skipReasonV3 = getListingSkipReasonV3(listing);
  if (skipReasonV3) {
    return reject(skipReasonV3, skipReasonV3 === 'wrong_set' || skipReasonV3 === 'wrong_lang' ? 'unmapped' : 'ambiguous');
  }

  const expectedNumberValue = Number.parseInt(print?.number_plain ?? '', 10);
  const expectedNumberPlain = Number.isFinite(expectedNumberValue)
    ? String(expectedNumberValue)
    : null;
  const foundNumberPlain = extractTitleCollectorNumberPlain(listing.title);
  if (
    expectedNumberPlain !== null &&
    foundNumberPlain !== null &&
    foundNumberPlain !== expectedNumberPlain
  ) {
    logDecision(false, 'collector_number_mismatch', null, {
      expectedNumberPlain,
      foundNumberPlain,
    });
    return reject('collector_number_mismatch', 'unmapped');
  }

  const pushBucket = (bucket, label = bucket, matchConfidence = 1) => {
    if (dryRun) {
      console.log(`[use][${label}] ${listing.title}`);
    }
    logDecision(true, label, bucket);
    return {
      classification: 'accepted',
      mappingStatus: 'mapped',
      exclusionReason: null,
      bucket,
      priceTotal,
      matchConfidence,
    };
  };

  const conditionBucket = detectConditionBucket(condParts.join(' '));
  if (conditionBucket) {
    return pushBucket(conditionBucket, conditionBucket);
  }

  const numberDescriptor = buildNumberDescriptor(print);
  const normalizedDescriptor = numberDescriptor ? normalizeTitle(numberDescriptor) : null;
  const hasCardNumber =
    normalizedDescriptor && normalizedDescriptor.length > 0
      ? normTitle.includes(normalizedDescriptor)
      : false;
  const looksBaseSet = requireBaseHints
    ? REQUIRED_BASE_HINTS.some((hint) => normTitle.includes(hint))
    : true;
  const setHint = normalizeTitle(print?.set_name || print?.set_code || '');
  const looksSetName = setHint ? normTitle.includes(setHint) : looksBaseSet;
  const looksCorrect = looksSetName && hasCardNumber;

  if (looksCorrect) {
    return pushBucket('lp', 'unknown_as_lp', 0.7);
  }

  logDecision(false, 'no_condition_match', null);
  return stage('no_condition_match', 'ambiguous');
}

function median(sortedValues) {
  if (!sortedValues.length) {
    return null;
  }
  const mid = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  }
  return sortedValues[mid];
}

function trimForMedian(sortedValues) {
  if (sortedValues.length >= 6) {
    return sortedValues.slice(1, sortedValues.length - 1);
  }
  return sortedValues;
}

function computeStats(prices) {
  const sorted = [...prices].sort((a, b) => a - b);
  const trimmed = trimForMedian(sorted);
  return {
    floor: sorted.length ? sorted[0] : null,
    median: median(trimmed),
    rawCount: prices.length,
    trimmedCount: trimmed.length,
  };
}

function computeConfidence(totalSamples) {
  let confidence = 0.2;
  if (totalSamples >= 3) {
    confidence += 0.2;
  }
  if (totalSamples >= 10) {
    confidence += 0.2;
  }
  if (confidence > 0.8) {
    confidence = 0.8;
  }
  return Number(confidence.toFixed(2));
}

function fallbackMedian(primary, secondary, factor) {
  if (primary === null && secondary !== null) {
    return Number((secondary * factor).toFixed(2));
  }
  return primary;
}

function computeFloorWithGuardrail(prices, medianValue, minFractionOfMedian) {
  if (!prices || prices.length === 0) {
    return null;
  }
  if (!medianValue || medianValue <= 0) {
    return Math.min(...prices);
  }
  const minAllowed = medianValue * minFractionOfMedian;
  const filtered = prices.filter((p) => p >= minAllowed);
  if (filtered.length === 0) {
    return Math.min(...prices);
  }
  return Math.min(...filtered);
}

async function writeV3SnapshotToDB(supabase, summary) {
  const payload = {
    card_print_id: summary.card_print_id,
    nm_median: summary.nm_median,
    nm_floor: summary.nm_floor,
    nm_samples: summary.raw_sample_count_nm,
    lp_median: summary.lp_median,
    lp_floor: summary.lp_floor,
    lp_samples: summary.raw_sample_count_lp,
    mp_median: summary.mp_median,
    mp_floor: summary.mp_floor,
    mp_samples: summary.raw_sample_count_mp,
    hp_median: summary.hp_median,
    hp_floor: summary.hp_floor,
    hp_samples: summary.raw_sample_count_hp,
    dmg_median: summary.dmg_median,
    dmg_floor: summary.dmg_floor,
    dmg_samples: summary.raw_sample_count_dmg,
    confidence: summary.confidence,
    listing_count: summary.listing_count,
    raw_json: summary,
  };

  const { data, error } = await supabase
    .from('card_print_price_curves')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[pricing][v3_snapshot_write] ERROR:', error);
    throw error;
  }

  if (data?.id) {
    console.log('[pricing][v3_snapshot_write] OK:', data.id);
  } else {
    console.log('[pricing][v3_snapshot_write] OK (id unknown)');
  }
}

function buildSummary(cardPrintId, nmStats, lpStats, confidence, extra = {}) {
  const listingCount = nmStats.rawCount + lpStats.rawCount;
  let nmMedian = nmStats.median;
  let lpMedian = lpStats.median;

  nmMedian = fallbackMedian(nmMedian, lpMedian, 1 / 0.75);
  lpMedian = fallbackMedian(lpMedian, nmMedian, 0.75);

  return {
    card_print_id: cardPrintId,
    nm_floor: nmStats.floor,
    nm_median: nmMedian,
    raw_sample_count_nm: nmStats.rawCount,
    lp_floor: lpStats.floor,
    lp_median: lpMedian,
    raw_sample_count_lp: lpStats.rawCount,
    mp_floor: extra.mp_floor ?? null,
    mp_median: extra.mp_median ?? null,
    raw_sample_count_mp: extra.raw_sample_count_mp ?? 0,
    hp_floor: extra.hp_floor ?? null,
    hp_median: extra.hp_median ?? null,
    raw_sample_count_hp: extra.raw_sample_count_hp ?? 0,
    dmg_floor: extra.dmg_floor ?? null,
    dmg_median: extra.dmg_median ?? null,
    raw_sample_count_dmg: extra.raw_sample_count_dmg ?? 0,
    listing_count: listingCount,
    confidence,
    ...extra,
  };
}

function enforceMonotonicCurve(summary) {
  const s = { ...summary };

  const before = {
    lp_gt_nm: s.lp_median !== null && s.nm_median !== null && s.lp_median > s.nm_median,
    mp_gt_lp: s.mp_median !== null && s.lp_median !== null && s.mp_median > s.lp_median,
    hp_gt_mp: s.hp_median !== null && s.mp_median !== null && s.hp_median > s.mp_median,
    dmg_gt_hp: s.dmg_median !== null && s.hp_median !== null && s.dmg_median > s.hp_median,
  };

  if (s.nm_median !== null && s.lp_median !== null && s.lp_median > s.nm_median) s.lp_median = s.nm_median;
  if (s.lp_median !== null && s.mp_median !== null && s.mp_median > s.lp_median) s.mp_median = s.lp_median;
  if (s.mp_median !== null && s.hp_median !== null && s.hp_median > s.mp_median) s.hp_median = s.mp_median;
  if (s.hp_median !== null && s.dmg_median !== null && s.dmg_median > s.hp_median) s.dmg_median = s.hp_median;

  if (s.nm_floor !== null && s.lp_floor !== null && s.lp_floor > s.nm_floor) s.lp_floor = s.nm_floor;
  if (s.lp_floor !== null && s.mp_floor !== null && s.mp_floor > s.lp_floor) s.mp_floor = s.lp_floor;
  if (s.mp_floor !== null && s.hp_floor !== null && s.hp_floor > s.mp_floor) s.hp_floor = s.mp_floor;
  if (s.hp_floor !== null && s.dmg_floor !== null && s.dmg_floor > s.hp_floor) s.dmg_floor = s.hp_floor;

  const fixFloor = (floorKey, medianKey) => {
    const f = s[floorKey];
    const m = s[medianKey];
    if (f !== null && m !== null && f > m) s[floorKey] = m;
  };
  fixFloor('nm_floor', 'nm_median');
  fixFloor('lp_floor', 'lp_median');
  fixFloor('mp_floor', 'mp_median');
  fixFloor('hp_floor', 'hp_median');
  fixFloor('dmg_floor', 'dmg_median');

  const after = {
    lp_gt_nm: s.lp_median !== null && s.nm_median !== null && s.lp_median > s.nm_median,
    mp_gt_lp: s.mp_median !== null && s.lp_median !== null && s.mp_median > s.lp_median,
    hp_gt_mp: s.hp_median !== null && s.mp_median !== null && s.hp_median > s.mp_median,
    dmg_gt_hp: s.dmg_median !== null && s.hp_median !== null && s.dmg_median > s.hp_median,
  };

  s.monotonic = {
    applied: true,
    violations_before: before,
    violations_after: after,
  };

  return s;
}

export async function updatePricingForCardPrint({
  supabase,
  cardPrintId,
  dryRun = false,
  debug = false,
  validationRunId = null,
}) {
  if (!supabase) {
    throw new Error('[pricing] Supabase client is required.');
  }
  if (!cardPrintId) {
    throw new Error('[pricing] cardPrintId is required.');
  }

  const { data: cardPrintRow, error: cardError } = await supabase
    .from('card_prints')
    .select(`
      id,
      name,
      rarity,
      number_plain,
      set_id,
      set:sets (*)
    `)
    .eq('id', cardPrintId)
    .maybeSingle();

  if (cardError && cardError.code !== 'PGRST116') {
    throw new Error(`[pricing] Failed to load card_print ${cardPrintId}: ${cardError.message}`);
  }
  if (!cardPrintRow) {
    throw new Error(`[pricing] card_print ${cardPrintId} not found.`);
  }

  console.log('[pricing] loaded card_print', cardPrintId);

  const cardPrint = {
    ...cardPrintRow,
    set_name: cardPrintRow?.set?.name ?? cardPrintRow?.set_name ?? null,
    set_code: cardPrintRow?.set?.code ?? cardPrintRow?.set_code ?? null,
    total_cards:
      cardPrintRow?.set?.total_cards ??
      cardPrintRow?.set?.printed_total ??
      cardPrintRow?.set?.total ??
      cardPrintRow?.total_cards ??
      cardPrintRow?.printed_total ??
      null,
  };

  const query = buildSearchQueryForPrint(cardPrint);
  if (debug) {
    console.log('[debug] search query', {
      query,
      rarity: cardPrint?.rarity ?? null,
    });
  }
  const label = buildPrintLabel(cardPrint) || cardPrint.name || 'card_print';
  console.log(
    `[pricing] Fetching active listings for "${query}" [${label}] (${cardPrintId})`,
  );

  const listings = await searchActiveListings({ query, limit: getEbayBrowseActiveListingsLimit() });
  if (debug) {
    console.log(`[debug] raw listings count: ${listings.length}`);
  }
  const marketplaceId = 'EBAY_US';
  for (const listing of listings) {
    const itemId = listing.itemId || listing?.raw?.itemId || null;
    if (!itemId) {
      console.warn('[ebay-browse] missing itemId for listing, skipping details fetch');
      listing._details = null;
      continue;
    }
    try {
      const details = await fetchItemDetails(itemId, { marketplaceId });
      listing._details = details;
    } catch (err) {
      if (isEbayBrowseBudgetExceededError(err)) {
        throw err;
      }
      console.warn('[ebay-browse] item details fetch failed, keeping summary-only:', itemId, err.message);
      listing._details = null;
    }
  }

  const observedAt = new Date().toISOString();
  const observations = listings.map((listing, index) => {
    const decision = categorizeListing(listing, { dryRun, debug, print: cardPrint });
    return buildObservationRecord(listing, decision, {
      cardPrintId,
      observedAt,
      sequence: index,
      validationRunId,
    });
  });

  const acceptedObservations = dryRun
    ? observations
        .filter((observation) => observation.classification === 'accepted' && observation.mapping_status === 'mapped')
        .map((observation, index) => ({
          id: `dry-run-${index}`,
          card_print_id: observation.card_print_id,
          source: observation.source,
          external_id: observation.external_id,
          title: observation.title,
          price: observation.price,
          shipping: observation.shipping,
          total_price: Number(observation.price) + Number(observation.shipping ?? 0),
          condition_bucket: observation.condition_bucket,
          match_confidence: observation.match_confidence,
          observed_at: observation.observed_at,
        }))
    : await (async () => {
        await insertPricingObservations(supabase, observations);
        return getAcceptedPricingObservationsForBatch(supabase, {
          cardPrintId,
          source: 'ebay',
          observedAt,
        });
      })();
  const acceptedBuckets = buildPriceBucketsFromAcceptedObservations(acceptedObservations);
  const nmPrices = acceptedBuckets.nm;
  const lpPrices = acceptedBuckets.lp;
  const mpPrices = acceptedBuckets.mp;
  const hpPrices = acceptedBuckets.hp;
  const dmgPrices = acceptedBuckets.dmg;

  const nmStats = computeStats(nmPrices);
  const lpStats = computeStats(lpPrices);
  const mpStats = computeStats(mpPrices);
  const hpStats = computeStats(hpPrices);
  const dmgStats = computeStats(dmgPrices);
  if (debug) {
    console.log('[debug] bucket summary', {
      nmCount: nmPrices.length,
      lpCount: lpPrices.length,
      mpCount: mpPrices.length,
      hpCount: hpPrices.length,
      dmgCount: dmgPrices.length,
      totalKept: nmPrices.length + lpPrices.length + mpPrices.length + hpPrices.length + dmgPrices.length,
      totalSkipped: observations.length - (nmPrices.length + lpPrices.length + mpPrices.length + hpPrices.length + dmgPrices.length),
    });
  }
  if (lpPrices.length) {
    const naiveLpFloor = lpStats.floor;
    lpStats.floor = computeFloorWithGuardrail(lpPrices, lpStats.median, 0.2);
    if (lpStats.floor !== null && lpStats.floor !== naiveLpFloor) {
      console.log(
        `[pricing][lp_floor_guardrail] naive=${naiveLpFloor} guarded=${lpStats.floor} median=${lpStats.median}`,
      );
    }
  }
  const confidence = computeConfidence(nmStats.rawCount + lpStats.rawCount);
  const rawSummary = buildSummary(cardPrintId, nmStats, lpStats, confidence, {
    mp_median: mpStats.median,
    mp_floor: mpStats.floor,
    raw_sample_count_mp: mpStats.rawCount,
    hp_median: hpStats.median,
    hp_floor: hpStats.floor,
    raw_sample_count_hp: hpStats.rawCount,
    dmg_median: dmgStats.median,
    dmg_floor: dmgStats.floor,
    raw_sample_count_dmg: dmgStats.rawCount,
  });
  const summary = enforceMonotonicCurve(rawSummary);

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  const capturedAt = new Date().toISOString();

  const { error: snapshotError } = await supabase
    .from('ebay_active_price_snapshots')
    .insert([
      {
        card_print_id: cardPrintId,
        nm_floor: summary.nm_floor,
        nm_median: summary.nm_median,
        lp_floor: summary.lp_floor,
        lp_median: summary.lp_median,
        listing_count: summary.listing_count,
        raw_sample_count_nm: summary.raw_sample_count_nm,
        raw_sample_count_lp: summary.raw_sample_count_lp,
        captured_at: capturedAt,
      },
    ]);

  if (snapshotError) {
    throw new Error(`[pricing] Failed to insert snapshot: ${snapshotError.message}`);
  }

  const { error: upsertError } = await supabase
    .from('ebay_active_prices_latest')
    .upsert({
      card_print_id: cardPrintId,
      source: 'ebay_browse',
      nm_floor: summary.nm_floor,
      nm_median: summary.nm_median,
      lp_floor: summary.lp_floor,
      lp_median: summary.lp_median,
      listing_count: summary.listing_count,
      confidence: summary.confidence,
      last_snapshot_at: capturedAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'card_print_id' });

  if (upsertError) {
    throw new Error(`[pricing] Failed to upsert latest pricing: ${upsertError.message}`);
  }

  await writeV3SnapshotToDB(supabase, summary);
  if (debug) {
    console.log('[debug] final snapshot payload', summary);
  }

  console.log(
    `[pricing] updated card_print ${cardPrintId} nm=${summary.nm_median} lp=${summary.lp_median} listings=${summary.listing_count} confidence=${summary.confidence}`,
  );

  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cardPrintId) {
    printUsage();
    process.exit(1);
  }

  try {
    logEbayBrowseBudgetConfig('ebay_browse_prices_worker');
    const supabase = createBackendClient();
    await updatePricingForCardPrint({
      supabase,
      cardPrintId: args.cardPrintId,
      dryRun: args.dryRun,
      debug: args.debug,
    });
  } catch (err) {
    console.error('[pricing] Worker failed:', err);
    // Deterministic exit codes so parent runner can classify failures.
    // 42 = retryable eBay rate limit (HTTP 429)
    // 43 = retryable daily Browse budget exhaustion
    const status = err?.status ?? err?.cause?.status ?? null;
    if (status === 429) {
      process.exitCode = 42;
      return;
    }

    if (isEbayBrowseBudgetExceededError(err)) {
      process.exitCode = 43;
      return;
    }

    process.exitCode = 1;
  }
}

const isMain = (() => {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  main();
}
