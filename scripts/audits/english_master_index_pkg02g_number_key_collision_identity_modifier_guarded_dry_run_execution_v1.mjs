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

const PLAN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02g_number_key_collision_identity_modifier_plan_v1.json');
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_v1.md',
);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER';

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

async function captureRows(client, cardPrintIds) {
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
       ), '[]'::jsonb) as card_print_traits,
       coalesce((
         select jsonb_agg(to_jsonb(cps) order by cps.id)
         from public.card_print_species cps
         where cps.card_print_id = cp.id
       ), '[]'::jsonb) as card_print_species,
       coalesce((
         select jsonb_agg(to_jsonb(vi) order by vi.id)
         from public.vault_items vi
         where vi.card_id = cp.id
       ), '[]'::jsonb) as vault_items
     from public.card_prints cp
     left join public.sets s on s.id = cp.set_id
     where cp.id = any($1::uuid[])
     order by s.code nulls first, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
    [cardPrintIds],
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
    card_print_species: row.card_print_species,
    vault_items: row.vault_items,
    dependency_counts: {
      card_printings: row.card_printings.length,
      external_mappings: row.external_mappings.length,
      card_print_identity: row.card_print_identity.length,
      card_print_traits: row.card_print_traits.length,
      card_print_species: row.card_print_species.length,
      vault_items: row.vault_items.length,
    },
  }));
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
      species_rows_found: rows.reduce((sum, row) => sum + row.card_print_species.length, 0),
      vault_items_found: rows.reduce((sum, row) => sum + row.vault_items.length, 0),
    },
  };
}

async function runDryRunSql(sql, cardPrintIds) {
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
    const beforeSnapshot = await captureRows(client, cardPrintIds);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    try {
      await client.query(sql);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }
    const afterSnapshot = await captureRows(client, cardPrintIds);
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

function validatePlan(plan, sql, sqlHash) {
  const findings = [];
  const scope = plan.package_scope ?? {};
  const sqlArtifact = plan.sql_artifact ?? {};
  const strippedSql = sql.replace(/--.*$/gm, '');

  if (plan.plan_status !== 'pkg02g_number_key_collision_identity_modifier_plan_prepared_apply_blocked_no_write') {
    findings.push('plan_status_not_ready');
  }
  if (scope.package_id !== PACKAGE_ID) findings.push('wrong_package_id');
  if (scope.number_key_collision_rows !== 58) findings.push('number_key_collision_count_not_58');
  if (scope.parent_update_rows !== 97) findings.push('parent_update_count_not_97');
  if (scope.blocked_target_parent_recovery_rows !== 58) findings.push('blocked_target_recovery_count_not_58');
  if (scope.existing_collision_holder_modifier_rows !== 39) {
    findings.push('existing_collision_holder_modifier_count_not_39');
  }
  if (scope.deletes_included !== false) findings.push('plan_scope_includes_deletes');
  if (scope.global_apply_included !== false) findings.push('plan_scope_includes_global_apply');
  if (scope.migrations_included !== false) findings.push('plan_scope_includes_migrations');
  if (plan.simulated_unique_index_result?.final_unique_collision_count !== 0) {
    findings.push('simulated_unique_collisions_present');
  }
  if ((plan.stop_findings ?? []).length !== 0) findings.push('plan_stop_findings_present');
  if (plan.db_writes_performed !== false) findings.push('plan_reports_db_write');
  if (plan.migrations_created !== false) findings.push('plan_reports_migration');
  if (sqlArtifact.sha256 !== sqlHash) findings.push('sql_hash_mismatch');
  if (sqlArtifact.contains_update_statement !== true) findings.push('sql_artifact_missing_update_statement');
  if (sqlArtifact.contains_delete_statement !== false) findings.push('sql_artifact_contains_delete_statement');
  if (sqlArtifact.contains_commit_statement !== false) findings.push('sql_artifact_contains_commit_statement');
  if (sqlArtifact.contains_rollback_statement !== true) findings.push('sql_artifact_missing_rollback_statement');
  if (/\bdelete\s+from\b/i.test(strippedSql)) findings.push('sql_contains_delete_statement');
  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback_statement');
  if (!/\bupdate\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_missing_card_print_update');
  return findings;
}

function evaluateRun({ plan, execution }) {
  const findings = [];
  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  const expectedSnapshotRows = plan.current_snapshot?.row_count ?? 116;
  if (execution.before_snapshot?.impact_counts?.card_prints_found !== expectedSnapshotRows) {
    findings.push(`before_card_print_count_not_${expectedSnapshotRows}`);
  }
  if (execution.after_snapshot?.impact_counts?.card_prints_found !== expectedSnapshotRows) {
    findings.push(`after_card_print_count_not_${expectedSnapshotRows}`);
  }
  if (execution.before_snapshot?.hash_sha256 !== plan.current_snapshot?.hash_sha256) {
    findings.push('fresh_snapshot_drift_before_dry_run');
  }
  if (stableJson(execution.before_snapshot?.rows ?? []) !== stableJson(execution.after_snapshot?.rows ?? [])) {
    findings.push('durable_after_snapshot_differs_from_before_snapshot');
  }
  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02G Number-Key Collision Identity Modifier Guarded Dry-Run Execution V1');
  lines.push('');
  lines.push('This report records rollback-only dry-run execution for `PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER`.');
  lines.push('');
  lines.push('No real apply, migration, cleanup, quarantine, merge, delete, or durable update was performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_execution_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| number_key_collision_rows | ${report.package_scope.number_key_collision_rows} |`);
  lines.push(`| parent_update_rows | ${report.package_scope.parent_update_rows} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| durable_db_writes_performed | ${report.durable_db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Proof');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Before snapshot hash | \`${report.execution_result.before_snapshot?.hash_sha256 ?? ''}\` |`);
  lines.push(`| After snapshot hash | \`${report.execution_result.after_snapshot?.hash_sha256 ?? ''}\` |`);
  lines.push(`| Durable after matches before | ${report.durable_after_snapshot_matches_before_snapshot} |`);
  lines.push(`| Plan fresh snapshot matches before | ${report.plan_fresh_snapshot_matches_before_snapshot} |`);
  lines.push(`| Execution error | ${mdEscape(report.execution_result.error_message ?? '')} |`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('- none');
  else for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02G Number-Key Collision Identity Modifier Guarded Dry-Run Execution Checkpoint V1](20260609_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_checkpoint_v1.md) | Records rollback-only dry-run execution for 58 number-key collision rows and 97 parent identity updates, durable state unchanged. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const plan = readJson(PLAN_JSON);
const sqlPath = path.join(ROOT, plan.sql_artifact.path);
const sql = fs.readFileSync(sqlPath, 'utf8');
const sqlHash = sha256(sql);
const cardPrintIds = [...new Set((plan.collision_plan_rows ?? []).flatMap((row) => [
  row.blocked_card_print_id,
  row.conflict_card_print_id,
]).filter(Boolean))];
const artifactFindings = validatePlan(plan, sql, sqlHash);
const execution = artifactFindings.length === 0
  ? await runDryRunSql(sql, cardPrintIds)
  : {
    connected: false,
    execution_status: 'blocked_plan_validation_failed',
    error_message: artifactFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
  };
const runFindings = artifactFindings.length === 0 ? evaluateRun({ plan, execution }) : [];
const stopFindings = [...artifactFindings, ...runFindings];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_execution_v1',
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
    approval_text: plan.required_operator_decision?.exact_approval_phrase_required ?? null,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: plan.package_scope?.package_fingerprint_sha256 ?? null,
    approved_for_real_apply: false,
    approved_for_migrations: false,
  },
  dry_run_execution_status: pass
    ? 'pkg02g_number_key_collision_identity_modifier_guarded_dry_run_passed_rolled_back_no_durable_change'
    : 'pkg02g_number_key_collision_identity_modifier_guarded_dry_run_blocked_or_failed',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: plan.package_scope?.package_fingerprint_sha256 ?? null,
    number_key_collision_rows: plan.package_scope?.number_key_collision_rows ?? null,
    parent_update_rows: plan.package_scope?.parent_update_rows ?? null,
    blocked_target_parent_recovery_rows: plan.package_scope?.blocked_target_parent_recovery_rows ?? null,
    existing_collision_holder_modifier_rows: plan.package_scope?.existing_collision_holder_modifier_rows ?? null,
    deletes_included: false,
    global_apply_included: false,
  },
  source_artifact: path.relative(ROOT, PLAN_JSON).replaceAll('\\', '/'),
  sql_artifact: {
    path: plan.sql_artifact?.path ?? null,
    expected_sha256: plan.sql_artifact?.sha256 ?? null,
    actual_sha256: sqlHash,
    contains_update_statement: plan.sql_artifact?.contains_update_statement ?? null,
    contains_delete_statement: plan.sql_artifact?.contains_delete_statement ?? null,
    contains_commit_statement: plan.sql_artifact?.contains_commit_statement ?? null,
    contains_rollback_statement: plan.sql_artifact?.contains_rollback_statement ?? null,
    execution_performed: execution.execution_status === 'guarded_dry_run_transaction_completed_and_rolled_back',
  },
  execution_result: execution,
  durable_after_snapshot_matches_before_snapshot: (
    execution.before_snapshot?.hash_sha256
    && execution.before_snapshot.hash_sha256 === execution.after_snapshot?.hash_sha256
  ) || false,
  plan_fresh_snapshot_matches_before_snapshot: (
    plan.current_snapshot?.hash_sha256
    && plan.current_snapshot.hash_sha256 === execution.before_snapshot?.hash_sha256
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
  number_key_collision_rows: report.package_scope.number_key_collision_rows,
  parent_update_rows: report.package_scope.parent_update_rows,
  before_snapshot_hash: report.execution_result.before_snapshot?.hash_sha256 ?? null,
  after_snapshot_hash: report.execution_result.after_snapshot?.hash_sha256 ?? null,
  durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
  plan_fresh_snapshot_matches_before_snapshot: report.plan_fresh_snapshot_matches_before_snapshot,
  db_writes_performed: report.db_writes_performed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  real_apply_performed: report.real_apply_performed,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
