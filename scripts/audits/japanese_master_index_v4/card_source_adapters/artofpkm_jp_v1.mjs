import { createHash } from 'node:crypto';

import {
  assertJapaneseCardAssertion,
  normalizeJapaneseCardAssertion,
} from '../card_assertion_contract_v1.mjs';

export const ARTOFPKM_JP_CARD_PARSER_VERSION =
  'JPN-MASTER-INDEX-ARTOFPKM-JP-CARD-PARSER-V2';
export const ARTOFPKM_JP_SOURCE_ID = 'artofpkm_jp_cards';
export const ARTOFPKM_JP_SOURCE_FAMILY = 'artofpkm_jp';

const SOURCE_ORIGIN = 'https://www.artofpkm.com';

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

function attributeValue(attributes, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = attributes.match(
    new RegExp(`\\b${escapedName}="(?<value>[^"]*)"`, 'i'),
  );
  return match?.groups?.value ? decodeHtml(match.groups.value) : null;
}

function absoluteSourceUrl(value) {
  if (!value) return null;
  return new URL(value, SOURCE_ORIGIN).toString();
}

function cardDisplayName(title, setName) {
  const suffix = `, ${setName}`;
  return title.endsWith(suffix)
    ? title.slice(0, -suffix.length).trim() || null
    : title || null;
}

function rowFingerprint(row) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        full_image: row.full_image ?? null,
        image: row.image ?? null,
        title: row.title ?? null,
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

function parseSetMetadata(html, expectedSetId) {
  const setName = stripHtml(
    html.match(/<h1\b[^>]*>(?<value>[\s\S]*?)<\/h1>/i)?.groups?.value,
  );
  if (!setName) {
    throw new Error(`Art of Pokémon set ${expectedSetId} lacks a title.`);
  }
  const nativeJapaneseName =
    stripHtml(
      html.match(
        /<h3\b[^>]*\bclass="[^"]*\bja\b[^"]*"[^>]*>(?<value>[\s\S]*?)<\/h3>/i,
      )?.groups?.value,
    ) || null;
  const date =
    stripHtml(
      html.match(
        /<div\s+class="flex gap-4 items-center">[\s\S]*?<span>(?<value>[\s\S]*?)<\/span>/i,
      )?.groups?.value,
    ) || null;
  const cardsTab = html.match(
    new RegExp(
      `<a\\b[^>]*\\bhref="/sets/${expectedSetId}/cards"[^>]*>(?<body>[\\s\\S]*?)</a>`,
      'i',
    ),
  );
  const declaredCardCount = integerOrNull(
    stripHtml(cardsTab?.groups?.body).match(/\b(?<count>\d[\d,]*)\b/)
      ?.groups?.count,
  );

  return {
    id: String(expectedSetId),
    name: setName,
    native_japanese_name: nativeJapaneseName,
    release_date: date,
    card_count: declaredCardCount,
  };
}

export function parseArtOfPkmJapaneseCardChecklist(
  body,
  expectedSetId,
) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  if (!/^\d+$/.test(String(expectedSetId ?? ''))) {
    throw new Error('Art of Pokémon checklist requires a numeric set id.');
  }
  const set = parseSetMetadata(html, String(expectedSetId));
  const parsedRows = [];
  const linkExpression = new RegExp(
    `<a\\b(?<attributes>[^>]*\\bdata-lightbox-url="/sets/${expectedSetId}/card/(?<ordinal>\\d+)"[^>]*)>(?<body>[\\s\\S]*?)</a>`,
    'gi',
  );

  for (const match of html.matchAll(linkExpression)) {
    const ordinal = Number.parseInt(match.groups.ordinal, 10);
    const title =
      attributeValue(match.groups.attributes, 'data-lightbox-title') ??
      attributeValue(match.groups.attributes, 'aria-label')?.replace(
        /^Open\s+/i,
        '',
      ) ??
      '';
    const image = match.groups.body.match(
      /<img\b[^>]*\bsrc="(?<src>[^"]+)"/i,
    )?.groups?.src;
    const fullImage = attributeValue(match.groups.attributes, 'href');
    const sourcePath = attributeValue(
      match.groups.attributes,
      'data-lightbox-url',
    );

    parsedRows.push({
      base_external_id: `${expectedSetId}:${ordinal}`,
      source_url: absoluteSourceUrl(sourcePath),
      english_display_name: cardDisplayName(title, set.name),
      image_urls: [fullImage, image]
        .map(absoluteSourceUrl)
        .filter(Boolean),
      row_fingerprint: rowFingerprint({
        full_image: fullImage,
        image,
        title,
      }),
      source_fields: {
        card_sequence_ordinal: ordinal,
        source_display_title: title || null,
      },
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
      const hasDistinctSameSlotRows = uniqueRows.length > 1;
      cards.push({
        source_external_id: hasDistinctSameSlotRows
          ? `${row.base_external_id}:${row.row_fingerprint.slice(0, 16)}`
          : row.base_external_id,
        source_url: row.source_url,
        english_display_name: row.english_display_name,
        image_urls: row.image_urls,
        source_fields: {
          ...row.source_fields,
          source_row_fingerprint_sha256: row.row_fingerprint,
          same_slot_source_row_count: groupedRows.length,
          exact_duplicate_source_rows_collapsed:
            groupedRows.length - uniqueRows.length,
        },
      });
    }
  }

  if (cards.length === 0 && (set.card_count ?? 0) === 0) {
    return { set, cards };
  }
  if (cards.length === 0) {
    throw new Error(
      `Art of Pokémon set ${expectedSetId} yielded zero card rows.`,
    );
  }
  return { set, cards };
}

export function buildArtOfPkmJapaneseCardAssertion({
  card,
  checklist,
  workItem,
  snapshotMetadata,
  rawSnapshotRef,
}) {
  return assertJapaneseCardAssertion(
    normalizeJapaneseCardAssertion({
      source_id: ARTOFPKM_JP_SOURCE_ID,
      source_family: ARTOFPKM_JP_SOURCE_FAMILY,
      source_kind: 'collector_archive_image_checklist',
      source_external_id: card.source_external_id,
      source_url: card.source_url,
      source_container_id: checklist.set.id,
      registry_key: workItem.registry_key,
      language: 'ja',
      parser_version: ARTOFPKM_JP_CARD_PARSER_VERSION,
      retrieved_at: snapshotMetadata.fetched_at,
      raw_snapshot_ref: rawSnapshotRef.replaceAll('\\', '/'),
      raw_snapshot_sha256: snapshotMetadata.body_sha256,
      english_display_name: card.english_display_name,
      source_set_name:
        checklist.set.name ?? workItem.source_native_name ?? null,
      image_urls: card.image_urls,
      release_date:
        checklist.set.release_date ?? workItem.source_release_date ?? null,
      source_fields: {
        ...card.source_fields,
        native_japanese_set_name: checklist.set.native_japanese_name,
        checklist_card_count: checklist.set.card_count,
        printed_japanese_name_available_on_checklist: false,
        card_number_available_on_checklist: false,
        image_references_only: true,
      },
    }),
  );
}

export function artOfPkmContainerHealth({
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
    status =
      parsedCount === 0 && pageCount > 0
        ? 'source_card_rows_absent'
        : 'source_count_mismatch';
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
