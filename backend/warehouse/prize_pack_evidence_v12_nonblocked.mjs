import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const V11_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v11_nonblocked_input.json');
const V11_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v11_nonblocked.json');
const READY_BATCH_V11_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v11_nonblocked.json',
);
const ROUTE_REPAIR_V2_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_base_route_repair_v2.json');
const ROUTE_REPAIR_V3_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_base_route_repair_v3.json');
const ROUTE_REPAIR_V5_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_base_route_repair_v5.json');
const ROUTE_REPAIR_V6_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_base_route_repair_v6.json');

const INPUT_JSON_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v12_input.json');
const TARGET_SLICE_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v12_target_slice.json',
);
const OUTPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v12_nonblocked.json',
);
const OUTPUT_MD_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v12_nonblocked.md',
);
const READY_BATCH_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v12_candidate.json',
);

const TIER_RANK = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
};

const ACQUISITION_BLOCK_REASON =
  'This row was explicitly excluded from the nonblocked pass because the next truthful upgrade step depends on official Series 1/2 checklist acquisition.';
const SPECIAL_FAMILY_EXCLUSION_REASON =
  'This row remains outside V12 because it is the unresolved SPECIAL_IDENTITY_FAMILY_COLLISION case, not part of the current evidence slice.';
const SPECIAL_FAMILY_SOURCE_EXTERNAL_ID =
  'pokemon-prize-pack-series-cards-team-rocket-s-mewtwo-ex-double-rare';

const TARGET_SLICE = {
  id: 'SV6PT5_SHROUDED_FABLE_SERIES_5_TO_8_WINDOW',
  label: 'Shrouded Fable Series 5-8 Single-Series Window',
  series: [5, 6, 7, 8],
  set_codes: ['sv6pt5'],
  source_family: 'prize-pack-series-cards-pokemon',
  shared_question:
    'Across currently accessible Prize Pack Series 5-8 sources, do these Shrouded Fable rows appear in exactly one corroborated series or multiple?',
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

const SET_NAME_BY_CODE = {
  sv6pt5: 'Shrouded Fable',
  sv4pt5: 'Paldean Fates',
  'swsh3.5': "Champion's Path",
  swsh1: 'Sword & Shield',
  swsh7: 'Evolving Skies',
  swsh9: 'Brilliant Stars',
  sv01: 'Scarlet & Violet',
  sv8pt5: 'Prismatic Evolutions',
  sv10: 'Destined Rivals',
  me01: '151',
  sve: 'Scarlet & Violet Energies',
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
    .replace(/\s*-\s*mee\d+\s*$/g, '')
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
    .replace(/\s*-\s*mee\d+\s*$/gi, '')
    .trim();
}

function stableSortRows(rows) {
  return [...rows].sort((a, b) => {
    const left = [
      a.current_blocker_class ?? '',
      a.set_code ?? a.effective_set_code ?? '',
      a.printed_number ?? '',
      cleanDisplayName(a.base_card_name ?? a.candidate_name ?? a.name ?? ''),
      a.source_external_id ?? '',
    ].join('::');
    const right = [
      b.current_blocker_class ?? '',
      b.set_code ?? b.effective_set_code ?? '',
      b.printed_number ?? '',
      cleanDisplayName(b.base_card_name ?? b.candidate_name ?? b.name ?? ''),
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

function rowId(row) {
  return row?.source_external_id ?? row?.source_external_ids?.[0] ?? null;
}

function ownerFromRepairRow(row) {
  return (
    row?.exact_printed_identity_owner ??
    row?.route_resolved_owner ??
    row?.resolved_owner ??
    row?.base_owner ??
    {}
  );
}

function buildRemovalSet({ v11, readyBatchV11, routeRepairs }) {
  return new Set(
    [
      ...(v11.ready_rows || []).map(rowId),
      ...(v11.do_not_canon_rows || []).map(rowId),
      ...((readyBatchV11.rows || []).map(rowId)),
      ...routeRepairs.flatMap((repair) => (repair.do_not_canon_rows || []).map(rowId)),
    ].filter(Boolean),
  );
}

function buildRouteResolutionMap(routeRepairs) {
  const map = new Map();
  for (const repair of routeRepairs) {
    for (const row of repair.route_resolved_wait_rows || []) {
      const id = rowId(row);
      if (id) map.set(id, row);
    }
  }
  return map;
}

function buildCurrentWaitRows({ v11Input, removalSet, routeResolutionMap }) {
  return stableSortRows(
    (v11Input.rows || [])
      .filter((row) => !removalSet.has(row.source_external_id))
      .map((row) => {
        const out = {
          ...row,
          candidate_name: row.candidate_name ?? row.name,
          normalized_number_plain:
            row.normalized_number_plain ?? normalizeNumberPlain(row.printed_number),
          prior_evidence_pass_history: [...(row.previous_evidence_pass_history ?? [])],
        };

        if (row.source_external_id === SPECIAL_FAMILY_SOURCE_EXTERNAL_ID) {
          out.current_blocker_class = 'SPECIAL_IDENTITY_FAMILY_COLLISION';
          out.special_family_exclusion_reason = SPECIAL_FAMILY_EXCLUSION_REASON;
          return out;
        }

        const repair = routeResolutionMap.get(row.source_external_id);
        if (repair) {
          const owner = ownerFromRepairRow(repair);
          out.current_blocker_class = 'NO_SERIES_CONFIRMATION';
          out.unique_base_route = true;
          out.base_gv_id = owner.gv_id || out.base_gv_id || null;
          out.base_route = owner.gv_id || out.base_route || null;
          out.base_card_name = owner.name || out.base_card_name || out.candidate_name;
          out.effective_set_code = owner.set_code || out.effective_set_code || out.set_code || null;
          out.effective_set_name =
            SET_NAME_BY_CODE[out.effective_set_code] || out.effective_set_name || null;
          out.why_blocked =
            'The row still lacks deterministic series corroboration across the supported Prize Pack coverage window.';
          out.blocker_detail = 'source_family_plus_unique_base_only';
          out.cluster_name = 'SOURCE_PLUS_UNIQUE_BASE_ONLY';
          out.route_resolution_source =
            repair.cluster_name || repair.ambiguity_type || 'route_repair';
          out.route_notes = repair.decision_reason || repair.route_notes || null;
          out.prior_evidence_pass_history = [
            ...new Set([
              ...out.prior_evidence_pass_history,
              ...(repair.prior_route_repair_history ?? []),
            ]),
          ];
        }

        out.effective_base_owner_gv_id = out.base_gv_id ?? null;
        out.set_code = out.effective_set_code ?? out.set_code ?? null;
        if (!out.effective_set_name && out.set_code) {
          out.effective_set_name = SET_NAME_BY_CODE[out.set_code] ?? null;
        }

        return out;
      }),
  );
}

async function fetchSeriesPage(source) {
  const response = await fetch(source.raw_url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV12Nonblocked/1.0)',
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

function getSetMatchTokens(row) {
  const tokens = new Set();
  const effectiveSetName = normalizeText(row.effective_set_name);
  if (effectiveSetName) tokens.add(effectiveSetName);

  const setCode = (row.set_code ?? row.effective_set_code ?? '').toLowerCase();
  if (setCode === 'sv6pt5') tokens.add('shrouded fable');
  if (setCode === 'sv4pt5') tokens.add('paldean fates');
  if (setCode === 'sve') tokens.add('sve basic energies');

  return [...tokens].filter(Boolean);
}

function lineMatchesSeriesRow(line, row) {
  const requiredName = normalizeName(row.base_card_name ?? row.candidate_name ?? row.name);
  const requiredNumber = normalizeText(row.printed_number);
  const setTokens = getSetMatchTokens(row);

  return (
    line.includes(requiredName) &&
    line.includes(requiredNumber) &&
    (setTokens.length === 0 || setTokens.some((token) => line.includes(token)))
  );
}

function matchRowAgainstSources(row, seriesPages) {
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

function chooseTargetSlice(waitRows) {
  const rows = stableSortRows(
    waitRows.filter(
      (row) =>
        row.current_blocker_class === 'NO_SERIES_CONFIRMATION' &&
        !row.blocked_by_official_acquisition &&
        row.source_external_id !== SPECIAL_FAMILY_SOURCE_EXTERNAL_ID &&
        row.source_family === TARGET_SLICE.source_family &&
        TARGET_SLICE.set_codes.includes(row.set_code) &&
        row.effective_base_owner_gv_id,
    ),
  );

  if (rows.length === 0) {
    throw new Error('No coherent nonblocked target slice could be formed for V12.');
  }

  return {
    ...TARGET_SLICE,
    row_count: rows.length,
    rows,
    set_code_counts: countBy(rows, (row) => row.set_code ?? 'unknown'),
  };
}

function buildFinalDecision(row, matchedSeries) {
  if (matchedSeries.length > 1) {
    return {
      final_evidence_class: 'DUPLICATE_REPRINT',
      final_decision: 'DO_NOT_CANON',
      decision_code: 'multi_series_duplicate_confirmed_by_v12_nonblocked',
      final_reason:
        'Accessible evidence proves this Shrouded Fable row appears in more than one Prize Pack series with no printed distinction, so the generic Play! Pokémon stamp is distribution-only.',
    };
  }

  if (matchedSeries.length === 1) {
    return {
      final_evidence_class: 'CONFIRMED_IDENTITY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_series_confirmed_by_v12_nonblocked_shrouded_fable_window',
      final_reason:
        'Accessible evidence places this Shrouded Fable row in exactly one corroborated Prize Pack series across the reachable Series 5-8 window, so the generic Play! Pokémon stamp resolves to one deterministic canonical stamped identity.',
    };
  }

  return {
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_accessible_series_match_after_v12_nonblocked',
    final_reason:
      'Accessible sources do not yet place this row in one deterministic Prize Pack series, so it remains in the evidence backlog.',
    };
}

function buildTargetSliceRows(rows, seriesPages) {
  const slicePages = seriesPages.filter((page) => TARGET_SLICE.series.includes(page.series));

  return stableSortRows(rows).map((row) => {
    const match = matchRowAgainstSources(row, slicePages);
    const final = buildFinalDecision(row, match.matched_series);
    const bestTierRank = Math.min(
      strongestTierRankFromSources(row.evidence_sources),
      strongestTierRankFromSources(match.matching_evidence),
    );

    return {
      ...row,
      accessible_series_checked: TARGET_SLICE.series,
      missing_series_checked: TARGET_SLICE.series,
      evidence_sources_used_for_v12_nonblocked: match.matching_evidence,
      confirmed_series_coverage: match.matched_series,
      matched_series_pattern:
        match.matched_series.length > 0 ? `[${match.matched_series.join(',')}]` : '[]',
      final_evidence_tier: rankToTier(bestTierRank),
      previous_evidence_pass_history: [
        ...new Set([
          ...(row.prior_evidence_pass_history ?? []),
          'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V12_NONBLOCKED',
        ]),
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
    name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
    candidate_name: row.candidate_name ?? row.name,
    printed_number: row.printed_number,
    normalized_number_plain:
      row.normalized_number_plain ?? normalizeNumberPlain(row.printed_number),
    variant_key: 'play_pokemon_stamp',
    governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
    evidence_class: row.final_evidence_class,
    evidence_tier: row.final_evidence_tier,
    confirmed_series_coverage: row.confirmed_series_coverage,
    effective_set_code: row.set_code ?? row.effective_set_code,
    effective_set_name: row.effective_set_name,
    underlying_base_proof: {
      base_gv_id: row.effective_base_owner_gv_id ?? row.base_gv_id,
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
        base_gv_id: row.effective_base_owner_gv_id ?? row.base_gv_id,
        base_route: row.base_route,
      },
      effective_routed_set_code: row.set_code ?? row.effective_set_code,
      governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
    },
  }));
}

function representativeRows({ readyRows, doNotCanonRows, remainingWaitRows, acquisitionBlockedRows, specialRows }) {
  return [
    ...readyRows.slice(0, 6).map((row) => ({
      bucket: 'READY_FOR_WAREHOUSE',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.set_code ?? row.effective_set_code,
      matched_series_pattern: row.matched_series_pattern,
      source_external_id: row.source_external_id,
    })),
    ...doNotCanonRows.slice(0, 6).map((row) => ({
      bucket: 'DO_NOT_CANON',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.set_code ?? row.effective_set_code,
      matched_series_pattern: row.matched_series_pattern,
      source_external_id: row.source_external_id,
    })),
    ...remainingWaitRows
      .filter(
        (row) =>
          row.current_blocker_class === 'NO_SERIES_CONFIRMATION' &&
          !row.blocked_by_official_acquisition,
      )
      .slice(0, 4)
      .map((row) => ({
        bucket: 'WAIT',
        name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
        printed_number: row.printed_number,
        set_code: row.set_code ?? row.effective_set_code,
        source_external_id: row.source_external_id,
      })),
    ...acquisitionBlockedRows.slice(0, 4).map((row) => ({
      bucket: 'EXCLUDED_ACQUISITION_BLOCKED',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.set_code ?? row.effective_set_code,
      source_external_id: row.source_external_id,
    })),
    ...specialRows.slice(0, 1).map((row) => ({
      bucket: 'EXCLUDED_SPECIAL_FAMILY',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.set_code ?? row.effective_set_code,
      source_external_id: row.source_external_id,
    })),
  ];
}

function buildMarkdown(report) {
  const lines = [
    '# Prize Pack Evidence V12 Nonblocked',
    '',
    `- Generated at: ${report.generated_at}`,
    `- Workflow: ${report.workflow}`,
    '',
    '## Current Backlog',
    '',
    `- WAIT_FOR_MORE_EVIDENCE: ${report.current_backlog.wait_for_more_evidence}`,
    `- WAIT / NO_SERIES_CONFIRMATION: ${report.current_backlog.wait_no_series_confirmation}`,
    `- SPECIAL_IDENTITY_FAMILY_COLLISION: ${report.current_backlog.special_identity_family_collision}`,
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
  lines.push(
    `- excluded acquisition-blocked: ${report.summary.excluded_acquisition_blocked}`,
  );
  lines.push(`- excluded special-family: ${report.summary.excluded_special_family}`);
  lines.push('');

  lines.push('## Newly READY');
  lines.push('');
  if (report.ready_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.ready_rows) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name)} | ${row.printed_number} | ${row.set_code} | ${row.matched_series_pattern}`,
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
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name)} | ${row.printed_number} | ${row.set_code} | ${row.matched_series_pattern}`,
      );
    }
  }

  lines.push('');
  lines.push('## Still WAIT in Slice');
  lines.push('');
  if (report.still_wait_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.still_wait_rows) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name)} | ${row.printed_number} | ${row.set_code} | ${row.final_reason}`,
      );
    }
  }

  lines.push('');
  lines.push('## Excluded Rows');
  lines.push('');
  for (const row of report.representative_rows.filter((row) =>
    row.bucket === 'EXCLUDED_ACQUISITION_BLOCKED' || row.bucket === 'EXCLUDED_SPECIAL_FAMILY')) {
    lines.push(
      `- ${row.bucket}: ${row.name} | ${row.printed_number} | ${row.set_code ?? 'unknown'}`,
    );
  }

  lines.push('');
  lines.push('## Next Step');
  lines.push('');
  lines.push(`- ${report.recommended_next_execution_step}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function main() {
  const [v11Input, v11, readyBatchV11, routeRepairV2, routeRepairV3, routeRepairV5, routeRepairV6] =
    await Promise.all([
      readJson(V11_INPUT_PATH),
      readJson(V11_PATH),
      readJson(READY_BATCH_V11_PATH),
      readJson(ROUTE_REPAIR_V2_PATH),
      readJson(ROUTE_REPAIR_V3_PATH),
      readJson(ROUTE_REPAIR_V5_PATH),
      readJson(ROUTE_REPAIR_V6_PATH),
    ]);

  const routeRepairs = [routeRepairV2, routeRepairV3, routeRepairV5, routeRepairV6];
  const removalSet = buildRemovalSet({ v11, readyBatchV11, routeRepairs });
  const routeResolutionMap = buildRouteResolutionMap(routeRepairs);
  const currentWaitRows = buildCurrentWaitRows({
    v11Input,
    removalSet,
    routeResolutionMap,
  });

  const allSeriesPages = await Promise.all(SERIES_SOURCES.map(fetchSeriesPage));
  const acquisitionBlockedRows = stableSortRows(
    currentWaitRows.filter((row) => row.blocked_by_official_acquisition),
  );
  const specialRows = stableSortRows(
    currentWaitRows.filter((row) => row.current_blocker_class === 'SPECIAL_IDENTITY_FAMILY_COLLISION'),
  );

  const currentDoNotCanonTotal =
    readyBatchV11.post_batch_prize_pack_status?.do_not_canon_rows ??
    routeRepairV6.current_prize_pack_state?.do_not_canon_rows ??
    v11.current_backlog?.do_not_canon_total ??
    0;
  const promotedTotal =
    readyBatchV11.post_batch_prize_pack_status?.promoted_prize_pack_total_after_v11_nonblocked ??
    routeRepairV6.current_prize_pack_state?.promoted_prize_pack_total ??
    0;

  const inputArtifact = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V12_NONBLOCKED',
    source_artifacts: [
      relativeCheckpointPath(V11_INPUT_PATH),
      relativeCheckpointPath(V11_PATH),
      relativeCheckpointPath(READY_BATCH_V11_PATH),
      relativeCheckpointPath(ROUTE_REPAIR_V2_PATH),
      relativeCheckpointPath(ROUTE_REPAIR_V3_PATH),
      relativeCheckpointPath(ROUTE_REPAIR_V5_PATH),
      relativeCheckpointPath(ROUTE_REPAIR_V6_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence: currentWaitRows.length,
      wait_no_series_confirmation: currentWaitRows.filter(
        (row) => row.current_blocker_class === 'NO_SERIES_CONFIRMATION',
      ).length,
      special_identity_family_collision: specialRows.length,
      do_not_canon_total: currentDoNotCanonTotal,
      already_promoted_total: promotedTotal,
      blocked_by_official_acquisition: acquisitionBlockedRows.length,
    },
    blocker_counts: countBy(currentWaitRows, (row) => row.current_blocker_class ?? 'UNKNOWN'),
    rows: currentWaitRows.map((row) => ({
      candidate_name: row.candidate_name ?? row.name,
      printed_number: row.printed_number,
      effective_base_owner_gv_id: row.effective_base_owner_gv_id ?? row.base_gv_id ?? null,
      set_code: row.set_code ?? row.effective_set_code ?? null,
      source_family: row.source_family,
      source_external_id: row.source_external_id,
      current_blocker_class: row.current_blocker_class,
      evidence_tier: row.evidence_tier ?? 'TIER_4',
      known_series_appearances:
        row.confirmed_series_coverage ?? row.known_series_appearances ?? [],
      missing_series_checked: row.missing_series_checked ?? [],
      prior_evidence_pass_history: row.prior_evidence_pass_history ?? [],
      blocked_by_official_acquisition: row.blocked_by_official_acquisition ?? false,
    })),
  };
  await writeJson(INPUT_JSON_PATH, inputArtifact);

  const targetSlice = chooseTargetSlice(currentWaitRows);
  const targetRows = buildTargetSliceRows(targetSlice.rows, allSeriesPages);
  const readyRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE'));
  const doNotCanonRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'DO_NOT_CANON'));
  const stillWaitRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'WAIT'));

  const targetSliceArtifact = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V12_NONBLOCKED',
    selection_summary: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetSlice.row_count,
      set_code_counts: targetSlice.set_code_counts,
      excluded_blocked_by_official_acquisition_count: acquisitionBlockedRows.length,
      excluded_special_family_count: specialRows.length,
    },
    shared_question: targetSlice.shared_question,
    evidence_sources_used: allSeriesPages
      .filter((page) => TARGET_SLICE.series.includes(page.series))
      .map((page) => ({
        series: page.series,
        source_name: page.source_name,
        source_type: page.source_type,
        evidence_tier: page.evidence_tier,
        source_url: page.source_url,
      })),
    rows: targetRows,
  };
  await writeJson(TARGET_SLICE_JSON_PATH, targetSliceArtifact);

  await removeFileIfExists(READY_BATCH_CANDIDATE_PATH);
  if (readyRows.length > 0) {
    await writeJson(READY_BATCH_CANDIDATE_PATH, {
      generated_at: new Date().toISOString(),
      workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V12_NONBLOCKED',
      source_artifact: relativeCheckpointPath(OUTPUT_JSON_PATH),
      row_count: readyRows.length,
      rows: buildReadyBatchCandidate(readyRows),
    });
  }

  const remainingWaitRows = stableSortRows(
    currentWaitRows.filter(
      (row) =>
        !targetRows.some((target) => target.source_external_id === row.source_external_id),
    ),
  );

  const report = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V12_NONBLOCKED',
    scope: 'One bounded Prize Pack slice using currently accessible evidence only after route repair V6.',
    source_artifacts: [
      relativeCheckpointPath(V11_INPUT_PATH),
      relativeCheckpointPath(V11_PATH),
      relativeCheckpointPath(READY_BATCH_V11_PATH),
      relativeCheckpointPath(ROUTE_REPAIR_V2_PATH),
      relativeCheckpointPath(ROUTE_REPAIR_V3_PATH),
      relativeCheckpointPath(ROUTE_REPAIR_V5_PATH),
      relativeCheckpointPath(ROUTE_REPAIR_V6_PATH),
      relativeCheckpointPath(INPUT_JSON_PATH),
      relativeCheckpointPath(TARGET_SLICE_JSON_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence: currentWaitRows.length,
      wait_no_series_confirmation: currentWaitRows.filter(
        (row) => row.current_blocker_class === 'NO_SERIES_CONFIRMATION',
      ).length,
      special_identity_family_collision: specialRows.length,
      do_not_canon_total: currentDoNotCanonTotal,
      already_promoted_total: promotedTotal,
      blocked_by_official_acquisition: acquisitionBlockedRows.length,
    },
    target_slice: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetSlice.row_count,
      shared_question: targetSlice.shared_question,
      set_code_counts: targetSlice.set_code_counts,
    },
    evidence_sources_used: allSeriesPages
      .filter((page) => TARGET_SLICE.series.includes(page.series))
      .map((page) => ({
        series: page.series,
        source_name: page.source_name,
        source_type: page.source_type,
        evidence_tier: page.evidence_tier,
        source_url: page.source_url,
      })),
    sources_checked: allSeriesPages.map((page) => ({
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
      excluded_acquisition_blocked: acquisitionBlockedRows.length,
      excluded_special_family: specialRows.length,
      matched_series_patterns: countBy(targetRows, (row) => row.matched_series_pattern ?? '[]'),
    },
    ready_rows: readyRows,
    do_not_canon_rows: doNotCanonRows,
    still_wait_rows: stillWaitRows,
    excluded_rows: [
      ...acquisitionBlockedRows.map((row) => ({
        ...row,
        exclusion_reason: row.blocked_by_official_acquisition_reason ?? ACQUISITION_BLOCK_REASON,
      })),
      ...specialRows.map((row) => ({
        ...row,
        exclusion_reason: SPECIAL_FAMILY_EXCLUSION_REASON,
      })),
    ],
    representative_rows: representativeRows({
      readyRows,
      doNotCanonRows,
      remainingWaitRows,
      acquisitionBlockedRows,
      specialRows,
    }),
    remaining_backlog: {
      wait_for_more_evidence: currentWaitRows.length - readyRows.length - doNotCanonRows.length,
      wait_no_series_confirmation:
        currentWaitRows.filter((row) => row.current_blocker_class === 'NO_SERIES_CONFIRMATION')
          .length -
        readyRows.length -
        doNotCanonRows.length,
      special_identity_family_collision_remaining: specialRows.length,
      do_not_canon_total_after_v12_nonblocked: currentDoNotCanonTotal + doNotCanonRows.length,
      already_promoted_total: promotedTotal,
      blocked_by_official_acquisition_remaining: acquisitionBlockedRows.length,
    },
    recommended_next_execution_step:
      readyRows.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V12'
        : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V13_NONBLOCKED',
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');
}

await main();
