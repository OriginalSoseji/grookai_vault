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
const READY_BATCH_V4_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v4.json');
const INPUT_JSON_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v4_input.json');
const TARGET_SLICE_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v4_target_slice.json',
);
const OUTPUT_JSON_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v4.json');
const OUTPUT_MD_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v4.md');
const READY_BATCH_V5_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v5_candidate.json',
);

const TIER_RANK = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
};

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
  {
    series: 4,
    source_name: 'Bulbapedia Prize Pack Series Four',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Four_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Four_(TCG)&action=raw',
  },
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
  {
    series: 7,
    source_name: 'Bulbapedia Prize Pack Series Seven',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Seven_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Seven_(TCG)&action=raw',
  },
  {
    series: 8,
    source_name: 'Bulbapedia Prize Pack Series Eight',
    source_type: 'bulbapedia_card_list',
    evidence_tier: 'TIER_3',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Eight_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Eight_(TCG)&action=raw',
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
      a.normalized_base_name ?? a.candidate_name ?? '',
      a.source_external_id ?? '',
    ].join('::');
    const right = [
      b.effective_set_code ?? '',
      b.printed_number ?? '',
      b.normalized_base_name ?? b.candidate_name ?? '',
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

function uniqueSortedNumbers(values) {
  return [...new Set(values)].sort((a, b) => a - b);
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

function nonEmpty(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function buildCanonicalQueueKey(row) {
  return [
    row.effective_set_code ?? 'unknown',
    row.normalized_base_name ?? row.candidate_name ?? 'unknown',
    row.printed_number ?? 'unknown',
    'play_pokemon_stamp',
  ].join('::');
}

function buildResearchLinks(row, inspectionRow) {
  if (inspectionRow?.research_links) return inspectionRow.research_links;
  const query = [
    nonEmpty(row.normalized_base_name || row.candidate_name),
    nonEmpty(row.printed_number),
    'Prize Pack',
    'Play! Pokemon',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    justtcg_url: null,
    tcgdex_url:
      row.effective_set_code && row.normalized_number_plain
        ? `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(
            `${row.effective_set_code}-${row.normalized_number_plain.padStart(3, '0')}`,
          )}`
        : null,
    google_search_url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    bulbapedia_search_url: `https://bulbapedia.bulbagarden.net/w/index.php?search=${encodeURIComponent(
      query,
    )}`,
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildCurrentWaitRows({
  v2,
  corroboration,
  v3,
}) {
  const corroboratedIds = new Set(
    [
      ...(corroboration.ready_rows || []),
      ...(corroboration.do_not_canon_rows || []),
      ...(corroboration.unresolved_rows || []),
    ].map((row) => row.source_external_id),
  );
  const v3ReadyIds = new Set((v3.ready_rows || []).map((row) => row.source_external_id));
  const v3DoNotCanonIds = new Set(
    (v3.do_not_canon_rows || []).map((row) => row.source_external_id),
  );
  const v3StillWaitByExternalId = new Map(
    (v3.still_wait_rows || []).map((row) => [row.source_external_id, row]),
  );

  const untouchedWaitRows = (v2.row_outcomes || [])
    .filter(
      (row) =>
        row.next_action_v2 === 'WAIT' &&
        !corroboratedIds.has(row.source_external_id) &&
        !v3ReadyIds.has(row.source_external_id) &&
        !v3DoNotCanonIds.has(row.source_external_id) &&
        !v3StillWaitByExternalId.has(row.source_external_id),
    )
    .map((row) => ({
      source: row.source,
      source_set_id: row.source_set_id,
      source_external_id: row.source_external_id,
      candidate_name: row.candidate_name,
      printed_number: row.printed_number,
      normalized_number_plain:
        row.normalized_number_plain ?? normalizeNumberPlain(row.printed_number),
      base_gv_id: row.base_gv_id,
      base_route: row.base_card_id,
      base_card_print_id: null,
      base_card_name: row.normalized_base_name ?? row.candidate_name,
      current_blocker_class:
        row.decision_reason_v2 === 'base_route_ambiguous_or_missing'
          ? 'BASE_ROUTE_AMBIGUOUS'
          : 'NO_SERIES_CONFIRMATION',
      evidence_tier: row.evidence_tier,
      known_series_appearances: row.appearance_in_series ?? [],
      missing_series_checked:
        row.full_supported_coverage === true
          ? []
          : row.decision_reason_v2 ===
              'single_series_match_but_series_1_to_3_coverage_not_resolved_for_this_base_set'
            ? [1, 2, 3]
            : [],
      source_family: row.source_set_id,
      source_tcgplayer_id: null,
      image_url: null,
      image_source: null,
      variant_hint: 'play_pokemon_stamp',
      stamp_label: 'Play! Pokémon Stamp',
      why_blocked:
        row.decision_reason_v2 === 'base_route_ambiguous_or_missing'
          ? 'The row still lacks one deterministic underlying base route.'
          : 'The row still lacks deterministic series corroboration across the supported Prize Pack coverage window.',
      blocker_detail: row.blocker ?? null,
      cluster_name:
        row.decision_reason_v2 === 'base_route_ambiguous_or_missing'
          ? 'BASE_ROUTE_AMBIGUOUS'
          : 'SOURCE_PLUS_UNIQUE_BASE_ONLY',
      decision_reason_v2: row.decision_reason_v2,
      unique_base_route: row.unique_base_route,
      duplicate_occurrence_count: row.duplicate_occurrence_count ?? 0,
      earliest_possible_series: row.earliest_possible_series ?? null,
      effective_set_code: row.effective_set_code,
      effective_set_name: row.effective_set_name,
      evidence_sources: row.evidence_sources_v2 ?? [],
      research_links: buildResearchLinks(row, null),
      previous_evidence_pass_history: [
        {
          pass: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V2',
          outcome: 'WAIT',
          decision_code: row.decision_reason_v2,
        },
      ],
    }));

  return stableSortRows(
    [
      ...untouchedWaitRows,
      ...(v3.still_wait_rows || []).map((row) => ({
        ...row,
        source_family: row.source_family ?? row.source_set_id,
        previous_evidence_pass_history: [
          {
            pass: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V2',
            outcome: 'WAIT',
            decision_code: row.decision_reason_v2 ?? 'no_external_series_confirmation_yet',
          },
          {
            pass: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V3',
            outcome: 'WAIT',
            decision_code: row.decision_code,
          },
        ],
      })),
    ],
  );
}

function chooseTargetSlice(waitRows) {
  const candidateRows = waitRows.filter(
    (row) =>
      row.current_blocker_class === 'NO_SERIES_CONFIRMATION' &&
      row.unique_base_route &&
      row.base_gv_id &&
      row.effective_set_code,
  );

  const grouped = new Map();
  for (const row of candidateRows) {
    const key = row.effective_set_code;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  const clusters = [...grouped.entries()]
    .map(([effectiveSetCode, rows]) => ({
      effective_set_code: effectiveSetCode,
      effective_set_name: rows[0]?.effective_set_name ?? null,
      row_count: rows.length,
      rows: stableSortRows(rows),
    }))
    .sort((a, b) => {
      if (b.row_count !== a.row_count) return b.row_count - a.row_count;
      return a.effective_set_code.localeCompare(b.effective_set_code);
    });

  if (clusters.length === 0) {
    throw new Error('No coherent NO_SERIES_CONFIRMATION slice could be formed.');
  }

  return {
    selected_cluster: clusters[0],
    all_candidate_clusters: clusters.map(({ rows, ...rest }) => rest),
  };
}

async function fetchSeriesPages() {
  const pageMap = new Map();
  for (const source of SERIES_SOURCES) {
    const response = await fetch(source.raw_url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV4/1.0)',
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

function matchRowAgainstSeriesPages(row, seriesPages) {
  const matchedSeries = [];
  const matchingEvidence = [];

  for (const [series, page] of [...seriesPages.entries()].sort((a, b) => a[0] - b[0])) {
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
      matching_line: matchingLine,
    });
  }

  return {
    matched_series: matchedSeries,
    matching_evidence: matchingEvidence,
  };
}

function buildFinalDecision(row, matchedSeries) {
  if (!row.unique_base_route || !row.base_gv_id) {
    return {
      final_evidence_class: 'STILL_UNPROVEN',
      final_decision: 'WAIT',
      decision_code: 'base_route_still_ambiguous_after_v4',
      final_reason:
        'The slice evidence does not matter yet because the underlying base route is still ambiguous.',
    };
  }

  if (matchedSeries.length > 1) {
    return {
      final_evidence_class: 'DUPLICATE_REPRINT',
      final_decision: 'DO_NOT_CANON',
      decision_code: 'multi_series_duplicate_confirmed_by_v4_series_page_coverage',
      final_reason:
        'The card appears in multiple Prize Pack series with no printed series marker, so the generic Play! Pokémon stamp remains distribution-only rather than a distinct canonical split.',
    };
  }

  if (matchedSeries.length === 1) {
    return {
      final_evidence_class: 'CONFIRMED_IDENTITY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_series_confirmed_by_v4_series_page_coverage',
      final_reason:
        'The card appears in exactly one corroborated Prize Pack series across the checked Series 1-8 window, so the generic Play! Pokémon stamp resolves to one deterministic canonical stamped identity.',
    };
  }

  return {
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_series_match_after_v4_series_page_coverage',
    final_reason:
      'The checked series sources still do not place this card in any corroborated Prize Pack card list, so the row remains evidence-bound.',
  };
}

function buildTargetSliceRows(rows, seriesPages) {
  return stableSortRows(rows).map((row) => {
    const match = matchRowAgainstSeriesPages(row, seriesPages);
    const final = buildFinalDecision(row, match.matched_series);
    const bestTierRank = Math.min(
      strongestTierRankFromSources(row.evidence_sources),
      strongestTierRankFromSources(match.matching_evidence),
    );

    return {
      ...row,
      missing_series_checked: SERIES_SOURCES.map((source) => source.series),
      evidence_sources_used_for_v4: match.matching_evidence,
      confirmed_series_coverage: match.matched_series,
      matched_series_pattern:
        match.matched_series.length > 0 ? `[${match.matched_series.join(',')}]` : '[]',
      final_evidence_tier: rankToTier(bestTierRank),
      ...final,
    };
  });
}

function buildReadyBatchCandidate(readyRows) {
  const sorted = stableSortRows(readyRows);
  return {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_READY_BATCH_V5_CANDIDATE',
    status: sorted.length > 0 ? 'READY_SUBSET_IDENTIFIED' : 'NO_READY_ROWS',
    source_artifacts: [
      'docs/checkpoints/warehouse/prize_pack_evidence_v4.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_v4_target_slice.json',
    ],
    selection_summary: {
      row_count: sorted.length,
      governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      variant_key: 'play_pokemon_stamp',
      target_origin: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V4',
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
      evidence_sources_v4: [
        ...(row.evidence_sources ?? []),
        ...(row.evidence_sources_used_for_v4 ?? []),
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
      pre_intake_audit: {
        current_live_state: 'NOT_YET_AUDITED_IN_V4',
        blocker_class: null,
        live_source_candidate_id: null,
        live_base_card_print_id: row.base_card_print_id ?? null,
        live_base_gv_id: row.base_gv_id,
        live_existing_variant_card_print_id: null,
        live_existing_variant_gv_id: null,
        live_warehouse_candidate_id: null,
        live_warehouse_state: null,
        live_warehouse_hold_reason: null,
        live_promoted_card_print_id: null,
        evidence_tier: row.final_evidence_tier,
        supported_series_list: row.confirmed_series_coverage,
        confirmed_series_coverage: row.confirmed_series_coverage,
        exact_source_row_exists: true,
        exact_base_row_exists: true,
        exact_variant_absent: true,
      },
      research_links: row.research_links ?? null,
    })),
    recommended_next_execution_step:
      sorted.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V5'
        : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V5',
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Prize Pack Evidence V4');
  lines.push('');
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(
    'This pass recomputes the live Prize Pack wait pool after the earlier corroboration and ready-batch executions, then investigates one bounded unresolved slice with one shared evidence question.',
  );
  lines.push('');
  lines.push('## Recomputed Live Backlog');
  lines.push('');
  lines.push(`- wait_for_more_evidence: ${report.current_backlog.wait_for_more_evidence}`);
  lines.push(`- do_not_canon_total: ${report.current_backlog.do_not_canon_total}`);
  lines.push(`- already_promoted_prize_pack_total: ${report.current_backlog.already_promoted_total}`);
  lines.push('');
  lines.push('## Target Slice');
  lines.push('');
  lines.push(`- slice_size: ${report.target_slice.slice_size}`);
  lines.push(`- effective_set_code: ${report.target_slice.effective_set_code}`);
  lines.push(`- effective_set_name: ${report.target_slice.effective_set_name}`);
  lines.push(`- shared_question: ${report.target_slice.question}`);
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
  lines.push('## Matched Series Patterns');
  lines.push('');
  for (const [pattern, count] of Object.entries(report.summary.matched_series_patterns)) {
    lines.push(`- ${pattern}: ${count}`);
  }
  lines.push('');
  lines.push('## Newly READY_FOR_WAREHOUSE');
  lines.push('');
  for (const row of report.ready_rows.slice(0, 12)) {
    lines.push(
      `- ${row.base_card_name} | ${row.printed_number} | ${row.effective_set_code} | confirmed_series=${row.confirmed_series_coverage.join(', ')}`,
    );
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
  for (const row of report.still_wait_rows) {
    lines.push(
      `- ${row.base_card_name} | ${row.printed_number} | ${row.effective_set_code} | reason=${row.decision_code}`,
    );
  }
  lines.push('');
  lines.push('## Remaining Prize Pack Wait Pool');
  lines.push('');
  lines.push(`- remaining_wait_after_v4: ${report.remaining_backlog.wait_for_more_evidence}`);
  for (const [reason, count] of Object.entries(report.remaining_backlog.wait_reason_counts)) {
    lines.push(`- ${reason}: ${count}`);
  }
  lines.push('');
  lines.push('## Newly Unlocked Executable Subset');
  lines.push('');
  lines.push(
    `- prize_pack_ready_batch_v5_candidate_rows: ${report.ready_batch_v5_candidate.row_count}`,
  );
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push(`- ${report.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [v2, corroboration, v3, readyBatchV4] = await Promise.all([
    readJson(V2_PATH),
    readJson(CORROBORATION_V1_PATH),
    readJson(V3_PATH),
    readJson(READY_BATCH_V4_PATH),
  ]);

  const currentWaitRows = buildCurrentWaitRows({
    v2,
    corroboration,
    v3,
  });

  const currentBacklog = {
    wait_for_more_evidence: currentWaitRows.length,
    do_not_canon_total: v3.remaining_backlog?.do_not_canon_total_after_v3 ?? 0,
    already_promoted_total:
      (v3.current_backlog?.already_promoted_total ?? 0) +
      (readyBatchV4.batch_result?.batch_rows_promoted ?? 0),
  };

  const inputArtifact = {
    generated_at: generatedAt,
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V4_INPUT',
    source_artifacts: [
      'docs/checkpoints/warehouse/prize_pack_evidence_v2.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_corroboration_v1.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_v3.json',
      'docs/checkpoints/warehouse/prize_pack_ready_batch_v4.json',
    ],
    recomputed_counts: currentBacklog,
    rows: currentWaitRows,
  };
  await writeJson(INPUT_JSON_PATH, inputArtifact);

  const target = chooseTargetSlice(currentWaitRows);
  const targetQuestion = `For the ${target.selected_cluster.row_count} ${target.selected_cluster.effective_set_name} (${target.selected_cluster.effective_set_code}) Prize Pack family-only rows with unique base routes and no current series corroboration, do Prize Pack Series 1-8 card-list sources place each card in exactly one series, multiple series, or none?`;
  const seriesPages = await fetchSeriesPages();
  const reclassifiedSliceRows = buildTargetSliceRows(target.selected_cluster.rows, seriesPages);

  const targetSliceArtifact = {
    generated_at: generatedAt,
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V4_TARGET_SLICE',
    source_artifact: 'docs/checkpoints/warehouse/prize_pack_evidence_v4_input.json',
    target_slice_selection_priority: [
      'unique base route',
      'same effective set cluster',
      'same NO_SERIES_CONFIRMATION blocker class',
      'one shared missing series-corroboration question',
      'coherent by effective set code',
    ],
    candidate_clusters: target.all_candidate_clusters,
    selected_slice: {
      effective_set_code: target.selected_cluster.effective_set_code,
      effective_set_name: target.selected_cluster.effective_set_name,
      row_count: target.selected_cluster.row_count,
      question: targetQuestion,
    },
    rows: reclassifiedSliceRows,
  };
  await writeJson(TARGET_SLICE_JSON_PATH, targetSliceArtifact);

  const readyRows = reclassifiedSliceRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE');
  const doNotCanonRows = reclassifiedSliceRows.filter((row) => row.final_decision === 'DO_NOT_CANON');
  const stillWaitRows = reclassifiedSliceRows.filter((row) => row.final_decision === 'WAIT');
  const readyExternalIds = new Set(readyRows.map((row) => row.source_external_id));
  const doNotCanonExternalIds = new Set(doNotCanonRows.map((row) => row.source_external_id));
  const stillWaitExternalIds = new Set(stillWaitRows.map((row) => row.source_external_id));

  const remainingWaitPool = currentWaitRows.length - readyRows.length - doNotCanonRows.length;
  const remainingWaitRowsAfterV4 = currentWaitRows
    .filter(
      (row) =>
        !readyExternalIds.has(row.source_external_id) &&
        !doNotCanonExternalIds.has(row.source_external_id),
    )
    .map((row) => ({
      ...row,
      remaining_reason: stillWaitExternalIds.has(row.source_external_id)
        ? 'STILL_UNPROVEN_AFTER_V4_TARGET_SLICE'
        : row.current_blocker_class,
    }));

  const recommendedNextExecutionStep =
    readyRows.length > 0
      ? 'PRIZE_PACK_READY_BATCH_V5'
      : remainingWaitRowsAfterV4.some(
            (row) => row.current_blocker_class === 'NO_SERIES_CONFIRMATION',
          )
        ? 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V5'
        : 'PRIZE_PACK_BASE_ROUTE_REPAIR_V1';

  const report = {
    generated_at: generatedAt,
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V4',
    scope: {
      source_domain: 'Prize Pack family-only backlog',
      target_slice_only: true,
      no_canon_writes: true,
      no_mapping_writes: true,
      no_image_writes: true,
      no_rule_mutation: true,
    },
    source_artifacts: [
      'docs/checkpoints/warehouse/prize_pack_evidence_v2.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_corroboration_v1.json',
      'docs/checkpoints/warehouse/prize_pack_evidence_v3.json',
      'docs/checkpoints/warehouse/prize_pack_ready_batch_v4.json',
    ],
    current_backlog: currentBacklog,
    target_slice: {
      slice_size: reclassifiedSliceRows.length,
      effective_set_code: target.selected_cluster.effective_set_code,
      effective_set_name: target.selected_cluster.effective_set_name,
      question: targetQuestion,
    },
    evidence_sources_used: [
      'Existing Prize Pack V2/V3 evidence artifacts and Batch 4 closure artifact',
      ...SERIES_SOURCES.map(
        (source) => `${source.source_name} (${source.source_url})`,
      ),
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
      wait_for_more_evidence: remainingWaitPool,
      do_not_canon_total_after_v4: currentBacklog.do_not_canon_total + doNotCanonRows.length,
      already_promoted_total: currentBacklog.already_promoted_total,
      wait_reason_counts: countBy(
        remainingWaitRowsAfterV4,
        (row) => row.remaining_reason,
      ),
    },
    ready_batch_v5_candidate: {
      row_count: readyRows.length,
      path:
        readyRows.length > 0
          ? 'docs/checkpoints/warehouse/prize_pack_ready_batch_v5_candidate.json'
          : null,
    },
    recommended_next_execution_step: recommendedNextExecutionStep,
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');

  if (readyRows.length > 0) {
    await writeJson(READY_BATCH_V5_CANDIDATE_PATH, buildReadyBatchCandidate(readyRows));
  }
}

await main();
