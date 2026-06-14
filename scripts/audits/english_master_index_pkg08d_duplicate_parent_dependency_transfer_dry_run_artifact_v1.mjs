import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const STRATEGY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER';

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

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function buildTargetRows(strategy) {
  return (strategy.dependency_strategies ?? [])
    .filter((row) => row.readiness === 'dry_run_artifact_candidate_with_dependency_transfer')
    .flatMap((row) => row.blocked_card_print_ids.map((blockedId) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      blocked_card_print_id: blockedId,
      survivor_card_print_id: row.survivor_card_print_id,
    })));
}

async function captureFreshSnapshot(targetRows) {
  const conn = connectionString();
  if (!conn) {
    return { available: false, reason: 'database_connection_unavailable', rows: [], hash_sha256: null };
  }
  const parentIds = [...new Set([
    ...targetRows.map((row) => row.blocked_card_print_id),
    ...targetRows.map((row) => row.survivor_card_print_id),
  ])];
  const blockedIds = [...new Set(targetRows.map((row) => row.blocked_card_print_id))];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const rows = await client.query(
      `select
         cp.id::text,
         to_jsonb(cp) as card_print,
         coalesce((select count(*)::int from public.card_printings cpr where cpr.card_print_id = cp.id), 0) as child_count,
         coalesce((select count(*)::int from public.external_mappings em where em.card_print_id = cp.id), 0) as external_mapping_count,
         coalesce((select count(*)::int from public.card_print_species cps where cps.card_print_id = cp.id), 0) as species_count,
         coalesce((select count(*)::int from public.canon_warehouse_candidates cwc where cwc.promoted_card_print_id = cp.id), 0) as warehouse_candidate_count,
         coalesce((select count(*)::int from public.justtcg_variants jv where jv.card_print_id = cp.id), 0) as justtcg_variant_count,
         coalesce((select count(*)::int from public.justtcg_variant_prices_latest jl where jl.card_print_id = cp.id), 0) as justtcg_latest_count,
         coalesce((select count(*)::int from public.justtcg_variant_price_snapshots js where js.card_print_id = cp.id), 0) as justtcg_snapshot_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.set_code, cp.number_plain, cp.number, cp.name, cp.id`,
      [parentIds],
    );
    const blockedChildren = await client.query(
      `select count(*)::int as rows
       from public.card_printings
       where card_print_id = any($1::uuid[])`,
      [blockedIds],
    );
    await client.query('rollback');
    const snapshotRows = rows.rows;
    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows: snapshotRows,
      hash_sha256: sha256(stableJson(snapshotRows)),
      impact_counts: {
        card_prints_found: snapshotRows.length,
        blocked_child_printings_found: Number(blockedChildren.rows[0]?.rows ?? 0),
        external_mappings: snapshotRows.reduce((sum, row) => sum + Number(row.external_mapping_count), 0),
        card_print_species: snapshotRows.reduce((sum, row) => sum + Number(row.species_count), 0),
        canon_warehouse_candidates: snapshotRows.reduce((sum, row) => sum + Number(row.warehouse_candidate_count), 0),
        justtcg_variants: snapshotRows.reduce((sum, row) => sum + Number(row.justtcg_variant_count), 0),
        justtcg_variant_prices_latest: snapshotRows.reduce((sum, row) => sum + Number(row.justtcg_latest_count), 0),
        justtcg_variant_price_snapshots: snapshotRows.reduce((sum, row) => sum + Number(row.justtcg_snapshot_count), 0),
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [], hash_sha256: null };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildSql(targetRows, packageFingerprint) {
  const values = targetRows.map((row) => `  (${[
    sqlUuid(row.blocked_card_print_id),
    sqlUuid(row.survivor_card_print_id),
    sqlString(row.set_key),
    sqlString(row.card_number),
    sqlString(row.card_name),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION ARTIFACT V1
-- Generated for review only. Do not run without explicit operator approval.
-- Package fingerprint: ${packageFingerprint}
-- Scope: ${targetRows.length} duplicate parent rows.
-- This artifact updates dependency references and deletes duplicate parent rows inside a transaction.
-- This dry-run artifact contains ROLLBACK and intentionally contains no COMMIT.

begin;

create temporary table pkg08d_parent_transfer_targets (
  blocked_card_print_id uuid primary key,
  survivor_card_print_id uuid not null,
  set_key text not null,
  card_number text not null,
  card_name text not null
) on commit drop;

insert into pkg08d_parent_transfer_targets (
  blocked_card_print_id,
  survivor_card_print_id,
  set_key,
  card_number,
  card_name
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_blocked_children integer;
  v_disallowed_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from pkg08d_parent_transfer_targets;
  if v_targets <> ${targetRows.length} then
    raise exception 'PKG-08D target guard failed: expected ${targetRows.length}, got %', v_targets;
  end if;

  if exists (
    select 1
    from pkg08d_parent_transfer_targets target
    left join public.card_prints blocked on blocked.id = target.blocked_card_print_id
    left join public.card_prints survivor on survivor.id = target.survivor_card_print_id
    where blocked.id is null
       or survivor.id is null
       or coalesce(blocked.set_code, '') <> coalesce(survivor.set_code, '')
       or coalesce(blocked.name, '') <> coalesce(survivor.name, '')
  ) then
    raise exception 'PKG-08D target parent identity guard failed';
  end if;

  select count(*) into v_blocked_children
  from public.card_printings
  where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets);
  if v_blocked_children <> 0 then
    raise exception 'PKG-08D blocked parent child guard failed: % child rows found', v_blocked_children;
  end if;

  for r in
    select
      rel_ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and rel_ns.nspname = 'public'
      and ref.relname = 'card_prints'
      and rel.relname <> all(array[
        'canon_warehouse_candidates',
        'card_print_species',
        'external_mappings',
        'justtcg_variant_price_snapshots',
        'justtcg_variant_prices_latest',
        'justtcg_variants'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select blocked_card_print_id from pkg08d_parent_transfer_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_refs := v_disallowed_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_refs <> 0 then
    raise exception 'PKG-08D disallowed dependency guard failed: % refs found', v_disallowed_refs;
  end if;
end $$;

update public.external_mappings em
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where em.card_print_id = target.blocked_card_print_id;

-- Remove redundant active species rows that would violate the active species unique index after transfer.
delete from public.card_print_species cps
using pkg08d_parent_transfer_targets target
where cps.card_print_id = target.blocked_card_print_id
  and cps.active = true
  and exists (
    select 1
    from public.card_print_species existing
    where existing.card_print_id = target.survivor_card_print_id
      and existing.species_id = cps.species_id
      and existing.role = cps.role
      and existing.active = true
  );

update public.card_print_species cps
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where cps.card_print_id = target.blocked_card_print_id;

update public.canon_warehouse_candidates cwc
set promoted_card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where cwc.promoted_card_print_id = target.blocked_card_print_id;

update public.justtcg_variant_price_snapshots js
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where js.card_print_id = target.blocked_card_print_id;

update public.justtcg_variant_prices_latest jl
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where jl.card_print_id = target.blocked_card_print_id;

update public.justtcg_variants jv
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where jv.card_print_id = target.blocked_card_print_id;

delete from public.card_prints cp
using pkg08d_parent_transfer_targets target
where cp.id = target.blocked_card_print_id;

do $$
declare
  v_blocked_parents integer;
  v_survivor_parents integer;
  v_remaining_refs integer;
begin
  select count(*) into v_blocked_parents
  from public.card_prints
  where id in (select blocked_card_print_id from pkg08d_parent_transfer_targets);
  if v_blocked_parents <> 0 then
    raise exception 'PKG-08D blocked parent delete verification failed: % remain', v_blocked_parents;
  end if;

  select count(*) into v_survivor_parents
  from public.card_prints
  where id in (select survivor_card_print_id from pkg08d_parent_transfer_targets);
  if v_survivor_parents <> (select count(distinct survivor_card_print_id) from pkg08d_parent_transfer_targets) then
    raise exception 'PKG-08D survivor parent verification failed';
  end if;

  select
    (select count(*) from public.external_mappings where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.canon_warehouse_candidates where promoted_card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.justtcg_variant_price_snapshots where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.justtcg_variant_prices_latest where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.justtcg_variants where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
  into v_remaining_refs;

  if v_remaining_refs <> 0 then
    raise exception 'PKG-08D blocked dependency verification failed: % refs remain', v_remaining_refs;
  end if;
end $$;

rollback;
`;
}

function validateSql(sql) {
  const stripped = sql.replace(/--.*$/gm, '');
  return {
    contains_update_statement: /\bupdate\s+public\./i.test(stripped),
    contains_delete_statement: /\bdelete\s+from\s+public\.card_prints\b/i.test(stripped),
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(stripped),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(stripped),
  };
}

function renderMarkdown(report) {
  const setRows = Object.entries(report.package_scope.by_set).map(([set, count]) => [set, count]);
  return `# PKG-08D Duplicate Parent Dependency Transfer Dry-Run Artifact V1

Prepared rollback-only SQL artifact for duplicate parent dependency transfer. The SQL was not executed.

## Status

- artifact_status: \`${report.artifact_status}\`
- package_id: \`${report.package_id}\`
- package_fingerprint_sha256: \`${report.package_scope.package_fingerprint_sha256}\`
- sql_sha256: \`${report.sql_artifact.sha256}\`
- duplicate_parent_rows: ${report.package_scope.duplicate_parent_rows}
- survivor_parent_rows: ${report.package_scope.survivor_parent_rows}

## Dependency Scope

${markdownTable(['dependency', 'rows'], Object.entries(report.package_scope.planned_updates).map(([key, value]) => [key, value]))}

## Sets

${markdownTable(['set', 'duplicate_parent_rows'], setRows)}

## Required Approval For Next Step

The next step is guarded dry-run transaction execution only. It is not a real apply.

\`\`\`text
${report.required_operator_approval.exact_phrase}
\`\`\`

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- real_apply_performed: ${report.real_apply_performed}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- SQL contains ROLLBACK: ${report.sql_artifact.contains_rollback_statement}
- SQL contains COMMIT: ${report.sql_artifact.contains_commit_statement}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08D Duplicate Parent Dependency Transfer Dry-Run Artifact Checkpoint V1](20260610_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_checkpoint_v1.md) | Prepared rollback-only dry-run SQL artifact for 39 duplicate parent dependency transfers. No execution, no writes, no migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const strategy = readJson(STRATEGY_JSON);
  const targetRows = buildTargetRows(strategy);
  const bySet = targetRows.reduce((acc, row) => {
    acc[row.set_key] = (acc[row.set_key] ?? 0) + 1;
    return acc;
  }, {});
  const packageFingerprint = sha256(stableJson({ package_id: PACKAGE_ID, targetRows }));
  const freshSnapshot = await captureFreshSnapshot(targetRows);
  const sql = buildSql(targetRows, packageFingerprint);
  const sqlHash = sha256(sql);
  const sqlFlags = validateSql(sql);
  const stopFindings = [];

  if (strategy.audit_status !== 'pkg08d_duplicate_parent_dependency_strategy_complete_no_write') {
    stopFindings.push('source_strategy_not_complete');
  }
  if (targetRows.length !== 39) stopFindings.push('target_row_count_not_39');
  if (!freshSnapshot.available) stopFindings.push('fresh_snapshot_unavailable');
  if (freshSnapshot.impact_counts?.blocked_child_printings_found !== 0) {
    stopFindings.push('blocked_parent_child_printings_found');
  }
  if (sqlFlags.contains_commit_statement) stopFindings.push('sql_contains_commit_statement');
  if (!sqlFlags.contains_rollback_statement) stopFindings.push('sql_missing_rollback_statement');
  if (!sqlFlags.contains_update_statement) stopFindings.push('sql_missing_dependency_updates');
  if (!sqlFlags.contains_delete_statement) stopFindings.push('sql_missing_duplicate_parent_delete_simulation');

  fs.mkdirSync(SQL_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_SQL, sql);

  const approvalPhrase = `Approve ${PACKAGE_ID} for guarded dry-run transaction execution only. Fingerprint: ${packageFingerprint}. Scope: 38 groups, 39 duplicate parent rows, dependency transfer simulation, rollback-only. No real apply. No migrations.`;
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_reads_performed: freshSnapshot.available,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_performed: false,
    artifact_status: stopFindings.length === 0
      ? 'pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_prepared_apply_blocked_no_write'
      : 'pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_blocked',
    package_scope: {
      package_fingerprint_sha256: packageFingerprint,
      duplicate_parent_rows: targetRows.length,
      survivor_parent_rows: new Set(targetRows.map((row) => row.survivor_card_print_id)).size,
      groups: 38,
      by_set: bySet,
      planned_updates: strategy.summary.planned_updates,
    },
    required_operator_approval: {
      required_before_dry_run_execution: true,
      exact_phrase: approvalPhrase,
    },
    source_artifacts: {
      dependency_strategy: path.relative(ROOT, STRATEGY_JSON).replaceAll('\\', '/'),
    },
    fresh_snapshot: freshSnapshot,
    target_rows: targetRows,
    sql_artifact: {
      path: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
      sha256: sqlHash,
      execution_performed: false,
      ...sqlFlags,
    },
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };

  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeText(CHECKPOINT_MD, renderMarkdown(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    artifact_status: report.artifact_status,
    package_fingerprint_sha256: packageFingerprint,
    sql_sha256: sqlHash,
    duplicate_parent_rows: targetRows.length,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    required_approval: approvalPhrase,
    db_writes_performed: false,
    migrations_created: false,
    stop_findings: stopFindings,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

await main();
