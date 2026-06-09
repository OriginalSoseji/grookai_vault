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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_guarded_dry_run_execution_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01a_real_apply_v1.md');

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

function validatePrerequisites(artifact, dryRunProof) {
  const findings = [];
  const scope = artifact.package_scope ?? {};
  const tx = artifact.guarded_dry_run_transaction_artifact ?? {};
  const dryRunScope = dryRunProof.package_scope ?? {};

  if (artifact.artifact_status !== 'pkg01a_final_snapshot_and_dry_run_artifact_prepared_apply_blocked_no_write') {
    findings.push('source_artifact_not_ready');
  }
  if (artifact.pass !== true) findings.push('source_artifact_not_passing');
  if (scope.pilot_package_id !== 'PKG-01A') findings.push('source_artifact_not_pkg01a');
  if (scope.set_key !== 'fut2020') findings.push('source_artifact_not_fut2020');
  if (scope.remainder_status !== 'blocked_until_pkg01a_pilot_verified_no_write') {
    findings.push('pkg01b_not_blocked_in_source_artifact');
  }
  if ((tx.allowed_target_ids ?? []).length !== 1) findings.push('target_scope_not_one_row');
  if ((tx.allowed_field_changes ?? []).join(',') !== 'set_code') findings.push('allowed_field_scope_not_set_code_only');
  if (tx.pkg01b_included !== false) findings.push('pkg01b_included_in_source_artifact');
  if (tx.contains_commit_statement !== false) findings.push('source_dry_run_artifact_had_commit_statement');
  if (tx.contains_rollback_statement !== true) findings.push('source_dry_run_artifact_missing_rollback_statement');

  if (dryRunProof.dry_run_execution_status !== 'pkg01a_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_proof_not_passing');
  }
  if (dryRunProof.pass !== true) findings.push('dry_run_report_not_passing');
  if (dryRunProof.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_durable_state_not_proven_unchanged');
  }
  if (dryRunProof.stop_findings?.length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRunScope.pilot_package_id !== 'PKG-01A') findings.push('dry_run_scope_not_pkg01a');
  if (dryRunScope.set_key !== 'fut2020') findings.push('dry_run_scope_not_fut2020');
  if (dryRunScope.pkg01b_included !== false) findings.push('pkg01b_included_in_dry_run');

  return findings;
}

function validateBeforeSnapshot(beforeSnapshot, artifact) {
  const findings = [];
  const row = beforeSnapshot.rows[0];
  const expected = artifact.mutation_matrix?.[0] ?? {};

  if (beforeSnapshot.counts.card_prints_found !== 1) findings.push('before_card_print_count_not_one');
  if (beforeSnapshot.counts.card_printings_found !== 1) findings.push('before_child_printing_count_not_one');
  if (beforeSnapshot.counts.vault_items_found !== 0) findings.push('before_vault_reference_blocker');
  if (!row) return [...findings, 'before_target_row_missing'];
  if (row.card_print_id !== expected.card_print_id) findings.push('before_target_id_mismatch');
  if (row.set_code !== null) findings.push('before_set_code_not_null');
  if (row.number !== '1') findings.push('before_number_not_1');
  if (row.number_plain !== '1') findings.push('before_number_plain_not_1');
  if (row.name !== 'Pikachu on the Ball') findings.push('before_name_mismatch');
  const finishes = (row.card_printings ?? []).map((printing) => printing.finish_key).sort().join(',');
  if (finishes !== 'holo') findings.push('before_finish_scope_not_holo');
  return findings;
}

function validateAfterSnapshot(afterSnapshot, expectedId) {
  const findings = [];
  const row = afterSnapshot.rows[0];

  if (afterSnapshot.counts.card_prints_found !== 1) findings.push('after_card_print_count_not_one');
  if (afterSnapshot.counts.card_printings_found !== 1) findings.push('after_child_printing_count_not_one');
  if (afterSnapshot.counts.vault_items_found !== 0) findings.push('after_vault_reference_blocker');
  if (!row) return [...findings, 'after_target_row_missing'];
  if (row.card_print_id !== expectedId) findings.push('after_target_id_mismatch');
  if (row.set_code !== 'fut2020') findings.push('after_set_code_not_fut2020');
  if (row.number !== '1') findings.push('after_number_not_1');
  if (row.number_plain !== '1') findings.push('after_number_plain_not_1');
  if (row.name !== 'Pikachu on the Ball') findings.push('after_name_mismatch');
  const finishes = (row.card_printings ?? []).map((printing) => printing.finish_key).sort().join(',');
  if (finishes !== 'holo') findings.push('after_finish_scope_not_holo');
  return findings;
}

async function applyPkg01a(artifact) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
      updated_rows: 0,
      committed: false,
    };
  }

  const target = artifact.mutation_matrix[0];
  const targetId = target.card_print_id;
  const client = new Client({ connectionString: conn });
  await client.connect();

  let beforeSnapshot = null;
  try {
    beforeSnapshot = await captureSnapshot(client, targetId);
    const beforeFindings = validateBeforeSnapshot(beforeSnapshot, artifact);
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_snapshot: beforeSnapshot,
        after_snapshot: beforeSnapshot,
        updated_rows: 0,
        committed: false,
      };
    }

    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '30s'");

    const lockedResult = await client.query(
      `select cp.id, cp.set_code, cp.number, cp.number_plain, cp.name
       from public.card_prints cp
       where cp.id = $1::uuid
       for update`,
      [targetId],
    );
    if (lockedResult.rowCount !== 1) {
      throw new Error(`locked row count mismatch: ${lockedResult.rowCount}`);
    }
    const locked = lockedResult.rows[0];
    if (
      locked.set_code !== null ||
      locked.number !== '1' ||
      locked.number_plain !== '1' ||
      locked.name !== 'Pikachu on the Ball'
    ) {
      throw new Error('locked row drifted before apply');
    }

    const dependencyResult = await client.query(
      `select
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $1::uuid) as child_printings,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $1::uuid and cpr.finish_key = 'holo') as holo_printings,
         (select count(*)::int from public.vault_items vi where vi.card_id = $1::uuid) as vault_items`,
      [targetId],
    );
    const dependency = dependencyResult.rows[0];
    if (dependency.child_printings !== 1 || dependency.holo_printings !== 1 || dependency.vault_items !== 0) {
      throw new Error(`dependency guard failed: ${JSON.stringify(dependency)}`);
    }

    const updateResult = await client.query(
      `update public.card_prints
       set set_code = $2
       where id = $1::uuid
         and set_code is null
         and number = '1'
         and number_plain = '1'
         and name = 'Pikachu on the Ball'`,
      [targetId, 'fut2020'],
    );
    if (updateResult.rowCount !== 1) {
      throw new Error(`update row count mismatch: ${updateResult.rowCount}`);
    }

    const finalResult = await client.query(
      `select count(*)::int as resolved_rows
       from public.card_prints
       where id = $1::uuid
         and set_code = 'fut2020'
         and number = '1'
         and number_plain = '1'
         and name = 'Pikachu on the Ball'`,
      [targetId],
    );
    if (finalResult.rows[0].resolved_rows !== 1) {
      throw new Error(`final state verification failed: ${finalResult.rows[0].resolved_rows}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targetId);
    return {
      connected: true,
      apply_status: 'pkg01a_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_rows: updateResult.rowCount,
      committed: true,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = beforeSnapshot ? await captureSnapshot(client, artifact.mutation_matrix[0].card_print_id) : null;
    return {
      connected: true,
      apply_status: 'pkg01a_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      updated_rows: 0,
      committed: false,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  const before = report.before_snapshot?.rows?.[0] ?? {};
  const after = report.after_snapshot?.rows?.[0] ?? {};
  const lines = [];
  lines.push('# English Master Index PKG-01A Real Apply V1');
  lines.push('');
  lines.push('This report records the real one-row `PKG-01A / fut2020` apply authorized by the operator.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| apply_status | ${report.apply_status} |`);
  lines.push(`| apply_approved_by_user | ${report.approval_scope.apply_approved_by_user} |`);
  lines.push(`| pilot_package_id | ${report.package_scope.pilot_package_id} |`);
  lines.push(`| set_key | ${report.package_scope.set_key} |`);
  lines.push(`| updated_rows | ${report.updated_rows} |`);
  lines.push(`| db_write_committed | ${report.db_write_committed} |`);
  lines.push(`| durable_db_writes_performed | ${report.durable_db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| PKG-01B included | ${report.package_scope.pkg01b_included} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Before And After');
  lines.push('');
  lines.push('| Snapshot | Hash | set_code | number | name | child_printings | vault_items |');
  lines.push('| --- | --- | --- | --- | --- | ---: | ---: |');
  lines.push(`| before | \`${report.before_snapshot?.hash_sha256 ?? 'not_available'}\` | ${mdEscape(before.set_code ?? '')} | ${mdEscape(before.number)} | ${mdEscape(before.name)} | ${report.before_snapshot?.counts?.card_printings_found ?? null} | ${report.before_snapshot?.counts?.vault_items_found ?? null} |`);
  lines.push(`| after | \`${report.after_snapshot?.hash_sha256 ?? 'not_available'}\` | ${mdEscape(after.set_code ?? '')} | ${mdEscape(after.number)} | ${mdEscape(after.name)} | ${report.after_snapshot?.counts?.card_printings_found ?? null} | ${report.after_snapshot?.counts?.vault_items_found ?? null} |`);
  lines.push('');
  lines.push('## Rollback Proof');
  lines.push('');
  lines.push('```sql');
  lines.push(report.rollback_proof.rollback_sql_preview);
  lines.push('```');
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
const dryRunProof = readJson(DRY_RUN_JSON);
const prerequisiteFindings = validatePrerequisites(artifact, dryRunProof);
const applyResult = prerequisiteFindings.length === 0
  ? await applyPkg01a(artifact)
  : {
      connected: false,
      apply_status: 'blocked_prerequisite_findings_present',
      error_message: prerequisiteFindings.join(', '),
      before_snapshot: null,
      after_snapshot: null,
      updated_rows: 0,
      committed: false,
    };

const afterFindings = applyResult.after_snapshot
  ? validateAfterSnapshot(applyResult.after_snapshot, artifact.mutation_matrix[0].card_print_id)
  : ['after_snapshot_unavailable'];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.apply_status === 'pkg01a_real_apply_committed' ? [] : ['apply_not_committed']),
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg01a_real_apply_v1',
  audit_only: false,
  apply_only: true,
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: 'Approve real one-row PKG-01A apply only.',
    approved_for_package_id: 'PKG-01A',
    approved_for_set_key: 'fut2020',
    approved_for_card_print_id: artifact.mutation_matrix[0].card_print_id,
    approved_for_field_changes: ['set_code'],
    approved_for_pkg01b: false,
    approved_for_migrations: false,
    approved_for_cleanup: false,
    approved_for_quarantine: false,
  },
  apply_status: pass ? 'pkg01a_real_apply_committed_and_verified' : 'pkg01a_real_apply_failed_or_blocked',
  db_reads_performed: true,
  durable_db_writes_performed: applyResult.committed,
  db_write_committed: applyResult.committed,
  updated_rows: applyResult.updated_rows,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: applyResult.committed,
  package_scope: {
    pilot_package_id: 'PKG-01A',
    set_key: 'fut2020',
    card_print_rows: 1,
    child_printing_rows_verified: 1,
    allowed_changed_fields: ['set_code'],
    pkg01b_included: false,
  },
  source_artifacts: {
    dry_run_proof: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    transaction_artifact_preparation: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
  },
  execution_result: {
    connected: applyResult.connected,
    apply_status: applyResult.apply_status,
    error_message: applyResult.error_message,
    committed: applyResult.committed,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  rollback_proof: artifact.rollback_proof,
  verification_summary: {
    before_hash_sha256: applyResult.before_snapshot?.hash_sha256 ?? null,
    after_hash_sha256: applyResult.after_snapshot?.hash_sha256 ?? null,
    parent_set_code_resolved: applyResult.after_snapshot?.rows?.[0]?.set_code === 'fut2020',
    child_printing_count_unchanged: applyResult.after_snapshot?.counts?.card_printings_found === 1,
    finish_scope_unchanged: (applyResult.after_snapshot?.rows?.[0]?.card_printings ?? []).map((row) => row.finish_key).sort().join(',') === 'holo',
    vault_items_still_zero: applyResult.after_snapshot?.counts?.vault_items_found === 0,
    master_index_comparison_status: pass ? 'pkg01a_parent_set_code_resolved_and_child_finish_unchanged' : 'not_verified',
  },
  explicit_non_authorizations: [
    'PKG-01B remains blocked.',
    'No migrations were authorized or created.',
    'No cleanup, quarantine, insertion, deletion, hiding, or normalization was authorized.',
    'No child printing rows were changed.',
    'No vault, ownership, provenance, pricing, scanner, or marketplace rows were changed.',
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
  apply_status: report.apply_status,
  updated_rows: report.updated_rows,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  before_set_code: report.before_snapshot?.rows?.[0]?.set_code ?? null,
  after_set_code: report.after_snapshot?.rows?.[0]?.set_code ?? null,
  child_printing_count_unchanged: report.verification_summary.child_printing_count_unchanged,
  finish_scope_unchanged: report.verification_summary.finish_scope_unchanged,
  vault_items_still_zero: report.verification_summary.vault_items_still_zero,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  pkg01b_included: report.package_scope.pkg01b_included,
  stop_findings: report.stop_findings.length,
}, null, 2));
