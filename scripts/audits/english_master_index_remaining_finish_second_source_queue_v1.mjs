import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  FINISH_LABELS,
  markdownTable,
  uniqueSorted,
} from './verified_master_set_index_v1/shared.mjs';

const MASTER_INDEX_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_EXHAUSTION_DIR = 'docs/audits/english_master_index_source_exhaustion_v1';
const INPUT_FILE = path.join(SOURCE_EXHAUSTION_DIR, 'english_master_index_remaining_gap_facts_v1.json');
const ATTEMPT_OUTCOMES_FILE = path.join(SOURCE_EXHAUSTION_DIR, 'english_master_index_source_attempt_outcomes_v1.json');

const OUTPUT_JSON = path.join(MASTER_INDEX_DIR, 'english_master_index_remaining_finish_second_source_queue_v1.json');
const OUTPUT_MD = path.join(MASTER_INDEX_DIR, 'english_master_index_remaining_finish_second_source_queue_v1.md');

const MIRROR_JSON = path.join(SOURCE_EXHAUSTION_DIR, 'english_master_index_remaining_finish_second_source_queue_v1.json');
const MIRROR_MD = path.join(SOURCE_EXHAUSTION_DIR, 'english_master_index_remaining_finish_second_source_queue_v1.md');

const FINISH_PRIORITY = {
  stamped: 50,
  cosmos: 45,
  reverse: 40,
  holo: 35,
  normal: 20,
};

const FINISH_SOURCE_LADDER = {
  stamped: [
    'Exact product/stamp checklist row from TCGplayer, PriceCharting, CardTrader, TCDB, or collector checklist',
    'Official product page or sealed-product checklist naming the stamped card',
    'Manual physical-evidence fixture only when paired with an independent checklist source',
  ],
  cosmos: [
    'Exact product/checklist row naming cosmos holo or comparable product holo treatment',
    'Official product page or checklist naming the promo/product card and finish',
    'Manual physical-evidence fixture only when paired with an independent checklist source',
  ],
  reverse: [
    'Official checklist or set checklist with exact reverse-holo coverage',
    'Collector checklist/card page naming the exact card number and reverse finish',
    'Marketplace checklist row with exact card number, card name, set, and reverse finish',
  ],
  holo: [
    'Official checklist or collector checklist with exact holo treatment',
    'Marketplace checklist row with exact card number, card name, set, and holo finish',
    'Manual review only when source text proves holo treatment unambiguously',
  ],
  normal: [
    'Official checklist or collector checklist proving the non-holo/base printing',
    'Marketplace checklist row with exact card number, card name, set, and normal/non-holo label',
    'Manual review only when source text distinguishes normal from reverse/holo variants',
  ],
};

function increment(target, key, amount = 1) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + amount;
}

function setLabel(row) {
  return `${row.set_key}|${row.set_name ?? ''}`;
}

function rowKey(row) {
  return [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
  ].map((value) => String(value ?? '').trim()).join('|');
}

function gapKey(row) {
  return row.gap_key ?? [
    row.set_key,
    row.fact_type ?? 'printing_finish',
    row.card_number,
    row.card_name,
    row.finish_key,
  ].map((value) => String(value ?? '').trim()).join('|');
}

function mergeAttemptOutcome(row, outcome) {
  if (!outcome) return row;
  return {
    ...row,
    attempted_sources: outcome.attempted_sources ?? row.attempted_sources ?? [],
    attempt_classes: outcome.attempt_classes ?? row.attempt_classes ?? [],
    evidence_sources_found_in_attempts: outcome.evidence_sources_found_in_attempts ?? row.evidence_sources_found_in_attempts ?? [],
    blocked_or_unavailable_sources: outcome.blocked_or_unavailable_sources ?? row.blocked_or_unavailable_sources ?? [],
    no_exact_match_sources: outcome.no_exact_match_sources ?? row.no_exact_match_sources ?? [],
    recommendation: outcome.recommendation ?? row.recommendation,
    alternate_finish_observations: outcome.alternate_finish_observations ?? row.alternate_finish_observations ?? [],
  };
}

function classifyWork(row) {
  const evidenceFound = row.evidence_sources_found_in_attempts ?? [];
  const noExact = row.no_exact_match_sources ?? [];
  const blocked = row.blocked_or_unavailable_sources ?? [];

  if (evidenceFound.length > 0) return 'manual_independence_review';
  if (blocked.length > 0 && noExact.length === 0) return 'source_unblock_or_retry';
  if (noExact.length > 0) return 'new_exact_source_needed';
  return 'new_source_discovery_needed';
}

function priorityForGroup(rows) {
  const sizeScore = rows.length * 10;
  const finishScore = Math.max(...rows.map((row) => FINISH_PRIORITY[row.finish_key] ?? 10));
  const reviewBonus = rows.some((row) => (row.evidence_sources_found_in_attempts ?? []).length > 0) ? 25 : 0;
  return sizeScore + finishScore + reviewBonus;
}

function summarizeRows(rows) {
  const byFinish = {};
  const bySet = {};
  const bySource = {};
  const byWorkType = {};
  const attemptedSources = {};
  const evidenceFoundSources = {};
  const blockedSources = {};
  const noExactMatchSources = {};

  for (const row of rows) {
    increment(byFinish, row.finish_key);
    increment(bySet, setLabel(row));
    for (const source of row.sources ?? []) increment(bySource, source);
    increment(byWorkType, classifyWork(row));
    for (const source of new Set(row.attempted_sources ?? [])) increment(attemptedSources, source);
    for (const source of new Set(row.evidence_sources_found_in_attempts ?? [])) increment(evidenceFoundSources, source);
    for (const source of new Set(row.blocked_or_unavailable_sources ?? [])) increment(blockedSources, source);
    for (const source of new Set(row.no_exact_match_sources ?? [])) increment(noExactMatchSources, source);
  }

  return {
    total_rows: rows.length,
    by_finish: byFinish,
    by_set: bySet,
    by_current_source: bySource,
    by_work_type: byWorkType,
    attempted_sources: attemptedSources,
    evidence_found_sources: evidenceFoundSources,
    blocked_or_unavailable_sources: blockedSources,
    no_exact_match_sources: noExactMatchSources,
  };
}

function groupRows(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([key, groupRows]) => ({
    key,
    rows: groupRows,
    row_count: groupRows.length,
  }));
}

function topObjectEntries(object, limit = 25) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function compactRow(row) {
  return {
    gap_key: gapKey(row),
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    finish_label: FINISH_LABELS[row.finish_key] ?? row.finish_key,
    status: row.status,
    current_sources: row.sources ?? [],
    current_source_authorities: row.source_authorities ?? [],
    current_source_kinds: row.source_kinds ?? [],
    evidence_urls: row.evidence_urls ?? [],
    work_type: classifyWork(row),
    attempted_sources: row.attempted_sources ?? [],
    evidence_sources_found_in_attempts: row.evidence_sources_found_in_attempts ?? [],
    blocked_or_unavailable_sources: row.blocked_or_unavailable_sources ?? [],
    no_exact_match_sources: row.no_exact_match_sources ?? [],
    required_next_evidence: row.required_next_evidence,
    recommended_source_ladder: FINISH_SOURCE_LADDER[row.finish_key] ?? [
      'Exact independent card-level source with URL, source kind, card number, card name, set, and finish label',
    ],
    mutation_authority: false,
  };
}

function buildGroups(rows) {
  return groupRows(rows, (row) => `${row.set_key}|${row.set_name ?? ''}`)
    .map((group) => {
      const byFinish = summarizeRows(group.rows).by_finish;
      const workTypes = summarizeRows(group.rows).by_work_type;
      return {
        set_key: group.rows[0]?.set_key,
        set_name: group.rows[0]?.set_name,
        row_count: group.row_count,
        priority: priorityForGroup(group.rows),
        by_finish: byFinish,
        work_types: workTypes,
        current_sources: uniqueSorted(group.rows.flatMap((row) => row.sources ?? [])),
        evidence_sources_found_in_attempts: uniqueSorted(group.rows.flatMap((row) => row.evidence_sources_found_in_attempts ?? [])),
        blocked_or_unavailable_sources: uniqueSorted(group.rows.flatMap((row) => row.blocked_or_unavailable_sources ?? [])),
        no_exact_match_sources: uniqueSorted(group.rows.flatMap((row) => row.no_exact_match_sources ?? [])),
        recommended_next_action: Object.keys(workTypes).includes('manual_independence_review')
          ? 'Review found evidence for independence and exact finish fit; promote only through guarded staging if exact.'
          : 'Acquire a new independent exact card-level finish source.',
        rows: group.rows.map(compactRow),
      };
    })
    .sort((left, right) => right.priority - left.priority || right.row_count - left.row_count || left.set_key.localeCompare(right.set_key));
}

function buildFinishGroups(rows) {
  return groupRows(rows, (row) => row.finish_key)
    .map((group) => ({
      finish_key: group.key,
      finish_label: FINISH_LABELS[group.key] ?? group.key,
      row_count: group.row_count,
      set_count: new Set(group.rows.map((row) => row.set_key)).size,
      top_sets: topObjectEntries(summarizeRows(group.rows).by_set, 20).map(([set, count]) => ({ set, count })),
      recommended_source_ladder: FINISH_SOURCE_LADDER[group.key] ?? [],
      rows: group.rows.map(compactRow),
    }))
    .sort((left, right) => right.row_count - left.row_count || left.finish_key.localeCompare(right.finish_key));
}

function buildMarkdown(report) {
  const lines = [
    '# English Master Index Remaining Finish Second Source Queue V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'This is a report-only control sheet. It does not authorize database writes, cleanup, quarantine, insertion, deletion, or canonical mutation.',
    '',
    '## Safety',
    '',
    markdownTable(
      ['check', 'value'],
      [
        ['audit_only', report.audit_only],
        ['db_writes_performed', report.db_writes_performed],
        ['migrations_created', report.migrations_created],
        ['cleanup_performed', report.cleanup_performed],
        ['quarantine_performed', report.quarantine_performed],
        ['mutation_authority', false],
      ],
    ),
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['remaining_finish_second_source_needed', report.summary.total_rows],
        ['sets', Object.keys(report.summary.by_set).length],
        ['current_source_count', Object.keys(report.summary.by_current_source).length],
        ['conflicts_created', 0],
        ['candidate_promotions', 0],
      ],
    ),
    '',
    '## By Finish',
    '',
    markdownTable(
      ['finish', 'rows'],
      topObjectEntries(report.summary.by_finish, 20),
    ),
    '',
    '## By Work Type',
    '',
    markdownTable(
      ['work_type', 'rows'],
      topObjectEntries(report.summary.by_work_type, 20),
    ),
    '',
    '## Top Set Queues',
    '',
    markdownTable(
      ['priority', 'set', 'name', 'rows', 'finishes', 'next_action'],
      report.set_queues.slice(0, 40).map((set) => [
        set.priority,
        set.set_key,
        set.set_name,
        set.row_count,
        Object.entries(set.by_finish).map(([finish, count]) => `${finish}:${count}`).join(', '),
        set.recommended_next_action,
      ]),
    ),
    '',
    '## Source Attempt Signals',
    '',
    'Sources listed here are not automatically accepted. They only tell the next reviewer where prior attempts found evidence-like records, no exact match, or blocked access.',
    '',
    '### Evidence Found During Attempts',
    '',
    markdownTable(
      ['source', 'rows'],
      topObjectEntries(report.summary.evidence_found_sources, 30),
    ),
    '',
    '### No Exact Match',
    '',
    markdownTable(
      ['source', 'rows'],
      topObjectEntries(report.summary.no_exact_match_sources, 30),
    ),
    '',
    '### Blocked Or Unavailable',
    '',
    markdownTable(
      ['source', 'rows'],
      topObjectEntries(report.summary.blocked_or_unavailable_sources, 30),
    ),
    '',
    '## First 100 Row Queue',
    '',
    markdownTable(
      ['set', 'name', 'number', 'card', 'finish', 'work_type', 'current_sources', 'evidence_found_attempts'],
      report.rows.slice(0, 100).map((row) => [
        row.set_key,
        row.set_name,
        row.card_number,
        row.card_name,
        row.finish_key,
        row.work_type,
        row.current_sources.join(', '),
        row.evidence_sources_found_in_attempts.join(', '),
      ]),
    ),
    '',
    '## Guardrail',
    '',
    'A row may leave this queue only after an independent exact card-level finish source is captured with URL and evidence label, then accepted through the guarded staging path. This report does not write to the database.',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const input = JSON.parse(await fs.readFile(INPUT_FILE, 'utf8'));
  const attemptOutcomes = JSON.parse(await fs.readFile(ATTEMPT_OUTCOMES_FILE, 'utf8'));
  const attemptsByGapKey = new Map();
  for (const row of attemptOutcomes.rows ?? []) {
    attemptsByGapKey.set(gapKey(row), row);
  }

  const sourceRows = (input.facts ?? [])
    .filter((row) => row.gap_type === 'finish_second_source_needed')
    .map((row) => mergeAttemptOutcome(row, attemptsByGapKey.get(gapKey(row))));

  const rows = sourceRows
    .map(compactRow)
    .sort((left, right) => {
      const leftSet = `${left.set_key}|${left.set_name ?? ''}`;
      const rightSet = `${right.set_key}|${right.set_name ?? ''}`;
      return leftSet.localeCompare(rightSet) ||
        String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true }) ||
        left.card_name.localeCompare(right.card_name) ||
        left.finish_key.localeCompare(right.finish_key);
    });

  const report = {
    version: 'v1',
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    grookai_reconciliation_performed: false,
    rule: 'Rows in this queue remain human_source_verified until one additional independent exact card-level finish source is captured and accepted through guarded staging.',
    summary: summarizeRows(sourceRows),
    finish_queues: buildFinishGroups(sourceRows),
    set_queues: buildGroups(sourceRows),
    rows,
  };

  await fs.mkdir(MASTER_INDEX_DIR, { recursive: true });
  await fs.mkdir(SOURCE_EXHAUSTION_DIR, { recursive: true });
  const markdown = buildMarkdown(report);
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, markdown);
  await fs.writeFile(MIRROR_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(MIRROR_MD, markdown);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    remaining_finish_second_source_needed: report.summary.total_rows,
    by_finish: report.summary.by_finish,
    top_sets: Object.fromEntries(topObjectEntries(report.summary.by_set, 10)),
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
