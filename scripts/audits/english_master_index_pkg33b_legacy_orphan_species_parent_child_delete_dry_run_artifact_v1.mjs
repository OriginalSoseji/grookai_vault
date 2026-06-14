import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(process.cwd(), 'docs', 'sql');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg33a_legacy_orphan_species_dependency_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg33b_legacy_orphan_species_parent_child_delete_dry_run_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg33b_legacy_orphan_species_parent_child_delete_dry_run_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg33b_legacy_orphan_species_parent_child_delete_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE';

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

function buildSql(rows, fingerprint) {
  const values = rows.map((row) => `  (${[
    sqlUuid(row.card_print_id),
    sqlUuid(row.card_printing_id),
    sqlUuid(row.species_mapping_id),
    sqlString(row.set_code),
    sqlString(row.number),
    sqlString(row.card_name),
    sqlString(row.finish_key),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ${fingerprint}
-- Scope: ${rows.length} derived species mapping deletes, ${rows.length} child deletes, ${rows.length} parent deletes.
-- No migrations. No global apply.

begin;

create temporary table pkg33b_targets (
  card_print_id uuid primary key,
  card_printing_id uuid not null unique,
  species_mapping_id uuid not null unique,
  set_code text not null,
  card_number text not null,
  card_name text not null,
  finish_key text not null
) on commit drop;

insert into pkg33b_targets (
  card_print_id,
  card_printing_id,
  species_mapping_id,
  set_code,
  card_number,
  card_name,
  finish_key
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_parent_mismatch integer;
  v_child_mismatch integer;
  v_species_mismatch integer;
  v_child_count_mismatch integer;
  v_species_count_mismatch integer;
  v_blocking_refs integer;
  v_deleted_species integer;
  v_deleted_children integer;
  v_deleted_parents integer;
  ref record;
begin
  select count(*) into v_targets from pkg33b_targets;
  if v_targets <> ${rows.length} then
    raise exception '${PACKAGE_ID} target guard failed: expected ${rows.length}, got %', v_targets;
  end if;

  select count(*) into v_parent_mismatch
  from pkg33b_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  where cp.id is null
     or coalesce(cp.set_code, '') <> 'legacy_orphan'
     or coalesce(cp.set_code, '') <> t.set_code
     or coalesce(cp.name, '') <> t.card_name
     or coalesce(cp.number, '') <> t.card_number;
  if v_parent_mismatch <> 0 then
    raise exception '${PACKAGE_ID} parent guard failed: %', v_parent_mismatch;
  end if;

  select count(*) into v_child_mismatch
  from pkg33b_targets t
  left join public.card_printings cpr
    on cpr.id = t.card_printing_id
   and cpr.card_print_id = t.card_print_id
  where cpr.id is null
     or cpr.finish_key <> 'normal'
     or cpr.finish_key <> t.finish_key;
  if v_child_mismatch <> 0 then
    raise exception '${PACKAGE_ID} child guard failed: %', v_child_mismatch;
  end if;

  select count(*) into v_species_mismatch
  from pkg33b_targets t
  left join public.card_print_species cps
    on cps.id = t.species_mapping_id
   and cps.card_print_id = t.card_print_id
  where cps.id is null
     or cps.source <> 'grookai_dex_name_rule_v1'
     or cps.role <> 'primary'
     or cps.active is not true
     or cps.counts_for_completion is not true;
  if v_species_mismatch <> 0 then
    raise exception '${PACKAGE_ID} species guard failed: %', v_species_mismatch;
  end if;

  select count(*) into v_child_count_mismatch
  from pkg33b_targets t
  where (
    select count(*)
    from public.card_printings cpr
    where cpr.card_print_id = t.card_print_id
  ) <> 1;
  if v_child_count_mismatch <> 0 then
    raise exception '${PACKAGE_ID} child-count guard failed: %', v_child_count_mismatch;
  end if;

  select count(*) into v_species_count_mismatch
  from pkg33b_targets t
  where (
    select count(*)
    from public.card_print_species cps
    where cps.card_print_id = t.card_print_id
  ) <> 1;
  if v_species_count_mismatch <> 0 then
    raise exception '${PACKAGE_ID} species-count guard failed: %', v_species_count_mismatch;
  end if;

  for ref in
    select tc.table_schema, tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'card_prints'
      and ccu.column_name = 'id'
      and tc.table_name not in ('card_printings', 'card_print_species')
  loop
    execute format(
      'select count(*) from %I.%I ref join pg_temp.pkg33b_targets t on ref.%I = t.card_print_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_blocking_refs;
    if v_blocking_refs <> 0 then
      raise exception '${PACKAGE_ID} parent dependency guard failed: %.%.% has % refs',
        ref.table_schema, ref.table_name, ref.column_name, v_blocking_refs;
    end if;
  end loop;

  for ref in
    select tc.table_schema, tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'card_printings'
      and ccu.column_name = 'id'
  loop
    execute format(
      'select count(*) from %I.%I ref join pg_temp.pkg33b_targets t on ref.%I = t.card_printing_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_blocking_refs;
    if v_blocking_refs <> 0 then
      raise exception '${PACKAGE_ID} child dependency guard failed: %.%.% has % refs',
        ref.table_schema, ref.table_name, ref.column_name, v_blocking_refs;
    end if;
  end loop;

  delete from public.card_print_species cps
  using pkg33b_targets t
  where cps.id = t.species_mapping_id;
  get diagnostics v_deleted_species = row_count;
  if v_deleted_species <> ${rows.length} then
    raise exception '${PACKAGE_ID} species delete guard failed: expected ${rows.length}, got %', v_deleted_species;
  end if;

  delete from public.card_printings cpr
  using pkg33b_targets t
  where cpr.id = t.card_printing_id;
  get diagnostics v_deleted_children = row_count;
  if v_deleted_children <> ${rows.length} then
    raise exception '${PACKAGE_ID} child delete guard failed: expected ${rows.length}, got %', v_deleted_children;
  end if;

  delete from public.card_prints cp
  using pkg33b_targets t
  where cp.id = t.card_print_id;
  get diagnostics v_deleted_parents = row_count;
  if v_deleted_parents <> ${rows.length} then
    raise exception '${PACKAGE_ID} parent delete guard failed: expected ${rows.length}, got %', v_deleted_parents;
  end if;

  raise notice '${PACKAGE_ID} dry-run passed: species mappings deleted %, children deleted %, parents deleted %, fingerprint ${fingerprint}',
    v_deleted_species, v_deleted_children, v_deleted_parents;
end $$;

rollback;
`;
}

function buildMarkdown(report) {
  return `# PKG-33B Legacy Orphan Species Parent Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-33A legacy orphan species dependency readiness.

No DB writes were committed. No migrations, quarantine, merges, unsupported cleanup, or global apply are authorized by this artifact.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['source_readiness_fingerprint', report.source_readiness_fingerprint],
    ['target_rows', report.summary.target_rows],
    ['species_mapping_deletes_in_dry_run', report.summary.species_mapping_deletes_in_dry_run],
    ['child_deletes_in_dry_run', report.summary.child_deletes_in_dry_run],
    ['parent_deletes_in_dry_run', report.summary.parent_deletes_in_dry_run],
    ['sql_hash', report.sql_hash],
    ['dry_run_sql', report.sql_path],
    ['db_writes_committed', false],
    ['migrations_created', false],
  ])}

## Rows

${markdownTable(
    ['number', 'name', 'parent', 'child', 'species_mapping'],
    report.rows.map((row) => [
      row.number,
      row.card_name,
      row.card_print_id,
      row.card_printing_id,
      row.species_mapping_id,
    ]),
  )}
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const rows = readiness.rows.filter((row) => row.action === 'eligible_for_guarded_dry_run_species_child_parent_delete');
  if (rows.length === 0) throw new Error('No PKG-33B eligible rows found');
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: readiness.fingerprint,
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      species_mapping_id: row.species_mapping_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
    })),
  }));
  const sql = buildSql(rows, fingerprint);
  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    fingerprint,
    source_readiness_fingerprint: readiness.fingerprint,
    sql_hash: sha256(sql),
    sql_path: path.relative(process.cwd(), OUTPUT_SQL),
    safety: {
      db_writes_committed: false,
      migrations_created: false,
      real_apply_authorized: false,
      sql_ends_with_rollback: /\nrollback;\s*$/i.test(sql),
    },
    summary: {
      target_rows: rows.length,
      species_mapping_deletes_in_dry_run: rows.length,
      child_deletes_in_dry_run: rows.length,
      parent_deletes_in_dry_run: rows.length,
    },
    rows,
  };
  await writeText(OUTPUT_SQL, sql);
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    output_sql: path.relative(process.cwd(), OUTPUT_SQL),
    fingerprint,
    sql_hash: report.sql_hash,
    summary: report.summary,
  }, null, 2));
}

await main();
