import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(process.cwd(), 'docs', 'sql');
const LANES_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg32a_parenthetical_name_qualifier_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg32a_parenthetical_name_qualifier_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg32a_parenthetical_name_qualifier_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES';

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

function baseName(value) {
  return normalizeText(String(value ?? '').replace(/\s*\([^)]*\)\s*$/u, ''));
}

function masterKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.finish_key),
  ].join('|');
}

function buildMasterIndex(printings) {
  const index = new Map();
  for (const row of printings) {
    if (row.status !== 'master_verified') continue;
    const key = masterKey(row);
    const rows = index.get(key) ?? [];
    rows.push(row);
    index.set(key, rows);
  }
  return index;
}

function buildCandidates(lanes, masterIndex) {
  const byParent = new Map();
  const blocked = [];
  for (const row of lanes.rows ?? []) {
    if (row.lane !== 'source_coverage_or_alias_gap') continue;
    const key = [
      normalizeText(row.canonical_set_key ?? row.set_code),
      normalizeNumber(row.card_number),
      normalizeText(row.finish_key),
    ].join('|');
    const exactFacts = (masterIndex.get(key) ?? [])
      .filter((fact) => baseName(fact.card_name) === baseName(row.card_name));
    const names = [...new Set(exactFacts.map((fact) => fact.card_name))];
    if (names.length !== 1 || names[0] === row.card_name) {
      blocked.push({
        ...row,
        reason: names.length === 0
          ? 'no Master-verified parenthetical qualifier fact matched this row'
          : 'ambiguous or unchanged Master name match',
        exact_master_names: names,
      });
      continue;
    }
    const targetName = names[0];
    const entry = byParent.get(row.card_print_id) ?? {
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      old_name: row.card_name,
      new_name: targetName,
      child_rows: [],
      master_facts: [],
    };
    if (entry.new_name !== targetName) {
      blocked.push({
        ...row,
        reason: 'same parent resolved to multiple target names',
        exact_master_names: [entry.new_name, targetName],
      });
      continue;
    }
    entry.child_rows.push({
      card_printing_id: row.card_printing_id,
      finish_key: row.finish_key,
    });
    entry.master_facts.push(...exactFacts.map((fact) => ({
      set_key: fact.set_key,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: fact.finish_key,
      source_count: fact.source_count,
      sources: fact.sources,
    })));
    byParent.set(row.card_print_id, entry);
  }
  return { candidates: [...byParent.values()], blocked };
}

function buildSql(candidates, fingerprint) {
  const values = candidates.map((row) => `  (${[
    sqlUuid(row.card_print_id),
    sqlString(row.set_code),
    sqlString(row.number),
    sqlString(row.number_plain),
    sqlString(row.old_name),
    sqlString(row.new_name),
    row.child_rows.length,
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: ${fingerprint}
-- Scope: ${candidates.length} parent name qualifier updates; no child writes.
-- No migrations. No global apply.

begin;

create temporary table pkg32a_targets (
  card_print_id uuid primary key,
  set_code text not null,
  number text not null,
  number_plain text,
  old_name text not null,
  new_name text not null,
  expected_child_rows integer not null
) on commit drop;

insert into pkg32a_targets (
  card_print_id,
  set_code,
  number,
  number_plain,
  old_name,
  new_name,
  expected_child_rows
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_bad_parent_refs integer;
  v_duplicate_target_parent integer;
  v_identity_refs integer;
  v_updated integer;
  v_child_rows integer;
begin
  select count(*) into v_targets from pkg32a_targets;
  if v_targets <> ${candidates.length} then
    raise exception '${PACKAGE_ID} target guard failed: expected ${candidates.length}, got %', v_targets;
  end if;

  select count(*) into v_bad_parent_refs
  from pkg32a_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  where cp.id is null
     or lower(cp.set_code) <> lower(t.set_code)
     or lower(coalesce(cp.number, '')) <> lower(t.number)
     or lower(coalesce(cp.number_plain, '')) <> lower(coalesce(t.number_plain, ''))
     or cp.name <> t.old_name;
  if v_bad_parent_refs <> 0 then
    raise exception '${PACKAGE_ID} parent ownership guard failed: %', v_bad_parent_refs;
  end if;

  select count(*) into v_duplicate_target_parent
  from pkg32a_targets t
  join public.card_prints cp
    on cp.id <> t.card_print_id
   and lower(cp.set_code) = lower(t.set_code)
   and lower(coalesce(cp.number, '')) = lower(t.number)
   and cp.name = t.new_name;
  if v_duplicate_target_parent <> 0 then
    raise exception '${PACKAGE_ID} duplicate target parent guard failed: %', v_duplicate_target_parent;
  end if;

  if to_regclass('public.card_print_identity') is not null then
    select count(*) into v_identity_refs
    from public.card_print_identity cpi
    join pkg32a_targets t on t.card_print_id = cpi.card_print_id
    where cpi.is_active is true;
  else
    v_identity_refs := 0;
  end if;
  if v_identity_refs <> 0 then
    raise exception '${PACKAGE_ID} active identity guard failed: %', v_identity_refs;
  end if;

  select count(*) into v_child_rows
  from public.card_printings cpr
  join pkg32a_targets t on t.card_print_id = cpr.card_print_id;
  if v_child_rows <> (select sum(expected_child_rows)::integer from pkg32a_targets) then
    raise exception '${PACKAGE_ID} child scope guard failed: expected %, got %',
      (select sum(expected_child_rows)::integer from pkg32a_targets), v_child_rows;
  end if;

  update public.card_prints cp
  set name = t.new_name
  from pkg32a_targets t
  where cp.id = t.card_print_id;
  get diagnostics v_updated = row_count;
  if v_updated <> ${candidates.length} then
    raise exception '${PACKAGE_ID} update guard failed: expected ${candidates.length}, got %', v_updated;
  end if;

  raise notice '${PACKAGE_ID} dry-run passed: parent names updated %, child writes 0, fingerprint ${fingerprint}', v_updated;
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
  return `# PKG-32A Parenthetical Name Qualifier Guarded Dry-Run V1

Rollback-only proof for parent name updates where Grookai has a generic trainer card name and the Master Index has the externally verified parenthetical qualifier.

No DB writes were committed. No migrations were created. No child rows were inserted, updated, or deleted.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['sql_hash', report.sql_hash],
    ['parent_updates_in_dry_run', report.summary.parent_updates_in_dry_run],
    ['affected_child_rows', report.summary.affected_child_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['committed', report.execution.committed],
    ['notice', report.execution.notices.join(' | ')],
  ])}

## Parent Updates

${markdownTable(
    ['set', 'number', 'old_name', 'new_name', 'child_rows'],
    report.candidates.map((row) => [
      row.set_code,
      row.number,
      row.old_name,
      row.new_name,
      row.child_rows.length,
    ]),
  )}
`;
}

async function main() {
  const lanes = await readJson(LANES_JSON);
  const printings = await readJson(PRINTINGS_JSON);
  const masterIndex = buildMasterIndex(printings.printings ?? []);
  const { candidates, blocked } = buildCandidates(lanes, masterIndex);
  if (candidates.length === 0) throw new Error('No PKG-32A parenthetical name qualifier candidates found');

  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    lanes_generated_at: lanes.generated_at,
    candidates: candidates.map((row) => ({
      card_print_id: row.card_print_id,
      old_name: row.old_name,
      new_name: row.new_name,
      child_rows: row.child_rows.map((child) => child.card_printing_id).sort(),
    })),
  }));
  const sql = buildSql(candidates, fingerprint);
  const sqlHash = sha256(sql);
  await writeText(OUTPUT_SQL, sql);
  const execution = await executeDryRun(OUTPUT_SQL, sqlHash);

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    fingerprint,
    sql_hash: sqlHash,
    sql_path: path.relative(process.cwd(), OUTPUT_SQL),
    safety: {
      db_writes_committed: false,
      migrations_created: false,
      real_apply_authorized: false,
      parent_writes_in_dry_run: candidates.length,
      child_writes_in_dry_run: 0,
      sql_ends_with_rollback: /\nrollback;\s*$/i.test(sql),
    },
    summary: {
      parent_updates_in_dry_run: candidates.length,
      affected_child_rows: candidates.reduce((sum, row) => sum + row.child_rows.length, 0),
      blocked_rows: blocked.length,
      by_set: candidates.reduce((acc, row) => {
        acc[row.set_code] = (acc[row.set_code] ?? 0) + 1;
        return acc;
      }, {}),
    },
    execution,
    candidates,
    blocked,
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
