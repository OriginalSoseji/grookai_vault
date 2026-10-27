import { normalizeTcgplayerMappingNameV1 } from './tcgplayer_market_exact_mapping_plan_policy_v1.mjs';

const SPACE = /\s+/g;

function text(value) {
  return String(value ?? '').trim();
}

export function normalizeTcgplayerOllamaCandidateTextV1(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[★☆◇]/g, ' star ')
    .replace(/♀/g, ' f ')
    .replace(/♂/g, ' m ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(SPACE, ' ')
    .trim();
}

export function normalizeTcgplayerOllamaSourceNameV1(value) {
  return normalizeTcgplayerOllamaCandidateTextV1(
    normalizeTcgplayerMappingNameV1(value),
  );
}

export function normalizeTcgplayerOllamaCoordinateV1(value) {
  const match = text(value).toLocaleUpperCase('en-US').match(/[A-Z]*0*[0-9]+[A-Z]*/);
  if (!match) return '';
  return match[0].replace(/^([A-Z]*)0+([0-9])/, '$1$2');
}

function tokens(value) {
  return new Set(normalizeTcgplayerOllamaCandidateTextV1(value).split(' ').filter(Boolean));
}

function similarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function candidateIdentityMatch(row, card, groupConsensus = null) {
  const authoritySetId = text(row?.set_authority?.set_id);
  const consensusSetId = Number(groupConsensus?.set_count) === 1
    ? text(groupConsensus.set_id)
    : '';
  const targetSetId = authoritySetId || consensusSetId;
  const wantedNumber = normalizeTcgplayerOllamaCoordinateV1(row?.printed_number);
  const wantedName = normalizeTcgplayerOllamaCandidateTextV1(sourceName(row));
  const cardNumber = normalizeTcgplayerOllamaCoordinateV1(card?.canonical_number);
  const cardName = normalizeTcgplayerOllamaCandidateTextV1(card?.canonical_name);
  const numberExact = Boolean(wantedNumber) && wantedNumber === cardNumber;
  const nameExact = Boolean(wantedName) && wantedName === cardName;
  const nameSimilarity = similarity(wantedName, cardName);
  const nameMatch = nameExact || (targetSetId ? nameSimilarity >= 0.5 : nameSimilarity >= 0.8);
  return {
    numberExact,
    nameExact,
    nameSimilarity,
    identityMatch: wantedNumber ? numberExact && nameMatch : nameMatch,
  };
}

function sourceName(row) {
  return text(row.normalized_source_name) ||
    normalizeTcgplayerOllamaSourceNameV1(row.source_product_name);
}

function identityDomainForCategory(categoryId) {
  if (Number(categoryId) === 1) return 'mtg_eng_paper_print';
  if (Number(categoryId) === 3) return 'pokemon_eng_standard';
  return '';
}

export function uniqueTcgplayerExtendedNumberV1(extendedData) {
  if (!Array.isArray(extendedData)) return '';
  const values = [...new Set(extendedData
    .filter((entry) => text(entry?.name).toLocaleLowerCase('en-US') === 'number')
    .map((entry) => text(entry?.value))
    .filter(Boolean))];
  return values.length === 1 ? values[0] : '';
}

export function buildTcgplayerOllamaCandidateIndexV1(cards = []) {
  const byDomainAndSet = new Map();
  const byDomainAndName = new Map();
  for (const card of cards) {
    const domain = text(card.identity_domain);
    const setId = text(card.set_id);
    const name = normalizeTcgplayerOllamaCandidateTextV1(card.canonical_name);
    if (!domain || !setId || !name) continue;
    const setKey = `${domain}:${setId}`;
    const nameKey = `${domain}:${name}`;
    const setRows = byDomainAndSet.get(setKey) ?? [];
    setRows.push(card);
    byDomainAndSet.set(setKey, setRows);
    const nameRows = byDomainAndName.get(nameKey) ?? [];
    nameRows.push(card);
    byDomainAndName.set(nameKey, nameRows);
  }
  return { byDomainAndSet, byDomainAndName };
}

export function candidatePoolForTcgplayerOllamaRowV1(
  row,
  index,
  groupConsensus = null,
) {
  const domain = identityDomainForCategory(row?.source_category_id);
  if (!domain) return [];
  const authoritySetId = text(row?.set_authority?.set_id);
  const consensusSetId = Number(groupConsensus?.set_count) === 1
    ? text(groupConsensus.set_id)
    : '';
  const targetSetId = authoritySetId || consensusSetId;
  if (targetSetId) {
    return index.byDomainAndSet.get(`${domain}:${targetSetId}`) ?? [];
  }
  const name = normalizeTcgplayerOllamaCandidateTextV1(sourceName(row));
  return index.byDomainAndName.get(`${domain}:${name}`) ?? [];
}

export function isLikelySealedTcgplayerProductV1(value, printedNumber = '') {
  if (text(printedNumber)) return false;
  return /\b(booster|box|case|collection|deck|display|bundle|blister|tin|pack|poster|binder|portfolio|calendar|toolkit|build\s*&\s*battle|elite trainer|theme deck)\b/i.test(text(value));
}

export function rankTcgplayerOllamaCandidatesV1(row, cards, groupConsensus = null, limit = 20) {
  if (isLikelySealedTcgplayerProductV1(row.source_product_name, row.printed_number)) return [];
  const authoritySetId = text(row?.set_authority?.set_id);
  const consensusSetId = Number(groupConsensus?.set_count) === 1
    ? text(groupConsensus.set_id)
    : '';
  const targetSetId = authoritySetId || consensusSetId;
  const wantedIdentityDomain = identityDomainForCategory(row?.source_category_id);
  const ranked = [];

  for (const card of cards) {
    if (wantedIdentityDomain && text(card.identity_domain) !== wantedIdentityDomain) continue;
    if (Number(card.active_standard_identity_count) !== 1) continue;
    if (Number(card.active_tcgplayer_mapping_count) !== 0) continue;
    if (text(card.variant_key)) continue;
    if (targetSetId && text(card.set_id) !== targetSetId) continue;

    const {
      numberExact,
      nameExact,
      nameSimilarity,
      identityMatch,
    } = candidateIdentityMatch(row, card, groupConsensus);

    if (!identityMatch) continue;

    const score =
      (targetSetId ? 50 : 0) +
      (numberExact ? 35 : 0) +
      (nameExact ? 40 : Math.round(nameSimilarity * 25)) +
      (authoritySetId ? 5 : 0);
    ranked.push({
      ...card,
      candidate_score: score,
      candidate_evidence: {
        target_set_source: authoritySetId
          ? 'existing_set_authority'
          : consensusSetId
            ? 'unique_group_set_consensus'
            : 'global_catalog_search',
        number_exact: numberExact,
        name_exact: nameExact,
        name_similarity: Number(nameSimilarity.toFixed(4)),
      },
    });
  }

  return ranked
    .sort((left, right) =>
      right.candidate_score - left.candidate_score ||
      text(left.set_code).localeCompare(text(right.set_code)) ||
      text(left.gv_id).localeCompare(text(right.gv_id)))
    .slice(0, limit);
}

export function diagnoseTcgplayerOllamaCandidateGapV1(
  row,
  cards,
  groupConsensus = null,
  ranked = [],
) {
  if (ranked.length > 0) return null;
  if (isLikelySealedTcgplayerProductV1(row?.source_product_name, row?.printed_number)) {
    return 'sealed_or_non_card_product';
  }
  if (!text(row?.printed_number)) return 'missing_printed_number_evidence';
  const authoritySetId = text(row?.set_authority?.set_id);
  const hasConsensusSet = Number(groupConsensus?.set_count) === 1 && text(groupConsensus?.set_id);
  if (!authoritySetId && !hasConsensusSet) return 'no_unique_group_set_authority';
  if (!cards.length) return 'no_catalog_candidates_in_resolved_scope';

  const identityMatches = cards.filter((card) =>
    candidateIdentityMatch(row, card, groupConsensus).identityMatch);
  if (!identityMatches.length) {
    const wantedNumber = normalizeTcgplayerOllamaCoordinateV1(row?.printed_number);
    const coordinateMatches = cards.filter((card) =>
      normalizeTcgplayerOllamaCoordinateV1(card?.canonical_number) === wantedNumber);
    return coordinateMatches.length ? 'no_name_match' : 'no_exact_coordinate_match';
  }
  if (identityMatches.every((card) => Number(card.active_standard_identity_count) !== 1)) {
    return 'canonical_target_identity_not_unique';
  }
  if (identityMatches.every((card) => text(card.variant_key))) {
    return 'candidate_requires_printing_or_variant_authority';
  }
  if (identityMatches.every((card) => Number(card.active_tcgplayer_mapping_count) !== 0)) {
    return 'canonical_parent_already_has_tcgplayer_mapping';
  }
  return 'no_eligible_unmapped_base_target';
}

export function enrichTcgplayerOllamaRowV1(row, cards, groupConsensus = null) {
  const existing = Array.isArray(row.review_targets) && row.review_targets.length
    ? row.review_targets
    : Array.isArray(row.candidate_targets) && row.candidate_targets.length
      ? row.candidate_targets
      : [];
  const ranked = rankTcgplayerOllamaCandidatesV1(row, cards, groupConsensus);
  const rankedById = new Map(ranked.map((candidate) => [candidate.card_print_id, candidate]));
  const discovered = existing.length
    ? existing.map((candidate) => ({
        ...candidate,
        ...(rankedById.get(candidate.card_print_id) ?? {}),
      }))
    : ranked;
  return {
    ...row,
    review_targets: discovered,
    candidate_search: {
      version: 'TCGPLAYER_OLLAMA_CANDIDATE_ENRICHMENT_V1',
      database_reads_only: true,
      allow_missing_number_review: !text(row.printed_number),
      likely_sealed_product: isLikelySealedTcgplayerProductV1(row.source_product_name, row.printed_number),
      group_consensus: groupConsensus,
      candidate_pool_count: cards.length,
      discovered_candidate_count: discovered.length,
      no_candidate_reason: diagnoseTcgplayerOllamaCandidateGapV1(
        row,
        cards,
        groupConsensus,
        discovered,
      ),
      mapping_authority: false,
      publication_authority: false,
    },
  };
}
