const PARSER_VERSION = 'JPN-MASTER-INDEX-SET-SOURCE-PARSERS-V1';

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

function nullableInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function assertion({
  sourceId,
  sourceSetId,
  code,
  name,
  releaseDate,
  expectedCardCount,
  era,
  sourceUrl,
  imageUrl = null,
  sourceOrdinal,
  releaseKind = null,
  scopeHint = null,
  sourceContainerKind = null,
}) {
  return {
    assertion_version: PARSER_VERSION,
    source_id: sourceId,
    source_set_id: String(sourceSetId),
    source_native_code: code?.trim() || null,
    source_native_name: name?.trim() || null,
    source_release_date: releaseDate?.trim() || null,
    source_expected_card_count: nullableInteger(expectedCardCount),
    source_era_label: era?.trim() || null,
    source_url: sourceUrl,
    source_image_url: imageUrl?.trim() || null,
    source_ordinal: sourceOrdinal,
    source_release_kind: releaseKind?.trim() || null,
    source_scope_hint: scopeHint?.trim() || null,
    source_container_kind: sourceContainerKind?.trim() || null,
  };
}

export function parseTcgdexJapaneseSets(body) {
  const payload = JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : body);
  if (!Array.isArray(payload)) {
    throw new Error('TCGdex Japanese sets response is not an array.');
  }
  return payload.map((set, index) => {
    if (!set?.id || !set?.name) {
      throw new Error(`TCGdex set at index ${index} lacks id or name.`);
    }
    return assertion({
      sourceId: 'tcgdex_ja_sets',
      sourceSetId: set.id,
      code: set.id,
      name: set.name,
      releaseDate: null,
      expectedCardCount: set.cardCount?.total ?? set.cardCount?.official,
      era: null,
      sourceUrl: `https://api.tcgdex.net/v2/ja/sets/${encodeURIComponent(set.id)}`,
      sourceOrdinal: index + 1,
    });
  });
}

function tcgCollectorEraRanges(html) {
  const ranges = [];
  const expression =
    /<div\s+id="(?<slug>[^"]+-era)"[\s\S]*?<h2\b[^>]*>(?<label>[\s\S]*?)<\/h2>/gi;
  for (const match of html.matchAll(expression)) {
    ranges.push({
      offset: match.index,
      label: stripHtml(match.groups.label),
    });
  }
  return ranges;
}

function eraAtOffset(ranges, offset) {
  let era = null;
  for (const range of ranges) {
    if (range.offset > offset) break;
    era = range.label;
  }
  return era;
}

export function parseTcgCollectorJapaneseSets(body) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const eraRanges = tcgCollectorEraRanges(html);
  const blocks = [
    ...html.matchAll(
      /<div\s+class="set-logo-grid-item set-search-result-item"\s+data-set-id="(?<id>\d+)"(?<body>[\s\S]*?)(?=<div\s+class="set-logo-grid-item set-search-result-item"|<\/body>|$)/gi,
    ),
  ];
  if (blocks.length === 0) {
    throw new Error('TCGCollector Japanese set page yielded zero set blocks.');
  }

  return blocks.map((match, index) => {
    const block = match[0];
    const linkMatch = block.match(
      /<a\s+href="(?<href>\/sets\/[^"]+)"\s+title="(?<name>[^"]+)"\s+class="set-logo-grid-item-name"/i,
    );
    const codeMatch = block.match(
      /class="set-logo-grid-item-code">(?<code>[\s\S]*?)<\/span>/i,
    );
    const dateMatch = block.match(
      /class="set-logo-grid-item-release-date">(?<date>[\s\S]*?)<\/div>/i,
    );
    const countMatch = stripHtml(block).match(/\b\d[\d,]*\/(?<total>\d[\d,]*)\b/);
    const imageMatches = [
      ...block.matchAll(
        /<img\b[^>]*\bsrc="(?<src>https:\/\/static\.tcgcollector\.com\/[^"]+)"[^>]*\bclass="(?<class>[^"]+)"/gi,
      ),
    ];
    const logoImage =
      imageMatches.find((candidate) =>
        candidate.groups.class.includes('set-logo-grid-item-logo'),
      ) ?? imageMatches[0];

    if (!linkMatch?.groups?.name) {
      throw new Error(
        `TCGCollector set ${match.groups.id} lacks its canonical set link.`,
      );
    }

    return assertion({
      sourceId: 'tcgcollector_jp_sets',
      sourceSetId: match.groups.id,
      code: stripHtml(codeMatch?.groups?.code),
      name: decodeHtml(linkMatch.groups.name),
      releaseDate: stripHtml(dateMatch?.groups?.date),
      expectedCardCount: countMatch?.groups?.total?.replaceAll(',', ''),
      era: eraAtOffset(eraRanges, match.index),
      sourceUrl: `https://www.tcgcollector.com${decodeHtml(linkMatch.groups.href)}`,
      imageUrl: logoImage?.groups?.src,
      sourceOrdinal: index + 1,
    });
  });
}

export function parseLimitlessJapaneseSets(body) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const rows = [...html.matchAll(/<tr\b[^>]*>(?<body>[\s\S]*?)<\/tr>/gi)];
  const assertions = [];
  let era = null;

  for (const row of rows) {
    const rowBody = row.groups.body;
    if (/<th\b/i.test(rowBody)) {
      era = stripHtml(rowBody) || era;
      continue;
    }

    const linkMatch = rowBody.match(
      /<a\s+href="\/cards\/jp\/(?<code>[^"?]+)"[^>]*>(?<label>[\s\S]*?)<\/a>/i,
    );
    if (!linkMatch?.groups?.code) continue;
    const code = decodeURIComponent(linkMatch.groups.code);
    const cells = [
      ...rowBody.matchAll(/<td\b[^>]*>(?<value>[\s\S]*?)<\/td>/gi),
    ].map((match) => stripHtml(match.groups.value));
    const rawLabel = stripHtml(linkMatch.groups.label);
    const name =
      rawLabel.endsWith(code) && rawLabel.length > code.length
        ? rawLabel.slice(0, -code.length).trim()
        : rawLabel;
    const countMatch = cells[2]?.match(/^(\d[\d,]*)\b/);
    const imageMatch = rowBody.match(
      /<img\b[^>]*\bsrc="(?<src>https:\/\/s3\.limitlesstcg\.com\/sets\/jp\/[^"]+)"/i,
    );

    assertions.push(
      assertion({
        sourceId: 'limitless_jp_sets',
        sourceSetId: code,
        code,
        name,
        releaseDate: cells[1] || null,
        expectedCardCount: countMatch?.[1]?.replaceAll(',', ''),
        era,
        sourceUrl: `https://limitlesstcg.com/cards/jp/${encodeURIComponent(code)}`,
        imageUrl: imageMatch?.groups?.src,
        sourceOrdinal: assertions.length + 1,
      }),
    );
  }

  if (assertions.length === 0) {
    throw new Error('Limitless Japanese set page yielded zero set rows.');
  }
  return assertions;
}

export function parseArtOfPkmJapaneseSets(body) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const eraRanges = [
    ...html.matchAll(
      /<div\s+class="flex flex-col gap-1"\s+id="(?<slug>[^"]+)"><h2\b[^>]*>(?<label>[\s\S]*?)<\/h2>/gi,
    ),
  ].map((match) => ({
    offset: match.index,
    label: stripHtml(match.groups.label),
  }));
  const links = [
    ...html.matchAll(
      /<a\b[^>]*\bclass="[^"]*\bset\b[^"]*"[^>]*\bhref="\/sets\/(?<id>\d+)"[^>]*>(?<body>[\s\S]*?)<\/a>/gi,
    ),
  ];
  if (links.length === 0) {
    throw new Error('Art of Pokémon set page yielded zero set links.');
  }

  return links.map((match, index) => {
    const nameMatch = match.groups.body.match(
      /<h4\b[^>]*>(?<name>[\s\S]*?)<\/h4>/i,
    );
    const imageMatches = [
      ...match.groups.body.matchAll(
        /<img\b[^>]*\bdata-src="(?<src>[^"]+)"[^>]*\bclass="(?<class>[^"]+)"/gi,
      ),
    ];
    const logoImage =
      imageMatches.find((candidate) =>
        candidate.groups.class.includes('lazy-load-logo'),
      ) ?? imageMatches[0];
    const name = stripHtml(nameMatch?.groups?.name);
    if (!name) {
      throw new Error(`Art of Pokémon set ${match.groups.id} lacks a name.`);
    }

    return assertion({
      sourceId: 'artofpkm_jp_sets',
      sourceSetId: match.groups.id,
      code: null,
      name,
      releaseDate: null,
      expectedCardCount: null,
      era: eraAtOffset(eraRanges, match.index),
      sourceUrl: `https://www.artofpkm.com/sets/${match.groups.id}`,
      imageUrl: logoImage?.groups?.src
        ? new URL(logoImage.groups.src, 'https://www.artofpkm.com').toString()
        : null,
      sourceOrdinal: index + 1,
    });
  });
}

function officialProductIdentity(product, productType) {
  const cardListUrl = String(product?.link_cardList ?? '');
  const pgMatch = cardListUrl.match(/[?&]pg=([^&]+)/i);
  if (pgMatch?.[1]) return decodeURIComponent(pgMatch[1]);
  if (product?.link_detailPage) {
    return `detail:${product.link_detailPage}:${product?.productTitle ?? ''}`;
  }
  return [
    'unlinked',
    productType,
    product?.productTitle ?? '',
    product?.releaseDate ?? '',
  ].join(':');
}

export function parseOfficialJapaneseProducts(body, {
  productType,
  sourceOrdinalOffset = 0,
} = {}) {
  const payload = JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : body);
  if (
    payload?.result !== 1 ||
    !Array.isArray(payload?.products) ||
    !Number.isSafeInteger(Number(payload?.thisPage))
  ) {
    throw new Error('Official Japanese product response has an unexpected shape.');
  }

  return payload.products.map((product, index) => {
    const identity = officialProductIdentity(product, productType);
    const hasCardList = Boolean(product?.link_cardList);
    const sourcePath =
      product?.link_detailPage || product?.link_cardList || '/products/';
    return assertion({
      sourceId: 'official_jp_products',
      sourceSetId: identity,
      code: null,
      name: product?.productTitle,
      releaseDate: product?.releaseDate,
      expectedCardCount: null,
      era: null,
      sourceUrl: new URL(sourcePath, 'https://www.pokemon-card.com').toString(),
      imageUrl: product?.tumbsImg
        ? new URL(product.tumbsImg, 'https://www.pokemon-card.com').toString()
        : null,
      sourceOrdinal: sourceOrdinalOffset + index + 1,
      releaseKind: product?.productType || productType,
      scopeHint: hasCardList ? 'card_list_linked' : 'requires_product_scope_review',
      sourceContainerKind: productType,
    });
  });
}

export { PARSER_VERSION };
