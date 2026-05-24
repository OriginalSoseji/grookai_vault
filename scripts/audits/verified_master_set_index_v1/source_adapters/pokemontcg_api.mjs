import {
  fetchJson,
  sortByCardNumber,
} from '../shared.mjs';

function finishCandidatesFromPokemonTcg(card) {
  const prices = card?.tcgplayer?.prices && typeof card.tcgplayer.prices === 'object'
    ? card.tcgplayer.prices
    : {};
  const finishes = [];
  if (prices.normal) finishes.push('normal');
  if (prices.holofoil) finishes.push('holo');
  if (prices.reverseHolofoil) finishes.push('reverse');
  if (prices['1stEditionNormal']) finishes.push('first_edition_normal');
  if (prices['1stEditionHolofoil']) finishes.push('first_edition_holo');
  return [...new Set(finishes)];
}

function toEvidenceRecords(card, setConfig, retrievedAt) {
  const base = {
    source_key: 'pokemontcg_api',
    source_kind: 'structured_api',
    source_url: `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(card.id)}`,
    set_key: setConfig.key,
    set_name: card?.set?.name ?? card?.set?.id ?? setConfig.pokemontcg,
    card_number: card.number ?? '',
    card_name: card.name ?? '',
    rarity: card.rarity ?? null,
    language: 'en',
    retrieved_at: retrievedAt,
    raw_snapshot_ref: `pokemontcg_api:${card.id}`,
  };

  const identityRecord = {
    ...base,
    finish_key: null,
    evidence_type: 'card_identity',
    evidence_label: `PokemonTCG.io card ${card.id}`,
  };

  const finishRecords = finishCandidatesFromPokemonTcg(card).map((finishKey) => ({
    ...base,
    finish_key: finishKey,
    evidence_type: 'tcgplayer_price_finish_key',
    evidence_label: `PokemonTCG.io tcgplayer.prices.${finishKey}`,
  }));

  return [identityRecord, ...finishRecords];
}

export async function collectPokemonTcgApiEvidence(setConfig, options) {
  const baseUrl = options.pokemontcgBaseUrl ?? 'https://api.pokemontcg.io/v2';
  const headers = {};
  if (process.env.POKEMONAPI_API_KEY) headers['X-Api-Key'] = process.env.POKEMONAPI_API_KEY;

  const allCards = [];
  let page = 1;
  const pageSize = 250;
  while (true) {
    const url = new URL(`${baseUrl}/cards`);
    url.searchParams.set('q', `set.id:${setConfig.pokemontcg}`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    const body = await fetchJson(url.toString(), headers);
    const cards = Array.isArray(body.data) ? body.data : [];
    allCards.push(...cards);
    const total = Number(body.totalCount ?? body.total ?? allCards.length);
    if (allCards.length >= total || cards.length === 0) break;
    page += 1;
  }

  const sorted = sortByCardNumber(allCards);
  const selected = options.maxCardsPerSet ? sorted.slice(0, options.maxCardsPerSet) : sorted;
  return selected.flatMap((card) => toEvidenceRecords(card, setConfig, options.retrievedAt));
}
