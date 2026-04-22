import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const V9_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v9_nonblocked_input.json');
const V9_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v9_nonblocked.json');
const BASE_ROUTE_REPAIR_V5_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_base_route_repair_v5.json',
);

const INPUT_JSON_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v10_input.json');
const TARGET_SLICE_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v10_target_slice.json',
);
const OUTPUT_JSON_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v10.json');
const OUTPUT_MD_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v10.md');
const READY_BATCH_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v10_candidate.json',
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
  id: 'ACCESSIBLE_SERIES_5_6_LATE_SV_SINGLE_HITS',
  label: 'Accessible Series 5-6 Late Scarlet & Violet Single-Hit Window',
  series: [5, 6],
  set_codes: ['sv03', 'sv04', 'sv06', 'sv07', 'sv6pt5'],
  source_family: 'prize-pack-series-cards-pokemon',
  shared_question:
    'Across currently accessible Prize Pack Series 5 and Series 6 sources, does this late Scarlet & Violet family-only row appear in exactly one corroborated series or in more than one, without depending on blocked official acquisition?',
};

const SERIES_SOURCES = [
  {
    series: 5,
    source_name: 'Bulbapedia Prize Pack Series Five',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Five_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Five_(TCG)&action=raw',
  },
  {
    series: 6,
    source_name: 'Bulbapedia Prize Pack Series Six',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Six_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Six_(TCG)&action=raw',
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

function buildCurrentWaitRows({ v9Input, v9, routeRepairV5 }) {
  const readyIds = new Set((v9.ready_rows || []).map((row) => row.source_external_id));
  const doNotIds = new Set((v9.do_not_canon_rows || []).map((row) => row.source_external_id));
  const blockedById = new Map(
    (v9.blocked_official_acquisition_rows || []).map((row) => [row.source_external_id, row]),
  );
  const routeFixedById = new Map(
    (routeRepairV5.rows_reclassified_to_wait || []).map((row) => [row.source_external_id, row]),
  );

  return stableSortRows(
    (v9Input.rows || [])
      .filter((row) => !readyIds.has(row.source_external_id) && !doNotIds.has(row.source_external_id))
      .map((row) => {
        const blockedRow = blockedById.get(row.source_external_id);
        const routeFixedRow = routeFixedById.get(row.source_external_id);

        const base = {
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

        if (!routeFixedRow) return base;

        return {
          ...base,
          current_blocker_class: 'NO_SERIES_CONFIRMATION',
          blocker_detail: 'route_resolved_wait_no_series_confirmation',
          why_blocked:
            'Underlying printed-number route is resolved; deterministic series corroboration is still missing.',
          base_gv_id: routeFixedRow.exact_printed_identity_owner?.gv_id ?? base.base_gv_id,
          base_route: routeFixedRow.exact_printed_identity_owner?.gv_id ?? base.base_route,
          base_card_name: routeFixedRow.exact_printed_identity_owner?.name ?? base.base_card_name,
          effective_set_code:
            routeFixedRow.exact_printed_identity_owner?.set_code ?? base.effective_set_code,
          effective_set_name:
            routeFixedRow.exact_printed_identity_owner?.set_name ?? base.effective_set_name,
          known_series_appearances:
            routeFixedRow.evidence_state_after_route_fix?.known_series_appearances ??
            base.known_series_appearances,
          missing_series_checked:
            routeFixedRow.evidence_state_after_route_fix?.missing_series_checked ??
            base.missing_series_checked,
          previous_evidence_pass_history: [
            ...(base.previous_evidence_pass_history ?? []),
            'PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1',
          ],
        };
      }),
  );
}

async function fetchSeriesPage(source) {
  const response = await fetch(source.raw_url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV10Nonblocked/1.0)',
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
      .filter(
        (row) =>
          row._matched_series_for_selection.length === 1 &&
          TARGET_SLICE.series.includes(row._matched_series_for_selection[0]),
      ),
  );

  if (matchedRows.length === 0) {
    throw new Error('No coherent nonblocked target slice could be formed for V10.');
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
      decision_code: 'base_route_ambiguous_after_v10_nonblocked',
      final_reason:
        'The row still lacks one deterministic underlying base route, so accessible series corroboration cannot advance it yet.',
    };
  }

  if (matchedSeries.length > 1) {
    return {
      final_evidence_class: 'DUPLICATE_REPRINT',
      final_decision: 'DO_NOT_CANON',
      decision_code: 'multi_series_duplicate_confirmed_by_v10_nonblocked_series_5_6',
      final_reason:
        'Accessible Series 5-6 evidence proves this row appears in more than one Prize Pack series with no printed distinction, so the generic Play! Pokémon stamp is distribution-only.',
    };
  }

  if (matchedSeries.length === 1 && TARGET_SLICE.series.includes(matchedSeries[0])) {
    return {
      final_evidence_class: 'CONFIRMED_IDENTITY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_series_confirmed_by_v10_nonblocked_series_5_6',
      final_reason:
        'Accessible Series 5-6 evidence places this row in exactly one corroborated Prize Pack series, so the generic Play! Pokémon stamp resolves to one deterministic canonical stamped identity.',
    };
  }

  return {
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_accessible_single_series_match_after_v10_nonblocked',
    final_reason:
      'Accessible Series 5-6 sources do not yet place this row in one deterministic Prize Pack series, so it remains in the evidence backlog.',
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
      evidence_sources_used_for_v10_nonblocked: selectionEvidence,
      confirmed_series_coverage: matchedSeries,
      matched_series_pattern: matchedSeries.length > 0 ? `[${matchedSeries.join(',')}]` : '[]',
      final_evidence_tier: rankToTier(bestTierRank),
      previous_evidence_pass_history: [
        ...(cleanRow.previous_evidence_pass_history ?? []),
        'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V10_NONBLOCKED',
      ],
      ...final,
    };
  });
}

function buildReadyBatchCandidate(rows) {
  return stableSortRows(rows).map((row) => ({
    source: row.source,
    source_set_id: row.source_set_id,
    source_external_id: row.source_external_id,
    name: cleanDisplayName(row.base_card_name ?? row.candidate_name),
    candidate_name: row.candidate_name,
    printed_number: row.printed_number,
    normalized_number_plain:
      row.normalized_number_plain ?? normalizeNumberPlain(row.printed_number),
    variant_key: 'play_pokemon_stamp',
    governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
    evidence_class: row.final_evidence_class,
    evidence_tier: row.final_evidence_tier,
    confirmed_series_coverage: row.confirmed_series_coverage,
    effective_set_code: row.effective_set_code,
    effective_set_name: row.effective_set_name,
    underlying_base_proof: {
      base_gv_id: row.base_gv_id,
      base_route: row.base_route,
      unique_base_route: row.unique_base_route ?? false,
    },
    reference_hints_payload: {
      provenance: row.source,
      source_family: row.source_family,
      evidence_class: row.final_evidence_class,
      evidence_tier: row.final_evidence_tier,
      confirmed_series_coverage: row.confirmed_series_coverage,
      underlying_base_proof: {
        base_gv_id: row.base_gv_id,
        base_route: row.base_route,
      },
      effective_routed_set_code: row.effective_set_code,
      governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
    },
  }));
}

function buildMarkdown(report) {
  const lines = [
    '# Prize Pack Evidence V10 Nonblocked',
    '',
    `- Generated at: ${report.generated_at}`,
    `- Workflow: ${report.workflow}`,
    '',
    '## Current Backlog',
    '',
    `- WAIT_FOR_MORE_EVIDENCE: ${report.current_backlog.wait_for_more_evidence}`,
    `- DO_NOT_CANON: ${report.current_backlog.do_not_canon_total}`,
    `- promoted Prize Pack total: ${report.current_backlog.already_promoted_total}`,
    `- acquisition-blocked: ${report.current_backlog.blocked_by_official_acquisition}`,
    '',
    '## Target Slice',
    '',
    `- id: ${report.target_slice.id}`,
    `- label: ${report.target_slice.label}`,
    `- row_count: ${report.target_slice.row_count}`,
    `- shared_question: ${report.target_slice.shared_question}`,
    '',
    '## Evidence Sources Used',
    '',
  ];

  for (const source of report.evidence_sources_used) {
    lines.push(
      `- Series ${source.series}: ${source.source_name} (${source.source_type}, ${source.evidence_tier})`,
    );
  }

  lines.push('');
  lines.push('## Reclassification Summary');
  lines.push('');
  lines.push(`- rows investigated: ${report.summary.rows_investigated}`);
  lines.push(`- READY_FOR_WAREHOUSE: ${report.summary.ready_for_warehouse}`);
  lines.push(`- DO_NOT_CANON: ${report.summary.do_not_canon}`);
  lines.push(`- WAIT: ${report.summary.wait}`);
  lines.push('');

  lines.push('## Newly READY');
  lines.push('');
  if (report.ready_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.ready_rows) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.matched_series_pattern}`,
      );
    }
  }

  lines.push('');
  lines.push('## Newly DO_NOT_CANON');
  lines.push('');
  if (report.do_not_canon_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.do_not_canon_rows) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.final_reason}`,
      );
    }
  }

  lines.push('');
  lines.push('## Still WAIT');
  lines.push('');
  if (report.still_wait_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.still_wait_rows) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.final_reason}`,
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
  const [v9Input, v9, routeRepairV5] = await Promise.all([
    readJson(V9_INPUT_PATH),
    readJson(V9_PATH),
    readJson(BASE_ROUTE_REPAIR_V5_PATH),
  ]);

  const currentWaitRows = buildCurrentWaitRows({ v9Input, v9, routeRepairV5 });
  const blockedOfficialAcquisitionRows = stableSortRows(
    currentWaitRows.filter((row) => row.blocked_by_official_acquisition),
  );

  const currentDoNotCanonTotal =
    v9.remaining_backlog?.do_not_canon_total_after_v9_nonblocked ??
    v9.current_backlog?.do_not_canon_total ??
    0;
  const promotedTotal =
    v9.remaining_backlog?.already_promoted_total ??
    v9.current_backlog?.already_promoted_total ??
    0;

  const inputArtifact = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V10_NONBLOCKED',
    source_artifacts: [
      relativeCheckpointPath(V9_INPUT_PATH),
      relativeCheckpointPath(V9_PATH),
      relativeCheckpointPath(BASE_ROUTE_REPAIR_V5_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence: currentWaitRows.length,
      do_not_canon_total: currentDoNotCanonTotal,
      already_promoted_total: promotedTotal,
      blocked_by_official_acquisition: blockedOfficialAcquisitionRows.length,
    },
    blocker_counts: countBy(currentWaitRows, (row) => row.current_blocker_class ?? 'UNKNOWN'),
    blocked_by_official_acquisition_count: blockedOfficialAcquisitionRows.length,
    rows: currentWaitRows,
  };
  await writeJson(INPUT_JSON_PATH, inputArtifact);

  const seriesPages = await Promise.all(SERIES_SOURCES.map(fetchSeriesPage));
  const targetSlice = chooseTargetSlice(currentWaitRows, seriesPages);
  const targetRows = buildTargetSliceRows(targetSlice.rows, seriesPages);

  const readyRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE'));
  const doNotCanonRows = stableSortRows(
    targetRows.filter((row) => row.final_decision === 'DO_NOT_CANON'),
  );
  const stillWaitRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'WAIT'));

  await writeJson(TARGET_SLICE_JSON_PATH, {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V10_NONBLOCKED',
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
  if (readyRows.length > 0) {
    await writeJson(READY_BATCH_CANDIDATE_PATH, {
      generated_at: new Date().toISOString(),
      workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V10_NONBLOCKED',
      source_artifact: relativeCheckpointPath(OUTPUT_JSON_PATH),
      row_count: readyRows.length,
      rows: buildReadyBatchCandidate(readyRows),
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V10_NONBLOCKED',
    scope: 'One bounded Prize Pack slice using currently accessible evidence only.',
    source_artifacts: [
      relativeCheckpointPath(V9_INPUT_PATH),
      relativeCheckpointPath(V9_PATH),
      relativeCheckpointPath(BASE_ROUTE_REPAIR_V5_PATH),
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
      wait_for_more_evidence:
        currentWaitRows.length - readyRows.length - doNotCanonRows.length,
      do_not_canon_total_after_v10_nonblocked: currentDoNotCanonTotal + doNotCanonRows.length,
      already_promoted_total: promotedTotal,
      blocked_by_official_acquisition_remaining: blockedOfficialAcquisitionRows.length,
    },
    recommended_next_execution_step:
      readyRows.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V10'
        : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V11_NONBLOCKED',
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');
}

await main();
