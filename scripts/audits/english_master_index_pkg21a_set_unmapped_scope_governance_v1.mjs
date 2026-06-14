import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg21a_set_unmapped_scope_governance_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg21a_set_unmapped_scope_governance_v1.md');

const POCKET_SET_CODES = new Set(['a1', 'a1a', 'a2', 'a2a', 'a2b', 'a3', 'a3b', 'a4', 'a4a', 'b1']);

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function classify(row) {
  const setCode = normalizeText(row.set_code);
  if (POCKET_SET_CODES.has(setCode)) {
    return {
      governance_status: 'scope_excluded_non_write',
      governance_category: 'pokemon_tcg_pocket_digital_domain',
      recommended_action: 'Keep outside the English physical TCG Master Index. Model under a separate Pocket/digital domain if Grookai needs to retain these rows.',
      db_reconciliation_action: 'none',
      write_ready: false,
      deletion_authority: false,
    };
  }
  if (setCode === 'legacy_orphan') {
    return {
      governance_status: 'blocked_manual_review',
      governance_category: 'legacy_orphan_unmapped',
      recommended_action: 'Resolve source lineage and owner before any write, delete, hide, or migration plan.',
      db_reconciliation_action: 'none',
      write_ready: false,
      deletion_authority: false,
    };
  }
  return {
    governance_status: 'blocked_unclassified_unmapped_set',
    governance_category: 'unclassified_set_unmapped',
    recommended_action: 'Resolve set identity or scope before any write, delete, hide, or migration plan.',
    db_reconciliation_action: 'none',
    write_ready: false,
    deletion_authority: false,
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_governance_status).map(([status, count]) => [status, count]);
  const categoryRows = Object.entries(report.summary.by_governance_category).map(([category, count]) => [category, count]);
  const setRows = Object.entries(report.summary.by_set_code).map(([set, count]) => [set, count]);
  return `# PKG-21A Set-Unmapped Scope Governance V1

Read-only governance classification for current \`set_unmapped\` rows after PKG-20A.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_set_unmapped_rows: ${report.summary.source_set_unmapped_rows}
- scope_excluded_non_write_rows: ${report.summary.scope_excluded_non_write_rows}
- blocked_rows: ${report.summary.blocked_rows}

## By Status

${markdownTable(['status', 'rows'], statusRows)}

## By Category

${markdownTable(['category', 'rows'], categoryRows)}

## By Set Code

${markdownTable(['set_code', 'rows'], setRows)}

## Governance

- Pocket/digital set codes are not English physical TCG Master Index debt.
- This artifact does not delete, hide, quarantine, migrate, or rewrite any DB row.
- Legacy orphan rows remain blocked until lineage is resolved.
`;
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.lane === 'set_unmapped');
const rows = sourceRows.map((row) => ({
  ...classify(row),
  set_code: row.set_code,
  card_number: row.card_number,
  card_name: row.card_name,
  finish_key: row.finish_key,
  card_print_id: row.card_print_id,
  card_printing_id: row.card_printing_id,
  source_lane: row.lane,
}));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg21a_set_unmapped_scope_governance_v1',
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: SOURCE_JSON,
  source_generated_at: source.generated_at,
  summary: {
    source_set_unmapped_rows: rows.length,
    scope_excluded_non_write_rows: rows.filter((row) => row.governance_status === 'scope_excluded_non_write').length,
    blocked_rows: rows.filter((row) => row.governance_status !== 'scope_excluded_non_write').length,
    by_governance_status: countBy(rows, (row) => row.governance_status),
    by_governance_category: countBy(rows, (row) => row.governance_category),
    by_set_code: countBy(rows, (row) => row.set_code),
    by_finish: countBy(rows, (row) => row.finish_key),
  },
  rows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  summary: report.summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
