import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06i_active_finish_child_printing_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06i_active_finish_child_printing_post_apply_alias_verification_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06i_active_finish_child_printing_post_apply_alias_verification_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg06i_active_finish_child_printing_post_apply_alias_verification_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-06I-ACTIVE-FINISH-CHILD-PRINTING-INSERTS';
const EXPECTED_CHILD_ROWS = 84;
const EXPECTED_PARENT_ROWS = 78;
const EXPECTED_SET_COUNTS_INDEX_KEYS = {
  pop8: 9,
  sve: 9,
  svp: 9,
  xy3: 9,
  '2019sm': 8,
  bw4: 8,
  sv10: 8,
  swsh8: 8,
  xy7: 8,
  xy8: 8,
};
const EXPECTED_FINISH_COUNTS = { cosmos: 57, normal: 9, holo: 9, reverse: 9 };
const LIVE_TO_INDEX_SET_ALIASES = { mcd19: '2019sm' };

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function validateCounts(actual, expected, prefix, findings) {
  for (const [key, count] of Object.entries(expected)) {
    if (actual[key] !== count) findings.push(`${prefix}_${key}_count_not_${count}`);
  }
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readInsertedRows(ids) {
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const result = await client.query(
      `select
         cpr.id::text as card_printing_id,
         cpr.card_print_id::text as card_print_id,
         cp.set_code,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.name as card_name,
         cpr.finish_key,
         cpr.is_provisional,
         cpr.provenance_source,
         cpr.provenance_ref,
         cpr.created_by
       from public.card_printings cpr
       join public.card_prints cp on cp.id = cpr.card_print_id
       where cpr.id = any($1::uuid[])
       order by cp.set_code, card_number, cp.name, cpr.finish_key, cpr.id`,
      [ids],
    );
    return result.rows;
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  return `# PKG-06I Post-Apply Alias Verification V1

This read-only verification resolves the PKG-06I post-apply verifier stop finding.

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| verification_status | ${report.verification_status} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| inserted_rows_found | ${report.inserted_rows_found} |
| target_parent_rows | ${report.target_parent_rows} |
| parent_rows_unchanged | ${report.parent_rows_unchanged} |
| stop_findings | ${report.stop_findings.length} |

## Alias Resolution

- live DB set_code \`mcd19\` maps to Master Index set key \`2019sm\`.
- The original apply committed and inserted all 84 rows.
- The only stop finding was alias-only: \`inserted_set_2019sm_count_not_8\`.

## Alias-Aware Counts

${JSON.stringify(report.alias_aware_set_counts, null, 2)}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-06I Active Finish Child Printing Post-Apply Alias Verification Checkpoint V1](20260609_pkg06i_active_finish_child_printing_post_apply_alias_verification_checkpoint_v1.md) | Read-only verification that PKG-06I committed successfully; live mcd19 set_code maps to Master Index 2019sm alias. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg06i_active_finish_child_printing_post_apply_alias_verification_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260609_pkg06i_active_finish_child_printing_post_apply_alias_verification_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const applyReport = readJson(APPLY_JSON);
const ids = applyReport.rollback_proof?.inserted_row_ids ?? [];
const rows = await readInsertedRows(ids);
const aliasAwareRows = rows.map((row) => ({
  ...row,
  index_set_key: LIVE_TO_INDEX_SET_ALIASES[row.set_code] ?? row.set_code,
}));
const stopFindings = [];
if (applyReport.execution_result?.committed !== true) stopFindings.push('original_apply_not_committed');
if (rows.length !== EXPECTED_CHILD_ROWS) stopFindings.push('inserted_rows_found_not_84');
if (new Set(rows.map((row) => row.card_print_id)).size !== EXPECTED_PARENT_ROWS) stopFindings.push('target_parent_rows_not_78');
if (rows.some((row) => row.is_provisional === true)) stopFindings.push('provisional_rows_present');
validateCounts(countBy(aliasAwareRows, (row) => row.index_set_key), EXPECTED_SET_COUNTS_INDEX_KEYS, 'alias_aware_set', stopFindings);
validateCounts(countBy(rows, (row) => row.finish_key), EXPECTED_FINISH_COUNTS, 'finish', stopFindings);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg06i_active_finish_child_printing_post_apply_alias_verification_v1',
  package_id: PACKAGE_ID,
  read_only_verification: true,
  db_reads_performed: true,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  original_apply_status: applyReport.apply_status,
  original_execution_result: applyReport.execution_result,
  original_stop_findings: applyReport.stop_findings,
  alias_map_applied: LIVE_TO_INDEX_SET_ALIASES,
  inserted_rows_found: rows.length,
  target_parent_rows: new Set(rows.map((row) => row.card_print_id)).size,
  live_set_counts: countBy(rows, (row) => row.set_code),
  alias_aware_set_counts: countBy(aliasAwareRows, (row) => row.index_set_key),
  finish_counts: countBy(rows, (row) => row.finish_key),
  parent_rows_unchanged: applyReport.verification_summary?.parent_rows_unchanged === true,
  inserted_row_hash_sha256: sha256(stableJson(rows)),
  stop_findings: stopFindings,
  verification_status: stopFindings.length === 0
    ? 'pkg06i_committed_and_alias_verified'
    : 'pkg06i_alias_verification_failed',
  pass: stopFindings.length === 0,
};

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  ],
  verification_status: report.verification_status,
  original_stop_findings: report.original_stop_findings,
  inserted_rows_found: report.inserted_rows_found,
  live_set_counts: report.live_set_counts,
  alias_aware_set_counts: report.alias_aware_set_counts,
  finish_counts: report.finish_counts,
  db_writes_performed: false,
  migrations_created: false,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
