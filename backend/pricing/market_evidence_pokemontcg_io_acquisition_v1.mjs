import { createMarketEvidenceCandidateV1 } from './market_evidence_source_registry_v1.mjs';

const SOURCE = 'pokemontcg_io_reference';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }
  return Math.round(number * 100) / 100;
}

function sourceUrl(card, provider) {
  if (provider === 'tcgplayer' && card?.tcgplayer?.url) {
    return card.tcgplayer.url;
  }
  if (provider === 'cardmarket' && card?.cardmarket?.url) {
    return card.cardmarket.url;
  }
  return `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(card?.id ?? '')}`;
}

function observedAtForProvider(card, provider, fallback) {
  const date = provider === 'tcgplayer'
    ? card?.tcgplayer?.updatedAt
    : card?.cardmarket?.updatedAt;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(String(date ?? ''))) {
    return new Date(`${date.replaceAll('/', '-')}T00:00:00.000Z`).toISOString();
  }
  return fallback;
}

function rawTitle(card, provider, variant, metric) {
  const number = card?.number ? ` #${card.number}` : '';
  const setName = card?.set?.name ? ` | ${card.set.name}` : '';
  return `${card?.name ?? 'PokemonTCG.io card'}${number}${setName} | ${provider} ${variant} ${metric}`;
}

function targetStatus(item, card, candidateCount, status) {
  return {
    card_print_id: item.card_print_id,
    gv_id: item.gv_id,
    name: item.name,
    set_code: item.set_code,
    number_plain: item.number_plain,
    pokemonapi_id: card?.id ?? item.pokemonapi_id ?? null,
    status,
    candidate_count: candidateCount,
    provider_updated_at: {
      tcgplayer: card?.tcgplayer?.updatedAt ?? null,
      cardmarket: card?.cardmarket?.updatedAt ?? null,
    },
  };
}

function pushCandidate(candidates, {
  item,
  card,
  provider,
  variant,
  metric,
  rawPrice,
  currency,
  generatedAt,
}) {
  const price = normalizePrice(rawPrice);
  if (price === null) {
    return false;
  }
  candidates.push(createMarketEvidenceCandidateV1({
    card_print_id: item.card_print_id,
    gv_id: item.gv_id,
    source: SOURCE,
    source_type: 'reference_price',
    source_url: sourceUrl(card, provider),
    raw_title: rawTitle(card, provider, variant, metric),
    raw_price: price,
    currency,
    condition_hint: `${provider}:${metric}`,
    finish_hint: variant,
    observed_at: observedAtForProvider(card, provider, generatedAt),
    match_confidence_hint: item.pokemonapi_id || item.match_basis === 'pokemonapi_external_id'
      ? 'high'
      : 'medium',
    exclusion_flags: [],
    needs_review: true,
    raw_payload: {
      lane: 'pokemontcg_io_reference_v1',
      provider,
      provider_card_id: card?.id ?? null,
      provider_set_id: card?.set?.id ?? null,
      provider_set_name: card?.set?.name ?? null,
      provider_number: card?.number ?? null,
      provider_name: card?.name ?? null,
      variant,
      metric,
      match_basis: item.match_basis ?? (item.pokemonapi_id ? 'pokemonapi_external_id' : 'unverified_payload_match'),
      provider_updated_at: provider === 'tcgplayer'
        ? card?.tcgplayer?.updatedAt ?? null
        : card?.cardmarket?.updatedAt ?? null,
    },
  }));
  return true;
}

function candidatesForCard({ item, card, generatedAt }) {
  const candidates = [];
  const tcgplayerPrices = card?.tcgplayer?.prices && typeof card.tcgplayer.prices === 'object'
    ? card.tcgplayer.prices
    : {};
  for (const [variant, metrics] of Object.entries(tcgplayerPrices)) {
    if (!metrics || typeof metrics !== 'object') continue;
    for (const metric of ['market', 'low', 'mid', 'high', 'directLow']) {
      pushCandidate(candidates, {
        item,
        card,
        provider: 'tcgplayer',
        variant,
        metric,
        rawPrice: metrics[metric],
        currency: 'USD',
        generatedAt,
      });
    }
  }

  const cardmarketPrices = card?.cardmarket?.prices && typeof card.cardmarket.prices === 'object'
    ? card.cardmarket.prices
    : {};
  for (const [metric, rawPrice] of Object.entries(cardmarketPrices)) {
    pushCandidate(candidates, {
      item,
      card,
      provider: 'cardmarket',
      variant: metric.toLowerCase().includes('reverse') ? 'reverse_holo' : 'normal',
      metric,
      rawPrice,
      currency: 'EUR',
      generatedAt,
    });
  }

  return candidates;
}

export function acquirePokemonTcgIoEvidenceV1({
  batch,
  cardsByExternalId,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!batch || typeof batch !== 'object') {
    throw new Error('[market-evidence-pokemontcg-io] batch is required');
  }
  if (!Array.isArray(batch.items)) {
    throw new Error('[market-evidence-pokemontcg-io] batch.items must be an array');
  }
  if (!cardsByExternalId || typeof cardsByExternalId !== 'object') {
    throw new Error('[market-evidence-pokemontcg-io] cardsByExternalId is required');
  }

  const items = batch.items.filter((item) => item.source === SOURCE);
  const candidateEvidence = [];
  const reviewedTargets = [];

  for (const item of items) {
    const externalId = normalizeText(item.pokemonapi_id ?? item.external_id ?? item.provider_card_id);
    if (!externalId) {
      reviewedTargets.push(targetStatus(item, null, 0, 'missing_pokemonapi_external_id'));
      continue;
    }

    const card = cardsByExternalId[externalId];
    if (!card) {
      reviewedTargets.push(targetStatus({ ...item, pokemonapi_id: externalId }, null, 0, 'pokemonapi_payload_missing'));
      continue;
    }

    const candidates = candidatesForCard({ item: { ...item, pokemonapi_id: externalId }, card, generatedAt });
    candidateEvidence.push(...candidates);
    reviewedTargets.push(targetStatus(
      { ...item, pokemonapi_id: externalId },
      card,
      candidates.length,
      candidates.length > 0 ? 'candidate_evidence_created' : 'no_reference_prices_in_payload',
    ));
  }

  const statusCounts = {};
  for (const target of reviewedTargets) {
    statusCounts[target.status] = (statusCounts[target.status] ?? 0) + 1;
  }

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1',
    mode: 'free_api_reference_raw_evidence_only',
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
      public_price_publication: false,
      raw_evidence_objects_created: true,
      raw_evidence_objects_persisted_to_db: false,
    },
    summary: {
      pokemontcg_io_targets: items.length,
      reviewed_targets: reviewedTargets.length,
      candidate_evidence_count: candidateEvidence.length,
      status_counts: statusCounts,
    },
    reviewed_targets: reviewedTargets,
    candidate_evidence: candidateEvidence,
  };
}
