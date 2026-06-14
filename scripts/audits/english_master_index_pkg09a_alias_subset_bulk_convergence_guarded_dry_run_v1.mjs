import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09_alias_subset_bulk_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_transaction_v1.sql');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE';
const CREATED_BY = 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

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

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function parentKey(row) {
  return [row.set_key, normalizeNumber(row.card_number), normalizeText(row.card_name)].join('|');
}

function existingParentId(row) {
  return row.host_parent_matches?.[0]?.card_print_id ?? row.target_orphan_parent_matches?.[0]?.card_print_id ?? null;
}

function buildPlannedRows(readiness) {
  const candidateRows = readiness.rows.filter((row) => !row.blocked_reason);
  const parentUpdatesById = new Map();
  const parentInsertsByKey = new Map();
  const childInserts = [];
  const mappingInsertsByKey = new Map();

  for (const row of candidateRows) {
    const existingId = existingParentId(row);
    if (existingId) {
      parentUpdatesById.set(existingId, {
        card_print_id: existingId,
        target_set_id: row.target_set_id,
        target_set_code: row.set_key,
        target_number: row.card_number,
        target_name: row.card_name,
        source_lane: row.readiness_lane,
      });
    }
  }

  for (const row of candidateRows.filter((item) => item.readiness_lane === 'existing_set_parent_child_insert_candidate')) {
    const key = parentKey(row);
    if (!parentInsertsByKey.has(key)) {
      const parentId = crypto.randomUUID();
      parentInsertsByKey.set(key, {
        card_print_id: parentId,
        set_id: row.target_set_id,
        set_code: row.set_key,
        number: row.card_number,
        name: row.card_name,
        rarity: null,
        variant_key: '',
        external_ids: Object.fromEntries(row.external_ids.map((item) => [item.source, item.external_id])),
        ai_metadata: {
          package_id: PACKAGE_ID,
          source: PROVENANCE_SOURCE,
          sources: row.sources,
          evidence_urls: row.evidence_urls,
        },
      });
      for (const external of row.external_ids) {
        mappingInsertsByKey.set(`${parentId}|${external.source}|${external.external_id}`, {
          source: external.source,
          external_id: external.external_id,
          card_print_id: parentId,
          meta: {
            package_id: PACKAGE_ID,
            set_key: row.set_key,
            card_number: row.card_number,
            card_name: row.card_name,
          },
        });
      }
    }
  }

  for (const row of candidateRows) {
    let parentId = null;
    if (row.readiness_lane === 'existing_set_parent_child_insert_candidate') {
      parentId = parentInsertsByKey.get(parentKey(row))?.card_print_id;
    } else if (row.readiness_lane === 'planned_parent_extra_child_insert_candidate') {
      parentId = parentInsertsByKey.get(parentKey(row))?.card_print_id;
    } else if (
      row.readiness_lane === 'target_orphan_parent_set_code_backfill_plus_child_insert_candidate'
      || row.readiness_lane === 'host_parent_relocation_plus_child_insert_candidate'
    ) {
      parentId = existingParentId(row);
    }
    if (!parentId) continue;
    childInserts.push({
      card_printing_id: crypto.randomUUID(),
      card_print_id: parentId,
      finish_key: row.finish_key,
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${row.set_key}:${normalizeNumber(row.card_number)}:${row.finish_key}`,
      created_by: CREATED_BY,
    });
  }

  return {
    parentUpdates: [...parentUpdatesById.values()].sort((left, right) => left.card_print_id.localeCompare(right.card_print_id)),
    parentInserts: [...parentInsertsByKey.values()].sort((left, right) => left.set_code.localeCompare(right.set_code) || String(left.number).localeCompare(String(right.number), undefined, { numeric: true }) || left.name.localeCompare(right.name)),
    childInserts: childInserts.sort((left, right) => left.card_print_id.localeCompare(right.card_print_id) || left.finish_key.localeCompare(right.finish_key)),
    mappingInserts: [...mappingInsertsByKey.values()].sort((left, right) => left.source.localeCompare(right.source) || left.external_id.localeCompare(right.external_id)),
    candidateRows,
  };
}

function valuesParentUpdates(rows) {
  return rows.map((row) => `  (${[
    sqlUuid(row.card_print_id),
    sqlUuid(row.target_set_id),
    sqlString(row.target_set_code),
    sqlString(row.target_number),
    sqlString(row.target_name),
  ].join(', ')})`).join(',\n');
}

function valuesParentInserts(rows) {
  return rows.map((row) => `  (${[
    sqlUuid(row.card_print_id),
    sqlUuid(row.set_id),
    sqlString(row.set_code),
    sqlString(row.number),
    sqlString(row.name),
    sqlString(row.rarity),
    sqlString(row.variant_key),
    sqlJson(row.external_ids),
    sqlJson(row.ai_metadata),
  ].join(', ')})`).join(',\n');
}

function valuesChildInserts(rows) {
  return rows.map((row) => `  (${[
    sqlUuid(row.card_printing_id),
    sqlUuid(row.card_print_id),
    sqlString(row.finish_key),
    sqlString(row.provenance_source),
    sqlString(row.provenance_ref),
    sqlString(row.created_by),
  ].join(', ')})`).join(',\n');
}

function valuesMappingInserts(rows) {
  return rows.map((row) => `  (${[
    sqlString(row.source),
    sqlString(row.external_id),
    sqlUuid(row.card_print_id),
    sqlJson(row.meta),
  ].join(', ')})`).join(',\n');
}

function buildSql(planned, packageFingerprint) {
  const expected = {
    parent_updates: planned.parentUpdates.length,
    parent_inserts: planned.parentInserts.length,
    child_inserts: planned.childInserts.length,
    mapping_inserts: planned.mappingInserts.length,
  };
  return `-- ${PACKAGE_ID} guarded dry-run transaction
-- package_fingerprint_sha256: ${packageFingerprint}
-- This transaction must end in ROLLBACK. No durable writes are authorized by this artifact.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table pkg09a_parent_updates (
  card_print_id uuid primary key,
  target_set_id uuid not null,
  target_set_code text not null,
  target_number text not null,
  target_name text not null
) on commit drop;

insert into pkg09a_parent_updates (card_print_id, target_set_id, target_set_code, target_number, target_name) values
${valuesParentUpdates(planned.parentUpdates)};

create temporary table pkg09a_parent_inserts (
  card_print_id uuid primary key,
  set_id uuid not null,
  set_code text not null,
  number text not null,
  name text not null,
  rarity text,
  variant_key text,
  external_ids jsonb not null,
  ai_metadata jsonb not null
) on commit drop;

insert into pkg09a_parent_inserts (card_print_id, set_id, set_code, number, name, rarity, variant_key, external_ids, ai_metadata) values
${valuesParentInserts(planned.parentInserts)};

create temporary table pkg09a_child_inserts (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  provenance_source text not null,
  provenance_ref text not null,
  created_by text not null
) on commit drop;

insert into pkg09a_child_inserts (card_printing_id, card_print_id, finish_key, provenance_source, provenance_ref, created_by) values
${valuesChildInserts(planned.childInserts)};

create temporary table pkg09a_mapping_inserts (
  source text not null,
  external_id text not null,
  card_print_id uuid not null,
  meta jsonb not null
) on commit drop;

insert into pkg09a_mapping_inserts (source, external_id, card_print_id, meta) values
${valuesMappingInserts(planned.mappingInserts)};

do $$
declare
  parent_update_count int;
  parent_insert_count int;
  child_insert_count int;
  mapping_insert_count int;
  missing_update_parents int;
  target_parent_collisions int;
  insert_parent_collisions int;
  child_collisions int;
  mapping_collisions int;
  duplicate_target_identities int;
begin
  select count(*) into parent_update_count from pkg09a_parent_updates;
  select count(*) into parent_insert_count from pkg09a_parent_inserts;
  select count(*) into child_insert_count from pkg09a_child_inserts;
  select count(*) into mapping_insert_count from pkg09a_mapping_inserts;

  if parent_update_count <> ${expected.parent_updates} then raise exception 'PKG-09A parent update count drift: %', parent_update_count; end if;
  if parent_insert_count <> ${expected.parent_inserts} then raise exception 'PKG-09A parent insert count drift: %', parent_insert_count; end if;
  if child_insert_count <> ${expected.child_inserts} then raise exception 'PKG-09A child insert count drift: %', child_insert_count; end if;
  if mapping_insert_count <> ${expected.mapping_inserts} then raise exception 'PKG-09A mapping insert count drift: %', mapping_insert_count; end if;

  select count(*) into missing_update_parents
  from pkg09a_parent_updates target
  left join public.card_prints cp on cp.id = target.card_print_id
  where cp.id is null;
  if missing_update_parents <> 0 then raise exception 'PKG-09A missing update parents: %', missing_update_parents; end if;

  select count(*) into target_parent_collisions
  from pkg09a_parent_updates target
  join public.card_prints cp
    on cp.id <> target.card_print_id
   and lower(coalesce(cp.set_code, '')) = lower(target.target_set_code)
   and (lower(coalesce(cp.number, '')) = lower(target.target_number) or lower(coalesce(cp.number_plain, '')) = lower(target.target_number))
   and lower(coalesce(cp.name, '')) = lower(target.target_name);
  if target_parent_collisions <> 0 then raise exception 'PKG-09A target parent collisions: %', target_parent_collisions; end if;

  select count(*) into insert_parent_collisions
  from pkg09a_parent_inserts target
  join public.card_prints cp
    on lower(coalesce(cp.set_code, '')) = lower(target.set_code)
   and (lower(coalesce(cp.number, '')) = lower(target.number) or lower(coalesce(cp.number_plain, '')) = lower(target.number))
   and lower(coalesce(cp.name, '')) = lower(target.name);
  if insert_parent_collisions <> 0 then raise exception 'PKG-09A insert parent collisions: %', insert_parent_collisions; end if;

  select count(*) into child_collisions
  from pkg09a_child_inserts target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  if child_collisions <> 0 then raise exception 'PKG-09A child collisions: %', child_collisions; end if;

  select count(*) into mapping_collisions
  from pkg09a_mapping_inserts target
  join public.external_mappings em
    on em.source = target.source
   and em.external_id = target.external_id;
  if mapping_collisions <> 0 then raise exception 'PKG-09A external mapping collisions: %', mapping_collisions; end if;

  select count(*) into duplicate_target_identities
  from (
    select target_set_code as set_code, target_number as number, target_name as name from pkg09a_parent_updates
    union all
    select set_code, number, name from pkg09a_parent_inserts
  ) target
  group by set_code, number, name
  having count(*) > 1;
  if duplicate_target_identities <> 0 then raise exception 'PKG-09A duplicate target identities: %', duplicate_target_identities; end if;
end $$;

update public.card_prints cp
set
  set_id = target.target_set_id,
  set_code = target.target_set_code,
  number = target.target_number,
  name = target.target_name
from pkg09a_parent_updates target
where cp.id = target.card_print_id;

insert into public.card_prints (
  id,
  set_id,
  set_code,
  number,
  name,
  rarity,
  variant_key,
  external_ids,
  ai_metadata
)
select
  card_print_id,
  set_id,
  set_code,
  number,
  name,
  rarity,
  variant_key,
  external_ids,
  ai_metadata
from pkg09a_parent_inserts;

insert into public.external_mappings (source, external_id, card_print_id, meta)
select source, external_id, card_print_id, meta
from pkg09a_mapping_inserts;

insert into public.card_printings (
  id,
  card_print_id,
  finish_key,
  is_provisional,
  provenance_source,
  provenance_ref,
  created_by
)
select
  card_printing_id,
  card_print_id,
  finish_key,
  false,
  provenance_source,
  provenance_ref,
  created_by
from pkg09a_child_inserts;

select
  '${PACKAGE_ID}'::text as package_id,
  '${packageFingerprint}'::text as package_fingerprint,
  (select count(*)::int from pkg09a_parent_updates) as parent_updates,
  (select count(*)::int from pkg09a_parent_inserts) as parent_inserts,
  (select count(*)::int from pkg09a_child_inserts) as child_inserts,
  (select count(*)::int from pkg09a_mapping_inserts) as mapping_inserts,
  (select count(*)::int from public.card_prints cp join pkg09a_parent_updates target on target.card_print_id = cp.id where cp.set_code = target.target_set_code) as verified_parent_updates;

rollback;
`;
}

async function executeDryRun(sql) {
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const result = await client.query(sql);
    const proofResult = [...result].reverse().find((item) => item.rows?.[0]?.package_id === PACKAGE_ID);
    return {
      status: 'pkg09a_alias_subset_bulk_convergence_completed_rolled_back_no_durable_change',
      proof_row: proofResult?.rows?.[0] ?? null,
      proof_hash_sha256: sha256(stableJson(proofResult?.rows?.[0] ?? {})),
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  const scopeRows = Object.entries(report.scope).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value]);
  const setRows = Object.entries(report.summary.by_set).map(([key, value]) => [key, value]);
  return `# PKG-09A Alias / Subset Bulk Convergence Guarded Dry-Run V1

Rollback-only guarded dry-run for the PKG-09 bulk alias/subset convergence package.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- transaction_ended_with_rollback: ${report.transaction_ended_with_rollback}

## Scope

${markdownTable(['metric', 'value'], scopeRows.map((row) => row.map(mdEscape)))}

## By Set

${markdownTable(['set', 'candidate_rows'], setRows)}

## Proof

- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_hash_sha256: \`${report.dry_run.proof_hash_sha256}\`
- status: ${report.dry_run.status}

No real apply is authorized by this dry-run.
`;
}

async function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-09A Alias / Subset Bulk Convergence Guarded Dry-Run Checkpoint V1](20260610_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry-run for 155-row alias/subset bulk convergence package; no durable writes or migrations. |';
  let current = '';
  try {
    current = await fs.readFile(indexPath, 'utf8');
  } catch {
    current = '# Master Index Checkpoint Index\n\n| date | checkpoint | notes |\n| --- | --- | --- |\n';
  }
  if (!current.includes('20260610_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_checkpoint_v1.md')) {
    await writeText(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const readiness = await readJson(SOURCE_JSON);
  const planned = buildPlannedRows(readiness);
  const packageFingerprint = readiness.summary.package_fingerprint_sha256;
  const sql = buildSql(planned, packageFingerprint);
  await writeText(OUTPUT_SQL, sql);
  const dryRun = await executeDryRun(sql);
  const scope = {
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: packageFingerprint,
    candidate_rows: planned.candidateRows.length,
    parent_set_code_update_rows: planned.parentUpdates.length,
    parent_insert_rows: planned.parentInserts.length,
    child_insert_rows: planned.childInserts.length,
    external_mapping_insert_rows: planned.mappingInserts.length,
    blocked_rows_excluded: readiness.rows.filter((row) => row.blocked_reason).length,
    target_sets: [...new Set(planned.candidateRows.map((row) => row.set_key))].sort(),
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    transaction_ended_with_rollback: true,
    output_sql: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
    scope,
    summary: {
      by_set: countBy(planned.candidateRows, (row) => row.set_key),
      by_readiness_lane: countBy(planned.candidateRows, (row) => row.readiness_lane),
      by_finish: countBy(planned.candidateRows, (row) => row.finish_key),
    },
    dry_run: dryRun,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  const checkpoint = `# PKG-09A Alias / Subset Bulk Convergence Guarded Dry-Run Checkpoint V1

- package_id: ${PACKAGE_ID}
- package_fingerprint_sha256: \`${packageFingerprint}\`
- dry_run_proof_hash_sha256: \`${dryRun.proof_hash_sha256}\`
- candidate_rows: ${scope.candidate_rows}
- parent_set_code_update_rows: ${scope.parent_set_code_update_rows}
- parent_insert_rows: ${scope.parent_insert_rows}
- child_insert_rows: ${scope.child_insert_rows}
- external_mapping_insert_rows: ${scope.external_mapping_insert_rows}
- blocked_rows_excluded: ${scope.blocked_rows_excluded}
- transaction_ended_with_rollback: true
- durable_db_writes_performed: false
- migrations_created: false

No real apply is authorized by this checkpoint.
`;
  await writeText(CHECKPOINT_MD, checkpoint);
  await updateCheckpointIndex();
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    output_sql: path.relative(ROOT, OUTPUT_SQL),
    checkpoint_md: path.relative(ROOT, CHECKPOINT_MD),
    scope,
    dry_run: dryRun,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
