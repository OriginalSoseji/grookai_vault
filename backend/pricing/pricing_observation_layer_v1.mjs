const ALLOWED_MAPPING_STATUSES = new Set(['mapped', 'unmapped', 'ambiguous']);
const ALLOWED_CLASSIFICATIONS = new Set(['accepted', 'rejected', 'staged']);
const ALLOWED_CONDITION_BUCKETS = new Set(['nm', 'lp', 'mp', 'hp', 'dmg']);

function normalizeText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeMatchConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  if (num <= 0) {
    return 0;
  }
  if (num >= 1) {
    return 1;
  }
  return Math.round(num * 1000) / 1000;
}

function normalizeObservation(observation) {
  const source = normalizeText(observation.source);
  const externalId = normalizeText(observation.external_id);
  const mappingStatus = normalizeText(observation.mapping_status);
  const classification = normalizeText(observation.classification);
  const conditionBucket = normalizeText(observation.condition_bucket);

  if (!source) {
    throw new Error('[pricing-observations] source is required');
  }
  if (!externalId) {
    throw new Error('[pricing-observations] external_id is required');
  }
  if (!mappingStatus || !ALLOWED_MAPPING_STATUSES.has(mappingStatus)) {
    throw new Error(`[pricing-observations] invalid mapping_status: ${mappingStatus}`);
  }
  if (!classification || !ALLOWED_CLASSIFICATIONS.has(classification)) {
    throw new Error(`[pricing-observations] invalid classification: ${classification}`);
  }
  if (conditionBucket && !ALLOWED_CONDITION_BUCKETS.has(conditionBucket)) {
    throw new Error(`[pricing-observations] invalid condition_bucket: ${conditionBucket}`);
  }

  return {
    card_print_id: normalizeText(observation.card_print_id),
    source,
    external_id: externalId,
    listing_url: normalizeText(observation.listing_url),
    title: normalizeText(observation.title),
    price: normalizeNumber(observation.price, 0),
    shipping: normalizeNumber(observation.shipping, 0),
    currency: normalizeText(observation.currency) ?? 'USD',
    condition_raw: normalizeText(observation.condition_raw),
    listing_type: normalizeText(observation.listing_type),
    match_confidence: normalizeMatchConfidence(observation.match_confidence),
    mapping_status: mappingStatus,
    classification,
    condition_bucket: conditionBucket,
    exclusion_reason: normalizeText(observation.exclusion_reason),
    raw_payload: observation.raw_payload ?? null,
    observed_at: observation.observed_at,
  };
}

export async function insertPricingObservations(supabase, observations) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return [];
  }

  const payload = observations.map(normalizeObservation);
  const { data, error } = await supabase
    .from('pricing_observations')
    .insert(payload)
    .select('id, card_print_id, source, external_id, classification, mapping_status, condition_bucket, observed_at');

  if (error) {
    throw new Error(`[pricing-observations] insert failed: ${error.message}`);
  }

  return data ?? [];
}

export async function getAcceptedPricingObservationsForBatch(
  supabase,
  {
    cardPrintId,
    source,
    observedAt,
  },
) {
  const normalizedCardPrintId = normalizeText(cardPrintId);
  const normalizedSource = normalizeText(source);

  if (!normalizedCardPrintId) {
    throw new Error('[pricing-observations] cardPrintId is required');
  }
  if (!normalizedSource) {
    throw new Error('[pricing-observations] source is required');
  }
  if (!observedAt) {
    throw new Error('[pricing-observations] observedAt is required');
  }

  const { data, error } = await supabase
    .from('v_pricing_observations_accepted')
    .select('id, card_print_id, source, external_id, title, price, shipping, total_price, condition_bucket, match_confidence, observed_at, created_at')
    .eq('card_print_id', normalizedCardPrintId)
    .eq('source', normalizedSource)
    .eq('observed_at', observedAt)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[pricing-observations] accepted batch read failed: ${error.message}`);
  }

  return data ?? [];
}
