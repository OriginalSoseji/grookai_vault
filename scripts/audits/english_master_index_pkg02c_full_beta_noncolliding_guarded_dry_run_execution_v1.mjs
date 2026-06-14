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

const ARTIFACT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02c_full_beta_noncolliding_transaction_artifact_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_v1.md',
);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-02C-FULL-BETA-NONCOLLIDING';
const PACKAGE_FINGERPRINT = '53ede43043c67f519a9d786cc91145647efb093d2c4af1cfaf924e81ac2b430d';
const APPROVAL_TEXT = 'Approve PKG-02C-FULL-BETA-NONCOLLIDING for guarded dry-run transaction execution only. Fingerprint: 53ede43043c67f519a9d786cc91145647efb093d2c4af1cfaf924e81ac2b430d. Scope: 343 non-colliding card_print updates, 542 verified child printings, 4 vault references accepted, 79 collision rows excluded. No real apply. No migrations.';

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

async function captureSnapshot(client, cardPrintIds) {
  const result = await client.query(
    `select
       cp.id,
       to_jsonb(cp) as card_print,
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
       ), '[]'::jsonb) as card_print_traits,
       coalesce((
         select jsonb_agg(to_jsonb(vi) order by vi.id)
         from public.vault_items vi
         where vi.card_id = cp.id
       ), '[]'::jsonb) as vault_items
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code nulls first, cp.name, cp.number, cp.id`,
    [cardPrintIds],
  );

  const rows = result.rows.map((row) => ({
    card_print_id: row.id,
    card_print: row.card_print,
    card_printings: row.card_printings,
    external_mappings: row.external_mappings,
    card_print_identity: row.card_print_identity,
    card_print_traits: row.card_print_traits,
    vault_items: row.vault_items,
    dependency_counts: {
      card_printings: row.card_printings.length,
      external_mappings: row.external_mappings.length,
      card_print_identity: row.card_print_identity.length,
      card_print_traits: row.card_print_traits.length,
      vault_items: row.vault_items.length,
    },
  }));

  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    impact_counts: {
      card_prints_found: rows.length,
      card_printings_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_printings, 0),
      external_mappings_found: rows.reduce((sum, row) => sum + row.dependency_counts.external_mappings, 0),
      identity_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_identity, 0),
      trait_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_traits, 0),
      vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
    },
  };
}

async function runDryRunSql(sql, targetIds) {
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

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client, targetIds);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    try {
      await client.query(sql);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }
    const afterSnapshot = await captureSnapshot(client, targetIds);
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

  if (artifact.artifact_status !== 'pkg02c_full_beta_noncolliding_transaction_artifact_prepared_apply_blocked_no_write') {
    findings.push('source_artifact_status_not_ready');
  }
  if (scope.package_id !== PACKAGE_ID) findings.push('source_artifact_wrong_package_id');
  if (scope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('source_artifact_fingerprint_mismatch');
  if (scope.card_print_rows !== 343) findings.push('source_artifact_card_print_count_not_343');
  if (scope.child_printing_rows !== 542) findings.push('source_artifact_child_count_not_542');
  if (scope.vault_references_accepted !== 4) findings.push('source_artifact_vault_count_not_4');
  if (scope.collision_rows_excluded !== 79) findings.push('source_artifact_collision_exclusion_count_not_79');
  if (artifact.required_operator_approval?.exact_phrase !== APPROVAL_TEXT) findings.push('approval_phrase_mismatch');
  if (artifact.stop_findings?.length !== 0) findings.push('source_artifact_stop_findings_present');
  if (artifact.db_writes_performed !== false) findings.push('source_artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('source_artifact_reports_migration');
  if (artifact.cleanup_performed !== false) findings.push('source_artifact_reports_cleanup');
  if (artifact.quarantine_performed !== false) findings.push('source_artifact_reports_quarantine');
  if (tx.execution_performed !== false) findings.push('source_artifact_already_marked_executed');
  if (tx.sha256 !== sqlHash) findings.push('sql_artifact_hash_mismatch');
  if (tx.contains_commit_statement !== false) findings.push('source_artifact_allows_commit_statement');
  if (tx.contains_rollback_statement !== true) findings.push('source_artifact_missing_rollback_statement');
  if (tx.contains_delete_statement !== false) findings.push('source_artifact_contains_delete');
  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback_statement');
  if (!/\bupdate\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_missing_expected_update');
  if (/\bdelete\b/i.test(strippedSql)) findings.push('sql_contains_delete_statement');

  return findings;
}

function evaluateRun({ artifact, execution }) {
  const findings = [];
  const beforeRows = execution.before_snapshot?.rows ?? [];
  const afterRows = execution.after_snapshot?.rows ?? [];

  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.before_snapshot?.impact_counts?.card_prints_found !== 343) findings.push('before_snapshot_card_print_count_not_343');
  if (execution.after_snapshot?.impact_counts?.card_prints_found !== 343) findings.push('after_snapshot_card_print_count_not_343');
  if (execution.before_snapshot?.impact_counts?.card_printings_found !== 542) findings.push('before_snapshot_child_count_not_542');
  if (execution.after_snapshot?.impact_counts?.card_printings_found !== 542) findings.push('after_snapshot_child_count_not_542');
  if (execution.before_snapshot?.impact_counts?.vault_items_found !== 4) findings.push('before_snapshot_vault_count_not_4');
  if (execution.after_snapshot?.impact_counts?.vault_items_found !== 4) findings.push('after_snapshot_vault_count_not_4');
  if (execution.before_snapshot?.hash_sha256 !== artifact.fresh_snapshot?.hash_sha256) {
    findings.push('fresh_snapshot_drift_before_dry_run');
  }
  if (stableJson(beforeRows) !== stableJson(afterRows)) findings.push('durable_after_snapshot_differs_from_before_snapshot');

  const matrixById = new Map((artifact.mutation_matrix ?? []).map((row) => [row.card_print_id, row]));
  for (const afterRow of afterRows) {
    const matrix = matrixById.get(afterRow.card_print_id);
    if (!matrix) {
      findings.push(`after_snapshot_unknown_row_${afterRow.card_print_id}`);
      continue;
    }
    const card = afterRow.card_print ?? {};
    if (String(card.set_code ?? '') !== String(matrix.current_parent_fields?.set_code ?? '')) {
      findings.push(`after_snapshot_set_code_not_rolled_back_${afterRow.card_print_id}`);
    }
    if (String(card.number ?? '') !== String(matrix.current_parent_fields?.number ?? '')) {
      findings.push(`after_snapshot_number_not_rolled_back_${afterRow.card_print_id}`);
    }
    if (String(card.name ?? '') !== String(matrix.current_parent_fields?.name ?? '')) {
      findings.push(`after_snapshot_name_not_rolled_back_${afterRow.card_print_id}`);
    }
    if ((afterRow.card_printings ?? []).length !== matrix.child_printing_count_before) {
      findings.push(`after_snapshot_child_count_changed_${afterRow.card_print_id}`);
    }
  }

  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02C Full Beta Non-Colliding Guarded Dry-Run Execution V1');
  lines.push('');
  lines.push('This report records the guarded dry-run transaction execution for `PKG-02C-FULL-BETA-NONCOLLIDING`.');
  lines.push('');
  lines.push('The SQL artifact is rollback-only. No real apply, migration, cleanup, quarantine, merge, or delete was performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_execution_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | ${report.package_scope.package_fingerprint_sha256} |`);
  lines.push(`| card_print_rows | ${report.package_scope.card_print_rows} |`);
  lines.push(`| child_printing_rows | ${report.package_scope.child_printing_rows} |`);
  lines.push(`| vault_references_accepted | ${report.package_scope.vault_references_accepted} |`);
  lines.push(`| collision_rows_excluded | ${report.package_scope.collision_rows_excluded} |`);
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
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02C Full Beta Non-Colliding Guarded Dry-Run Execution Checkpoint V1](20260609_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_checkpoint_v1.md) | Records rollback-only dry-run execution for 343 non-colliding card_print updates, 542 child printings preserved, 4 vault refs accepted, durable state unchanged. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_checkpoint_v1.md') ? line : existingLine)
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
const targetIds = (artifact.mutation_matrix ?? []).map((row) => row.card_print_id);
const execution = artifactFindings.length === 0
  ? await runDryRunSql(sql, targetIds)
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
  version: 'english_master_index_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_v1',
  audit_only: false,
  dry_run_only: true,
  real_apply_performed: false,
  db_reads_performed: true,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
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
    ? 'pkg02c_full_beta_noncolliding_guarded_dry_run_passed_rolled_back_no_durable_change'
    : 'pkg02c_full_beta_noncolliding_guarded_dry_run_blocked_or_failed',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    card_print_rows: artifact.package_scope.card_print_rows,
    child_printing_rows: artifact.package_scope.child_printing_rows,
    vault_references_accepted: artifact.package_scope.vault_references_accepted,
    collision_rows_excluded: artifact.package_scope.collision_rows_excluded,
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
  card_print_rows: report.package_scope.card_print_rows,
  child_printing_rows: report.package_scope.child_printing_rows,
  vault_references_accepted: report.package_scope.vault_references_accepted,
  collision_rows_excluded: report.package_scope.collision_rows_excluded,
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
