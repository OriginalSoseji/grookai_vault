import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(process.cwd(), 'docs', 'sql');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg28a_dependency_blocked_mapping_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg28b_external_mapping_transfer_child_delete_dry_run_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg28b_external_mapping_transfer_child_delete_dry_run_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg28b_external_mapping_transfer_child_delete_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE';

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
  const values = rows.map((row) => {
    const mapping = row.external_mappings[0];
    return `  (${[
      sqlUuid(mapping.id),
      sqlUuid(row.card_printing_id),
      sqlUuid(row.target.target_card_printing_id),
      sqlString(row.canonical_set_key),
      sqlString(row.card_name),
      sqlString(row.finish_key),
      sqlString(mapping.source),
      sqlString(mapping.external_id),
    ].join(', ')})`;
  });

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ${fingerprint}
-- Scope: ${rows.length} external mapping transfers and ${rows.length} unsupported child deletes.
-- No parent writes. No migrations. No global apply.

begin;

create temporary table pkg28b_targets (
  mapping_id uuid primary key,
  source_card_printing_id uuid not null,
  target_card_printing_id uuid not null,
  set_key text not null,
  card_name text not null,
  finish_key text not null,
  source text not null,
  external_id text not null
) on commit drop;

insert into pkg28b_targets (
  mapping_id,
  source_card_printing_id,
  target_card_printing_id,
  set_key,
  card_name,
  finish_key,
  source,
  external_id
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_bad_mapping_refs integer;
  v_missing_children integer;
  v_finish_mismatch integer;
  v_duplicate_target_mappings integer;
  v_other_external_mapping_refs integer;
  v_vault_refs integer;
  v_warehouse_refs integer;
  v_updated integer;
  v_deleted integer;
begin
  select count(*) into v_targets from pkg28b_targets;
  if v_targets <> ${rows.length} then
    raise exception '${PACKAGE_ID} target guard failed: expected ${rows.length}, got %', v_targets;
  end if;

  select count(*) into v_bad_mapping_refs
  from pkg28b_targets t
  left join public.external_printing_mappings em on em.id = t.mapping_id
  where em.id is null
     or em.card_printing_id <> t.source_card_printing_id
     or em.source <> t.source
     or em.external_id <> t.external_id;
  if v_bad_mapping_refs <> 0 then
    raise exception '${PACKAGE_ID} mapping ownership guard failed: %', v_bad_mapping_refs;
  end if;

  select count(*) into v_missing_children
  from pkg28b_targets t
  left join public.card_printings source_child on source_child.id = t.source_card_printing_id
  left join public.card_printings target_child on target_child.id = t.target_card_printing_id
  where source_child.id is null
     or target_child.id is null
     or source_child.id = target_child.id;
  if v_missing_children <> 0 then
    raise exception '${PACKAGE_ID} child existence guard failed: %', v_missing_children;
  end if;

  select count(*) into v_finish_mismatch
  from pkg28b_targets t
  join public.card_printings source_child on source_child.id = t.source_card_printing_id
  join public.card_printings target_child on target_child.id = t.target_card_printing_id
  where source_child.finish_key <> t.finish_key
     or target_child.finish_key <> t.finish_key;
  if v_finish_mismatch <> 0 then
    raise exception '${PACKAGE_ID} finish guard failed: %', v_finish_mismatch;
  end if;

  select count(*) into v_duplicate_target_mappings
  from pkg28b_targets t
  join public.external_printing_mappings em
    on em.card_printing_id = t.target_card_printing_id
   and em.source = t.source
   and em.external_id = t.external_id
   and em.id <> t.mapping_id;
  if v_duplicate_target_mappings <> 0 then
    raise exception '${PACKAGE_ID} target duplicate mapping guard failed: %', v_duplicate_target_mappings;
  end if;

  select count(*) into v_other_external_mapping_refs
  from public.external_printing_mappings em
  join pkg28b_targets t on t.source_card_printing_id = em.card_printing_id
  where em.id <> t.mapping_id;
  if v_other_external_mapping_refs <> 0 then
    raise exception '${PACKAGE_ID} source child extra external mapping guard failed: %', v_other_external_mapping_refs;
  end if;

  select count(*) into v_vault_refs
  from public.vault_item_instances vii
  join pkg28b_targets t on t.source_card_printing_id = vii.card_printing_id
  where vii.archived_at is null;
  if v_vault_refs <> 0 then
    raise exception '${PACKAGE_ID} vault dependency guard failed: %', v_vault_refs;
  end if;

  select count(*) into v_warehouse_refs
  from public.canon_warehouse_candidates cwc
  join pkg28b_targets t on t.source_card_printing_id = cwc.promoted_card_printing_id;
  if v_warehouse_refs <> 0 then
    raise exception '${PACKAGE_ID} warehouse dependency guard failed: %', v_warehouse_refs;
  end if;

  update public.external_printing_mappings em
  set
    card_printing_id = t.target_card_printing_id,
    meta = coalesce(em.meta, '{}'::jsonb)
      || jsonb_build_object(
        'pkg28b_transferred_from_card_printing_id', t.source_card_printing_id::text,
        'pkg28b_transfer_reason', 'external mapping belongs to existing master-verified H-number child',
        'pkg28b_package_fingerprint', ${sqlString(fingerprint)}
      )
  from pkg28b_targets t
  where em.id = t.mapping_id;
  get diagnostics v_updated = row_count;
  if v_updated <> ${rows.length} then
    raise exception '${PACKAGE_ID} mapping update guard failed: expected ${rows.length}, got %', v_updated;
  end if;

  delete from public.card_printings cpr
  using pkg28b_targets t
  where cpr.id = t.source_card_printing_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> ${rows.length} then
    raise exception '${PACKAGE_ID} child delete guard failed: expected ${rows.length}, got %', v_deleted;
  end if;

  raise notice '${PACKAGE_ID} dry-run passed: mappings transferred %, children deleted %, fingerprint ${fingerprint}', v_updated, v_deleted;
end $$;

rollback;
`;
}

function buildMarkdown(report) {
  return `# PKG-28B External Mapping Transfer Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-28A transfer-ready rows.

No DB writes were committed. No migrations were created. No parent writes, merges, unsupported cleanup, quarantine, or global apply are authorized by this artifact.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['source_readiness_fingerprint', report.source_readiness_fingerprint],
    ['target_rows', report.summary.target_rows],
    ['mapping_transfers', report.summary.mapping_transfers],
    ['child_deletes_in_dry_run', report.summary.child_deletes_in_dry_run],
    ['sql_hash', report.sql_hash],
    ['dry_run_sql', report.sql_path],
    ['db_writes_committed', false],
    ['migrations_created', false],
  ])}

## Rows

${markdownTable(
    ['set', 'card', 'source_child', 'mapping', 'target_child'],
    report.rows.map((row) => [
      row.canonical_set_key,
      `${row.number} ${row.card_name} ${row.finish_key}`,
      row.card_printing_id,
      `${row.external_mappings[0].source}:${row.external_mappings[0].external_id}`,
      row.target.target_card_printing_id,
    ]),
  )}
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const rows = readiness.rows.filter((row) => row.classification === 'transfer_ready_external_mapping_to_verified_target_child');
  if (rows.length === 0) {
    throw new Error('No PKG-28B transfer-ready rows found');
  }
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: readiness.fingerprint,
    rows: rows.map((row) => ({
      source_card_printing_id: row.card_printing_id,
      target_card_printing_id: row.target.target_card_printing_id,
      mapping_id: row.external_mappings[0].id,
      source: row.external_mappings[0].source,
      external_id: row.external_mappings[0].external_id,
    })),
  }));
  const sql = buildSql(rows, fingerprint);
  const sqlHash = sha256(sql);
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
      mapping_transfers: rows.length,
      child_deletes_in_dry_run: rows.length,
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
    sql_hash: sqlHash,
    summary: report.summary,
  }, null, 2));
}

await main();
