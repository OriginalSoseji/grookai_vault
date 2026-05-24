import {
  fetchJson,
  mapWithConcurrency,
  sortByCardNumber,
} from '../shared.mjs';

function finishCandidatesFromTcgdex(card) {
  const variants = card?.variants && typeof card.variants === 'object' ? card.variants : {};
  const finishes = [];
  if (variants.normal === true) finishes.push('normal');
  if (variants.holo === true || variants.holofoil === true) finishes.push('holo');
  if (variants.reverse === true || variants.reverseHolo === true || variants.reverseHolofoil === true) {
    finishes.push('reverse');
  }
  if (variants.firstEdition === true || variants.firstEditionNormal === true) finishes.push('first_edition_normal');
  if (variants.firstEditionHolo === true) finishes.push('first_edition_holo');
  return [...new Set(finishes)];
}

function toEvidenceRecords(card, setConfig, retrievedAt) {
  const base = {
    source_key: 'tcgdex',
    source_kind: 'structured_api',
    source_url: `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(card.id)}`,
    set_key: setConfig.key,
    set_name: card?.set?.name ?? card?.set?.id ?? setConfig.tcgdex,
    card_number: card.localId ?? card.number ?? '',
    card_name: card.name ?? '',
    rarity: card.rarity ?? null,
    language: 'en',
    retrieved_at: retrievedAt,
    raw_snapshot_ref: `tcgdex:${card.id}`,
  };

  const identityRecord = {
    ...base,
    finish_key: null,
    evidence_type: 'card_identity',
    evidence_label: `TCGdex card ${card.id}`,
  };

  const finishRecords = finishCandidatesFromTcgdex(card).map((finishKey) => ({
    ...base,
    finish_key: finishKey,
    evidence_type: 'variant_finish_flag',
    evidence_label: `TCGdex variants.${finishKey}`,
  }));

  return [identityRecord, ...finishRecords];
}

export async function collectTcgdexEvidence(setConfig, options) {
  const baseUrl = options.tcgdexBaseUrl ?? 'https://api.tcgdex.net/v2/en';
  const setBody = await fetchJson(`${baseUrl}/sets/${encodeURIComponent(setConfig.tcgdex)}`);
  const stubs = Array.isArray(setBody.cards) ? sortByCardNumber(setBody.cards) : [];
  const selected = options.maxCardsPerSet ? stubs.slice(0, options.maxCardsPerSet) : stubs;
  const details = await mapWithConcurrency(selected, 4, async (stub) => {
    if (!stub?.id) return null;
    return fetchJson(`${baseUrl}/cards/${encodeURIComponent(stub.id)}`);
  });
  return details
    .filter(Boolean)
    .flatMap((card) => toEvidenceRecords(card, setConfig, options.retrievedAt));
}
