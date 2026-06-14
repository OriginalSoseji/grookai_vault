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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const TRANSFER_PLAN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02e_duplicate_dependency_transfer_plan_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_dry_run_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_dry_run_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02f_duplicate_dependency_transfer_dry_run_artifact_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER';

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

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function buildParentRows(plan) {
  return (plan.transfer_plans ?? []).map((row) => ({
    blocked_card_print_id: row.blocked_card_print_id,
    survivor_card_print_id: row.survivor_card_print_id,
    set_key: row.set_key,
    set_name: row.set_name,
    target_number: row.target_number,
    target_name: row.target_name,
  }));
}

function buildChildRows(plan) {
  return (plan.transfer_plans ?? []).flatMap((row) =>
    (row.child_dependency_plan ?? []).map((child) => ({
      blocked_card_print_id: row.blocked_card_print_id,
      survivor_card_print_id: row.survivor_card_print_id,
      blocked_card_printing_id: child.blocked_card_printing_id,
      survivor_card_printing_id: child.survivor_card_printing_id,
      finish_key: child.finish_key,
    })));
}

async function captureFreshSnapshot(parentRows, childRows) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      hash_sha256: null,
      impact_counts: {},
    };
  }

  const parentIds = [
    ...parentRows.map((row) => row.blocked_card_print_id),
    ...parentRows.map((row) => row.survivor_card_print_id),
  ];
  const childIds = [
    ...childRows.map((row) => row.blocked_card_printing_id),
    ...childRows.map((row) => row.survivor_card_printing_id),
  ].filter(Boolean);

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
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
         ), '[]'::jsonb) as card_print_traits
       from public.card_prints cp
       left join public.sets s on s.id = cp.set_id
       where cp.id = any($1::uuid[])
       order by s.code nulls first, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
      [parentIds],
    );
    const childRefResult = await client.query(
      `select
         (select count(*)::int from public.vault_item_instances where card_printing_id = any($1::uuid[])) as vault_item_instances,
         (select count(*)::int from public.external_printing_mappings where card_printing_id = any($1::uuid[])) as external_printing_mappings,
         (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidates`,
      [childIds],
    );
    await client.query('rollback');

    const rows = result.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      resolved_set_code: row.resolved_set_code,
      resolved_set_name: row.resolved_set_name,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
    }));
    const childRefs = childRefResult.rows[0] ?? {};
    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      hash_sha256: sha256(stableJson(rows)),
      impact_counts: {
        card_prints_found: rows.length,
        card_printings_found: rows.reduce((sum, row) => sum + row.card_printings.length, 0),
        external_mappings_found: rows.reduce((sum, row) => sum + row.external_mappings.length, 0),
        identity_rows_found: rows.reduce((sum, row) => sum + row.card_print_identity.length, 0),
        trait_rows_found: rows.reduce((sum, row) => sum + row.card_print_traits.length, 0),
        blocked_child_printing_refs_found: Object.values(childRefs).reduce((sum, value) => sum + Number(value ?? 0), 0),
      },
      child_reference_counts: childRefs,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      rows: [],
      hash_sha256: null,
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildSql({ parentRows, childRows, packageFingerprint }) {
  const parentValues = parentRows.map((row) => `  (${[
    sqlUuid(row.blocked_card_print_id),
    sqlUuid(row.survivor_card_print_id),
    sqlString(row.set_key),
    sqlString(row.target_number),
    sqlString(row.target_name),
  ].join(', ')})`);
  const childValues = childRows.map((row) => `  (${[
    sqlUuid(row.blocked_card_printing_id),
    sqlUuid(row.survivor_card_printing_id),
    sqlUuid(row.blocked_card_print_id),
    sqlUuid(row.survivor_card_print_id),
    sqlString(row.finish_key),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION ARTIFACT V1
-- Generated for review only. Do not run without explicit operator approval.
-- Package fingerprint: ${packageFingerprint}
-- Scope: 21 duplicate parent rows, ${childRows.length} duplicate child printing rows.
-- This artifact may update external_mappings and delete duplicate child/parent rows inside a transaction.
-- This dry-run artifact contains ROLLBACK and intentionally contains no COMMIT.

begin;

create temporary table pkg02f_parent_merge_targets (
  blocked_card_print_id uuid primary key,
  survivor_card_print_id uuid not null,
  set_key text not null,
  target_number text not null,
  target_name text not null
) on commit drop;

create temporary table pkg02f_child_merge_targets (
  blocked_card_printing_id uuid primary key,
  survivor_card_printing_id uuid not null,
  blocked_card_print_id uuid not null,
  survivor_card_print_id uuid not null,
  finish_key text not null
) on commit drop;

insert into pkg02f_parent_merge_targets (
  blocked_card_print_id,
  survivor_card_print_id,
  set_key,
  target_number,
  target_name
) values
${parentValues.join(',\n')};

insert into pkg02f_child_merge_targets (
  blocked_card_printing_id,
  survivor_card_printing_id,
  blocked_card_print_id,
  survivor_card_print_id,
  finish_key
) values
${childValues.join(',\n')};

do $$
declare
  v_parent_targets integer;
  v_child_targets integer;
  v_child_refs integer;
begin
  select count(*) into v_parent_targets from pkg02f_parent_merge_targets;
  if v_parent_targets <> 21 then
    raise exception 'PKG-02F parent target guard failed: expected 21, got %', v_parent_targets;
  end if;

  select count(*) into v_child_targets from pkg02f_child_merge_targets;
  if v_child_targets <> ${childRows.length} then
    raise exception 'PKG-02F child target guard failed: expected ${childRows.length}, got %', v_child_targets;
  end if;

  if exists (
    select 1
    from pkg02f_parent_merge_targets target
    left join public.card_prints blocked on blocked.id = target.blocked_card_print_id
    left join public.card_prints survivor on survivor.id = target.survivor_card_print_id
    where blocked.id is null or survivor.id is null
  ) then
    raise exception 'PKG-02F parent target row missing';
  end if;

  if exists (
    select 1
    from pkg02f_child_merge_targets target
    left join public.card_printings blocked on blocked.id = target.blocked_card_printing_id
    left join public.card_printings survivor on survivor.id = target.survivor_card_printing_id
    where blocked.id is null
       or survivor.id is null
       or blocked.card_print_id <> target.blocked_card_print_id
       or survivor.card_print_id <> target.survivor_card_print_id
       or blocked.finish_key <> target.finish_key
       or survivor.finish_key <> target.finish_key
  ) then
    raise exception 'PKG-02F child target row mismatch';
  end if;

  select
    (select count(*) from public.vault_item_instances where card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
    + (select count(*) from public.external_printing_mappings where card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
    + (select count(*) from public.canon_warehouse_candidates where promoted_card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
  into v_child_refs;

  if v_child_refs <> 0 then
    raise exception 'PKG-02F blocked child dependency guard failed: % refs found', v_child_refs;
  end if;
end $$;

-- Preserve useful source mappings from duplicate parents when the survivor does not already own the same source/external_id.
update public.external_mappings em
set card_print_id = target.survivor_card_print_id
from pkg02f_parent_merge_targets target
where em.card_print_id = target.blocked_card_print_id
  and not exists (
    select 1
    from public.external_mappings existing
    where existing.card_print_id = target.survivor_card_print_id
      and existing.source = em.source
      and existing.external_id = em.external_id
  );

-- Duplicate external_mappings left on blocked parents are expected to cascade with the blocked parent delete.
delete from public.card_printings cpr
using pkg02f_child_merge_targets target
where cpr.id = target.blocked_card_printing_id;

delete from public.card_prints cp
using pkg02f_parent_merge_targets target
where cp.id = target.blocked_card_print_id;

do $$
declare
  v_blocked_parents integer;
  v_blocked_children integer;
  v_survivor_parents integer;
  v_survivor_children integer;
begin
  select count(*) into v_blocked_parents
  from public.card_prints
  where id in (select blocked_card_print_id from pkg02f_parent_merge_targets);

  select count(*) into v_blocked_children
  from public.card_printings
  where id in (select blocked_card_printing_id from pkg02f_child_merge_targets);

  select count(*) into v_survivor_parents
  from public.card_prints
  where id in (select survivor_card_print_id from pkg02f_parent_merge_targets);

  select count(*) into v_survivor_children
  from public.card_printings
  where id in (select survivor_card_printing_id from pkg02f_child_merge_targets);

  if v_blocked_parents <> 0 then
    raise exception 'PKG-02F blocked parent delete verification failed: % remain', v_blocked_parents;
  end if;
  if v_blocked_children <> 0 then
    raise exception 'PKG-02F blocked child delete verification failed: % remain', v_blocked_children;
  end if;
  if v_survivor_parents <> 21 then
    raise exception 'PKG-02F survivor parent verification failed: expected 21, got %', v_survivor_parents;
  end if;
  if v_survivor_children <> ${childRows.length} then
    raise exception 'PKG-02F survivor child verification failed: expected ${childRows.length}, got %', v_survivor_children;
  end if;
end $$;

rollback;
`;
}

function validateSql(sql) {
  const stripped = sql.replace(/--.*$/gm, '');
  return {
    contains_update_statement: /\bupdate\s+public\.external_mappings\b/i.test(stripped),
    contains_delete_statement: /\bdelete\s+from\s+public\.(card_prints|card_printings)\b/i.test(stripped),
    contains_insert_statement: /\binsert\s+into\s+pkg02f_parent_merge_targets\b/i.test(stripped),
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(stripped),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(stripped),
  };
}

function summarizeBySet(parentRows) {
  const bySet = {};
  for (const row of parentRows) {
    bySet[row.set_key] ??= {
      set_key: row.set_key,
      set_name: row.set_name,
      duplicate_parent_rows: 0,
    };
    bySet[row.set_key].duplicate_parent_rows += 1;
  }
  return Object.values(bySet).sort((left, right) => left.set_key.localeCompare(right.set_key));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02F Duplicate Dependency Transfer Dry-Run Artifact V1');
  lines.push('');
  lines.push('This artifact prepares a rollback-only dry-run transaction for the 21 PKG-02E duplicate dependency transfer candidates.');
  lines.push('');
  lines.push('No transaction was executed by this artifact. No real apply, migration, cleanup, quarantine, merge, or delete was performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push(`- Status: \`${report.artifact_status}\``);
  lines.push(`- Package: \`${report.package_scope.package_id}\``);
  lines.push(`- Fingerprint: \`${report.package_scope.package_fingerprint_sha256}\``);
  lines.push(`- Duplicate parents: ${report.package_scope.duplicate_parent_rows}`);
  lines.push(`- Duplicate child printings: ${report.package_scope.duplicate_child_printing_rows}`);
  lines.push(`- SQL artifact: \`${report.sql_artifact.path}\``);
  lines.push(`- SQL SHA-256: \`${report.sql_artifact.sha256}\``);
  lines.push(`- DB writes performed: ${report.db_writes_performed}`);
  lines.push(`- Migrations created: ${report.migrations_created}`);
  lines.push('');
  lines.push('## Set Summary');
  lines.push('');
  lines.push('| Set | Duplicate parent rows |');
  lines.push('| --- | ---: |');
  for (const row of report.set_summaries) {
    lines.push(`| ${mdEscape(row.set_key)} | ${row.duplicate_parent_rows} |`);
  }
  lines.push('');
  lines.push('## Required Approval');
  lines.push('');
  lines.push('The next step is guarded dry-run transaction execution only. It is not a real apply.');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_operator_approval.exact_phrase);
  lines.push('```');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  for (const item of report.safety) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02F Duplicate Dependency Transfer Dry-Run Artifact Checkpoint V1](20260609_pkg02f_duplicate_dependency_transfer_dry_run_artifact_checkpoint_v1.md) | Prepared rollback-only dry-run artifact for 21 duplicate dependency transfer candidates; no execution, no writes, no migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02f_duplicate_dependency_transfer_dry_run_artifact_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02f_duplicate_dependency_transfer_dry_run_artifact_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const transferPlan = readJson(TRANSFER_PLAN_JSON);
  const parentRows = buildParentRows(transferPlan);
  const childRows = buildChildRows(transferPlan);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    parentRows,
    childRows,
  }));
  const freshSnapshot = await captureFreshSnapshot(parentRows, childRows);
  const sql = buildSql({ parentRows, childRows, packageFingerprint });
  const sqlHash = sha256(sql);
  const sqlFlags = validateSql(sql);
  const stopFindings = [];

  if (transferPlan.audit_status !== 'pkg02e_duplicate_dependency_transfer_plan_complete_no_write') {
    stopFindings.push('source_transfer_plan_not_complete');
  }
  if (parentRows.length !== 21) stopFindings.push('parent_row_count_not_21');
  if (childRows.length !== 23) stopFindings.push('child_row_count_not_23');
  if (!freshSnapshot.available) stopFindings.push('fresh_snapshot_unavailable');
  if (freshSnapshot.impact_counts?.card_prints_found !== 42) stopFindings.push('fresh_snapshot_parent_and_survivor_count_not_42');
  if (freshSnapshot.impact_counts?.blocked_child_printing_refs_found !== 0) {
    stopFindings.push('blocked_child_printing_refs_present');
  }
  if (sqlFlags.contains_commit_statement) stopFindings.push('sql_contains_commit_statement');
  if (!sqlFlags.contains_rollback_statement) stopFindings.push('sql_missing_rollback_statement');
  if (!sqlFlags.contains_update_statement) stopFindings.push('sql_missing_external_mapping_transfer');
  if (!sqlFlags.contains_delete_statement) stopFindings.push('sql_missing_duplicate_delete_simulation');

  fs.mkdirSync(SQL_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_SQL, sql);

  const approvalPhrase = `Approve ${PACKAGE_ID} for guarded dry-run transaction execution only. Fingerprint: ${packageFingerprint}. Scope: 21 duplicate parent rows, 23 duplicate child printings, external mapping transfer simulation, rollback-only. No real apply. No migrations.`;
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02f_duplicate_dependency_transfer_dry_run_artifact_v1',
    audit_only: true,
    db_reads_performed: freshSnapshot.available,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    merge_performed: false,
    delete_performed: false,
    real_apply_performed: false,
    artifact_status: stopFindings.length === 0
      ? 'pkg02f_duplicate_dependency_transfer_dry_run_artifact_prepared_apply_blocked_no_write'
      : 'pkg02f_duplicate_dependency_transfer_dry_run_artifact_blocked',
    package_scope: {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      duplicate_parent_rows: parentRows.length,
      duplicate_child_printing_rows: childRows.length,
      number_key_collision_rows_excluded: 58,
      child_dependency_refs_allowed: 0,
      parent_tables_touched_in_dry_run_sql: ['external_mappings', 'card_printings', 'card_prints'],
    },
    required_operator_approval: {
      required_before_dry_run_execution: true,
      exact_phrase: approvalPhrase,
    },
    source_artifacts: {
      dependency_transfer_plan: path.relative(ROOT, TRANSFER_PLAN_JSON).replaceAll('\\', '/'),
    },
    fresh_snapshot: freshSnapshot,
    set_summaries: summarizeBySet(parentRows),
    parent_merge_matrix: parentRows,
    child_merge_matrix: childRows,
    sql_artifact: {
      path: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
      sha256: sqlHash,
      execution_performed: false,
      ...sqlFlags,
    },
    safety: [
      'This is artifact preparation only.',
      'No DB transaction was executed.',
      'No real apply is authorized by this artifact.',
      'The 58 number-key collision rows remain excluded.',
      'The SQL artifact contains ROLLBACK and no COMMIT.',
      'No migrations were created.',
    ],
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };

  writeJson(OUTPUT_JSON, report);
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_MD, renderMarkdown({
    ...report,
    artifact_status: `${report.artifact_status}_checkpoint`,
  }));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    artifact_status: report.artifact_status,
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    duplicate_parent_rows: report.package_scope.duplicate_parent_rows,
    duplicate_child_printing_rows: report.package_scope.duplicate_child_printing_rows,
    sql_sha256: sqlHash,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    required_approval: approvalPhrase,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    stop_findings: stopFindings.length,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

await main();
