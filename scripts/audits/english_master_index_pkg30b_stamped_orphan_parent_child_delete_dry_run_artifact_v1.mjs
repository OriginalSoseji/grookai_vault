import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(process.cwd(), 'docs', 'sql');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg30a_stamped_orphan_parent_cleanup_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg30b_stamped_orphan_parent_child_delete_dry_run_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg30b_stamped_orphan_parent_child_delete_dry_run_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg30b_stamped_orphan_parent_child_delete_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-30B-STAMPED-ORPHAN-PARENT-CHILD-DELETE';

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
    sqlString(row.canonical_set_key),
    sqlString(row.number),
    sqlString(row.card_name),
    sqlString(row.finish_key),
    sqlString(row.variant_key || row.printed_identity_modifier),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ${fingerprint}
-- Scope: ${rows.length} isolated stamped parent deletes and ${rows.length} child deletes.
-- No migrations. No global apply.

begin;

create temporary table pkg30b_targets (
  card_print_id uuid primary key,
  card_printing_id uuid not null unique,
  set_key text not null,
  card_number text not null,
  card_name text not null,
  finish_key text not null,
  variant_key text not null
) on commit drop;

insert into pkg30b_targets (
  card_print_id,
  card_printing_id,
  set_key,
  card_number,
  card_name,
  finish_key,
  variant_key
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_identity_mismatch integer;
  v_child_count_mismatch integer;
  v_child_dependency_refs integer;
  v_parent_dependency_refs integer;
  v_deleted_children integer;
  v_deleted_parents integer;
begin
  select count(*) into v_targets from pkg30b_targets;
  if v_targets <> ${rows.length} then
    raise exception '${PACKAGE_ID} target guard failed: expected ${rows.length}, got %', v_targets;
  end if;

  select count(*) into v_identity_mismatch
  from pkg30b_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  left join public.card_printings cpr on cpr.id = t.card_printing_id and cpr.card_print_id = cp.id
  where cp.id is null
     or cpr.id is null
     or cpr.finish_key <> 'cosmos'
     or coalesce(cp.set_code, '') <> t.set_key
     or coalesce(cp.name, '') <> t.card_name
     or coalesce(cp.variant_key, '') <> t.variant_key;
  if v_identity_mismatch <> 0 then
    raise exception '${PACKAGE_ID} identity guard failed: %', v_identity_mismatch;
  end if;

  select count(*) into v_child_count_mismatch
  from pkg30b_targets t
  where (
    select count(*)
    from public.card_printings cpr
    where cpr.card_print_id = t.card_print_id
  ) <> 1;
  if v_child_count_mismatch <> 0 then
    raise exception '${PACKAGE_ID} child-count guard failed: %', v_child_count_mismatch;
  end if;

  select
    coalesce((select count(*) from public.external_printing_mappings em join pkg30b_targets t on t.card_printing_id = em.card_printing_id), 0)
    + coalesce((select count(*) from public.vault_item_instances vii join pkg30b_targets t on t.card_printing_id = vii.card_printing_id where vii.archived_at is null), 0)
    + coalesce((select count(*) from public.canon_warehouse_candidates cwc join pkg30b_targets t on t.card_printing_id = cwc.promoted_card_printing_id), 0)
  into v_child_dependency_refs;
  if v_child_dependency_refs <> 0 then
    raise exception '${PACKAGE_ID} child dependency guard failed: %', v_child_dependency_refs;
  end if;

  select
    coalesce((select count(*) from public.card_print_identity cpi join pkg30b_targets t on t.card_print_id = cpi.card_print_id where cpi.is_active is true), 0)
    + coalesce((select count(*) from public.external_mappings em join pkg30b_targets t on t.card_print_id = em.card_print_id), 0)
    + coalesce((select count(*) from public.card_print_species cps join pkg30b_targets t on t.card_print_id = cps.card_print_id), 0)
    + coalesce((select count(*) from public.canon_warehouse_candidates cwc join pkg30b_targets t on t.card_print_id = cwc.promoted_card_print_id), 0)
  into v_parent_dependency_refs;
  if v_parent_dependency_refs <> 0 then
    raise exception '${PACKAGE_ID} parent dependency guard failed: %', v_parent_dependency_refs;
  end if;

  delete from public.card_printings cpr
  using pkg30b_targets t
  where cpr.id = t.card_printing_id;
  get diagnostics v_deleted_children = row_count;
  if v_deleted_children <> ${rows.length} then
    raise exception '${PACKAGE_ID} child delete guard failed: expected ${rows.length}, got %', v_deleted_children;
  end if;

  delete from public.card_prints cp
  using pkg30b_targets t
  where cp.id = t.card_print_id;
  get diagnostics v_deleted_parents = row_count;
  if v_deleted_parents <> ${rows.length} then
    raise exception '${PACKAGE_ID} parent delete guard failed: expected ${rows.length}, got %', v_deleted_parents;
  end if;

  raise notice '${PACKAGE_ID} dry-run passed: children deleted %, parents deleted %, fingerprint ${fingerprint}', v_deleted_children, v_deleted_parents;
end $$;

rollback;
`;
}

function buildMarkdown(report) {
  return `# PKG-30B Stamped Orphan Parent Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-30A isolated stamped orphan parent cleanup candidates.

No DB writes were committed. No migrations, quarantine, merges, or global apply are authorized by this artifact.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['source_readiness_fingerprint', report.source_readiness_fingerprint],
    ['target_rows', report.summary.target_rows],
    ['child_deletes_in_dry_run', report.summary.child_deletes_in_dry_run],
    ['parent_deletes_in_dry_run', report.summary.parent_deletes_in_dry_run],
    ['sql_hash', report.sql_hash],
    ['dry_run_sql', report.sql_path],
    ['db_writes_committed', false],
    ['migrations_created', false],
  ])}

## Rows

${markdownTable(
    ['set', 'card', 'variant', 'parent', 'child'],
    report.rows.map((row) => [
      row.canonical_set_key,
      `${row.number} ${row.card_name} ${row.finish_key}`,
      row.variant_key || row.printed_identity_modifier,
      row.card_print_id,
      row.card_printing_id,
    ]),
  )}
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const rows = readiness.rows.filter((row) => row.action === 'eligible_for_guarded_dry_run_parent_and_child_delete');
  if (rows.length === 0) throw new Error('No PKG-30B eligible rows found');
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: readiness.fingerprint,
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      set_key: row.canonical_set_key,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      variant_key: row.variant_key || row.printed_identity_modifier,
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
