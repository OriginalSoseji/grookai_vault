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

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_gate_v1.json');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_transaction_artifact_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_guarded_dry_run_execution_v1.json');
const COLLISION_AUDIT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02b_full_beta_collision_audit_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02c_full_beta_noncolliding_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-02C-FULL-BETA-NONCOLLIDING';
const PACKAGE_FINGERPRINT = '53ede43043c67f519a9d786cc91145647efb093d2c4af1cfaf924e81ac2b430d';
const APPROVAL_TEXT = 'Approve real PKG-02C-FULL-BETA-NONCOLLIDING apply only. Fingerprint: 53ede43043c67f519a9d786cc91145647efb093d2c4af1cfaf924e81ac2b430d. Scope: 343 non-colliding card_print updates, 542 child printings preserved, 4 vault references accepted, 79 collision rows excluded. Dry-run proof: 744955f913d2d7f31c00b883ee3fbf9ba948f0dc93e5f2aa0c308326f91ccf51 == 744955f913d2d7f31c00b883ee3fbf9ba948f0dc93e5f2aa0c308326f91ccf51. No global apply. No migrations.';

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

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
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

function validatePrerequisites({ gate, artifact, dryRun, collisionAudit }) {
  const findings = [];
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') {
    findings.push('real_apply_gate_not_ready');
  }
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) {
    findings.push('real_apply_gate_approval_text_mismatch');
  }
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('real_apply_gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('real_apply_gate_fingerprint_mismatch');
  }
  if (gate.apply_allowed !== false) findings.push('real_apply_gate_unexpected_apply_allowed');
  if (gate.write_ready_now !== 0) findings.push('real_apply_gate_write_ready_nonzero');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('real_apply_gate_stop_findings_present');

  if (artifact.artifact_status !== 'pkg02c_full_beta_noncolliding_transaction_artifact_prepared_apply_blocked_no_write') {
    findings.push('source_artifact_not_ready');
  }
  if (artifact.pass !== true) findings.push('source_artifact_not_passing');
  if (artifact.package_scope?.package_id !== PACKAGE_ID) findings.push('source_artifact_wrong_package');
  if (artifact.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('source_artifact_fingerprint_mismatch');
  }
  if (artifact.package_scope?.card_print_rows !== 343) findings.push('source_artifact_card_print_count_not_343');
  if (artifact.package_scope?.child_printing_rows !== 542) findings.push('source_artifact_child_count_not_542');
  if (artifact.package_scope?.vault_references_accepted !== 4) findings.push('source_artifact_vault_count_not_4');
  if (artifact.package_scope?.collision_rows_excluded !== 79) findings.push('source_artifact_collision_exclusion_count_not_79');
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('source_artifact_stop_findings_present');

  if (dryRun.dry_run_execution_status !== 'pkg02c_full_beta_noncolliding_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_not_passing');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_durable_state_not_proven_unchanged');
  }
  if (dryRun.artifact_fresh_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_artifact_snapshot_drift');
  }
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.package_scope?.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('dry_run_fingerprint_mismatch');
  }
  if (dryRun.sql_artifact?.contains_commit_statement !== false) findings.push('dry_run_sql_had_commit_statement');
  if (dryRun.sql_artifact?.contains_rollback_statement !== true) findings.push('dry_run_sql_missing_rollback_statement');
  if (dryRun.sql_artifact?.contains_delete_statement !== false) findings.push('dry_run_sql_had_delete_statement');

  if (collisionAudit.audit_status !== 'pkg02b_full_beta_collision_audit_complete_split_required') {
    findings.push('collision_audit_not_complete');
  }
  if (collisionAudit.summary?.non_colliding_rows !== 343) findings.push('collision_audit_noncolliding_count_not_343');
  if (collisionAudit.summary?.blocked_collision_rows !== 79) findings.push('collision_audit_blocked_count_not_79');

  return findings;
}

function targetRowsFromArtifact(artifact) {
  return (artifact.mutation_matrix ?? []).map((row) => ({
    card_print_id: row.card_print_id,
    current_set_code: row.current_parent_fields?.set_code ?? null,
    current_number: row.current_parent_fields?.number ?? null,
    current_number_plain: row.current_parent_fields?.number_plain ?? null,
    current_name: row.current_parent_fields?.name ?? null,
    target_set_code: row.target_parent_fields?.set_code ?? null,
    target_number: row.target_parent_fields?.number ?? null,
    target_number_plain_expected: row.target_parent_fields?.number_plain_expected ?? null,
    target_name: row.target_parent_fields?.name ?? null,
  }));
}

function validateBeforeSnapshot({ beforeSnapshot, dryRun }) {
  const findings = [];
  if (beforeSnapshot.hash_sha256 !== dryRun.execution_result?.before_snapshot?.hash_sha256) {
    findings.push('before_snapshot_hash_does_not_match_dry_run_proof');
  }
  if (beforeSnapshot.impact_counts.card_prints_found !== 343) findings.push('before_card_print_count_not_343');
  if (beforeSnapshot.impact_counts.card_printings_found !== 542) findings.push('before_child_count_not_542');
  if (beforeSnapshot.impact_counts.vault_items_found !== 4) findings.push('before_vault_count_not_4');
  return findings;
}

function validateAfterSnapshot({ afterSnapshot, targetRows }) {
  const findings = [];
  if (afterSnapshot.impact_counts.card_prints_found !== 343) findings.push('after_card_print_count_not_343');
  if (afterSnapshot.impact_counts.card_printings_found !== 542) findings.push('after_child_count_not_542');
  if (afterSnapshot.impact_counts.vault_items_found !== 4) findings.push('after_vault_count_not_4');

  const targetById = new Map(targetRows.map((row) => [row.card_print_id, row]));
  for (const snapshotRow of afterSnapshot.rows) {
    const target = targetById.get(snapshotRow.card_print_id);
    if (!target) {
      findings.push(`after_unknown_target_${snapshotRow.card_print_id}`);
      continue;
    }
    const card = snapshotRow.card_print ?? {};
    if (card.set_code !== target.target_set_code) findings.push(`after_set_code_mismatch_${snapshotRow.card_print_id}`);
    if (card.number !== target.target_number) findings.push(`after_number_mismatch_${snapshotRow.card_print_id}`);
    if (card.number_plain !== target.target_number_plain_expected) {
      findings.push(`after_number_plain_mismatch_${snapshotRow.card_print_id}`);
    }
    if (card.name !== target.target_name) findings.push(`after_name_mismatch_${snapshotRow.card_print_id}`);
  }
  return findings;
}

async function applyPkg02c({ artifact, dryRun, collisionAudit }) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
      collision_before_snapshot: null,
      collision_after_snapshot: null,
      updated_rows: 0,
      committed: false,
    };
  }

  const targetRows = targetRowsFromArtifact(artifact);
  const targetIds = targetRows.map((row) => row.card_print_id);
  const collisionIds = (collisionAudit.blocked_rows ?? []).map((row) => row.card_print_id);

  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeSnapshot = null;
  let collisionBeforeSnapshot = null;
  try {
    beforeSnapshot = await captureSnapshot(client, targetIds);
    collisionBeforeSnapshot = await captureSnapshot(client, collisionIds);
    const beforeFindings = validateBeforeSnapshot({ beforeSnapshot, dryRun });
    if (collisionBeforeSnapshot.impact_counts.card_prints_found !== 79) {
      beforeFindings.push('collision_before_card_print_count_not_79');
    }
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_snapshot: beforeSnapshot,
        after_snapshot: beforeSnapshot,
        collision_before_snapshot: collisionBeforeSnapshot,
        collision_after_snapshot: collisionBeforeSnapshot,
        updated_rows: 0,
        committed: false,
      };
    }

    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    await client.query(
      `create temporary table pkg02c_real_apply_targets (
         card_print_id uuid primary key,
         current_set_code text,
         current_number text,
         current_number_plain text,
         current_name text,
         target_set_code text not null,
         target_number text not null,
         target_number_plain_expected text not null,
         target_name text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg02c_real_apply_targets (
         card_print_id,
         current_set_code,
         current_number,
         current_number_plain,
         current_name,
         target_set_code,
         target_number,
         target_number_plain_expected,
         target_name
       )
       select
         row.card_print_id::uuid,
         row.current_set_code,
         row.current_number,
         row.current_number_plain,
         row.current_name,
         row.target_set_code,
         row.target_number,
         row.target_number_plain_expected,
         row.target_name
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         current_set_code text,
         current_number text,
         current_number_plain text,
         current_name text,
         target_set_code text,
         target_number text,
         target_number_plain_expected text,
         target_name text
       )`,
      [JSON.stringify(targetRows)],
    );

    const countGuard = await client.query(`select count(*)::int as rows from pkg02c_real_apply_targets`);
    if (countGuard.rows[0].rows !== 343) throw new Error(`target temp row count mismatch: ${countGuard.rows[0].rows}`);

    const lockResult = await client.query(
      `select cp.id
       from public.card_prints cp
       join pkg02c_real_apply_targets target on target.card_print_id = cp.id
       for update of cp`,
    );
    if (lockResult.rowCount !== 343) throw new Error(`locked parent row count mismatch: ${lockResult.rowCount}`);

    const driftResult = await client.query(
      `select count(*)::int as drifted_rows
       from public.card_prints cp
       join pkg02c_real_apply_targets target on target.card_print_id = cp.id
       where cp.set_code is distinct from target.current_set_code
          or cp.number is distinct from target.current_number
          or cp.number_plain is distinct from target.current_number_plain
          or cp.name is distinct from target.current_name`,
    );
    if (driftResult.rows[0].drifted_rows !== 0) {
      throw new Error(`current parent field drift before apply: ${driftResult.rows[0].drifted_rows}`);
    }

    const childGuardBefore = await client.query(
      `select count(*)::int as child_rows
       from public.card_printings cpr
       where cpr.card_print_id in (select card_print_id from pkg02c_real_apply_targets)`,
    );
    if (childGuardBefore.rows[0].child_rows !== 542) {
      throw new Error(`child guard before update failed: ${childGuardBefore.rows[0].child_rows}`);
    }

    const vaultGuardBefore = await client.query(
      `select count(*)::int as vault_refs
       from public.vault_items vi
       where vi.card_id in (select card_print_id from pkg02c_real_apply_targets)`,
    );
    if (vaultGuardBefore.rows[0].vault_refs !== 4) {
      throw new Error(`vault guard before update failed: ${vaultGuardBefore.rows[0].vault_refs}`);
    }

    const updateResult = await client.query(
      `update public.card_prints cp
       set
         set_code = target.target_set_code,
         number = target.target_number,
         name = target.target_name
       from pkg02c_real_apply_targets target
       where cp.id = target.card_print_id`,
    );
    if (updateResult.rowCount !== 343) throw new Error(`parent update count mismatch: ${updateResult.rowCount}`);

    const finalParentGuard = await client.query(
      `select count(*)::int as bad_rows
       from public.card_prints cp
       join pkg02c_real_apply_targets target on target.card_print_id = cp.id
       where cp.set_code is distinct from target.target_set_code
          or cp.number is distinct from target.target_number
          or cp.number_plain is distinct from target.target_number_plain_expected
          or cp.name is distinct from target.target_name`,
    );
    if (finalParentGuard.rows[0].bad_rows !== 0) {
      throw new Error(`final parent field guard failed: ${finalParentGuard.rows[0].bad_rows}`);
    }

    const finalChildGuard = await client.query(
      `select count(*)::int as child_rows
       from public.card_printings cpr
       where cpr.card_print_id in (select card_print_id from pkg02c_real_apply_targets)`,
    );
    if (finalChildGuard.rows[0].child_rows !== 542) {
      throw new Error(`final child guard failed: ${finalChildGuard.rows[0].child_rows}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targetIds);
    const collisionAfterSnapshot = await captureSnapshot(client, collisionIds);
    return {
      connected: true,
      apply_status: 'pkg02c_full_beta_noncolliding_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      collision_before_snapshot: collisionBeforeSnapshot,
      collision_after_snapshot: collisionAfterSnapshot,
      updated_rows: updateResult.rowCount,
      committed: true,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = beforeSnapshot ? await captureSnapshot(client, targetIds) : null;
    const collisionAfterSnapshot = collisionBeforeSnapshot ? await captureSnapshot(client, collisionIds) : null;
    return {
      connected: true,
      apply_status: 'pkg02c_full_beta_noncolliding_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      collision_before_snapshot: collisionBeforeSnapshot,
      collision_after_snapshot: collisionAfterSnapshot,
      updated_rows: 0,
      committed: false,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildRollbackSqlPreview(rollbackMatrix) {
  return (rollbackMatrix ?? []).slice(0, 12).map((row) => {
    const rollback = row.rollback_parent_fields ?? {};
    return `update public.card_prints set set_code = ${sqlString(rollback.set_code)}, number = ${sqlString(rollback.number)}, name = ${sqlString(rollback.name)} where id = '${row.card_print_id}'::uuid;`;
  }).join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02C Full Beta Non-Colliding Real Apply V1');
  lines.push('');
  lines.push('This report records the real `PKG-02C-FULL-BETA-NONCOLLIDING` apply authorized by the operator.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| apply_status | ${report.apply_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| updated_rows | ${report.updated_rows} |`);
  lines.push(`| db_write_committed | ${report.db_write_committed} |`);
  lines.push(`| durable_db_writes_performed | ${report.durable_db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| collision_rows_excluded | ${report.package_scope.collision_rows_excluded} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Before And After');
  lines.push('');
  lines.push('| Snapshot | Hash | card_print rows | child rows | vault refs |');
  lines.push('| --- | --- | ---: | ---: | ---: |');
  lines.push(`| before | \`${report.before_snapshot?.hash_sha256 ?? 'not_available'}\` | ${report.before_snapshot?.impact_counts?.card_prints_found ?? null} | ${report.before_snapshot?.impact_counts?.card_printings_found ?? null} | ${report.before_snapshot?.impact_counts?.vault_items_found ?? null} |`);
  lines.push(`| after | \`${report.after_snapshot?.hash_sha256 ?? 'not_available'}\` | ${report.after_snapshot?.impact_counts?.card_prints_found ?? null} | ${report.after_snapshot?.impact_counts?.card_printings_found ?? null} | ${report.after_snapshot?.impact_counts?.vault_items_found ?? null} |`);
  lines.push('');
  lines.push('## Verification Summary');
  lines.push('');
  for (const [key, value] of Object.entries(report.verification_summary)) {
    lines.push(`- ${key}: ${mdEscape(value)}`);
  }
  lines.push('');
  lines.push('## Rollback Preview');
  lines.push('');
  lines.push('```sql');
  lines.push(report.rollback_proof.rollback_sql_preview);
  lines.push('```');
  lines.push('');
  lines.push('The source JSON artifact contains rollback fields for all 343 updated parent rows.');
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
  return `# PKG-02C Full Beta Non-Colliding Real Apply Checkpoint V1

Date: 2026-06-09

## Purpose

Record the approved real apply for PKG-02C-FULL-BETA-NONCOLLIDING after successful rollback-only dry-run proof.

## Result

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| updated_rows | ${report.updated_rows} |
| before_hash_sha256 | \`${report.before_snapshot?.hash_sha256 ?? 'not_available'}\` |
| after_hash_sha256 | \`${report.after_snapshot?.hash_sha256 ?? 'not_available'}\` |
| child_printings_preserved | ${report.verification_summary.child_printings_preserved} |
| vault_references_preserved | ${report.verification_summary.vault_references_preserved} |
| collision_rows_unchanged | ${report.verification_summary.collision_rows_unchanged} |
| db_write_committed | ${report.db_write_committed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| global_apply_included | ${report.package_scope.global_apply_included} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- Real apply was scoped to PKG-02C-FULL-BETA-NONCOLLIDING only.
- Parent card_print rows updated: 343.
- Child printings preserved: 542.
- Vault references accepted and preserved: 4.
- Collision rows excluded and unchanged: 79.
- No migrations.
- No global apply.
- No cleanup, quarantine, merge, or delete.

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg02c_full_beta_noncolliding_real_apply_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg02c_full_beta_noncolliding_real_apply_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02C Full Beta Non-Colliding Real Apply Checkpoint V1](20260609_pkg02c_full_beta_noncolliding_real_apply_checkpoint_v1.md) | Records approved real apply for 343 non-colliding card_print updates, 542 child printings preserved, 4 vault refs accepted, 79 collision rows untouched, no migrations, and no global apply. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02c_full_beta_noncolliding_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02c_full_beta_noncolliding_real_apply_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const artifact = readJson(ARTIFACT_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const collisionAudit = readJson(COLLISION_AUDIT_JSON);
const targetRows = targetRowsFromArtifact(artifact);
const prerequisiteFindings = validatePrerequisites({ gate, artifact, dryRun, collisionAudit });
const applyResult = prerequisiteFindings.length === 0
  ? await applyPkg02c({ artifact, dryRun, collisionAudit })
  : {
    connected: false,
    apply_status: 'blocked_prerequisite_findings_present',
    error_message: prerequisiteFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
    collision_before_snapshot: null,
    collision_after_snapshot: null,
    updated_rows: 0,
    committed: false,
  };

const afterFindings = applyResult.after_snapshot
  ? validateAfterSnapshot({ afterSnapshot: applyResult.after_snapshot, targetRows })
  : ['after_snapshot_unavailable'];
const collisionUnchanged = (
  applyResult.collision_before_snapshot?.hash_sha256
  && applyResult.collision_before_snapshot.hash_sha256 === applyResult.collision_after_snapshot?.hash_sha256
) || false;
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.apply_status === 'pkg02c_full_beta_noncolliding_real_apply_committed' ? [] : ['apply_not_committed']),
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
  ...(collisionUnchanged ? [] : ['collision_rows_changed_or_unavailable']),
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_v1',
  audit_only: false,
  apply_only: true,
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_card_print_updates: 343,
    approved_for_child_mutations: false,
    approved_for_collision_rows: false,
    approved_for_global_apply: false,
    approved_for_migrations: false,
    approved_for_cleanup: false,
    approved_for_quarantine: false,
  },
  apply_status: pass
    ? 'pkg02c_full_beta_noncolliding_real_apply_committed_and_verified'
    : 'pkg02c_full_beta_noncolliding_real_apply_failed_or_blocked',
  db_reads_performed: true,
  durable_db_writes_performed: applyResult.committed,
  db_write_committed: applyResult.committed,
  updated_rows: applyResult.updated_rows,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: applyResult.committed,
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    card_print_rows: 343,
    child_printing_rows_preserved: 542,
    vault_references_accepted: 4,
    collision_rows_excluded: 79,
    global_apply_included: false,
    child_mutations_included: false,
    allowed_changed_fields: ['set_code', 'number', 'name'],
  },
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    dry_run_proof: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    transaction_artifact_preparation: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
    collision_audit: path.relative(ROOT, COLLISION_AUDIT_JSON).replaceAll('\\', '/'),
  },
  execution_result: {
    connected: applyResult.connected,
    apply_status: applyResult.apply_status,
    error_message: applyResult.error_message,
    committed: applyResult.committed,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  collision_before_snapshot: applyResult.collision_before_snapshot,
  collision_after_snapshot: applyResult.collision_after_snapshot,
  rollback_proof: {
    rollback_matrix_available: Array.isArray(artifact.rollback_matrix),
    rollback_parent_rows: artifact.rollback_matrix?.length ?? 0,
    rollback_sql_preview: buildRollbackSqlPreview(artifact.rollback_matrix),
  },
  verification_summary: {
    before_hash_matches_dry_run_proof: applyResult.before_snapshot?.hash_sha256 === dryRun.execution_result?.before_snapshot?.hash_sha256,
    target_parent_fields_resolved: afterFindings.length === 0,
    child_printings_preserved: applyResult.after_snapshot?.impact_counts?.card_printings_found === 542,
    vault_references_preserved: applyResult.after_snapshot?.impact_counts?.vault_items_found === 4,
    collision_rows_unchanged: collisionUnchanged,
    master_index_comparison_status: pass ? 'pkg02c_parent_identity_fields_resolved_child_printings_preserved' : 'not_verified',
  },
  explicit_non_authorizations: [
    'No global apply was authorized or performed.',
    'The 79 collision rows remain excluded and unchanged.',
    'No migrations were authorized or created.',
    'No cleanup, quarantine, merge, deletion, insertion, hiding, or child-printing normalization was authorized.',
    'No child printing rows were changed.',
    'No pricing, scanner, marketplace, provenance, or ownership rows were changed.',
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
  apply_status: report.apply_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  updated_rows: report.updated_rows,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  before_hash_sha256: report.before_snapshot?.hash_sha256 ?? null,
  after_hash_sha256: report.after_snapshot?.hash_sha256 ?? null,
  before_hash_matches_dry_run_proof: report.verification_summary.before_hash_matches_dry_run_proof,
  child_printings_preserved: report.verification_summary.child_printings_preserved,
  vault_references_preserved: report.verification_summary.vault_references_preserved,
  collision_rows_unchanged: report.verification_summary.collision_rows_unchanged,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  global_apply_included: report.package_scope.global_apply_included,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
