import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER';
const PACKAGE_FINGERPRINT = 'b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8';
const APPROVAL_TEXT = 'Approve PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER for guarded dry-run transaction execution only. Fingerprint: b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8. Scope: 38 groups, 39 duplicate parent rows, dependency transfer simulation, rollback-only. No real apply. No migrations.';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

async function captureSnapshot(client, targetRows) {
  const parentIds = [...new Set([
    ...targetRows.map((row) => row.blocked_card_print_id),
    ...targetRows.map((row) => row.survivor_card_print_id),
  ])];
  const blockedIds = [...new Set(targetRows.map((row) => row.blocked_card_print_id))];
  const result = await client.query(
    `select
       cp.id::text,
       to_jsonb(cp) as card_print,
       coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as card_printings,
       coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings,
       coalesce((select jsonb_agg(to_jsonb(cps) order by cps.species_id, cps.role, cps.source, cps.id) from public.card_print_species cps where cps.card_print_id = cp.id), '[]'::jsonb) as card_print_species,
       coalesce((select jsonb_agg(to_jsonb(cwc) order by cwc.id) from public.canon_warehouse_candidates cwc where cwc.promoted_card_print_id = cp.id), '[]'::jsonb) as canon_warehouse_candidates,
       coalesce((select count(*)::int from public.justtcg_variants jv where jv.card_print_id = cp.id), 0) as justtcg_variant_count,
       coalesce((select count(*)::int from public.justtcg_variant_prices_latest jl where jl.card_print_id = cp.id), 0) as justtcg_latest_count,
       coalesce((select count(*)::int from public.justtcg_variant_price_snapshots js where js.card_print_id = cp.id), 0) as justtcg_snapshot_count
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code, cp.number_plain, cp.number, cp.name, cp.id`,
    [parentIds],
  );
  const blockedChildRows = await client.query(
    `select count(*)::int as rows
     from public.card_printings
     where card_print_id = any($1::uuid[])`,
    [blockedIds],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    impact_counts: {
      card_prints_found: rows.length,
      blocked_child_printings_found: Number(blockedChildRows.rows[0]?.rows ?? 0),
      external_mappings_found: rows.reduce((sum, row) => sum + row.external_mappings.length, 0),
      card_print_species_found: rows.reduce((sum, row) => sum + row.card_print_species.length, 0),
      canon_warehouse_candidates_found: rows.reduce((sum, row) => sum + row.canon_warehouse_candidates.length, 0),
      justtcg_variants_found: rows.reduce((sum, row) => sum + Number(row.justtcg_variant_count), 0),
      justtcg_latest_found: rows.reduce((sum, row) => sum + Number(row.justtcg_latest_count), 0),
      justtcg_snapshots_found: rows.reduce((sum, row) => sum + Number(row.justtcg_snapshot_count), 0),
    },
  };
}

async function runDryRunSql(sql, targetRows) {
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
    const beforeSnapshot = await captureSnapshot(client, targetRows);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    try {
      await client.query(sql);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }
    const afterSnapshot = await captureSnapshot(client, targetRows);
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
  const strippedSql = sql.replace(/--.*$/gm, '');
  if (artifact.artifact_status !== 'pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_prepared_apply_blocked_no_write') {
    findings.push('source_artifact_status_not_ready');
  }
  if (artifact.package_id !== PACKAGE_ID) findings.push('source_artifact_wrong_package_id');
  if (artifact.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('source_artifact_fingerprint_mismatch');
  }
  if (artifact.package_scope?.duplicate_parent_rows !== 39) findings.push('source_artifact_parent_count_not_39');
  if (artifact.package_scope?.groups !== 38) findings.push('source_artifact_group_count_not_38');
  if (artifact.required_operator_approval?.exact_phrase !== APPROVAL_TEXT) findings.push('approval_phrase_mismatch');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('source_artifact_stop_findings_present');
  if (artifact.db_writes_performed !== false) findings.push('source_artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('source_artifact_reports_migration');
  if (artifact.real_apply_performed !== false) findings.push('source_artifact_reports_real_apply');
  if (artifact.sql_artifact?.execution_performed !== false) findings.push('source_artifact_already_marked_executed');
  if (artifact.sql_artifact?.sha256 !== sqlHash) findings.push('sql_artifact_hash_mismatch');
  if (artifact.sql_artifact?.contains_commit_statement !== false) findings.push('source_artifact_allows_commit_statement');
  if (artifact.sql_artifact?.contains_rollback_statement !== true) findings.push('source_artifact_missing_rollback_statement');
  if (artifact.sql_artifact?.contains_delete_statement !== true) findings.push('source_artifact_missing_delete_simulation');
  if (artifact.sql_artifact?.contains_update_statement !== true) findings.push('source_artifact_missing_update_simulation');
  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('sql_contains_commit_statement');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('sql_missing_rollback_statement');
  for (const table of [
    'external_mappings',
    'card_print_species',
    'canon_warehouse_candidates',
    'justtcg_variant_price_snapshots',
    'justtcg_variant_prices_latest',
    'justtcg_variants',
  ]) {
    if (!new RegExp(`\\bupdate\\s+public\\.${table}\\b`, 'i').test(strippedSql)) {
      findings.push(`sql_missing_${table}_transfer`);
    }
  }
  if (!/\bdelete\s+from\s+public\.card_prints\b/i.test(strippedSql)) findings.push('sql_missing_parent_delete_simulation');
  return findings;
}

function evaluateRun({ artifact, execution }) {
  const findings = [];
  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    findings.push('dry_run_transaction_did_not_complete');
  }
  if (execution.before_snapshot?.impact_counts?.card_prints_found !== artifact.fresh_snapshot?.impact_counts?.card_prints_found) {
    findings.push('before_card_print_count_mismatch');
  }
  if (execution.after_snapshot?.impact_counts?.card_prints_found !== artifact.fresh_snapshot?.impact_counts?.card_prints_found) {
    findings.push('after_card_print_count_mismatch');
  }
  if (execution.before_snapshot?.impact_counts?.blocked_child_printings_found !== 0) {
    findings.push('before_blocked_child_printings_present');
  }
  if (execution.after_snapshot?.impact_counts?.blocked_child_printings_found !== 0) {
    findings.push('after_blocked_child_printings_present');
  }
  const artifactCounts = artifact.fresh_snapshot?.impact_counts ?? {};
  const beforeCounts = execution.before_snapshot?.impact_counts ?? {};
  const countPairs = [
    ['card_prints_found', 'card_prints_found'],
    ['blocked_child_printings_found', 'blocked_child_printings_found'],
    ['external_mappings', 'external_mappings_found'],
    ['card_print_species', 'card_print_species_found'],
    ['canon_warehouse_candidates', 'canon_warehouse_candidates_found'],
    ['justtcg_variants', 'justtcg_variants_found'],
    ['justtcg_variant_prices_latest', 'justtcg_latest_found'],
    ['justtcg_variant_price_snapshots', 'justtcg_snapshots_found'],
  ];
  for (const [artifactKey, beforeKey] of countPairs) {
    if (Number(artifactCounts[artifactKey] ?? -1) !== Number(beforeCounts[beforeKey] ?? -2)) {
      findings.push(`fresh_snapshot_${artifactKey}_count_drift_before_dry_run`);
    }
  }
  if (stableJson(execution.before_snapshot?.rows ?? []) !== stableJson(execution.after_snapshot?.rows ?? [])) {
    findings.push('durable_after_snapshot_differs_from_before_snapshot');
  }
  return findings;
}

function renderMarkdown(report) {
  return `# PKG-08D Duplicate Parent Dependency Transfer Guarded Dry-Run Execution V1

This report records rollback-only dry-run execution for \`${PACKAGE_ID}\`.

No real apply, migration, cleanup, quarantine, merge, or durable delete was performed.

## Status

| Field | Value |
| --- | --- |
| dry_run_execution_status | ${report.dry_run_execution_status} |
| package_fingerprint_sha256 | ${report.package_scope.package_fingerprint_sha256} |
| duplicate_parent_rows | ${report.package_scope.duplicate_parent_rows} |
| db_writes_performed | ${report.db_writes_performed} |
| durable_db_writes_performed | ${report.durable_db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| stop_findings | ${report.stop_findings.length} |

## Proof

| Metric | Value |
| --- | --- |
| Before snapshot hash | ${report.execution_result.before_snapshot?.hash_sha256 ?? ''} |
| After snapshot hash | ${report.execution_result.after_snapshot?.hash_sha256 ?? ''} |
| Durable after matches before | ${report.durable_after_snapshot_matches_before_snapshot} |
| Artifact fresh snapshot matches before | ${report.artifact_fresh_snapshot_matches_before_snapshot} |
| Execution error | ${mdEscape(report.execution_result.error_message ?? '')} |

## Stop Findings

${report.stop_findings.length === 0 ? 'None.' : report.stop_findings.map((finding) => `- ${mdEscape(finding)}`).join('\n')}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08D Duplicate Parent Dependency Transfer Guarded Dry-Run Execution Checkpoint V1](20260610_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_checkpoint_v1.md) | Records rollback-only dry-run execution for 39 duplicate parent dependency transfers, durable state unchanged. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
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
  ? await runDryRunSql(sql, artifact.target_rows ?? [])
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
  version: 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_v1',
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
    ? 'pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change'
    : 'pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_blocked_or_failed',
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    duplicate_parent_rows: artifact.package_scope.duplicate_parent_rows,
    survivor_parent_rows: artifact.package_scope.survivor_parent_rows,
    groups: artifact.package_scope.groups,
  },
  source_artifact: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
  sql_artifact: {
    path: artifact.sql_artifact.path,
    expected_sha256: artifact.sql_artifact.sha256,
    actual_sha256: sqlHash,
    execution_performed: execution.execution_status === 'guarded_dry_run_transaction_completed_and_rolled_back',
  },
  execution_result: execution,
  durable_after_snapshot_matches_before_snapshot: (
    execution.before_snapshot?.hash_sha256
    && execution.before_snapshot.hash_sha256 === execution.after_snapshot?.hash_sha256
  ) || false,
  artifact_fresh_snapshot_matches_before_snapshot: (
    artifact.fresh_snapshot?.impact_counts?.card_prints_found === execution.before_snapshot?.impact_counts?.card_prints_found
    && artifact.fresh_snapshot?.impact_counts?.blocked_child_printings_found === execution.before_snapshot?.impact_counts?.blocked_child_printings_found
    && artifact.fresh_snapshot?.impact_counts?.external_mappings === execution.before_snapshot?.impact_counts?.external_mappings_found
    && artifact.fresh_snapshot?.impact_counts?.card_print_species === execution.before_snapshot?.impact_counts?.card_print_species_found
    && artifact.fresh_snapshot?.impact_counts?.canon_warehouse_candidates === execution.before_snapshot?.impact_counts?.canon_warehouse_candidates_found
    && artifact.fresh_snapshot?.impact_counts?.justtcg_variants === execution.before_snapshot?.impact_counts?.justtcg_variants_found
    && artifact.fresh_snapshot?.impact_counts?.justtcg_variant_prices_latest === execution.before_snapshot?.impact_counts?.justtcg_latest_found
    && artifact.fresh_snapshot?.impact_counts?.justtcg_variant_price_snapshots === execution.before_snapshot?.impact_counts?.justtcg_snapshots_found
  ) || false,
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  dry_run_execution_status: report.dry_run_execution_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  duplicate_parent_rows: report.package_scope.duplicate_parent_rows,
  before_snapshot_hash: report.execution_result.before_snapshot?.hash_sha256 ?? null,
  after_snapshot_hash: report.execution_result.after_snapshot?.hash_sha256 ?? null,
  durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
  artifact_fresh_snapshot_matches_before_snapshot: report.artifact_fresh_snapshot_matches_before_snapshot,
  db_writes_performed: report.db_writes_performed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings,
  output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
}, null, 2));

if (!report.pass) process.exitCode = 1;
