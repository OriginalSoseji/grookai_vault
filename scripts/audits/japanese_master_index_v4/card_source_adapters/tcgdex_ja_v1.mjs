import path from 'node:path';

import {
  assertJapaneseCardAssertion,
  normalizeJapaneseCardAssertion,
} from '../card_assertion_contract_v1.mjs';

export const TCGDEX_JA_CARD_PARSER_VERSION =
  'JPN-MASTER-INDEX-TCGDEX-JA-CARD-PARSER-V1';
export const TCGDEX_JA_SOURCE_ID = 'tcgdex_ja_cards';
export const TCGDEX_JA_SOURCE_FAMILY = 'tcgdex_ja';

function integerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function strictNumericLocalId(value) {
  const normalized = String(value ?? '').trim();
  return /^\d+$/.test(normalized) ? Number.parseInt(normalized, 10) : null;
}

function enabledVariantLabels(variants) {
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) {
    return [];
  }
  return Object.entries(variants)
    .filter(([, enabled]) => enabled === true)
    .map(([label]) => label);
}

function finishLabels(card) {
  const labels = new Set();
  for (const label of enabledVariantLabels(card.variants)) {
    if (['normal', 'holo', 'reverse'].includes(label)) labels.add(label);
  }
  for (const variant of card.variants_detailed ?? []) {
    if (variant?.type) labels.add(String(variant.type));
  }
  return [...labels];
}

function editionLabels(card) {
  return card.variants?.firstEdition ? ['first_edition'] : [];
}

function stampLabels(card) {
  const labels = new Set();
  if (card.variants?.wPromo) labels.add('w_promo');
  for (const variant of card.variants_detailed ?? []) {
    for (const stamp of variant?.stamps ?? []) labels.add(String(stamp));
  }
  return [...labels];
}

export function parseTcgdexJapaneseSetPayload(body, expectedSetId = null) {
  const payload = JSON.parse(
    Buffer.isBuffer(body) ? body.toString('utf8') : String(body),
  );
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('TCGdex Japanese set response must be an object.');
  }
  if (!payload.id) {
    throw new Error('TCGdex Japanese set response is missing id.');
  }
  if (
    expectedSetId &&
    String(payload.id).toLowerCase() !== String(expectedSetId).toLowerCase()
  ) {
    throw new Error(
      `TCGdex Japanese set mismatch: expected ${expectedSetId}, received ${payload.id}.`,
    );
  }
  if (!Array.isArray(payload.cards)) {
    throw new Error(
      `TCGdex Japanese set ${payload.id} is missing cards array.`,
    );
  }
  const cardIds = new Set();
  for (const card of payload.cards) {
    if (!card?.id || !card?.localId) {
      throw new Error(`TCGdex Japanese set ${payload.id} has an invalid card.`);
    }
    const key = String(card.id).toLowerCase();
    if (cardIds.has(key)) {
      throw new Error(
        `TCGdex Japanese set ${payload.id} repeats card ${card.id}.`,
      );
    }
    cardIds.add(key);
  }
  return payload;
}

export function parseTcgdexJapaneseCardPayload(body, expectedCardId = null) {
  const payload = JSON.parse(
    Buffer.isBuffer(body) ? body.toString('utf8') : String(body),
  );
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('TCGdex Japanese card response must be an object.');
  }
  if (!payload.id || !payload.localId) {
    throw new Error('TCGdex Japanese card response lacks identity fields.');
  }
  if (
    expectedCardId &&
    String(payload.id).toLowerCase() !== String(expectedCardId).toLowerCase()
  ) {
    throw new Error(
      `TCGdex Japanese card mismatch: expected ${expectedCardId}, received ${payload.id}.`,
    );
  }
  return payload;
}

export function buildTcgdexJapaneseCardAssertion({
  card,
  cardBrief,
  setPayload,
  workItem,
  snapshotMetadata,
  rawSnapshotRef,
  detailStatus,
}) {
  const sourceCard = card ?? cardBrief;
  const localId = String(sourceCard.localId ?? cardBrief?.localId ?? '').trim();
  const setCardCount = setPayload.cardCount ?? sourceCard.set?.cardCount ?? {};
  const denominator = integerOrNull(
    setCardCount.official ?? setCardCount.total,
  );
  const sourceUrl = `https://api.tcgdex.net/v2/ja/cards/${encodeURIComponent(sourceCard.id)}`;

  return assertJapaneseCardAssertion(
    normalizeJapaneseCardAssertion({
      source_id: TCGDEX_JA_SOURCE_ID,
      source_family: TCGDEX_JA_SOURCE_FAMILY,
      source_kind: 'structured_community_api',
      source_external_id: sourceCard.id,
      source_url: sourceUrl,
      source_container_id: setPayload.id,
      registry_key: workItem.registry_key,
      language: 'ja',
      parser_version: TCGDEX_JA_CARD_PARSER_VERSION,
      retrieved_at: snapshotMetadata.fetched_at,
      raw_snapshot_ref: rawSnapshotRef.replaceAll('\\', '/'),
      raw_snapshot_sha256: snapshotMetadata.body_sha256,
      printed_name: sourceCard.name ?? cardBrief?.name,
      card_number_raw: localId,
      card_number_numerator: strictNumericLocalId(localId),
      card_number_denominator: denominator,
      source_set_code: setPayload.id,
      source_set_name: setPayload.name ?? sourceCard.set?.name,
      category: sourceCard.category,
      rarity: sourceCard.rarity,
      illustrator: sourceCard.illustrator,
      hp: sourceCard.hp,
      regulation_mark: sourceCard.regulationMark,
      dex_numbers: sourceCard.dexId,
      finish_labels: finishLabels(sourceCard),
      edition_labels: editionLabels(sourceCard),
      stamp_labels: stampLabels(sourceCard),
      image_urls: [sourceCard.image ?? cardBrief?.image].filter(Boolean),
      release_date: setPayload.releaseDate,
      source_fields: {
        detail_status: detailStatus,
        legal: sourceCard.legal ?? null,
        set_card_count: setCardCount,
        stage: sourceCard.stage ?? null,
        types: sourceCard.types ?? [],
        updated: sourceCard.updated ?? null,
        variants: sourceCard.variants ?? null,
        variants_detailed: sourceCard.variants_detailed ?? [],
      },
    }),
  );
}

export function tcgdexContainerHealth({
  setPayload,
  workItem,
  selectedCardCount,
  detailSuccessCount,
  detailFailureCount,
  operatorCardLimit,
}) {
  const apiTotal = integerOrNull(
    setPayload.cardCount?.total ?? setPayload.cardCount?.official,
  );
  const expected = integerOrNull(workItem.source_expected_card_count);
  let status = 'complete';
  const findings = [];

  if (setPayload.cards.length === 0 && (apiTotal ?? expected ?? 0) > 0) {
    status = 'source_card_rows_absent';
    findings.push('set_metadata_has_count_but_cards_array_is_empty');
  } else if (apiTotal !== null && setPayload.cards.length !== apiTotal) {
    status = 'source_count_mismatch';
    findings.push('cards_array_does_not_match_api_total');
  }
  if (expected !== null && apiTotal !== null && expected !== apiTotal) {
    findings.push('registry_expected_count_differs_from_api_total');
  }
  if (detailFailureCount > 0) {
    status = 'detail_failures';
    findings.push('one_or_more_card_detail_requests_failed');
  }
  if (
    operatorCardLimit !== null &&
    selectedCardCount < setPayload.cards.length
  ) {
    status = 'operator_bounded_partial';
    findings.push('card_detail_scope_limited_by_operator');
  }

  return {
    source_container_id: setPayload.id,
    registry_key: workItem.registry_key,
    status,
    findings,
    source_expected_card_count: expected,
    api_official_card_count: integerOrNull(setPayload.cardCount?.official),
    api_total_card_count: apiTotal,
    api_card_row_count: setPayload.cards.length,
    selected_card_count: selectedCardCount,
    detail_success_count: detailSuccessCount,
    detail_failure_count: detailFailureCount,
  };
}

export function relativeSnapshotRef(absolutePath, cwd = process.cwd()) {
  return path.relative(cwd, absolutePath).replaceAll('\\', '/');
}
