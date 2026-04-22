import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const CURRENT_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v17_nonblocked_input.json');
const SERIES_1_OFFICIAL_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_series_1_official.json');
const SERIES_2_OFFICIAL_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_series_2_official.json');
const OUTPUT_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_series_2_source_upgrade_fallback_v1.json',
);
const OUTPUT_MD_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_series_2_source_upgrade_fallback_v1.md',
);
const READY_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v7_source_upgrade_series_2_candidate.json',
);

const OFFICIAL_SERIES_2_URL =
  'https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_2_web_cardlist_en.pdf';

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeText(value) {
  return decodeHtml(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeName(value) {
  return normalizeText(value)
    .replace(/\(error\)/gi, '')
    .replace(/\(duplicate\)/gi, '')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumberPlain(value) {
  const digits = String(value ?? '').match(/\d+/g);
  if (!digits || digits.length === 0) return null;
  return String(parseInt(digits[0], 10));
}

function extractGvSetToken(row) {
  const value = row.effective_base_owner_gv_id ?? row.base_gv_id ?? row.base_route ?? '';
  const match = String(value).match(/^GV-PK-([A-Z0-9.]+)-/i);
  return match ? match[1].toUpperCase() : null;
}

function cleanDisplayName(row) {
  return String(row.candidate_name ?? row.name ?? row.base_card_name ?? '').trim();
}

function stableSortRows(rows) {
  return [...rows].sort((a, b) => {
    const left = [
      a.set_code ?? '',
      a.printed_number ?? '',
      cleanDisplayName(a),
      a.source_external_id ?? '',
    ].join('::');
    const right = [
      b.set_code ?? '',
      b.printed_number ?? '',
      cleanDisplayName(b),
      b.source_external_id ?? '',
    ].join('::');
    return left.localeCompare(right);
  });
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function relativeCheckpointPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildOfficialIndex(source, series) {
  const index = new Map();
  for (const entry of source.entries ?? []) {
    const normalizedName = normalizeName(entry.name ?? entry.card_name ?? entry.base_card_name);
    const normalizedNumberPlain = normalizeNumberPlain(
      entry.printed_number ?? entry.number ?? entry.number_plain,
    );
    if (!normalizedName || !normalizedNumberPlain) continue;
    const normalized = {
      ...entry,
      series,
      normalized_name: normalizedName,
      normalized_number_plain: normalizedNumberPlain,
      normalized_set_token: entry.set_code ? String(entry.set_code).toUpperCase() : null,
    };
    const key = `${normalizedName}::${normalizedNumberPlain}`;
    const existing = index.get(key) ?? [];
    existing.push(normalized);
    index.set(key, existing);
  }
  return index;
}

function findOfficialMatches(row, index, requireSetToken) {
  const key = `${normalizeName(cleanDisplayName(row))}::${normalizeNumberPlain(row.printed_number)}`;
  const matches = index.get(key) ?? [];
  if (!requireSetToken) return matches;
  const gvSetToken = extractGvSetToken(row);
  return matches.filter((match) => !match.normalized_set_token || match.normalized_set_token === gvSetToken);
}

function buildCanonicalQueueKey(row) {
  return [
    row.set_code ?? 'unknown',
    cleanDisplayName(row),
    row.printed_number ?? 'unknown',
    'play_pokemon_stamp',
  ].join('::');
}

function buildEvidenceSource(series2, officialMatch) {
  return {
    series: 2,
    source_name: series2.source_name ?? 'Pokemon.com Prize Pack Series Two official checklist',
    source_type: 'official_checklist_json_import_via_archive_official_url_capture',
    evidence_tier: 'TIER_1',
    source_url: series2.source_url ?? OFFICIAL_SERIES_2_URL,
    fallback_source_url: series2.source_acquisition?.fallback_source_url ?? null,
    archive_capture_timestamp: series2.source_acquisition?.archive_capture_timestamp ?? null,
    local_json_path: relativeCheckpointPath(SERIES_2_OFFICIAL_PATH),
    raw_pdf_path: series2.source_acquisition?.raw_pdf_path ?? 'temp/prize_pack_series_2_official_raw.pdf',
    raw_pdf_sha256: series2.source_acquisition?.raw_pdf_sha256 ?? null,
    matched_entry: {
      name: officialMatch.name ?? null,
      printed_number: officialMatch.printed_number ?? null,
      set_code: officialMatch.set_code ?? null,
    },
  };
}

function buildReadyCandidateRow(row, series2, officialMatch, index) {
  const baseName = cleanDisplayName(row);
  const numberPlain = normalizeNumberPlain(row.printed_number);
  const evidenceSource = buildEvidenceSource(series2, officialMatch);
  const baseGvId = row.effective_base_owner_gv_id ?? row.base_gv_id ?? null;
  return {
    batch_index: index + 1,
    source: row.source ?? 'justtcg',
    source_set_id: row.source_set_id ?? 'prize-pack-series-cards-pokemon',
    source_external_id: row.source_external_id,
    source_candidate_id: row.source_candidate_id ?? null,
    name: baseName,
    candidate_name: baseName,
    printed_number: row.printed_number,
    number_plain: numberPlain,
    normalized_number_plain: numberPlain,
    proposed_variant_key: 'play_pokemon_stamp',
    variant_key: 'play_pokemon_stamp',
    stamp_label: row.stamp_label ?? 'Play! Pokémon Stamp',
    governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
    governing_rules: [
      'STAMPED_IDENTITY_RULE_V1',
      'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      'EVIDENCE_TIER_V1',
    ],
    source_family: row.source_family ?? 'prize-pack-series-cards-pokemon',
    evidence_class: 'CONFIRMED_IDENTITY',
    evidence_tier: 'TIER_1',
    supported_series_list: [2],
    confirmed_series_coverage: [2],
    evidence_sources_v7_source_upgrade_series_2: [evidenceSource],
    effective_identity_space: row.set_code ?? row.effective_set_code ?? null,
    effective_set_code: row.set_code ?? row.effective_set_code ?? null,
    effective_routed_set_code: row.set_code ?? row.effective_set_code ?? null,
    effective_set_name: row.effective_set_name ?? null,
    effective_routed_set_name: row.effective_set_name ?? null,
    canonical_queue_key: buildCanonicalQueueKey(row),
    base_gv_id: baseGvId,
    base_route: baseGvId,
    underlying_base_proof: {
      base_gv_id: baseGvId,
      base_route: baseGvId,
      unique_base_route: Boolean(baseGvId),
      base_card_name: baseName,
    },
    reference_hints_payload: {
      provenance: 'official_series_2_fallback_import',
      source_family: row.source_family ?? 'prize-pack-series-cards-pokemon',
      evidence_class: 'CONFIRMED_IDENTITY',
      evidence_tier: 'TIER_1',
      confirmed_series_coverage: [2],
      underlying_base_proof: {
        base_gv_id: baseGvId,
        base_route: baseGvId,
      },
      effective_routed_set_code: row.set_code ?? row.effective_set_code ?? null,
      governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      source_upgrade_provenance: evidenceSource,
    },
    final_decision: 'READY_FOR_WAREHOUSE',
    decision_code: 'official_series_2_single_series_match_via_archive_official_url_capture',
    source_upgrade_series_2_status: 'tier_upgraded_to_tier_1',
    final_reason:
      'Matched the locally imported official Prize Pack Series 2 checklist for the same base name, printed number, and official set token; no Series 1 official match was present, so the generic Play! Pokemon stamp resolves to one deterministic canonical stamped identity.',
  };
}

function buildMarkdown(output) {
  const lines = [
    '# Prize Pack Series 2 Source Upgrade Fallback V1',
    '',
    `Generated: ${output.generated_at}`,
    '',
    '## Source',
    '',
    `- official_url: ${output.source_validation.official_url}`,
    `- fallback_source_url: ${output.source_validation.fallback_source_url}`,
    `- source_type: ${output.source_validation.source_type}`,
    `- raw_pdf_path: ${output.source_validation.raw_pdf_path}`,
    `- raw_pdf_sha256: ${output.source_validation.raw_pdf_sha256}`,
    `- series_2_entry_count: ${output.series_2_entry_count}`,
    '',
    '## Result',
    '',
    `- acquisition_blocked_rows_in_input = ${output.input_summary.acquisition_blocked_rows}`,
    `- tier_upgraded_count = ${output.summary.tier_upgraded_count}`,
    `- new_ready_count = ${output.summary.new_ready_count}`,
    `- new_do_not_canon_count = ${output.summary.new_do_not_canon_count}`,
    `- still_wait_count = ${output.summary.still_wait_count}`,
    '',
    '## Series 2 READY Rows',
    '',
  ];

  for (const row of output.ready_rows) {
    lines.push(
      `- ${row.name} | ${row.printed_number} | ${row.effective_set_code} | ${row.source_external_id}`,
    );
  }

  if (output.do_not_canon_rows.length > 0) {
    lines.push('', '## DO_NOT_CANON Rows', '');
    for (const row of output.do_not_canon_rows) {
      lines.push(
        `- ${row.candidate_name} | ${row.printed_number} | ${row.set_code} | ${row.reason}`,
      );
    }
  }

  lines.push('', '## Notes', '');
  lines.push('- Community-maintained lists were used only for spot-check context, not as Tier 1 input.');
  lines.push('- No canon, promotion, mapping, image, or rule writes were performed.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const [input, series1, series2] = await Promise.all([
    readJson(CURRENT_INPUT_PATH),
    readJson(SERIES_1_OFFICIAL_PATH),
    readJson(SERIES_2_OFFICIAL_PATH),
  ]);

  const series1Index = buildOfficialIndex(series1, 1);
  const series2Index = buildOfficialIndex(series2, 2);
  const acquisitionBlockedRows = stableSortRows(
    (input.rows ?? []).filter((row) => row.blocked_by_official_acquisition === true),
  );

  const readyRows = [];
  const doNotCanonRows = [];
  const stillWaitRows = [];
  const auditedRows = [];

  for (const row of acquisitionBlockedRows) {
    const series1Matches = findOfficialMatches(row, series1Index, false);
    const series2Matches = findOfficialMatches(row, series2Index, true);
    const audit = {
      candidate_name: cleanDisplayName(row),
      printed_number: row.printed_number,
      set_code: row.set_code ?? null,
      base_gv_id: row.effective_base_owner_gv_id ?? row.base_gv_id ?? null,
      source_external_id: row.source_external_id,
      series1_official_match_count: series1Matches.length,
      series2_official_match_count: series2Matches.length,
      matched_series: [
        ...(series1Matches.length > 0 ? [1] : []),
        ...(series2Matches.length > 0 ? [2] : []),
      ],
    };

    if (series2Matches.length > 0 && series1Matches.length === 0) {
      const candidate = buildReadyCandidateRow(row, series2, series2Matches[0], readyRows.length);
      readyRows.push(candidate);
      auditedRows.push({
        ...audit,
        final_decision: 'READY_FOR_WAREHOUSE',
        reason: 'Series 2 official checklist has an exact name + number + set-token match and Series 1 does not.',
      });
      continue;
    }

    if (series2Matches.length > 0 && series1Matches.length > 0) {
      doNotCanonRows.push({
        ...audit,
        final_decision: 'DO_NOT_CANON',
        reason:
          'The same generic Play! Pokemon stamped identity is present in both official Series 1 and Series 2 checklists.',
      });
      auditedRows.push(doNotCanonRows.at(-1));
      continue;
    }

    stillWaitRows.push({
      ...audit,
      final_decision: 'WAIT',
      reason:
        series1Matches.length > 0
          ? 'Matched only Series 1 official checklist; not counted in the Series 2 fallback source-upgrade subset.'
          : 'No Series 2 official checklist match was found.',
    });
    auditedRows.push(stillWaitRows.at(-1));
  }

  if (readyRows.length > 0) {
    await writeJson(READY_CANDIDATE_PATH, {
      generated_at: new Date().toISOString(),
      workflow: 'PRIZE_PACK_SERIES_2_SOURCE_UPGRADE_FALLBACK_V1',
      status: 'READY_BATCH_CANDIDATE',
      source_artifacts: [relativeCheckpointPath(OUTPUT_PATH), relativeCheckpointPath(SERIES_2_OFFICIAL_PATH)],
      selection_summary: {
        row_count: readyRows.length,
        governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
        variant_key: 'play_pokemon_stamp',
        target_origin: 'SERIES_2_OFFICIAL_SOURCE_FALLBACK_ACQUISITION_V1',
        confirmed_series_coverage: [2],
      },
      rows: readyRows,
      recommended_next_execution_step: 'PRIZE_PACK_READY_BATCH_V7_SOURCE_UPGRADE_SERIES_2',
    });
  }

  const output = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_SERIES_2_SOURCE_UPGRADE_FALLBACK_V1',
    status: readyRows.length > 0 ? 'READY_BATCH_CANDIDATE_CREATED' : 'NO_SERIES_2_READY_ROWS',
    source_artifacts: [
      relativeCheckpointPath(CURRENT_INPUT_PATH),
      relativeCheckpointPath(SERIES_1_OFFICIAL_PATH),
      relativeCheckpointPath(SERIES_2_OFFICIAL_PATH),
    ],
    source_validation: {
      source_type: 'archive',
      official_url: series2.source_url ?? OFFICIAL_SERIES_2_URL,
      fallback_source_url: series2.source_acquisition?.fallback_source_url ?? null,
      archive_capture_timestamp: series2.source_acquisition?.archive_capture_timestamp ?? null,
      validating_second_capture_url: series2.source_acquisition?.validating_second_capture_url ?? null,
      byte_identical_second_capture: series2.source_acquisition?.byte_identical_second_capture ?? null,
      raw_pdf_path: series2.source_acquisition?.raw_pdf_path ?? 'temp/prize_pack_series_2_official_raw.pdf',
      raw_pdf_sha256: series2.source_acquisition?.raw_pdf_sha256 ?? null,
      raw_pdf_length_bytes: series2.source_acquisition?.raw_pdf_length_bytes ?? null,
      raw_pdf_header: series2.source_acquisition?.raw_pdf_header ?? null,
      local_json_path: relativeCheckpointPath(SERIES_2_OFFICIAL_PATH),
      json_status: series2.status ?? null,
      evidence_tier: series2.evidence_tier ?? null,
    },
    input_summary: {
      source_rows: input.rows?.length ?? 0,
      acquisition_blocked_rows: acquisitionBlockedRows.length,
      current_backlog: input.current_backlog ?? null,
    },
    series_2_entry_count: series2.entries?.length ?? 0,
    audit_summary: {
      matched_series_pattern_counts: countBy(auditedRows, (row) =>
        JSON.stringify(row.matched_series ?? []),
      ),
    },
    summary: {
      rows_investigated: acquisitionBlockedRows.length,
      tier_upgraded_count: readyRows.length + doNotCanonRows.length,
      new_ready_count: readyRows.length,
      new_do_not_canon_count: doNotCanonRows.length,
      still_wait_count: stillWaitRows.length,
    },
    ready_rows: readyRows,
    do_not_canon_rows: doNotCanonRows,
    still_wait_rows: stillWaitRows,
    audited_rows: auditedRows,
    ready_batch_candidate_created: readyRows.length > 0,
    ready_batch_candidate_path:
      readyRows.length > 0 ? relativeCheckpointPath(READY_CANDIDATE_PATH) : null,
    recommended_next_execution_step:
      readyRows.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V7_SOURCE_UPGRADE_SERIES_2'
        : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V18_NONBLOCKED',
  };

  await writeJson(OUTPUT_PATH, output);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(output), 'utf8');
}

await main();
