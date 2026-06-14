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
const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_real_apply_gate_v1.json');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_execution_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08d_duplicate_parent_dependency_transfer_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER';
const PACKAGE_FINGERPRINT = 'b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8';
const SQL_HASH = '1cef89020ae8aaf4323843cb2895d7ede0b04712ab8818708170810635ddc936';
const DRY_RUN_HASH = '71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2';
const APPROVAL_TEXT = 'Approve real PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER apply only. Fingerprint: b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8. SQL hash: 1cef89020ae8aaf4323843cb2895d7ede0b04712ab8818708170810635ddc936. Scope: 38 groups, 39 duplicate parent dependency transfers. Dry-run proof: 71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2 == 71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2. No global apply. No migrations.';

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

function buildApplySql(dryRunSql) {
  const stripped = dryRunSql.replace(/--.*$/gm, '');
  const rollbackMatches = stripped.match(/(^|\n)\s*rollback\s*;/gi) ?? [];
  const commitMatches = stripped.match(/(^|\n)\s*commit\s*;/gi) ?? [];
  if (rollbackMatches.length !== 1) throw new Error(`expected exactly one rollback statement, got ${rollbackMatches.length}`);
  if (commitMatches.length !== 0) throw new Error('dry-run SQL unexpectedly contains commit statement');
  const applySql = dryRunSql.replace(/rollback;\s*$/i, 'commit;\n');
  if (applySql === dryRunSql) throw new Error('failed to convert final rollback to commit');
  return applySql;
}

async function captureSnapshot(client, targetRows) {
  const parentIds = [...new Set([
    ...targetRows.map((row) => row.blocked_card_print_id),
    ...targetRows.map((row) => row.survivor_card_print_id),
  ])];
  const blockedIds = [...new Set(targetRows.map((row) => row.blocked_card_print_id))];
  const survivorIds = [...new Set(targetRows.map((row) => row.survivor_card_print_id))];
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
  const refResult = await client.query(
    `select
       (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as blocked_child_printings,
       (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as blocked_external_mappings,
       (select count(*)::int from public.card_print_species where card_print_id = any($1::uuid[])) as blocked_species,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_print_id = any($1::uuid[])) as blocked_warehouse_candidates,
       (select count(*)::int from public.justtcg_variants where card_print_id = any($1::uuid[])) as blocked_justtcg_variants,
       (select count(*)::int from public.justtcg_variant_prices_latest where card_print_id = any($1::uuid[])) as blocked_justtcg_latest,
       (select count(*)::int from public.justtcg_variant_price_snapshots where card_print_id = any($1::uuid[])) as blocked_justtcg_snapshots,
       (select count(*)::int from public.card_prints where id = any($1::uuid[])) as blocked_parents_present,
       (select count(*)::int from public.card_prints where id = any($2::uuid[])) as survivor_parents_present`,
    [blockedIds, survivorIds],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    impact_counts: {
      card_prints_found: rows.length,
      external_mappings_found: rows.reduce((sum, row) => sum + row.external_mappings.length, 0),
      card_print_species_found: rows.reduce((sum, row) => sum + row.card_print_species.length, 0),
      canon_warehouse_candidates_found: rows.reduce((sum, row) => sum + row.canon_warehouse_candidates.length, 0),
      justtcg_variants_found: rows.reduce((sum, row) => sum + Number(row.justtcg_variant_count), 0),
      justtcg_latest_found: rows.reduce((sum, row) => sum + Number(row.justtcg_latest_count), 0),
      justtcg_snapshots_found: rows.reduce((sum, row) => sum + Number(row.justtcg_snapshot_count), 0),
      ...refResult.rows[0],
    },
  };
}

function validatePrerequisites({ gate, artifact, dryRun, dryRunSql, sqlHash }) {
  const findings = [];
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') {
    findings.push('real_apply_gate_not_ready');
  }
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) {
    findings.push('approval_text_mismatch');
  }
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('gate_fingerprint_mismatch');
  if (gate.dry_run_proof?.sql_artifact_hash_sha256 !== SQL_HASH) findings.push('gate_sql_hash_mismatch');
  if (gate.dry_run_proof?.before_hash_sha256 !== DRY_RUN_HASH || gate.dry_run_proof?.after_hash_sha256 !== DRY_RUN_HASH) {
    findings.push('gate_dry_run_hash_mismatch');
  }
  if ((gate.stop_findings ?? []).length !== 0) findings.push('gate_stop_findings_present');

  if (artifact.package_id !== PACKAGE_ID) findings.push('artifact_wrong_package');
  if (artifact.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('artifact_fingerprint_mismatch');
  if (artifact.package_scope?.duplicate_parent_rows !== 39) findings.push('artifact_parent_count_not_39');
  if (artifact.package_scope?.groups !== 38) findings.push('artifact_group_count_not_38');
  if (artifact.sql_artifact?.sha256 !== SQL_HASH || sqlHash !== SQL_HASH) findings.push('artifact_sql_hash_mismatch');
  if (artifact.sql_artifact?.contains_rollback_statement !== true) findings.push('artifact_missing_rollback');
  if (artifact.sql_artifact?.contains_commit_statement !== false) findings.push('artifact_contains_commit');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('artifact_stop_findings_present');

  if (dryRun.dry_run_execution_status !== 'pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_report_not_passing');
  if (dryRun.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.sql_artifact?.actual_sha256 !== SQL_HASH) findings.push('dry_run_sql_hash_mismatch');
  if (dryRun.execution_result?.before_snapshot?.hash_sha256 !== DRY_RUN_HASH || dryRun.execution_result?.after_snapshot?.hash_sha256 !== DRY_RUN_HASH) {
    findings.push('dry_run_proof_hash_mismatch');
  }
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');

  const strippedSql = dryRunSql.replace(/--.*$/gm, '');
  if (/(^|\n)\s*commit\s*;/i.test(strippedSql)) findings.push('dry_run_sql_contains_commit');
  if (!/(^|\n)\s*rollback\s*;/i.test(strippedSql)) findings.push('dry_run_sql_missing_rollback');
  return findings;
}

function validateFreshBefore(beforeSnapshot) {
  const findings = [];
  if (beforeSnapshot.impact_counts.card_prints_found !== 77) findings.push('before_card_print_count_not_77');
  if (beforeSnapshot.impact_counts.blocked_parents_present !== 39) findings.push('before_blocked_parent_count_not_39');
  if (beforeSnapshot.impact_counts.survivor_parents_present !== 38) findings.push('before_survivor_parent_count_not_38');
  if (beforeSnapshot.impact_counts.blocked_child_printings !== 0) findings.push('before_blocked_child_printings_present');
  return findings;
}

function validateAfter(afterSnapshot) {
  const findings = [];
  if (afterSnapshot.impact_counts.card_prints_found !== 38) findings.push('after_survivor_parent_count_not_38');
  if (afterSnapshot.impact_counts.blocked_parents_present !== 0) findings.push('after_blocked_parents_remain');
  if (afterSnapshot.impact_counts.survivor_parents_present !== 38) findings.push('after_survivor_parent_count_not_38');
  if (afterSnapshot.impact_counts.blocked_child_printings !== 0) findings.push('after_blocked_child_printings_present');
  if (afterSnapshot.impact_counts.blocked_external_mappings !== 0) findings.push('after_blocked_external_mappings_remain');
  if (afterSnapshot.impact_counts.blocked_species !== 0) findings.push('after_blocked_species_remain');
  if (afterSnapshot.impact_counts.blocked_warehouse_candidates !== 0) findings.push('after_blocked_warehouse_candidates_remain');
  if (afterSnapshot.impact_counts.blocked_justtcg_variants !== 0) findings.push('after_blocked_justtcg_variants_remain');
  if (afterSnapshot.impact_counts.blocked_justtcg_latest !== 0) findings.push('after_blocked_justtcg_latest_remain');
  if (afterSnapshot.impact_counts.blocked_justtcg_snapshots !== 0) findings.push('after_blocked_justtcg_snapshots_remain');
  return findings;
}

async function applyPackage({ applySql, targetRows }) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
      committed: false,
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeSnapshot = null;
  try {
    beforeSnapshot = await captureSnapshot(client, targetRows);
    const beforeFindings = validateFreshBefore(beforeSnapshot);
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_snapshot: beforeSnapshot,
        after_snapshot: beforeSnapshot,
        committed: false,
      };
    }
    await client.query(applySql);
    const afterSnapshot = await captureSnapshot(client, targetRows);
    return {
      connected: true,
      apply_status: 'pkg08d_duplicate_parent_dependency_transfer_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: true,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = beforeSnapshot ? await captureSnapshot(client, targetRows) : null;
    return {
      connected: true,
      apply_status: 'pkg08d_duplicate_parent_dependency_transfer_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: false,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  return `# PKG-08D Duplicate Parent Dependency Transfer Real Apply V1

This report records the approved real apply for \`${PACKAGE_ID}\`.

## Status

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| duplicate_parent_rows | ${report.package_scope.duplicate_parent_rows} |
| survivor_parent_rows | ${report.package_scope.survivor_parent_rows} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| stop_findings | ${report.stop_findings.length} |

## Verification

| Field | Value |
| --- | --- |
| before_snapshot_hash | \`${report.before_snapshot?.hash_sha256 ?? ''}\` |
| after_snapshot_hash | \`${report.after_snapshot?.hash_sha256 ?? ''}\` |
| blocked_parents_removed | ${report.verification_summary.blocked_parents_removed} |
| survivor_parents_preserved | ${report.verification_summary.survivor_parents_preserved} |
| blocked_dependencies_removed | ${report.verification_summary.blocked_dependencies_removed} |

## Stop Findings

${report.stop_findings.length === 0 ? '- none' : report.stop_findings.map((finding) => `- ${mdEscape(finding)}`).join('\n')}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08D Duplicate Parent Dependency Transfer Real Apply Checkpoint V1](20260610_pkg08d_duplicate_parent_dependency_transfer_real_apply_checkpoint_v1.md) | Records approved real apply for 39 duplicate parent dependency transfers; no migrations and no global apply. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08d_duplicate_parent_dependency_transfer_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08d_duplicate_parent_dependency_transfer_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const artifact = readJson(ARTIFACT_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const sqlPath = path.join(ROOT, artifact.sql_artifact.path);
const dryRunSql = fs.readFileSync(sqlPath, 'utf8');
const sqlHash = sha256(dryRunSql);
const prerequisiteFindings = validatePrerequisites({ gate, artifact, dryRun, dryRunSql, sqlHash });
let applySql = null;
try {
  applySql = buildApplySql(dryRunSql);
} catch (error) {
  prerequisiteFindings.push(`apply_sql_build_failed: ${error.message}`);
}

const applyResult = prerequisiteFindings.length === 0
  ? await applyPackage({ applySql, targetRows: artifact.target_rows ?? [] })
  : {
    connected: false,
    apply_status: 'blocked_prerequisite_findings_present',
    error_message: prerequisiteFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
    committed: false,
  };

const afterFindings = applyResult.after_snapshot ? validateAfter(applyResult.after_snapshot) : ['after_snapshot_unavailable'];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.apply_status === 'pkg08d_duplicate_parent_dependency_transfer_real_apply_committed' ? [] : ['apply_not_committed']),
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_real_apply_v1',
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_sql_hash_sha256: SQL_HASH,
    approved_for_duplicate_parent_rows: 39,
    approved_for_groups: 38,
    approved_for_global_apply: false,
    approved_for_migrations: false,
  },
  apply_status: pass
    ? 'pkg08d_duplicate_parent_dependency_transfer_real_apply_committed_and_verified'
    : 'pkg08d_duplicate_parent_dependency_transfer_real_apply_failed_or_blocked',
  db_reads_performed: true,
  durable_db_writes_performed: applyResult.committed,
  db_write_committed: applyResult.committed,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  global_apply_included: false,
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    sql_hash_sha256: SQL_HASH,
    duplicate_parent_rows: 39,
    survivor_parent_rows: 38,
    groups: 38,
  },
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    dry_run_proof: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    dry_run_artifact: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
  },
  execution_result: {
    connected: applyResult.connected,
    apply_status: applyResult.apply_status,
    error_message: applyResult.error_message,
    committed: applyResult.committed,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  verification_summary: {
    blocked_parents_removed: applyResult.after_snapshot?.impact_counts?.blocked_parents_present === 0,
    survivor_parents_preserved: applyResult.after_snapshot?.impact_counts?.survivor_parents_present === 38,
    blocked_dependencies_removed: [
      'blocked_external_mappings',
      'blocked_species',
      'blocked_warehouse_candidates',
      'blocked_justtcg_variants',
      'blocked_justtcg_latest',
      'blocked_justtcg_snapshots',
    ].every((key) => Number(applyResult.after_snapshot?.impact_counts?.[key] ?? -1) === 0),
    master_index_comparison_status: pass ? 'pkg08d_duplicate_parent_dependency_transfer_committed_verified' : 'not_verified',
  },
  explicit_non_authorizations: [
    'No global apply was authorized or performed.',
    'No migrations were authorized or created.',
    'No cleanup or quarantine was authorized.',
  ],
  stop_findings: stopFindings,
  pass,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  apply_status: report.apply_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  sql_hash_sha256: report.package_scope.sql_hash_sha256,
  duplicate_parent_rows: report.package_scope.duplicate_parent_rows,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  before_snapshot_hash: report.before_snapshot?.hash_sha256 ?? null,
  after_snapshot_hash: report.after_snapshot?.hash_sha256 ?? null,
  blocked_parents_removed: report.verification_summary.blocked_parents_removed,
  survivor_parents_preserved: report.verification_summary.survivor_parents_preserved,
  blocked_dependencies_removed: report.verification_summary.blocked_dependencies_removed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  global_apply_included: report.global_apply_included,
  stop_findings: report.stop_findings,
  output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
}, null, 2));

if (!report.pass) process.exitCode = 1;
