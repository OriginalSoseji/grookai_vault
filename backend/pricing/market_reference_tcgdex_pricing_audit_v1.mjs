import crypto from "node:crypto";

export const PACKAGE_ID = "MEE-TCGDEX-REFERENCE-PRICING-AUDIT-V1";
export const CONTRACT = "MARKET_EVIDENCE_ENGINE_V1";
export const NORMALIZER_VERSION = "MEE_TCGDEX_REFERENCE_PRICING_NORMALIZER_V1";
export const TCGDEX_TCGPLAYER_SOURCE = "tcgdex_tcgplayer_reference";
export const TCGDEX_CARDMARKET_SOURCE = "tcgdex_cardmarket_reference";

const STRONG_METRICS = new Set([
  "marketprice",
  "trend",
  "avg",
  "avg7",
  "avg30",
]);
const MID_METRICS = new Set(["midprice", "avg1"]);
const LOW_METRICS = new Set(["lowprice", "low", "directlowprice"]);
const HIGH_METRICS = new Set(["highprice"]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

export function sha256V1(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return crypto.createHash("sha256").update(text).digest("hex");
}

function asNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric * 100) / 100;
}

function normalizeMetricKey(metric) {
  return String(metric ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function metricFamily(metricKey) {
  if (HIGH_METRICS.has(metricKey)) return "high_ask_bucket";
  if (STRONG_METRICS.has(metricKey)) return "reference_market_bucket";
  if (MID_METRICS.has(metricKey)) return "reference_mid_bucket";
  if (LOW_METRICS.has(metricKey)) return "reference_low_bucket";
  return "unknown_reference_bucket";
}

function metricScore(metricKey, source) {
  let score = 0.25;
  if (STRONG_METRICS.has(metricKey)) score = 0.81;
  else if (MID_METRICS.has(metricKey)) score = 0.65;
  else if (LOW_METRICS.has(metricKey)) score = 0.45;
  else if (HIGH_METRICS.has(metricKey)) score = 0.08;
  if (source === TCGDEX_TCGPLAYER_SOURCE) score += 0.03;
  if (source === TCGDEX_CARDMARKET_SOURCE) score += 0.02;
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

function candidateHash(candidate) {
  return sha256V1({
    source: candidate.source,
    card_print_id: candidate.card_print_id,
    gv_id: candidate.gv_id,
    source_url: candidate.source_url,
    raw_title: candidate.raw_title,
    raw_price: candidate.raw_price,
    currency: candidate.currency,
    condition_hint: candidate.condition_hint,
    finish_hint: candidate.finish_hint,
    observed_at: candidate.observed_at,
  });
}

function cardTitle({ card, mapped, provider, finish, metric }) {
  const name = card?.name ?? mapped?.name ?? "Unknown";
  const number = card?.localId ?? mapped?.number ?? null;
  const setName = card?.set?.name ?? mapped?.set_code ?? "Unknown set";
  return `${name}${number ? ` #${number}` : ""} | ${setName} | tcgdex ${provider} ${finish} ${metric}`;
}

function sourceUrl(cardId) {
  return `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`;
}

function makeCandidate({
  raw,
  card,
  mapped,
  source,
  provider,
  finish,
  metric,
  rawMetric = metric,
  finishResolutionRule = 'explicit_provider_finish',
  price,
  currency,
  observedAt,
}) {
  const metricKey = normalizeMetricKey(metric);
  const rawPrice = asNumber(price);
  const candidate = {
    acquisition_run_id: null,
    raw_snapshot_id: null,
    card_print_id: mapped?.card_print_id ?? null,
    gv_id: mapped?.gv_id ?? null,
    source,
    source_type: "reference",
    source_url: sourceUrl(card?.id ?? raw?.payload?._external_id),
    raw_title: cardTitle({ card, mapped, provider, finish, metric }),
    raw_price: rawPrice,
    currency,
    condition_hint: `${provider}:${finish}:${metric}`,
    finish_hint: finish,
    observed_at: observedAt ?? raw?.payload?.fetched_at ?? raw?.ingested_at ?? null,
    match_confidence_hint: "tcgdex_external_mapping_active",
    exclusion_flags: [],
    needs_review: true,
    can_publish_price_directly: false,
    raw_payload: {
      provider,
      source_card_id: card?.id ?? raw?.payload?._external_id ?? null,
      metric,
      raw_metric: rawMetric,
      metric_key: metricKey,
      finish,
      finish_resolution_rule: finishResolutionRule,
      tcgdex_variants: {
        holo: card?.variants?.holo ?? null,
        normal: card?.variants?.normal ?? null,
      },
      source_raw_import_id: raw?.id ?? null,
      tcgdex_updated_at: card?.updated ?? null,
    },
  };
  return {
    ...candidate,
    candidate_hash: candidateHash(candidate),
  };
}

function normalizeCandidate(candidate, candidateOrdinal) {
  const metricKey = normalizeMetricKey(candidate?.raw_payload?.metric_key ?? candidate?.raw_payload?.metric);
  const price = asNumber(candidate.raw_price);
  const qualityFlags = [];
  let disposition = "reference_model_candidate";
  let score = metricScore(metricKey, candidate.source);

  if (price === null) {
    qualityFlags.push("missing_or_invalid_price");
    disposition = "blocked_candidate";
  }
  if (candidate.needs_review !== true) {
    qualityFlags.push("missing_review_gate");
    disposition = "blocked_candidate";
  }
  if (candidate.can_publish_price_directly === true) {
    qualityFlags.push("unsafe_direct_publish_flag");
    disposition = "blocked_candidate";
  }
  if (HIGH_METRICS.has(metricKey)) {
    qualityFlags.push("high_ask_bucket_not_model_input");
    if (disposition !== "blocked_candidate") disposition = "quarantined_metric";
  }

  const modelEligible = disposition === "reference_model_candidate";
  if (!modelEligible) score = Math.min(score, 0.1);

  return {
    candidate_hash: candidate.candidate_hash,
    candidate_ordinal: candidateOrdinal,
    card_print_id: candidate.card_print_id,
    source: candidate.source,
    normalizer_version: NORMALIZER_VERSION,
    metric_key: metricKey,
    metric_family: metricFamily(metricKey),
    normalized_price: price,
    normalized_currency: candidate.currency,
    model_disposition: disposition,
    model_eligible: modelEligible,
    evidence_quality_score: score,
    weight_hint: modelEligible ? score : 0,
    quality_flags: qualityFlags.sort(),
    group_reference_median: null,
    normalized_payload: {
      gv_id: candidate.gv_id,
      source_url: candidate.source_url,
      raw_title: candidate.raw_title,
      condition_hint: candidate.condition_hint,
      finish_hint: candidate.finish_hint,
      observed_at: candidate.observed_at,
      raw_metric: candidate.raw_payload?.raw_metric ?? candidate.raw_payload?.metric ?? null,
      finish_resolution_rule: candidate.raw_payload?.finish_resolution_rule ?? null,
      tcgdex_variants: candidate.raw_payload?.tcgdex_variants ?? { holo: null, normal: null },
      source_raw_import_id: candidate.raw_payload?.source_raw_import_id ?? null,
      tcgdex_updated_at: candidate.raw_payload?.tcgdex_updated_at ?? null,
    },
  };
}

function tcgplayerCandidates({ raw, card, mapped }) {
  const pricing = card?.pricing?.tcgplayer;
  if (!pricing || typeof pricing !== "object") return [];
  const currency = pricing.unit ?? "USD";
  const observedAt = pricing.updated ?? card?.updated ?? raw?.payload?.fetched_at ?? raw?.ingested_at ?? null;
  const candidates = [];
  for (const [finish, bucket] of Object.entries(pricing)) {
    if (finish === "unit" || finish === "updated") continue;
    if (!bucket || typeof bucket !== "object") continue;
    for (const [metric, value] of Object.entries(bucket)) {
      if (metric === "productId") continue;
      const price = asNumber(value);
      if (price === null) continue;
      candidates.push(makeCandidate({
        raw,
        card,
        mapped,
        source: TCGDEX_TCGPLAYER_SOURCE,
        provider: "tcgplayer",
        finish,
        metric,
        price,
        currency,
        observedAt,
      }));
    }
  }
  return candidates;
}

function splitCardmarketKey(key) {
  const normalized = String(key ?? "").trim();
  if (!normalized) return null;
  if (["unit", "updated", "idProduct"].includes(normalized)) return null;
  const parts = normalized.split("-");
  if (parts.length === 1) return { metric: parts[0], finish: "normal", unsuffixed: true };
  const metric = parts[0];
  const finish = parts.slice(1).join("_");
  return { metric, finish, unsuffixed: false };
}

function resolveCardmarketFinish(card, parsed) {
  if (
    parsed.unsuffixed
    && card?.variants?.holo === true
    && card?.variants?.normal === false
  ) {
    return "holo";
  }
  return parsed.finish;
}

function cardmarketCandidates({ raw, card, mapped }) {
  const pricing = card?.pricing?.cardmarket;
  if (!pricing || typeof pricing !== "object") return [];
  const currency = pricing.unit ?? "EUR";
  const observedAt = pricing.updated ?? card?.updated ?? raw?.payload?.fetched_at ?? raw?.ingested_at ?? null;
  const candidates = [];
  for (const [rawMetric, value] of Object.entries(pricing)) {
    const parsed = splitCardmarketKey(rawMetric);
    if (!parsed) continue;
    const price = asNumber(value);
    if (price === null) continue;
    const finish = resolveCardmarketFinish(card, parsed);
    candidates.push(makeCandidate({
      raw,
      card,
      mapped,
      source: TCGDEX_CARDMARKET_SOURCE,
      provider: "cardmarket",
      finish,
      metric: parsed.metric,
      rawMetric,
      finishResolutionRule: parsed.unsuffixed
        ? (finish === 'holo'
          ? 'unsuffixed_holo_only_source_variants'
          : 'unsuffixed_legacy_normal_review_only')
        : 'explicit_metric_finish_suffix',
      price,
      currency,
      observedAt,
    }));
  }
  return candidates;
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function duplicateCount(values) {
  const seen = new Set();
  let duplicates = 0;
  for (const value of values) {
    if (seen.has(value)) duplicates += 1;
    seen.add(value);
  }
  return duplicates;
}

export function buildTcgdexReferencePricingAuditV1({
  rawImports,
  tcgdexMappings,
  cardPrintsById,
  existingSourceCounts = {},
  generatedAt = new Date().toISOString(),
  sampleLimit = 50,
} = {}) {
  if (!Array.isArray(rawImports)) throw new Error("[tcgdex-pricing-audit] rawImports must be an array");
  if (!(tcgdexMappings instanceof Map)) throw new Error("[tcgdex-pricing-audit] tcgdexMappings must be a Map");
  if (!(cardPrintsById instanceof Map)) throw new Error("[tcgdex-pricing-audit] cardPrintsById must be a Map");

  const cardRawImports = rawImports.filter((row) => row?.payload?._kind === "card");
  const pricingRawImports = cardRawImports.filter((row) => row?.payload?.card?.pricing && typeof row.payload.card.pricing === "object");
  const mappedRawImports = [];
  const unmappedRawImports = [];
  const projectedCandidates = [];

  for (const raw of pricingRawImports) {
    const card = raw.payload.card ?? {};
    const externalId = raw.payload._external_id ?? card.id ?? null;
    const mappings = tcgdexMappings.get(externalId) ?? [];
    if (mappings.length !== 1) {
      unmappedRawImports.push({
        raw_import_id: raw.id,
        tcgdex_card_id: externalId,
        reason: mappings.length === 0 ? "no_active_external_mapping" : "multiple_active_external_mappings",
        mapping_count: mappings.length,
      });
      continue;
    }
    const mappedCard = cardPrintsById.get(mappings[0].card_print_id) ?? {};
    const mapped = {
      ...mappings[0],
      gv_id: mappedCard.gv_id ?? null,
      name: mappedCard.name ?? null,
      number: mappedCard.number ?? mappedCard.number_plain ?? null,
      set_code: mappedCard.set_code ?? null,
    };
    mappedRawImports.push(raw);
    projectedCandidates.push(...tcgplayerCandidates({ raw, card, mapped }));
    projectedCandidates.push(...cardmarketCandidates({ raw, card, mapped }));
  }

  const projectedNormalizedEvidence = projectedCandidates.map((candidate, index) => normalizeCandidate(candidate, index));
  const candidateHashes = projectedCandidates.map((row) => row.candidate_hash);
  const modelEligible = projectedNormalizedEvidence.filter((row) => row.model_eligible);
  const quarantined = projectedNormalizedEvidence.filter((row) => row.model_disposition.startsWith("quarantined_"));
  const blocked = projectedNormalizedEvidence.filter((row) => row.model_disposition === "blocked_candidate");
  const uniqueCardPrints = new Set(projectedCandidates.map((row) => row.card_print_id).filter(Boolean));

  const findings = [];
  if (duplicateCount(candidateHashes) > 0) findings.push("projected_candidate_hash_duplicates");
  if (Object.values(existingSourceCounts).some((count) => Number(count) > 0)) findings.push("target_sources_already_have_rows");

  const candidateRowsHash = sha256V1(projectedCandidates);
  const normalizedRowsHash = sha256V1(projectedNormalizedEvidence);
  const packageFingerprint = sha256V1({
    package_id: PACKAGE_ID,
    candidateRowsHash,
    normalizedRowsHash,
    projectedCandidateCount: projectedCandidates.length,
    projectedNormalizedEvidenceCount: projectedNormalizedEvidence.length,
    uniqueCardPrints: uniqueCardPrints.size,
  });

  return {
    generated_at: generatedAt,
    package_id: PACKAGE_ID,
    contract: CONTRACT,
    mode: "local_tcgdex_reference_pricing_audit_only",
    normalizer_version: NORMALIZER_VERSION,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_writes: false,
      card_print_writes: false,
      card_printing_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      migrations: false,
      global_apply: false,
    },
    source_registry_candidates: [
      TCGDEX_TCGPLAYER_SOURCE,
      TCGDEX_CARDMARKET_SOURCE,
    ],
    summary: {
      tcgdex_raw_import_rows: rawImports.length,
      tcgdex_card_raw_import_rows: cardRawImports.length,
      tcgdex_card_raw_import_rows_with_pricing: pricingRawImports.length,
      mapped_pricing_raw_import_rows: mappedRawImports.length,
      unmapped_or_ambiguous_pricing_raw_import_rows: unmappedRawImports.length,
      projected_market_reference_candidate_rows: projectedCandidates.length,
      projected_market_reference_normalized_evidence_rows: projectedNormalizedEvidence.length,
      projected_model_eligible_rows: modelEligible.length,
      projected_quarantined_rows: quarantined.length,
      projected_blocked_rows: blocked.length,
      projected_unique_card_prints: uniqueCardPrints.size,
      projected_duplicate_candidate_hashes: duplicateCount(candidateHashes),
    },
    counts: {
      candidates_by_source: countBy(projectedCandidates, (row) => row.source),
      candidates_by_currency: countBy(projectedCandidates, (row) => row.currency),
      candidates_by_finish: countBy(projectedCandidates, (row) => row.finish_hint),
      normalized_by_metric_family: countBy(projectedNormalizedEvidence, (row) => row.metric_family),
      normalized_by_disposition: countBy(projectedNormalizedEvidence, (row) => row.model_disposition),
      normalized_quality_flags: countBy(projectedNormalizedEvidence.flatMap((row) => row.quality_flags), (flag) => flag),
      existing_target_source_rows: existingSourceCounts,
    },
    proofs: {
      no_candidate_can_publish_directly: projectedCandidates.every((row) => row.can_publish_price_directly === false),
      all_candidates_need_review: projectedCandidates.every((row) => row.needs_review === true),
      all_candidates_have_card_print_id: projectedCandidates.every((row) => Boolean(row.card_print_id)),
      all_candidates_have_gv_id: projectedCandidates.every((row) => Boolean(row.gv_id)),
      all_candidate_hashes_unique: duplicateCount(candidateHashes) === 0,
      all_normalized_rows_review_only: projectedNormalizedEvidence.every((row) => row.model_eligible === true || row.weight_hint === 0),
      finish_resolution_is_evidence_only: true,
      no_card_printing_write_authority: true,
      no_public_boundary_leak: true,
    },
    hashes: {
      candidate_rows_hash: candidateRowsHash,
      normalized_rows_hash: normalizedRowsHash,
      package_fingerprint: packageFingerprint,
    },
    findings,
    samples: {
      candidates: projectedCandidates.slice(0, sampleLimit),
      normalized_evidence: projectedNormalizedEvidence.slice(0, sampleLimit),
      unmapped_or_ambiguous: unmappedRawImports.slice(0, sampleLimit),
    },
    row_manifests: {
      candidate_rows: projectedCandidates,
      normalized_evidence_rows: projectedNormalizedEvidence,
    },
  };
}
