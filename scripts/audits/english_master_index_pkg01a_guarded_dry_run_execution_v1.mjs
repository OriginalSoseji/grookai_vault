import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);

const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_final_fresh_snapshot_transaction_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_guarded_dry_run_execution_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01a_guarded_dry_run_execution_v1.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function captureSnapshot(client, cardPrintId) {
  const result = await client.query(
    `select
       cp.id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.set_id,
       cp.updated_at,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'id', cpr.id,
           'finish_key', cpr.finish_key,
           'provenance_source', cpr.provenance_source,
           'provenance_ref', cpr.provenance_ref
         ) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as card_printings,
       (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id) as external_mappings_count,
       (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows_count,
       (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows_count,
       (select count(*)::int from public.vault_items vi where vi.card_id = cp.id) as vault_items_count
     from public.card_prints cp
     where cp.id = $1::uuid`,
    [cardPrintId],
  );

  const rows = result.rows.map((row) => ({
    card_print_id: row.id,
    set_code: row.set_code,
    number: row.number,
    number_plain: row.number_plain,
    name: row.name,
    set_id: row.set_id,
    updated_at: row.updated_at,
    card_printings: row.card_printings,
    dependency_counts: {
      external_mappings: row.external_mappings_count,
      card_print_identity: row.identity_rows_count,
      card_print_traits: row.trait_rows_count,
      vault_items: row.vault_items_count,
    },
  }));

  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      card_prints_found: rows.length,
      card_printings_found: rows.reduce((sum, row) => sum + row.card_printings.length, 0),
      vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
    },
  };
}

async function runDryRunSql(sql) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      execution_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
    };
  }

  const artifact = readJson(ARTIFACT_JSON);
  const targetId = artifact.guarded_dry_run_transaction_artifact?.allowed_target_ids?.[0];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client, targetId);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    try {
      await client.query(sql);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }
    const afterSnapshot = await captureSnapshot(client, targetId);
    return {
      connected: true,
      execution_status: executionStatus,
      error_message: errorMessage,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function validateArtifact(artifact, sql, sqlHash) {
  const stopFindings = [];
  const tx = artifact.guarded_dry_run_transaction_artifact ?? {};
  const scope = artifact.package_scope ?? {};

  if (artifact.artifact_status !== 'pkg01a_final_snapshot_and_dry_run_artifact_prepared_apply_blocked_no_write') {
    stopFindings.push('source_artifact_status_not_ready');
  }
  if (scope.pilot_package_id !== 'PKG-01A') stopFindings.push('source_artifact_not_pkg01a');
  if (scope.set_key !== 'fut2020') stopFindings.push('source_artifact_not_fut2020');
  if (scope.remainder_status !== 'blocked_until_pkg01a_pilot_verified_no_write') {
    stopFindings.push('pkg01b_not_blocked_in_source_artifact');
  }
  if (tx.executed !== false) stopFindings.push('source_artifact_already_marked_executed');
  if (tx.contains_commit_statement !== false) stopFindings.push('source_artifact_allows_commit_statement');
  if (tx.contains_rollback_statement !== true) stopFindings.push('source_artifact_missing_rollback_statement');
  if (tx.artifact_hash_sha256 !== sqlHash) stopFindings.push('sql_artifact_hash_mismatch');
  if (/(^|\n)\s*commit\s*;/i.test(sql)) stopFindings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(sql)) stopFindings.push('sql_missing_rollback_statement');
  if ((tx.allowed_target_ids ?? []).length !== 1) stopFindings.push('sql_scope_not_one_target_id');
  if ((tx.allowed_field_changes ?? []).join(',') !== 'set_code') stopFindings.push('sql_scope_not_set_code_only');

  return stopFindings;
}

function evaluateRun(artifact, execution) {
  const findings = [];
  const expected = artifact.mutation_matrix?.[0] ?? {};
  const beforeRow = execution.before_snapshot?.rows?.[0] ?? null;
  const afterRow = execution.after_snapshot?.rows?.[0] ?? null;

  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (!beforeRow) findings.push('before_snapshot_missing_target_row');
  if (!afterRow) findings.push('after_snapshot_missing_target_row');
  if (execution.before_snapshot?.counts?.card_prints_found !== 1) findings.push('before_snapshot_card_print_count_not_one');
  if (execution.after_snapshot?.counts?.card_prints_found !== 1) findings.push('after_snapshot_card_print_count_not_one');
  if (execution.before_snapshot?.counts?.card_printings_found !== 1) findings.push('before_snapshot_child_printing_count_not_one');
  if (execution.after_snapshot?.counts?.card_printings_found !== 1) findings.push('after_snapshot_child_printing_count_not_one');
  if (execution.before_snapshot?.counts?.vault_items_found !== 0) findings.push('before_snapshot_vault_reference_blocker');
  if (execution.after_snapshot?.counts?.vault_items_found !== 0) findings.push('after_snapshot_vault_reference_blocker');

  if (beforeRow && afterRow) {
    if (stableJson(beforeRow) !== stableJson(afterRow)) findings.push('durable_after_snapshot_differs_from_before_snapshot');
    if (afterRow.set_code !== expected.before_values_from_fresh_snapshot?.set_code) {
      findings.push('after_snapshot_set_code_not_rolled_back');
    }
    if (afterRow.number !== expected.before_values_from_fresh_snapshot?.number) {
      findings.push('after_snapshot_number_changed');
    }
    if (afterRow.name !== expected.before_values_from_fresh_snapshot?.name) {
      findings.push('after_snapshot_name_changed');
    }
    const finishes = (afterRow.card_printings ?? []).map((row) => row.finish_key).sort().join(',');
    if (finishes !== 'holo') findings.push('after_snapshot_finish_scope_changed');
  }

  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01A Guarded Dry-Run Execution V1');
  lines.push('');
  lines.push('This report records execution of the `PKG-01A / fut2020` guarded transaction artifact in dry-run mode only.');
  lines.push('');
  lines.push('The SQL artifact contains no `COMMIT;` statement and ends with `ROLLBACK;`.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_execution_status} |`);
  lines.push(`| pilot_package_id | ${report.package_scope.pilot_package_id} |`);
  lines.push(`| set_key | ${report.package_scope.set_key} |`);
  lines.push(`| transaction_artifact_executed | ${report.transaction_artifact_executed} |`);
  lines.push(`| dry_run_update_executed_inside_rolled_back_transaction | ${report.dry_run_update_executed_inside_rolled_back_transaction} |`);
  lines.push(`| durable_db_writes_performed | ${report.durable_db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Artifact');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| sql_artifact_ref | \`${report.sql_artifact.artifact_ref}\` |`);
  lines.push(`| sql_artifact_hash_sha256 | \`${report.sql_artifact.artifact_hash_sha256}\` |`);
  lines.push(`| contains_commit_statement | ${report.sql_artifact.contains_commit_statement} |`);
  lines.push(`| contains_rollback_statement | ${report.sql_artifact.contains_rollback_statement} |`);
  lines.push('');
  lines.push('## Before And After');
  lines.push('');
  lines.push('| Snapshot | Hash | set_code | number | name | child_printings | vault_items |');
  lines.push('| --- | --- | --- | --- | --- | ---: | ---: |');
  const before = report.before_snapshot.rows[0] ?? {};
  const after = report.after_snapshot.rows[0] ?? {};
  lines.push(`| before | \`${report.before_snapshot.hash_sha256}\` | ${mdEscape(before.set_code ?? '')} | ${mdEscape(before.number)} | ${mdEscape(before.name)} | ${report.before_snapshot.counts.card_printings_found} | ${report.before_snapshot.counts.vault_items_found} |`);
  lines.push(`| after | \`${report.after_snapshot.hash_sha256}\` | ${mdEscape(after.set_code ?? '')} | ${mdEscape(after.number)} | ${mdEscape(after.name)} | ${report.after_snapshot.counts.card_printings_found} | ${report.after_snapshot.counts.vault_items_found} |`);
  lines.push('');
  lines.push(`Durable after snapshot matches before snapshot: ${report.durable_after_snapshot_matches_before_snapshot}`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${finding}`);
  }
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

const artifact = readJson(ARTIFACT_JSON);
const sqlPath = path.join(ROOT, artifact.guarded_dry_run_transaction_artifact.artifact_ref);
const sql = fs.readFileSync(sqlPath, 'utf8');
const sqlHash = sha256(sql);
const validationFindings = validateArtifact(artifact, sql, sqlHash);
const execution = validationFindings.length === 0
  ? await runDryRunSql(sql)
  : {
      connected: false,
      execution_status: 'blocked_artifact_validation_failed',
      error_message: validationFindings.join(', '),
      before_snapshot: null,
      after_snapshot: null,
    };
const executionFindings = validationFindings.length === 0 ? evaluateRun(artifact, execution) : [];
const stopFindings = [...validationFindings, ...executionFindings];
const beforeHash = execution.before_snapshot?.hash_sha256 ?? null;
const afterHash = execution.after_snapshot?.hash_sha256 ?? null;
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg01a_guarded_dry_run_execution_v1',
  audit_only: true,
  dry_run_only: true,
  transaction_artifact_executed: validationFindings.length === 0,
  dry_run_update_executed_inside_rolled_back_transaction: pass,
  durable_db_writes_performed: false,
  db_write_committed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: false,
  apply_allowed: false,
  write_ready_now: 0,
  dry_run_execution_status: pass
    ? 'pkg01a_guarded_dry_run_passed_rolled_back_no_durable_change'
    : 'pkg01a_guarded_dry_run_blocked_or_failed',
  package_scope: {
    pilot_package_id: 'PKG-01A',
    set_key: 'fut2020',
    card_print_rows: 1,
    child_printing_rows_verified: 1,
    allowed_changed_fields: ['set_code'],
    pkg01b_included: false,
  },
  sql_artifact: {
    artifact_ref: artifact.guarded_dry_run_transaction_artifact.artifact_ref,
    artifact_hash_sha256: sqlHash,
    expected_artifact_hash_sha256: artifact.guarded_dry_run_transaction_artifact.artifact_hash_sha256,
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(sql),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(sql),
  },
  execution_result: {
    connected: execution.connected,
    execution_status: execution.execution_status,
    error_message: execution.error_message,
  },
  before_snapshot: execution.before_snapshot,
  after_snapshot: execution.after_snapshot,
  durable_after_snapshot_matches_before_snapshot: beforeHash != null && beforeHash === afterHash,
  verification_summary: {
    before_hash_sha256: beforeHash,
    after_hash_sha256: afterHash,
    durable_state_unchanged: beforeHash != null && beforeHash === afterHash,
    expected_transient_update_rolled_back: pass,
  },
  explicit_non_authorizations: [
    'This dry-run execution is not DB write/apply approval.',
    'No COMMIT statement was allowed.',
    'No migration was created.',
    'PKG-01B remains blocked.',
    'No cleanup, quarantine, insertion, deletion, hiding, or normalization was authorized.',
  ],
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
  ],
  dry_run_execution_status: report.dry_run_execution_status,
  transaction_artifact_executed: report.transaction_artifact_executed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  before_hash_sha256: beforeHash,
  after_hash_sha256: afterHash,
  durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
  write_ready_now: report.write_ready_now,
  apply_allowed: report.apply_allowed,
  stop_findings: report.stop_findings.length,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
}, null, 2));
