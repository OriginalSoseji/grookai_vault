import {
  assertJapaneseCardAssertion,
  normalizeJapaneseCardAssertion,
} from '../card_assertion_contract_v1.mjs';

export const BULBAPEDIA_JP_CARD_PARSER_VERSION =
  'JPN-MASTER-INDEX-BULBAPEDIA-JP-CARD-PARSER-V5';
export const BULBAPEDIA_JP_SOURCE_ID = 'bulbapedia_jp_card_lists';
export const BULBAPEDIA_JP_SOURCE_FAMILY =
  'bulbapedia_jp_card_list';

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&ndash;', '–')
    .replaceAll('&mdash;', '—');
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
  const parsed = Number.parseInt(String(value), 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function absoluteBulbapediaUrl(value) {
  if (!value) return null;
  return new URL(decodeHtml(value), 'https://bulbapedia.bulbagarden.net')
    .toString();
}

function parseNumberCell(value) {
  const normalized = stripHtml(value);
  const match = normalized.match(
    /^(?<numerator>\d{1,4})\s*\/\s*(?<denominator>\d{1,4})$/,
  );
  if (!match?.groups) return null;
  return {
    raw: `${match.groups.numerator}/${match.groups.denominator}`,
    numerator: Number.parseInt(match.groups.numerator, 10),
    denominator: Number.parseInt(match.groups.denominator, 10),
  };
}

function parseNumberCellFirstLine(cell) {
  // Some anniversary rows add a separate badge number after a line break.
  // The printed coordinate is the complete first line, not both numbers joined.
  return parseNumberCell(String(cell?.html ?? '').split(/<br\s*\/?\s*>/i)[0]);
}

function isExplicitOtherLanguageHeading(heading) {
  return /^(?:english|simplified chinese|traditional chinese|chinese|korean|thai|indonesian|german|french|italian|spanish|portuguese)(?:\s|$)/i.test(String(heading ?? '').trim());
}

function languageSectionAt(html, offset) {
  const stack = new Map();
  for (const match of html.slice(0, offset).matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const level = Number(match[1]);
    for (const existing of stack.keys()) if (existing >= level) stack.delete(existing);
    stack.set(level, stripHtml(match[2]));
  }
  for (const heading of [...stack.values()].reverse()) {
    if (/^japanese(?:\s|$)/i.test(heading)) return 'japanese';
    if (isExplicitOtherLanguageHeading(heading)) return 'other';
  }
  return 'unknown';
}

function visibleLinks(rowHtml) {
  return [...rowHtml.matchAll(
    /<a\b[^>]*\bhref=(?:"(?<double>[^"]+)"|'(?<single>[^']+)')[^>]*>(?<body>[\s\S]*?)<\/a>/gi,
  )]
    .map((match) => ({
      href: absoluteBulbapediaUrl(
        match.groups.double ?? match.groups.single,
      ),
      text: stripHtml(match.groups.body),
    }))
    .filter((row) => row.text);
}

function rowCells(rowHtml) {
  return [...rowHtml.matchAll(
    /<t[hd]\b[^>]*>(?<body>[\s\S]*?)<\/t[hd]>/gi,
  )].map((match) => ({
    html: match.groups.body,
    text: stripHtml(match.groups.body),
  }));
}

function slug(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unnamed';
}

function nearestHeading(html, tableIndex) {
  const headings = [
    ...html.slice(0, tableIndex).matchAll(
      /<h[2-4]\b[^>]*>(?<body>[\s\S]*?)<\/h[2-4]>/gi,
    ),
  ];
  return stripHtml(headings.at(-1)?.groups?.body) || null;
}

function cardListTables(html) {
  const tables = [];
  for (const [tableIndex, tableMatch] of [
    ...html.matchAll(/<table\b[^>]*>(?<body>[\s\S]*?)<\/table>/gi),
  ].entries()) {
    const rows = [
      ...tableMatch.groups.body.matchAll(
        /<tr\b[^>]*>(?<body>[\s\S]*?)<\/tr>/gi,
      ),
    ];
    const parsedRows = rows.map((row, rowIndex) => ({
      row_index: rowIndex,
      cells: rowCells(row.groups.body),
    }));
    const header = parsedRows.find((row) => {
      const labels = row.cells.map((cell) => cell.text.toLowerCase());
      return labels.some((label) => /^no\.?$/.test(label))
        && labels.some((label) => /^(?:card name|card)$/.test(label));
    });
    if (!header) continue;

    const labels = header.cells.map((cell) => cell.text.toLowerCase());
    const numberCellIndex = labels.findIndex((label) => /^no\.?$/.test(label));
    const nameCellIndex = labels.findIndex((label) =>
      /^(?:card name|card)$/.test(label));
    const typeCellIndex = labels.findIndex((label) => label === 'type');
    const rarityCellIndex = labels.findIndex((label) => label === 'rarity');
    const cards = [];
    const tableHeading = nearestHeading(html, tableMatch.index);
    const languageSection = languageSectionAt(html, tableMatch.index);

    for (const row of parsedRows.slice(header.row_index + 1)) {
      const numberCell = row.cells[numberCellIndex];
      const nameCell = row.cells[nameCellIndex];
      if (!numberCell || !nameCell?.text) continue;
      const number = parseNumberCellFirstLine(numberCell);
      const unnumbered = /^(?:—|–|-)$/.test(numberCell.text);
      // Preserve printed alphabetic coordinates, but only select them later
      // when this same table is explicitly Japanese and has the expected
      // numbered checklist. Other-language tables can use identical labels.
      const specialLabel = !number && !unnumbered &&
        /^[A-Z]{1,8}(?:\/[A-Z]{1,8})?$/.test(numberCell.text)
        ? numberCell.text : null;
      if (!number && !unnumbered && !specialLabel) continue;
      const cardLink = visibleLinks(nameCell.html)
        .find((link) => /\/wiki\//i.test(link.href));
      if (!cardLink && !/[\p{L}\p{N}]/u.test(nameCell.text)) continue;
      cards.push({
        table_index: tableIndex,
        table_heading: tableHeading,
        source_language_section: languageSection,
        article_row_index: row.row_index,
        number,
        unnumbered,
        special_label: specialLabel,
        english_display_name: nameCell.text,
        related_url: cardLink?.href ?? null,
        type_line:
          typeCellIndex >= 0 ? row.cells[typeCellIndex]?.text || null : null,
        rarity:
          rarityCellIndex >= 0
            ? row.cells[rarityCellIndex]?.text || null
            : null,
        row_cells: row.cells.map((cell) => cell.text),
      });
    }

    if (cards.length > 0) {
      tables.push({
        table_index: tableIndex,
        table_heading: tableHeading,
        cards,
        numbered_cards: cards.filter((card) => card.number),
        unnumbered_cards: cards.filter((card) => card.unnumbered),
        special_cards: cards.filter((card) => card.special_label),
      });
    }
  }
  return tables;
}

function modernNumberedRows(html, expectedDenominator) {
  if (expectedDenominator === null) return [];
  const cards = [];
  for (const [rowIndex, row] of [
    ...html.matchAll(/<tr\b[^>]*>(?<body>[\s\S]*?)<\/tr>/gi),
  ].entries()) {
    const cells = rowCells(row.groups.body);
    const numberCellIndex = cells.findIndex((cell) => {
      const number = parseNumberCellFirstLine(cell);
      return number?.denominator === expectedDenominator;
    });
    if (numberCellIndex < 0) continue;
    const number = parseNumberCellFirstLine(cells[numberCellIndex]);
    const nameCell = cells.slice(numberCellIndex + 1).find((cell) =>
      visibleLinks(cell.html).some((link) =>
        /\/wiki\/[^/]+_\([^)]*\d+\)/i.test(link.href)));
    if (!nameCell?.text) continue;
    const cardLink = visibleLinks(nameCell.html).find((link) =>
      /\/wiki\/[^/]+_\([^)]*\d+\)/i.test(link.href));
    cards.push({
      table_index: -1,
      table_heading: nearestHeading(html, row.index),
      source_language_section: languageSectionAt(html, row.index),
      article_row_index: rowIndex,
      number,
      unnumbered: false,
      english_display_name: nameCell.text,
      related_url: cardLink?.href ?? null,
      type_line: null,
      rarity: null,
      row_cells: cells.map((cell) => cell.text),
    });
  }
  return cards;
}

export function parseBulbapediaJapaneseCardList(body, workItem) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const expected = integerOrNull(workItem.source_expected_card_count);
  const tables = cardListTables(html);
  const cards = [];
  const coordinateOccurrences = new Map();
  const japaneseTables = tables.map((table) => ({ ...table,
    numbered_cards: table.numbered_cards.filter((row) => row.source_language_section !== 'other'),
    unnumbered_cards: table.unnumbered_cards.filter((row) => row.source_language_section !== 'other'),
  }));
  const tableNumberedRows = japaneseTables.flatMap((table) => table.numbered_cards);
  const numberedRows = tableNumberedRows.length > 0
    ? tableNumberedRows
    : modernNumberedRows(html, expected).filter((row) => row.source_language_section !== 'other');
  const candidateNumberedRowCount = numberedRows.length;
  const rejectedOtherDenominatorCount = expected === null
    ? 0
    : numberedRows.filter(
      (card) => card.number.denominator !== expected,
    ).length;
  const matchingNumberedRows = expected === null
    ? []
    : numberedRows.filter(
      (card) => card.number.denominator === expected,
    );
  const selectedSpecialRows = expected === null ? [] : japaneseTables.flatMap((table) =>
    table.numbered_cards.some((row) => row.number.denominator === expected &&
      row.source_language_section === 'japanese')
      ? table.special_cards.filter((row) => row.source_language_section === 'japanese')
      : []);
  const unnumberedTables = japaneseTables.filter(
    (table) =>
      table.unnumbered_cards.length > 0
      && table.numbered_cards.length === 0,
  );
  const selectedUnnumberedTables = expected === null
    ? unnumberedTables
    : unnumberedTables.filter(
      (table) => table.unnumbered_cards.length === expected,
    );
  const selectedRows = matchingNumberedRows.length > 0
    ? [...matchingNumberedRows, ...selectedSpecialRows]
    : selectedUnnumberedTables.flatMap((table) => table.unnumbered_cards);
  const numberingMode = matchingNumberedRows.length > 0
    ? 'printed_number'
    : 'unavailable';

  for (const sourceCard of selectedRows) {
    const number = sourceCard.number;
    const rawCoordinate = number?.raw ?? sourceCard.special_label ?? null;
    const coordinateKey = rawCoordinate
      ? `${rawCoordinate.toLowerCase()}:${slug(sourceCard.english_display_name)}`
      : `table-${sourceCard.table_index}:${slug(sourceCard.english_display_name)}`;
    const occurrence = (coordinateOccurrences.get(coordinateKey) ?? 0) + 1;
    coordinateOccurrences.set(coordinateKey, occurrence);

    cards.push({
      source_external_id:
        `${workItem.source_container_id}:${coordinateKey}:${occurrence}`,
      source_url: workItem.source_container_url,
      related_url: sourceCard.related_url,
      card_number_raw: rawCoordinate,
      card_number_numerator: number?.numerator ?? null,
      card_number_denominator: number?.denominator ?? null,
      english_display_name: sourceCard.english_display_name,
      type_line: sourceCard.type_line,
      rarity: sourceCard.rarity,
      source_fields: {
        article_row_index: sourceCard.article_row_index,
        article_table_index: sourceCard.table_index,
        article_table_heading: sourceCard.table_heading,
        coordinate_occurrence: occurrence,
        display_name_language: 'en',
        printed_japanese_name_available_in_table: false,
        printed_card_number_available_in_table: rawCoordinate !== null,
        special_label_from_explicit_japanese_numbered_table: sourceCard.special_label ?? null,
        table_selected_by_expected_denominator:
          number === null ? null : expected,
        table_selected_by_exact_unnumbered_row_count:
          number === null && expected !== null ? expected : null,
        row_cells: sourceCard.row_cells,
      },
    });
  }

  if (cards.length === 0) {
    const unnumberedCounts = unnumberedTables
      .map((table) => table.unnumbered_cards.length)
      .join(',');
    throw new Error(
      `Bulbapedia article ${workItem.source_container_id} yielded no proven Japanese card-list rows (expected=${expected ?? 'unknown'}; unnumbered_table_counts=${unnumberedCounts || 'none'}).`,
    );
  }

  return {
    set: {
      id: workItem.source_container_id,
      name: workItem.source_native_name ?? null,
      native_japanese_name:
        workItem.source_native_japanese_name ?? null,
      source_code: workItem.source_native_code ?? null,
      release_date: workItem.source_release_date ?? null,
      expected_card_count: expected,
    },
    cards,
    diagnostics: {
      numbering_mode: numberingMode,
      candidate_numbered_row_count: candidateNumberedRowCount,
      rejected_other_denominator_count: rejectedOtherDenominatorCount,
      matching_row_count: cards.length,
      special_label_row_count: selectedSpecialRows.length,
      card_list_table_count: tables.length,
      modern_numbered_row_fallback_used: tableNumberedRows.length === 0,
      unnumbered_candidate_table_counts: unnumberedTables.map(
        (table) => table.unnumbered_cards.length,
      ),
      selected_unnumbered_table_count: selectedUnnumberedTables.length,
      selected_unnumbered_table_counts: selectedUnnumberedTables.map(
        (table) => table.unnumbered_cards.length,
      ),
    },
  };
}

export function buildBulbapediaJapaneseCardAssertion({
  card,
  checklist,
  workItem,
  snapshotMetadata,
  rawSnapshotRef,
}) {
  return assertJapaneseCardAssertion(
    normalizeJapaneseCardAssertion({
      source_id: BULBAPEDIA_JP_SOURCE_ID,
      source_family: BULBAPEDIA_JP_SOURCE_FAMILY,
      source_kind: 'community_encyclopedia_card_list',
      source_external_id: card.source_external_id,
      source_url: card.source_url,
      source_container_id: checklist.set.id,
      registry_key: workItem.registry_key,
      language: 'ja',
      parser_version: BULBAPEDIA_JP_CARD_PARSER_VERSION,
      retrieved_at: snapshotMetadata.fetched_at,
      raw_snapshot_ref: rawSnapshotRef.replaceAll('\\', '/'),
      raw_snapshot_sha256: snapshotMetadata.body_sha256,
      printed_name: null,
      english_display_name: card.english_display_name,
      card_number_raw: card.card_number_raw,
      card_number_numerator: card.card_number_numerator,
      card_number_denominator: card.card_number_denominator,
      unnumbered_label:
        card.card_number_raw === null ? card.english_display_name : null,
      source_set_code: checklist.set.source_code,
      source_set_name: checklist.set.name,
      type_line: card.type_line,
      rarity: card.rarity,
      related_urls: [card.related_url].filter(Boolean),
      release_date: checklist.set.release_date,
      source_fields: {
        ...card.source_fields,
        native_japanese_set_name: checklist.set.native_japanese_name,
        source_expected_card_count: checklist.set.expected_card_count,
        article_tables_only: true,
      },
    }),
  );
}

export function bulbapediaContainerHealth({
  checklist,
  workItem,
  selectedCardCount,
  operatorCardLimit,
}) {
  const expected = integerOrNull(workItem.source_expected_card_count);
  const numberingUnavailable =
    checklist.diagnostics.numbering_mode === 'unavailable';
  const baseNumbers = new Set(
    checklist.cards
      .filter(
        (card) =>
          Number.isSafeInteger(card.card_number_numerator)
          && expected !== null
          && card.card_number_numerator <= expected,
      )
      .map((card) => card.card_number_numerator),
  );
  const coordinateCounts = new Map();
  for (const card of checklist.cards.filter(
    (row) => row.card_number_raw !== null,
  )) {
    coordinateCounts.set(
      card.card_number_raw,
      (coordinateCounts.get(card.card_number_raw) ?? 0) + 1,
    );
  }
  const duplicateNumberCount = [...coordinateCounts.values()]
    .filter((count) => count > 1).length;
  let status = 'complete';
  const findings = [];

  if (numberingUnavailable) {
    status = expected === null
      ? 'source_expected_count_unavailable'
      : 'source_numbering_unavailable';
    findings.push('source_list_has_no_printed_numbers');
    if (expected === null) {
      findings.push('source_expected_card_count_unavailable');
    }
    if (checklist.diagnostics.selected_unnumbered_table_count > 1) {
      findings.push('multiple_unnumbered_japanese_card_lists_preserved');
    }
  } else if (baseNumbers.size < expected) {
    status = 'source_count_mismatch';
    findings.push('expected_base_number_coverage_incomplete');
  }
  if (duplicateNumberCount > 0) {
    findings.push('multiple_matching_japanese_number_lanes');
  }
  if (
    operatorCardLimit !== null
    && selectedCardCount < checklist.cards.length
  ) {
    status = 'operator_bounded_partial';
    findings.push('card_scope_limited_by_operator');
  }

  return {
    source_container_id: checklist.set.id,
    registry_key: workItem.registry_key,
    status,
    findings,
    source_expected_card_count: expected,
    parsed_card_row_count: checklist.cards.length,
    selected_card_count: selectedCardCount,
    covered_base_number_count: baseNumbers.size,
    duplicate_number_count: duplicateNumberCount,
    diagnostics: checklist.diagnostics,
  };
}
