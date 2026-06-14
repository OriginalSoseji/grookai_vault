import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PKG18X_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json');
const PKG16B_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg16b_same_finish_stamped_split_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18g_stamped_conflict_manual_closure_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18g_stamped_conflict_manual_closure_v1.md');

const PACKAGE_ID = 'PKG-18G-STAMPED-CONFLICT-MANUAL-CLOSURE';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
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

function rowsFromPkg18x(pkg18x) {
  return (pkg18x.rows ?? [])
    .filter((row) => row.execution_bucket === 'bucket_07_conflict_adjudication_manual')
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      queue_status: row.queue_status,
      variant_family: row.variant_family,
      governance_rule_id: row.governance_rule_id,
      blockers: row.blockers ?? [],
      closure_status: 'blocked_manual_conflict_adjudication_required',
      write_ready_now: 0,
      required_next_evidence: 'Manual adjudication with exact source-backed active finish resolution. Do not write while source observations conflict.',
    }));
}

function renderMarkdown(report) {
  return `# PKG-18G Stamped Conflict Manual Closure V1

Audit-only closure for the final conflict bucket.

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
    ['conflict_rows', report.summary.conflict_rows],
    ['write_ready_rows', report.summary.write_ready_rows],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Conflict Rows

${markdownTable(
    ['set', 'number', 'card', 'variant', 'finish', 'status'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.finish_key,
      row.closure_status,
    ]),
  )}

These rows remain fail-closed. No write package should include them until a separate human adjudication artifact resolves the conflicting finish observation.
`;
}

async function main() {
  const [pkg18x, pkg16b] = await Promise.all([
    readJson(PKG18X_JSON),
    readJsonIfExists(PKG16B_JSON),
  ]);
  const rows = rowsFromPkg18x(pkg18x);
  const payload = {
    pkg18x_fingerprint: pkg18x.fingerprint_sha256,
    pkg16b_fingerprint: pkg16b?.fingerprint_sha256 ?? null,
    rows,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18g_stamped_conflict_manual_closure_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      execution_queue: rel(PKG18X_JSON),
      same_finish_split_readiness: pkg16b ? rel(PKG16B_JSON) : null,
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      conflict_rows: rows.length,
      write_ready_rows: 0,
      by_variant_key: countBy(rows, (row) => row.variant_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
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
