import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const V5_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v5.json');
const TARGET_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_source_upgrade_v1_target.json',
);
const SERIES_1_OFFICIAL_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_series_1_official.json');
const SERIES_2_OFFICIAL_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_series_2_official.json');
const V6_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v6.json');
const V6_MD_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v6.md');
const V6_CANDIDATE_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v6_candidate.json');

const TARGET_SERIES = new Set([1, 2]);

const OFFICIAL_SOURCES = [
  {
    series: 1,
    local_json_path: SERIES_1_OFFICIAL_PATH,
    official_card_list_url:
      'https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_1_web_cardlist_en.pdf',
  },
  {
    series: 2,
    local_json_path: SERIES_2_OFFICIAL_PATH,
    official_card_list_url:
      'https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_2_web_cardlist_en.pdf',
  },
];

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
    .replace(/\(series\s+\d+\)/gi, '')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumberPlain(value) {
  const digits = String(value ?? '').match(/\d+/g);
  if (!digits || digits.length === 0) return null;
  return String(parseInt(digits[0], 10));
}

function stableSortRows(rows) {
  return [...rows].sort((a, b) => {
    const left = [
      a.effective_set_code ?? '',
      a.printed_number ?? '',
      a.base_card_name ?? a.candidate_name ?? '',
      a.source_external_id ?? '',
    ].join('::');
    const right = [
      b.effective_set_code ?? '',
      b.printed_number ?? '',
      b.base_card_name ?? b.candidate_name ?? '',
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

function buildCanonicalQueueKey(row) {
  return [
    row.effective_set_code ?? 'unknown',
    row.base_card_name ?? row.candidate_name ?? 'unknown',
    row.printed_number ?? 'unknown',
    'play_pokemon_stamp',
  ].join('::');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function maybeReadJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function removeFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function selectTargetRows(v5) {
  const rows = Array.isArray(v5.still_wait_rows) ? v5.still_wait_rows : [];
  return stableSortRows(
    rows.filter((row) => {
      const coverage = Array.isArray(row.confirmed_series_coverage)
        ? row.confirmed_series_coverage
        : [];
      return (
        row.final_decision === 'WAIT' &&
        row.unique_base_route === true &&
        row.final_evidence_tier === 'TIER_3' &&
        row.blocker_class_after_v5 === 'INSUFFICIENT_SOURCE_CORROBORATION' &&
        coverage.length === 1 &&
        TARGET_SERIES.has(coverage[0])
      );
    }),
  );
}

function normalizeOfficialEntry(entry, series) {
  const printedNumber =
    entry.printed_number ??
    entry.number ??
    (entry.number_plain != null ? String(entry.number_plain) : null);
  return {
    ...entry,
    series,
    normalized_name: normalizeName(entry.name ?? entry.card_name ?? entry.base_card_name ?? null),
    normalized_number_plain: normalizeNumberPlain(printedNumber),
  };
}

function buildOfficialIndex(entries) {
  const index = new Map();
  for (const entry of entries) {
    if (!entry.normalized_name || !entry.normalized_number_plain) continue;
    const key = `${entry.normalized_name}::${entry.normalized_number_plain}`;
    const existing = index.get(key) ?? [];
    existing.push(entry);
    index.set(key, existing);
  }
  return index;
}

async function loadOfficialSource(source) {
  const data = await maybeReadJson(source.local_json_path);
  if (!data) {
    return {
      ...source,
      status: 'missing_local_json',
      available: false,
      entries: [],
      index: new Map(),
      note: 'Local official checklist JSON is not present.',
    };
  }

  const rawEntries = Array.isArray(data.entries) ? data.entries : [];
  const entries = rawEntries
    .map((entry) => normalizeOfficialEntry(entry, source.series))
    .filter((entry) => entry.normalized_name && entry.normalized_number_plain);

  if (entries.length === 0) {
    return {
      ...source,
      status: 'local_json_present_but_unusable',
      available: false,
      entries: [],
      index: new Map(),
      note: 'Local official checklist JSON exists but does not contain usable entries.',
      raw_status: data.status ?? null,
    };
  }

  return {
    ...source,
    status: 'ready',
    available: true,
    entries,
    index: buildOfficialIndex(entries),
    note: 'Local official checklist JSON is available and usable.',
    raw_status: data.status ?? null,
    local_source_metadata: {
      source_name: data.source_name ?? null,
      source_url: data.source_url ?? source.official_card_list_url,
      evidence_tier: data.evidence_tier ?? 'TIER_1',
      imported_at: data.imported_at ?? null,
    },
  };
}

function findOfficialMatch(row, officialSource) {
  if (!officialSource.available) return null;

  const nameCandidates = [
    row.base_card_name,
    row.candidate_name,
    row.card_print_candidate_name,
  ]
    .map((value) => normalizeName(value))
    .filter(Boolean);

  const numberCandidates = [
    row.normalized_number_plain,
    row.printed_number,
    row.number_plain,
  ]
    .map((value) => normalizeNumberPlain(value))
    .filter(Boolean);

  for (const name of nameCandidates) {
    for (const numberPlain of numberCandidates) {
      const key = `${name}::${numberPlain}`;
      const matches = officialSource.index.get(key);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
  }

  return null;
}

function buildTargetArtifact(v5, targetRows) {
  return {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_EVIDENCE_SOURCE_UPGRADE_V1',
    source_artifacts: [
      relativeCheckpointPath(V5_PATH),
      relativeCheckpointPath(path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v5.json')),
    ],
    current_backlog: v5.remaining_backlog ?? v5.current_backlog ?? null,
    target_selection_rules: [
      'final_decision = WAIT',
      'confirmed_series_coverage = [1] or [2]',
      'final_evidence_tier = TIER_3',
      'unique_base_route = true',
      'blocker_class_after_v5 = INSUFFICIENT_SOURCE_CORROBORATION',
    ],
    selection_summary: {
      target_count: targetRows.length,
      series_pattern_counts: countBy(
        targetRows,
        (row) => JSON.stringify(row.confirmed_series_coverage ?? []),
      ),
      set_code_counts: countBy(targetRows, (row) => row.effective_set_code ?? 'unknown'),
    },
    rows: targetRows,
  };
}

function buildReadyCandidateRow(row, officialSource, officialMatch, index) {
  return {
    batch_index: index + 1,
    source: row.source,
    source_set_id: row.source_set_id,
    source_external_id: row.source_external_id,
    source_candidate_id: row.source_candidate_id ?? null,
    name: row.base_card_name ?? row.candidate_name,
    candidate_name: row.candidate_name,
    printed_number: row.printed_number,
    number_plain: row.normalized_number_plain,
    normalized_number_plain: row.normalized_number_plain,
    proposed_variant_key: 'play_pokemon_stamp',
    variant_key: 'play_pokemon_stamp',
    stamp_label: row.stamp_label ?? 'Play! Pokémon Stamp',
    governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
    governing_rules: [
      'STAMPED_IDENTITY_RULE_V1',
      'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      'EVIDENCE_TIER_V1',
    ],
    source_family: row.source_family,
    evidence_class: 'CONFIRMED_IDENTITY',
    evidence_tier: 'TIER_1',
    supported_series_list: row.confirmed_series_coverage,
    evidence_sources_v6: [
      ...(row.evidence_sources ?? []),
      ...(row.evidence_sources_used_for_v5 ?? []),
      {
        series: officialSource.series,
        source_name:
          officialSource.local_source_metadata?.source_name ??
          `Pokemon.com Prize Pack Series ${officialSource.series} official checklist`,
        source_type: 'official_checklist_json_import',
        evidence_tier: 'TIER_1',
        source_url:
          officialSource.local_source_metadata?.source_url ?? officialSource.official_card_list_url,
        local_json_path: relativeCheckpointPath(officialSource.local_json_path),
        matched_entry: {
          name: officialMatch.name ?? null,
          printed_number:
            officialMatch.printed_number ??
            officialMatch.number ??
            officialMatch.number_plain ??
            null,
          set_code: officialMatch.set_code ?? officialMatch.set_token ?? null,
        },
      },
    ],
    effective_identity_space: row.effective_set_code,
    effective_set_code: row.effective_set_code,
    effective_routed_set_code: row.effective_set_code,
    effective_set_name: row.effective_set_name ?? null,
    effective_routed_set_name: row.effective_set_name ?? null,
    canonical_queue_key: buildCanonicalQueueKey(row),
    base_gv_id: row.base_gv_id ?? null,
    base_route: row.base_route ?? null,
    underlying_base_proof: {
      base_gv_id: row.base_gv_id ?? null,
      base_route: row.base_route ?? null,
      unique_base_route: row.unique_base_route ?? null,
      base_card_name: row.base_card_name ?? null,
    },
    source_upgrade_v1_status: 'tier_upgraded_to_tier_1',
    source_upgrade_v1_reason: `Matched the locally imported official Prize Pack Series ${officialSource.series} checklist entry for the same base name and printed number.`,
  };
}

function buildMarkdown(output) {
  const lines = [
    '# PRIZE_PACK_EVIDENCE_SOURCE_UPGRADE_V1',
    '',
    `Generated: ${output.generated_at}`,
    '',
    '## Scope',
    '',
    '- Target only `WAIT_FOR_MORE_EVIDENCE` Prize Pack rows with a unique base route, a single confirmed series hit (`[1]` or `[2]`), and best evidence tier `TIER_3`.',
    '- No canon writes, promotion, mapping, or image changes were attempted.',
    '',
    '## Current Target',
    '',
    `- target_rows = ${output.target_summary.target_count}`,
    `- current_wait_pool = ${output.current_backlog.wait_for_more_evidence}`,
    `- do_not_canon_total = ${output.current_backlog.do_not_canon_total_after_v5}`,
    `- already_promoted_total = ${output.current_backlog.already_promoted_total}`,
    '',
    '## Official Source Probe',
    '',
  ];

  for (const source of output.official_sources) {
    lines.push(`### Series ${source.series}`);
    lines.push('');
    lines.push(`- official_card_list_url = ${source.official_card_list_url}`);
    lines.push(`- local_json_path = \`${source.local_json_path}\``);
    lines.push(`- acquisition_status = ${source.status}`);
    lines.push(`- note = ${source.note}`);
    lines.push('');
  }

  lines.push('## Result');
  lines.push('');
  lines.push(`- tier_upgraded = ${output.summary.tier_upgraded}`);
  lines.push(`- ready_for_warehouse = ${output.summary.ready_for_warehouse}`);
  lines.push(`- still_wait = ${output.summary.still_wait}`);
  lines.push('');

  if (output.summary.ready_for_warehouse === 0) {
    lines.push('No `prize_pack_ready_batch_v6_candidate.json` was created. The pass stopped at official-source acquisition because no usable local Tier 1 checklist JSON was available.');
    lines.push('');
  }

  lines.push('## Blocker');
  lines.push('');
  if (output.blocker) {
    lines.push(`- blocker_class = ${output.blocker.class}`);
    lines.push(`- blocker_detail = ${output.blocker.detail}`);
    lines.push(`- smallest_bounded_followup = ${output.blocker.smallest_bounded_followup}`);
  } else {
    lines.push('- blocker_class = NONE');
    lines.push('- blocker_detail = no target rows remain blocked by the imported official checklist data');
    lines.push('- smallest_bounded_followup = proceed with the generated ready batch candidate, then acquire the remaining missing official checklist JSON separately');
  }
  lines.push('');

  lines.push('## Target Rows');
  lines.push('');
  for (const row of output.still_wait_rows) {
    lines.push(
      `- ${row.candidate_name} | ${row.printed_number} | ${row.effective_set_code} | series ${JSON.stringify(row.confirmed_series_coverage)} | ${row.source_upgrade_v1_status}`,
    );
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function main() {
  const v5 = await readJson(V5_PATH);
  const targetRows = selectTargetRows(v5);
  if (targetRows.length === 0) {
    throw new Error(
      'No target rows matched the V1 source-upgrade selection criteria. The current wait pool may have drifted.',
    );
  }

  const targetArtifact = buildTargetArtifact(v5, targetRows);
  await writeJson(TARGET_PATH, targetArtifact);

  const officialSources = [];
  for (const source of OFFICIAL_SOURCES) {
    officialSources.push(await loadOfficialSource(source));
  }

  const readyRows = [];
  const stillWaitRows = [];

  for (const row of targetRows) {
    const targetSeries = row.confirmed_series_coverage?.[0] ?? null;
    const officialSource = officialSources.find((source) => source.series === targetSeries);
    const officialMatch = officialSource ? findOfficialMatch(row, officialSource) : null;

    if (officialSource?.available && officialMatch) {
      readyRows.push(
        buildReadyCandidateRow(row, officialSource, officialMatch, readyRows.length),
      );
      continue;
    }

    stillWaitRows.push({
      ...row,
      source_upgrade_v1_status: officialSource?.available
        ? 'official_checklist_missing_match'
        : 'official_checklist_not_available_locally',
      source_upgrade_v1_reason: officialSource?.available
        ? `No matching entry was found in the locally imported official Prize Pack Series ${targetSeries} checklist for the same base name and printed number.`
        : `The official Prize Pack Series ${targetSeries} checklist is still not available as a local JSON import, and direct Pokemon.com fetches remain bot-gated.`,
      blocker_class_after_v6: officialSource?.available
        ? 'OFFICIAL_CHECKLIST_MATCH_NOT_FOUND'
        : 'OFFICIAL_CHECKLIST_NOT_IMPORTED',
    });
  }

  if (readyRows.length > 0) {
    await writeJson(V6_CANDIDATE_PATH, {
      generated_at: new Date().toISOString(),
      workflow: 'PRIZE_PACK_EVIDENCE_SOURCE_UPGRADE_V1',
      status: 'READY_BATCH_CANDIDATE',
      source_artifacts: [relativeCheckpointPath(V6_PATH)],
      selection_summary: {
        row_count: readyRows.length,
        governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
        variant_key: 'play_pokemon_stamp',
        target_origin: 'PRIZE_PACK_EVIDENCE_SOURCE_UPGRADE_V1',
      },
      rows: readyRows,
      recommended_next_execution_step: 'PRIZE_PACK_READY_BATCH_V6',
    });
  } else {
    await removeFileIfExists(V6_CANDIDATE_PATH);
  }

  const output = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_EVIDENCE_SOURCE_UPGRADE_V1',
    status: readyRows.length > 0 ? 'PARTIAL_SUCCESS' : 'BLOCKED_OFFICIAL_SOURCE_ACQUISITION',
    source_artifacts: [
      relativeCheckpointPath(V5_PATH),
      relativeCheckpointPath(TARGET_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence:
        v5.remaining_backlog?.wait_for_more_evidence ?? v5.current_backlog?.wait_for_more_evidence,
      do_not_canon_total_after_v5:
        v5.remaining_backlog?.do_not_canon_total_after_v5 ??
        v5.current_backlog?.do_not_canon_total,
      already_promoted_total:
        v5.remaining_backlog?.already_promoted_total ?? v5.current_backlog?.already_promoted_total,
    },
    target_summary: targetArtifact.selection_summary,
    official_sources: officialSources.map((source) => ({
      series: source.series,
      official_card_list_url: source.official_card_list_url,
      local_json_path: relativeCheckpointPath(source.local_json_path),
      status: source.status,
      available: source.available,
      note: source.note,
    })),
    summary: {
      target_rows: targetRows.length,
      tier_upgraded: readyRows.length,
      ready_for_warehouse: readyRows.length,
      still_wait: stillWaitRows.length,
    },
    ready_rows: readyRows,
    still_wait_rows: stillWaitRows,
    blocker:
      readyRows.length > 0
        ? null
        : {
            class: 'OFFICIAL_CHECKLIST_PDF_BOT_GATED',
            detail:
              'Pokemon.com Series 1 and Series 2 checklist URLs remain behind Imperva hCaptcha in both raw HTTP fetches and headless Edge browser probes, and no locally imported official JSON was present to convert the remaining Tier 3 rows to Tier 1.',
            smallest_bounded_followup:
              'Manually acquire the official Series 1 and Series 2 checklist PDFs in a real browser, convert them to local JSON at docs/checkpoints/warehouse/prize_pack_series_1_official.json and docs/checkpoints/warehouse/prize_pack_series_2_official.json, then rerun backend/warehouse/prize_pack_evidence_source_upgrade_v1.mjs.',
          },
    recommended_next_execution_step:
      readyRows.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V6'
        : 'LOCAL_OFFICIAL_CHECKLIST_IMPORT_FOR_PRIZE_PACK_V1',
  };

  await writeJson(V6_PATH, output);
  await fs.writeFile(V6_MD_PATH, buildMarkdown(output), 'utf8');
}

await main();
