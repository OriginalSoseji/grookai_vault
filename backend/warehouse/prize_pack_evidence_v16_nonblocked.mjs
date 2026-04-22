import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const V15_INPUT_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v15_nonblocked_input.json',
);
const V15_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v15_nonblocked.json');

const INPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v16_nonblocked_input.json',
);
const TARGET_SLICE_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v16_nonblocked_target_slice.json',
);
const OUTPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v16_nonblocked.json',
);
const OUTPUT_MD_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v16_nonblocked.md',
);
const READY_BATCH_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v16_nonblocked_candidate.json',
);

const SPECIAL_FAMILY_SOURCE_EXTERNAL_ID =
  'pokemon-prize-pack-series-cards-team-rocket-s-mewtwo-ex-double-rare';

const ACQUISITION_BLOCK_REASON =
  'Excluded from V16 because the next truthful step depends on blocked official Series 1/2 checklist acquisition.';

const TIER_RANK = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
};

const TARGET_SOURCE_EXTERNAL_IDS = new Set([
  'pokemon-prize-pack-series-cards-mystery-garden-ultra-rare',
  'pokemon-prize-pack-series-cards-raging-bolt-ex-123-162-wrong-image-double-rare',
  'pokemon-prize-pack-series-cards-cynthia-s-gible-common',
  'pokemon-prize-pack-series-cards-cynthia-s-gible-error-common',
  'pokemon-prize-pack-series-cards-carmine-uncommon',
]);

const TARGET_SLICE = {
  id: 'LATE_SV_ROUTE_NORMALIZED_SERIES_5_TO_8_WINDOW',
  label: 'Late SV Route-Normalized Series 5-8 Window',
  series: [5, 6, 7, 8],
  source_family: 'prize-pack-series-cards-pokemon',
  shared_question:
    'Across accessible Prize Pack Series 5-8 sources, do these late Scarlet & Violet route-normalized rows appear in exactly one corroborated series or multiple?',
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
  me01: 'Mega Evolution',
  sv05: 'Temporal Forces',
  sv8pt5: 'Prismatic Evolutions',
  sv10: 'Destined Rivals',
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
      a.set_code ?? '',
      a.printed_number ?? '',
      cleanDisplayName(a.candidate_name ?? a.name ?? ''),
      a.source_external_id ?? '',
    ].join('::');
    const right = [
      b.current_blocker_class ?? '',
      b.set_code ?? '',
      b.printed_number ?? '',
      cleanDisplayName(b.candidate_name ?? b.name ?? ''),
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

function strongestTierRankFromSources(sources) {
  let best = TIER_RANK.TIER_4;
  for (const source of sources ?? []) {
    best = Math.min(best, TIER_RANK[source.evidence_tier] ?? TIER_RANK.TIER_4);
  }
  return best;
}

function rankToTier(rank) {
  return Object.entries(TIER_RANK).find(([, value]) => value === rank)?.[0] ?? 'TIER_4';
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

function buildCurrentWaitRows({ v15Input, v15 }) {
  const removeIds = new Set(
    [
      ...(v15.ready_rows || []).map((row) => row.source_external_id),
      ...(v15.do_not_canon_rows || []).map((row) => row.source_external_id),
    ].filter(Boolean),
  );

  return stableSortRows(
    (v15Input.rows || [])
      .filter((row) => !removeIds.has(row.source_external_id))
      .map((row) => ({
        source: row.source ?? 'justtcg',
        source_set_id: row.source_set_id ?? 'prize-pack-series-cards-pokemon',
        source_external_id: row.source_external_id,
        source_family: row.source_family ?? 'prize-pack-series-cards-pokemon',
        candidate_name: cleanDisplayName(row.candidate_name ?? row.name ?? row.base_card_name),
        name: cleanDisplayName(row.candidate_name ?? row.name ?? row.base_card_name),
        base_card_name: cleanDisplayName(row.candidate_name ?? row.name ?? row.base_card_name),
        printed_number: row.printed_number,
        normalized_number_plain:
          row.normalized_number_plain ?? normalizeNumberPlain(row.printed_number),
        base_gv_id: row.base_gv_id ?? row.effective_base_owner_gv_id ?? null,
        base_route: row.base_gv_id ?? row.effective_base_owner_gv_id ?? null,
        effective_base_owner_gv_id:
          row.effective_base_owner_gv_id ?? row.base_gv_id ?? null,
        set_code: row.set_code ?? null,
        effective_set_code: row.set_code ?? null,
        effective_set_name: SET_NAME_BY_CODE[row.set_code] ?? null,
        current_blocker_class: row.current_blocker_class ?? 'NO_SERIES_CONFIRMATION',
        evidence_tier: row.evidence_tier ?? 'TIER_4',
        known_series_appearances: row.known_series_appearances ?? [],
        missing_series_checked: row.missing_series_checked ?? [],
        prior_evidence_pass_history: row.prior_evidence_pass_history ?? [],
        prior_route_repair_history: row.prior_route_repair_history ?? [],
        blocked_by_official_acquisition: Boolean(row.blocked_by_official_acquisition),
        blocked_by_official_acquisition_reason: row.blocked_by_official_acquisition
          ? ACQUISITION_BLOCK_REASON
          : null,
        research_links: row.research_links ?? null,
        unique_base_route: Boolean(row.effective_base_owner_gv_id ?? row.base_gv_id),
        evidence_sources: row.evidence_sources ?? [
          {
            source_name: 'JustTCG family-only source row',
            source_type: 'justtcg_source_row',
            evidence_tier: row.evidence_tier ?? 'TIER_4',
            source_reference: row.source_external_id,
            note: 'Family-only stamped row without independent series proof.',
          },
        ],
      })),
  );
}

async function fetchSeriesPage(source) {
  const response = await fetch(source.raw_url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV16Nonblocked/1.0)',
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

function lineMatchesPrintedNumber(line, printedNumber) {
  const raw = normalizeText(printedNumber);
  if (!raw) return false;

  if (raw.includes('/')) {
    const [left, right] = raw.split('/').map((part) => part.trim());
    const leftInt = parseInt(left, 10);
    if (!Number.isFinite(leftInt)) return line.includes(raw);
    const escapedRight = right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const slashPattern = new RegExp(`(^|[^0-9])0*${leftInt}\\s*/\\s*${escapedRight}([^0-9]|$)`);
    return slashPattern.test(line);
  }

  const number = parseInt(raw, 10);
  if (!Number.isFinite(number)) return line.includes(raw);
  const plainPattern = new RegExp(`(^|[^0-9])0*${number}([^0-9]|$)`);
  return plainPattern.test(line);
}

function lineMatchesSeriesRow(line, row) {
  const requiredName = normalizeName(row.base_card_name ?? row.candidate_name ?? row.name);
  const setToken = normalizeText(row.effective_set_name);
  return (
    line.includes(requiredName) &&
    lineMatchesPrintedNumber(line, row.printed_number) &&
    (!setToken || line.includes(setToken))
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
        TARGET_SOURCE_EXTERNAL_IDS.has(row.source_external_id) &&
        row.effective_base_owner_gv_id,
    ),
  );

  if (rows.length !== TARGET_SOURCE_EXTERNAL_IDS.size) {
    throw new Error(
      `V16 target slice is not reproducible: expected ${TARGET_SOURCE_EXTERNAL_IDS.size}, found ${rows.length}.`,
    );
  }

  return {
    ...TARGET_SLICE,
    row_count: rows.length,
    rows,
    set_code_counts: countBy(rows, (row) => row.set_code ?? 'unknown'),
    selection_note:
      'This late-SV known-route slice is the remaining nonblocked group with a realistic current yield from accessible Series 5-8 evidence; it does not depend on official Series 1/2 acquisition.',
  };
}

function buildFinalDecision(matchedSeries) {
  if (matchedSeries.length > 1) {
    return {
      final_evidence_class: 'DUPLICATE_REPRINT',
      final_decision: 'DO_NOT_CANON',
      decision_code: 'multi_series_duplicate_confirmed_by_v16_nonblocked_late_sv_window',
      final_reason:
        'Accessible evidence places this late-SV printed identity in multiple Prize Pack series with no printed distinction, so the generic Play! Pokemon stamp is distribution-only for this source row.',
    };
  }

  if (matchedSeries.length === 1) {
    return {
      final_evidence_class: 'CONFIRMED_IDENTITY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_accessible_series_confirmed_by_v16_nonblocked_late_sv_window',
      final_reason:
        'Accessible evidence places this late-SV row in exactly one corroborated Prize Pack series, so the generic Play! Pokemon stamp resolves to one deterministic stamped identity.',
    };
  }

  return {
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_accessible_series_match_after_v16_nonblocked',
    final_reason:
      'Accessible Series 5-8 sources do not place this row in one deterministic Prize Pack series, so it remains in the evidence backlog.',
  };
}

function buildTargetSliceRows(rows, seriesPages) {
  return stableSortRows(rows).map((row) => {
    const match = matchRowAgainstSources(row, seriesPages);
    const final = buildFinalDecision(match.matched_series);
    const bestTierRank = Math.min(
      strongestTierRankFromSources(row.evidence_sources),
      strongestTierRankFromSources(match.matching_evidence),
    );

    return {
      ...row,
      accessible_series_checked: TARGET_SLICE.series,
      missing_series_checked: TARGET_SLICE.series,
      evidence_sources_used_for_v16_nonblocked: match.matching_evidence,
      confirmed_series_coverage: match.matched_series,
      matched_series_pattern:
        match.matched_series.length > 0 ? `[${match.matched_series.join(',')}]` : '[]',
      final_evidence_tier: rankToTier(bestTierRank),
      previous_evidence_pass_history: [
        ...new Set([
          ...(row.prior_evidence_pass_history ?? []),
          'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V16_NONBLOCKED',
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
    effective_set_code: row.effective_set_code,
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
      effective_routed_set_code: row.effective_set_code,
      governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
    },
  }));
}

function representativeRows({
  readyRows,
  doNotCanonRows,
  stillWaitRows,
  remainingWaitRows,
  acquisitionBlockedRows,
  specialRows,
}) {
  return [
    ...readyRows.slice(0, 5).map((row) => ({
      bucket: 'READY_FOR_WAREHOUSE',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.effective_set_code,
      matched_series_pattern: row.matched_series_pattern,
      source_external_id: row.source_external_id,
    })),
    ...doNotCanonRows.slice(0, 5).map((row) => ({
      bucket: 'DO_NOT_CANON',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.effective_set_code,
      matched_series_pattern: row.matched_series_pattern,
      source_external_id: row.source_external_id,
    })),
    ...stillWaitRows.slice(0, 5).map((row) => ({
      bucket: 'WAIT_IN_SLICE',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.effective_set_code,
      matched_series_pattern: row.matched_series_pattern,
      source_external_id: row.source_external_id,
    })),
    ...remainingWaitRows.slice(0, 4).map((row) => ({
      bucket: 'WAIT_REMAINDER',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.effective_set_code ?? row.set_code,
      source_external_id: row.source_external_id,
    })),
    ...acquisitionBlockedRows.slice(0, 4).map((row) => ({
      bucket: 'EXCLUDED_ACQUISITION_BLOCKED',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.effective_set_code ?? row.set_code,
      source_external_id: row.source_external_id,
    })),
    ...specialRows.slice(0, 1).map((row) => ({
      bucket: 'EXCLUDED_SPECIAL_FAMILY',
      name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      set_code: row.effective_set_code ?? row.set_code,
      source_external_id: row.source_external_id,
    })),
  ];
}

function buildMarkdown(report) {
  const lines = [
    '# Prize Pack Evidence V16 Nonblocked',
    '',
    `- Generated at: ${report.generated_at}`,
    `- Workflow: ${report.workflow}`,
    '',
    '## Current Backlog',
    '',
    `- WAIT_FOR_MORE_EVIDENCE: ${report.current_backlog.wait_for_more_evidence}`,
    `- NO_SERIES_CONFIRMATION: ${report.current_backlog.no_series_confirmation}`,
    `- special-family: ${report.current_backlog.special_identity_family_collision}`,
    `- acquisition-blocked: ${report.current_backlog.blocked_by_official_acquisition}`,
    `- DO_NOT_CANON: ${report.current_backlog.do_not_canon_total}`,
    `- promoted Prize Pack total: ${report.current_backlog.already_promoted_total}`,
    '',
    '## Target Slice',
    '',
    `- id: ${report.target_slice.id}`,
    `- label: ${report.target_slice.label}`,
    `- row_count: ${report.target_slice.row_count}`,
    `- shared_question: ${report.target_slice.shared_question}`,
    `- selection_note: ${report.target_slice.selection_note}`,
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
  lines.push(`- excluded acquisition-blocked: ${report.summary.excluded_acquisition_blocked}`);
  lines.push(`- excluded special-family: ${report.summary.excluded_special_family}`);
  lines.push('');

  lines.push('## Newly READY');
  lines.push('');
  if (report.ready_rows.length === 0) {
    lines.push('- none');
  } else {
    for (const row of report.ready_rows) {
      lines.push(
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.matched_series_pattern}`,
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
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.matched_series_pattern}`,
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
        `- ${cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name)} | ${row.printed_number} | ${row.effective_set_code} | ${row.final_reason}`,
      );
    }
  }

  lines.push('');
  lines.push('## Excluded Rows');
  lines.push('');
  for (const row of report.representative_rows.filter(
    (item) =>
      item.bucket === 'EXCLUDED_ACQUISITION_BLOCKED' ||
      item.bucket === 'EXCLUDED_SPECIAL_FAMILY',
  )) {
    lines.push(`- ${row.bucket}: ${row.name} | ${row.printed_number} | ${row.set_code ?? 'unknown'}`);
  }

  lines.push('');
  lines.push('## Next Step');
  lines.push('');
  lines.push(`- ${report.recommended_next_execution_step}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function main() {
  const [v15Input, v15] = await Promise.all([readJson(V15_INPUT_PATH), readJson(V15_PATH)]);
  const currentWaitRows = buildCurrentWaitRows({ v15Input, v15 });
  const acquisitionBlockedRows = stableSortRows(
    currentWaitRows.filter((row) => row.blocked_by_official_acquisition),
  );
  const specialRows = stableSortRows(
    currentWaitRows.filter((row) => row.source_external_id === SPECIAL_FAMILY_SOURCE_EXTERNAL_ID),
  );
  const noSeriesRows = currentWaitRows.filter(
    (row) => row.current_blocker_class === 'NO_SERIES_CONFIRMATION',
  );

  const inputArtifact = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V16_NONBLOCKED',
    source_artifacts: [relativeCheckpointPath(V15_INPUT_PATH), relativeCheckpointPath(V15_PATH)],
    current_backlog: {
      wait_for_more_evidence: currentWaitRows.length,
      no_series_confirmation: noSeriesRows.length,
      special_identity_family_collision: specialRows.length,
      blocked_by_official_acquisition: acquisitionBlockedRows.length,
      do_not_canon_total: v15.remaining_backlog?.do_not_canon_total_after_v15_nonblocked ?? 185,
      already_promoted_total: v15.remaining_backlog?.promoted_prize_pack_total ?? 373,
    },
    blocker_counts: countBy(currentWaitRows, (row) => row.current_blocker_class ?? 'UNKNOWN'),
    set_code_counts: countBy(currentWaitRows, (row) => row.set_code ?? 'UNKNOWN'),
    rows: currentWaitRows.map((row) => ({
      candidate_name: cleanDisplayName(row.base_card_name ?? row.candidate_name ?? row.name),
      printed_number: row.printed_number,
      effective_base_owner_gv_id: row.effective_base_owner_gv_id ?? row.base_gv_id ?? null,
      base_gv_id: row.base_gv_id ?? null,
      set_code: row.set_code ?? null,
      source_family: row.source_family,
      source_external_id: row.source_external_id,
      current_blocker_class: row.current_blocker_class,
      evidence_tier: row.evidence_tier ?? 'TIER_4',
      known_series_appearances: row.known_series_appearances ?? [],
      missing_series_checked: row.missing_series_checked ?? [],
      prior_evidence_pass_history: row.prior_evidence_pass_history ?? [],
      prior_route_repair_history: row.prior_route_repair_history ?? [],
      blocked_by_official_acquisition: row.blocked_by_official_acquisition ?? false,
      blocked_by_official_acquisition_reason: row.blocked_by_official_acquisition_reason ?? null,
      research_links: row.research_links ?? null,
    })),
  };
  await writeJson(INPUT_JSON_PATH, inputArtifact);

  const targetSlice = chooseTargetSlice(currentWaitRows);
  const allSeriesPages = await Promise.all(SERIES_SOURCES.map(fetchSeriesPage));
  const targetRows = buildTargetSliceRows(targetSlice.rows, allSeriesPages);

  const readyRows = stableSortRows(
    targetRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE'),
  );
  const doNotCanonRows = stableSortRows(
    targetRows.filter((row) => row.final_decision === 'DO_NOT_CANON'),
  );
  const stillWaitRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'WAIT'));
  const targetIds = new Set(targetRows.map((row) => row.source_external_id));
  const remainingWaitRows = stableSortRows(
    currentWaitRows.filter(
      (row) =>
        !targetIds.has(row.source_external_id) &&
        !row.blocked_by_official_acquisition &&
        row.source_external_id !== SPECIAL_FAMILY_SOURCE_EXTERNAL_ID,
    ),
  );

  await writeJson(TARGET_SLICE_JSON_PATH, {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V16_NONBLOCKED',
    selection_summary: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetSlice.row_count,
      set_code_counts: targetSlice.set_code_counts,
      selection_note: targetSlice.selection_note,
      excluded_blocked_by_official_acquisition_count: acquisitionBlockedRows.length,
      excluded_special_family_count: specialRows.length,
    },
    shared_question: targetSlice.shared_question,
    evidence_sources_used: allSeriesPages.map((page) => ({
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
      workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V16_NONBLOCKED',
      source_artifact: relativeCheckpointPath(OUTPUT_JSON_PATH),
      row_count: readyRows.length,
      rows: buildReadyBatchCandidate(readyRows),
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V16_NONBLOCKED',
    scope: 'One bounded Prize Pack slice using currently accessible evidence only after V15 rebucketing.',
    source_artifacts: [
      relativeCheckpointPath(V15_INPUT_PATH),
      relativeCheckpointPath(V15_PATH),
      relativeCheckpointPath(INPUT_JSON_PATH),
      relativeCheckpointPath(TARGET_SLICE_JSON_PATH),
    ],
    current_backlog: inputArtifact.current_backlog,
    target_slice: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetSlice.row_count,
      shared_question: targetSlice.shared_question,
      set_code_counts: targetSlice.set_code_counts,
      selection_note: targetSlice.selection_note,
    },
    evidence_sources_used: allSeriesPages.map((page) => ({
      series: page.series,
      source_name: page.source_name,
      source_type: page.source_type,
      evidence_tier: page.evidence_tier,
      source_url: page.source_url,
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
    representative_rows: representativeRows({
      readyRows,
      doNotCanonRows,
      stillWaitRows,
      remainingWaitRows,
      acquisitionBlockedRows,
      specialRows,
    }),
    remaining_backlog: {
      wait_for_more_evidence: currentWaitRows.length - readyRows.length - doNotCanonRows.length,
      no_series_confirmation: noSeriesRows.length - readyRows.length - doNotCanonRows.length,
      do_not_canon_total_after_v16_nonblocked:
        inputArtifact.current_backlog.do_not_canon_total + doNotCanonRows.length,
      blocked_by_official_acquisition_remaining: acquisitionBlockedRows.length,
      special_identity_family_collision_remaining: specialRows.length,
      promoted_prize_pack_total: inputArtifact.current_backlog.already_promoted_total,
    },
    recommended_next_execution_step:
      readyRows.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V16_NONBLOCKED'
        : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V17_NONBLOCKED',
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');
}

await main();
