import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const V4_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v4_input.json');
const V4_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v4.json');
const READY_BATCH_V5_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v5.json');
const V5_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v5_input.json');
const V5_TARGET_SLICE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v5_target_slice.json',
);
const V5_OUTPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v5.json');
const V5_MD_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v5.md');
const V6_CANDIDATE_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v6_candidate.json');

const TIER_RANK = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
};

const COVERAGE_WINDOWS = [
  {
    id: 'SERIES_1_2',
    series: [1, 2],
    label: 'Series 1-2',
    set_codes: ['swsh1', 'swsh2', 'swsh3', 'swsh4', 'swsh5', 'swsh6', 'swsh8', 'swshp'],
  },
  {
    id: 'SERIES_2_3',
    series: [2, 3],
    label: 'Series 2-3',
    set_codes: ['swsh10', 'swsh11', 'pgo'],
  },
  {
    id: 'SERIES_3_4',
    series: [3, 4],
    label: 'Series 3-4',
    set_codes: ['swsh12', 'swsh12.5', 'sv01'],
  },
];

const SERIES_SOURCES = [
  {
    series: 1,
    source_name: 'Bulbapedia Prize Pack Series One',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG)&action=raw',
    official_card_list_url:
      'https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_1_web_cardlist_en.pdf',
    official_access_status: 'url_resolved_but_bot_gated_in_local_fetch',
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
    official_card_list_url:
      'https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_2_web_cardlist_en.pdf',
    official_access_status: 'url_resolved_but_bot_gated_in_local_fetch',
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

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildCurrentWaitRows(v4Input, v4) {
  const excluded = new Set(
    [
      ...(v4.ready_rows || []),
      ...(v4.do_not_canon_rows || []),
    ].map((row) => row.source_external_id),
  );
  return stableSortRows(v4Input.rows.filter((row) => !excluded.has(row.source_external_id)));
}

function resolveCoverageWindow(row) {
  const setCode = row.effective_set_code;
  return COVERAGE_WINDOWS.find((window) => window.set_codes.includes(setCode)) ?? null;
}

function chooseTargetSlice(rows) {
  const candidates = rows
    .filter((row) => row.current_blocker_class === 'NO_SERIES_CONFIRMATION' && row.unique_base_route)
    .map((row) => ({
      ...row,
      coverage_window: resolveCoverageWindow(row),
    }))
    .filter((row) => row.coverage_window);

  const windowCounts = COVERAGE_WINDOWS.map((window) => {
    const windowRows = candidates.filter((row) => row.coverage_window?.id === window.id);
    return {
      id: window.id,
      label: window.label,
      series: window.series,
      row_count: windowRows.length,
      set_counts: countBy(windowRows, (row) => row.effective_set_code ?? 'unknown'),
    };
  }).sort((a, b) => {
    if (b.row_count !== a.row_count) return b.row_count - a.row_count;
    return a.id.localeCompare(b.id);
  });

  const selectedWindow = windowCounts.find((window) => window.row_count > 0);
  if (!selectedWindow) {
    throw new Error('No coherent coverage window could be identified from the remaining wait pool.');
  }

  const windowRows = candidates.filter((row) => row.coverage_window?.id === selectedWindow.id);
  const setClusters = Object.entries(
    countBy(windowRows, (row) => row.effective_set_code ?? 'unknown'),
  )
    .map(([effective_set_code, row_count]) => ({
      effective_set_code,
      effective_set_name:
        windowRows.find((row) => row.effective_set_code === effective_set_code)?.effective_set_name ??
        null,
      row_count,
    }))
    .sort((a, b) => {
      if (b.row_count !== a.row_count) return b.row_count - a.row_count;
      return a.effective_set_code.localeCompare(b.effective_set_code);
    });

  const selectedSetCodes = [];
  let runningCount = 0;
  for (const cluster of setClusters) {
    selectedSetCodes.push(cluster.effective_set_code);
    runningCount += cluster.row_count;
    if (selectedSetCodes.length >= 2 && runningCount >= 30) break;
    if (runningCount >= 80) break;
  }

  const selectedRows = stableSortRows(
    windowRows.filter((row) => selectedSetCodes.includes(row.effective_set_code)),
  );

  return {
    window_candidates: windowCounts,
    selected_window: selectedWindow,
    selected_set_clusters: setClusters.filter((cluster) =>
      selectedSetCodes.includes(cluster.effective_set_code),
    ),
    selected_rows: selectedRows,
  };
}

async function fetchSeriesPages() {
  const pageMap = new Map();
  for (const source of SERIES_SOURCES) {
    const response = await fetch(source.raw_url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV5/1.0)',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch series ${source.series}: ${response.status}`);
    }
    const text = await response.text();
    pageMap.set(source.series, {
      ...source,
      raw_lines: text
        .split('\n')
        .map((line) => normalizeText(line))
        .filter(Boolean),
    });
  }
  return pageMap;
}

function lineMatchesRow(line, row) {
  const requiredName = normalizeName(row.base_card_name ?? row.candidate_name);
  const requiredNumber = normalizeText(row.printed_number);
  const requiredSetName = normalizeText(row.effective_set_name);
  return (
    line.includes(requiredName) &&
    line.includes(requiredNumber) &&
    line.includes(requiredSetName)
  );
}

function matchRowAgainstSeriesPages(row, seriesPages, allowedSeries) {
  const matchedSeries = [];
  const matchingEvidence = [];

  for (const series of allowedSeries) {
    const page = seriesPages.get(series);
    if (!page) continue;
    const matchingLine = page.raw_lines.find((line) => lineMatchesRow(line, row));
    if (!matchingLine) continue;
    matchedSeries.push(series);
    matchingEvidence.push({
      series,
      source_name: page.source_name,
      source_type: page.source_type,
      evidence_tier: page.evidence_tier,
      source_url: page.source_url,
      raw_url: page.raw_url,
      official_card_list_url: page.official_card_list_url,
      official_access_status: page.official_access_status,
      matching_line: matchingLine,
    });
  }

  return {
    matched_series: matchedSeries,
    matching_evidence: matchingEvidence,
  };
}

function buildFinalDecision(row, matchedSeries, strongestTierRank) {
  if (matchedSeries.length > 1) {
    return {
      final_evidence_class: 'DUPLICATE_REPRINT',
      final_decision: 'DO_NOT_CANON',
      decision_code: 'multi_series_duplicate_confirmed_by_series_1_2_window_v5',
      final_reason:
        'The card appears in multiple Prize Pack series inside the selected Series 1-2 window with no printed series marker, so the generic Play! Pokémon stamp remains distribution-only rather than a distinct canonical split.',
      blocker_class_after_v5: null,
    };
  }

  if (matchedSeries.length === 1 && strongestTierRank <= TIER_RANK.TIER_2) {
    return {
      final_evidence_class: 'CONFIRMED_IDENTITY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_series_confirmed_with_tier_1_or_2_window_coverage_v5',
      final_reason:
        'The card appears in exactly one fully checked series inside the selected coverage window and the corroboration reached Tier 1 or Tier 2, so the generic Play! Pokémon stamp resolves to one deterministic canonical stamped identity.',
      blocker_class_after_v5: null,
    };
  }

  if (matchedSeries.length === 1) {
    return {
      final_evidence_class: 'STILL_UNPROVEN',
      final_decision: 'WAIT',
      decision_code: 'single_series_match_but_best_evidence_tier_remains_tier_3_v5',
      final_reason:
        'The card appears in exactly one series inside the selected Series 1-2 window, but the available corroboration in this pass remains community-tier because the linked official card-list PDFs are bot-gated in local fetches. Under EVIDENCE_TIER_V1 it cannot move to READY yet.',
      blocker_class_after_v5: 'INSUFFICIENT_SOURCE_CORROBORATION',
    };
  }

  return {
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_series_hit_inside_selected_window_v5',
    final_reason:
      'The selected Series 1-2 window did not place this card in a corroborated card list, so the row remains unresolved after this pass.',
    blocker_class_after_v5: 'NO_SERIES_CONFIRMATION',
  };
}

function buildReadyBatchCandidate(readyRows) {
  const sorted = stableSortRows(readyRows);
  return {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_READY_BATCH_V6_CANDIDATE',
    status: sorted.length > 0 ? 'READY_SUBSET_IDENTIFIED' : 'NO_READY_ROWS',
    source_artifacts: [
      'docs/checkpoints/warehouse/prize_pack_evidence_v5.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_v5_target_slice.json',
    ],
    selection_summary: {
      row_count: sorted.length,
      governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      variant_key: 'play_pokemon_stamp',
      target_origin: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V5',
    },
    rows: sorted.map((row, index) => ({
      batch_index: index + 1,
      source: row.source,
      source_set_id: row.source_set_id,
      source_external_id: row.source_external_id,
      source_candidate_id: null,
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
      evidence_class: row.final_evidence_class,
      evidence_tier: row.final_evidence_tier,
      supported_series_list: row.confirmed_series_coverage,
      evidence_sources_v5: [
        ...(row.evidence_sources ?? []),
        ...(row.evidence_sources_used_for_v5 ?? []),
      ],
      effective_identity_space: row.effective_set_code,
      effective_set_code: row.effective_set_code,
      effective_routed_set_code: row.effective_set_code,
      effective_set_name: row.effective_set_name,
      effective_routed_set_name: row.effective_set_name,
      canonical_queue_key: buildCanonicalQueueKey(row),
      underlying_base_proof_summary: {
        underlying_base_state: 'PROVEN',
        blocking_reason: row.decision_code,
        evidence_summary: row.final_reason,
        live_base_card_print_id: row.base_card_print_id ?? null,
        base_gv_id: row.base_gv_id,
        evidence_tier: row.final_evidence_tier,
        supported_series_list: row.confirmed_series_coverage,
      },
      target_base_resolution: {
        resolution_type: 'UNIQUE_BASE_ROUTE',
        base_card_print_id: row.base_card_print_id ?? null,
        base_gv_id: row.base_gv_id,
        effective_set_code: row.effective_set_code,
        effective_set_name: row.effective_set_name,
        base_name: row.base_card_name ?? row.candidate_name,
        printed_number: row.normalized_number_plain,
        number_plain: row.normalized_number_plain,
      },
      research_links: row.research_links ?? null,
    })),
    recommended_next_execution_step:
      sorted.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V6'
        : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V6',
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Prize Pack Evidence V5');
  lines.push('');
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(
    'This pass recomputes the post-Batch-5 Prize Pack wait pool, selects the highest-yield contiguous coverage-window slice, and resolves that slice without widening into promotion or canon mutation.',
  );
  lines.push('');
  lines.push('## Current Prize Pack State');
  lines.push('');
  lines.push(`- wait_for_more_evidence: ${report.current_backlog.wait_for_more_evidence}`);
  lines.push(`- do_not_canon_total: ${report.current_backlog.do_not_canon_total}`);
  lines.push(`- already_promoted_prize_pack_total: ${report.current_backlog.already_promoted_total}`);
  lines.push('');
  lines.push('## Coverage Window Selection');
  lines.push('');
  for (const window of report.coverage_window_candidates) {
    lines.push(`- ${window.label}: ${window.row_count}`);
  }
  lines.push('');
  lines.push(`Selected window: ${report.target_slice.coverage_window}`);
  lines.push(`Shared question: ${report.target_slice.question}`);
  lines.push(`Bounded slice size: ${report.target_slice.slice_size}`);
  lines.push(`Set cluster used to stay bounded: ${report.target_slice.selected_set_codes.join(', ')}`);
  lines.push('');
  lines.push('## Evidence Sources Used');
  lines.push('');
  for (const source of report.evidence_sources_used) {
    lines.push(`- ${source}`);
  }
  lines.push('');
  lines.push('## Reclassification Summary');
  lines.push('');
  lines.push(`- rows_investigated: ${report.summary.rows_investigated}`);
  lines.push(`- moved_to_ready: ${report.summary.ready_for_warehouse}`);
  lines.push(`- moved_to_do_not_canon: ${report.summary.do_not_canon}`);
  lines.push(`- still_wait: ${report.summary.wait}`);
  lines.push('');
  lines.push('## Decision Patterns');
  lines.push('');
  for (const [pattern, count] of Object.entries(report.summary.matched_series_patterns)) {
    lines.push(`- ${pattern}: ${count}`);
  }
  lines.push('');
  lines.push('## Newly READY_FOR_WAREHOUSE');
  lines.push('');
  if (report.ready_rows.length === 0) {
    lines.push('- None in this pass. Single-series hits stayed WAIT because the best reproducible evidence remained TIER_3.');
  } else {
    for (const row of report.ready_rows.slice(0, 12)) {
      lines.push(
        `- ${row.base_card_name} | ${row.printed_number} | ${row.effective_set_code} | confirmed_series=${row.confirmed_series_coverage.join(', ')}`,
      );
    }
  }
  lines.push('');
  lines.push('## Newly DO_NOT_CANON');
  lines.push('');
  for (const row of report.do_not_canon_rows.slice(0, 12)) {
    lines.push(
      `- ${row.base_card_name} | ${row.printed_number} | ${row.effective_set_code} | confirmed_series=${row.confirmed_series_coverage.join(', ')}`,
    );
  }
  lines.push('');
  lines.push('## Still WAIT');
  lines.push('');
  for (const row of report.still_wait_rows.slice(0, 12)) {
    lines.push(
      `- ${row.base_card_name} | ${row.printed_number} | ${row.effective_set_code} | reason=${row.decision_code}`,
    );
  }
  lines.push('');
  lines.push('## Remaining Prize Pack Backlog');
  lines.push('');
  lines.push(`- wait_for_more_evidence: ${report.remaining_backlog.wait_for_more_evidence}`);
  lines.push(`- do_not_canon_total_after_v5: ${report.remaining_backlog.do_not_canon_total_after_v5}`);
  lines.push(`- already_promoted_total: ${report.remaining_backlog.already_promoted_total}`);
  for (const [reason, count] of Object.entries(report.remaining_backlog.wait_reason_counts)) {
    lines.push(`- ${reason}: ${count}`);
  }
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push(`- ${report.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [v4Input, v4, readyBatchV5] = await Promise.all([
    readJson(V4_INPUT_PATH),
    readJson(V4_PATH),
    readJson(READY_BATCH_V5_PATH),
  ]);

  const currentWaitRows = buildCurrentWaitRows(v4Input, v4);
  const currentBacklog = {
    wait_for_more_evidence: currentWaitRows.length,
    do_not_canon_total: v4.remaining_backlog?.do_not_canon_total_after_v4 ?? 0,
    already_promoted_total:
      (v4.remaining_backlog?.already_promoted_total ?? 0) +
      (readyBatchV5.batch_result?.batch_rows_promoted ?? 0),
  };

  const inputArtifact = {
    generated_at: generatedAt,
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V5_INPUT',
    source_artifacts: [
      'docs/checkpoints/warehouse/prize_pack_evidence_v4_input.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_v4.json',
      'docs/checkpoints/warehouse/prize_pack_ready_batch_v5.json',
    ],
    current_backlog: currentBacklog,
    rows: currentWaitRows,
  };
  await writeJson(V5_INPUT_PATH, inputArtifact);

  const target = chooseTargetSlice(currentWaitRows);
  const selectedWindowSource = COVERAGE_WINDOWS.find(
    (window) => window.id === target.selected_window.id,
  );
  const targetQuestion =
    'Across Prize Pack Series 1 and 2, does this unique-base-route row appear in Series 1 only, in both Series 1 and 2, or in neither series?';

  const seriesPages = await fetchSeriesPages();
  const reclassifiedSliceRows = stableSortRows(target.selected_rows).map((row) => {
    const match = matchRowAgainstSeriesPages(row, seriesPages, selectedWindowSource.series);
    const strongestTierRank = Math.min(
      strongestTierRankFromSources(row.evidence_sources),
      strongestTierRankFromSources(match.matching_evidence),
    );
    const final = buildFinalDecision(row, match.matched_series, strongestTierRank);
    return {
      ...row,
      coverage_window: selectedWindowSource.id,
      missing_series_checked: selectedWindowSource.series,
      evidence_sources_used_for_v5: match.matching_evidence,
      confirmed_series_coverage: match.matched_series,
      matched_series_pattern:
        match.matched_series.length > 0 ? `[${match.matched_series.join(',')}]` : '[]',
      final_evidence_tier: rankToTier(strongestTierRank),
      ...final,
    };
  });

  const targetSliceArtifact = {
    generated_at: generatedAt,
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V5_TARGET_SLICE',
    source_artifact: 'docs/checkpoints/warehouse/prize_pack_evidence_v5_input.json',
    coverage_window_candidates: target.window_candidates,
    selected_window: {
      id: target.selected_window.id,
      label: target.selected_window.label,
      series: target.selected_window.series,
      row_count: target.selected_window.row_count,
    },
    selected_set_clusters: target.selected_set_clusters,
    shared_question: targetQuestion,
    rows: reclassifiedSliceRows,
  };
  await writeJson(V5_TARGET_SLICE_PATH, targetSliceArtifact);

  const readyRows = reclassifiedSliceRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE');
  const doNotCanonRows = reclassifiedSliceRows.filter((row) => row.final_decision === 'DO_NOT_CANON');
  const stillWaitRows = reclassifiedSliceRows.filter((row) => row.final_decision === 'WAIT');

  const touchedIds = new Set(reclassifiedSliceRows.map((row) => row.source_external_id));
  const untouchedWaitRows = currentWaitRows.filter((row) => !touchedIds.has(row.source_external_id));
  const remainingWaitRows = [
    ...untouchedWaitRows.map((row) => ({
      ...row,
      remaining_reason:
        row.current_blocker_class === 'BASE_ROUTE_AMBIGUOUS'
          ? 'BASE_ROUTE_AMBIGUOUS'
          : 'NO_SERIES_CONFIRMATION_UNINVESTIGATED',
    })),
    ...stillWaitRows.map((row) => ({
      ...row,
      remaining_reason:
        row.decision_code === 'single_series_match_but_best_evidence_tier_remains_tier_3_v5'
          ? 'SINGLE_SERIES_MATCH_COMMUNITY_ONLY'
          : 'NO_SERIES_CONFIRMATION',
    })),
  ];

  const recommendedNextExecutionStep = readyRows.length > 0
    ? 'PRIZE_PACK_READY_BATCH_V6'
    : remainingWaitRows.some((row) => row.current_blocker_class === 'NO_SERIES_CONFIRMATION')
      ? 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V6'
      : 'PRIZE_PACK_BASE_ROUTE_REPAIR_V1';

  const report = {
    generated_at: generatedAt,
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V5',
    scope: {
      source_domain: 'Prize Pack family-only backlog',
      target_slice_only: true,
      no_canon_writes: true,
      no_mapping_writes: true,
      no_image_writes: true,
      no_rule_mutation: true,
    },
    source_artifacts: [
      'docs/checkpoints/warehouse/prize_pack_evidence_v4_input.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_v4.json',
      'docs/checkpoints/warehouse/prize_pack_ready_batch_v5.json',
    ],
    current_backlog: currentBacklog,
    coverage_window_candidates: target.window_candidates,
    target_slice: {
      coverage_window: target.selected_window.label,
      slice_size: reclassifiedSliceRows.length,
      question: targetQuestion,
      selected_set_codes: target.selected_set_clusters.map((cluster) => cluster.effective_set_code),
      selected_set_names: target.selected_set_clusters.map(
        (cluster) => cluster.effective_set_name ?? cluster.effective_set_code,
      ),
    },
    evidence_sources_used: [
      'Bulbapedia Prize Pack Series One raw card list (community transcription of the cited official card list)',
      'Bulbapedia Prize Pack Series Two raw card list (community transcription of the cited official card list)',
      'Resolved official checklist URLs for Series 1 and Series 2 as reference targets; local fetch remains bot-gated',
      'Existing Prize Pack evidence V4 input and Batch 5 closure artifacts',
    ],
    sources_checked: SERIES_SOURCES,
    summary: {
      rows_investigated: reclassifiedSliceRows.length,
      ready_for_warehouse: readyRows.length,
      do_not_canon: doNotCanonRows.length,
      wait: stillWaitRows.length,
      matched_series_patterns: countBy(
        reclassifiedSliceRows,
        (row) => row.matched_series_pattern,
      ),
    },
    ready_rows: readyRows,
    do_not_canon_rows: doNotCanonRows,
    still_wait_rows: stillWaitRows,
    remaining_backlog: {
      wait_for_more_evidence: remainingWaitRows.length,
      do_not_canon_total_after_v5:
        (v4.remaining_backlog?.do_not_canon_total_after_v4 ?? 0) + doNotCanonRows.length,
      already_promoted_total: currentBacklog.already_promoted_total,
      wait_reason_counts: countBy(remainingWaitRows, (row) => row.remaining_reason),
    },
    ready_batch_v6_candidate: {
      row_count: readyRows.length,
      path: readyRows.length > 0 ? 'docs/checkpoints/warehouse/prize_pack_ready_batch_v6_candidate.json' : null,
    },
    recommended_next_execution_step: recommendedNextExecutionStep,
  };

  await writeJson(V5_OUTPUT_PATH, report);
  await fs.writeFile(V5_MD_PATH, buildMarkdown(report), 'utf8');

  if (readyRows.length > 0) {
    await writeJson(V6_CANDIDATE_PATH, buildReadyBatchCandidate(readyRows));
  }
}

await main();
