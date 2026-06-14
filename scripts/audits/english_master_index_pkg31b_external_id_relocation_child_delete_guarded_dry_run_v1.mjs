import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(process.cwd(), 'docs', 'sql');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg31a_external_id_relocation_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg31b_external_id_relocation_child_delete_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg31b_external_id_relocation_child_delete_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg31b_external_id_relocation_child_delete_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

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
    sqlUuid(row.external_mapping.id),
    sqlUuid(row.source.card_printing_id),
    sqlUuid(row.target_child.card_printing_id),
    sqlString(row.external_mapping.source),
    sqlString(row.external_mapping.external_id),
    sqlString(row.source.set_code),
    sqlString(row.source.number),
    sqlString(row.source.card_name),
    sqlString(row.source.finish_key),
    sqlString(row.target.set_key),
    sqlString(row.target.card_number),
    sqlString(row.target_child.card_name),
    sqlString(row.target.source),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ${fingerprint}
-- Scope: ${rows.length} external mapping relocations and ${rows.length} unsupported source child deletes.
-- No parent writes. No migrations. No global apply.

begin;

create temporary table pkg31b_targets (
  mapping_id uuid primary key,
  source_card_printing_id uuid not null,
  target_card_printing_id uuid not null,
  mapping_source text not null,
  external_id text not null,
  source_set_code text not null,
  source_number text not null,
  source_card_name text not null,
  finish_key text not null,
  target_set_code text not null,
  target_number text not null,
  target_card_name text not null,
  target_rule text not null
) on commit drop;

insert into pkg31b_targets (
  mapping_id,
  source_card_printing_id,
  target_card_printing_id,
  mapping_source,
  external_id,
  source_set_code,
  source_number,
  source_card_name,
  finish_key,
  target_set_code,
  target_number,
  target_card_name,
  target_rule
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_bad_mapping_refs integer;
  v_bad_source_children integer;
  v_bad_target_children integer;
  v_duplicate_target_mappings integer;
  v_other_external_mapping_refs integer;
  v_vault_refs integer;
  v_warehouse_refs integer;
  v_truth_refs integer;
  v_justtcg_refs integer;
  v_updated integer;
  v_deleted integer;
begin
  select count(*) into v_targets from pkg31b_targets;
  if v_targets <> ${rows.length} then
    raise exception '${PACKAGE_ID} target guard failed: expected ${rows.length}, got %', v_targets;
  end if;

  select count(*) into v_bad_mapping_refs
  from pkg31b_targets t
  left join public.external_printing_mappings em on em.id = t.mapping_id
  where em.id is null
     or em.card_printing_id <> t.source_card_printing_id
     or em.source <> t.mapping_source
     or em.external_id <> t.external_id;
  if v_bad_mapping_refs <> 0 then
    raise exception '${PACKAGE_ID} mapping ownership guard failed: %', v_bad_mapping_refs;
  end if;

  select count(*) into v_bad_source_children
  from pkg31b_targets t
  left join public.card_printings source_child on source_child.id = t.source_card_printing_id
  left join public.card_prints source_parent on source_parent.id = source_child.card_print_id
  where source_child.id is null
     or source_child.finish_key <> t.finish_key
     or lower(source_parent.set_code) <> lower(t.source_set_code)
     or lower(coalesce(source_parent.number, '')) <> lower(t.source_number)
     or source_parent.name <> t.source_card_name;
  if v_bad_source_children <> 0 then
    raise exception '${PACKAGE_ID} source child guard failed: %', v_bad_source_children;
  end if;

  select count(*) into v_bad_target_children
  from pkg31b_targets t
  left join public.card_printings target_child on target_child.id = t.target_card_printing_id
  left join public.card_prints target_parent on target_parent.id = target_child.card_print_id
  where target_child.id is null
     or target_child.id = t.source_card_printing_id
     or target_child.finish_key <> t.finish_key
     or lower(target_parent.set_code) <> lower(t.target_set_code)
     or lower(coalesce(target_parent.number, '')) <> lower(t.target_number)
     or target_parent.name <> t.target_card_name;
  if v_bad_target_children <> 0 then
    raise exception '${PACKAGE_ID} target child guard failed: %', v_bad_target_children;
  end if;

  select count(*) into v_duplicate_target_mappings
  from pkg31b_targets t
  join public.external_printing_mappings em
    on em.card_printing_id = t.target_card_printing_id
   and em.source = t.mapping_source
   and em.external_id = t.external_id
   and em.id <> t.mapping_id;
  if v_duplicate_target_mappings <> 0 then
    raise exception '${PACKAGE_ID} target duplicate mapping guard failed: %', v_duplicate_target_mappings;
  end if;

  select count(*) into v_other_external_mapping_refs
  from public.external_printing_mappings em
  join pkg31b_targets t on t.source_card_printing_id = em.card_printing_id
  where em.id <> t.mapping_id;
  if v_other_external_mapping_refs <> 0 then
    raise exception '${PACKAGE_ID} source child extra external mapping guard failed: %', v_other_external_mapping_refs;
  end if;

  if to_regclass('public.vault_item_instances') is not null then
    select count(*) into v_vault_refs
    from public.vault_item_instances vii
    join pkg31b_targets t on t.source_card_printing_id = vii.card_printing_id
    where vii.archived_at is null;
  else
    v_vault_refs := 0;
  end if;
  if v_vault_refs <> 0 then
    raise exception '${PACKAGE_ID} vault dependency guard failed: %', v_vault_refs;
  end if;

  if to_regclass('public.canon_warehouse_candidates') is not null then
    select count(*) into v_warehouse_refs
    from public.canon_warehouse_candidates cwc
    join pkg31b_targets t on t.source_card_printing_id = cwc.promoted_card_printing_id;
  else
    v_warehouse_refs := 0;
  end if;
  if v_warehouse_refs <> 0 then
    raise exception '${PACKAGE_ID} warehouse dependency guard failed: %', v_warehouse_refs;
  end if;

  if to_regclass('public.card_printing_truth_reviews') is not null then
    select count(*) into v_truth_refs
    from public.card_printing_truth_reviews tr
    join pkg31b_targets t on t.source_card_printing_id = tr.card_printing_id;
  else
    v_truth_refs := 0;
  end if;
  if v_truth_refs <> 0 then
    raise exception '${PACKAGE_ID} truth review dependency guard failed: %', v_truth_refs;
  end if;

  if to_regclass('public.justtcg_grookai_mappings') is not null then
    select count(*) into v_justtcg_refs
    from public.justtcg_grookai_mappings jgm
    join pkg31b_targets t on t.source_card_printing_id = jgm.card_printing_id;
  else
    v_justtcg_refs := 0;
  end if;
  if v_justtcg_refs <> 0 then
    raise exception '${PACKAGE_ID} justtcg dependency guard failed: %', v_justtcg_refs;
  end if;

  update public.external_printing_mappings em
  set
    card_printing_id = t.target_card_printing_id,
    meta = coalesce(em.meta, '{}'::jsonb)
      || jsonb_build_object(
        'pkg31b_transferred_from_card_printing_id', t.source_card_printing_id::text,
        'pkg31b_transfer_reason', 'external id resolves to existing Master-verified target child',
        'pkg31b_target_rule', t.target_rule,
        'pkg31b_package_fingerprint', ${sqlString(fingerprint)}
      )
  from pkg31b_targets t
  where em.id = t.mapping_id;
  get diagnostics v_updated = row_count;
  if v_updated <> ${rows.length} then
    raise exception '${PACKAGE_ID} mapping update guard failed: expected ${rows.length}, got %', v_updated;
  end if;

  delete from public.card_printings cpr
  using pkg31b_targets t
  where cpr.id = t.source_card_printing_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> ${rows.length} then
    raise exception '${PACKAGE_ID} child delete guard failed: expected ${rows.length}, got %', v_deleted;
  end if;

  raise notice '${PACKAGE_ID} dry-run passed: mappings transferred %, source children deleted %, fingerprint ${fingerprint}', v_updated, v_deleted;
end $$;

rollback;
`;
}

async function executeDryRun(sqlPath, expectedHash) {
  const conn = connectionString();
  if (!conn) throw new Error('Database connection unavailable');
  const sql = await fs.readFile(sqlPath, 'utf8');
  if (sha256(sql) !== expectedHash) throw new Error('SQL hash changed before dry-run execution');
  if (!/\nrollback;\s*$/i.test(sql)) {
    throw new Error('Refusing to execute dry-run SQL that does not end with rollback');
  }
  const client = new Client({ connectionString: conn });
  const notices = [];
  client.on('notice', (notice) => notices.push(notice.message));
  await client.connect();
  try {
    const result = await client.query(sql);
    return {
      dry_run_executed: true,
      committed: false,
      sql_hash: sha256(sql),
      result_count: Array.isArray(result) ? result.length : 1,
      notices,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMarkdown(report) {
  return `# PKG-31B External ID Relocation Child Delete Guarded Dry-Run V1

Rollback-only proof for relocating external mappings to existing Master-verified target children, then deleting the unsupported source child rows.

No DB writes were committed. No migrations were created. No parent writes, merges, quarantine, unsupported cleanup outside this scoped package, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['source_readiness_fingerprint', report.source_readiness_fingerprint],
    ['sql_hash', report.sql_hash],
    ['target_rows', report.summary.target_rows],
    ['mapping_transfers_in_dry_run', report.summary.mapping_transfers_in_dry_run],
    ['source_child_deletes_in_dry_run', report.summary.source_child_deletes_in_dry_run],
    ['committed', report.execution.committed],
    ['notice', report.execution.notices.join(' | ')],
  ])}

## Scope By Target Rule

${markdownTable(['target_rule', 'count'], Object.entries(report.summary.by_target_rule).map(([key, value]) => [key, value]))}
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const rows = readiness.rows.filter((row) => row.classification === 'transfer_ready_existing_target_child');
  if (rows.length === 0) throw new Error('No transfer-ready PKG-31B rows found');
  const byTargetRule = {};
  for (const row of rows) {
    byTargetRule[row.target.source] = (byTargetRule[row.target.source] ?? 0) + 1;
  }
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: readiness.fingerprint,
    rows: rows.map((row) => ({
      mapping_id: row.external_mapping.id,
      source_card_printing_id: row.source.card_printing_id,
      target_card_printing_id: row.target_child.card_printing_id,
      external_id: row.external_mapping.external_id,
      target_rule: row.target.source,
    })),
  }));
  const sql = buildSql(rows, fingerprint);
  const sqlHash = sha256(sql);

  await writeText(OUTPUT_SQL, sql);
  const execution = await executeDryRun(OUTPUT_SQL, sqlHash);

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    fingerprint,
    source_readiness_fingerprint: readiness.fingerprint,
    sql_hash: sqlHash,
    sql_path: path.relative(process.cwd(), OUTPUT_SQL),
    safety: {
      db_writes_committed: false,
      migrations_created: false,
      real_apply_authorized: false,
      sql_ends_with_rollback: /\nrollback;\s*$/i.test(sql),
    },
    summary: {
      target_rows: rows.length,
      mapping_transfers_in_dry_run: rows.length,
      source_child_deletes_in_dry_run: rows.length,
      by_target_rule: byTargetRule,
    },
    execution,
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    output_sql: path.relative(process.cwd(), OUTPUT_SQL),
    fingerprint,
    sql_hash: sqlHash,
    summary: report.summary,
    execution,
    db_writes_committed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
