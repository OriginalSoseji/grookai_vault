import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10_finish_taxonomy_unlock_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg10a_cracked_ice_finish_taxonomy_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION';
const SOURCE_PACKAGE_ID = 'PKG-10-FINISH-TAXONOMY-UNLOCK-READINESS';
const FINISH_KEY = 'cracked_ice';
const FINISH_LABEL = 'Cracked Ice Holo';
const FINISH_SORT_ORDER = 36;

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

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

function flattenQueryResults(result) {
  if (Array.isArray(result)) return result.flatMap((item) => item.rows ?? []);
  return result?.rows ?? [];
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

async function captureFinishSnapshot(client) {
  const result = await client.query(
    `select key, label, sort_order, is_active, meta
     from public.finish_keys
     order by sort_order, key`,
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    cracked_ice_row: result.rows.find((row) => row.key === FINISH_KEY) ?? null,
    counts: {
      total_finish_keys: result.rows.length,
      active_finish_keys: result.rows.filter((row) => row.is_active).length,
      cracked_ice_rows: result.rows.filter((row) => row.key === FINISH_KEY).length,
      cracked_ice_active_rows: result.rows.filter((row) => row.key === FINISH_KEY && row.is_active).length,
    },
  };
}

function buildSql({ packageFingerprint, sourceFingerprint, candidateRows }) {
  return `-- English Master Index ${PACKAGE_ID} guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source artifact fingerprint: ${sourceFingerprint}
-- Package fingerprint: ${packageFingerprint}

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into public.finish_keys (key, label, sort_order, is_active, meta)
values (
  '${FINISH_KEY}',
  '${FINISH_LABEL}',
  ${FINISH_SORT_ORDER},
  true,
  jsonb_build_object(
    'source_contract', 'VERIFIED_MASTER_SET_INDEX_V1',
    'source_package', '${PACKAGE_ID}',
    'source_readiness_fingerprint', '${sourceFingerprint}',
    'notes', 'Source-backed cracked ice holo finish used by verified English Master Index printings. Taxonomy activation only; no child printings are inserted by this package.'
  )
)
on conflict (key) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true,
  meta = public.finish_keys.meta || excluded.meta;

do $$
declare
  active_count int;
  candidate_count int := ${candidateRows};
begin
  select count(*) into active_count
  from public.finish_keys
  where key = '${FINISH_KEY}'
    and label = '${FINISH_LABEL}'
    and sort_order = ${FINISH_SORT_ORDER}
    and is_active = true;

  if active_count <> 1 then
    raise exception 'PKG-10A cracked_ice finish activation proof failed: %', active_count;
  end if;

  if candidate_count <> 131 then
    raise exception 'PKG-10A cracked_ice candidate count drift: %', candidate_count;
  end if;
end $$;

select
  '${PACKAGE_ID}'::text as package_id,
  '${sourceFingerprint}'::text as source_readiness_fingerprint,
  '${packageFingerprint}'::text as package_fingerprint,
  '${FINISH_KEY}'::text as finish_key,
  '${FINISH_LABEL}'::text as finish_label,
  ${FINISH_SORT_ORDER}::int as finish_sort_order,
  (select count(*) from public.finish_keys where key = '${FINISH_KEY}' and is_active = true)::int as activated_finish_rows,
  ${candidateRows}::int as cracked_ice_candidate_rows;

rollback;
`;
}

function validateSql(sql) {
  const findings = [];
  const strippedSql = sql.replace(/--.*$/gm, '');
  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback_statement');
  if (/\bdelete\s+from\b/i.test(strippedSql)) findings.push('sql_contains_delete_statement');
  if (/\binsert\s+into\s+public\.card_printings\b/i.test(strippedSql)) findings.push('sql_contains_child_printing_insert');
  if (/\binsert\s+into\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_contains_parent_insert');
  if (/\binsert\s+into\s+public\.sets\b/i.test(strippedSql)) findings.push('sql_contains_set_insert');
  if (/\binsert\s+into\s+public\.external/i.test(strippedSql)) findings.push('sql_contains_external_mapping_insert');
  if (!/\binsert\s+into\s+public\.finish_keys\b/i.test(strippedSql)) findings.push('sql_missing_finish_key_insert');
  if (!/\bon\s+conflict\s*\(\s*key\s*\)\s+do\s+update\b/i.test(strippedSql)) findings.push('sql_missing_finish_key_upsert');
  return findings;
}

async function runDryRun(client, sql) {
  const beforeSnapshot = await captureFinishSnapshot(client);
  let executionStatus = 'pkg10a_cracked_ice_finish_taxonomy_completed_rolled_back_no_durable_change';
  let errorMessage = null;
  let rollbackProofRows = [];
  try {
    const result = await client.query(sql);
    rollbackProofRows = flattenQueryResults(result).filter((row) => row.package_id === PACKAGE_ID);
  } catch (error) {
    executionStatus = 'pkg10a_cracked_ice_finish_taxonomy_failed';
    errorMessage = error.message;
    await client.query('rollback').catch(() => {});
  }
  const afterSnapshot = await captureFinishSnapshot(client);
  return {
    execution_status: executionStatus,
    error_message: errorMessage,
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    rollback_proof_rows: rollbackProofRows,
  };
}

function evaluate({ source, candidateRows, execution, sqlFindings }) {
  const findings = [...sqlFindings];
  if (source.package_id !== SOURCE_PACKAGE_ID) findings.push('source_package_id_mismatch');
  if (candidateRows.length !== 131) findings.push('cracked_ice_candidate_count_not_131');
  if (candidateRows.some((row) => row.finish_key !== FINISH_KEY)) findings.push('candidate_rows_include_non_cracked_ice_finish');
  if (candidateRows.some((row) => row.readiness_lane !== 'canonical_finish_activation_candidate')) {
    findings.push('candidate_rows_include_non_activation_lane');
  }
  if (execution.execution_status !== 'pkg10a_cracked_ice_finish_taxonomy_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.error_message) findings.push('dry_run_transaction_error_message_present');
  if (!execution.rollback_proof_rows[0]) findings.push('rollback_proof_row_missing');
  if (execution.rollback_proof_rows[0]?.activated_finish_rows !== 1) findings.push('rollback_proof_activation_count_not_one');
  if (execution.before_snapshot.hash_sha256 !== execution.after_snapshot.hash_sha256) {
    findings.push('finish_keys_after_snapshot_differs_from_before_snapshot');
  }
  if (execution.after_snapshot.counts.cracked_ice_active_rows !== execution.before_snapshot.counts.cracked_ice_active_rows) {
    findings.push('cracked_ice_active_count_changed_after_rollback');
  }
  return findings;
}

function renderMarkdown(report) {
  const setRows = Object.entries(report.candidate_scope.by_set).slice(0, 30).map(([setKey, count]) => [setKey, count]);
  const proofRows = report.rollback_proof_rows.map((row) => [
    row.package_id,
    row.finish_key,
    row.activated_finish_rows,
    row.cracked_ice_candidate_rows,
  ]);
  return `# PKG-10A Cracked Ice Finish Taxonomy Guarded Dry-Run V1

Rollback-only dry-run for activating \`cracked_ice\` as a child finish key. This package does not insert child printings.

## Safety

- real_apply_authorized: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- child_printing_inserts: false
- parent_writes: false
- deletes_or_merges: false

## Package

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| source_readiness_fingerprint_sha256 | \`${report.source_readiness_fingerprint_sha256}\` |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.sql_hash_sha256}\` |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| stop_findings | ${report.stop_findings.length} |

## Candidate Scope

- cracked_ice_candidate_rows: ${report.candidate_scope.cracked_ice_candidate_rows}
- affected_sets: ${report.candidate_scope.affected_sets}

${markdownTable(['set_key', 'rows'], setRows)}

## Rollback Proof

${markdownTable(['package_id', 'finish_key', 'activated_finish_rows', 'candidate_rows'], proofRows)}

| Snapshot | total_finish_keys | active_finish_keys | cracked_ice_active_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | ${report.before_snapshot.counts.total_finish_keys} | ${report.before_snapshot.counts.active_finish_keys} | ${report.before_snapshot.counts.cracked_ice_active_rows} | \`${report.before_snapshot.hash_sha256}\` |
| after | ${report.after_snapshot.counts.total_finish_keys} | ${report.after_snapshot.counts.active_finish_keys} | ${report.after_snapshot.counts.cracked_ice_active_rows} | \`${report.after_snapshot.hash_sha256}\` |

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : 'None.'}

## Next Gate

Real activation still requires explicit approval. Child printing inserts remain a separate future package after activation is real-applied and verified.
`;
}

function renderCheckpoint(report) {
  return `# PKG-10A Cracked Ice Finish Taxonomy Guarded Dry-Run Checkpoint V1

- generated_at: ${report.generated_at}
- package_id: ${report.package_id}
- package_fingerprint_sha256: ${report.package_fingerprint_sha256}
- sql_hash_sha256: ${report.sql_hash_sha256}
- cracked_ice_candidate_rows: ${report.candidate_scope.cracked_ice_candidate_rows}
- dry_run_execution_status: ${report.dry_run_execution_status}
- stop_findings: ${report.stop_findings.length}
- before_snapshot_hash: ${report.before_snapshot.hash_sha256}
- after_snapshot_hash: ${report.after_snapshot.hash_sha256}
- durable_db_writes_performed: false
- real_apply_authorized: false
- migrations_created: false
- child_printing_inserts: false

Real activation remains blocked pending explicit approval.
`;
}

const source = await readJson(SOURCE_JSON);
const candidateRows = (source.rows ?? []).filter((row) => (
  row.finish_key === FINISH_KEY
  && row.readiness_lane === 'canonical_finish_activation_candidate'
));
const packageFingerprint = sha256(stableJson(candidateRows.map((row) => ({
  set_key: row.set_key,
  card_number: row.card_number,
  card_name: row.card_name,
  finish_key: row.finish_key,
}))));
const sourceFingerprint = source.package_fingerprint_sha256;
const sql = buildSql({
  packageFingerprint,
  sourceFingerprint,
  candidateRows: candidateRows.length,
});
const sqlHash = sha256(sql);
await writeText(OUTPUT_SQL, sql);

const sqlFindings = validateSql(sql);
let execution = {
  execution_status: 'not_run',
  error_message: null,
  before_snapshot: null,
  after_snapshot: null,
  rollback_proof_rows: [],
};
const conn = connectionString();
if (!conn) {
  execution = {
    ...execution,
    execution_status: 'db_unavailable',
    error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    execution = await runDryRun(client, sql);
  } finally {
    await client.end().catch(() => {});
  }
}

const stopFindings = evaluate({ source, candidateRows, execution, sqlFindings });
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg10a_cracked_ice_finish_taxonomy_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  source_readiness_artifact: SOURCE_JSON,
  source_readiness_fingerprint_sha256: sourceFingerprint,
  package_fingerprint_sha256: packageFingerprint,
  sql_artifact: OUTPUT_SQL,
  sql_hash_sha256: sqlHash,
  real_apply_authorized: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  child_printing_inserts: false,
  parent_writes: false,
  deletes_or_merges: false,
  target_finish_key: {
    key: FINISH_KEY,
    label: FINISH_LABEL,
    sort_order: FINISH_SORT_ORDER,
    is_active: true,
  },
  candidate_scope: {
    cracked_ice_candidate_rows: candidateRows.length,
    affected_sets: new Set(candidateRows.map((row) => row.set_key)).size,
    by_set: countBy(candidateRows, (row) => row.set_key),
  },
  dry_run_execution_status: execution.execution_status,
  dry_run_error_message: execution.error_message,
  before_snapshot: execution.before_snapshot,
  after_snapshot: execution.after_snapshot,
  rollback_proof_rows: execution.rollback_proof_rows,
  stop_findings: stopFindings,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderCheckpoint(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  output_sql: OUTPUT_SQL,
  checkpoint_md: CHECKPOINT_MD,
  package_fingerprint_sha256: packageFingerprint,
  sql_hash_sha256: sqlHash,
  dry_run_execution_status: report.dry_run_execution_status,
  stop_findings: report.stop_findings,
  rollback_proof_rows: report.rollback_proof_rows,
  before_snapshot_hash: report.before_snapshot?.hash_sha256,
  after_snapshot_hash: report.after_snapshot?.hash_sha256,
  durable_db_writes_performed: false,
  migrations_created: false,
}, null, 2));
