import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const V1_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_evidence_v1.json',
);
const SOURCE_FIXTURE_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_series_evidence_sources_v2.json',
);
const OUTPUT_JSON_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_evidence_v2.json',
);
const OUTPUT_MD_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_evidence_v2.md',
);

const TIER_RANK = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 4,
};

const EARLIEST_POSSIBLE_SERIES_BY_TOKEN = {
  OBF: 4,
  MEW: 4,
  PAR: 5,
  TEF: 5,
  TWM: 6,
  SCR: 6,
  SFA: 6,
  SSP: 7,
  JTG: 7,
  PRE: 7,
  DRI: 8,
  BLK: 8,
  WHT: 8,
  MEG: 8,
  MEE: 8,
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

function normalizeName(value) {
  return decodeHtml(value)
    .replace(/\(ERROR\)/gi, '')
    .replace(/\s*-\s*\d+\s*\/\s*\d+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[’]/g, "'")
    .trim()
    .toLowerCase();
}

function normalizeNumberPlain(value) {
  const digits = String(value ?? '').match(/\d+/g);
  if (!digits || digits.length === 0) return null;
  return String(parseInt(digits[0], 10));
}

function parseBaseGvId(gvId) {
  if (!gvId) return null;
  const match = String(gvId).match(/^GV-PK-([A-Z0-9.]+)-(.+)$/);
  if (!match) return null;
  return {
    token: match[1],
    number_plain: normalizeNumberPlain(match[2]),
  };
}

function strongestTier(evidenceSources) {
  return evidenceSources.reduce(
    (best, source) => Math.min(best, TIER_RANK[source.evidence_tier]),
    TIER_RANK.TIER_4,
  );
}

function rankToTier(rank) {
  return Object.entries(TIER_RANK).find(([, value]) => value === rank)?.[0] ?? 'TIER_4';
}

function seriesEntryMatchesRow(entry, row, baseIdentity) {
  if (!baseIdentity || !entry.number_plain) return false;
  if (entry.number_plain !== baseIdentity.number_plain) return false;
  const rowName = normalizeName(row.normalized_base_name || row.candidate_name);
  const entryName = normalizeName(entry.name);
  if (rowName !== entryName) return false;
  if (!entry.set_token) return true;
  if (entry.set_token === baseIdentity.token) return true;

  // Official OCR on Series 7 can read SFA as SHF for Shrouded Fable.
  if (entry.set_token === 'SHF' && baseIdentity.token === 'SFA') return true;
  return false;
}

function decisionReasonForWait(row, appearanceCount, strongestTierRank, fullCoverageSupported) {
  if (!row.unique_base_route || !row.base_gv_id) {
    return 'base_route_ambiguous_or_missing';
  }
  if (appearanceCount === 0) {
    return 'no_external_series_confirmation_yet';
  }
  if (appearanceCount === 1 && strongestTierRank > TIER_RANK.TIER_2) {
    return 'single_series_match_but_evidence_tier_too_weak';
  }
  if (appearanceCount === 1 && !fullCoverageSupported) {
    return 'single_series_match_but_series_1_to_3_coverage_not_resolved_for_this_base_set';
  }
  return 'insufficient_or_partial_evidence';
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Prize Pack Evidence V2');
  lines.push('');
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(
    'This pass re-audits the `WAIT_FOR_MORE_EVIDENCE` Prize Pack family-only backlog from v1 using a bounded evidence ladder and deterministic series coverage rules.',
  );
  lines.push('');
  lines.push('## Evidence Tiers');
  lines.push('');
  for (const tier of report.evidence_tiers) {
    lines.push(`- ${tier.id}: ${tier.summary}`);
  }
  lines.push('');
  lines.push('## Source Coverage');
  lines.push('');
  for (const source of report.series_sources) {
    lines.push(
      `- Series ${source.series}: ${source.source_name} | ${source.source_type} | ${source.entry_count} entries`,
    );
  }
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`- input_rows: ${report.summary.input_rows}`);
  lines.push(`- confirmed_identity: ${report.summary.classification_counts.CONFIRMED_IDENTITY}`);
  lines.push(`- duplicate_reprint: ${report.summary.classification_counts.DUPLICATE_REPRINT}`);
  lines.push(`- still_unproven: ${report.summary.classification_counts.STILL_UNPROVEN}`);
  lines.push(`- ready_for_warehouse: ${report.summary.next_action_counts.READY_FOR_WAREHOUSE}`);
  lines.push(`- do_not_canon: ${report.summary.next_action_counts.DO_NOT_CANON}`);
  lines.push(`- wait: ${report.summary.next_action_counts.WAIT}`);
  lines.push('');
  lines.push('## Evidence Tier Counts');
  lines.push('');
  for (const [tier, count] of Object.entries(report.summary.evidence_tier_counts)) {
    lines.push(`- ${tier}: ${count}`);
  }
  lines.push('');
  lines.push('## Decision Clusters');
  lines.push('');
  for (const cluster of report.cluster_summaries) {
    lines.push(
      `- ${cluster.cluster_id}: ${cluster.row_count} rows | ${cluster.evidence_class} | ${cluster.next_action}`,
    );
  }
  lines.push('');
  lines.push('## Next Executable Subset');
  lines.push('');
  lines.push(
    `- subset_id: ${report.next_executable_subset.subset_id}`,
  );
  lines.push(
    `- row_count: ${report.next_executable_subset.row_count}`,
  );
  lines.push(
    `- gate: ${report.next_executable_subset.decision_gate}`,
  );
  lines.push('');
  lines.push('Representative rows:');
  for (const row of report.next_executable_subset.representative_rows) {
    lines.push(
      `- ${row.candidate_name} | ${row.printed_number} | ${row.base_gv_id} | series ${row.appearance_in_series.join(', ')}`,
    );
  }
  lines.push('');
  lines.push('## Do-Not-Canon Summary');
  lines.push('');
  for (const row of report.do_not_canon_subset.representative_rows) {
    lines.push(
      `- ${row.candidate_name} | ${row.printed_number} | ${row.base_gv_id} | series ${row.appearance_in_series.join(', ')}`,
    );
  }
  lines.push('');
  lines.push('## Still Unproven Summary');
  lines.push('');
  for (const [reason, count] of Object.entries(report.summary.wait_reason_counts)) {
    lines.push(`- ${reason}: ${count}`);
  }
  lines.push('');
  lines.push('## Decision Rule');
  lines.push('');
  lines.push('- IF unique base route AND appearance count = 1 AND evidence tier <= TIER_2 AND full series coverage is supported, THEN READY_FOR_WAREHOUSE.');
  lines.push('- IF appearance count > 1 with no printed series marker, THEN DO_NOT_CANON.');
  lines.push('- ELSE WAIT.');
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push(`- ${report.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const v1 = JSON.parse(await fs.readFile(V1_PATH, 'utf8'));
  const sourceFixture = JSON.parse(await fs.readFile(SOURCE_FIXTURE_PATH, 'utf8'));
  const waitRows = v1.row_outcomes.filter((row) => row.next_action === 'WAIT_FOR_MORE_EVIDENCE');
  const seriesEntries = sourceFixture.series_sources.flatMap((source) =>
    source.entries.map((entry) => ({
      ...entry,
      series: source.series,
      source_name: source.source_name,
      source_type: source.source_type,
      source_url: source.source_url,
      evidence_tier: source.evidence_tier,
    })),
  );

  const rowOutcomes = [];
  const evidenceTierCounts = {
    TIER_1: 0,
    TIER_2: 0,
    TIER_3: 0,
    TIER_4: 0,
  };
  const classificationCounts = {
    CONFIRMED_IDENTITY: 0,
    DUPLICATE_REPRINT: 0,
    STILL_UNPROVEN: 0,
  };
  const nextActionCounts = {
    READY_FOR_WAREHOUSE: 0,
    DO_NOT_CANON: 0,
    WAIT: 0,
  };
  const waitReasonCounts = {};
  const clusterCounts = new Map();

  for (const row of waitRows) {
    const baseIdentity = parseBaseGvId(row.base_gv_id);
    const evidenceSources = [
      {
        source_name: 'JustTCG family-only source row',
        source_type: 'justtcg_source_row',
        evidence_tier: 'TIER_4',
        source_reference: row.source_external_id,
        note: 'Family-only stamped row without independent series proof.',
      },
    ];

    if ((row.evidence_sources || []).includes('bulbapedia_compare')) {
      evidenceSources.push({
        source_name: 'Bulbapedia compare audit',
        source_type: 'bulbapedia_compare',
        evidence_tier: 'TIER_3',
        source_reference: 'docs/checkpoints/warehouse/prize_pack_evidence_v1.json',
        note: 'Community corroboration carried forward from v1.',
      });
    }

    const matchedEntries = baseIdentity
      ? seriesEntries.filter((entry) => seriesEntryMatchesRow(entry, row, baseIdentity))
      : [];

    for (const entry of matchedEntries) {
      evidenceSources.push({
        source_name: entry.source_name,
        source_type: entry.source_type,
        evidence_tier: entry.evidence_tier,
        series: entry.series,
        source_url: entry.source_url,
        source_line: entry.raw_line,
      });
    }

    const appearanceInSeries = [...new Set(matchedEntries.map((entry) => entry.series))].sort(
      (a, b) => a - b,
    );
    const duplicateOccurrenceCount = appearanceInSeries.length;
    const strongestTierRank = strongestTier(evidenceSources);
    const evidenceTier = rankToTier(strongestTierRank);
    const earliestPossibleSeries = baseIdentity
      ? EARLIEST_POSSIBLE_SERIES_BY_TOKEN[baseIdentity.token] ?? null
      : null;
    const fullCoverageSupported = earliestPossibleSeries !== null && earliestPossibleSeries >= 4;

    let evidenceClass = 'STILL_UNPROVEN';
    let nextAction = 'WAIT';
    let decisionReason = decisionReasonForWait(
      row,
      duplicateOccurrenceCount,
      strongestTierRank,
      fullCoverageSupported,
    );

    if (row.unique_base_route && row.base_gv_id && duplicateOccurrenceCount > 1) {
      evidenceClass = 'DUPLICATE_REPRINT';
      nextAction = 'DO_NOT_CANON';
      decisionReason = 'appears_in_multiple_prize_pack_series_without_distinguishing_marker';
    } else if (
      row.unique_base_route &&
      row.base_gv_id &&
      duplicateOccurrenceCount === 1 &&
      strongestTierRank <= TIER_RANK.TIER_2 &&
      fullCoverageSupported
    ) {
      evidenceClass = 'CONFIRMED_IDENTITY';
      nextAction = 'READY_FOR_WAREHOUSE';
      decisionReason = 'single_series_match_with_complete_supported_coverage';
    }

    const imageAvailability = matchedEntries.some((entry) => entry.source_type === 'official_checklist_pdf')
      ? 'official_checklist_visual_available'
      : matchedEntries.some((entry) => entry.source_type === 'justinbasil_set_list')
        ? 'trusted_visual_set_list_available'
        : 'no_external_visual_evidence_attached';

    evidenceTierCounts[evidenceTier] += 1;
    classificationCounts[evidenceClass] += 1;
    nextActionCounts[nextAction] += 1;
    if (nextAction === 'WAIT') {
      waitReasonCounts[decisionReason] = (waitReasonCounts[decisionReason] ?? 0) + 1;
    }

    const clusterId = `${decisionReason}::${nextAction}`;
    clusterCounts.set(clusterId, {
      cluster_id: clusterId,
      evidence_class: evidenceClass,
      next_action: nextAction,
      decision_reason: decisionReason,
      row_count: (clusterCounts.get(clusterId)?.row_count ?? 0) + 1,
    });

    rowOutcomes.push({
      ...row,
      base_card_id: row.base_gv_id,
      base_route_token: baseIdentity?.token ?? null,
      appearance_in_series: appearanceInSeries,
      duplicate_occurrence_count: duplicateOccurrenceCount,
      evidence_sources_v2: evidenceSources,
      evidence_tier: evidenceTier,
      image_availability: imageAvailability,
      earliest_possible_series: earliestPossibleSeries,
      full_supported_coverage: fullCoverageSupported,
      evidence_class_v2: evidenceClass,
      next_action_v2: nextAction,
      decision_reason_v2: decisionReason,
    });
  }

  const readyRows = rowOutcomes.filter((row) => row.next_action_v2 === 'READY_FOR_WAREHOUSE');
  const doNotCanonRows = rowOutcomes.filter((row) => row.next_action_v2 === 'DO_NOT_CANON');

  const report = {
    generated_at: new Date().toISOString(),
    workflow: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V2',
    scope: {
      source_subset: 'WAIT_FOR_MORE_EVIDENCE',
      source_count: waitRows.length,
      excluded_subsets: [
        'OFFICIAL_SINGLE_SERIES_CONFIRMED',
        'DO_NOT_CANON (v1)',
        'other manual-review clusters',
      ],
    },
    source_artifacts: {
      prize_pack_evidence_v1: 'docs/checkpoints/warehouse/prize_pack_evidence_v1.json',
      evidence_source_fixture: 'docs/checkpoints/warehouse/prize_pack_series_evidence_sources_v2.json',
    },
    evidence_tiers: sourceFixture.evidence_tiers,
    series_sources: sourceFixture.series_sources.map((source) => ({
      series: source.series,
      source_name: source.source_name,
      source_type: source.source_type,
      source_url: source.source_url,
      evidence_tier: source.evidence_tier,
      entry_count: source.entries.length,
    })),
    summary: {
      input_rows: waitRows.length,
      evidence_tier_counts: evidenceTierCounts,
      classification_counts: classificationCounts,
      next_action_counts: nextActionCounts,
      wait_reason_counts: Object.fromEntries(
        Object.entries(waitReasonCounts).sort((a, b) => b[1] - a[1]),
      ),
    },
    cluster_summaries: [...clusterCounts.values()].sort((a, b) => b.row_count - a.row_count),
    next_executable_subset: {
      subset_id: 'PRIZE_PACK_FAMILY_ONLY_CONFIRMED_V2',
      row_count: readyRows.length,
      decision_gate:
        'unique base route AND single series appearance AND evidence tier <= TIER_2 AND complete supported coverage',
      representative_rows: readyRows.slice(0, 15).map((row) => ({
        candidate_name: row.candidate_name,
        printed_number: row.printed_number,
        base_gv_id: row.base_gv_id,
        appearance_in_series: row.appearance_in_series,
        evidence_tier: row.evidence_tier,
      })),
    },
    do_not_canon_subset: {
      row_count: doNotCanonRows.length,
      representative_rows: doNotCanonRows.slice(0, 15).map((row) => ({
        candidate_name: row.candidate_name,
        printed_number: row.printed_number,
        base_gv_id: row.base_gv_id,
        appearance_in_series: row.appearance_in_series,
        evidence_tier: row.evidence_tier,
      })),
    },
    row_outcomes: rowOutcomes,
    recommended_next_execution_step:
      readyRows.length > 0 ? 'PRIZE_PACK_READY_BATCH_V2' : 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V3',
  };

  await fs.writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
