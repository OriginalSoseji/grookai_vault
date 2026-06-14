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
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_transaction_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_guarded_dry_run_execution_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_guarded_dry_run_execution_v1.md');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg06a_child_printing_guarded_dry_run_execution_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-06A-EXISTING-PARENT-CHILD-PRINTING-INSERTS';
const APPROVED_READINESS_FINGERPRINT = '7b2339f8004754d69bfcdc59bb63965a2e9f2e27827a211853af53ab8c18ab41';
const APPROVED_ARTIFACT_FINGERPRINT = 'a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120';
const APPROVED_SQL_HASH = '08b144cb1a180463a0a49c2fa1044170272d38ca771924cbeeac610915dd18fc';
const APPROVAL_TEXT = 'Proceed next step';
const EXPECTED_SET_COUNT = 3;
const EXPECTED_CHILD_INSERTS = 397;
const EXPECTED_TARGET_PARENT_ROWS = 390;

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

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function flattenQueryResults(result) {
  if (Array.isArray(result)) return result.flatMap((item) => item.rows ?? []);
  return result?.rows ?? [];
}

function plannedTargets(artifact) {
  return (artifact.planned_child_printing_rows ?? []).map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    finish_key: row.finish_key,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
  }));
}

async function captureTargetSnapshot(client, artifact) {
  const targets = plannedTargets(artifact);
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text,
         set_key text,
         card_number text,
         card_name text
       )
     ),
     distinct_parent as (
       select distinct card_print_id
       from target
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       null::text as finish_key,
       null::text as target_card_printing_id
     from distinct_parent t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'existing_target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       t.card_printing_id::text as target_card_printing_id
     from target t
     join public.card_printings cpr
       on cpr.card_print_id = t.card_print_id
      and cpr.finish_key = t.finish_key
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'planned_id_collision' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       t.card_printing_id::text as target_card_printing_id
     from target t
     join public.card_printings cpr on cpr.id = t.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      target_parent_rows: rows.filter((row) => row.row_type === 'target_parent').length,
      existing_target_child_rows: rows.filter((row) => row.row_type === 'existing_target_child').length,
      planned_id_collision_rows: rows.filter((row) => row.row_type === 'planned_id_collision').length,
      total_rows: rows.length,
    },
  };
}

function validateArtifact(artifact, sql, sqlHash) {
  const findings = [];
  const strippedSql = sql.replace(/--.*$/gm, '');

  if (artifact.package_id !== PACKAGE_ID) findings.push('artifact_package_id_mismatch');
  if (artifact.source_readiness_fingerprint_sha256 !== APPROVED_READINESS_FINGERPRINT) {
    findings.push('readiness_fingerprint_mismatch');
  }
  if (artifact.artifact_fingerprint_sha256 !== APPROVED_ARTIFACT_FINGERPRINT) {
    findings.push('artifact_fingerprint_mismatch');
  }
  if (artifact.sql_hash_sha256 !== APPROVED_SQL_HASH) findings.push('artifact_sql_hash_mismatch');
  if (sqlHash !== APPROVED_SQL_HASH) findings.push('actual_sql_hash_mismatch');
  if (artifact.summary?.planned_set_count !== EXPECTED_SET_COUNT) findings.push('planned_set_count_mismatch');
  if (artifact.summary?.planned_child_printing_inserts !== EXPECTED_CHILD_INSERTS) {
    findings.push('planned_child_count_mismatch');
  }
  if (artifact.summary?.target_parent_rows !== EXPECTED_TARGET_PARENT_ROWS) {
    findings.push('target_parent_count_mismatch');
  }
  if (artifact.summary?.existing_target_child_rows_in_fresh_snapshot !== 0) {
    findings.push('artifact_existing_target_child_rows_present');
  }
  if (artifact.summary?.planned_id_collision_rows_in_fresh_snapshot !== 0) {
    findings.push('artifact_planned_id_collision_rows_present');
  }
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('source_artifact_stop_findings_present');
  if (artifact.db_writes_performed !== false) findings.push('source_artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('source_artifact_reports_migration');
  if (artifact.cleanup_performed !== false) findings.push('source_artifact_reports_cleanup');
  if (artifact.quarantine_performed !== false) findings.push('source_artifact_reports_quarantine');
  if (artifact.apply_paths_executed !== false) findings.push('source_artifact_reports_apply_path');
  if (artifact.write_ready_now !== 0) findings.push('source_artifact_write_ready_nonzero');

  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback_statement');
  if (/\bdelete\s+from\b/i.test(strippedSql)) findings.push('sql_contains_delete_statement');
  if (/\bupdate\s+public\./i.test(strippedSql)) findings.push('sql_contains_update_statement');
  if (/\binsert\s+into\s+public\.sets\b/i.test(strippedSql)) findings.push('sql_contains_set_insert');
  if (/\binsert\s+into\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_contains_parent_insert');
  if (!/\binsert\s+into\s+public\.card_printings\b/i.test(strippedSql)) findings.push('sql_missing_child_insert');
  if (/\binsert\s+into\s+public\.external_mappings\b/i.test(strippedSql)) {
    findings.push('sql_contains_external_mapping_insert');
  }

  return findings;
}

async function runDryRunSql(sql, artifact) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      execution_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
      rollback_proof_rows: [],
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const beforeSnapshot = await captureTargetSnapshot(client, artifact);
    let executionStatus = 'pkg06a_guarded_dry_run_completed_rolled_back_no_durable_change';
    let errorMessage = null;
    let rollbackProofRows = [];
    try {
      const result = await client.query(sql);
      rollbackProofRows = flattenQueryResults(result).filter((row) => row.package_id === PACKAGE_ID);
    } catch (error) {
      executionStatus = 'pkg06a_guarded_dry_run_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }
    const afterSnapshot = await captureTargetSnapshot(client, artifact);
    return {
      connected: true,
      execution_status: executionStatus,
      error_message: errorMessage,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: rollbackProofRows,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function evaluateExecution(artifact, execution) {
  const findings = [];
  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'pkg06a_guarded_dry_run_completed_rolled_back_no_durable_change') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.error_message) findings.push('dry_run_transaction_error_message_present');
  if (execution.before_snapshot?.counts?.target_parent_rows !== EXPECTED_TARGET_PARENT_ROWS) {
    findings.push('before_snapshot_target_parent_count_mismatch');
  }
  if (execution.before_snapshot?.counts?.existing_target_child_rows !== 0) {
    findings.push('before_snapshot_existing_target_child_rows_present');
  }
  if (execution.before_snapshot?.counts?.planned_id_collision_rows !== 0) {
    findings.push('before_snapshot_planned_id_collision_rows_present');
  }
  if (execution.after_snapshot?.counts?.target_parent_rows !== EXPECTED_TARGET_PARENT_ROWS) {
    findings.push('after_snapshot_target_parent_count_mismatch');
  }
  if (execution.after_snapshot?.counts?.existing_target_child_rows !== 0) {
    findings.push('after_snapshot_existing_target_child_rows_present_after_rollback');
  }
  if (execution.after_snapshot?.counts?.planned_id_collision_rows !== 0) {
    findings.push('after_snapshot_planned_id_collision_rows_present_after_rollback');
  }
  if (execution.before_snapshot?.hash_sha256 !== execution.after_snapshot?.hash_sha256) {
    findings.push('durable_after_snapshot_differs_from_before_snapshot');
  }

  const proof = execution.rollback_proof_rows?.[0];
  if (!proof) findings.push('rollback_proof_row_missing');
  if (proof) {
    if (Number(proof.planned_sets) !== artifact.summary?.planned_set_count) {
      findings.push('rollback_proof_set_count_mismatch');
    }
    if (Number(proof.target_parent_rows) !== artifact.summary?.target_parent_rows) {
      findings.push('rollback_proof_parent_count_mismatch');
    }
    if (Number(proof.planned_child_rows) !== artifact.summary?.planned_child_printing_inserts) {
      findings.push('rollback_proof_child_count_mismatch');
    }
    if (proof.readiness_fingerprint !== APPROVED_READINESS_FINGERPRINT) {
      findings.push('rollback_proof_readiness_fingerprint_mismatch');
    }
    if (proof.artifact_fingerprint !== artifact.artifact_fingerprint_sha256) {
      findings.push('rollback_proof_artifact_fingerprint_mismatch');
    }
  }
  return findings;
}

function buildMarkdown(report) {
  const selectedRows = report.package_scope.selected_sets.map((row) => [
    row.set_key,
    row.set_name,
    row.child_printing_inserts,
    JSON.stringify(row.finish_counts),
  ]);
  return `# PKG-06A Child Printing Guarded Dry-Run Execution V1

Rollback-only dry-run execution proof for PKG-06A. No real apply was authorized or performed.

## Approval

- approval_text: ${report.approval.approval_text}
- approval_scope: rollback-only dry-run execution and proof generation only
- approved_readiness_fingerprint: \`${report.approval.approved_readiness_fingerprint_sha256}\`
- approved_artifact_fingerprint: \`${report.approval.approved_artifact_fingerprint_sha256}\`
- real_apply_authorized: ${report.real_apply_authorized}

## Safety

- transaction_artifact_executed: ${report.transaction_artifact_executed}
- dry_run_insert_executed_inside_rolled_back_transaction: ${report.dry_run_insert_executed_inside_rolled_back_transaction}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- real_apply_authorized: ${report.real_apply_authorized}
- write_ready_now: ${report.write_ready_now}

## Status

- dry_run_execution_status: ${report.dry_run_execution_status}
- stop_findings: ${report.stop_findings.length}
- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

## Scope

${markdownTable(['set_key', 'set_name', 'child_printing_inserts', 'finish_counts'], selectedRows)}

## Counts

${markdownTable(['metric', 'value'], Object.entries(report.package_scope.counts))}

## Snapshot Counts

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows |
| --- | ---: | ---: | ---: |
| before | ${report.before_snapshot?.counts?.target_parent_rows ?? 'n/a'} | ${report.before_snapshot?.counts?.existing_target_child_rows ?? 'n/a'} | ${report.before_snapshot?.counts?.planned_id_collision_rows ?? 'n/a'} |
| after | ${report.after_snapshot?.counts?.target_parent_rows ?? 'n/a'} | ${report.after_snapshot?.counts?.existing_target_child_rows ?? 'n/a'} | ${report.after_snapshot?.counts?.planned_id_collision_rows ?? 'n/a'} |

## Rollback Proof

${report.rollback_proof_rows.length ? markdownTable(['package_id', 'planned_sets', 'target_parent_rows', 'planned_child_rows'], report.rollback_proof_rows.map((row) => [row.package_id, row.planned_sets, row.target_parent_rows, row.planned_child_rows])) : 'No rollback proof row captured.'}

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : 'None.'}
`;
}

function buildCheckpoint(report) {
  return `# PKG-06A Child Printing Guarded Dry-Run Execution Checkpoint V1

Date: 2026-06-09

## Purpose

Record rollback-only dry-run execution for PKG-06A child-only printing inserts.

## Result

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| source_readiness_fingerprint_sha256 | \`${report.source_artifact.source_readiness_fingerprint_sha256}\` |
| artifact_fingerprint_sha256 | \`${report.source_artifact.artifact_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.source_artifact.sql_hash_sha256}\` |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| planned_set_count | ${report.package_scope.counts.planned_set_count} |
| planned_child_printing_inserts | ${report.package_scope.counts.planned_child_printing_inserts} |
| target_parent_rows | ${report.package_scope.counts.target_parent_rows} |
| before_hash_sha256 | \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\` |
| after_hash_sha256 | \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\` |
| durable_after_snapshot_matches_before_snapshot | ${report.durable_after_snapshot_matches_before_snapshot} |
| stop_findings | ${report.stop_findings.length} |
| durable_db_writes_performed | ${report.durable_db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| real_apply_authorized | ${report.real_apply_authorized} |
| write_ready_now | ${report.write_ready_now} |

## Scope

| set_key | set_name | child_printing_inserts |
| --- | --- | ---: |
${report.package_scope.selected_sets.map((row) => `| ${row.set_key} | ${row.set_name} | ${row.child_printing_inserts} |`).join('\n')}

## Safety

- Transaction was rollback-only.
- Real apply remains unauthorized.
- No migrations were created.
- No durable database writes were performed.
- No deletes, merges, unsupported cleanup, parent inserts, parent updates, or identity modifier work were included.

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg06a_child_printing_guarded_dry_run_execution_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg06a_child_printing_guarded_dry_run_execution_v1.md\`

`;
}

async function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-06A Child Printing Guarded Dry-Run Execution Checkpoint V1](20260609_pkg06a_child_printing_guarded_dry_run_execution_checkpoint_v1.md) | Records rollback-only dry-run execution for 397 child-only inserts across Gym Heroes, Gym Challenge, and Supreme Victors; durable state unchanged, no real apply, no migrations. |';
  const current = await fs.readFile(indexPath, 'utf8').catch(() => '# Master Index Checkpoints\n');
  if (current.includes('20260609_pkg06a_child_printing_guarded_dry_run_execution_checkpoint_v1.md')) {
    await fs.writeFile(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg06a_child_printing_guarded_dry_run_execution_checkpoint_v1.md')
            ? line
            : existingLine)
        .join('\n'),
    );
  } else {
    await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const artifact = await readJson(ARTIFACT_JSON);
  const sql = await fs.readFile(artifact.sql_artifact_path, 'utf8');
  const sqlHash = sha256(sql);
  const validationFindings = validateArtifact(artifact, sql, sqlHash);
  const execution = validationFindings.length
    ? {
        connected: false,
        execution_status: 'blocked_validation_findings_present',
        error_message: null,
        before_snapshot: null,
        after_snapshot: null,
        rollback_proof_rows: [],
      }
    : await runDryRunSql(sql, artifact);
  const executionFindings = validationFindings.length ? [] : evaluateExecution(artifact, execution);
  const stopFindings = [...validationFindings, ...executionFindings];
  const durableAfterMatchesBefore = (
    execution.before_snapshot?.hash_sha256 &&
    execution.before_snapshot.hash_sha256 === execution.after_snapshot?.hash_sha256
  );

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg06a_child_printing_guarded_dry_run_execution_v1',
    package_id: PACKAGE_ID,
    approval: {
      approval_text: APPROVAL_TEXT,
      approved_readiness_fingerprint_sha256: APPROVED_READINESS_FINGERPRINT,
      approved_artifact_fingerprint_sha256: APPROVED_ARTIFACT_FINGERPRINT,
      approved_scope: 'rollback_only_dry_run_execution_and_proof_generation',
    },
    source_artifact: {
      json_path: ARTIFACT_JSON,
      sql_path: artifact.sql_artifact_path,
      source_readiness_fingerprint_sha256: artifact.source_readiness_fingerprint_sha256,
      artifact_fingerprint_sha256: artifact.artifact_fingerprint_sha256,
      sql_hash_sha256: sqlHash,
    },
    package_scope: {
      selected_sets: artifact.selected_sets,
      counts: {
        planned_set_count: artifact.summary?.planned_set_count,
        planned_child_printing_inserts: artifact.summary?.planned_child_printing_inserts,
        target_parent_rows: artifact.summary?.target_parent_rows,
      },
    },
    dry_run_execution_status: execution.execution_status,
    error_message: execution.error_message,
    transaction_artifact_executed: validationFindings.length === 0,
    dry_run_insert_executed_inside_rolled_back_transaction:
      execution.execution_status === 'pkg06a_guarded_dry_run_completed_rolled_back_no_durable_change',
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_authorized: false,
    write_ready_now: 0,
    before_snapshot: execution.before_snapshot,
    after_snapshot: execution.after_snapshot,
    rollback_proof_rows: execution.rollback_proof_rows ?? [],
    durable_after_snapshot_matches_before_snapshot: durableAfterMatchesBefore,
    stop_findings: stopFindings,
    next_allowed_step: stopFindings.length === 0
      ? 'Prepare real-apply gate only if separately requested. Real apply remains unauthorized.'
      : 'Resolve stop findings before preparing any real-apply gate.',
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  await writeText(CHECKPOINT_MD, buildCheckpoint(report));
  await updateCheckpointIndex();

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    checkpoint: path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
    dry_run_execution_status: report.dry_run_execution_status,
    stop_findings: report.stop_findings,
    before_hash: report.before_snapshot?.hash_sha256 ?? null,
    after_hash: report.after_snapshot?.hash_sha256 ?? null,
    durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
    rollback_proof_rows: report.rollback_proof_rows,
    durable_db_writes_performed: report.durable_db_writes_performed,
    migrations_created: report.migrations_created,
    cleanup_performed: report.cleanup_performed,
    quarantine_performed: report.quarantine_performed,
    real_apply_authorized: report.real_apply_authorized,
  }, null, 2));

  if (report.stop_findings.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[pkg06a][guarded-dry-run] failed:', error?.message ?? error);
  process.exitCode = 1;
});
