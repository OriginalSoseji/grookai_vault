import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const DELTA_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1';
const OUTPUT_JSON = path.join(DELTA_DIR, 'english_master_index_source_delta_summary_v1.json');
const OUTPUT_MD = path.join(DELTA_DIR, 'english_master_index_source_delta_summary_v1.md');

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function addCount(target, key, amount = 1) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + amount;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const files = (await fs.readdir(DELTA_DIR))
    .filter((file) => file.endsWith('_source_delta_audit_v1.json'))
    .sort();

  const sources = [];
  const totals = {
    candidate_records_loaded: 0,
    matched_gap_facts: 0,
    useful_candidate_matches: 0,
    already_in_current_index: 0,
    unmatched_candidate_records: 0,
  };
  const byUnmatchedReason = {};
  const byDeltaStatus = {};

  for (const file of files) {
    const payload = await readJson(path.join(DELTA_DIR, file));
    const summary = payload.summary ?? {};
    for (const key of Object.keys(totals)) {
      totals[key] += Number(summary[key] ?? 0);
    }
    for (const [key, value] of Object.entries(summary.by_unmatched_reason ?? {})) addCount(byUnmatchedReason, key, value);
    for (const [key, value] of Object.entries(summary.by_delta_status ?? {})) addCount(byDeltaStatus, key, value);
    sources.push({
      source_key: payload.source_key,
      candidate_records_loaded: summary.candidate_records_loaded ?? 0,
      matched_gap_facts: summary.matched_gap_facts ?? 0,
      useful_candidate_matches: summary.useful_candidate_matches ?? 0,
      already_in_current_index: summary.already_in_current_index ?? 0,
      unmatched_candidate_records: summary.unmatched_candidate_records ?? 0,
      delta_report: file,
      status: summary.useful_candidate_matches > 0 ? 'candidate_review_needed' : 'no_useful_unabsorbed_gap_evidence',
    });
  }

  const output = {
    version: 'english_master_index_source_delta_summary_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    rule: 'Existing source lanes are delta-tested against current remaining gaps before any global rebuild or new acquisition work.',
    summary: {
      sources_reviewed: sources.length,
      ...totals,
      useful_unabsorbed_source_lanes: sources.filter((source) => source.useful_candidate_matches > 0).length,
      conclusion: totals.useful_candidate_matches > 0
        ? 'Review useful source lanes before any guarded rebuild.'
        : 'Existing generated source lanes do not contain useful unabsorbed evidence for current gaps; continue with new or retried source acquisition.',
    },
    by_delta_status: byDeltaStatus,
    by_unmatched_reason: byUnmatchedReason,
    sources,
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(output, null, 2)}\n`);
  const md = [
    '# English Master Index Source Delta Summary V1',
    '',
    'Audit-only summary of existing source lanes tested against the current remaining Master Index gaps.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['Metric', 'Value'],
      [
        ['sources_reviewed', output.summary.sources_reviewed],
        ['candidate_records_loaded', output.summary.candidate_records_loaded],
        ['matched_gap_facts', output.summary.matched_gap_facts],
        ['useful_candidate_matches', output.summary.useful_candidate_matches],
        ['already_in_current_index', output.summary.already_in_current_index],
        ['unmatched_candidate_records', output.summary.unmatched_candidate_records],
        ['useful_unabsorbed_source_lanes', output.summary.useful_unabsorbed_source_lanes],
      ],
    ),
    '',
    '## Conclusion',
    '',
    output.summary.conclusion,
    '',
    '## Source Lanes',
    '',
    markdownTable(
      ['Source', 'Loaded', 'Matched Gaps', 'Useful', 'Already In Index', 'Unmatched', 'Status'],
      sources.map((source) => [
        source.source_key,
        source.candidate_records_loaded,
        source.matched_gap_facts,
        source.useful_candidate_matches,
        source.already_in_current_index,
        source.unmatched_candidate_records,
        source.status,
      ]),
    ),
    '',
    '## Safety Confirmation',
    '',
    '```json',
    JSON.stringify({
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    }, null, 2),
    '```',
    '',
  ].join('\n');
  await fs.writeFile(OUTPUT_MD, md);

  console.log(JSON.stringify(output.summary, null, 2));
}

await main();
