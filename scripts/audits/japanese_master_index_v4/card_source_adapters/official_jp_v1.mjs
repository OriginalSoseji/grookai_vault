import {
  assertJapaneseCardAssertion,
  normalizeJapaneseCardAssertion,
} from '../card_assertion_contract_v1.mjs';

export const OFFICIAL_JP_CARD_PARSER_VERSION =
  'JPN-MASTER-INDEX-OFFICIAL-JP-CARD-PARSER-V1';
export const OFFICIAL_JP_SOURCE_ID = 'official_jp_cards';
export const OFFICIAL_JP_SOURCE_FAMILY = 'pokemon_card_official_jp';

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ');
}

function stripHtml(value) {
  return decodeHtml(
    String(value ?? '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value).replaceAll(',', ''), 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function absoluteOfficialUrl(value) {
  if (!value) return null;
  return new URL(
    decodeHtml(value),
    'https://www.pokemon-card.com',
  ).toString();
}

function rarityFromImage(value) {
  const basename = String(value ?? '').match(
    /\/card\/rarity\/(?<name>[^/?#]+)\.(?:gif|png|jpe?g)/i,
  )?.groups?.name;
  return basename ? basename.replace(/^ic_rare_/i, '') : null;
}

export function parseOfficialJapaneseCardSearchPage(
  body,
  expectedProductId,
  expectedPage = null,
) {
  const payload =
    typeof body === 'string' || Buffer.isBuffer(body)
      ? JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : body)
      : body;
  if (!payload || Number(payload.result) !== 1) {
    throw new Error(
      `Official Japanese card API failed for product ${expectedProductId}: ${payload?.errMsg ?? 'unknown error'}.`,
    );
  }
  const thisPage = integerOrNull(payload.thisPage);
  if (expectedPage !== null && thisPage !== expectedPage) {
    throw new Error(
      `Official Japanese card API page mismatch for product ${expectedProductId}: expected ${expectedPage}, received ${thisPage}.`,
    );
  }
  const cards = [];
  const seen = new Set();
  for (const row of Array.isArray(payload.cardList) ? payload.cardList : []) {
    const cardId = String(row.cardID ?? '').trim();
    if (!/^\d+$/.test(cardId)) {
      throw new Error(
        `Official Japanese product ${expectedProductId} contains an invalid card id.`,
      );
    }
    if (seen.has(cardId)) {
      throw new Error(
        `Official Japanese product ${expectedProductId} repeats card ${cardId} on page ${thisPage}.`,
      );
    }
    seen.add(cardId);
    cards.push({
      card_id: cardId,
      printed_name:
        stripHtml(row.cardNameViewText ?? row.cardNameAltText) || null,
      image_url: absoluteOfficialUrl(row.cardThumbFile),
      source_fields: {
        card_name_alt_text: stripHtml(row.cardNameAltText) || null,
        result_page: thisPage,
      },
    });
  }

  return {
    product_id: String(expectedProductId),
    product_name:
      stripHtml(
        (Array.isArray(payload.searchCondition)
          ? payload.searchCondition
          : []
        ).find((value) => !String(value).includes('レギュレーション')),
      ) || null,
    regulation: String(payload.regulation ?? '').trim() || null,
    this_page: thisPage,
    max_page: integerOrNull(payload.maxPage),
    hit_count: integerOrNull(payload.hitCnt),
    cards,
  };
}

export function parseOfficialJapaneseCardDetail(body, expectedCardId) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const printedName =
    stripHtml(
      html.match(/<h1\b[^>]*class="[^"]*\bHeading1\b[^"]*"[^>]*>(?<name>[\s\S]*?)<\/h1>/i)
        ?.groups?.name,
    ) || null;
  if (!printedName) {
    throw new Error(
      `Official Japanese card ${expectedCardId} detail has no printed name.`,
    );
  }
  const imageUrl = absoluteOfficialUrl(
    html.match(
      /<img\b[^>]*class="fit"[^>]*src="(?<url>[^"]+)"[^>]*>/i,
    )?.groups?.url,
  );
  const subtext =
    html.match(
      /<div\b[^>]*class="[^"]*\bsubtext\b[^"]*"[^>]*>(?<body>[\s\S]*?)<\/div>/i,
    )?.groups?.body ?? '';
  const sourceSetCode =
    decodeHtml(
      subtext.match(
        /<img\b[^>]*class="img-regulation"[^>]*alt="(?<code>[^"]+)"/i,
      )?.groups?.code,
    ).trim() || null;
  const numberMatch = subtext.match(
    /(?:>|&nbsp;|\s)(?<number>[A-Za-z0-9+\-._]+)(?:&nbsp;|\s)*\/(?:&nbsp;|\s)*(?<total>[A-Za-z0-9+\-._]+)/i,
  );
  const rarityImage = subtext.match(
    /<img\b[^>]*src="(?<url>[^"]*\/card\/rarity\/[^"]+)"/i,
  )?.groups?.url;
  const illustrator =
    stripHtml(
      html.match(
        /<div\b[^>]*class="author"[^>]*>[\s\S]*?<a\b[^>]*>(?<name>[\s\S]*?)<\/a>/i,
      )?.groups?.name,
    ) || null;
  const hp = integerOrNull(
    stripHtml(
      html.match(
        /<span\b[^>]*class="hp-num"[^>]*>(?<hp>[\s\S]*?)<\/span>/i,
      )?.groups?.hp,
    ),
  );
  const category =
    stripHtml(
      html.match(
        /<span\b[^>]*class="type"[^>]*>(?<type>[\s\S]*?)<\/span>/i,
      )?.groups?.type,
    ) || null;
  const productMatch = html.match(
    /<li\b[^>]*class="List_item"[^>]*>\s*<a\s+href="(?<href>[^"]+)"[^>]*>(?<name>[\s\S]*?)<\/a>/i,
  );

  return {
    card_id: String(expectedCardId),
    printed_name: printedName,
    image_url: imageUrl,
    card_number_raw: numberMatch?.groups?.number ?? null,
    card_number_numerator: integerOrNull(numberMatch?.groups?.number),
    card_number_denominator: integerOrNull(numberMatch?.groups?.total),
    source_set_code: sourceSetCode,
    rarity: rarityFromImage(rarityImage),
    illustrator,
    hp,
    category,
    source_product_name: stripHtml(productMatch?.groups?.name) || null,
    source_product_url: absoluteOfficialUrl(productMatch?.groups?.href),
    source_fields: {
      rarity_image_url: absoluteOfficialUrl(rarityImage),
      printed_denominator_raw: numberMatch?.groups?.total ?? null,
    },
  };
}

export function buildOfficialJapaneseCardAssertion({
  cardBrief,
  detail,
  product,
  workItem,
  snapshotMetadata,
  rawSnapshotRef,
  detailStatus,
}) {
  const card = detail ?? cardBrief;
  const sourceUrl = `https://www.pokemon-card.com/card-search/details.php/card/${cardBrief.card_id}/regu/all`;
  return assertJapaneseCardAssertion(
    normalizeJapaneseCardAssertion({
      source_id: OFFICIAL_JP_SOURCE_ID,
      source_family: OFFICIAL_JP_SOURCE_FAMILY,
      source_kind: 'official_card_catalog',
      source_external_id: cardBrief.card_id,
      source_url: sourceUrl,
      source_container_id: product.product_id,
      source_product_id: product.product_id,
      registry_key: workItem.registry_key,
      language: 'ja',
      parser_version: OFFICIAL_JP_CARD_PARSER_VERSION,
      retrieved_at: snapshotMetadata.fetched_at,
      raw_snapshot_ref: rawSnapshotRef.replaceAll('\\', '/'),
      raw_snapshot_sha256: snapshotMetadata.body_sha256,
      printed_name: card.printed_name ?? cardBrief.printed_name,
      card_number_raw: card.card_number_raw,
      card_number_numerator: card.card_number_numerator,
      card_number_denominator: card.card_number_denominator,
      source_set_code: card.source_set_code,
      source_set_name: card.source_product_name ?? product.product_name,
      source_product_name:
        card.source_product_name ??
        product.product_name ??
        workItem.source_native_name ??
        null,
      category: card.category,
      rarity: card.rarity,
      illustrator: card.illustrator,
      hp: card.hp,
      image_urls: [card.image_url ?? cardBrief.image_url].filter(Boolean),
      related_urls: [card.source_product_url].filter(Boolean),
      release_date: workItem.source_release_date ?? null,
      source_fields: {
        ...cardBrief.source_fields,
        ...(card.source_fields ?? {}),
        detail_status: detailStatus,
        official_product_hit_count: product.hit_count,
        official_product_max_page: product.max_page,
        image_reference_only: true,
      },
    }),
  );
}

export function officialContainerHealth({
  product,
  workItem,
  selectedCardCount,
  detailSuccessCount,
  detailFailureCount,
  operatorCardLimit,
}) {
  const expected = integerOrNull(workItem.source_expected_card_count);
  const parsedCount = product.cards.length;
  const hitCount = integerOrNull(product.hit_count);
  let status = 'complete';
  const findings = [];

  if (hitCount !== null && parsedCount !== hitCount) {
    status = 'source_count_mismatch';
    findings.push('collected_api_rows_do_not_match_api_hit_count');
  }
  if (expected !== null && parsedCount !== expected) {
    findings.push('api_hit_count_differs_from_registry_expected_count');
  }
  if (detailFailureCount > 0) {
    status = 'detail_failures';
    findings.push('one_or_more_card_detail_requests_failed');
  }
  if (operatorCardLimit !== null && selectedCardCount < parsedCount) {
    status = 'operator_bounded_partial';
    findings.push('card_scope_limited_by_operator');
  }

  return {
    source_container_id: product.product_id,
    registry_key: workItem.registry_key,
    status,
    findings,
    source_expected_card_count: expected,
    api_hit_count: hitCount,
    api_page_count: product.max_page,
    parsed_card_row_count: parsedCount,
    selected_card_count: selectedCardCount,
    detail_success_count: detailSuccessCount,
    detail_failure_count: detailFailureCount,
  };
}
