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
const V7_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v7_nonblocked.json');
const READY_BATCH_V7_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v7_nonblocked.json',
);
const V7_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v7_nonblocked_input.json');

const INPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v8_nonblocked_input.json',
);
const TARGET_SLICE_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v8_nonblocked_target_slice.json',
);
const OUTPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v8_nonblocked.json',
);
const OUTPUT_MD_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v8_nonblocked.md',
);
const READY_BATCH_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v8_nonblocked_candidate.json',
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
  id: 'PROMO_NUMBER_ACCESSIBLE_SERIES_1_3',
  label: 'Promo Number Accessible Series 1-3',
  series: [1, 2, 3],
  set_codes: ['swshp', 'svp'],
  shared_question:
    'For promo-numbered Prize Pack rows whose accessible raw pages omit a stable base set-name signal, does the combination of base name plus printed promo number across accessible Series 1-3 sources prove one corroborated series or multi-series duplication?',
  source_family: 'prize-pack-series-cards-pokemon',
};

const ACCESSIBLE_SERIES_SOURCES = [
  {
    series: 1,
    source_name: 'Bulbapedia Prize Pack Series One',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG)&action=raw',
  },
  {
    series: 2,
    source_name: 'Bulbapedia Prize Pack Series Two',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Two_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Two_(TCG)&action=raw',
  },
  {
    series: 3,
    source_name: 'Bulbapedia Prize Pack Series Three',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Three_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Three_(TCG)&action=raw',
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

function buildCanonicalQueueKey(row) {
  return [
    row.effective_set_code ?? 'unknown',
    cleanDisplayName(row.base_card_name ?? row.candidate_name ?? 'unknown'),
    row.printed_number ?? 'unknown',
    'play_pokemon_stamp',
  ].join('::');
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

function buildCurrentWaitRows({ v7Input, v7 }) {
  const readyRowIds = new Set((v7.ready_rows || []).map((row) => row.source_external_id));

  return stableSortRows(
    (v7Input.rows || [])
      .filter((row) => !readyRowIds.has(row.source_external_id))
      .map((row) => ({
        ...row,
        normalized_number_plain:
          row.normalized_number_plain ?? normalizeNumberPlain(row.printed_number),
        known_series_appearances:
          row.known_series_appearances ?? row.confirmed_series_coverage ?? [],
        previous_evidence_pass_history: row.previous_evidence_pass_history ?? [],
        blocked_by_official_acquisition: Boolean(row.blocked_by_official_acquisition),
        blocked_by_official_acquisition_reason: row.blocked_by_official_acquisition
          ? row.blocked_by_official_acquisition_reason ?? ACQUISITION_BLOCK_REASON
          : null,
      })),
  );
}

function chooseTargetSlice(waitRows) {
  const eligibleRows = waitRows.filter(
    (row) =>
      !row.blocked_by_official_acquisition &&
      row.current_blocker_class === 'NO_SERIES_CONFIRMATION' &&
      row.unique_base_route &&
      row.base_gv_id &&
      TARGET_SLICE.set_codes.includes(row.effective_set_code) &&
      row.source_family === TARGET_SLICE.source_family,
  );

  if (eligibleRows.length === 0) {
    throw new Error('No coherent nonblocked target slice could be formed for V8.');
  }

  return {
    ...TARGET_SLICE,
    row_count: eligibleRows.length,
    set_code_counts: countBy(eligibleRows, (row) => row.effective_set_code ?? 'unknown'),
    rows: stableSortRows(eligibleRows),
  };
}

async function fetchSeriesPage(source) {
  const response = await fetch(source.raw_url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV8Nonblocked/1.0)',
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

function lineMatchesPromoNumberRow(line, row) {
  const requiredName = normalizeName(row.base_card_name ?? row.candidate_name);
  const requiredPrintedIdentifier = normalizeText(row.printed_number);
  return (
    line.includes(requiredName) &&
    line.includes(requiredPrintedIdentifier) &&
    (line.includes('promo') || line.includes('black star promos'))
  );
}

function matchRowAgainstAccessibleSources(row, seriesPages) {
  const matchedSeries = [];
  const matchingEvidence = [];

  for (const page of seriesPages) {
    const matchingLine = page.raw_lines.find((line) => lineMatchesPromoNumberRow(line, row));
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

function buildFinalDecision(row, matchedSeries) {
  if (!row.unique_base_route || !row.base_gv_id) {
    return {
      final_evidence_class: 'STILL_UNPROVEN',
      final_decision: 'WAIT',
      decision_code: 'base_route_ambiguous_after_v8_nonblocked',
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
      decision_code: 'multi_series_duplicate_confirmed_by_v8_nonblocked_promo_series_1_3',
      final_reason:
        'Accessible Prize Pack promo-number evidence places this row in more than one corroborated series, so the generic Play! Pokémon stamp remains distribution-only.',
      blocked_by_official_acquisition: false,
      blocked_by_official_acquisition_reason: null,
    };
  }

  if (matchedSeries.length === 1 && matchedSeries[0] === 3) {
    return {
      final_evidence_class: 'CONFIRMED_IDENTITY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_series_confirmed_by_v8_nonblocked_promo_series_1_3',
      final_reason:
        'Accessible Prize Pack promo-number evidence places this row in exactly one corroborated series inside the checked Series 1-3 window, so the generic Play! Pokémon stamp resolves to one deterministic canonical stamped identity.',
      blocked_by_official_acquisition: false,
      blocked_by_official_acquisition_reason: null,
    };
  }

  if (matchedSeries.length === 1 && (matchedSeries[0] === 1 || matchedSeries[0] === 2)) {
    return {
      final_evidence_class: 'STILL_UNPROVEN',
      final_decision: 'WAIT',
      decision_code: 'single_series_1_or_2_promo_match_requires_official_upgrade_after_v8_nonblocked',
      final_reason:
        'Accessible evidence places the promo row in Series 1 or Series 2 only, but the truthful next step still depends on official Series 1/2 checklist acquisition before canonization.',
      blocked_by_official_acquisition: true,
      blocked_by_official_acquisition_reason: ACQUISITION_BLOCK_REASON,
    };
  }

  return {
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_accessible_promo_series_1_3_match_after_v8_nonblocked',
    final_reason:
      'The accessible Series 1-3 Prize Pack promo-number sources still do not place this row in a corroborated Prize Pack list, so the row remains evidence-bound.',
    blocked_by_official_acquisition: false,
    blocked_by_official_acquisition_reason: null,
  };
}

function buildTargetSliceRows(rows, seriesPages) {
  return stableSortRows(rows).map((row) => {
    const match = matchRowAgainstAccessibleSources(row, seriesPages);
    const final = buildFinalDecision(row, match.matched_series);
    const bestTierRank = Math.min(
      strongestTierRankFromSources(row.evidence_sources),
      strongestTierRankFromSources(match.matching_evidence),
    );

    return {
      ...row,
      accessible_series_checked: TARGET_SLICE.series,
      missing_series_checked: TARGET_SLICE.series,
      evidence_sources_used_for_v8_nonblocked: match.matching_evidence,
      confirmed_series_coverage: match.matched_series,
      matched_series_pattern:
        match.matched_series.length > 0 ? `[${match.matched_series.join(',')}]` : '[]',
      final_evidence_tier: rankToTier(bestTierRank),
      previous_evidence_pass_history: [
        ...(row.previous_evidence_pass_history ?? []),
        'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V8_NONBLOCKED',
      ],
      matching_strategy: 'promo_name_plus_printed_number',
      ...final,
    };
  });
}

function buildReadyBatchCandidate(readyRows) {
  const sorted = stableSortRows(readyRows);
  return {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_READY_BATCH_V8_NONBLOCKED_CANDIDATE',
    status: sorted.length > 0 ? 'READY_SUBSET_IDENTIFIED' : 'NO_READY_ROWS',
    source_artifacts: [
      'docs/checkpoints/warehouse/prize_pack_evidence_v8_nonblocked.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_v8_nonblocked_target_slice.json',
    ],
    selection_summary: {
      row_count: sorted.length,
      governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      variant_key: 'play_pokemon_stamp',
      target_origin: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V8_NONBLOCKED',
    },
    rows: sorted.map((row, index) => ({
      batch_index: index + 1,
      source: row.source,
      source_set_id: row.source_set_id,
      source_external_id: row.source_external_id,
      source_candidate_id: null,
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name),
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
      evidence_class: row.final_evidence_class,
      evidence_tier: row.final_evidence_tier,
      supported_series_list: row.confirmed_series_coverage,
      evidence_sources_v8_nonblocked: [
        ...(row.evidence_sources ?? []),
        ...(row.evidence_sources_used_for_v8_nonblocked ?? []),
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
        base_card_name: cleanDisplayName(row.base_card_name ?? row.candidate_name),
      },
      final_decision: row.final_decision,
      decision_code: row.decision_code,
      final_reason: row.final_reason,
    })),
    recommended_next_execution_step: 'PRIZE_PACK_READY_BATCH_V8_NONBLOCKED',
  };
}

function buildMarkdown(report) {
  const lines = [
    '# PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V8_NONBLOCKED',
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

  lines.push('## Newly READY');
  lines.push('');
  if (report.ready_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.ready_rows.slice(0, 15)) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.matched_series_pattern} | ${row.final_evidence_tier}`,
      );
    }
  }
  lines.push('');

  lines.push('## Newly DO_NOT_CANON');
  lines.push('');
  if (report.do_not_canon_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.do_not_canon_rows.slice(0, 15)) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.matched_series_pattern}`,
      );
    }
  }
  lines.push('');

  lines.push('## Still WAIT');
  lines.push('');
  if (report.still_wait_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.still_wait_rows.slice(0, 15)) {
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
  const [v2, corroboration, v3, v4, v5, v6, v7, readyBatchV7, v7Input] = await Promise.all([
    readJson(V2_PATH),
    readJson(CORROBORATION_V1_PATH),
    readJson(V3_PATH),
    readJson(V4_PATH),
    readJson(V5_PATH),
    readJson(V6_PATH),
    readJson(V7_PATH),
    readJson(READY_BATCH_V7_PATH),
    readJson(V7_INPUT_PATH),
  ]);

  void v2;
  void corroboration;
  void v3;
  void v4;
  void v5;
  void v6;

  const currentWaitRows = buildCurrentWaitRows({ v7Input, v7 });
  const blockedOfficialAcquisitionRows = stableSortRows(
    currentWaitRows.filter((row) => row.blocked_by_official_acquisition),
  );
  const targetSlice = chooseTargetSlice(currentWaitRows);

  const inputArtifact = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V8_NONBLOCKED',
    source_artifacts: [
      relativeCheckpointPath(V2_PATH),
      relativeCheckpointPath(CORROBORATION_V1_PATH),
      relativeCheckpointPath(V3_PATH),
      relativeCheckpointPath(V4_PATH),
      relativeCheckpointPath(V5_PATH),
      relativeCheckpointPath(V6_PATH),
      relativeCheckpointPath(V7_PATH),
      relativeCheckpointPath(READY_BATCH_V7_PATH),
      relativeCheckpointPath(V7_INPUT_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence:
        readyBatchV7.post_batch_prize_pack_status?.remaining_wait_for_more_evidence ??
        currentWaitRows.length,
      do_not_canon_total:
        readyBatchV7.post_batch_prize_pack_status?.do_not_canon_total ??
        v7.remaining_backlog?.do_not_canon_total_after_v7_nonblocked ??
        0,
      already_promoted_total:
        readyBatchV7.post_batch_prize_pack_status?.promoted_prize_pack_total_after_v7_nonblocked ??
        0,
      blocked_by_official_acquisition:
        readyBatchV7.post_batch_prize_pack_status?.blocked_by_official_acquisition_remaining ??
        blockedOfficialAcquisitionRows.length,
    },
    blocker_counts: countBy(currentWaitRows, (row) => row.current_blocker_class ?? 'UNKNOWN'),
    blocked_by_official_acquisition_count: blockedOfficialAcquisitionRows.length,
    rows: currentWaitRows,
  };
  await writeJson(INPUT_JSON_PATH, inputArtifact);

  const seriesPages = await Promise.all(ACCESSIBLE_SERIES_SOURCES.map(fetchSeriesPage));
  const targetRows = buildTargetSliceRows(targetSlice.rows, seriesPages);

  const readyRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE'));
  const doNotCanonRows = stableSortRows(
    targetRows.filter((row) => row.final_decision === 'DO_NOT_CANON'),
  );
  const stillWaitRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'WAIT'));
  const blockedAfterPassRows = stableSortRows([
    ...currentWaitRows.filter(
      (row) =>
        row.blocked_by_official_acquisition &&
        !targetRows.some((target) => target.source_external_id === row.source_external_id),
    ),
    ...stillWaitRows.filter((row) => row.blocked_by_official_acquisition),
  ]);

  await writeJson(TARGET_SLICE_JSON_PATH, {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V8_NONBLOCKED',
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

  if (readyRows.length > 0) {
    await writeJson(READY_BATCH_CANDIDATE_PATH, buildReadyBatchCandidate(readyRows));
  } else {
    await removeFileIfExists(READY_BATCH_CANDIDATE_PATH);
  }

  const remainingWaitCount = currentWaitRows.length - readyRows.length - doNotCanonRows.length;
  const doNotCanonTotalAfter =
    (readyBatchV7.post_batch_prize_pack_status?.do_not_canon_total ??
      v7.remaining_backlog?.do_not_canon_total_after_v7_nonblocked ??
      0) + doNotCanonRows.length;

  const promotedTotal =
    readyBatchV7.post_batch_prize_pack_status?.promoted_prize_pack_total_after_v7_nonblocked ?? 0;

  const report = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V8_NONBLOCKED',
    scope: 'One bounded Prize Pack slice using currently accessible evidence only.',
    source_artifacts: [
      relativeCheckpointPath(V2_PATH),
      relativeCheckpointPath(CORROBORATION_V1_PATH),
      relativeCheckpointPath(V3_PATH),
      relativeCheckpointPath(V4_PATH),
      relativeCheckpointPath(V5_PATH),
      relativeCheckpointPath(V6_PATH),
      relativeCheckpointPath(V7_PATH),
      relativeCheckpointPath(READY_BATCH_V7_PATH),
      relativeCheckpointPath(INPUT_JSON_PATH),
      relativeCheckpointPath(TARGET_SLICE_JSON_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence: currentWaitRows.length,
      do_not_canon_total:
        readyBatchV7.post_batch_prize_pack_status?.do_not_canon_total ??
        v7.remaining_backlog?.do_not_canon_total_after_v7_nonblocked ??
        0,
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
      blocked_by_official_acquisition: blockedAfterPassRows.length,
      matched_series_patterns: countBy(targetRows, (row) => row.matched_series_pattern ?? '[]'),
    },
    ready_rows: readyRows,
    do_not_canon_rows: doNotCanonRows,
    still_wait_rows: stillWaitRows,
    blocked_official_acquisition_rows: blockedAfterPassRows,
    remaining_backlog: {
      wait_for_more_evidence: remainingWaitCount,
      do_not_canon_total_after_v8_nonblocked: doNotCanonTotalAfter,
      already_promoted_total: promotedTotal,
      blocked_by_official_acquisition_remaining: blockedAfterPassRows.length,
    },
    recommended_next_execution_step:
      readyRows.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V8_NONBLOCKED'
        : blockedAfterPassRows.length >= currentWaitRows.length / 2
          ? 'MANUAL_BROWSER_DOWNLOAD_AND_LOCAL_JSON_IMPORT_FOR_PRIZE_PACK_V1'
          : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V9_NONBLOCKED',
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');
}

await main();
