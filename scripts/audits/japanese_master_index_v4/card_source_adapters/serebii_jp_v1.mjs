import {
  assertJapaneseCardAssertion,
  normalizeJapaneseCardAssertion,
} from '../card_assertion_contract_v1.mjs';

export const SEREBII_JP_CARD_PARSER_VERSION =
  'JPN-MASTER-INDEX-SEREBII-JP-CARD-PARSER-V1';
export const SEREBII_JP_SOURCE_ID = 'serebii_jp_cards';
export const SEREBII_JP_SOURCE_FAMILY = 'serebii_jp';

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
    .replaceAll('&eacute;', 'é')
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

function absoluteUrl(value) {
  if (!value) return null;
  return new URL(decodeHtml(value), 'https://www.serebii.net').toString();
}

function rarityFromImage(value) {
  const match = String(value ?? '').match(/\/card\/image\/([^/?#]+)\.(?:png|gif|jpe?g)/i);
  if (!match) return null;
  return decodeURIComponent(match[1])
    .replaceAll(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseSetMetadata(html, expectedSetId) {
  const name =
    stripHtml(
      html.match(/<div\s+align="center">\s*<h1>(?<name>[\s\S]*?)<\/h1>/i)
        ?.groups?.name,
    ) || null;
  const releaseDate =
    stripHtml(
      html.match(
        /<i>\s*Japanese Release Date:\s*<\/i>\s*(?<date>[^<]+)/i,
      )?.groups?.date,
    ) || null;
  const descriptionCount = integerOrNull(
    html.match(
      /<i>\s*Amount of Cards\s*<\/i>\s*:\s*(?:\?\?\s*)?\((?<count>\d+)\s+Normal/i,
    )?.groups?.count,
  );
  return {
    id: expectedSetId,
    name,
    release_date: releaseDate,
    declared_normal_card_count: descriptionCount,
  };
}

export function parseSerebiiJapaneseCardChecklist(body, expectedSetId) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  if (!expectedSetId) {
    throw new Error('Serebii Japanese checklist requires a set id.');
  }

  const set = parseSetMetadata(html, expectedSetId);
  const cards = [];
  const seen = new Set();
  const escapedSetId = expectedSetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rowPattern = new RegExp(
    `<tr\\b[^>]*>(?<body>[\\s\\S]*?<a\\s+href="/card/${escapedSetId}/(?<detail_id>[^"]+\\.shtml)"[\\s\\S]*?)<\\/tr>`,
    'gi',
  );

  for (const row of html.matchAll(rowPattern)) {
    const numberMatch = row.groups.body.match(
      new RegExp(
        `<a\\s+href="/card/${escapedSetId}/?"[^>]*>[\\s\\S]*?<br\\s*/?>\\s*(?<number>[^<]+?)\\s*\\/\\s*(?<total>\\d+)\\s*<img\\b[^>]*src="(?<rarity_image>[^"]+)"`,
        'i',
      ),
    );
    const detailMatch = row.groups.body.match(
      new RegExp(
        `<a\\s+href="(?<href>/card/${escapedSetId}/(?<detail_id>[^"]+\\.shtml))"[^>]*>\\s*<img\\b[^>]*src="(?<thumb>[^"]+)"`,
        'i',
      ),
    );
    const nameMatch = row.groups.body.match(
      new RegExp(
        `<a\\s+href="/card/${escapedSetId}/[^"]+\\.shtml"[^>]*>\\s*<font\\b[^>]*>(?<name>[\\s\\S]*?)<\\/font>(?<suffix>[\\s\\S]*?)<\\/a>`,
        'i',
      ),
    );
    if (!numberMatch?.groups?.number || !detailMatch?.groups?.href) continue;

    const cardNumberRaw = stripHtml(numberMatch.groups.number);
    const total = integerOrNull(numberMatch.groups.total);
    const detailId = detailMatch.groups.detail_id.replace(/\.shtml$/i, '');
    const sourceExternalId = `${expectedSetId}:${detailId}`;
    if (seen.has(sourceExternalId.toLowerCase())) {
      throw new Error(
        `Serebii Japanese checklist repeats card ${sourceExternalId}.`,
      );
    }
    seen.add(sourceExternalId.toLowerCase());
    const baseName = stripHtml(nameMatch?.groups?.name);
    const suffix = stripHtml(nameMatch?.groups?.suffix);
    const englishDisplayName =
      [baseName, suffix].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() ||
      null;

    cards.push({
      source_external_id: sourceExternalId,
      source_url: absoluteUrl(detailMatch.groups.href),
      card_number_raw: cardNumberRaw,
      card_number_numerator: integerOrNull(cardNumberRaw),
      card_number_denominator: total,
      english_display_name: englishDisplayName,
      rarity: rarityFromImage(numberMatch.groups.rarity_image),
      image_url: absoluteUrl(detailMatch.groups.thumb),
      source_fields: {
        detail_id: detailId,
        rarity_image_url: absoluteUrl(numberMatch.groups.rarity_image),
        displayed_name_language: 'en',
        japanese_printed_name_available_on_checklist: false,
      },
    });
  }

  if (cards.length === 0) {
    throw new Error(
      `Serebii Japanese set ${expectedSetId} yielded zero card rows.`,
    );
  }
  return { set, cards };
}

export function buildSerebiiJapaneseCardAssertion({
  card,
  checklist,
  workItem,
  snapshotMetadata,
  rawSnapshotRef,
}) {
  return assertJapaneseCardAssertion(
    normalizeJapaneseCardAssertion({
      source_id: SEREBII_JP_SOURCE_ID,
      source_family: SEREBII_JP_SOURCE_FAMILY,
      source_kind: 'structured_community_checklist',
      source_external_id: card.source_external_id,
      source_url: card.source_url,
      source_container_id: checklist.set.id,
      registry_key: workItem.registry_key,
      language: 'ja',
      parser_version: SEREBII_JP_CARD_PARSER_VERSION,
      retrieved_at: snapshotMetadata.fetched_at,
      raw_snapshot_ref: rawSnapshotRef.replaceAll('\\', '/'),
      raw_snapshot_sha256: snapshotMetadata.body_sha256,
      printed_name: null,
      english_display_name: card.english_display_name,
      card_number_raw: card.card_number_raw,
      card_number_numerator: card.card_number_numerator,
      card_number_denominator: card.card_number_denominator,
      source_set_name:
        checklist.set.name ?? workItem.source_native_name ?? null,
      rarity: card.rarity,
      image_urls: [card.image_url].filter(Boolean),
      release_date:
        checklist.set.release_date ?? workItem.source_release_date ?? null,
      source_fields: {
        ...card.source_fields,
        declared_normal_card_count:
          checklist.set.declared_normal_card_count,
        source_set_id: checklist.set.id,
      },
    }),
  );
}

export function serebiiContainerHealth({
  checklist,
  workItem,
  selectedCardCount,
  operatorCardLimit,
}) {
  const parsedCount = checklist.cards.length;
  const expected = integerOrNull(workItem.source_expected_card_count);
  const denominators = [
    ...new Set(
      checklist.cards
        .map((card) => card.card_number_denominator)
        .filter((value) => value !== null),
    ),
  ].sort((left, right) => left - right);
  let status = 'complete';
  const findings = [];

  if (expected !== null && parsedCount < expected) {
    status = 'source_count_mismatch';
    findings.push('checklist_rows_below_registry_expected_count');
  }
  if (expected !== null && parsedCount > expected) {
    findings.push('checklist_includes_secret_or_extra_numbered_cards');
  }
  if (
    checklist.set.declared_normal_card_count !== null &&
    expected !== null &&
    checklist.set.declared_normal_card_count !== expected
  ) {
    findings.push('page_normal_count_differs_from_registry_expected_count');
  }
  if (operatorCardLimit !== null && selectedCardCount < parsedCount) {
    status = 'operator_bounded_partial';
    findings.push('card_scope_limited_by_operator');
  }

  return {
    source_container_id: checklist.set.id,
    registry_key: workItem.registry_key,
    status,
    findings,
    source_expected_card_count: expected,
    page_declared_normal_card_count:
      checklist.set.declared_normal_card_count,
    parsed_card_row_count: parsedCount,
    selected_card_count: selectedCardCount,
    observed_denominators: denominators,
  };
}
