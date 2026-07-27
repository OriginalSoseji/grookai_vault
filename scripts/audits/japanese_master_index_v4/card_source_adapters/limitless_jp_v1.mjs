import { createHash } from 'node:crypto';

import {
  assertJapaneseCardAssertion,
  normalizeJapaneseCardAssertion,
} from '../card_assertion_contract_v1.mjs';

export const LIMITLESS_JP_CARD_PARSER_VERSION =
  'JPN-MASTER-INDEX-LIMITLESS-JP-CARD-PARSER-V2';
export const LIMITLESS_JP_SOURCE_ID = 'limitless_jp_cards';
export const LIMITLESS_JP_SOURCE_FAMILY = 'limitless_tcg_jp';

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

function strictNumericLocalId(value) {
  const normalized = String(value ?? '').trim();
  return /^\d+$/.test(normalized) ? Number.parseInt(normalized, 10) : null;
}

function removeSetCodeFromHeading(value, setCode) {
  let heading = stripHtml(value);
  if (heading.toLowerCase().startsWith(`${setCode.toLowerCase()} `)) {
    heading = heading.slice(setCode.length).trim();
  }
  const suffix = `(${setCode})`;
  if (heading.toLowerCase().endsWith(suffix.toLowerCase())) {
    heading = heading.slice(0, -suffix.length).trim();
  }
  return heading || null;
}

function rowFingerprint(row) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        card_number_raw: row.card_number_raw ?? null,
        image_url: row.image_url ?? null,
        printed_name: row.printed_name ?? null,
        rarity: row.rarity ?? null,
        source_url: row.source_url ?? null,
        type_line: row.type_line ?? null,
      }),
    )
    .digest('hex');
}

function groupRowsByBaseId(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row.base_external_id.toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function parseSetMetadata(html, expectedSetCode) {
  const infoboxMatch = html.match(
    /<div\s+class="infobox">[\s\S]*?<div\s+class="infobox-heading sm">(?<heading>[\s\S]*?)<\/div>\s*<div\s+class="infobox-line">(?<line>[\s\S]*?)<\/div>/i,
  );
  const heading = infoboxMatch?.groups?.heading ?? '';
  const line = stripHtml(infoboxMatch?.groups?.line);
  const headingCode =
    heading.match(/<img\b[^>]*\balt="(?<code>[^"]+)"/i)?.groups?.code ??
    null;
  if (
    headingCode &&
    headingCode.toLowerCase() !== expectedSetCode.toLowerCase()
  ) {
    throw new Error(
      `Limitless Japanese set mismatch: expected ${expectedSetCode}, received ${headingCode}.`,
    );
  }
  const cardCount = integerOrNull(
    line.match(/(?<count>\d[\d,]*)\s+Cards?\b/i)?.groups?.count,
  );
  const releaseDate = line.split(/\s*[•·]\s*/)[0]?.trim() || null;

  return {
    id: expectedSetCode,
    name: removeSetCodeFromHeading(heading, expectedSetCode),
    native_japanese_name: null,
    release_date: releaseDate,
    card_count: cardCount,
  };
}

export function parseLimitlessJapaneseCardChecklist(
  body,
  expectedSetCode,
) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  if (!expectedSetCode) {
    throw new Error('Limitless Japanese checklist requires a set code.');
  }
  const set = parseSetMetadata(html, expectedSetCode);
  const parsedRows = [];

  for (const row of html.matchAll(
    /<tr\b(?<attributes>[^>]*)>(?<body>[\s\S]*?)<\/tr>/gi,
  )) {
    const imageUrl = row.groups.attributes.match(
      /\bdata-hover="(?<url>[^"]+)"/i,
    )?.groups?.url;
    if (!imageUrl) continue;

    const link = row.groups.body.match(
      /<a\s+href="(?<href>\/cards\/jp\/(?<code>[^/"?]+)\/(?<path_number>[^/"?]+))"[^>]*>/i,
    );
    if (!link?.groups?.href) continue;
    const sourceSetCode = decodeURIComponent(link.groups.code);
    if (sourceSetCode.toLowerCase() !== expectedSetCode.toLowerCase()) {
      throw new Error(
        `Limitless Japanese row set mismatch: expected ${expectedSetCode}, received ${sourceSetCode}.`,
      );
    }

    const cells = [
      ...row.groups.body.matchAll(
        /<td\b[^>]*>(?<value>[\s\S]*?)<\/td>/gi,
      ),
    ].map((match) => stripHtml(match.groups.value));
    if (cells.length < 5) {
      throw new Error(
        `Limitless Japanese row ${link.groups.href} has ${cells.length} cells.`,
      );
    }
    const baseExternalId = `${sourceSetCode}:${decodeURIComponent(link.groups.path_number)}`;
    const nativeSetName = row.groups.body.match(
      /\bdata-tooltip="(?<name>[^"]+)"/i,
    )?.groups?.name;
    if (nativeSetName && !set.native_japanese_name) {
      set.native_japanese_name = decodeHtml(nativeSetName).trim() || null;
    }

    const parsedRow = {
      base_external_id: baseExternalId,
      source_url: `https://limitlesstcg.com${decodeHtml(link.groups.href)}`,
      source_set_code: sourceSetCode,
      card_number_raw: cells[1] || decodeURIComponent(link.groups.path_number),
      printed_name: cells[2] || null,
      type_line: cells[3] || null,
      rarity: cells[4] || null,
      image_url: decodeHtml(imageUrl),
      source_fields: {
        path_number: decodeURIComponent(link.groups.path_number),
        checklist_cell_count: cells.length,
      },
    };
    parsedRows.push({
      ...parsedRow,
      row_fingerprint: rowFingerprint(parsedRow),
    });
  }

  const rowsByBaseId = groupRowsByBaseId(parsedRows);
  const cards = [];
  for (const groupedRows of rowsByBaseId.values()) {
    const uniqueRows = [
      ...new Map(
        groupedRows.map((row) => [row.row_fingerprint, row]),
      ).values(),
    ];
    for (const row of uniqueRows) {
      const hasDistinctSameNumberRows = uniqueRows.length > 1;
      cards.push({
        source_external_id: hasDistinctSameNumberRows
          ? `${row.base_external_id}:${row.row_fingerprint.slice(0, 16)}`
          : row.base_external_id,
        source_url: row.source_url,
        source_set_code: row.source_set_code,
        card_number_raw: row.card_number_raw,
        printed_name: row.printed_name,
        type_line: row.type_line,
        rarity: row.rarity,
        image_url: row.image_url,
        source_fields: {
          ...row.source_fields,
          source_row_fingerprint_sha256: row.row_fingerprint,
          same_number_source_row_count: groupedRows.length,
          exact_duplicate_source_rows_collapsed:
            groupedRows.length - uniqueRows.length,
        },
      });
    }
  }

  if (cards.length === 0) {
    throw new Error(
      `Limitless Japanese set ${expectedSetCode} yielded zero card rows.`,
    );
  }
  return { set, cards };
}

export function buildLimitlessJapaneseCardAssertion({
  card,
  checklist,
  workItem,
  snapshotMetadata,
  rawSnapshotRef,
}) {
  const denominator =
    checklist.set.card_count ??
    integerOrNull(workItem.source_expected_card_count);

  return assertJapaneseCardAssertion(
    normalizeJapaneseCardAssertion({
      source_id: LIMITLESS_JP_SOURCE_ID,
      source_family: LIMITLESS_JP_SOURCE_FAMILY,
      source_kind: 'structured_community_checklist',
      source_external_id: card.source_external_id,
      source_url: card.source_url,
      source_container_id: checklist.set.id,
      registry_key: workItem.registry_key,
      language: 'ja',
      parser_version: LIMITLESS_JP_CARD_PARSER_VERSION,
      retrieved_at: snapshotMetadata.fetched_at,
      raw_snapshot_ref: rawSnapshotRef.replaceAll('\\', '/'),
      raw_snapshot_sha256: snapshotMetadata.body_sha256,
      printed_name: card.printed_name,
      card_number_raw: card.card_number_raw,
      card_number_numerator: strictNumericLocalId(card.card_number_raw),
      card_number_denominator: denominator,
      source_set_code: checklist.set.id,
      source_set_name:
        checklist.set.name ?? workItem.source_native_name ?? null,
      type_line: card.type_line,
      rarity: card.rarity,
      image_urls: [card.image_url].filter(Boolean),
      release_date:
        checklist.set.release_date ?? workItem.source_release_date ?? null,
      source_fields: {
        ...card.source_fields,
        native_japanese_set_name: checklist.set.native_japanese_name,
        checklist_card_count: checklist.set.card_count,
        displayed_price_fields_ignored: true,
      },
    }),
  );
}

export function limitlessContainerHealth({
  checklist,
  workItem,
  selectedCardCount,
  operatorCardLimit,
}) {
  const parsedCount = checklist.cards.length;
  const pageCount = integerOrNull(checklist.set.card_count);
  const expected = integerOrNull(workItem.source_expected_card_count);
  let status = 'complete';
  const findings = [];

  if (pageCount !== null && parsedCount !== pageCount) {
    status = 'source_count_mismatch';
    findings.push('checklist_rows_do_not_match_page_card_count');
  }
  if (expected !== null && pageCount !== null && expected !== pageCount) {
    findings.push('registry_expected_count_differs_from_page_card_count');
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
    page_card_count: pageCount,
    parsed_card_row_count: parsedCount,
    selected_card_count: selectedCardCount,
  };
}
