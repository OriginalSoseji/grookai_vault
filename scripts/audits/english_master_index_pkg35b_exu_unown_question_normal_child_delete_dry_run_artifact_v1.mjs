import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(process.cwd(), 'docs', 'sql');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg35a_exu_unown_question_normal_child_delete_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg35b_exu_unown_question_normal_child_delete_dry_run_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg35b_exu_unown_question_normal_child_delete_dry_run_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg35b_exu_unown_question_normal_child_delete_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE';

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
    sqlUuid(row.supported_child_printing_id),
    sqlString(row.set_code),
    sqlString(row.number),
    sqlString(row.card_name),
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ${fingerprint}
-- Scope: ${rows.length} unsupported normal child delete for exu Unown ?.
-- No parent writes. No migrations. No global apply.

begin;

create temporary table pkg35b_targets (
  card_print_id uuid primary key,
  unsupported_child_printing_id uuid not null unique,
  supported_child_printing_id uuid not null unique,
  set_code text not null,
  card_number text not null,
  card_name text not null
) on commit drop;

insert into pkg35b_targets (
  card_print_id,
  unsupported_child_printing_id,
  supported_child_printing_id,
  set_code,
  card_number,
  card_name
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_parent_mismatch integer;
  v_unsupported_child_mismatch integer;
  v_supported_child_mismatch integer;
  v_child_dependency_refs integer;
  v_deleted_children integer;
  ref record;
begin
  select count(*) into v_targets from pkg35b_targets;
  if v_targets <> ${rows.length} then
    raise exception '${PACKAGE_ID} target guard failed: expected ${rows.length}, got %', v_targets;
  end if;

  select count(*) into v_parent_mismatch
  from pkg35b_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  where cp.id is null
     or cp.set_code <> t.set_code
     or cp.set_code <> 'exu'
     or cp.number <> t.card_number
     or cp.number <> '?'
     or cp.name <> t.card_name
     or cp.name <> 'Unown';
  if v_parent_mismatch <> 0 then
    raise exception '${PACKAGE_ID} parent guard failed: %', v_parent_mismatch;
  end if;

  select count(*) into v_unsupported_child_mismatch
  from pkg35b_targets t
  left join public.card_printings cpr
    on cpr.id = t.unsupported_child_printing_id
   and cpr.card_print_id = t.card_print_id
  where cpr.id is null
     or cpr.finish_key <> 'normal';
  if v_unsupported_child_mismatch <> 0 then
    raise exception '${PACKAGE_ID} unsupported child guard failed: %', v_unsupported_child_mismatch;
  end if;

  select count(*) into v_supported_child_mismatch
  from pkg35b_targets t
  left join public.card_printings cpr
    on cpr.id = t.supported_child_printing_id
   and cpr.card_print_id = t.card_print_id
  where cpr.id is null
     or cpr.finish_key <> 'holo';
  if v_supported_child_mismatch <> 0 then
    raise exception '${PACKAGE_ID} supported holo child guard failed: %', v_supported_child_mismatch;
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
      and ccu.table_name = 'card_printings'
      and ccu.column_name = 'id'
  loop
    execute format(
      'select count(*) from %I.%I ref join pg_temp.pkg35b_targets t on ref.%I = t.unsupported_child_printing_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_child_dependency_refs;
    if v_child_dependency_refs <> 0 then
      raise exception '${PACKAGE_ID} child dependency guard failed: %.%.% has % refs',
        ref.table_schema, ref.table_name, ref.column_name, v_child_dependency_refs;
    end if;
  end loop;

  delete from public.card_printings cpr
  using pkg35b_targets t
  where cpr.id = t.unsupported_child_printing_id;
  get diagnostics v_deleted_children = row_count;
  if v_deleted_children <> ${rows.length} then
    raise exception '${PACKAGE_ID} child delete guard failed: expected ${rows.length}, got %', v_deleted_children;
  end if;

  raise notice '${PACKAGE_ID} dry-run passed: unsupported normal children deleted %, supported holo children preserved %, fingerprint ${fingerprint}',
    v_deleted_children, ${rows.length};
end $$;

rollback;
`;
}

function buildMarkdown(report) {
  return `# PKG-35B EXU Unown Question Normal Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-35A.

No DB writes were committed. No migrations, parent writes, merges, quarantine, or global apply are authorized by this artifact.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['source_readiness_fingerprint', report.source_readiness_fingerprint],
    ['target_rows', report.summary.target_rows],
    ['child_deletes_in_dry_run', report.summary.child_deletes_in_dry_run],
    ['parent_writes', 0],
    ['sql_hash', report.sql_hash],
    ['dry_run_sql', report.sql_path],
    ['db_writes_committed', false],
    ['migrations_created', false],
  ])}
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const rows = readiness.rows.filter((row) => row.action === 'eligible_for_guarded_dry_run_child_delete');
  if (rows.length === 0) throw new Error('No PKG-35B eligible rows found');
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: readiness.fingerprint,
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      supported_child_printing_id: row.supported_child_printing_id,
      set_code: row.set_code,
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
      child_deletes_in_dry_run: rows.length,
      parent_writes: 0,
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
