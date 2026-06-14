import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(process.cwd(), 'docs', 'sql');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg29a_known_card_cosmos_review_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg29b_base_cosmos_overfinish_child_delete_dry_run_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg29b_base_cosmos_overfinish_child_delete_dry_run_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg29b_base_cosmos_overfinish_child_delete_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE';

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
    sqlUuid(row.card_printing_id),
    sqlUuid(row.card_print_id),
    sqlString(row.canonical_set_key),
    sqlString(row.number),
    sqlString(row.card_name),
    sqlString(row.finish_key),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ${fingerprint}
-- Scope: ${rows.length} base cosmos overfinish child deletes.
-- No parent writes. No migrations. No global apply.

begin;

create temporary table pkg29b_targets (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  set_key text not null,
  card_number text not null,
  card_name text not null,
  finish_key text not null
) on commit drop;

insert into pkg29b_targets (
  card_printing_id,
  card_print_id,
  set_key,
  card_number,
  card_name,
  finish_key
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_identity_mismatch integer;
  v_dependency_refs integer;
  v_deleted integer;
begin
  select count(*) into v_targets from pkg29b_targets;
  if v_targets <> ${rows.length} then
    raise exception '${PACKAGE_ID} target guard failed: expected ${rows.length}, got %', v_targets;
  end if;

  select count(*) into v_identity_mismatch
  from pkg29b_targets t
  left join public.card_printings cpr on cpr.id = t.card_printing_id
  left join public.card_prints cp on cp.id = cpr.card_print_id
  where cpr.id is null
     or cp.id is null
     or cpr.card_print_id <> t.card_print_id
     or cpr.finish_key <> 'cosmos'
     or coalesce(cp.set_code, '') <> t.set_key
     or coalesce(cp.name, '') <> t.card_name
     or coalesce(cp.printed_identity_modifier, '') <> ''
     or coalesce(cp.variant_key, '') <> '';
  if v_identity_mismatch <> 0 then
    raise exception '${PACKAGE_ID} identity guard failed: %', v_identity_mismatch;
  end if;

  select
    coalesce((select count(*) from public.external_printing_mappings em join pkg29b_targets t on t.card_printing_id = em.card_printing_id), 0)
    + coalesce((select count(*) from public.vault_item_instances vii join pkg29b_targets t on t.card_printing_id = vii.card_printing_id where vii.archived_at is null), 0)
    + coalesce((select count(*) from public.canon_warehouse_candidates cwc join pkg29b_targets t on t.card_printing_id = cwc.promoted_card_printing_id), 0)
  into v_dependency_refs;
  if v_dependency_refs <> 0 then
    raise exception '${PACKAGE_ID} dependency guard failed: %', v_dependency_refs;
  end if;

  delete from public.card_printings cpr
  using pkg29b_targets t
  where cpr.id = t.card_printing_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> ${rows.length} then
    raise exception '${PACKAGE_ID} child delete guard failed: expected ${rows.length}, got %', v_deleted;
  end if;

  raise notice '${PACKAGE_ID} dry-run passed: children deleted %, fingerprint ${fingerprint}', v_deleted;
end $$;

rollback;
`;
}

function buildMarkdown(report) {
  return `# PKG-29B Base Cosmos Overfinish Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-29A base cosmos overfinish candidates.

No DB writes were committed. No migrations were created. No parent writes, merges, quarantine, or global apply are authorized by this artifact.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['source_readiness_fingerprint', report.source_readiness_fingerprint],
    ['target_rows', report.summary.target_rows],
    ['child_deletes_in_dry_run', report.summary.child_deletes_in_dry_run],
    ['sql_hash', report.sql_hash],
    ['dry_run_sql', report.sql_path],
    ['db_writes_committed', false],
    ['migrations_created', false],
  ])}

## Rows

${markdownTable(
    ['set', 'card', 'child', 'known_finishes'],
    report.rows.map((row) => [
      row.canonical_set_key,
      `${row.number} ${row.card_name} ${row.finish_key}`,
      row.card_printing_id,
      (row.known_index_finishes ?? []).join(', '),
    ]),
  )}
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const rows = readiness.rows.filter((row) => row.classification === 'base_cosmos_overfinish_delete_candidate_no_dependencies');
  if (rows.length === 0) throw new Error('No PKG-29B eligible rows found');
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: readiness.fingerprint,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_key: row.canonical_set_key,
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
    sql_hash: report.sql_hash,
    summary: report.summary,
  }, null, 2));
}

await main();
