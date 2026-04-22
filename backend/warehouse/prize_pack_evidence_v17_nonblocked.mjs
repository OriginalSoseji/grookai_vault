import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const V16_INPUT_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v16_nonblocked_input.json',
);
const V16_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v16_nonblocked.json');
const SERIES_SOURCE_FIXTURE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_series_evidence_sources_v2.json',
);

const INPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v17_nonblocked_input.json',
);
const TARGET_SLICE_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v17_nonblocked_target_slice.json',
);
const OUTPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v17_nonblocked.json',
);
const OUTPUT_MD_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v17_nonblocked.md',
);
const READY_BATCH_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v17_nonblocked_candidate.json',
);

const SPECIAL_FAMILY_SOURCE_EXTERNAL_ID =
  'pokemon-prize-pack-series-cards-team-rocket-s-mewtwo-ex-double-rare';

const TARGET_SOURCE_EXTERNAL_IDS = new Set([
  'pokemon-prize-pack-series-cards-mystery-garden-ultra-rare',
  'pokemon-prize-pack-series-cards-cynthia-s-gible-common',
  'pokemon-prize-pack-series-cards-cynthia-s-gible-error-common',
  'pokemon-prize-pack-series-cards-carmine-uncommon',
]);

const TARGET_SLICE = {
  id: 'LATE_SV_OFFICIAL_CHECKLIST_EXACT_IDENTITY_AUDIT',
  label: 'Late SV Official Checklist Exact-Identity Audit',
  series: [5, 6, 7, 8],
  source_family: 'prize-pack-series-cards-pokemon',
  shared_question:
    'Across accessible Series 5-8 sources and captured official Series 7-8 checklist data, does each late-SV row have exactly one exact name + set token + number match?',
};

const SET_TOKEN_BY_CODE = {
  me01: 'MEG',
  sv10: 'DRI',
  sv8pt5: 'PRE',
};

const SET_NAME_BY_CODE = {
  me01: 'Mega Evolution',
  sv10: 'Destined Rivals',
  sv8pt5: 'Prismatic Evolutions',
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

function cleanDisplayName(value) {
  return String(value ?? '')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\s*$/g, '')
    .replace(/\(error\)/gi, '')
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

function buildCurrentWaitRows({ v16Input, v16 }) {
  const removeIds = new Set(
    [
      ...(v16.ready_rows || []).map((row) => row.source_external_id),
      ...(v16.do_not_canon_rows || []).map((row) => row.source_external_id),
    ].filter(Boolean),
  );

  return stableSortRows(
    (v16Input.rows || [])
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
        set_token: SET_TOKEN_BY_CODE[row.set_code] ?? null,
        current_blocker_class: row.current_blocker_class ?? 'NO_SERIES_CONFIRMATION',
        evidence_tier: row.evidence_tier ?? 'TIER_4',
        known_series_appearances: row.known_series_appearances ?? [],
        missing_series_checked: row.missing_series_checked ?? [],
        prior_evidence_pass_history: row.prior_evidence_pass_history ?? [],
        prior_route_repair_history: row.prior_route_repair_history ?? [],
        blocked_by_official_acquisition: Boolean(row.blocked_by_official_acquisition),
        research_links: row.research_links ?? null,
        unique_base_route: Boolean(row.effective_base_owner_gv_id ?? row.base_gv_id),
      })),
  );
}

async function fetchSeriesPage(source) {
  const response = await fetch(source.raw_url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV17Nonblocked/1.0)',
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
    const escapedRight = right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^0-9])0*${leftInt}\\s*/\\s*${escapedRight}([^0-9]|$)`).test(line);
  }
  const number = parseInt(raw, 10);
  return new RegExp(`(^|[^0-9])0*${number}([^0-9]|$)`).test(line);
}

function matchBulbapediaRow(row, seriesPages) {
  const requiredName = normalizeText(row.base_card_name ?? row.candidate_name ?? row.name);
  const setName = normalizeText(row.effective_set_name);
  const exact = [];
  const near = [];

  for (const page of seriesPages) {
    const nameLine = page.raw_lines.find((line) => line.includes(requiredName));
    const exactLine = page.raw_lines.find(
      (line) =>
        line.includes(requiredName) &&
        lineMatchesPrintedNumber(line, row.printed_number) &&
        (!setName || line.includes(setName)),
    );
    if (exactLine) {
      exact.push({
        series: page.series,
        source_name: page.source_name,
        source_type: page.source_type,
        evidence_tier: page.evidence_tier,
        source_url: page.source_url,
        raw_url: page.raw_url,
        matching_line: exactLine,
      });
    } else if (nameLine) {
      near.push({
        series: page.series,
        source_name: page.source_name,
        source_type: page.source_type,
        evidence_tier: page.evidence_tier,
        source_url: page.source_url,
        raw_url: page.raw_url,
        near_match_line: nameLine,
        near_match_reason: 'name_seen_but_exact_set_token_or_number_not_matched',
      });
    }
  }

  return { exact, near };
}

function matchFixtureRow(row, fixture) {
  const exact = [];
  const near = [];
  const expectedName = normalizeText(row.base_card_name ?? row.candidate_name ?? row.name);
  const expectedNumber = normalizeNumberPlain(row.printed_number);
  const expectedToken = row.set_token;

  for (const source of fixture.series_sources ?? []) {
    if (!TARGET_SLICE.series.includes(source.series)) continue;
    for (const entry of source.entries ?? []) {
      const entryName = normalizeText(entry.name);
      const sameName = entryName === expectedName;
      if (
        sameName &&
        entry.set_token === expectedToken &&
        String(parseInt(entry.number_plain, 10)) === expectedNumber
      ) {
        exact.push({
          series: source.series,
          source_name: source.source_name,
          source_type: source.source_type,
          evidence_tier: source.evidence_tier,
          source_url: source.source_url,
          matching_line: entry.raw_line,
        });
      } else if (sameName) {
        near.push({
          series: source.series,
          source_name: source.source_name,
          source_type: source.source_type,
          evidence_tier: source.evidence_tier,
          source_url: source.source_url,
          near_match_line: entry.raw_line,
          near_match_reason: 'name_seen_but_exact_set_token_or_number_not_matched',
          observed_set_token: entry.set_token,
          observed_number_plain: entry.number_plain,
          expected_set_token: expectedToken,
          expected_number_plain: expectedNumber,
        });
      }
    }
  }

  return { exact, near };
}

function chooseTargetSlice(waitRows) {
  const rows = stableSortRows(
    waitRows.filter(
      (row) =>
        row.current_blocker_class === 'NO_SERIES_CONFIRMATION' &&
        !row.blocked_by_official_acquisition &&
        row.source_external_id !== SPECIAL_FAMILY_SOURCE_EXTERNAL_ID &&
        TARGET_SOURCE_EXTERNAL_IDS.has(row.source_external_id) &&
        row.effective_base_owner_gv_id,
    ),
  );

  if (rows.length !== TARGET_SOURCE_EXTERNAL_IDS.size) {
    throw new Error(
      `V17 target slice is not reproducible: expected ${TARGET_SOURCE_EXTERNAL_IDS.size}, found ${rows.length}.`,
    );
  }

  return {
    ...TARGET_SLICE,
    row_count: rows.length,
    rows,
    set_code_counts: countBy(rows, (row) => row.set_code ?? 'unknown'),
    selection_note:
      'This small late-SV slice was selected because prior accessible official/checklist sources contain promising name-level signals, but V17 requires exact printed identity proof before READY.',
  };
}

function buildFinalDecision(exactEvidence) {
  const series = [...new Set(exactEvidence.map((item) => item.series))].sort((a, b) => a - b);
  if (series.length > 1) {
    return {
      confirmed_series_coverage: series,
      final_evidence_class: 'DUPLICATE_REPRINT',
      final_decision: 'DO_NOT_CANON',
      decision_code: 'multi_series_exact_identity_confirmed_by_v17_nonblocked',
      final_reason:
        'Accessible evidence exactly matches this printed identity across multiple Prize Pack series, so the generic Play! Pokemon stamp is distribution-only.',
    };
  }
  if (series.length === 1) {
    return {
      confirmed_series_coverage: series,
      final_evidence_class: 'CONFIRMED_IDENTITY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_series_exact_identity_confirmed_by_v17_nonblocked',
      final_reason:
        'Accessible evidence exactly matches this printed identity in one Prize Pack series and no other accessible checked series.',
    };
  }
  return {
    confirmed_series_coverage: [],
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_exact_printed_identity_match_after_v17_nonblocked',
    final_reason:
      'Accessible sources do not exactly match this row by name, set token, and printed number. Name-only or adjacent-family hits are not sufficient for READY.',
  };
}

function buildTargetRows(rows, seriesPages, fixture) {
  return stableSortRows(rows).map((row) => {
    const bulbapedia = matchBulbapediaRow(row, seriesPages);
    const fixtureMatch = matchFixtureRow(row, fixture);
    const exactEvidence = [...bulbapedia.exact, ...fixtureMatch.exact];
    const nearEvidence = [...bulbapedia.near, ...fixtureMatch.near];
    const final = buildFinalDecision(exactEvidence);

    return {
      ...row,
      accessible_series_checked: TARGET_SLICE.series,
      missing_series_checked: TARGET_SLICE.series,
      evidence_sources_used_for_v17_nonblocked: exactEvidence,
      near_match_evidence_for_v17_nonblocked: nearEvidence,
      confirmed_series_coverage: final.confirmed_series_coverage,
      matched_series_pattern:
        final.confirmed_series_coverage.length > 0
          ? `[${final.confirmed_series_coverage.join(',')}]`
          : '[]',
      final_evidence_tier:
        exactEvidence.some((item) => item.evidence_tier === 'TIER_1')
          ? 'TIER_1'
          : exactEvidence.some((item) => item.evidence_tier === 'TIER_2')
            ? 'TIER_2'
            : exactEvidence.length > 0
              ? 'TIER_3'
              : 'TIER_4',
      previous_evidence_pass_history: [
        ...new Set([
          ...(row.prior_evidence_pass_history ?? []),
          'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V17_NONBLOCKED',
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
  }));
}

function representativeRows({ readyRows, doNotCanonRows, stillWaitRows, remainingWaitRows, acquisitionBlockedRows, specialRows }) {
  return [
    ...readyRows.map((row) => ({
      bucket: 'READY_FOR_WAREHOUSE',
      name: row.name,
      printed_number: row.printed_number,
      set_code: row.set_code,
      matched_series_pattern: row.matched_series_pattern,
      source_external_id: row.source_external_id,
    })),
    ...doNotCanonRows.map((row) => ({
      bucket: 'DO_NOT_CANON',
      name: row.name,
      printed_number: row.printed_number,
      set_code: row.set_code,
      matched_series_pattern: row.matched_series_pattern,
      source_external_id: row.source_external_id,
    })),
    ...stillWaitRows.map((row) => ({
      bucket: 'WAIT_IN_SLICE',
      name: row.name,
      printed_number: row.printed_number,
      set_code: row.set_code,
      matched_series_pattern: row.matched_series_pattern,
      source_external_id: row.source_external_id,
    })),
    ...remainingWaitRows.slice(0, 3).map((row) => ({
      bucket: 'WAIT_REMAINDER',
      name: row.name,
      printed_number: row.printed_number,
      set_code: row.set_code,
      source_external_id: row.source_external_id,
    })),
    ...acquisitionBlockedRows.slice(0, 3).map((row) => ({
      bucket: 'EXCLUDED_ACQUISITION_BLOCKED',
      name: row.name,
      printed_number: row.printed_number,
      set_code: row.set_code,
      source_external_id: row.source_external_id,
    })),
    ...specialRows.slice(0, 1).map((row) => ({
      bucket: 'EXCLUDED_SPECIAL_FAMILY',
      name: row.name,
      printed_number: row.printed_number,
      set_code: row.set_code,
      source_external_id: row.source_external_id,
    })),
  ];
}

function buildMarkdown(report) {
  const lines = [
    '# Prize Pack Evidence V17 Nonblocked',
    '',
    `- Generated at: ${report.generated_at}`,
    `- Workflow: ${report.workflow}`,
    '',
    '## Current Backlog',
    '',
    `- WAIT_FOR_MORE_EVIDENCE: ${report.current_backlog.wait_for_more_evidence}`,
    `- acquisition-blocked: ${report.current_backlog.blocked_by_official_acquisition}`,
    `- special-family: ${report.current_backlog.special_identity_family_collision}`,
    `- DO_NOT_CANON: ${report.current_backlog.do_not_canon_total}`,
    `- promoted Prize Pack total: ${report.current_backlog.already_promoted_total}`,
    '',
    '## Target Slice',
    '',
    `- id: ${report.target_slice.id}`,
    `- row_count: ${report.target_slice.row_count}`,
    `- shared_question: ${report.target_slice.shared_question}`,
    `- selection_note: ${report.target_slice.selection_note}`,
    '',
    '## Reclassification Summary',
    '',
    `- rows investigated: ${report.summary.rows_investigated}`,
    `- READY_FOR_WAREHOUSE: ${report.summary.ready_for_warehouse}`,
    `- DO_NOT_CANON: ${report.summary.do_not_canon}`,
    `- WAIT: ${report.summary.wait}`,
    `- excluded acquisition-blocked: ${report.summary.excluded_acquisition_blocked}`,
    `- excluded special-family: ${report.summary.excluded_special_family}`,
    '',
    '## Rows',
    '',
  ];

  for (const row of [...report.ready_rows, ...report.do_not_canon_rows, ...report.still_wait_rows]) {
    lines.push(
      `- ${row.final_decision}: ${row.name} | ${row.printed_number} | ${row.set_code} | ${row.matched_series_pattern} | ${row.final_reason}`,
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
  const [v16Input, v16, fixture] = await Promise.all([
    readJson(V16_INPUT_PATH),
    readJson(V16_PATH),
    readJson(SERIES_SOURCE_FIXTURE_PATH),
  ]);

  const currentWaitRows = buildCurrentWaitRows({ v16Input, v16 });
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
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V17_NONBLOCKED',
    source_artifacts: [
      relativeCheckpointPath(V16_INPUT_PATH),
      relativeCheckpointPath(V16_PATH),
      relativeCheckpointPath(SERIES_SOURCE_FIXTURE_PATH),
    ],
    current_backlog: {
      wait_for_more_evidence: currentWaitRows.length,
      no_series_confirmation: noSeriesRows.length,
      special_identity_family_collision: specialRows.length,
      blocked_by_official_acquisition: acquisitionBlockedRows.length,
      do_not_canon_total: v16.remaining_backlog?.do_not_canon_total_after_v16_nonblocked ?? 186,
      already_promoted_total: v16.remaining_backlog?.promoted_prize_pack_total ?? 373,
    },
    rows: currentWaitRows.map((row) => ({
      candidate_name: row.name,
      printed_number: row.printed_number,
      effective_base_owner_gv_id: row.effective_base_owner_gv_id,
      set_code: row.set_code,
      source_family: row.source_family,
      source_external_id: row.source_external_id,
      current_blocker_class: row.current_blocker_class,
      evidence_tier: row.evidence_tier,
      known_series_appearances: row.known_series_appearances,
      missing_series_checked: row.missing_series_checked,
      prior_evidence_pass_history: row.prior_evidence_pass_history,
      blocked_by_official_acquisition: row.blocked_by_official_acquisition,
    })),
  };
  await writeJson(INPUT_JSON_PATH, inputArtifact);

  const targetSlice = chooseTargetSlice(currentWaitRows);
  const seriesPages = await Promise.all(SERIES_SOURCES.map(fetchSeriesPage));
  const targetRows = buildTargetRows(targetSlice.rows, seriesPages, fixture);

  const readyRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE'));
  const doNotCanonRows = stableSortRows(targetRows.filter((row) => row.final_decision === 'DO_NOT_CANON'));
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
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V17_NONBLOCKED',
    selection_summary: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetSlice.row_count,
      set_code_counts: countBy(targetRows, (row) => row.set_code ?? 'unknown'),
      selection_note: targetSlice.selection_note,
      excluded_blocked_by_official_acquisition_count: acquisitionBlockedRows.length,
      excluded_special_family_count: specialRows.length,
    },
    shared_question: targetSlice.shared_question,
    evidence_sources_used: [
      ...SERIES_SOURCES.map((source) => ({
        series: source.series,
        source_name: source.source_name,
        source_type: source.source_type,
        evidence_tier: source.evidence_tier,
        source_url: source.source_url,
      })),
      ...fixture.series_sources
        .filter((source) => TARGET_SLICE.series.includes(source.series))
        .map((source) => ({
          series: source.series,
          source_name: source.source_name,
          source_type: source.source_type,
          evidence_tier: source.evidence_tier,
          source_url: source.source_url,
        })),
    ],
    rows: targetRows,
  });

  await removeFileIfExists(READY_BATCH_CANDIDATE_PATH);
  if (readyRows.length > 0) {
    await writeJson(READY_BATCH_CANDIDATE_PATH, {
      generated_at: new Date().toISOString(),
      workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V17_NONBLOCKED',
      source_artifact: relativeCheckpointPath(OUTPUT_JSON_PATH),
      row_count: readyRows.length,
      rows: buildReadyBatchCandidate(readyRows),
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V17_NONBLOCKED',
    scope: 'One small high-signal nonblocked Prize Pack slice using currently accessible evidence only.',
    source_artifacts: [
      relativeCheckpointPath(V16_INPUT_PATH),
      relativeCheckpointPath(V16_PATH),
      relativeCheckpointPath(SERIES_SOURCE_FIXTURE_PATH),
      relativeCheckpointPath(INPUT_JSON_PATH),
      relativeCheckpointPath(TARGET_SLICE_JSON_PATH),
    ],
    current_backlog: inputArtifact.current_backlog,
    target_slice: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetSlice.row_count,
      shared_question: targetSlice.shared_question,
      selection_note: targetSlice.selection_note,
    },
    evidence_sources_used: [
      ...SERIES_SOURCES.map((source) => ({
        series: source.series,
        source_name: source.source_name,
        source_type: source.source_type,
        evidence_tier: source.evidence_tier,
        source_url: source.source_url,
      })),
      ...fixture.series_sources
        .filter((source) => TARGET_SLICE.series.includes(source.series))
        .map((source) => ({
          series: source.series,
          source_name: source.source_name,
          source_type: source.source_type,
          evidence_tier: source.evidence_tier,
          source_url: source.source_url,
        })),
    ],
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
      do_not_canon_total_after_v17_nonblocked:
        inputArtifact.current_backlog.do_not_canon_total + doNotCanonRows.length,
      blocked_by_official_acquisition_remaining: acquisitionBlockedRows.length,
      special_identity_family_collision_remaining: specialRows.length,
      promoted_prize_pack_total: inputArtifact.current_backlog.already_promoted_total,
    },
    recommended_next_execution_step:
      readyRows.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V17_NONBLOCKED'
        : 'MANUAL_BROWSER_DOWNLOAD_AND_LOCAL_JSON_IMPORT_FOR_PRIZE_PACK_V1',
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');
}

await main();
