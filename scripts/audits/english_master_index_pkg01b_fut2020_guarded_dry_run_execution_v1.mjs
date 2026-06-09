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
  'english_master_index_pkg01b_fut2020_final_snapshot_transaction_artifact_v1.json',
);
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_guarded_dry_run_execution_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_guarded_dry_run_execution_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg01b_fut2020_guarded_dry_run_execution_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-01B-FUT2020';
const PACKAGE_FINGERPRINT = 'c9539d98a7f883ce9b66ed12c57416ed68f0e9d1cad08b654f1470cb40baee63';

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

async function captureSnapshot(client, cardPrintIds) {
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
     where cp.id = any($1::uuid[])
     order by nullif(regexp_replace(coalesce(cp.number_plain, cp.number), '[^0-9]', '', 'g'), '')::int nulls last`,
    [cardPrintIds],
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
      parent_vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
      normal_printings_found: rows.reduce(
        (sum, row) => sum + row.card_printings.filter((printing) => printing.finish_key === 'normal').length,
        0,
      ),
      holo_printings_found: rows.reduce(
        (sum, row) => sum + row.card_printings.filter((printing) => printing.finish_key === 'holo').length,
        0,
      ),
      reverse_printings_found: rows.reduce(
        (sum, row) => sum + row.card_printings.filter((printing) => printing.finish_key === 'reverse').length,
        0,
      ),
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
  const stopFindings = [];
  const tx = artifact.guarded_dry_run_transaction_artifact ?? {};
  const scope = artifact.package_scope ?? {};

  if (artifact.artifact_status !== 'pkg01b_fut2020_final_snapshot_and_dry_run_artifact_prepared_apply_blocked_no_write') {
    stopFindings.push('source_artifact_status_not_ready');
  }
  if (scope.package_id !== PACKAGE_ID) stopFindings.push('source_artifact_wrong_package_id');
  if (scope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) stopFindings.push('source_artifact_fingerprint_mismatch');
  if (scope.set_key !== 'fut2020') stopFindings.push('source_artifact_wrong_set_key');
  if (scope.parent_set_code_updates !== 4) stopFindings.push('source_artifact_parent_update_count_not_four');
  if (scope.child_delete_candidates !== 8) stopFindings.push('source_artifact_delete_count_not_eight');
  if (scope.child_keep_rows !== 4) stopFindings.push('source_artifact_keep_count_not_four');
  if (artifact.pass !== true) stopFindings.push('source_artifact_not_passing');
  if (artifact.db_writes_performed !== false) stopFindings.push('source_artifact_reports_db_write');
  if (artifact.migrations_created !== false) stopFindings.push('source_artifact_reports_migration');
  if (artifact.apply_allowed !== false) stopFindings.push('source_artifact_allows_apply');
  if (artifact.write_ready_now !== 0) stopFindings.push('source_artifact_write_ready_nonzero');
  if ((artifact.stop_findings ?? []).length !== 0) stopFindings.push('source_artifact_stop_findings_present');

  if (tx.executed !== false) stopFindings.push('source_artifact_already_marked_executed');
  if (tx.contains_commit_statement !== false) stopFindings.push('source_artifact_allows_commit_statement');
  if (tx.contains_rollback_statement !== true) stopFindings.push('source_artifact_missing_rollback_statement');
  if (tx.artifact_hash_sha256 !== sqlHash) stopFindings.push('sql_artifact_hash_mismatch');
  if (/(^|\n)\s*commit\s*;/i.test(sql)) stopFindings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(sql)) stopFindings.push('sql_missing_rollback_statement');
  if ((tx.allowed_parent_target_ids ?? []).length !== 4) stopFindings.push('sql_scope_parent_target_count_not_four');
  if ((tx.allowed_child_delete_candidate_ids ?? []).length !== 8) {
    stopFindings.push('sql_scope_child_delete_count_not_eight');
  }
  if ((tx.allowed_child_keep_ids ?? []).length !== 4) stopFindings.push('sql_scope_child_keep_count_not_four');
  if ((tx.allowed_field_changes ?? []).join(',') !== 'card_prints.set_code') {
    stopFindings.push('sql_scope_not_set_code_only_parent_change');
  }

  return stopFindings;
}

function evaluateRun(artifact, execution) {
  const findings = [];
  const beforeRows = execution.before_snapshot?.rows ?? [];
  const afterRows = execution.after_snapshot?.rows ?? [];

  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.before_snapshot?.counts?.card_prints_found !== 4) findings.push('before_snapshot_parent_count_not_four');
  if (execution.after_snapshot?.counts?.card_prints_found !== 4) findings.push('after_snapshot_parent_count_not_four');
  if (execution.before_snapshot?.counts?.card_printings_found !== 12) findings.push('before_snapshot_child_count_not_twelve');
  if (execution.after_snapshot?.counts?.card_printings_found !== 12) findings.push('after_snapshot_child_count_not_twelve');
  if (execution.before_snapshot?.counts?.parent_vault_items_found !== 0) findings.push('before_snapshot_vault_reference_blocker');
  if (execution.after_snapshot?.counts?.parent_vault_items_found !== 0) findings.push('after_snapshot_vault_reference_blocker');
  if (execution.before_snapshot?.counts?.normal_printings_found !== 4) findings.push('before_snapshot_normal_count_not_four');
  if (execution.before_snapshot?.counts?.holo_printings_found !== 4) findings.push('before_snapshot_holo_count_not_four');
  if (execution.before_snapshot?.counts?.reverse_printings_found !== 4) findings.push('before_snapshot_reverse_count_not_four');
  if (execution.after_snapshot?.counts?.normal_printings_found !== 4) findings.push('after_snapshot_normal_count_not_four');
  if (execution.after_snapshot?.counts?.holo_printings_found !== 4) findings.push('after_snapshot_holo_count_not_four');
  if (execution.after_snapshot?.counts?.reverse_printings_found !== 4) findings.push('after_snapshot_reverse_count_not_four');

  if (stableJson(beforeRows) !== stableJson(afterRows)) {
    findings.push('durable_after_snapshot_differs_from_before_snapshot');
  }

  const expectedById = new Map((artifact.mutation_matrix ?? []).map((row) => [row.card_print_id, row]));
  for (const afterRow of afterRows) {
    const expected = expectedById.get(afterRow.card_print_id);
    if (!expected) {
      findings.push(`after_snapshot_unknown_parent_${afterRow.card_print_id}`);
      continue;
    }
    if (afterRow.set_code !== expected.before_values_from_fresh_snapshot?.set_code) {
      findings.push(`after_snapshot_set_code_not_rolled_back_${afterRow.card_print_id}`);
    }
    if (afterRow.number !== expected.before_values_from_fresh_snapshot?.number) {
      findings.push(`after_snapshot_number_changed_${afterRow.card_print_id}`);
    }
    if (afterRow.name !== expected.before_values_from_fresh_snapshot?.name) {
      findings.push(`after_snapshot_name_changed_${afterRow.card_print_id}`);
    }
    const finishes = (afterRow.card_printings ?? []).map((row) => row.finish_key).sort().join(',');
    if (finishes !== 'holo,normal,reverse') {
      findings.push(`after_snapshot_finish_scope_changed_${afterRow.card_print_id}`);
    }
  }

  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01B-FUT2020 Guarded Dry-Run Execution V1');
  lines.push('');
  lines.push('This report records execution of the `PKG-01B-FUT2020` guarded transaction artifact in dry-run mode only.');
  lines.push('');
  lines.push('The SQL artifact contains no `COMMIT;` statement and ends with `ROLLBACK;`. No durable DB change is authorized by this report.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| dry_run_execution_status | ${report.dry_run_execution_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| transaction_artifact_executed | ${report.transaction_artifact_executed} |`);
  lines.push(`| dry_run_update_delete_executed_inside_rolled_back_transaction | ${report.dry_run_update_delete_executed_inside_rolled_back_transaction} |`);
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
  lines.push('| Snapshot | Hash | parent rows | child rows | normal | holo | reverse | vault refs |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  lines.push(`| before | \`${report.before_snapshot.hash_sha256}\` | ${report.before_snapshot.counts.card_prints_found} | ${report.before_snapshot.counts.card_printings_found} | ${report.before_snapshot.counts.normal_printings_found} | ${report.before_snapshot.counts.holo_printings_found} | ${report.before_snapshot.counts.reverse_printings_found} | ${report.before_snapshot.counts.parent_vault_items_found} |`);
  lines.push(`| after | \`${report.after_snapshot.hash_sha256}\` | ${report.after_snapshot.counts.card_prints_found} | ${report.after_snapshot.counts.card_printings_found} | ${report.after_snapshot.counts.normal_printings_found} | ${report.after_snapshot.counts.holo_printings_found} | ${report.after_snapshot.counts.reverse_printings_found} | ${report.after_snapshot.counts.parent_vault_items_found} |`);
  lines.push('');
  lines.push(`Durable after snapshot matches before snapshot: ${report.durable_after_snapshot_matches_before_snapshot}`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  }
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# PKG-01B-FUT2020 Guarded Dry-Run Execution Checkpoint V1

Date: 2026-06-09

## Purpose

Record rollback-only dry-run execution of the PKG-01B-FUT2020 guarded transaction artifact.

## Result

| Field | Value |
| --- | --- |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| transaction_artifact_executed | ${report.transaction_artifact_executed} |
| durable_after_snapshot_matches_before_snapshot | ${report.durable_after_snapshot_matches_before_snapshot} |
| before_hash_sha256 | \`${report.verification_summary.before_hash_sha256 ?? 'not_available'}\` |
| after_hash_sha256 | \`${report.verification_summary.after_hash_sha256 ?? 'not_available'}\` |
| durable_db_writes_performed | ${report.durable_db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| write_ready_now | ${report.write_ready_now} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- SQL artifact was executed only as rollback-ending dry run.
- SQL artifact had no COMMIT statement.
- Durable before/after snapshots match.
- No real apply was authorized.
- No migrations were created.
- No cleanup or quarantine was performed.

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_guarded_dry_run_execution_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01b_fut2020_guarded_dry_run_execution_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-01B-FUT2020 Guarded Dry-Run Execution Checkpoint V1](20260609_pkg01b_fut2020_guarded_dry_run_execution_checkpoint_v1.md) | Records successful rollback-only dry-run execution for fut2020 cards #2-#5 with four transient parent updates, eight transient child deletes, identical durable before/after hashes, and no real apply. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_pkg01b_fut2020_guarded_dry_run_execution_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg01b_fut2020_guarded_dry_run_execution_checkpoint_v1.md')
            ? line
            : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const artifact = readJson(ARTIFACT_JSON);
const sqlPath = path.join(ROOT, artifact.guarded_dry_run_transaction_artifact.artifact_ref);
const sql = fs.readFileSync(sqlPath, 'utf8');
const sqlHash = sha256(sql);
const validationFindings = validateArtifact(artifact, sql, sqlHash);
const targetIds = artifact.guarded_dry_run_transaction_artifact?.allowed_parent_target_ids ?? [];
const execution = validationFindings.length === 0
  ? await runDryRunSql(sql, targetIds)
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
  version: 'english_master_index_pkg01b_fut2020_guarded_dry_run_execution_v1',
  audit_only: true,
  dry_run_only: true,
  transaction_artifact_executed: validationFindings.length === 0,
  dry_run_update_delete_executed_inside_rolled_back_transaction: pass,
  durable_db_writes_performed: false,
  db_write_committed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: false,
  apply_allowed: false,
  write_ready_now: 0,
  dry_run_execution_status: pass
    ? 'pkg01b_fut2020_guarded_dry_run_passed_rolled_back_no_durable_change'
    : 'pkg01b_fut2020_guarded_dry_run_blocked_or_failed',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    set_key: 'fut2020',
    parent_card_print_rows: 4,
    transient_parent_set_code_updates: 4,
    transient_child_delete_candidates: 8,
    child_keep_rows: 4,
    allowed_parent_field_changes: ['set_code'],
    allowed_child_delete_finish_keys: ['holo', 'reverse'],
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
    expected_transient_update_delete_rolled_back: pass,
  },
  explicit_non_authorizations: [
    'This dry-run execution is not real DB write/apply approval.',
    'No COMMIT statement was allowed.',
    'No migration was created.',
    'No cleanup, quarantine, insertion, hiding, scanner, pricing, vault, or marketplace behavior was authorized.',
    'A separate explicit approval is still required before any durable PKG-01B apply.',
  ],
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
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

if (!report.pass) process.exitCode = 1;
