import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(process.cwd(), 'docs', 'sql');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg34a_legacy_orphan_zero_pricing_dependency_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg34b_legacy_orphan_zero_pricing_delete_dry_run_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg34b_legacy_orphan_zero_pricing_delete_dry_run_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg34b_legacy_orphan_zero_pricing_delete_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE';

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
    sqlUuid(row.price_curve_id),
    sqlUuid(row.ebay_snapshot_id),
    sqlString(row.ebay_latest_source),
    sqlUuid(row.pricing_job_id),
    sqlString(row.number),
    sqlString(row.card_name),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ${fingerprint}
-- Scope: ${rows.length} zero-pricing legacy_orphan cleanup rows.
-- No migrations. No global apply.

begin;

create temporary table pkg34b_targets (
  card_print_id uuid primary key,
  card_printing_id uuid not null unique,
  species_mapping_id uuid not null unique,
  price_curve_id uuid not null unique,
  ebay_snapshot_id uuid not null unique,
  ebay_latest_source text not null,
  pricing_job_id uuid not null unique,
  card_number text not null,
  card_name text not null
) on commit drop;

insert into pkg34b_targets (
  card_print_id,
  card_printing_id,
  species_mapping_id,
  price_curve_id,
  ebay_snapshot_id,
  ebay_latest_source,
  pricing_job_id,
  card_number,
  card_name
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_bad_parent integer;
  v_bad_child integer;
  v_bad_species integer;
  v_bad_curve integer;
  v_bad_snapshot integer;
  v_bad_latest integer;
  v_bad_job integer;
  v_blocking_refs integer;
  v_deleted_curves integer;
  v_deleted_snapshots integer;
  v_deleted_latest integer;
  v_deleted_jobs integer;
  v_deleted_species integer;
  v_deleted_children integer;
  v_deleted_parents integer;
  ref record;
begin
  select count(*) into v_targets from pkg34b_targets;
  if v_targets <> ${rows.length} then
    raise exception '${PACKAGE_ID} target guard failed: expected ${rows.length}, got %', v_targets;
  end if;

  select count(*) into v_bad_parent
  from pkg34b_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  where cp.id is null
     or cp.set_code <> 'legacy_orphan'
     or cp.number <> t.card_number
     or cp.name <> t.card_name;
  if v_bad_parent <> 0 then
    raise exception '${PACKAGE_ID} parent guard failed: %', v_bad_parent;
  end if;

  select count(*) into v_bad_child
  from pkg34b_targets t
  left join public.card_printings cpr on cpr.id = t.card_printing_id and cpr.card_print_id = t.card_print_id
  where cpr.id is null or cpr.finish_key <> 'normal';
  if v_bad_child <> 0 then
    raise exception '${PACKAGE_ID} child guard failed: %', v_bad_child;
  end if;

  select count(*) into v_bad_species
  from pkg34b_targets t
  left join public.card_print_species cps on cps.id = t.species_mapping_id and cps.card_print_id = t.card_print_id
  where cps.id is null
     or cps.source <> 'grookai_dex_name_rule_v1'
     or cps.role <> 'primary'
     or cps.active is not true
     or cps.counts_for_completion is not true;
  if v_bad_species <> 0 then
    raise exception '${PACKAGE_ID} species guard failed: %', v_bad_species;
  end if;

  select count(*) into v_bad_curve
  from pkg34b_targets t
  left join public.card_print_price_curves cpc on cpc.id = t.price_curve_id and cpc.card_print_id = t.card_print_id
  where cpc.id is null
     or coalesce(cpc.listing_count, 0) <> 0
     or coalesce(cpc.confidence, 0) > 0.2
     or cpc.nm_median is not null or cpc.nm_floor is not null or coalesce(cpc.nm_samples, 0) <> 0
     or cpc.lp_median is not null or cpc.lp_floor is not null or coalesce(cpc.lp_samples, 0) <> 0
     or cpc.mp_median is not null or cpc.mp_floor is not null or coalesce(cpc.mp_samples, 0) <> 0
     or cpc.hp_median is not null or cpc.hp_floor is not null or coalesce(cpc.hp_samples, 0) <> 0
     or cpc.dmg_median is not null or cpc.dmg_floor is not null or coalesce(cpc.dmg_samples, 0) <> 0;
  if v_bad_curve <> 0 then
    raise exception '${PACKAGE_ID} price curve guard failed: %', v_bad_curve;
  end if;

  select count(*) into v_bad_snapshot
  from pkg34b_targets t
  left join public.ebay_active_price_snapshots eaps on eaps.id = t.ebay_snapshot_id and eaps.card_print_id = t.card_print_id
  where eaps.id is null
     or eaps.source <> 'ebay_browse'
     or eaps.listing_count <> 0
     or eaps.raw_sample_count_nm <> 0
     or eaps.raw_sample_count_lp <> 0
     or eaps.nm_floor is not null
     or eaps.nm_median is not null
     or eaps.lp_floor is not null
     or eaps.lp_median is not null;
  if v_bad_snapshot <> 0 then
    raise exception '${PACKAGE_ID} ebay snapshot guard failed: %', v_bad_snapshot;
  end if;

  select count(*) into v_bad_latest
  from pkg34b_targets t
  left join public.ebay_active_prices_latest eapl on eapl.card_print_id = t.card_print_id and eapl.source = t.ebay_latest_source
  where eapl.card_print_id is null
     or eapl.source <> 'ebay_browse'
     or eapl.listing_count <> 0
     or eapl.confidence > 0.2
     or eapl.nm_floor is not null
     or eapl.nm_median is not null
     or eapl.lp_floor is not null
     or eapl.lp_median is not null;
  if v_bad_latest <> 0 then
    raise exception '${PACKAGE_ID} ebay latest guard failed: %', v_bad_latest;
  end if;

  select count(*) into v_bad_job
  from pkg34b_targets t
  left join public.pricing_jobs pj on pj.id = t.pricing_job_id and pj.card_print_id = t.card_print_id
  where pj.id is null
     or pj.reason <> 'scheduled_refresh'
     or pj.status <> 'done'
     or pj.attempts <> 1
     or pj.requester_user_id is not null
     or pj.error is not null
     or pj.locked_at is not null
     or pj.locked_by is not null;
  if v_bad_job <> 0 then
    raise exception '${PACKAGE_ID} pricing job guard failed: %', v_bad_job;
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
      and tc.table_name not in (
        'card_printings',
        'card_print_species',
        'card_print_price_curves',
        'ebay_active_price_snapshots',
        'ebay_active_prices_latest',
        'pricing_jobs'
      )
  loop
    execute format(
      'select count(*) from %I.%I ref join pg_temp.pkg34b_targets t on ref.%I = t.card_print_id',
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
      'select count(*) from %I.%I ref join pg_temp.pkg34b_targets t on ref.%I = t.card_printing_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_blocking_refs;
    if v_blocking_refs <> 0 then
      raise exception '${PACKAGE_ID} child dependency guard failed: %.%.% has % refs',
        ref.table_schema, ref.table_name, ref.column_name, v_blocking_refs;
    end if;
  end loop;

  delete from public.card_print_price_curves cpc using pkg34b_targets t where cpc.id = t.price_curve_id;
  get diagnostics v_deleted_curves = row_count;
  delete from public.ebay_active_price_snapshots eaps using pkg34b_targets t where eaps.id = t.ebay_snapshot_id;
  get diagnostics v_deleted_snapshots = row_count;
  delete from public.ebay_active_prices_latest eapl using pkg34b_targets t where eapl.card_print_id = t.card_print_id and eapl.source = t.ebay_latest_source;
  get diagnostics v_deleted_latest = row_count;
  delete from public.pricing_jobs pj using pkg34b_targets t where pj.id = t.pricing_job_id;
  get diagnostics v_deleted_jobs = row_count;
  delete from public.card_print_species cps using pkg34b_targets t where cps.id = t.species_mapping_id;
  get diagnostics v_deleted_species = row_count;
  delete from public.card_printings cpr using pkg34b_targets t where cpr.id = t.card_printing_id;
  get diagnostics v_deleted_children = row_count;
  delete from public.card_prints cp using pkg34b_targets t where cp.id = t.card_print_id;
  get diagnostics v_deleted_parents = row_count;

  if v_deleted_curves <> ${rows.length}
     or v_deleted_snapshots <> ${rows.length}
     or v_deleted_latest <> ${rows.length}
     or v_deleted_jobs <> ${rows.length}
     or v_deleted_species <> ${rows.length}
     or v_deleted_children <> ${rows.length}
     or v_deleted_parents <> ${rows.length} then
    raise exception '${PACKAGE_ID} delete count guard failed: curves %, snapshots %, latest %, jobs %, species %, children %, parents %',
      v_deleted_curves, v_deleted_snapshots, v_deleted_latest, v_deleted_jobs, v_deleted_species, v_deleted_children, v_deleted_parents;
  end if;

  raise notice '${PACKAGE_ID} dry-run passed: pricing rows deleted %, species %, children %, parents %, fingerprint ${fingerprint}',
    v_deleted_curves + v_deleted_snapshots + v_deleted_latest + v_deleted_jobs,
    v_deleted_species,
    v_deleted_children,
    v_deleted_parents;
end $$;

rollback;
`;
}

function buildMarkdown(report) {
  return `# PKG-34B Legacy Orphan Zero Pricing Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-34A zero-pricing legacy orphan readiness.

No DB writes were committed. No migrations, quarantine, merges, unsupported cleanup, or global apply are authorized by this artifact.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['source_readiness_fingerprint', report.source_readiness_fingerprint],
    ['target_rows', report.summary.target_rows],
    ['pricing_dependency_deletes_in_dry_run', report.summary.pricing_dependency_deletes_in_dry_run],
    ['species_mapping_deletes_in_dry_run', report.summary.species_mapping_deletes_in_dry_run],
    ['child_deletes_in_dry_run', report.summary.child_deletes_in_dry_run],
    ['parent_deletes_in_dry_run', report.summary.parent_deletes_in_dry_run],
    ['sql_hash', report.sql_hash],
    ['dry_run_sql', report.sql_path],
    ['db_writes_committed', false],
    ['migrations_created', false],
  ])}
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const rows = readiness.rows.filter((row) => row.action === 'eligible_for_guarded_dry_run_zero_pricing_species_child_parent_delete');
  if (rows.length === 0) throw new Error('No PKG-34B eligible rows found');
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: readiness.fingerprint,
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      species_mapping_id: row.species_mapping_id,
      price_curve_id: row.price_curve_id,
      ebay_snapshot_id: row.ebay_snapshot_id,
      ebay_latest_source: row.ebay_latest_source,
      pricing_job_id: row.pricing_job_id,
      number: row.number,
      card_name: row.card_name,
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
      pricing_dependency_deletes_in_dry_run: rows.length * 4,
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
