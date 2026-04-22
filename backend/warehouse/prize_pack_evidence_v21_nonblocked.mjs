import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const V17_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v17_nonblocked_input.json');
const V17_OUTPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v17_nonblocked.json');
const SERIES_1_OFFICIAL_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_series_1_official.json');
const SERIES_2_OFFICIAL_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_series_2_official.json');
const SERIES_SOURCE_FIXTURE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_series_evidence_sources_v2.json',
);
const SERIES_1_BATCH_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v6_source_upgrade_series_1.json',
);
const SERIES_2_BATCH_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v7_source_upgrade_series_2.json',
);
const V18_BATCH_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v18_nonblocked.json',
);
const V19_BATCH_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v19_nonblocked.json',
);
const V20_BATCH_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v20_nonblocked.json',
);

const INPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v21_nonblocked_input.json',
);
const TARGET_SLICE_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v21_nonblocked_target_slice.json',
);
const OUTPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v21_nonblocked.json',
);
const OUTPUT_MD_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_evidence_v21_nonblocked.md',
);
const READY_BATCH_CANDIDATE_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v21_nonblocked_candidate.json',
);

const SPECIAL_FAMILY_SOURCE_EXTERNAL_ID =
  'pokemon-prize-pack-series-cards-team-rocket-s-mewtwo-ex-double-rare';

const TARGET_SOURCE_EXTERNAL_IDS = new Set([
  'pokemon-prize-pack-series-cards-inteleon-43-rare',
]);

const TARGET_SLICE = {
  id: 'CHILLING_REIGN_INTELEON_SERIES_1_2_EXACT_AUDIT',
  label: 'Chilling Reign Inteleon Series 1-2 Exact Audit',
  row_count: TARGET_SOURCE_EXTERNAL_IDS.size,
  set_code: 'swsh6',
  series_checked: [1, 2, 3, 4, 5, 6, 7, 8],
  shared_question:
    'Across local official Series 1-2 JSON and accessible Series 3-8 sources, does this Chilling Reign printed identity appear in exactly one corroborated Prize Pack series or multiple?',
  selection_note:
    'This one-row micro-slice was selected because it is the only remaining nonblocked row with exact accessible corroboration in the current pool. It has exact local-official Series 1 and Series 2 hits, so the pass resolves it by evidence rather than leaving a high-signal duplicate in WAIT.',
};

const SET_NAME_BY_CODE = {
  'swsh3.5': "Champion's Path",
  swsh9: 'Brilliant Stars',
  swsh1: 'Sword & Shield',
  swsh6: 'Chilling Reign',
};

const BULBAPEDIA_SOURCES = [3, 4, 5, 6, 7, 8].map((series) => ({
  series,
  source_name: `Bulbapedia Prize Pack Series ${series}`,
  source_type: 'bulbapedia_card_list',
  evidence_tier: 'TIER_3',
  source_url:
    `https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_${seriesName(series)}_(TCG)`,
  raw_url:
    `https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_${seriesName(series)}_(TCG)&action=raw`,
}));

function seriesName(series) {
  return {
    3: 'Three',
    4: 'Four',
    5: 'Five',
    6: 'Six',
    7: 'Seven',
    8: 'Eight',
  }[series];
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, ' ');
}

function normalizeText(value) {
  return decodeHtml(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’]/g, "'")
    .replace(/[^a-zA-Z0-9'./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeName(value) {
  return normalizeText(value)
    .replace(/\berror\b/g, '')
    .replace(/\bduplicate\b/g, '')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function extractGvSetToken(row) {
  const value = row.effective_base_owner_gv_id ?? row.base_gv_id ?? row.base_route ?? '';
  const match = String(value).match(/^GV-PK-([A-Z0-9.]+)-/i);
  return match ? match[1].toUpperCase() : null;
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

function buildCurrentWaitRows({
  v17Input,
  series1Batch,
  series2Batch,
  v18Batch,
  v19Batch,
  v20Batch,
}) {
  const promotedIds = new Set(
    [
      ...(series1Batch.rows || []).map((row) => row.source_external_id),
      ...(series2Batch.rows || []).map((row) => row.source_external_id),
      ...(v18Batch.rows || []).map((row) => row.source_external_id),
      ...(v19Batch.rows || []).map((row) => row.source_external_id),
      ...(v20Batch.rows || []).map((row) => row.source_external_id),
    ].filter(Boolean),
  );

  return stableSortRows(
    (v17Input.rows || [])
      .filter((row) => !promotedIds.has(row.source_external_id))
      .map((row) => {
        const name = cleanDisplayName(row.candidate_name ?? row.name ?? row.base_card_name);
        const baseGvId = row.effective_base_owner_gv_id ?? row.base_gv_id ?? row.base_route ?? null;
        return {
          source: row.source ?? 'justtcg',
          source_set_id: row.source_set_id ?? 'prize-pack-series-cards-pokemon',
          source_external_id: row.source_external_id,
          source_family: row.source_family ?? 'prize-pack-series-cards-pokemon',
          candidate_name: name,
          name,
          base_card_name: name,
          printed_number: row.printed_number,
          normalized_number_plain:
            row.normalized_number_plain ?? normalizeNumberPlain(row.printed_number),
          base_gv_id: baseGvId,
          base_route: baseGvId,
          effective_base_owner_gv_id: baseGvId,
          set_code: row.set_code ?? row.effective_set_code ?? null,
          effective_set_code: row.set_code ?? row.effective_set_code ?? null,
          effective_set_name:
            row.effective_set_name ?? SET_NAME_BY_CODE[row.set_code ?? row.effective_set_code] ?? null,
          set_token: extractGvSetToken(row),
          current_blocker_class: row.current_blocker_class ?? 'NO_SERIES_CONFIRMATION',
          evidence_tier: row.evidence_tier ?? 'TIER_4',
          known_series_appearances: row.known_series_appearances ?? [],
          missing_series_checked: row.missing_series_checked ?? [],
          source_candidate_id: row.source_candidate_id ?? null,
          prior_evidence_pass_history: row.prior_evidence_pass_history ?? [],
          previous_evidence_pass_history: row.previous_evidence_pass_history ?? [],
          prior_route_repair_history: row.prior_route_repair_history ?? [],
          blocked_by_official_acquisition: Boolean(row.blocked_by_official_acquisition),
          research_links: row.research_links ?? null,
          unique_base_route: Boolean(baseGvId),
        };
      }),
  );
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

function officialEvidenceSource({ series, source, match }) {
  return {
    series,
    source_name:
      source.source_name ?? `Pokemon.com Prize Pack Series ${series} official checklist`,
    source_type: 'official_checklist_json_import',
    evidence_tier: source.evidence_tier ?? 'TIER_1',
    source_url: source.source_url ?? null,
    local_json_path:
      series === 1
        ? relativeCheckpointPath(SERIES_1_OFFICIAL_PATH)
        : relativeCheckpointPath(SERIES_2_OFFICIAL_PATH),
    matched_entry: {
      name: match.name ?? null,
      printed_number: match.printed_number ?? null,
      set_code: match.set_code ?? null,
    },
  };
}

function findOfficialMatches(row, index, source, series) {
  const key = `${normalizeName(row.name)}::${normalizeNumberPlain(row.printed_number)}`;
  const matches = index.get(key) ?? [];
  const rowSetToken = row.set_token;
  return matches
    .filter((match) => !match.normalized_set_token || match.normalized_set_token === rowSetToken)
    .map((match) => officialEvidenceSource({ series, source, match }));
}

function findFixtureMatches(row, fixture) {
  const rowName = normalizeName(row.name);
  const rowNumber = normalizeNumberPlain(row.printed_number);
  const rowSetToken = row.set_token;
  const matches = [];
  const near = [];

  for (const source of fixture.series_sources ?? []) {
    if (!TARGET_SLICE.series_checked.includes(source.series)) continue;
    for (const entry of source.entries ?? []) {
      const entryName = normalizeName(entry.name);
      const sameName = entryName === rowName;
      if (
        sameName &&
        String(entry.set_token ?? '').toUpperCase() === rowSetToken &&
        String(parseInt(entry.number_plain, 10)) === rowNumber
      ) {
        matches.push({
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
          expected_set_token: rowSetToken,
          expected_number_plain: rowNumber,
        });
      }
    }
  }

  return { matches, near };
}

function lineHasName(line, name) {
  const words = normalizeName(name).split(' ').filter(Boolean);
  return words.every((word) => line.includes(word));
}

function lineHasNumber(line, printedNumber) {
  const numberPlain = normalizeNumberPlain(printedNumber);
  if (!numberPlain) return false;
  const compactNumber = String(parseInt(numberPlain, 10));
  return new RegExp(`(^|[^0-9])0*${compactNumber}([^0-9]|$)`).test(line);
}

async function fetchBulbapediaSources() {
  const pages = [];
  for (const source of BULBAPEDIA_SOURCES) {
    try {
      const response = await fetch(source.raw_url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; GrookaiPrizePackEvidenceV21Nonblocked/1.0)',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        pages.push({ ...source, fetch_status: `HTTP_${response.status}`, raw_lines: [] });
        continue;
      }
      const text = await response.text();
      pages.push({
        ...source,
        fetch_status: 'OK',
        raw_lines: text
          .split('\n')
          .map((line) => normalizeText(line))
          .filter(Boolean),
      });
    } catch (error) {
      pages.push({ ...source, fetch_status: `ERROR_${error.name}`, raw_lines: [] });
    }
  }
  return pages;
}

function findBulbapediaMatches(row, pages) {
  const setName = normalizeText(row.effective_set_name ?? SET_NAME_BY_CODE[row.set_code]);
  const exact = [];
  const near = [];

  for (const page of pages) {
    const nameLine = page.raw_lines.find((line) => lineHasName(line, row.name));
    const exactLine = page.raw_lines.find(
      (line) =>
        lineHasName(line, row.name) &&
        lineHasNumber(line, row.printed_number) &&
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
        near_match_reason: 'name_seen_but_exact_set_or_number_not_matched',
      });
    }
  }

  return { exact, near };
}

function finalEvidenceTier(evidence) {
  if (evidence.some((item) => item.evidence_tier === 'TIER_1')) return 'TIER_1';
  if (evidence.some((item) => item.evidence_tier === 'TIER_2')) return 'TIER_2';
  if (evidence.some((item) => item.evidence_tier === 'TIER_3')) return 'TIER_3';
  return 'TIER_4';
}

function buildFinalDecision(exactEvidence) {
  const series = [...new Set(exactEvidence.map((item) => item.series))].sort((a, b) => a - b);
  if (series.length > 1) {
    return {
      confirmed_series_coverage: series,
      final_evidence_class: 'DUPLICATE_REPRINT',
      final_decision: 'DO_NOT_CANON',
      decision_code: 'multi_series_exact_identity_confirmed_by_v21_nonblocked',
      final_reason:
        'Accessible evidence exactly matches this printed identity across multiple Prize Pack series, so the generic Play! Pokemon stamp is distribution-only.',
    };
  }
  if (series.length === 1) {
    return {
      confirmed_series_coverage: series,
      final_evidence_class: 'CONFIRMED_IDENTITY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_series_exact_identity_confirmed_by_v21_nonblocked',
      final_reason:
        'Accessible evidence exactly matches this printed identity in one Prize Pack series and no other checked accessible series.',
    };
  }
  return {
    confirmed_series_coverage: [],
    final_evidence_class: 'STILL_UNPROVEN',
    final_decision: 'WAIT',
    decision_code: 'no_exact_printed_identity_match_after_v21_nonblocked',
    final_reason:
      'Accessible sources do not exactly match this row by name, set, and printed number.',
  };
}

function chooseTargetSlice(currentWaitRows) {
  const rows = stableSortRows(
    currentWaitRows.filter(
      (row) =>
        TARGET_SOURCE_EXTERNAL_IDS.has(row.source_external_id) &&
        row.current_blocker_class === 'NO_SERIES_CONFIRMATION' &&
        !row.blocked_by_official_acquisition &&
        row.source_external_id !== SPECIAL_FAMILY_SOURCE_EXTERNAL_ID &&
        row.set_code === TARGET_SLICE.set_code &&
        row.effective_base_owner_gv_id,
    ),
  );

  if (rows.length !== TARGET_SOURCE_EXTERNAL_IDS.size) {
    throw new Error(
      `V21 target slice is not reproducible: expected ${TARGET_SOURCE_EXTERNAL_IDS.size}, found ${rows.length}.`,
    );
  }

  return {
    ...TARGET_SLICE,
    rows,
    set_code_counts: countBy(rows, (row) => row.set_code ?? 'unknown'),
  };
}

function buildTargetRows({ rows, series1, series2, series1Index, series2Index, fixture, bulbapediaPages }) {
  return stableSortRows(rows).map((row) => {
    const officialMatches = [
      ...findOfficialMatches(row, series1Index, series1, 1),
      ...findOfficialMatches(row, series2Index, series2, 2),
    ];
    const fixtureMatch = findFixtureMatches(row, fixture);
    const bulbapediaMatch = findBulbapediaMatches(row, bulbapediaPages);
    const exactEvidence = [
      ...officialMatches,
      ...fixtureMatch.matches,
      ...bulbapediaMatch.exact,
    ];
    const decision = buildFinalDecision(exactEvidence);

    return {
      ...row,
      accessible_series_checked: TARGET_SLICE.series_checked,
      evidence_sources_used_for_v21_nonblocked: exactEvidence,
      near_match_evidence_for_v21_nonblocked: [
        ...fixtureMatch.near,
        ...bulbapediaMatch.near,
      ],
      confirmed_series_coverage: decision.confirmed_series_coverage,
      matched_series_pattern: `[${decision.confirmed_series_coverage.join(',')}]`,
      final_evidence_tier: finalEvidenceTier(exactEvidence),
      previous_evidence_pass_history: [
        ...(row.previous_evidence_pass_history ?? row.prior_evidence_pass_history ?? []),
        'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V21_NONBLOCKED',
      ],
      final_evidence_class: decision.final_evidence_class,
      final_decision: decision.final_decision,
      decision_code: decision.decision_code,
      final_reason: decision.final_reason,
    };
  });
}

function buildCanonicalQueueKey(row) {
  return [
    row.effective_set_code ?? row.set_code ?? 'unknown',
    row.name,
    row.printed_number ?? 'unknown',
    'play_pokemon_stamp',
  ].join('::');
}

function buildReadyBatchCandidate(rows) {
  return stableSortRows(rows).map((row, index) => {
    const baseGvId = row.effective_base_owner_gv_id ?? row.base_gv_id ?? null;
    return {
      batch_index: index + 1,
      source: row.source ?? 'justtcg',
      source_set_id: row.source_set_id ?? 'prize-pack-series-cards-pokemon',
      source_external_id: row.source_external_id,
      source_candidate_id: row.source_candidate_id ?? null,
      name: row.name,
      candidate_name: row.name,
      printed_number: row.printed_number,
      number_plain: normalizeNumberPlain(row.printed_number),
      normalized_number_plain: normalizeNumberPlain(row.printed_number),
      proposed_variant_key: 'play_pokemon_stamp',
      variant_key: 'play_pokemon_stamp',
      stamp_label: 'Play! Pokemon Stamp',
      governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      governing_rules: [
        'STAMPED_IDENTITY_RULE_V1',
        'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
        'EVIDENCE_TIER_V1',
      ],
      source_family: row.source_family ?? 'prize-pack-series-cards-pokemon',
      evidence_class: row.final_evidence_class,
      evidence_tier: row.final_evidence_tier,
      supported_series_list: row.confirmed_series_coverage,
      confirmed_series_coverage: row.confirmed_series_coverage,
      evidence_sources_v21_nonblocked: row.evidence_sources_used_for_v21_nonblocked,
      effective_identity_space: row.effective_set_code ?? row.set_code,
      effective_set_code: row.effective_set_code ?? row.set_code,
      effective_routed_set_code: row.effective_set_code ?? row.set_code,
      effective_set_name: row.effective_set_name ?? null,
      effective_routed_set_name: row.effective_set_name ?? null,
      canonical_queue_key: buildCanonicalQueueKey(row),
      base_gv_id: baseGvId,
      base_route: baseGvId,
      underlying_base_proof: {
        base_gv_id: baseGvId,
        base_route: baseGvId,
        unique_base_route: Boolean(baseGvId),
        base_card_name: row.name,
      },
      reference_hints_payload: {
        provenance: 'prize_pack_evidence_v21_nonblocked',
        source_family: row.source_family ?? 'prize-pack-series-cards-pokemon',
        evidence_class: row.final_evidence_class,
        evidence_tier: row.final_evidence_tier,
        confirmed_series_coverage: row.confirmed_series_coverage,
        underlying_base_proof: {
          base_gv_id: baseGvId,
          base_route: baseGvId,
        },
        effective_routed_set_code: row.effective_set_code ?? row.set_code,
        governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      },
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: row.decision_code,
      final_reason: row.final_reason,
    };
  });
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
    ...remainingWaitRows.slice(0, 4).map((row) => ({
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

function evidenceSourcesUsed({ series1, series2, fixture, bulbapediaPages }) {
  return [
    {
      series: 1,
      source_name: series1.source_name ?? 'Pokemon.com Prize Pack Series One official checklist',
      source_type: 'official_checklist_json_import',
      evidence_tier: series1.evidence_tier ?? 'TIER_1',
      source_url: series1.source_url ?? null,
      local_json_path: relativeCheckpointPath(SERIES_1_OFFICIAL_PATH),
    },
    {
      series: 2,
      source_name: series2.source_name ?? 'Pokemon.com Prize Pack Series Two official checklist',
      source_type: 'official_checklist_json_import',
      evidence_tier: series2.evidence_tier ?? 'TIER_1',
      source_url: series2.source_url ?? null,
      local_json_path: relativeCheckpointPath(SERIES_2_OFFICIAL_PATH),
    },
    ...(fixture.series_sources ?? [])
      .filter((source) => TARGET_SLICE.series_checked.includes(source.series))
      .map((source) => ({
        series: source.series,
        source_name: source.source_name,
        source_type: source.source_type,
        evidence_tier: source.evidence_tier,
        source_url: source.source_url,
      })),
    ...bulbapediaPages.map((source) => ({
      series: source.series,
      source_name: source.source_name,
      source_type: source.source_type,
      evidence_tier: source.evidence_tier,
      source_url: source.source_url,
      fetch_status: source.fetch_status,
    })),
  ];
}

function buildMarkdown(report) {
  const lines = [
    '# Prize Pack Evidence V21 Nonblocked',
    '',
    `- Generated at: ${report.generated_at}`,
    `- Workflow: ${report.workflow}`,
    '',
    '## Current Backlog',
    '',
    `- WAIT_FOR_MORE_EVIDENCE: ${report.current_backlog.wait_for_more_evidence}`,
    `- NO_SERIES_CONFIRMATION: ${report.current_backlog.no_series_confirmation}`,
    `- acquisition-blocked: ${report.current_backlog.blocked_by_official_acquisition}`,
    `- special-family: ${report.current_backlog.special_identity_family_collision}`,
    `- DO_NOT_CANON: ${report.current_backlog.do_not_canon_total}`,
    `- promoted Prize Pack total: ${report.current_backlog.promoted_prize_pack_total}`,
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
  lines.push('## Candidate Batch');
  lines.push('');
  lines.push(
    report.ready_batch_candidate_created
      ? `- ${relativeCheckpointPath(READY_BATCH_CANDIDATE_PATH)}`
      : '- No READY candidate batch created.',
  );
  lines.push('');
  lines.push('## Next Step');
  lines.push('');
  lines.push(`- ${report.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const [
    v17Input,
    v17,
    series1,
    series2,
    fixture,
    series1Batch,
    series2Batch,
    v18Batch,
    v19Batch,
    v20Batch,
  ] = await Promise.all([
    readJson(V17_INPUT_PATH),
    readJson(V17_OUTPUT_PATH),
    readJson(SERIES_1_OFFICIAL_PATH),
    readJson(SERIES_2_OFFICIAL_PATH),
    readJson(SERIES_SOURCE_FIXTURE_PATH),
    readJson(SERIES_1_BATCH_PATH),
    readJson(SERIES_2_BATCH_PATH),
    readJson(V18_BATCH_PATH),
    readJson(V19_BATCH_PATH),
    readJson(V20_BATCH_PATH),
  ]);

  const currentWaitRows = buildCurrentWaitRows({
    v17Input,
    series1Batch,
    series2Batch,
    v18Batch,
    v19Batch,
    v20Batch,
  });
  const acquisitionBlockedRows = stableSortRows(
    currentWaitRows.filter((row) => row.blocked_by_official_acquisition),
  );
  const specialRows = stableSortRows(
    currentWaitRows.filter((row) => row.source_external_id === SPECIAL_FAMILY_SOURCE_EXTERNAL_ID),
  );
  const noSeriesRows = currentWaitRows.filter(
    (row) => row.current_blocker_class === 'NO_SERIES_CONFIRMATION',
  );
  const nonblockedNoSeriesRows = stableSortRows(
    currentWaitRows.filter(
      (row) =>
        row.current_blocker_class === 'NO_SERIES_CONFIRMATION' &&
        !row.blocked_by_official_acquisition &&
        row.source_external_id !== SPECIAL_FAMILY_SOURCE_EXTERNAL_ID,
    ),
  );

  const currentBacklog = {
    wait_for_more_evidence: currentWaitRows.length,
    no_series_confirmation: noSeriesRows.length,
    nonblocked_no_series_confirmation: nonblockedNoSeriesRows.length,
    special_identity_family_collision: specialRows.length,
    blocked_by_official_acquisition: acquisitionBlockedRows.length,
    do_not_canon_total: v20Batch.post_batch_prize_pack_status?.do_not_canon_rows ?? 186,
    promoted_prize_pack_total:
      v20Batch.post_batch_prize_pack_status?.promoted_prize_pack_total_after_v20 ?? 422,
  };

  const inputArtifact = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V21_NONBLOCKED',
    source_artifacts: [
      relativeCheckpointPath(V17_INPUT_PATH),
      relativeCheckpointPath(V17_OUTPUT_PATH),
      relativeCheckpointPath(SERIES_1_BATCH_PATH),
      relativeCheckpointPath(SERIES_2_BATCH_PATH),
      relativeCheckpointPath(V18_BATCH_PATH),
      relativeCheckpointPath(V19_BATCH_PATH),
      relativeCheckpointPath(V20_BATCH_PATH),
      relativeCheckpointPath(SERIES_1_OFFICIAL_PATH),
      relativeCheckpointPath(SERIES_2_OFFICIAL_PATH),
      relativeCheckpointPath(SERIES_SOURCE_FIXTURE_PATH),
    ],
    current_backlog: currentBacklog,
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
  const [bulbapediaPages] = await Promise.all([fetchBulbapediaSources()]);
  const series1Index = buildOfficialIndex(series1, 1);
  const series2Index = buildOfficialIndex(series2, 2);

  const targetRows = buildTargetRows({
    rows: targetSlice.rows,
    series1,
    series2,
    series1Index,
    series2Index,
    fixture,
    bulbapediaPages,
  });

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

  const sourcesUsed = evidenceSourcesUsed({ series1, series2, fixture, bulbapediaPages });

  await writeJson(TARGET_SLICE_JSON_PATH, {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V21_NONBLOCKED',
    selection_summary: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetRows.length,
      set_code_counts: countBy(targetRows, (row) => row.set_code ?? 'unknown'),
      selection_note: targetSlice.selection_note,
      excluded_blocked_by_official_acquisition_count: acquisitionBlockedRows.length,
      excluded_special_family_count: specialRows.length,
    },
    shared_question: targetSlice.shared_question,
    evidence_sources_used: sourcesUsed,
    rows: targetRows,
  });

  await removeFileIfExists(READY_BATCH_CANDIDATE_PATH);
  if (readyRows.length > 0) {
    await writeJson(READY_BATCH_CANDIDATE_PATH, {
      generated_at: new Date().toISOString(),
      workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V21_NONBLOCKED',
      source_artifact: relativeCheckpointPath(OUTPUT_JSON_PATH),
      row_count: readyRows.length,
      rows: buildReadyBatchCandidate(readyRows),
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V21_NONBLOCKED',
    scope:
      'One small high-signal nonblocked Prize Pack slice using currently accessible evidence only.',
    source_artifacts: [
      relativeCheckpointPath(V17_INPUT_PATH),
      relativeCheckpointPath(V17_OUTPUT_PATH),
      relativeCheckpointPath(SERIES_1_BATCH_PATH),
      relativeCheckpointPath(SERIES_2_BATCH_PATH),
      relativeCheckpointPath(V18_BATCH_PATH),
      relativeCheckpointPath(V19_BATCH_PATH),
      relativeCheckpointPath(V20_BATCH_PATH),
      relativeCheckpointPath(INPUT_JSON_PATH),
      relativeCheckpointPath(TARGET_SLICE_JSON_PATH),
    ],
    current_backlog: currentBacklog,
    target_slice: {
      id: targetSlice.id,
      label: targetSlice.label,
      row_count: targetRows.length,
      shared_question: targetSlice.shared_question,
      selection_note: targetSlice.selection_note,
    },
    evidence_sources_used: sourcesUsed,
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
      nonblocked_no_series_confirmation:
        nonblockedNoSeriesRows.length - readyRows.length - doNotCanonRows.length,
      do_not_canon_total_after_v21_nonblocked:
        currentBacklog.do_not_canon_total + doNotCanonRows.length,
      blocked_by_official_acquisition_remaining: acquisitionBlockedRows.length,
      special_identity_family_collision_remaining: specialRows.length,
      promoted_prize_pack_total: currentBacklog.promoted_prize_pack_total,
    },
    ready_batch_candidate_created: readyRows.length > 0,
    ready_batch_candidate_path:
      readyRows.length > 0 ? relativeCheckpointPath(READY_BATCH_CANDIDATE_PATH) : null,
    recommended_next_execution_step:
      readyRows.length > 0
        ? 'PRIZE_PACK_READY_BATCH_V21_NONBLOCKED'
        : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V22_NONBLOCKED',
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');
}

await main();
