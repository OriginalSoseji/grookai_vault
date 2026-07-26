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
  nativeJapaneseName = null,
  releaseDate,
  expectedCardCount,
  reportedCardCounts = [],
  era,
  sourceUrl,
  relatedUrls = [],
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
    source_native_japanese_name: nativeJapaneseName?.trim() || null,
    source_release_date: releaseDate?.trim() || null,
    source_expected_card_count: nullableInteger(expectedCardCount),
    source_reported_card_counts: [
      ...new Set(
        reportedCardCounts
          .map(nullableInteger)
          .filter((value) => value !== null),
      ),
    ],
    source_era_label: era?.trim() || null,
    source_url: sourceUrl,
    source_related_urls: [...new Set(relatedUrls.filter(Boolean))].sort(),
    source_image_url: imageUrl?.trim() || null,
    source_ordinal: sourceOrdinal,
    source_release_kind: releaseKind?.trim() || null,
    source_scope_hint: scopeHint?.trim() || null,
    source_container_kind: sourceContainerKind?.trim() || null,
  };
}

export function parseTcgdexJapaneseSets(body) {
  const payload = JSON.parse(
    Buffer.isBuffer(body) ? body.toString('utf8') : body,
  );
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
    const countMatch = stripHtml(block).match(
      /\b\d[\d,]*\/(?<total>\d[\d,]*)\b/,
    );
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

function absoluteUrl(value, baseUrl) {
  return new URL(decodeHtml(value), baseUrl).toString();
}

export function parseSerebiiJapaneseSets(body) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const rows = [...html.matchAll(/<tr\b[^>]*>(?<body>[\s\S]*?)<\/tr>/gi)];
  const assertions = [];

  for (const row of rows) {
    const cells = [
      ...row.groups.body.matchAll(/<td\b[^>]*>(?<value>[\s\S]*?)<\/td>/gi),
    ];
    if (cells.length < 4) continue;
    const setLink = cells[0].groups.value.match(
      /<a\b[^>]*\bhref="(?<href>\/card\/(?<id>[^"/?#]+)\/?)"[^>]*>/i,
    );
    if (!setLink?.groups?.id) continue;
    const name = stripHtml(cells[1].groups.value);
    const countMatch = stripHtml(cells[2].groups.value).match(/\b(\d[\d,]*)\b/);
    const releaseDate = stripHtml(cells[3].groups.value);
    const imageMatch = cells[0].groups.value.match(
      /<img\b[^>]*\bsrc="(?<src>[^"]+)"/i,
    );
    if (!name) {
      throw new Error(
        `Serebii Japanese set ${setLink.groups.id} lacks a name.`,
      );
    }

    assertions.push(
      assertion({
        sourceId: 'serebii_jp_sets',
        sourceSetId: setLink.groups.id,
        code: null,
        name,
        releaseDate,
        expectedCardCount: countMatch?.[1]?.replaceAll(',', ''),
        reportedCardCounts: countMatch
          ? [countMatch[1].replaceAll(',', '')]
          : [],
        era: null,
        sourceUrl: absoluteUrl(setLink.groups.href, 'https://www.serebii.net'),
        imageUrl: imageMatch?.groups?.src
          ? absoluteUrl(imageMatch.groups.src, 'https://www.serebii.net')
          : null,
        sourceOrdinal: assertions.length + 1,
        releaseKind: 'japanese_set_index',
        sourceContainerKind: 'set_index',
      }),
    );
  }

  if (assertions.length === 0) {
    throw new Error('Serebii Japanese set page yielded zero set rows.');
  }
  return assertions;
}

function headingRanges(html) {
  return [
    ...html.matchAll(
      /<h(?<level>[234])\b[^>]*>\s*<span\b[^>]*\bclass="mw-headline"[^>]*\bid="(?<id>[^"]+)"[^>]*>(?<label>[\s\S]*?)<\/span>\s*<\/h\k<level>>/gi,
    ),
  ].map((match) => ({
    offset: match.index,
    level: Number(match.groups.level),
    id: decodeHtml(match.groups.id),
    label: stripHtml(match.groups.label),
  }));
}

function headingContextAtOffset(ranges, offset) {
  const context = { section: null, era: null };
  for (const range of ranges) {
    if (range.offset > offset) break;
    if (range.level === 2) {
      context.section = range.label;
      context.era = null;
    } else if (range.level === 3) {
      context.era = range.label;
    }
  }
  return context;
}

function bulbapediaTranslatedLinks(nameCell) {
  return [
    ...nameCell.matchAll(
      /<a\b[^>]*\bhref="(?<href>\/wiki\/(?!File:)[^"]+)"[^>]*\btitle="(?<title>[^"]+\(TCG\))"[^>]*>(?<label>[\s\S]*?)<\/a>/gi,
    ),
  ].map((match) => ({
    href: match.groups.href,
    title: decodeHtml(match.groups.title),
    label: stripHtml(match.groups.label),
  }));
}

function reportedCountsFromCell(countCell) {
  const segments = String(countCell)
    .replace(/<br\s*\/?>/gi, '|')
    .split('|')
    .map(stripHtml)
    .filter(Boolean);
  return [
    ...new Set(
      segments
        .map((segment) => segment.match(/^(\d[\d,]*)\b/)?.[1])
        .filter(Boolean)
        .map((value) => Number(value.replaceAll(',', ''))),
    ),
  ];
}

export function parseBulbapediaJapaneseExpansions(body) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const ranges = headingRanges(html);
  const tables = [
    ...html.matchAll(/<table\b[^>]*>(?<body>[\s\S]*?)<\/table>/gi),
  ];
  const assertions = [];

  for (const table of tables) {
    const headerText = stripHtml(
      [...table.groups.body.matchAll(/<th\b[^>]*>(?<value>[\s\S]*?)<\/th>/gi)]
        .map((match) => match.groups.value)
        .join(' '),
    );
    if (
      !/Japanese name/i.test(headerText) ||
      !/No\. of cards/i.test(headerText) ||
      !/Release date/i.test(headerText)
    ) {
      continue;
    }

    const context = headingContextAtOffset(ranges, table.index);
    const rows = [
      ...table.groups.body.matchAll(/<tr\b[^>]*>(?<body>[\s\S]*?)<\/tr>/gi),
    ];
    for (const row of rows) {
      if (/<th\b/i.test(row.groups.body)) continue;
      const cells = [
        ...row.groups.body.matchAll(/<td\b[^>]*>(?<value>[\s\S]*?)<\/td>/gi),
      ].map((match) => match.groups.value);
      if (cells.length < 4) continue;

      const [nameCell, , countCell, releaseDateCell] = cells.slice(-4);
      const links = bulbapediaTranslatedLinks(nameCell);
      if (links.length === 0) continue;
      const names = [
        ...new Set(links.map((link) => link.label).filter(Boolean)),
      ];
      const relatedUrls = [
        ...new Set(
          links.map((link) =>
            absoluteUrl(link.href, 'https://bulbapedia.bulbagarden.net'),
          ),
        ),
      ];
      const japaneseName = stripHtml(
        nameCell.replace(/<br\s*\/?>[\s\S]*/i, ''),
      );
      const reportedCounts = reportedCountsFromCell(countCell);
      const sourceSetId = links
        .map((link) => decodeURIComponent(link.href.replace(/^\/wiki\//i, '')))
        .join('|');

      assertions.push(
        assertion({
          sourceId: 'bulbapedia_jp_expansions',
          sourceSetId,
          code: null,
          name: names.join(' • '),
          nativeJapaneseName: japaneseName,
          releaseDate: stripHtml(releaseDateCell),
          expectedCardCount:
            reportedCounts.length === 1 ? reportedCounts[0] : null,
          reportedCardCounts: reportedCounts,
          era: context.era,
          sourceUrl: relatedUrls[0],
          relatedUrls,
          imageUrl: null,
          sourceOrdinal: assertions.length + 1,
          releaseKind: context.section,
          sourceContainerKind: context.section
            ?.normalize('NFKC')
            .toLocaleLowerCase('en-US')
            .replace(/[^\p{L}\p{N}]+/gu, '_')
            .replace(/^_+|_+$/g, ''),
        }),
      );
    }
  }

  if (assertions.length === 0) {
    throw new Error(
      'Bulbapedia Japanese expansion page yielded zero release rows.',
    );
  }
  return assertions;
}

function parseReleaseDateFromText(value) {
  const text = stripHtml(value);
  return (
    text.match(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/i,
    )?.[0] ?? null
  );
}

function pokeGuardianCoreTitle(value) {
  return stripHtml(value)
    .replace(/\s+Main Set List\s*$/i, '')
    .replace(/\s+All\b[\s\S]*?\bCards\s*$/i, '')
    .trim();
}

function pokeGuardianCodes(value) {
  return [
    ...new Set(
      [...value.matchAll(/\b(?:SV|SM|S|XY|BW|M)\d+[A-Z]?\b/gi)].map((match) =>
        match[0].toLocaleUpperCase('en-US'),
      ),
    ),
  ];
}

export function parsePokeGuardianJapaneseSetIndex(body) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const articles = [
    ...html.matchAll(
      /<article\b[^>]*\bclass="[^"]*\bjw-news-post\b[^"]*"[^>]*>(?<body>[\s\S]*?)<\/article>/gi,
    ),
  ];
  const grouped = new Map();

  for (const article of articles) {
    const link = article.groups.body.match(
      /<h2\b[^>]*\bclass="[^"]*\bjw-news-post__title\b[^"]*"[^>]*>[\s\S]*?<a\b[^>]*\bdata-segment-id="(?<id>\d+)"[^>]*\bhref="(?<href>[^"]+)"[^>]*>(?<title>[\s\S]*?)<\/a>[\s\S]*?<\/h2>/i,
    );
    if (!link?.groups?.id) continue;
    const title = stripHtml(link.groups.title);
    const coreTitle = pokeGuardianCoreTitle(title);
    const codes = pokeGuardianCodes(coreTitle);
    const key =
      codes.length > 0
        ? codes.join('+')
        : coreTitle
            .normalize('NFKC')
            .toLocaleLowerCase('en-US')
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-+|-+$/g, '');
    const imageMatch = article.groups.body.match(
      /background-image:\s*url\((?<url>[^)]+)\)/i,
    );
    const leadMatch = article.groups.body.match(
      /<div\b[^>]*\bclass="[^"]*\bjw-news-post__lead\b[^"]*"[^>]*>(?<lead>[\s\S]*?)<\/div>/i,
    );
    const record = {
      id: link.groups.id,
      title,
      coreTitle,
      codes,
      url: absoluteUrl(link.groups.href, 'https://www.pokeguardian.com'),
      imageUrl: imageMatch?.groups?.url?.trim() || null,
      releaseDate: parseReleaseDateFromText(leadMatch?.groups?.lead),
      isMainList: /Main Set List\s*$/i.test(title),
      ordinal: article.index,
    };
    const group = grouped.get(key) ?? [];
    group.push(record);
    grouped.set(key, group);
  }

  const assertions = [...grouped.entries()]
    .map(([key, records]) => {
      records.sort(
        (left, right) =>
          Number(right.isMainList) - Number(left.isMainList) ||
          left.ordinal - right.ordinal,
      );
      const preferred = records[0];
      return assertion({
        sourceId: 'pokeguardian_jp_sets',
        sourceSetId: key || preferred.id,
        code: preferred.codes.length > 0 ? preferred.codes.join(' / ') : null,
        name: preferred.coreTitle,
        releaseDate:
          records.map((record) => record.releaseDate).find(Boolean) ?? null,
        expectedCardCount: null,
        era: null,
        sourceUrl: preferred.url,
        relatedUrls: records.map((record) => record.url),
        imageUrl:
          records.map((record) => record.imageUrl).find(Boolean) ?? null,
        sourceOrdinal: Math.min(...records.map((record) => record.ordinal)) + 1,
        releaseKind: 'set_list_article_cluster',
        sourceContainerKind: 'japanese_set_list_index',
      });
    })
    .sort((left, right) => left.source_ordinal - right.source_ordinal)
    .map((row, index) => ({ ...row, source_ordinal: index + 1 }));

  if (assertions.length === 0) {
    throw new Error('PokeGuardian Japanese set index yielded zero releases.');
  }
  return assertions;
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

function officialProductScopeHint({ hasCardList, productType }) {
  if (hasCardList) return 'card_list_linked';
  if (productType === 'expansion') return 'official_expansion_release';
  if (productType === 'construction') {
    return 'official_constructed_deck_product';
  }
  if (productType === 'others') {
    return 'official_card_distribution_product';
  }
  return 'requires_product_scope_review';
}

export function parseOfficialJapaneseProducts(
  body,
  { productType, sourceOrdinalOffset = 0 } = {},
) {
  const payload = JSON.parse(
    Buffer.isBuffer(body) ? body.toString('utf8') : body,
  );
  if (
    payload?.result !== 1 ||
    !Array.isArray(payload?.products) ||
    !Number.isSafeInteger(Number(payload?.thisPage))
  ) {
    throw new Error(
      'Official Japanese product response has an unexpected shape.',
    );
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
      scopeHint: officialProductScopeHint({ hasCardList, productType }),
      sourceContainerKind: productType,
    });
  });
}

export { PARSER_VERSION };
