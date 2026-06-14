import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PKG18X_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18ab_stamped_no_write_governance_closure_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18ab_stamped_no_write_governance_closure_v1.md');

const PACKAGE_ID = 'PKG-18AB-STAMPED-NO-WRITE-GOVERNANCE-CLOSURE';
const CLOSED_BUCKETS = new Set([
  'bucket_01_no_write_generic_stamped_suppression',
  'bucket_02_no_printing_write_battle_academy_display_metadata',
]);

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

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
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

function evidenceClass(row) {
  if (row.execution_bucket === 'bucket_01_no_write_generic_stamped_suppression') {
    return 'generic_stamped_claim_not_canonical_identity';
  }
  if (row.execution_bucket === 'bucket_02_no_printing_write_battle_academy_display_metadata') {
    return 'battle_academy_deck_mark_display_metadata_not_printing_finish';
  }
  return 'not_closed_by_this_package';
}

function buildClosedRows(rows) {
  return rows
    .filter((row) => CLOSED_BUCKETS.has(row.execution_bucket))
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      queue_status: row.queue_status,
      execution_bucket: row.execution_bucket,
      governance_rule_id: row.governance_rule_id,
      closure_status: 'closed_from_write_readiness_by_governance',
      closure_reason: evidenceClass(row),
      write_effect: 'none',
      future_reopen_condition: row.execution_bucket === 'bucket_01_no_write_generic_stamped_suppression'
        ? 'Reopen only if an exact independent source proves the stamped identity label for this set/card/number.'
        : 'Reopen only if governance decides Battle Academy deck marks are canonical printed identities, not display metadata.',
    }))
    .sort((left, right) => (
      left.execution_bucket.localeCompare(right.execution_bucket)
      || String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
    ));
}

function renderMarkdown(report) {
  return `# PKG-18AB Stamped No-Write Governance Closure V1

Audit-only closure artifact for stamped rows that should not enter DB write-readiness packages.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['source_artifact', report.source_artifact],
    ['closed_rows', report.summary.closed_rows],
    ['generic_stamped_suppression_rows', report.summary.generic_stamped_suppression_rows],
    ['battle_academy_display_metadata_rows', report.summary.battle_academy_display_metadata_rows],
    ['remaining_future_guarded_rows', report.summary.remaining_future_guarded_rows],
    ['remaining_blocked_rows', report.summary.remaining_blocked_rows],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Closed Buckets

${markdownTable(
    ['bucket', 'rows', 'closure rule'],
    Object.entries(report.summary.by_execution_bucket).map(([bucket, count]) => [
      bucket,
      count,
      bucket === 'bucket_01_no_write_generic_stamped_suppression'
        ? 'Generic stamped claims are not canonical stamped identities without exact label evidence.'
        : 'Battle Academy deck marks are display/deck metadata and do not create card_printing finish rows.',
    ]),
  )}

## Governance Effect

These rows are closed from write-readiness planning only. This report does not delete, hide, quarantine, or mutate any Grookai row.

Future package builders should exclude these rows unless the reopen condition on the row is satisfied.
`;
}

async function main() {
  const pkg18x = await readJson(PKG18X_JSON);
  const rows = pkg18x.rows ?? [];
  const closedRows = buildClosedRows(rows);
  const remainingRows = rows.filter((row) => !CLOSED_BUCKETS.has(row.execution_bucket));
  const payload = {
    pkg18x_fingerprint: pkg18x.fingerprint_sha256,
    closedRows,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18ab_stamped_no_write_governance_closure_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifact: rel(PKG18X_JSON),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      closed_rows: closedRows.length,
      generic_stamped_suppression_rows: closedRows.filter((row) => row.execution_bucket === 'bucket_01_no_write_generic_stamped_suppression').length,
      battle_academy_display_metadata_rows: closedRows.filter((row) => row.execution_bucket === 'bucket_02_no_printing_write_battle_academy_display_metadata').length,
      remaining_future_guarded_rows: remainingRows.filter((row) => String(row.execution_bucket).match(/^bucket_0[3-6]_/)).length,
      remaining_blocked_rows: remainingRows.filter((row) => row.execution_bucket === 'bucket_07_conflict_adjudication_manual').length,
      by_execution_bucket: countBy(closedRows, (row) => row.execution_bucket),
      by_closure_reason: countBy(closedRows, (row) => row.closure_reason),
      top_sets: Object.entries(countBy(closedRows, (row) => row.set_key)).slice(0, 20).map(([key, count]) => ({ key, count })),
    },
    closure_rules: [
      {
        rule_id: 'generic_stamped_suppression_rule',
        closed_rows: closedRows.filter((row) => row.execution_bucket === 'bucket_01_no_write_generic_stamped_suppression').length,
        rule: 'Generic stamped claims are not canonical parent identity. They require exact stamp label evidence before any write package can include them.',
      },
      {
        rule_id: 'battle_academy_display_metadata_rule',
        closed_rows: closedRows.filter((row) => row.execution_bucket === 'bucket_02_no_printing_write_battle_academy_display_metadata').length,
        rule: 'Battle Academy deck marks are display/deck metadata. They do not create child finish rows and do not use finish_key=stamped.',
      },
    ],
    closed_rows: closedRows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
