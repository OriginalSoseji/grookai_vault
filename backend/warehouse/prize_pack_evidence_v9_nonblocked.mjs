import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const V2_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v2.json');
const CORROBORATION_V1_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_corroboration_v1.json',
);
const V3_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v3.json');
const V4_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v4.json');
const V5_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v5.json');
const V6_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v6_nonblocked.json');
const READY_BATCH_V6_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v6_nonblocked.json');
const READY_BATCH_V6_RESIDUE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v6_residue_5.json',
);
const V7_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v7_nonblocked.json');
const READY_BATCH_V7_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v7_nonblocked.json');
const V8_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v8_nonblocked_input.json');
const V8_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v8_nonblocked.json');
const READY_BATCH_V8_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v8_nonblocked.json');

const INPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v9_nonblocked_input.json',
);
const TARGET_SLICE_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v9_nonblocked_target_slice.json',
);
const OUTPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v9_nonblocked.json',
);
const OUTPUT_MD_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v9_nonblocked.md',
);
const READY_BATCH_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v9_nonblocked_candidate.json',
);

const TIER_RANK = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
};

const ACQUISITION_BLOCK_REASON =
  'This row remains outside the nonblocked lane because the next truthful upgrade step depends on official Series 1/2 checklist acquisition.';

const TARGET_SLICE = {
  id: 'ACCESSIBLE_SERIES_1_2_DUPLICATE_SWORDBASE_TRAINER_ITEMS',
  label: 'Accessible Series 1-2 Sword & Shield Base Duplicate Trainer Items',
  series: [1, 2],
  set_codes: ['swsh1'],
  shared_question:
    'Across currently accessible Prize Pack Series 1 and Series 2 sources, do these Sword & Shield base trainer-item rows appear in both corroborated series lists, proving distribution-only duplicates without any manual official acquisition?',
  source_family: 'prize-pack-series-cards-pokemon',
};

const SERIES_1_SOURCE = {
  series: 1,
  source_name: 'Bulbapedia Prize Pack Series One',
  source_type: 'bulbapedia_card_list',
  evidence_tier: 'TIER_3',
  source_url:
    'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG)',
  raw_url:
    'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG)&action=raw',
};

const SERIES_2_SOURCE = {
  series: 2,
  source_name: 'Bulbapedia Prize Pack Series Two',
  source_type: 'bulbapedia_card_list',
  evidence_tier: 'TIER_3',
  source_url:
    'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Two_(TCG)',
  raw_url:
    'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Two_(TCG)&action=raw',
};

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

function cleanDisplayName(value) {
  return String(value ?? '')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\s*$/g, '')
    .trim();
}

function stableSortRows(rows) {
  return [...rows].sort((a, b) => {
    const left = [
      a.effective_set_code ?? '',
      a.printed_number ?? '',
      cleanDisplayName(a.base_card_name ?? a.candidate_name ?? ''),
      a.source_external_id ?? '',
    ].join('::');
    const right = [
      b.effective_set_code ?? '',
      b.printed_number ?? '',
      cleanDisplayName(b.base_card_name ?? b.candidate_name ?? ''),
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

function strongestTierRankFromSources(sources) {
  let best = TIER_RANK.TIER_4;
  for (const source of sources ?? []) {
    const rank = TIER_RANK[source.evidence_tier] ?? TIER_RANK.TIER_4;
    best = Math.min(best, rank);
  }
  return best;
}

function rankToTier(rank) {
  return Object.entries(TIER_RANK).find(([, value]) => value === rank)?.[0] ?? 'TIER_4';
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

async function removeFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function buildCurrentWaitRows({ v8Input, v8 }) {
  const readyIds = new Set((v8.ready_rows || []).map((row) => row.source_external_id));
  const doNotIds = new Set((v8.do_not_canon_rows || []).map((row) => row.source_external_id));
  const blockedById = new Map(
    (v8.blocked_official_acquisition_rows || []).map((row) => [row.source_external_id, row]),
  );

  return stableSortRows(
    (v8Input.rows || [])
      .filter((row) => !readyIds.has(row.source_external_id) && !doNotIds.has(row.source_external_id))
      .map((row) => {
        const blockedRow = blockedById.get(row.source_external_id);
        return {
          ...row,
          candidate_name: blockedRow?.candidate_name ?? row.candidate_name,
          printed_number: blockedRow?.printed_number ?? row.printed_number,
          normalized_number_plain:
            blockedRow?.normalized_number_plain ??
            row.normalized_number_plain ??
            normalizeNumberPlain(row.printed_number),
          base_gv_id: blockedRow?.base_gv_id ?? row.base_gv_id ?? null,
          base_route: blockedRow?.base_route ?? row.base_route ?? null,
          base_card_name: blockedRow?.base_card_name ?? row.base_card_name ?? row.candidate_name,
          current_blocker_class:
            blockedRow?.current_blocker_class ??
            row.current_blocker_class ??
            'NO_SERIES_CONFIRMATION',
          evidence_tier:
            blockedRow?.final_evidence_tier ?? blockedRow?.evidence_tier ?? row.evidence_tier ?? 'TIER_4',
          known_series_appearances:
            blockedRow?.confirmed_series_coverage ??
            row.known_series_appearances ??
            row.confirmed_series_coverage ??
            [],
          missing_series_checked:
            blockedRow?.missing_series_checked ??
            row.missing_series_checked ??
            [],
          previous_evidence_pass_history: blockedRow
            ? blockedRow.previous_evidence_pass_history ?? row.previous_evidence_pass_history ?? []
            : row.previous_evidence_pass_history ?? [],
          blocked_by_official_acquisition: blockedById.has(row.source_external_id),
          blocked_by_official_acquisition_reason: blockedById.has(row.source_external_id)
            ? blockedRow?.blocked_by_official_acquisition_reason ?? ACQUISITION_BLOCK_REASON
            : null,
        };
      }),
  );
}

async function fetchSeriesPage(source) {
  const response = await fetch(source.raw_url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV9Nonblocked/1.0)',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Series ${source.series} source: ${response.status}`);
  }

  const text = await response.text();
  return {
    ...source,
    raw_lines: text
      .split('\n')
      .map((line) => normalizeText(line))
      .filter(Boolean),
  };
}

function lineMatchesSeriesRow(line, row) {
  const requiredName = normalizeName(row.base_card_name ?? row.candidate_name);
  const requiredNumber = normalizeText(row.printed_number);
  const requiredSetName = normalizeText(row.effective_set_name);
  return (
    line.includes(requiredName) &&
    line.includes(requiredNumber) &&
    line.includes(requiredSetName)
  );
}

function matchRowAgainstAccessibleSources(row, seriesPages) {
  const matchedSeries = [];
  const matchingEvidence = [];

  for (const page of seriesPages) {
    const matchingLine = page.raw_lines.find((line) => lineMatchesSeriesRow(line, row));
    if (!matchingLine) continue;

    matchedSeries.push(page.series);
    matchingEvidence.push({
      series: page.series,
      source_name: page.source_name,
      source_type: page.source_type,
      evidence_tier: page.evidence_tier,
      source_url: page.source_url,
      raw_url: page.raw_url,
      matching_line: matchingLine,
    });
  }

  return {
    matched_series: matchedSeries.sort((a, b) => a - b),
    matching_evidence: matchingEvidence,
  };
}

function chooseTargetSlice(waitRows, seriesPages) {
  const eligibleRows = waitRows.filter(
    (row) =>
      !row.blocked_by_official_acquisition &&
      row.current_blocker_class === 'NO_SERIES_CONFIRMATION' &&
      row.unique_base_route &&
      row.base_gv_id &&
      TARGET_SLICE.set_codes.includes(row.effective_set_code) &&
      row.source_family === TARGET_SLICE.source_family,
  );

  const matchedRows = stableSortRows(
    eligibleRows
      .map((row) => {
        const match = matchRowAgainstAccessibleSources(row, seriesPages);
        return {
          ...row,
          _matched_series_for_selection: match.matched_series,
          _matching_evidence_for_selection: match.matching_evidence,
        };
      })
      .filter((row) => row._matched_series_for_selection.join(',') === '1,2'),
  );

  if (matchedRows.length === 0) {
    throw new Error('No coherent nonblocked target slice could be formed for V9.');
  }

  return {
    ...TARGET_SLICE,
    row_count: matchedRows.length,
    set_code_counts: countBy(matchedRows, (row) => row.effective_set_code ?? 'unknown'),
    rows: matchedRows,
  };
}

function buildFinalDecision(row, matchedSeries) {
  if (!row.unique_base_route || !row.base_gv_id) {
    return {
      final_evidence_class: 'STILL_UNPROVEN',
      final_decision: 'WAIT',
      decision_code: 'base_route_ambiguous_after_v9_nonblocked',
      final_reason:
        'The row still lacks one deterministic underlying base route, so accessible series corroboration cannot advance it yet.',
      blocked_by_official_acquisition: false,
      blocked_by_official_acquisition_reason: null,
    };
  }

  if (matchedSeries.length > 1) {
    return {
      final_evidence_class: 'DUPLICATE_REPRINT',
      final_decision: 'DO_NOT_CANON',
      decision_code: 'multi_series_duplicate_confirmed_by_v9_nonblocked_series_1_2',
      final_reason:
        'Accessible Series 1-2 evidence proves this row appears in more than one Prize Pack series with no printed distinction, so the generic Play! Pokémon stamp is distribution-only.',
      blocked_by_official_acquisition: false,
      blocked_by_official_acquisition_reason: null,
    };
  }

  if (matchedSeries.length === 1 && (matchedSeries[0] === 1 || matchedSeries[0] === 2)) {
    return {
      final_evidence_class: 'STILL_UNPROVEN',
      final_decision: 'WAIT',
      decision_code: 'single_series_1_or_2_match_requires_official_upgrade_after_v9_nonblocked',
      final_reason:
        'Accessible evidence places the card in Series 1 or Series 2 only, but the truthful next step still depends on official Series 1/2 checklist acquisition before canonization.',
      blocked_by_official_acquisition: true,
      blocked_by_official_acquisition_reason: ACQUISITION_BLOCK_REASON,
    };
  }

  return {
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_accessible_series_1_2_duplicate_match_after_v9_nonblocked',
    final_reason:
      'Accessible Series 1-2 sources do not yet place this row in more than one corroborated Prize Pack series, so the row remains outside the nonblocked duplicate lane.',
    blocked_by_official_acquisition: false,
    blocked_by_official_acquisition_reason: null,
  };
}

function buildTargetSliceRows(rows, seriesPages) {
  return stableSortRows(rows).map((row) => {
    const selectionEvidence = row._matching_evidence_for_selection ?? [];
    const matchedSeries =
      row._matched_series_for_selection ?? matchRowAgainstAccessibleSources(row, seriesPages).matched_series;
    const final = buildFinalDecision(row, matchedSeries);
    const bestTierRank = Math.min(
      strongestTierRankFromSources(row.evidence_sources),
      strongestTierRankFromSources(selectionEvidence),
    );

    const { _matched_series_for_selection, _matching_evidence_for_selection, ...cleanRow } = row;
    void _matched_series_for_selection;
    void _matching_evidence_for_selection;

    return {
      ...cleanRow,
      accessible_series_checked: TARGET_SLICE.series,
      missing_series_checked: TARGET_SLICE.series,
      evidence_sources_used_for_v9_nonblocked: selectionEvidence,
      confirmed_series_coverage: matchedSeries,
      matched_series_pattern: matchedSeries.length > 0 ? `[${matchedSeries.join(',')}]` : '[]',
      final_evidence_tier: rankToTier(bestTierRank),
      previous_evidence_pass_history: [
        ...(cleanRow.previous_evidence_pass_history ?? []),
        'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V9_NONBLOCKED',
      ],
      ...final,
    };
  });
}

function buildMarkdown(report) {
  const lines = [
    '# PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V9_NONBLOCKED',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Current Prize Pack State',
    '',
    `- wait_for_more_evidence = ${report.current_backlog.wait_for_more_evidence}`,
    `- do_not_canon_total = ${report.current_backlog.do_not_canon_total}`,
    `- already_promoted_total = ${report.current_backlog.already_promoted_total}`,
    `- blocked_by_official_acquisition = ${report.current_backlog.blocked_by_official_acquisition}`,
    '',
    '## Shared Evidence Question',
    '',
    `- ${report.target_slice.shared_question}`,
    '',
    '## Sources Used',
    '',
  ];

  for (const source of report.evidence_sources_used) {
    lines.push(
      `- Series ${source.series}: ${source.source_name} | ${source.source_type} | ${source.evidence_tier} | ${source.source_url}`,
    );
  }

  lines.push('');
  lines.push('## Reclassification Summary');
  lines.push('');
  lines.push(`- rows_investigated = ${report.summary.rows_investigated}`);
  lines.push(`- ready_for_warehouse = ${report.summary.ready_for_warehouse}`);
  lines.push(`- do_not_canon = ${report.summary.do_not_canon}`);
  lines.push(`- wait = ${report.summary.wait}`);
  lines.push(`- blocked_by_official_acquisition = ${report.summary.blocked_by_official_acquisition}`);
  lines.push('');

  lines.push('## Newly DO_NOT_CANON');
  lines.push('');
  if (report.do_not_canon_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.do_not_canon_rows) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.matched_series_pattern}`,
      );
    }
  }
  lines.push('');

  lines.push('## Still WAIT In Slice');
  lines.push('');
  if (report.still_wait_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.still_wait_rows) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.decision_code}`,
      );
    }
  }
  lines.push('');

  lines.push('## Acquisition-Blocked Lane');
  lines.push('');
  if (report.blocked_official_acquisition_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.blocked_official_acquisition_rows.slice(0, 15)) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.blocked_by_official_acquisition_reason}`,
      );
    }
  }
  lines.push('');

  lines.push('## Next Step');
  lines.push('');
  lines.push(`- ${report.recommended_next_execution_step}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function main() {
  const [
    v2,
    corroboration,
    v3,
    v4,
    v5,
    v6,
    readyBatchV6,
    readyBatchV6Residue,
    v7,
    readyBatchV7,
    v8Input,
    v8,
    readyBatchV8,
  ] = await Promise.all([
    readJson(V2_PATH),
    readJson(CORROBORATION_V1_PATH),
    readJson(V3_PATH),
    readJson(V4_PATH),
    readJson(V5_PATH),
    readJson(V6_PATH),
    readJson(READY_BATCH_V6_PATH),
    readJson(READY_BATCH_V6_RESIDUE_PATH),
    readJson(V7_PATH),
    readJson(READY_BATCH_V7_PATH),
    readJson(V8_INPUT_PATH),
    readJson(V8_PATH),
    readJson(READY_BATCH_V8_PATH),
  ]);

  void v2;
  void corroboration;
  void v3;
  void v4;
  void v5;
  void v6;
  void readyBatchV6;
  void readyBatchV6Residue;
  void v7;
  void readyBatchV7;

  const currentWaitRows = buildCurrentWaitRows({ v8Input, v8 });
  if (currentWaitRows.length !== 151) {
    throw new Error(`Current Prize Pack WAIT pool reconstruction drifted: expected 151, received ${currentWaitRows.length}.`);
  }

  const blockedOfficialAcquisitionRows = stableSortRows(
    currentWaitRows.filter((row) => row.blocked_by_official_acquisition),
  );

  const inputArtifact = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V9_NONBLOCKED',
    source_artifacts: [
      relativeCheckpointPath(V2_PATH),
      relativeCheckpointPath(CORROBORATION_V1_PATH),
      relativeCheckpointPath(V3_PATH),
      relativeCheckpointPath(V4_PATH),
      relativeCheckpointPath(V5_PATH),
      relativeCheckpointPath(V6_PATH),
      relativeCheckpointPath(READY_BATCH_V6_PATH),
      relativeCheckpointPath(READY_BATCH_V6_RESIDUE_PATH),
      relativeCheckpointPath(V7_PATH),
      relativeCheckpointPath(READY_BATCH_V7_PATH),
      relativeCheckpointPath(V8_PATH),
      relativeCheckpointPath(READY_BATCH_V8_PATH),
      relativeCheckpointPath(V8_INPUT_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence: readyBatchV8.post_batch_prize_pack_status?.remaining_wait_rows ?? currentWaitRows.length,
      do_not_canon_total:
        readyBatchV8.post_batch_prize_pack_status?.do_not_canon_rows ??
        v8.remaining_backlog?.do_not_canon_total_after_v8_nonblocked ??
        0,
      already_promoted_total:
        readyBatchV8.post_batch_prize_pack_status?.promoted_prize_pack_total_after_v8_nonblocked ?? 0,
      blocked_by_official_acquisition:
        readyBatchV8.post_batch_prize_pack_status?.blocked_by_official_acquisition_rows ??
        blockedOfficialAcquisitionRows.length,
    },
    blocker_counts: countBy(currentWaitRows, (row) => row.current_blocker_class ?? 'UNKNOWN'),
    blocked_by_official_acquisition_count: blockedOfficialAcquisitionRows.length,
    rows: currentWaitRows,
  };
  await writeJson(INPUT_JSON_PATH, inputArtifact);

  const seriesPages = await Promise.all([fetchSeriesPage(SERIES_1_SOURCE), fetchSeriesPage(SERIES_2_SOURCE)]);
  const targetSlice = chooseTargetSlice(currentWaitRows, seriesPages);
  const targetRows = buildTargetSliceRows(targetSlice.rows, seriesPages);

  const readyRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE'));
  const doNotCanonRows = stableSortRows(
    targetRows.filter((row) => row.final_decision === 'DO_NOT_CANON'),
  );
  const stillWaitRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'WAIT'));

  await writeJson(TARGET_SLICE_JSON_PATH, {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V9_NONBLOCKED',
    selection_summary: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetSlice.row_count,
      set_code_counts: targetSlice.set_code_counts,
      excluded_blocked_by_official_acquisition_count: blockedOfficialAcquisitionRows.length,
    },
    shared_question: targetSlice.shared_question,
    evidence_sources_used: seriesPages.map((page) => ({
      series: page.series,
      source_name: page.source_name,
      source_type: page.source_type,
      evidence_tier: page.evidence_tier,
      source_url: page.source_url,
    })),
    rows: targetRows,
  });

  await removeFileIfExists(READY_BATCH_CANDIDATE_PATH);

  const currentDoNotCanonTotal =
    readyBatchV8.post_batch_prize_pack_status?.do_not_canon_rows ??
    v8.remaining_backlog?.do_not_canon_total_after_v8_nonblocked ??
    0;
  const promotedTotal =
    readyBatchV8.post_batch_prize_pack_status?.promoted_prize_pack_total_after_v8_nonblocked ?? 0;

  const report = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V9_NONBLOCKED',
    scope: 'One bounded Prize Pack slice using currently accessible evidence only.',
    source_artifacts: [
      relativeCheckpointPath(V2_PATH),
      relativeCheckpointPath(CORROBORATION_V1_PATH),
      relativeCheckpointPath(V3_PATH),
      relativeCheckpointPath(V4_PATH),
      relativeCheckpointPath(V5_PATH),
      relativeCheckpointPath(V6_PATH),
      relativeCheckpointPath(READY_BATCH_V6_PATH),
      relativeCheckpointPath(READY_BATCH_V6_RESIDUE_PATH),
      relativeCheckpointPath(V7_PATH),
      relativeCheckpointPath(READY_BATCH_V7_PATH),
      relativeCheckpointPath(V8_PATH),
      relativeCheckpointPath(READY_BATCH_V8_PATH),
      relativeCheckpointPath(INPUT_JSON_PATH),
      relativeCheckpointPath(TARGET_SLICE_JSON_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence: currentWaitRows.length,
      do_not_canon_total: currentDoNotCanonTotal,
      already_promoted_total: promotedTotal,
      blocked_by_official_acquisition: blockedOfficialAcquisitionRows.length,
    },
    target_slice: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetSlice.row_count,
      shared_question: targetSlice.shared_question,
      set_code_counts: targetSlice.set_code_counts,
    },
    evidence_sources_used: seriesPages.map((page) => ({
      series: page.series,
      source_name: page.source_name,
      source_type: page.source_type,
      evidence_tier: page.evidence_tier,
      source_url: page.source_url,
    })),
    sources_checked: seriesPages.map((page) => ({
      series: page.series,
      source_name: page.source_name,
      source_type: page.source_type,
      evidence_tier: page.evidence_tier,
      source_url: page.source_url,
      raw_url: page.raw_url,
    })),
    summary: {
      rows_investigated: targetRows.length,
      ready_for_warehouse: readyRows.length,
      do_not_canon: doNotCanonRows.length,
      wait: stillWaitRows.length,
      blocked_by_official_acquisition: blockedOfficialAcquisitionRows.length,
      matched_series_patterns: countBy(targetRows, (row) => row.matched_series_pattern ?? '[]'),
    },
    ready_rows: readyRows,
    do_not_canon_rows: doNotCanonRows,
    still_wait_rows: stillWaitRows,
    blocked_official_acquisition_rows: blockedOfficialAcquisitionRows,
    remaining_backlog: {
      wait_for_more_evidence: currentWaitRows.length - doNotCanonRows.length,
      do_not_canon_total_after_v9_nonblocked: currentDoNotCanonTotal + doNotCanonRows.length,
      already_promoted_total: promotedTotal,
      blocked_by_official_acquisition_remaining: blockedOfficialAcquisitionRows.length,
    },
    recommended_next_execution_step: 'MANUAL_BROWSER_DOWNLOAD_AND_LOCAL_JSON_IMPORT_FOR_PRIZE_PACK_V1',
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');
}

await main();
