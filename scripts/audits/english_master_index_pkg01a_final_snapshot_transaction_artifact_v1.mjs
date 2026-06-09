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
const SQL_DIR = path.join(ROOT, 'docs', 'sql');

const SPLIT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01_split_one_set_pilot_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_final_fresh_snapshot_transaction_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01a_final_fresh_snapshot_transaction_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg01a_fut2020_guarded_dry_run_transaction_v1.sql');

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

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeEmpty(value) {
  if (value === undefined || value === null) return null;
  const stringValue = String(value);
  return stringValue.length === 0 ? null : stringValue;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function requirePkg01a(splitReport) {
  const stopFindings = [];
  const pilot = splitReport.pilot_package ?? {};
  const remainder = splitReport.remainder_package ?? {};

  if (splitReport.split_status !== 'pkg01_split_into_one_set_pilot_apply_blocked_no_write') {
    stopFindings.push('pkg01_split_status_not_ready');
  }
  if (pilot.package_id !== 'PKG-01A') stopFindings.push('pilot_package_not_pkg01a');
  if (pilot.set_key !== 'fut2020') stopFindings.push('pilot_set_not_fut2020');
  if (pilot.card_print_rows !== 1) stopFindings.push('pilot_not_one_card_print_row');
  if (pilot.child_printing_rows_verified !== 1) stopFindings.push('pilot_not_one_child_printing_row');
  if (pilot.vault_items_referencing_targets !== 0) stopFindings.push('pilot_has_vault_references');
  if (Object.keys(pilot.by_changed_field ?? {}).join(',') !== 'set_code') {
    stopFindings.push('pilot_changes_more_than_set_code');
  }
  if ((pilot.mutation_matrix ?? []).length !== 1) stopFindings.push('pilot_mutation_matrix_not_one_row');
  if ((pilot.rollback_matrix ?? []).length !== 1) stopFindings.push('pilot_rollback_matrix_not_one_row');
  if (remainder.package_id !== 'PKG-01B') stopFindings.push('remainder_package_not_pkg01b');
  if (remainder.status !== 'blocked_until_pkg01a_pilot_verified_no_write') {
    stopFindings.push('remainder_not_blocked');
  }

  return { pilot, remainder, stopFindings };
}

async function captureFreshSnapshot(cardPrintId) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      impact_counts: {},
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const rowsResult = await client.query(
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
       where cp.id = $1::uuid`,
      [cardPrintId],
    );
    await client.query('rollback');

    const rows = rowsResult.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
      vault_items: row.vault_items,
      dependency_counts: {
        external_mappings: row.external_mappings.length,
        card_print_identity: row.card_print_identity.length,
        card_print_traits: row.card_print_traits.length,
        vault_items: row.vault_items.length,
      },
    }));

    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      impact_counts: {
        card_prints_found: rows.length,
        card_printings_found: rows.reduce((sum, row) => sum + row.card_printings.length, 0),
        external_mappings_found: rows.reduce((sum, row) => sum + row.external_mappings.length, 0),
        identity_rows_found: rows.reduce((sum, row) => sum + row.card_print_identity.length, 0),
        trait_rows_found: rows.reduce((sum, row) => sum + row.card_print_traits.length, 0),
        vault_items_found: rows.reduce((sum, row) => sum + row.vault_items.length, 0),
      },
      snapshot_hash_sha256: sha256(stableJson(rows)),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only DB snapshot failed: ${error.message}`,
      rows: [],
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildTransactionSql({ row, snapshotHash, packageFingerprint }) {
  const before = row.before_values_from_fresh_snapshot;
  const after = row.approved_after_values;
  const targetFinishKeys = row.target_finish_keys;
  const allowedFinishArray = targetFinishKeys.map((finish) => sqlString(finish)).join(', ');
  return `-- English Master Index PKG-01A fut2020 guarded dry-run transaction V1
-- GENERATED ARTIFACT ONLY. This file has not been executed by Codex.
-- Scope: PKG-01A only. PKG-01B remains blocked.
-- Package fingerprint: ${packageFingerprint}
-- Fresh snapshot hash: ${snapshotHash}
-- This artifact has no COMMIT path. It must roll back.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table pkg01a_approved_card_prints (
  card_print_id uuid primary key,
  before_set_code text,
  before_number text,
  before_name text,
  after_set_code text not null,
  after_number text not null,
  after_name text not null,
  expected_child_printings int not null,
  expected_finish_keys text[] not null
) on commit drop;

insert into pkg01a_approved_card_prints (
  card_print_id,
  before_set_code,
  before_number,
  before_name,
  after_set_code,
  after_number,
  after_name,
  expected_child_printings,
  expected_finish_keys
) values (
  '${row.card_print_id}'::uuid,
  ${sqlString(before.set_code)},
  ${sqlString(before.number)},
  ${sqlString(before.name)},
  ${sqlString(after.set_code)},
  ${sqlString(after.number)},
  ${sqlString(after.name)},
  ${Number(row.child_printing_rows_expected)},
  array[${allowedFinishArray}]::text[]
);

-- Guard 1: PKG-01A must still be exactly one fut2020 row.
do $$
declare
  target_count int;
begin
  select count(*) into target_count from pkg01a_approved_card_prints;
  if target_count <> 1 then
    raise exception 'PKG-01A target count changed: %', target_count;
  end if;
end $$;

-- Guard 2: current DB state must match the fresh snapshot before any dry-run mutation.
do $$
declare
  drift_count int;
begin
  select count(*) into drift_count
  from pkg01a_approved_card_prints approved
  join public.card_prints cp on cp.id = approved.card_print_id
  where cp.set_code is distinct from approved.before_set_code
     or cp.number is distinct from approved.before_number
     or cp.name is distinct from approved.before_name;

  if drift_count <> 0 then
    raise exception 'PKG-01A before-state drift detected: %', drift_count;
  end if;
end $$;

-- Guard 3: no vault ownership references may exist for this pilot row.
do $$
declare
  vault_count int;
begin
  select count(*) into vault_count
  from public.vault_items vi
  join pkg01a_approved_card_prints approved on approved.card_print_id = vi.card_id;

  if vault_count <> 0 then
    raise exception 'PKG-01A vault reference blocker detected: %', vault_count;
  end if;
end $$;

-- Guard 4: child printing count and finish keys must match the verified pilot scope.
do $$
declare
  mismatch_count int;
begin
  select count(*) into mismatch_count
  from pkg01a_approved_card_prints approved
  where (
    select count(*)::int
    from public.card_printings cpr
    where cpr.card_print_id = approved.card_print_id
  ) <> approved.expected_child_printings
  or exists (
    select 1
    from public.card_printings cpr
    where cpr.card_print_id = approved.card_print_id
      and not (cpr.finish_key = any(approved.expected_finish_keys))
  )
  or exists (
    select 1
    from unnest(approved.expected_finish_keys) as expected(finish_key)
    where not exists (
      select 1
      from public.card_printings cpr
      where cpr.card_print_id = approved.card_print_id
        and cpr.finish_key = expected.finish_key
    )
  );

  if mismatch_count <> 0 then
    raise exception 'PKG-01A child printing/finish mismatch detected: %', mismatch_count;
  end if;
end $$;

-- Dry-run mutation. This transaction must be rolled back below.
update public.card_prints cp
set set_code = approved.after_set_code
from pkg01a_approved_card_prints approved
where cp.id = approved.card_print_id
  and cp.set_code is distinct from approved.after_set_code;

-- Guard 5: dry-run mutation must affect exactly the approved row and only the approved final value.
do $$
declare
  resolved_count int;
begin
  select count(*) into resolved_count
  from public.card_prints cp
  join pkg01a_approved_card_prints approved on approved.card_print_id = cp.id
  where cp.set_code = approved.after_set_code
    and cp.number = approved.after_number
    and cp.name = approved.after_name;

  if resolved_count <> 1 then
    raise exception 'PKG-01A dry-run final-state verification failed: %', resolved_count;
  end if;
end $$;

-- Required rollback-only ending for this dry-run artifact.
rollback;
`;
}

function buildRollbackProof(row) {
  const before = row.before_values_from_fresh_snapshot;
  return {
    rollback_available: true,
    rollback_scope: 'PKG-01A/fut2020 one card_print row only',
    rollback_sql_preview: [
      'update public.card_prints',
      `set set_code = ${sqlString(before.set_code)}`,
      `where id = '${row.card_print_id}'::uuid`,
      `  and set_code = ${sqlString(row.approved_after_values.set_code)};`,
    ].join('\n'),
    rollback_expected_rows: 1,
    rollback_non_authorizations: [
      'Rollback must not touch PKG-01B.',
      'Rollback must not touch card_printings.',
      'Rollback must not touch vault, ownership, provenance, pricing, scanner, or marketplace tables.',
    ],
  };
}

function buildReport(splitReport, scope, snapshot) {
  const stopFindings = [...scope.stopFindings];
  const pilotRow = scope.pilot.mutation_matrix?.[0] ?? null;
  const snapshotRow = snapshot.rows?.[0] ?? null;

  if (!snapshot.available) stopFindings.push('fresh_snapshot_unavailable');
  if (Number(snapshot.impact_counts?.card_prints_found ?? 0) !== 1) stopFindings.push('fresh_snapshot_target_row_missing');
  if (Number(snapshot.impact_counts?.card_printings_found ?? 0) !== 1) stopFindings.push('fresh_snapshot_child_printing_count_not_one');
  if (Number(snapshot.impact_counts?.vault_items_found ?? 0) !== 0) stopFindings.push('fresh_snapshot_vault_reference_blocker');

  const targetFinishKeys = (snapshotRow?.card_printings ?? []).map((printing) => printing.finish_key).sort();
  if (targetFinishKeys.join(',') !== 'holo') stopFindings.push('fresh_snapshot_finish_scope_not_holo');

  const currentFields = {
    set_code: normalizeEmpty(snapshotRow?.card_print?.set_code),
    number: normalizeEmpty(snapshotRow?.card_print?.number),
    name: normalizeEmpty(snapshotRow?.card_print?.name),
    number_plain: normalizeEmpty(snapshotRow?.card_print?.number_plain),
    set_id: snapshotRow?.card_print?.set_id ?? null,
  };
  const approvedBefore = pilotRow?.before_values_from_current_db ?? {};
  for (const field of ['set_code', 'number', 'name', 'number_plain', 'set_id']) {
    if (normalizeEmpty(currentFields[field]) !== normalizeEmpty(approvedBefore[field])) {
      stopFindings.push(`fresh_snapshot_drift_${field}`);
    }
  }

  const artifactRow = {
    card_print_id: pilotRow?.card_print_id ?? null,
    row_fingerprint_sha256: pilotRow?.row_fingerprint_sha256 ?? null,
    set_key: scope.pilot.set_key,
    set_name: scope.pilot.set_name,
    source_external_id: pilotRow?.source_external_id ?? null,
    source_card_url: pilotRow?.source_card_url ?? null,
    allowed_changed_fields: pilotRow?.allowed_changed_fields ?? [],
    before_values_from_fresh_snapshot: currentFields,
    approved_after_values: pilotRow?.approved_after_values ?? {},
    child_printing_rows_expected: pilotRow?.child_printing_rows_expected ?? null,
    child_printing_rows_current: snapshotRow?.card_printings?.length ?? null,
    target_finish_keys: targetFinishKeys,
    dependency_counts: snapshotRow?.dependency_counts ?? {},
    evidence_sources: pilotRow?.evidence_sources ?? [],
  };

  const transactionSql = buildTransactionSql({
    row: artifactRow,
    snapshotHash: snapshot.snapshot_hash_sha256 ?? 'not_available',
    packageFingerprint: scope.pilot.package_fingerprint_sha256,
  });
  const rollbackProof = buildRollbackProof(artifactRow);

  fs.mkdirSync(SQL_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_SQL, transactionSql);

  const transactionArtifactHash = sha256(transactionSql);
  const pass = stopFindings.length === 0;

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01a_final_fresh_snapshot_transaction_artifact_v1',
    audit_only: true,
    dry_run_artifact_preparation_only: true,
    db_reads_performed: snapshot.available,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    transaction_artifact_executed: false,
    approval_scope: {
      approved_by_user_instruction: true,
      approval_text: 'Approve PKG-01A / fut2020 one-set pilot for final fresh snapshot and guarded dry-run transaction artifact preparation only.',
      approved_for_package_id: 'PKG-01A',
      approved_for_set_key: 'fut2020',
      approved_for_final_fresh_snapshot: true,
      approved_for_guarded_dry_run_transaction_artifact_preparation: true,
      approved_for_db_write: false,
      approved_for_apply: false,
      approved_for_pkg01b: false,
    },
    write_ready_now: 0,
    apply_allowed: false,
    artifact_status: pass
      ? 'pkg01a_final_snapshot_and_dry_run_artifact_prepared_apply_blocked_no_write'
      : 'pkg01a_artifact_preparation_blocked_stop_findings_present',
    source_artifacts: {
      split_one_set_pilot: path.relative(ROOT, SPLIT_JSON).replaceAll('\\', '/'),
    },
    package_scope: {
      source_package_id: 'PKG-01',
      pilot_package_id: 'PKG-01A',
      pilot_package_fingerprint_sha256: scope.pilot.package_fingerprint_sha256,
      remainder_package_id: 'PKG-01B',
      remainder_status: scope.remainder.status,
      set_key: scope.pilot.set_key,
      set_name: scope.pilot.set_name,
      card_print_rows: 1,
      child_printing_rows_verified: 1,
      allowed_changed_fields: ['set_code'],
    },
    fresh_snapshot: {
      available: snapshot.available,
      reason: snapshot.reason,
      captured_at: snapshot.captured_at ?? null,
      snapshot_hash_sha256: snapshot.snapshot_hash_sha256 ?? null,
      impact_counts: snapshot.impact_counts,
      rows: snapshot.rows,
    },
    mutation_matrix: [artifactRow],
    rollback_proof: rollbackProof,
    guarded_dry_run_transaction_artifact: {
      artifact_ref: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
      artifact_hash_sha256: transactionArtifactHash,
      executed: false,
      contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(transactionSql),
      contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(transactionSql),
      dry_run_default: true,
      allowed_target_table: 'public.card_prints',
      allowed_target_ids: [artifactRow.card_print_id],
      allowed_field_changes: ['set_code'],
      expected_dry_run_updated_rows: 1,
      pkg01b_included: false,
    },
    verification_gates_required_before_any_db_write: [
      'Review the fresh snapshot hash and target row contents.',
      'Review the guarded dry-run transaction SQL artifact.',
      'Review rollback proof and ensure it scopes only PKG-01A.',
      'Run the transaction artifact only as a dry-run in a separate approved step.',
      'Verify the dry-run returns expected row counts and rolls back.',
      'Only then request separate explicit DB write/apply approval.',
    ],
    explicit_non_authorizations: [
      'This artifact is not DB write approval.',
      'This artifact is not apply approval.',
      'This artifact does not authorize PKG-01B.',
      'This artifact was not executed.',
      'This artifact created no migration.',
      'This artifact performed no cleanup, quarantine, insertion, deletion, hiding, or normalization.',
    ],
    stop_findings: stopFindings,
    pass,
  };
}

function renderMarkdown(report) {
  const row = report.mutation_matrix[0] ?? {};
  const lines = [];
  lines.push('# English Master Index PKG-01A Final Fresh Snapshot Transaction Artifact V1');
  lines.push('');
  lines.push('This report records the approved preparation-only step for `PKG-01A / fut2020`.');
  lines.push('');
  lines.push('It captured a fresh read-only snapshot and generated a guarded dry-run transaction artifact. The transaction artifact was not executed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| artifact_status | ${report.artifact_status} |`);
  lines.push(`| pilot_package_id | ${report.package_scope.pilot_package_id} |`);
  lines.push(`| set_key | ${report.package_scope.set_key} |`);
  lines.push(`| card_print_rows | ${report.package_scope.card_print_rows} |`);
  lines.push(`| child_printing_rows_verified | ${report.package_scope.child_printing_rows_verified} |`);
  lines.push(`| write_ready_now | ${report.write_ready_now} |`);
  lines.push(`| apply_allowed | ${report.apply_allowed} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| transaction_artifact_executed | ${report.transaction_artifact_executed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Approval Scope');
  lines.push('');
  lines.push('| Scope | Value |');
  lines.push('| --- | --- |');
  lines.push(`| approved_for_final_fresh_snapshot | ${report.approval_scope.approved_for_final_fresh_snapshot} |`);
  lines.push(`| approved_for_guarded_dry_run_transaction_artifact_preparation | ${report.approval_scope.approved_for_guarded_dry_run_transaction_artifact_preparation} |`);
  lines.push(`| approved_for_db_write | ${report.approval_scope.approved_for_db_write} |`);
  lines.push(`| approved_for_apply | ${report.approval_scope.approved_for_apply} |`);
  lines.push(`| approved_for_pkg01b | ${report.approval_scope.approved_for_pkg01b} |`);
  lines.push('');
  lines.push('## Fresh Snapshot');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| captured_at | ${report.fresh_snapshot.captured_at} |`);
  lines.push(`| snapshot_hash_sha256 | \`${report.fresh_snapshot.snapshot_hash_sha256 ?? 'not_available'}\` |`);
  lines.push(`| card_prints_found | ${report.fresh_snapshot.impact_counts?.card_prints_found ?? null} |`);
  lines.push(`| card_printings_found | ${report.fresh_snapshot.impact_counts?.card_printings_found ?? null} |`);
  lines.push(`| vault_items_found | ${report.fresh_snapshot.impact_counts?.vault_items_found ?? null} |`);
  lines.push('');
  lines.push('## Mutation Matrix');
  lines.push('');
  lines.push('| card_print_id | before_set_code | after_set_code | number | name | finishes | changed_fields |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  lines.push(`| ${mdEscape(row.card_print_id)} | ${mdEscape(row.before_values_from_fresh_snapshot?.set_code ?? '')} | ${mdEscape(row.approved_after_values?.set_code)} | ${mdEscape(row.before_values_from_fresh_snapshot?.number)} | ${mdEscape(row.before_values_from_fresh_snapshot?.name)} | ${mdEscape((row.target_finish_keys ?? []).join(', '))} | ${mdEscape((row.allowed_changed_fields ?? []).join(', '))} |`);
  lines.push('');
  lines.push('## Guarded Dry-Run Transaction Artifact');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| artifact_ref | \`${report.guarded_dry_run_transaction_artifact.artifact_ref}\` |`);
  lines.push(`| artifact_hash_sha256 | \`${report.guarded_dry_run_transaction_artifact.artifact_hash_sha256}\` |`);
  lines.push(`| executed | ${report.guarded_dry_run_transaction_artifact.executed} |`);
  lines.push(`| contains_commit_statement | ${report.guarded_dry_run_transaction_artifact.contains_commit_statement} |`);
  lines.push(`| contains_rollback_statement | ${report.guarded_dry_run_transaction_artifact.contains_rollback_statement} |`);
  lines.push(`| pkg01b_included | ${report.guarded_dry_run_transaction_artifact.pkg01b_included} |`);
  lines.push('');
  lines.push('## Rollback Proof');
  lines.push('');
  lines.push(`Rollback available: ${report.rollback_proof.rollback_available}`);
  lines.push('');
  lines.push('```sql');
  lines.push(report.rollback_proof.rollback_sql_preview);
  lines.push('```');
  lines.push('');
  lines.push('## Required Gates Before Any DB Write');
  lines.push('');
  for (const gate of report.verification_gates_required_before_any_db_write) lines.push(`- ${gate}`);
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

const splitReport = readJson(SPLIT_JSON);
const scope = requirePkg01a(splitReport);
const pilotRow = scope.pilot.mutation_matrix?.[0];
const snapshot = pilotRow
  ? await captureFreshSnapshot(pilotRow.card_print_id)
  : {
      available: false,
      reason: 'PKG-01A pilot row unavailable.',
      rows: [],
      impact_counts: {},
    };
const report = buildReport(splitReport, scope, snapshot);

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
  ],
  artifact_status: report.artifact_status,
  pilot_package_id: report.package_scope.pilot_package_id,
  set_key: report.package_scope.set_key,
  card_print_rows: report.package_scope.card_print_rows,
  child_printing_rows_verified: report.package_scope.child_printing_rows_verified,
  fresh_snapshot_available: report.fresh_snapshot.available,
  snapshot_hash_sha256: report.fresh_snapshot.snapshot_hash_sha256,
  transaction_artifact_executed: report.transaction_artifact_executed,
  write_ready_now: report.write_ready_now,
  apply_allowed: report.apply_allowed,
  stop_findings: report.stop_findings.length,
  db_reads_performed: report.db_reads_performed,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
}, null, 2));
