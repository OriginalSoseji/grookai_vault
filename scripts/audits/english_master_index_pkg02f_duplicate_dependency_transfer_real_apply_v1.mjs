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

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_gate_v1.json');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_dry_run_artifact_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_guarded_dry_run_execution_v1.json');
const ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02d_collision_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02f_duplicate_dependency_transfer_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER';
const PACKAGE_FINGERPRINT = '21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a';
const APPROVAL_TEXT = 'Approve real PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER apply only. Fingerprint: 21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a. Scope: 21 duplicate parent rows, 23 duplicate child printings, external mapping transfer, 58 number-key collision rows excluded. Dry-run proof: ca6bbbca58b64546658c33ffc2ab851982fe9d1342a1eefe6123d6645a49df69 == ca6bbbca58b64546658c33ffc2ab851982fe9d1342a1eefe6123d6645a49df69. No global apply. No migrations.';

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

async function tableExists(client, tableName) {
  const result = await client.query(
    `select exists (
       select 1
       from information_schema.tables
       where table_schema = 'public'
         and table_name = $1
     ) as exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

async function optionalChildRows(client, tableName, cardPrintIds) {
  if (!(await tableExists(client, tableName))) return [];
  const result = await client.query(
    `select to_jsonb(t) as row
     from public.${tableName} t
     where t.card_print_id = any($1::uuid[])
     order by t.card_print_id, t.id`,
    [cardPrintIds],
  );
  return result.rows.map((row) => row.row);
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
       ), '[]'::jsonb) as card_print_traits,
       coalesce((
         select jsonb_agg(to_jsonb(cps) order by cps.id)
         from public.card_print_species cps
         where cps.card_print_id = cp.id
       ), '[]'::jsonb) as card_print_species
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
    card_print_species: row.card_print_species,
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
      species_rows_found: rows.reduce((sum, row) => sum + row.card_print_species.length, 0),
      blocked_child_printing_refs_found: Object.values(childRefs).reduce((sum, value) => sum + Number(value ?? 0), 0),
    },
    child_reference_counts: childRefs,
  };
}

function toDryRunShapeSnapshot(snapshot) {
  const rows = snapshot.rows.map((row) => ({
    card_print_id: row.card_print_id,
    card_print: row.card_print,
    resolved_set_code: row.resolved_set_code,
    resolved_set_name: row.resolved_set_name,
    card_printings: row.card_printings,
    external_mappings: row.external_mappings,
    card_print_identity: row.card_print_identity,
    card_print_traits: row.card_print_traits,
  }));
  return {
    captured_at: snapshot.captured_at,
    rows,
    hash_sha256: sha256(stableJson(rows)),
    impact_counts: {
      ...snapshot.impact_counts,
      species_rows_found: undefined,
    },
    child_reference_counts: snapshot.child_reference_counts,
  };
}

function validatePrerequisites({ gate, artifact, dryRun }) {
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

  if (artifact.artifact_status !== 'pkg02f_duplicate_dependency_transfer_dry_run_artifact_prepared_apply_blocked_no_write') {
    findings.push('source_artifact_not_ready');
  }
  if (artifact.pass !== true) findings.push('source_artifact_not_passing');
  if (artifact.package_scope?.package_id !== PACKAGE_ID) findings.push('source_artifact_wrong_package');
  if (artifact.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    findings.push('source_artifact_fingerprint_mismatch');
  }
  if (artifact.package_scope?.duplicate_parent_rows !== 21) findings.push('source_artifact_parent_count_not_21');
  if (artifact.package_scope?.duplicate_child_printing_rows !== 23) findings.push('source_artifact_child_count_not_23');
  if (artifact.package_scope?.number_key_collision_rows_excluded !== 58) {
    findings.push('source_artifact_number_key_exclusion_count_not_58');
  }
  if ((artifact.stop_findings ?? []).length !== 0) findings.push('source_artifact_stop_findings_present');

  if (dryRun.dry_run_execution_status !== 'pkg02f_duplicate_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change') {
    findings.push('dry_run_not_passed');
  }
  if (dryRun.pass !== true) findings.push('dry_run_not_passing');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) {
    findings.push('dry_run_durable_state_not_proven_unchanged');
  }
  if (dryRun.artifact_fresh_snapshot_matches_before_snapshot !== true) findings.push('dry_run_artifact_snapshot_drift');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.package_scope?.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.sql_artifact?.contains_commit_statement !== false) findings.push('dry_run_sql_had_commit_statement');
  if (dryRun.sql_artifact?.contains_rollback_statement !== true) findings.push('dry_run_sql_missing_rollback_statement');
  return findings;
}

function validateBeforeSnapshot(beforeSnapshot, dryRunShapeBeforeSnapshot, dryRun) {
  const findings = [];
  if (dryRunShapeBeforeSnapshot.hash_sha256 !== dryRun.execution_result?.before_snapshot?.hash_sha256) {
    findings.push('before_snapshot_hash_does_not_match_dry_run_proof');
  }
  if (beforeSnapshot.impact_counts.card_prints_found !== 42) findings.push('before_card_print_count_not_42');
  if (beforeSnapshot.impact_counts.blocked_child_printing_refs_found !== 0) {
    findings.push('before_blocked_child_refs_present');
  }
  return findings;
}

function validateAfterSnapshot(afterSnapshot, parentRows, childRows) {
  const findings = [];
  const survivorParentIds = new Set(parentRows.map((row) => row.survivor_card_print_id));
  const blockedParentIds = new Set(parentRows.map((row) => row.blocked_card_print_id));
  const survivorChildIds = new Set(childRows.map((row) => row.survivor_card_printing_id));
  const blockedChildIds = new Set(childRows.map((row) => row.blocked_card_printing_id));
  const afterParentIds = new Set(afterSnapshot.rows.map((row) => row.card_print_id));
  const afterChildIds = new Set(afterSnapshot.rows.flatMap((row) => row.card_printings.map((child) => child.id)));

  if (afterSnapshot.impact_counts.card_prints_found !== 21) findings.push('after_survivor_parent_count_not_21');
  for (const id of survivorParentIds) {
    if (!afterParentIds.has(id)) findings.push(`after_missing_survivor_parent_${id}`);
  }
  for (const id of blockedParentIds) {
    if (afterParentIds.has(id)) findings.push(`after_blocked_parent_still_present_${id}`);
  }
  for (const id of survivorChildIds) {
    if (!afterChildIds.has(id)) findings.push(`after_missing_survivor_child_${id}`);
  }
  for (const id of blockedChildIds) {
    if (afterChildIds.has(id)) findings.push(`after_blocked_child_still_present_${id}`);
  }
  if (afterSnapshot.impact_counts.blocked_child_printing_refs_found !== 0) {
    findings.push('after_blocked_child_refs_present');
  }
  return findings;
}

async function applyPkg02f({ artifact, dryRun, numberKeyIds }) {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      apply_status: 'blocked_no_database_connection_string',
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      before_snapshot: null,
      after_snapshot: null,
      number_key_before_snapshot: null,
      number_key_after_snapshot: null,
      updated_external_mapping_rows: 0,
      deleted_child_rows: 0,
      deleted_parent_rows: 0,
      committed: false,
    };
  }

  const parentRows = artifact.parent_merge_matrix ?? [];
  const childRows = artifact.child_merge_matrix ?? [];
  const allParentIds = [
    ...parentRows.map((row) => row.blocked_card_print_id),
    ...parentRows.map((row) => row.survivor_card_print_id),
  ];
  const survivorParentIds = parentRows.map((row) => row.survivor_card_print_id);
  const allChildIds = [
    ...childRows.map((row) => row.blocked_card_printing_id),
    ...childRows.map((row) => row.survivor_card_printing_id),
  ];
  const blockedChildIds = childRows.map((row) => row.blocked_card_printing_id);

  const client = new Client({ connectionString: conn });
  await client.connect();
  let beforeSnapshot = null;
  let numberKeyBeforeSnapshot = null;
  try {
    beforeSnapshot = await captureSnapshot(client, allParentIds, blockedChildIds);
    numberKeyBeforeSnapshot = await captureSnapshot(client, numberKeyIds, []);
    const dryRunShapeBeforeSnapshot = toDryRunShapeSnapshot(beforeSnapshot);
    const beforeFindings = validateBeforeSnapshot(beforeSnapshot, dryRunShapeBeforeSnapshot, dryRun);
    if (numberKeyBeforeSnapshot.impact_counts.card_prints_found !== 58) {
      beforeFindings.push('number_key_before_card_print_count_not_58');
    }
    if (beforeFindings.length !== 0) {
      return {
        connected: true,
        apply_status: 'blocked_before_snapshot_findings_present',
        error_message: beforeFindings.join(', '),
        before_snapshot: beforeSnapshot,
        dry_run_shape_before_snapshot: dryRunShapeBeforeSnapshot,
        after_snapshot: beforeSnapshot,
        number_key_before_snapshot: numberKeyBeforeSnapshot,
        number_key_after_snapshot: numberKeyBeforeSnapshot,
        updated_external_mapping_rows: 0,
        deleted_child_rows: 0,
        deleted_parent_rows: 0,
        committed: false,
      };
    }

    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    await client.query(
      `create temporary table pkg02f_parent_merge_targets (
         blocked_card_print_id uuid primary key,
         survivor_card_print_id uuid not null,
         set_key text not null,
         target_number text not null,
         target_name text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg02f_child_merge_targets (
         blocked_card_printing_id uuid primary key,
         survivor_card_printing_id uuid not null,
         blocked_card_print_id uuid not null,
         survivor_card_print_id uuid not null,
         finish_key text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg02f_parent_merge_targets (
         blocked_card_print_id,
         survivor_card_print_id,
         set_key,
         target_number,
         target_name
       )
       select
         row.blocked_card_print_id::uuid,
         row.survivor_card_print_id::uuid,
         row.set_key,
         row.target_number,
         row.target_name
       from jsonb_to_recordset($1::jsonb) as row(
         blocked_card_print_id text,
         survivor_card_print_id text,
         set_key text,
         target_number text,
         target_name text
       )`,
      [JSON.stringify(parentRows)],
    );
    await client.query(
      `insert into pkg02f_child_merge_targets (
         blocked_card_printing_id,
         survivor_card_printing_id,
         blocked_card_print_id,
         survivor_card_print_id,
         finish_key
       )
       select
         row.blocked_card_printing_id::uuid,
         row.survivor_card_printing_id::uuid,
         row.blocked_card_print_id::uuid,
         row.survivor_card_print_id::uuid,
         row.finish_key
       from jsonb_to_recordset($1::jsonb) as row(
         blocked_card_printing_id text,
         survivor_card_printing_id text,
         blocked_card_print_id text,
         survivor_card_print_id text,
         finish_key text
       )`,
      [JSON.stringify(childRows)],
    );

    const lockParents = await client.query(
      `select cp.id
       from public.card_prints cp
       where cp.id in (
         select blocked_card_print_id from pkg02f_parent_merge_targets
         union
         select survivor_card_print_id from pkg02f_parent_merge_targets
       )
       for update`,
    );
    if (lockParents.rowCount !== 42) throw new Error(`locked parent count mismatch: ${lockParents.rowCount}`);

    const lockChildren = await client.query(
      `select cpr.id
       from public.card_printings cpr
       where cpr.id in (
         select blocked_card_printing_id from pkg02f_child_merge_targets
         union
         select survivor_card_printing_id from pkg02f_child_merge_targets
       )
       for update`,
    );
    if (lockChildren.rowCount !== 46) throw new Error(`locked child count mismatch: ${lockChildren.rowCount}`);

    const childRefGuard = await client.query(
      `select
         (select count(*)::int from public.vault_item_instances where card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
         + (select count(*)::int from public.external_printing_mappings where card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
         + (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
       as refs`,
    );
    if (childRefGuard.rows[0].refs !== 0) {
      throw new Error(`blocked child dependency guard failed: ${childRefGuard.rows[0].refs}`);
    }

    const updateResult = await client.query(
      `update public.external_mappings em
       set card_print_id = target.survivor_card_print_id
       from pkg02f_parent_merge_targets target
       where em.card_print_id = target.blocked_card_print_id
         and not exists (
           select 1
           from public.external_mappings existing
           where existing.card_print_id = target.survivor_card_print_id
             and existing.source = em.source
             and existing.external_id = em.external_id
         )`,
    );

    const deleteChildResult = await client.query(
      `delete from public.card_printings cpr
       using pkg02f_child_merge_targets target
       where cpr.id = target.blocked_card_printing_id`,
    );
    if (deleteChildResult.rowCount !== 23) throw new Error(`deleted child row count mismatch: ${deleteChildResult.rowCount}`);

    const deleteParentResult = await client.query(
      `delete from public.card_prints cp
       using pkg02f_parent_merge_targets target
       where cp.id = target.blocked_card_print_id`,
    );
    if (deleteParentResult.rowCount !== 21) throw new Error(`deleted parent row count mismatch: ${deleteParentResult.rowCount}`);

    const finalGuard = await client.query(
      `select
         (select count(*)::int from public.card_prints where id in (select blocked_card_print_id from pkg02f_parent_merge_targets)) as blocked_parents,
         (select count(*)::int from public.card_printings where id in (select blocked_card_printing_id from pkg02f_child_merge_targets)) as blocked_children,
         (select count(*)::int from public.card_prints where id in (select survivor_card_print_id from pkg02f_parent_merge_targets)) as survivor_parents,
         (select count(*)::int from public.card_printings where id in (select survivor_card_printing_id from pkg02f_child_merge_targets)) as survivor_children,
         (select count(*)::int from public.external_mappings where card_print_id in (select blocked_card_print_id from pkg02f_parent_merge_targets)) as blocked_external_mappings`,
    );
    const final = finalGuard.rows[0];
    if (
      final.blocked_parents !== 0 ||
      final.blocked_children !== 0 ||
      final.survivor_parents !== 21 ||
      final.survivor_children !== 23 ||
      final.blocked_external_mappings !== 0
    ) {
      throw new Error(`final transaction guard failed: ${JSON.stringify(final)}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, survivorParentIds, blockedChildIds);
    const numberKeyAfterSnapshot = await captureSnapshot(client, numberKeyIds, []);
    return {
      connected: true,
      apply_status: 'pkg02f_duplicate_dependency_transfer_real_apply_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      dry_run_shape_before_snapshot: dryRunShapeBeforeSnapshot,
      after_snapshot: afterSnapshot,
      number_key_before_snapshot: numberKeyBeforeSnapshot,
      number_key_after_snapshot: numberKeyAfterSnapshot,
      updated_external_mapping_rows: updateResult.rowCount,
      deleted_child_rows: deleteChildResult.rowCount,
      deleted_parent_rows: deleteParentResult.rowCount,
      committed: true,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = beforeSnapshot ? await captureSnapshot(client, allParentIds, blockedChildIds) : null;
    const numberKeyAfterSnapshot = numberKeyBeforeSnapshot ? await captureSnapshot(client, numberKeyIds, []) : null;
    return {
      connected: true,
      apply_status: 'pkg02f_duplicate_dependency_transfer_real_apply_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      number_key_before_snapshot: numberKeyBeforeSnapshot,
      number_key_after_snapshot: numberKeyAfterSnapshot,
      updated_external_mapping_rows: 0,
      deleted_child_rows: 0,
      deleted_parent_rows: 0,
      committed: false,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildRollbackSqlPreview(artifact) {
  const parents = (artifact.parent_merge_matrix ?? []).slice(0, 8).map((row) =>
    `-- restore duplicate parent ${row.blocked_card_print_id} for ${row.set_key} ${row.target_number} ${row.target_name}`);
  const children = (artifact.child_merge_matrix ?? []).slice(0, 8).map((row) =>
    `-- restore duplicate child ${row.blocked_card_printing_id} finish_key=${row.finish_key} for parent ${row.blocked_card_print_id}`);
  return [...parents, ...children].join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02F Duplicate Dependency Transfer Real Apply V1');
  lines.push('');
  lines.push('This report records the real `PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER` apply authorized by the operator.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| apply_status | ${report.apply_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| updated_external_mapping_rows | ${report.updated_external_mapping_rows} |`);
  lines.push(`| deleted_child_rows | ${report.deleted_child_rows} |`);
  lines.push(`| deleted_parent_rows | ${report.deleted_parent_rows} |`);
  lines.push(`| db_write_committed | ${report.db_write_committed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Verification Summary');
  lines.push('');
  for (const [key, value] of Object.entries(report.verification_summary)) {
    lines.push(`- ${key}: ${mdEscape(value)}`);
  }
  lines.push('');
  lines.push('## Rollback Snapshot Preview');
  lines.push('');
  lines.push('```sql');
  lines.push(report.rollback_proof.rollback_sql_preview);
  lines.push('```');
  lines.push('');
  lines.push('The source JSON report contains the full pre-apply snapshot for duplicate parents, child printings, external mappings, identity rows, trait rows, and species rows captured immediately before apply.');
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('- none');
  else for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  lines.push('');
  lines.push('## Non-Authorizations');
  lines.push('');
  for (const item of report.explicit_non_authorizations) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# PKG-02F Duplicate Dependency Transfer Real Apply Checkpoint V1

Date: 2026-06-09

## Purpose

Record the approved real apply for PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER after successful rollback-only dry-run proof.

## Result

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |
| updated_external_mapping_rows | ${report.updated_external_mapping_rows} |
| deleted_child_rows | ${report.deleted_child_rows} |
| deleted_parent_rows | ${report.deleted_parent_rows} |
| db_write_committed | ${report.db_write_committed} |
| number_key_rows_unchanged | ${report.verification_summary.number_key_rows_unchanged} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| global_apply_included | ${report.package_scope.global_apply_included} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- Real apply was scoped to PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER only.
- Duplicate parent rows deleted: 21.
- Duplicate child rows deleted: 23.
- Number-key collision rows excluded and unchanged: 58.
- No migrations.
- No global apply.
- No quarantine.

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02F Duplicate Dependency Transfer Real Apply Checkpoint V1](20260609_pkg02f_duplicate_dependency_transfer_real_apply_checkpoint_v1.md) | Records approved real apply for 21 duplicate parent deletes, 23 duplicate child deletes, external mapping transfer, 58 number-key rows untouched, no migrations, and no global apply. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02f_duplicate_dependency_transfer_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02f_duplicate_dependency_transfer_real_apply_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const artifact = readJson(ARTIFACT_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const adjudication = readJson(ADJUDICATION_JSON);
const numberKeyIds = (adjudication.adjudication_rows ?? [])
  .filter((row) => row.adjudication_status === 'number_plain_identity_collision_not_merge_safe')
  .map((row) => row.blocked_card_print_id);
const prerequisiteFindings = validatePrerequisites({ gate, artifact, dryRun });
const applyResult = prerequisiteFindings.length === 0
  ? await applyPkg02f({ artifact, dryRun, numberKeyIds })
  : {
    connected: false,
    apply_status: 'blocked_prerequisite_findings_present',
    error_message: prerequisiteFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
    number_key_before_snapshot: null,
    number_key_after_snapshot: null,
    updated_external_mapping_rows: 0,
    deleted_child_rows: 0,
    deleted_parent_rows: 0,
    committed: false,
  };

const afterFindings = applyResult.after_snapshot
  ? validateAfterSnapshot(applyResult.after_snapshot, artifact.parent_merge_matrix ?? [], artifact.child_merge_matrix ?? [])
  : ['after_snapshot_unavailable'];
const numberKeyRowsUnchanged = (
  applyResult.number_key_before_snapshot?.hash_sha256
  && applyResult.number_key_before_snapshot.hash_sha256 === applyResult.number_key_after_snapshot?.hash_sha256
) || false;
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.apply_status === 'pkg02f_duplicate_dependency_transfer_real_apply_committed' ? [] : ['apply_not_committed']),
  ...(applyResult.error_message ? [`apply_error: ${applyResult.error_message}`] : []),
  ...afterFindings,
  ...(numberKeyRowsUnchanged ? [] : ['number_key_rows_changed_or_unavailable']),
];
const pass = stopFindings.length === 0;

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_v1',
  audit_only: false,
  apply_only: true,
  approval_scope: {
    apply_approved_by_user: true,
    approval_text: APPROVAL_TEXT,
    approved_for_package_id: PACKAGE_ID,
    approved_for_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_for_duplicate_parent_rows: 21,
    approved_for_duplicate_child_printing_rows: 23,
    approved_for_number_key_collision_rows: false,
    approved_for_global_apply: false,
    approved_for_migrations: false,
    approved_for_cleanup: false,
    approved_for_quarantine: false,
  },
  apply_status: pass
    ? 'pkg02f_duplicate_dependency_transfer_real_apply_committed_and_verified'
    : 'pkg02f_duplicate_dependency_transfer_real_apply_failed_or_blocked',
  db_reads_performed: true,
  durable_db_writes_performed: applyResult.committed,
  db_write_committed: applyResult.committed,
  updated_external_mapping_rows: applyResult.updated_external_mapping_rows,
  deleted_child_rows: applyResult.deleted_child_rows,
  deleted_parent_rows: applyResult.deleted_parent_rows,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: applyResult.committed,
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    duplicate_parent_rows: 21,
    duplicate_child_printing_rows: 23,
    number_key_collision_rows_excluded: 58,
    global_apply_included: false,
  },
  source_artifacts: {
    real_apply_gate: path.relative(ROOT, GATE_JSON).replaceAll('\\', '/'),
    dry_run_proof: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    dry_run_artifact: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
    collision_adjudication: path.relative(ROOT, ADJUDICATION_JSON).replaceAll('\\', '/'),
  },
  execution_result: {
    connected: applyResult.connected,
    apply_status: applyResult.apply_status,
    error_message: applyResult.error_message,
    committed: applyResult.committed,
  },
  before_snapshot: applyResult.before_snapshot,
  dry_run_shape_before_snapshot: applyResult.dry_run_shape_before_snapshot ?? null,
  after_snapshot: applyResult.after_snapshot,
  number_key_before_snapshot: applyResult.number_key_before_snapshot,
  number_key_after_snapshot: applyResult.number_key_after_snapshot,
  rollback_proof: {
    rollback_snapshot_available: Boolean(applyResult.before_snapshot),
    rollback_sql_preview: buildRollbackSqlPreview(artifact),
  },
  verification_summary: {
    before_hash_matches_dry_run_proof:
      applyResult.dry_run_shape_before_snapshot?.hash_sha256 === dryRun.execution_result?.before_snapshot?.hash_sha256,
    rollback_snapshot_captures_species_rows: Number(applyResult.before_snapshot?.impact_counts?.species_rows_found ?? 0) > 0,
    duplicate_parents_removed: applyResult.deleted_parent_rows === 21,
    duplicate_children_removed: applyResult.deleted_child_rows === 23,
    survivor_rows_preserved: afterFindings.length === 0,
    number_key_rows_unchanged: numberKeyRowsUnchanged,
    master_index_comparison_status: pass ? 'pkg02f_duplicate_dependency_transfer_committed_verified' : 'not_verified',
  },
  explicit_non_authorizations: [
    'No global apply was authorized or performed.',
    'The 58 number-key collision rows remain excluded and unchanged.',
    'No migrations were authorized or created.',
    'No cleanup or quarantine was authorized.',
    'No pricing, scanner, marketplace, provenance, or ownership rows were intentionally changed.',
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
  updated_external_mapping_rows: report.updated_external_mapping_rows,
  deleted_child_rows: report.deleted_child_rows,
  deleted_parent_rows: report.deleted_parent_rows,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  before_hash_sha256: report.before_snapshot?.hash_sha256 ?? null,
  before_hash_matches_dry_run_proof: report.verification_summary.before_hash_matches_dry_run_proof,
  number_key_rows_unchanged: report.verification_summary.number_key_rows_unchanged,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  global_apply_included: report.package_scope.global_apply_included,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
