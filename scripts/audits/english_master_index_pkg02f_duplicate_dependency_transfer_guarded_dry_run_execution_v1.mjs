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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER';
const PACKAGE_FINGERPRINT = '21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a';
const APPROVAL_TEXT = 'Approve PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER for guarded dry-run transaction execution only. Fingerprint: 21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a. Scope: 21 duplicate parent rows, 23 duplicate child printings, external mapping transfer simulation, rollback-only. No real apply. No migrations.';

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

async function captureSnapshot(client, cardPrintIds, cardPrintingIds) {
  const result = await client.query(
    `select
       cp.id,
       to_jsonb(cp) as card_print,
       s.code as resolved_set_code,
       s.name as resolved_set_name,
       coalesce((
         select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as card_printings,
       coalesce((
         select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
         from public.external_mappings em
         where em.card_print_id = cp.id
       ), '[]'::jsonb) as external_mappings,
       coalesce((
         select jsonb_agg(to_jsonb(cpi) order by cpi.id)
         from public.card_print_identity cpi
         where cpi.card_print_id = cp.id
       ), '[]'::jsonb) as card_print_identity,
       coalesce((
         select jsonb_agg(to_jsonb(cpt) order by cpt.id)
         from public.card_print_traits cpt
         where cpt.card_print_id = cp.id
       ), '[]'::jsonb) as card_print_traits
     from public.card_prints cp
     left join public.sets s on s.id = cp.set_id
     where cp.id = any($1::uuid[])
     order by s.code nulls first, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
    [cardPrintIds],
  );
  const childRefResult = await client.query(
    `select
       (select count(*)::int from public.vault_item_instances where card_printing_id = any($1::uuid[])) as vault_item_instances,
       (select count(*)::int from public.external_printing_mappings where card_printing_id = any($1::uuid[])) as external_printing_mappings,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidates`,
    [cardPrintingIds],
  );

  const rows = result.rows.map((row) => ({
    card_print_id: row.id,
    card_print: row.card_print,
    resolved_set_code: row.resolved_set_code,
    resolved_set_name: row.resolved_set_name,
    card_printings: row.card_printings,
    external_mappings: row.external_mappings,
    card_print_identity: row.card_print_identity,
    card_print_traits: row.card_print_traits,
  }));
  const childRefs = childRefResult.rows[0] ?? {};
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    impact_counts: {
      card_prints_found: rows.length,
      card_printings_found: rows.reduce((sum, row) => sum + row.card_printings.length, 0),
      external_mappings_found: rows.reduce((sum, row) => sum + row.external_mappings.length, 0),
      identity_rows_found: rows.reduce((sum, row) => sum + row.card_print_identity.length, 0),
      trait_rows_found: rows.reduce((sum, row) => sum + row.card_print_traits.length, 0),
      blocked_child_printing_refs_found: Object.values(childRefs).reduce((sum, value) => sum + Number(value ?? 0), 0),
    },
    child_reference_counts: childRefs,
  };
}

async function runDryRunSql(sql, parentRows, childRows) {
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

  const cardPrintIds = [
    ...parentRows.map((row) => row.blocked_card_print_id),
    ...parentRows.map((row) => row.survivor_card_print_id),
  ];
  const cardPrintingIds = [
    ...childRows.map((row) => row.blocked_card_printing_id),
    ...childRows.map((row) => row.survivor_card_printing_id),
  ].filter(Boolean);

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client, cardPrintIds, cardPrintingIds);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    try {
      await client.query(sql);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }
    const afterSnapshot = await captureSnapshot(client, cardPrintIds, cardPrintingIds);
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
  const findings = [];
  const scope = artifact.package_scope ?? {};
  const tx = artifact.sql_artifact ?? {};
  const strippedSql = sql.replace(/--.*$/gm, '');

  if (artifact.artifact_status !== 'pkg02f_duplicate_dependency_transfer_dry_run_artifact_prepared_apply_blocked_no_write') {
    findings.push('source_artifact_status_not_ready');
  }
  if (scope.package_id !== PACKAGE_ID) findings.push('source_artifact_wrong_package_id');
  if (scope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('source_artifact_fingerprint_mismatch');
  if (scope.duplicate_parent_rows !== 21) findings.push('source_artifact_parent_count_not_21');
  if (scope.duplicate_child_printing_rows !== 23) findings.push('source_artifact_child_count_not_23');
  if (scope.number_key_collision_rows_excluded !== 58) findings.push('source_artifact_number_key_exclusion_count_not_58');
  if (artifact.required_operator_approval?.exact_phrase !== APPROVAL_TEXT) findings.push('approval_phrase_mismatch');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('source_artifact_stop_findings_present');
  if (artifact.db_writes_performed !== false) findings.push('source_artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('source_artifact_reports_migration');
  if (artifact.cleanup_performed !== false) findings.push('source_artifact_reports_cleanup');
  if (artifact.quarantine_performed !== false) findings.push('source_artifact_reports_quarantine');
  if (tx.execution_performed !== false) findings.push('source_artifact_already_marked_executed');
  if (tx.sha256 !== sqlHash) findings.push('sql_artifact_hash_mismatch');
  if (tx.contains_commit_statement !== false) findings.push('source_artifact_allows_commit_statement');
  if (tx.contains_rollback_statement !== true) findings.push('source_artifact_missing_rollback_statement');
  if (tx.contains_delete_statement !== true) findings.push('source_artifact_missing_delete_simulation');
  if (tx.contains_update_statement !== true) findings.push('source_artifact_missing_update_simulation');
  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback_statement');
  if (!/\bupdate\s+public\.external_mappings\b/i.test(strippedSql)) findings.push('sql_missing_external_mapping_transfer');
  if (!/\bdelete\s+from\s+public\.card_printings\b/i.test(strippedSql)) findings.push('sql_missing_child_delete_simulation');
  if (!/\bdelete\s+from\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_missing_parent_delete_simulation');

  return findings;
}

function evaluateRun({ artifact, execution }) {
  const findings = [];
  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.before_snapshot?.impact_counts?.card_prints_found !== 42) findings.push('before_card_print_count_not_42');
  if (execution.after_snapshot?.impact_counts?.card_prints_found !== 42) findings.push('after_card_print_count_not_42');
  if (execution.before_snapshot?.impact_counts?.blocked_child_printing_refs_found !== 0) {
    findings.push('before_blocked_child_refs_present');
  }
  if (execution.after_snapshot?.impact_counts?.blocked_child_printing_refs_found !== 0) {
    findings.push('after_blocked_child_refs_present');
  }
  if (execution.before_snapshot?.hash_sha256 !== artifact.fresh_snapshot?.hash_sha256) {
    findings.push('fresh_snapshot_drift_before_dry_run');
  }
  if (stableJson(execution.before_snapshot?.rows ?? []) !== stableJson(execution.after_snapshot?.rows ?? [])) {
    findings.push('durable_after_snapshot_differs_from_before_snapshot');
  }
  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02F Duplicate Dependency Transfer Guarded Dry-Run Execution V1');
  lines.push('');
  lines.push('This report records rollback-only dry-run execution for `PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER`.');
  lines.push('');
  lines.push('No real apply, migration, cleanup, quarantine, merge, or durable delete was performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_execution_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | ${report.package_scope.package_fingerprint_sha256} |`);
  lines.push(`| duplicate_parent_rows | ${report.package_scope.duplicate_parent_rows} |`);
  lines.push(`| duplicate_child_printing_rows | ${report.package_scope.duplicate_child_printing_rows} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| durable_db_writes_performed | ${report.durable_db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Proof');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Before snapshot hash | ${report.execution_result.before_snapshot?.hash_sha256 ?? ''} |`);
  lines.push(`| After snapshot hash | ${report.execution_result.after_snapshot?.hash_sha256 ?? ''} |`);
  lines.push(`| Durable after matches before | ${report.durable_after_snapshot_matches_before_snapshot} |`);
  lines.push(`| Artifact fresh snapshot matches before | ${report.artifact_fresh_snapshot_matches_before_snapshot} |`);
  lines.push(`| Execution error | ${mdEscape(report.execution_result.error_message ?? '')} |`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('None.');
  else for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02F Duplicate Dependency Transfer Guarded Dry-Run Execution Checkpoint V1](20260609_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_checkpoint_v1.md) | Records rollback-only dry-run execution for 21 duplicate parent rows and 23 duplicate child printings, durable state unchanged. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const artifact = readJson(ARTIFACT_JSON);
const sqlPath = path.join(ROOT, artifact.sql_artifact.path);
const sql = fs.readFileSync(sqlPath, 'utf8');
const sqlHash = sha256(sql);
const artifactFindings = validateArtifact(artifact, sql, sqlHash);
const execution = artifactFindings.length === 0
  ? await runDryRunSql(sql, artifact.parent_merge_matrix ?? [], artifact.child_merge_matrix ?? [])
  : {
    connected: false,
    execution_status: 'blocked_artifact_validation_failed',
    error_message: artifactFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
  };
const runFindings = artifactFindings.length === 0 ? evaluateRun({ artifact, execution }) : [];
const stopFindings = [...artifactFindings, ...runFindings];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_v1',
  audit_only: false,
  dry_run_only: true,
  real_apply_performed: false,
  db_reads_performed: true,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  merge_performed: false,
  delete_performed: false,
  apply_paths_executed: true,
  approval_scope: {
    dry_run_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_real_apply: false,
    approved_for_migrations: false,
  },
  dry_run_execution_status: pass
    ? 'pkg02f_duplicate_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change'
    : 'pkg02f_duplicate_dependency_transfer_guarded_dry_run_blocked_or_failed',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    duplicate_parent_rows: artifact.package_scope.duplicate_parent_rows,
    duplicate_child_printing_rows: artifact.package_scope.duplicate_child_printing_rows,
    number_key_collision_rows_excluded: artifact.package_scope.number_key_collision_rows_excluded,
  },
  source_artifact: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
  sql_artifact: {
    path: artifact.sql_artifact.path,
    expected_sha256: artifact.sql_artifact.sha256,
    actual_sha256: sqlHash,
    contains_update_statement: artifact.sql_artifact.contains_update_statement,
    contains_delete_statement: artifact.sql_artifact.contains_delete_statement,
    contains_commit_statement: artifact.sql_artifact.contains_commit_statement,
    contains_rollback_statement: artifact.sql_artifact.contains_rollback_statement,
    execution_performed: execution.execution_status === 'guarded_dry_run_transaction_completed_and_rolled_back',
  },
  execution_result: execution,
  durable_after_snapshot_matches_before_snapshot: (
    execution.before_snapshot?.hash_sha256
    && execution.before_snapshot.hash_sha256 === execution.after_snapshot?.hash_sha256
  ) || false,
  artifact_fresh_snapshot_matches_before_snapshot: (
    artifact.fresh_snapshot?.hash_sha256
    && artifact.fresh_snapshot.hash_sha256 === execution.before_snapshot?.hash_sha256
  ) || false,
  stop_findings: stopFindings,
  pass,
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
  dry_run_execution_status: report.dry_run_execution_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  duplicate_parent_rows: report.package_scope.duplicate_parent_rows,
  duplicate_child_printing_rows: report.package_scope.duplicate_child_printing_rows,
  before_snapshot_hash: report.execution_result.before_snapshot?.hash_sha256 ?? null,
  after_snapshot_hash: report.execution_result.after_snapshot?.hash_sha256 ?? null,
  durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
  artifact_fresh_snapshot_matches_before_snapshot: report.artifact_fresh_snapshot_matches_before_snapshot,
  db_writes_performed: report.db_writes_performed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  real_apply_performed: report.real_apply_performed,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
