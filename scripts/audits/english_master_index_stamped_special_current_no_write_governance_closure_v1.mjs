import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_current_no_write_governance_closure_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_current_no_write_governance_closure_v1.md');

const NO_WRITE_BUCKETS = new Set([
  'display_metadata_no_write',
  'closed_stale_no_write',
  'generic_stamped_suppressed_no_write',
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

function closureReason(row) {
  switch (row.action_bucket) {
    case 'display_metadata_no_write':
      return 'display_or_product_metadata_not_canonical_printing';
    case 'closed_stale_no_write':
      return 'live_state_or_prior_package_satisfied_or_staled_row';
    case 'generic_stamped_suppressed_no_write':
      return 'generic_stamped_claim_not_specific_canonical_identity';
    default:
      return 'not_closed_by_this_report';
  }
}

function reopenCondition(row) {
  switch (row.action_bucket) {
    case 'display_metadata_no_write':
      return 'Reopen only if a source proves this is a distinct physical identity/printing rather than display, deck, or product metadata.';
    case 'closed_stale_no_write':
      return 'Reopen only if the live residual queue reintroduces this row after a fresh DB comparison.';
    case 'generic_stamped_suppressed_no_write':
      return 'Reopen only if exact independent evidence names the specific stamp/variant label for this set, card number, and card name.';
    default:
      return '';
  }
}

function toClosureRow(row) {
  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    finish_key: row.finish_key,
    action_bucket: row.action_bucket,
    execution_bucket: row.execution_bucket,
    final_status: row.final_status,
    closure_status: 'closed_from_write_readiness_by_current_governance',
    closure_reason: closureReason(row),
    write_effect: 'none',
    future_reopen_condition: reopenCondition(row),
  };
}

function renderMarkdown(report) {
  return `# Stamped/Special Current No-Write Governance Closure V1

Generated: ${report.generated_at}

This report closes current live residual rows from write-readiness planning only. It does not delete, hide, quarantine, insert, update, or otherwise mutate Grookai data.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- apply_performed: ${report.apply_performed}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_created: ${report.write_ready_created}

## Summary

${markdownTable(['metric', 'value'], [
    ['input_report', report.input_report],
    ['input_fingerprint', `\`${report.input_fingerprint_sha256}\``],
    ['closed_rows', report.summary.closed_rows],
    ['display_metadata_no_write', report.summary.by_action_bucket.display_metadata_no_write ?? 0],
    ['closed_stale_no_write', report.summary.by_action_bucket.closed_stale_no_write ?? 0],
    ['generic_stamped_suppressed_no_write', report.summary.by_action_bucket.generic_stamped_suppressed_no_write ?? 0],
    ['report_fingerprint', `\`${report.fingerprint_sha256}\``],
  ])}

## Closure Reasons

${markdownTable(
    ['reason', 'rows'],
    Object.entries(report.summary.by_closure_reason).map(([reason, rows]) => [reason, rows]),
  )}

## Governance Meaning

- Display/product metadata rows are not canonical child printing rows unless future evidence proves a distinct physical identity.
- Closed stale rows remain out of write planning unless a fresh live residual comparison reopens them.
- Generic stamped claims remain suppressed until they become exact named stamp identities.

## Sample Rows

${markdownTable(
    ['set', 'number', 'card', 'stamp', 'bucket', 'reason'],
    report.closed_rows.slice(0, 40).map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label || row.variant_key || '',
      row.action_bucket,
      row.closure_reason,
    ]),
  )}
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = input.rows ?? [];
  const closedRows = rows
    .filter((row) => NO_WRITE_BUCKETS.has(row.action_bucket))
    .map(toClosureRow)
    .sort((left, right) => (
      left.action_bucket.localeCompare(right.action_bucket)
      || String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
    ));

  const payload = {
    input_fingerprint_sha256: input.fingerprint_sha256,
    closedRows,
  };

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_current_no_write_governance_closure_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_created: 0,
    input_report: rel(INPUT_JSON),
    input_fingerprint_sha256: input.fingerprint_sha256,
    summary: {
      closed_rows: closedRows.length,
      by_action_bucket: countBy(closedRows, (row) => row.action_bucket),
      by_closure_reason: countBy(closedRows, (row) => row.closure_reason),
      by_set: countBy(closedRows, (row) => row.set_key),
      remaining_non_closed_rows: rows.length - closedRows.length,
    },
    closed_rows: closedRows,
  };
  report.fingerprint_sha256 = sha256(stableJson(payload));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
