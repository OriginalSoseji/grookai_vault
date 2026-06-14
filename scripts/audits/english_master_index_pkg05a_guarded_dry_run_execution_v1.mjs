import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_final_snapshot_transaction_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_guarded_dry_run_execution_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg05a_guarded_dry_run_execution_v1.md');

const PACKAGE_ID = 'PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS';
const APPROVED_READINESS_FINGERPRINT = 'da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1';
const APPROVAL_TEXT = 'Approve PKG-05A preparation lifecycle through rollback-only dry-run execution and proof generation only. Fingerprint: da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1. Scope: 4 missing fully master-verified sets, 72 parent inserts, 80 child printings, 72 external mappings. No real apply. No migrations. No deletes. No merges. No unsupported cleanup.';

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
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function sqlSetAliases(artifact) {
  return [...new Set((artifact.planned_sets ?? []).flatMap((row) => row.aliases ?? []).map(normalizeText).filter(Boolean))];
}

function sqlSetKeys(artifact) {
  return (artifact.planned_sets ?? []).map((row) => row.set_key);
}

async function captureTargetSnapshot(client, artifact) {
  const aliases = sqlSetAliases(artifact);
  const setKeys = sqlSetKeys(artifact);
  const plannedSetIds = (artifact.planned_sets ?? []).map((row) => row.set_id);
  const plannedParentIds = (artifact.planned_parent_rows ?? []).map((row) => row.card_print_id);
  const plannedChildIds = (artifact.planned_child_printing_rows ?? []).map((row) => row.card_printing_id);
  const plannedExternalIds = (artifact.planned_external_mapping_rows ?? []).map((row) => row.external_id);

  const result = await client.query(
    `select
       'set' as row_type,
       s.id::text as row_id,
       s.code as set_code,
       s.name,
       null::text as card_number,
       null::text as finish_key,
       null::text as external_id
     from public.sets s
     where s.id = any($3::uuid[])
        or (
          s.game = 'pokemon'
          and (
            lower(coalesce(s.code, '')) = any($1::text[])
            or lower(coalesce(s.name, '')) = any($1::text[])
            or s.source->'tcgdex'->>'id' = any($2::text[])
          )
        )
     union all
     select
       'card_print' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.name,
       coalesce(cp.number_plain, cp.number) as card_number,
       null::text as finish_key,
       null::text as external_id
     from public.card_prints cp
     where cp.id = any($4::uuid[])
        or lower(coalesce(cp.set_code, '')) = any($1::text[])
     union all
     select
       'card_printing' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.name,
       coalesce(cp.number_plain, cp.number) as card_number,
       cpr.finish_key,
       null::text as external_id
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = any($5::uuid[])
        or lower(coalesce(cp.set_code, '')) = any($1::text[])
     union all
     select
       'external_mapping' as row_type,
       em.id::text as row_id,
       null::text as set_code,
       null::text as name,
       null::text as card_number,
       null::text as finish_key,
       em.external_id
     from public.external_mappings em
     where em.source = 'tcgdex'
       and em.external_id = any($6::text[])
     order by row_type, set_code nulls last, card_number nulls last, name nulls last, finish_key nulls last, external_id nulls last, row_id`,
    [aliases, setKeys, plannedSetIds, plannedParentIds, plannedChildIds, plannedExternalIds],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      set_rows: rows.filter((row) => row.row_type === 'set').length,
      parent_rows: rows.filter((row) => row.row_type === 'card_print').length,
      child_printing_rows: rows.filter((row) => row.row_type === 'card_printing').length,
      external_mapping_rows: rows.filter((row) => row.row_type === 'external_mapping').length,
      total_rows: rows.length,
    },
  };
}

function flattenQueryResults(result) {
  if (Array.isArray(result)) return result.flatMap((item) => item.rows ?? []);
  return result?.rows ?? [];
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
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    let rollbackProofRows = [];
    try {
      const result = await client.query(sql);
      rollbackProofRows = flattenQueryResults(result).filter((row) => row.package_id === PACKAGE_ID);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
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

function validateArtifact(artifact, sql, sqlHash) {
  const findings = [];
  const strippedSql = sql.replace(/--.*$/gm, '');

  if (artifact.package_id !== PACKAGE_ID) findings.push('artifact_package_id_mismatch');
  if (artifact.source_readiness_fingerprint_sha256 !== APPROVED_READINESS_FINGERPRINT) findings.push('readiness_fingerprint_mismatch');
  if (artifact.summary?.planned_set_inserts !== 4) findings.push('planned_set_count_not_four');
  if (artifact.summary?.planned_parent_inserts !== 72) findings.push('planned_parent_count_not_72');
  if (artifact.summary?.planned_child_printing_inserts !== 80) findings.push('planned_child_count_not_80');
  if (artifact.summary?.planned_external_mapping_inserts !== 72) findings.push('planned_external_mapping_count_not_72');
  if (artifact.stop_findings?.length !== 0) findings.push('source_artifact_stop_findings_present');
  if (artifact.db_writes_performed !== false) findings.push('source_artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('source_artifact_reports_migration');
  if (artifact.cleanup_performed !== false) findings.push('source_artifact_reports_cleanup');
  if (artifact.quarantine_performed !== false) findings.push('source_artifact_reports_quarantine');
  if (sha256(sql) !== sqlHash) findings.push('sql_hash_self_check_failed');
  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback_statement');
  if (/\bdelete\s+from\b/i.test(strippedSql)) findings.push('sql_contains_delete_statement');
  if (/\bupdate\s+public\./i.test(strippedSql)) findings.push('sql_contains_update_statement');
  if (!/\binsert\s+into\s+public\.sets\b/i.test(strippedSql)) findings.push('sql_missing_set_insert');
  if (!/\binsert\s+into\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_missing_parent_insert');
  if (!/\binsert\s+into\s+public\.card_printings\b/i.test(strippedSql)) findings.push('sql_missing_child_insert');
  if (!/\binsert\s+into\s+public\.external_mappings\b/i.test(strippedSql)) findings.push('sql_missing_external_mapping_insert');

  return findings;
}

function evaluateExecution(artifact, execution) {
  const findings = [];
  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') findings.push('dry_run_transaction_did_not_complete');
  if (execution.error_message) findings.push('dry_run_transaction_error_message_present');
  if (execution.before_snapshot?.counts?.total_rows !== 0) findings.push('before_snapshot_not_empty_for_insert_only_scope');
  if (execution.after_snapshot?.counts?.total_rows !== 0) findings.push('after_snapshot_not_empty_after_rollback');
  if (execution.before_snapshot?.hash_sha256 !== execution.after_snapshot?.hash_sha256) findings.push('durable_after_snapshot_differs_from_before_snapshot');
  const proof = execution.rollback_proof_rows?.[0];
  if (!proof) findings.push('rollback_proof_row_missing');
  if (proof) {
    if (Number(proof.planned_sets) !== artifact.summary?.planned_set_inserts) findings.push('rollback_proof_set_count_mismatch');
    if (Number(proof.planned_parent_rows) !== artifact.summary?.planned_parent_inserts) findings.push('rollback_proof_parent_count_mismatch');
    if (Number(proof.planned_child_rows) !== artifact.summary?.planned_child_printing_inserts) findings.push('rollback_proof_child_count_mismatch');
    if (proof.readiness_fingerprint !== APPROVED_READINESS_FINGERPRINT) findings.push('rollback_proof_readiness_fingerprint_mismatch');
    if (proof.artifact_fingerprint !== artifact.artifact_fingerprint_sha256) findings.push('rollback_proof_artifact_fingerprint_mismatch');
  }
  return findings;
}

function buildMarkdown(report) {
  const selectedRows = report.package_scope.selected_sets.map((row) => [
    row.set_key,
    row.set_name,
    row.expected_parent_rows,
    row.expected_child_printings,
  ]);
  return `# PKG-05A Guarded Dry-Run Execution V1

Rollback-only dry-run execution proof for PKG-05A. No real apply was authorized or performed.

## Approval

- approval_scope: preparation lifecycle through rollback-only dry-run execution and proof generation only
- approved_readiness_fingerprint: \`${report.approval.approved_readiness_fingerprint_sha256}\`
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

${markdownTable(['set_key', 'set_name', 'parents', 'children'], selectedRows)}

## Counts

${markdownTable(['metric', 'value'], Object.entries(report.package_scope.counts))}

## Rollback Proof

${report.rollback_proof_rows.length ? markdownTable(['package_id', 'planned_sets', 'planned_parent_rows', 'planned_child_rows'], report.rollback_proof_rows.map((row) => [row.package_id, row.planned_sets, row.planned_parent_rows, row.planned_child_rows])) : 'No rollback proof row captured.'}

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : 'None.'}
`;
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
    version: 'english_master_index_pkg05a_guarded_dry_run_execution_v1',
    package_id: PACKAGE_ID,
    approval: {
      approval_text: APPROVAL_TEXT,
      approved_readiness_fingerprint_sha256: APPROVED_READINESS_FINGERPRINT,
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
      selected_sets: artifact.planned_sets.map((row) => ({
        set_key: row.set_key,
        set_name: row.set_name,
        expected_parent_rows: row.expected_parent_rows,
        expected_child_printings: row.expected_child_printings,
      })),
      counts: {
        planned_set_inserts: artifact.summary?.planned_set_inserts,
        planned_parent_inserts: artifact.summary?.planned_parent_inserts,
        planned_child_printing_inserts: artifact.summary?.planned_child_printing_inserts,
        planned_external_mapping_inserts: artifact.summary?.planned_external_mapping_inserts,
      },
    },
    dry_run_execution_status: execution.execution_status,
    error_message: execution.error_message,
    transaction_artifact_executed: validationFindings.length === 0,
    dry_run_insert_executed_inside_rolled_back_transaction: execution.execution_status === 'guarded_dry_run_transaction_completed_and_rolled_back',
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
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
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
}

main().catch((error) => {
  console.error('[pkg05a][guarded-dry-run] failed:', error?.message ?? error);
  process.exitCode = 1;
});
