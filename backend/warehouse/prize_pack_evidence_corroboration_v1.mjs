import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const EVIDENCE_V2_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_evidence_v2.json',
);
const OUTPUT_JSON_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_evidence_corroboration_v1.json',
);
const OUTPUT_MD_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_evidence_corroboration_v1.md',
);

const TARGET_DECISION_REASON =
  'single_series_match_but_series_1_to_3_coverage_not_resolved_for_this_base_set';

const SERIES_SOURCES = [
  {
    series: 1,
    source_name: 'Bulbapedia Prize Pack Series One',
    source_type: 'bulbapedia_card_list',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG)&action=raw',
  },
  {
    series: 2,
    source_name: 'Bulbapedia Prize Pack Series Two',
    source_type: 'bulbapedia_card_list',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Two_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Two_(TCG)&action=raw',
  },
  {
    series: 3,
    source_name: 'Bulbapedia Prize Pack Series Three',
    source_type: 'bulbapedia_card_list',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Three_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Three_(TCG)&action=raw',
  },
  {
    series: 4,
    source_name: 'Bulbapedia Prize Pack Series Four',
    source_type: 'bulbapedia_card_list',
    source_url:
      'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Four_(TCG)',
    raw_url:
      'https://bulbapedia.bulbagarden.net/w/index.php?title=Play!_Pok%C3%A9mon_Prize_Pack_Series_Four_(TCG)&action=raw',
  },
];

function normalizeText(value) {
  return String(value ?? '')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

function sumBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildReason(finalDecision, matchedSeries) {
  if (finalDecision === 'READY_FOR_WAREHOUSE') {
    return `Matched Prize Pack Series ${matchedSeries.join(', ')} only after direct checks against Series 1-3 card lists, so the Play! Pokemon stamp resolves to one corroborated generic Prize Pack identity.`;
  }
  return `Matched Prize Pack Series ${matchedSeries.join(', ')}, so the same base card already appears across multiple Prize Pack series with no printed series marker.`;
}

function buildDecisionCode(finalDecision) {
  if (finalDecision === 'READY_FOR_WAREHOUSE') {
    return 'confirmed_series_4_only_after_series_1_to_3_corroboration';
  }
  return 'multi_series_duplicate_confirmed_in_series_3_and_4';
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Prize Pack Evidence Corroboration V1');
  lines.push('');
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(
    'This pass resolves the exact 52 Prize Pack rows previously blocked as `INSUFFICIENT_SOURCE_CORROBORATION` by checking them directly against Prize Pack Series 1-4 card-list sources.',
  );
  lines.push('');
  lines.push('## Sources Checked');
  lines.push('');
  for (const source of report.sources_checked) {
    lines.push(
      `- Series ${source.series}: ${source.source_name} | ${source.source_type} | ${source.source_url}`,
    );
  }
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- input_rows: ${report.summary.input_rows}`);
  lines.push(`- ready_for_warehouse: ${report.summary.ready_for_warehouse}`);
  lines.push(`- do_not_canon: ${report.summary.do_not_canon}`);
  lines.push(`- unresolved: ${report.summary.unresolved}`);
  lines.push('');
  lines.push('## Counts by Set');
  lines.push('');
  for (const [setCode, count] of Object.entries(report.summary.counts_by_set)) {
    lines.push(`- ${setCode}: ${count}`);
  }
  lines.push('');
  lines.push('## Decision Patterns');
  lines.push('');
  for (const [pattern, count] of Object.entries(report.summary.matched_series_patterns)) {
    lines.push(`- ${pattern}: ${count}`);
  }
  lines.push('');
  lines.push('## READY_FOR_WAREHOUSE');
  lines.push('');
  for (const row of report.ready_rows) {
    lines.push(
      `- ${row.base_card_name} | ${row.printed_number} | ${row.effective_set_code} | confirmed_series_coverage=${row.confirmed_series_coverage.join(', ')}`,
    );
  }
  lines.push('');
  lines.push('## DO_NOT_CANON');
  lines.push('');
  for (const row of report.do_not_canon_rows) {
    lines.push(
      `- ${row.base_card_name} | ${row.printed_number} | ${row.effective_set_code} | confirmed_series_coverage=${row.confirmed_series_coverage.join(', ')}`,
    );
  }
  lines.push('');
  lines.push('## Next Executable Subset');
  lines.push('');
  lines.push(
    `- ${report.next_executable_subset.subset_id}: ${report.next_executable_subset.row_count} rows`,
  );
  for (const row of report.next_executable_subset.representative_rows) {
    lines.push(
      `- ${row.base_card_name} | ${row.printed_number} | ${row.effective_set_code} | base=${row.base_gv_id}`,
    );
  }
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push(`- ${report.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function fetchSeriesPages() {
  const pageMap = new Map();
  for (const source of SERIES_SOURCES) {
    const response = await fetch(source.raw_url, {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch series ${source.series}: ${response.status}`);
    }
    const text = await response.text();
    pageMap.set(source.series, {
      ...source,
      raw_text: normalizeText(text),
      raw_lines: text.split('\n').map(normalizeText),
    });
  }
  return pageMap;
}

function matchedSeriesForRow(row, seriesPages) {
  const setName = normalizeText(row.effective_set_name);
  const printedNumber = normalizeText(row.printed_number);
  const baseName = normalizeText(row.normalized_base_name || row.candidate_name);
  const matched = [];

  for (const [series, page] of seriesPages.entries()) {
    const hasLine = page.raw_lines.some(
      (line) =>
        line.includes(printedNumber) &&
        line.includes(setName) &&
        line.includes(baseName),
    );
    if (hasLine) matched.push(series);
  }

  return matched.sort((a, b) => a - b);
}

async function main() {
  const generatedAt = new Date().toISOString();
  const evidenceV2 = JSON.parse(await fs.readFile(EVIDENCE_V2_PATH, 'utf8'));
  const seriesPages = await fetchSeriesPages();

  const targetRows = evidenceV2.row_outcomes.filter(
    (row) =>
      row.next_action_v2 === 'WAIT' &&
      row.decision_reason_v2 === TARGET_DECISION_REASON,
  );

  const corroboratedRows = targetRows.map((row) => {
    const confirmedSeriesCoverage = matchedSeriesForRow(row, seriesPages);
    const finalDecision =
      confirmedSeriesCoverage.includes(4) &&
      !confirmedSeriesCoverage.some((series) => series < 4)
        ? 'READY_FOR_WAREHOUSE'
        : confirmedSeriesCoverage.includes(4)
          ? 'DO_NOT_CANON'
          : 'STILL_UNRESOLVED';

    return {
      source: row.source,
      source_set_id: row.source_set_id,
      source_external_id: row.source_external_id,
      candidate_name: row.candidate_name,
      base_card_name: row.normalized_base_name || row.candidate_name,
      printed_number: row.printed_number,
      base_gv_id: row.base_gv_id,
      effective_set_code: row.effective_set_code,
      effective_set_name: row.effective_set_name,
      evidence_tier: row.evidence_tier,
      variant_hint: 'play_pokemon_stamp',
      confirmed_series_coverage: confirmedSeriesCoverage,
      missing_series_checked: [1, 2, 3],
      final_decision: finalDecision,
      final_evidence_class:
        finalDecision === 'READY_FOR_WAREHOUSE'
          ? 'CONFIRMED_IDENTITY'
          : finalDecision === 'DO_NOT_CANON'
            ? 'DUPLICATE_REPRINT'
            : 'STILL_UNPROVEN',
      final_reason: buildReason(finalDecision, confirmedSeriesCoverage),
      final_decision_code: buildDecisionCode(finalDecision),
      corroboration_v1_sources_checked: SERIES_SOURCES.map((source) => ({
        series: source.series,
        source_name: source.source_name,
        source_type: source.source_type,
        source_url: source.source_url,
      })),
      prior_evidence_sources_v2: row.evidence_sources_v2 || [],
    };
  });

  const readyRows = corroboratedRows.filter(
    (row) => row.final_decision === 'READY_FOR_WAREHOUSE',
  );
  const doNotCanonRows = corroboratedRows.filter(
    (row) => row.final_decision === 'DO_NOT_CANON',
  );
  const unresolvedRows = corroboratedRows.filter(
    (row) => row.final_decision === 'STILL_UNRESOLVED',
  );

  const corroborationSummary = {
    generated_at: generatedAt,
    input_rows: corroboratedRows.length,
    ready_for_warehouse: readyRows.length,
    do_not_canon: doNotCanonRows.length,
    unresolved: unresolvedRows.length,
    counts_by_set: sumBy(corroboratedRows, (row) => row.effective_set_code),
    matched_series_patterns: sumBy(
      corroboratedRows,
      (row) => `[${row.confirmed_series_coverage.join(',')}]`,
    ),
  };

  const updatedEvidenceV2 = structuredClone(evidenceV2);
  updatedEvidenceV2.corroboration_v1_summary = corroborationSummary;
  updatedEvidenceV2.corroboration_v1_sources_checked = SERIES_SOURCES.map((source) => ({
    series: source.series,
    source_name: source.source_name,
    source_type: source.source_type,
    source_url: source.source_url,
  }));

  const corroboratedByExternalId = new Map(
    corroboratedRows.map((row) => [row.source_external_id, row]),
  );
  updatedEvidenceV2.row_outcomes = updatedEvidenceV2.row_outcomes.map((row) => {
    const corroborated = corroboratedByExternalId.get(row.source_external_id);
    if (!corroborated) return row;
    return {
      ...row,
      confirmed_series_coverage: corroborated.confirmed_series_coverage,
      missing_series_checked: corroborated.missing_series_checked,
      final_decision: corroborated.final_decision,
      final_evidence_class: corroborated.final_evidence_class,
      corroboration_v1_reason: corroborated.final_reason,
      corroboration_v1_decision_code: corroborated.final_decision_code,
      corroboration_v1_sources_checked: corroborated.corroboration_v1_sources_checked,
    };
  });

  const report = {
    generated_at: generatedAt,
    workflow: 'PRIZE_PACK_EVIDENCE_CORROBORATION_V1',
    scope: {
      source_artifact:
        'docs/checkpoints/warehouse/prize_pack_evidence_v2.json',
      target_subset_decision_reason: TARGET_DECISION_REASON,
      target_subset_size: corroboratedRows.length,
    },
    sources_checked: SERIES_SOURCES.map((source) => ({
      series: source.series,
      source_name: source.source_name,
      source_type: source.source_type,
      source_url: source.source_url,
    })),
    summary: corroborationSummary,
    ready_rows: readyRows,
    do_not_canon_rows: doNotCanonRows,
    unresolved_rows: unresolvedRows,
    next_executable_subset: {
      subset_id: 'PRIZE_PACK_READY_BATCH_V3_23',
      row_count: readyRows.length,
      representative_rows: readyRows.slice(0, 10),
    },
    recommended_next_execution_step: 'PRIZE_PACK_READY_BATCH_V3_23',
  };

  await fs.writeFile(EVIDENCE_V2_PATH, stableStringify(updatedEvidenceV2));
  await fs.writeFile(OUTPUT_JSON_PATH, stableStringify(report));
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report));

  console.log(
    JSON.stringify(
      {
        updated_artifact: path.relative(repoRoot, EVIDENCE_V2_PATH),
        output_json: path.relative(repoRoot, OUTPUT_JSON_PATH),
        output_md: path.relative(repoRoot, OUTPUT_MD_PATH),
        summary: corroborationSummary,
      },
      null,
      2,
    ),
  );
}

await main();
