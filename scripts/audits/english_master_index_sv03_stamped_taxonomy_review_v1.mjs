import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const MASTER_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = 'docs/audits/english_master_index_source_exhaustion_v1';
const GAP_FACTS_JSON = path.join(SOURCE_DIR, 'english_master_index_remaining_gap_facts_v1.json');
const ATTEMPT_OUTCOMES_JSON = path.join(SOURCE_DIR, 'english_master_index_source_attempt_outcomes_v1.json');
const TCGCOLLECTOR_ACCEPTED_JSON = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_source_delta_acceptance_v1/tcgcollector_card_variants.json';

const OUT_BASENAME = 'english_master_index_sv03_stamped_taxonomy_review_v1';
const OUT_JSON = path.join(MASTER_DIR, `${OUT_BASENAME}.json`);
const OUT_MD = path.join(MASTER_DIR, `${OUT_BASENAME}.md`);
const MIRROR_JSON = path.join(SOURCE_DIR, `${OUT_BASENAME}.json`);
const MIRROR_MD = path.join(SOURCE_DIR, `${OUT_BASENAME}.md`);

const TARGET_SET_KEY = 'sv03';
const TARGET_FINISH = 'stamped';

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT' && fallback !== null) return fallback;
    throw error;
  }
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
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

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+(?=\d)/, '');
}

function comparableName(value) {
  return normalizeText(value)
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sameCard(left, right) {
  return String(left.set_key) === String(right.set_key)
    && compactNumber(left.card_number) === compactNumber(right.card_number)
    && comparableName(left.card_name) === comparableName(right.card_name);
}

function attemptOutcomeByGapKey(attempts) {
  const map = new Map();
  for (const row of attempts.rows ?? []) map.set(gapKey(row), row);
  return map;
}

function tcgCollectorAlternates(records, fact) {
  return records
    .filter((record) => sameCard(record, fact))
    .filter((record) => record.finish_key && record.finish_key !== TARGET_FINISH)
    .map((record) => ({
      source_key: record.source_key,
      source_url: record.source_url,
      finish_key: record.finish_key,
      evidence_label: record.evidence_label,
      notes: record.notes,
    }));
}

function uniqueStrings(values) {
  return [...new Set((values ?? []).map((value) => String(value ?? '').trim()).filter(Boolean))].sort();
}

function classifyRow(fact, attempt, alternates) {
  const attemptedSources = uniqueStrings(attempt?.attempted_sources);
  const noExactMatchSources = uniqueStrings(attempt?.no_exact_match_sources);
  const evidenceSourcesFound = uniqueStrings(attempt?.evidence_sources_found_in_attempts);
  const blockedSources = uniqueStrings(attempt?.blocked_or_unavailable_sources);

  return {
    gap_key: gapKey(fact),
    set_key: fact.set_key,
    set_name: fact.set_name,
    card_number: fact.card_number,
    card_name: fact.card_name,
    current_finish_key: fact.finish_key,
    current_status: fact.status,
    current_sources: fact.sources ?? [],
    current_source_authorities: fact.source_authorities ?? [],
    evidence_urls: fact.evidence_urls ?? [],
    attempted_sources: attemptedSources,
    evidence_sources_found_in_attempts: evidenceSourcesFound,
    no_exact_match_sources: noExactMatchSources,
    blocked_or_unavailable_sources: blockedSources,
    alternate_active_finish_observations: [
      ...(attempt?.alternate_finish_observations ?? []),
      ...alternates,
    ],
    classification: 'blocked_stamped_child_finish_taxonomy',
    blocker_reason: 'The current fact is modeled as finish_key=stamped, but stamped is not a safe child finish. It must be represented as parent identity/stamp variant plus an independently proven active child finish.',
    required_evidence_to_close: [
      'Exact independent source proving the stamped identity for this set/card/number/name.',
      'Exact source evidence proving the active child finish that the stamped card carries: normal, holo, reverse, cosmos, or cracked_ice.',
      'A guarded staging pass that converts this from child finish_key=stamped into parent identity plus active child finish without broad inference.',
    ],
    promotion_safe_now: false,
  };
}

function buildMarkdown(report) {
  const rows = report.rows.map((row) => [
    row.card_number,
    row.card_name,
    row.current_finish_key,
    row.classification,
    row.no_exact_match_sources.join(', '),
    row.alternate_active_finish_observations.map((item) => `${item.finish_key}:${item.source_key}`).join(', '),
  ]);

  return `# English Master Index SV03 Stamped Taxonomy Review V1

Generated: ${report.generated_at}

Audit-only report. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Safety

${markdownTable(['check', 'value'], Object.entries(report.safety_confirmation))}

## Summary

${markdownTable(['metric', 'value'], [
    ['target_set', `${TARGET_SET_KEY} / Obsidian Flames`],
    ['target_finish', TARGET_FINISH],
    ['target_rows', report.summary.target_rows],
    ['promotion_safe_now', report.summary.promotion_safe_now],
    ['write_ready_now', report.summary.write_ready_now],
    ['rows_with_alternate_active_finish_observation', report.summary.rows_with_alternate_active_finish_observation],
  ])}

## By Classification

${markdownTable(['classification', 'rows'], Object.entries(report.summary.by_classification))}

## Rows

${rows.length ? markdownTable(['number', 'card', 'current_finish', 'classification', 'no_exact_sources', 'alternate_active_finish_observations'], rows) : '_No rows._'}

## Rule

${report.rule}

## Required Closure Shape

- Exact stamped identity source.
- Exact active finish source.
- Guarded staging conversion to parent identity plus active child finish.
- No child \`finish_key=stamped\` promotion.
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [gaps, attempts, tcgCollector] = await Promise.all([
    readJson(GAP_FACTS_JSON),
    readJson(ATTEMPT_OUTCOMES_JSON, { rows: [] }),
    readJson(TCGCOLLECTOR_ACCEPTED_JSON, { records: [] }),
  ]);

  const attemptMap = attemptOutcomeByGapKey(attempts);
  const tcgCollectorRecords = tcgCollector.records ?? [];
  const targetFacts = (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'finish_second_source_needed')
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.set_key === TARGET_SET_KEY)
    .filter((row) => row.finish_key === TARGET_FINISH)
    .sort((left, right) => String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));

  const rows = targetFacts.map((fact) => classifyRow(
    fact,
    attemptMap.get(gapKey(fact)),
    tcgCollectorAlternates(tcgCollectorRecords, fact),
  ));

  const report = {
    version: OUT_BASENAME,
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    grookai_reconciliation_performed: false,
    target_scope: {
      set_key: TARGET_SET_KEY,
      set_name: 'Obsidian Flames',
      finish_key: TARGET_FINISH,
      source_status: 'thepricedex_only_current_master_index_rows',
    },
    rule: 'Remaining Obsidian Flames stamped rows must not be promoted as child finish_key=stamped. Stamped is an identity/variant attribute that needs active finish routing before any DB reconciliation.',
    summary: {
      target_rows: rows.length,
      promotion_safe_now: 0,
      write_ready_now: 0,
      by_classification: countBy(rows, (row) => row.classification),
      by_current_source: countBy(rows.flatMap((row) => row.current_sources), (source) => source),
      rows_with_alternate_active_finish_observation: rows.filter((row) => row.alternate_active_finish_observations.length > 0).length,
      attempted_source_counts: countBy(rows.flatMap((row) => row.attempted_sources), (source) => source),
      no_exact_match_source_counts: countBy(rows.flatMap((row) => row.no_exact_match_sources), (source) => source),
    },
    rows,
    safety_confirmation: {
      audit_only: true,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      write_ready_now: 0,
    },
  };

  const markdown = buildMarkdown(report);
  await fs.mkdir(MASTER_DIR, { recursive: true });
  await fs.mkdir(SOURCE_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, markdown);
  await fs.writeFile(MIRROR_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(MIRROR_MD, markdown);
  console.log(JSON.stringify({
    output_json: OUT_JSON,
    mirror_json: MIRROR_JSON,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
