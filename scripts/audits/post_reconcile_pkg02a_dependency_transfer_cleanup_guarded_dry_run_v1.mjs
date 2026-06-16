import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'post_reconcile_integrity_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const SOURCE_JSON = path.join(AUDIT_DIR, 'post_reconcile_dependency_transfer_strategy_v1.json');
const SETS_FILTER = getArgValue('--sets')
  ?.split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean) ?? [];
const LABEL = getArgValue('--label') ?? (SETS_FILTER.length > 0 ? SETS_FILTER.join('_') : 'all');
const OUTPUT_JSON = path.join(AUDIT_DIR, `post_reconcile_pkg02a_dependency_transfer_cleanup_guarded_dry_run_${LABEL}_v1.json`);
const OUTPUT_MD = path.join(AUDIT_DIR, `post_reconcile_pkg02a_dependency_transfer_cleanup_guarded_dry_run_${LABEL}_v1.md`);
const OUTPUT_SQL = path.join(SQL_DIR, `post_reconcile_pkg02a_dependency_transfer_cleanup_guarded_dry_run_${LABEL}_v1.sql`);

const PACKAGE_ID = 'POST-REC-02A-DEPENDENCY-TRANSFER-DUPLICATE-PARENT-CLEANUP';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
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

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
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

function buildTargetRows(source) {
  return (source.ready_groups ?? [])
    .filter((group) => SETS_FILTER.length === 0 || SETS_FILTER.includes(String(group.set_code).toLowerCase()))
    .map((group) => ({
      canonical_parent_id: group.canonical_parent_id,
      duplicate_parent_id: group.duplicate_parent_id,
      canonical_gv_id: group.canonical_gv_id,
      duplicate_gv_id: group.duplicate_gv_id,
      set_code: group.set_code,
      normalized_key: group.normalized_key,
      duplicate_child_count: group.duplicate_child_rows.length,
    }));
}

function buildSql(targetRows, packageFingerprint) {
  const values = targetRows.map((row) => `  (${[
    sqlUuid(row.canonical_parent_id),
    sqlUuid(row.duplicate_parent_id),
    sqlString(row.canonical_gv_id),
    sqlString(row.duplicate_gv_id),
    sqlString(row.set_code),
    sqlString(row.normalized_key),
    row.duplicate_child_count,
  ].join(', ')})`);

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION V1
-- Package fingerprint: ${packageFingerprint}
-- Scope: ${targetRows.length} dependency-bearing padded/unpadded duplicate parent groups.
-- Excludes append-only feed rows.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

set local statement_timeout = '10min';

create temporary table post_rec02a_targets (
  canonical_parent_id uuid primary key,
  duplicate_parent_id uuid not null unique,
  canonical_gv_id text not null,
  duplicate_gv_id text not null,
  set_code text not null,
  normalized_key text not null,
  duplicate_child_count integer not null
) on commit drop;

insert into post_rec02a_targets (
  canonical_parent_id,
  duplicate_parent_id,
  canonical_gv_id,
  duplicate_gv_id,
  set_code,
  normalized_key,
  duplicate_child_count
) values
${values.join(',\n')};

do $$
declare
  v_targets integer;
  v_missing_parent integer;
  v_bad_parent_shape integer;
  v_append_only_refs integer;
  v_bad_child_refs integer := 0;
  v_new_printing_gv_conflicts integer;
  v_unhandled_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from post_rec02a_targets;
  if v_targets <> ${targetRows.length} then
    raise exception 'POST-REC-02A target count guard failed: expected ${targetRows.length}, got %', v_targets;
  end if;

  select count(*) into v_missing_parent
  from post_rec02a_targets target
  left join public.card_prints canonical on canonical.id = target.canonical_parent_id
  left join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.id is null
     or duplicate.id is null
     or canonical.id = duplicate.id;

  if v_missing_parent <> 0 then
    raise exception 'POST-REC-02A missing parent guard failed: % rows', v_missing_parent;
  end if;

  select count(*) into v_bad_parent_shape
  from post_rec02a_targets target
  join public.card_prints canonical on canonical.id = target.canonical_parent_id
  join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.set_code <> duplicate.set_code
     or canonical.set_code <> target.set_code
     or canonical.name <> duplicate.name
     or canonical.number !~ '^0+[0-9]+[A-Za-z]*$'
     or duplicate.number ~ '^0+[0-9]+[A-Za-z]*$';

  if v_bad_parent_shape <> 0 then
    raise exception 'POST-REC-02A parent shape guard failed: % rows', v_bad_parent_shape;
  end if;

  select count(*) into v_append_only_refs
  from public.card_feed_events cfe
  join post_rec02a_targets target on target.duplicate_parent_id = cfe.card_print_id;

  if v_append_only_refs <> 0 then
    raise exception 'POST-REC-02A append-only feed exclusion guard failed: % refs', v_append_only_refs;
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
        'card_print_identity',
        'card_print_species',
        'card_print_traits',
        'card_printings',
        'external_mappings',
        'external_discovery_candidates',
        'card_embeddings',
        'card_fingerprint_index',
        'scanner_fingerprint_index',
        'justtcg_variants',
        'justtcg_variant_prices_latest',
        'justtcg_variant_price_snapshots',
        'card_print_price_curves',
        'ebay_active_prices_latest',
        'ebay_active_price_snapshots',
        'pricing_jobs',
        'pricing_watch',
        'vault_item_instances',
        'vault_items',
        'card_interactions',
        'card_interaction_outcomes',
        'card_signals',
        'slab_certs',
        'card_feed_events'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec02a_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_unhandled_parent_refs := v_unhandled_parent_refs + v_dynamic_refs;
  end loop;

  if v_unhandled_parent_refs <> 0 then
    raise exception 'POST-REC-02A unhandled parent dependency guard failed: % refs', v_unhandled_parent_refs;
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
      and ref.relname = 'card_printings'
  loop
    execute format(
      'select count(*) from %I.%I where %I in (
         select cpr.id
         from public.card_printings cpr
         join post_rec02a_targets target on target.duplicate_parent_id = cpr.card_print_id
       )',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_bad_child_refs := v_bad_child_refs + v_dynamic_refs;
  end loop;

  if v_bad_child_refs <> 0 then
    raise exception 'POST-REC-02A duplicate child dependency guard failed: % refs', v_bad_child_refs;
  end if;

  select count(*) into v_new_printing_gv_conflicts
  from public.card_printings duplicate_child
  join post_rec02a_targets target on target.duplicate_parent_id = duplicate_child.card_print_id
  where not exists (
    select 1
    from public.card_printings canonical_child
    where canonical_child.card_print_id = target.canonical_parent_id
      and canonical_child.finish_key = duplicate_child.finish_key
  )
  and exists (
    select 1
    from public.card_printings any_child
    where any_child.printing_gv_id = replace(duplicate_child.printing_gv_id, target.duplicate_gv_id, target.canonical_gv_id)
      and any_child.id <> duplicate_child.id
  );

  if v_new_printing_gv_conflicts <> 0 then
    raise exception 'POST-REC-02A transfer printing_gv_id conflict guard failed: % rows', v_new_printing_gv_conflicts;
  end if;
end $$;

delete from public.external_mappings em
using post_rec02a_targets target
where em.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.external_mappings existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.source = em.source
      and existing.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where em.card_print_id = target.duplicate_parent_id;

update public.external_discovery_candidates edc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where edc.card_print_id = target.duplicate_parent_id;

insert into public.card_print_traits
  (card_print_id, trait_type, trait_value, source, confidence, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity)
select
  target.canonical_parent_id,
  trait.trait_type,
  trait.trait_value,
  trait.source,
  trait.confidence,
  trait.hp,
  trait.national_dex,
  trait.types,
  trait.rarity,
  trait.supertype,
  trait.card_category,
  trait.legacy_rarity
from public.card_print_traits trait
join post_rec02a_targets target on target.duplicate_parent_id = trait.card_print_id
on conflict (card_print_id, trait_type, trait_value, source) do nothing;

delete from public.card_print_traits trait
using post_rec02a_targets target
where trait.card_print_id = target.duplicate_parent_id;

insert into public.card_print_species
  (card_print_id, species_id, role, counts_for_completion, source, confidence, evidence, active)
select
  target.canonical_parent_id,
  species.species_id,
  species.role,
  species.counts_for_completion,
  species.source,
  species.confidence,
  species.evidence,
  species.active
from public.card_print_species species
join post_rec02a_targets target on target.duplicate_parent_id = species.card_print_id
on conflict (card_print_id, species_id, role) where active = true do nothing;

delete from public.card_print_species species
using post_rec02a_targets target
where species.card_print_id = target.duplicate_parent_id;

delete from public.card_print_identity identity
using post_rec02a_targets target
where identity.card_print_id = target.duplicate_parent_id;

delete from public.card_embeddings ce
using post_rec02a_targets target
where ce.card_print_id = target.duplicate_parent_id
  and exists (
    select 1 from public.card_embeddings existing
    where existing.card_print_id = target.canonical_parent_id
  );

update public.card_embeddings ce
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where ce.card_print_id = target.duplicate_parent_id;

update public.card_fingerprint_index cfi
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cfi.card_print_id = target.duplicate_parent_id;

delete from public.scanner_fingerprint_index sfi
using post_rec02a_targets target
where sfi.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.scanner_fingerprint_index existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.hash_d = sfi.hash_d
      and existing.algorithm_version = sfi.algorithm_version
      and existing.source_type = sfi.source_type
  );

update public.scanner_fingerprint_index sfi
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where sfi.card_print_id = target.duplicate_parent_id;

update public.justtcg_variants jv
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jv.card_print_id = target.duplicate_parent_id;

update public.justtcg_variant_prices_latest jvl
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jvl.card_print_id = target.duplicate_parent_id;

update public.justtcg_variant_price_snapshots jvs
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jvs.card_print_id = target.duplicate_parent_id;

update public.card_print_price_curves cppc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cppc.card_print_id = target.duplicate_parent_id;

delete from public.ebay_active_prices_latest eapl
using post_rec02a_targets target
where eapl.card_print_id = target.duplicate_parent_id
  and exists (
    select 1 from public.ebay_active_prices_latest existing
    where existing.card_print_id = target.canonical_parent_id
  );

update public.ebay_active_prices_latest eapl
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where eapl.card_print_id = target.duplicate_parent_id;

update public.ebay_active_price_snapshots eaps
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where eaps.card_print_id = target.duplicate_parent_id;

update public.pricing_jobs pj
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where pj.card_print_id = target.duplicate_parent_id;

delete from public.pricing_watch pw
using post_rec02a_targets target
where pw.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.pricing_watch existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.watch_reason = pw.watch_reason
  );

update public.pricing_watch pw
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where pw.card_print_id = target.duplicate_parent_id;

update public.vault_item_instances vii
set card_printing_id = null,
    card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where vii.card_print_id = target.duplicate_parent_id;

update public.vault_items vi
set card_id = target.canonical_parent_id
from post_rec02a_targets target
where vi.card_id = target.duplicate_parent_id;

update public.card_interactions ci
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where ci.card_print_id = target.duplicate_parent_id;

update public.card_interaction_outcomes cio
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cio.card_print_id = target.duplicate_parent_id;

update public.card_signals cs
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cs.card_print_id = target.duplicate_parent_id;

update public.slab_certs sc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where sc.card_print_id = target.duplicate_parent_id;

delete from public.card_printings duplicate_child
using post_rec02a_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.card_printings canonical_child
    where canonical_child.card_print_id = target.canonical_parent_id
      and canonical_child.finish_key = duplicate_child.finish_key
  );

update public.card_printings duplicate_child
set
  card_print_id = target.canonical_parent_id,
  printing_gv_id = replace(duplicate_child.printing_gv_id, target.duplicate_gv_id, target.canonical_gv_id)
from post_rec02a_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id;

do $$
declare
  v_remaining_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
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
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec02a_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_remaining_refs := v_remaining_refs + v_dynamic_refs;
  end loop;

  if v_remaining_refs <> 0 then
    raise exception 'POST-REC-02A duplicate parent references remain: % refs', v_remaining_refs;
  end if;
end $$;

delete from public.card_prints cp
using post_rec02a_targets target
where cp.id = target.duplicate_parent_id;

do $$
declare
  v_remaining_duplicate_parents integer;
begin
  select count(*) into v_remaining_duplicate_parents
  from public.card_prints cp
  join post_rec02a_targets target on target.duplicate_parent_id = cp.id;

  if v_remaining_duplicate_parents <> 0 then
    raise exception 'POST-REC-02A duplicate parent delete simulation incomplete: % rows', v_remaining_duplicate_parents;
  end if;
end $$;

rollback;
`;
}

async function captureSnapshot(client, targetRows) {
  const duplicateIds = targetRows.map((row) => row.duplicate_parent_id);
  const canonicalIds = targetRows.map((row) => row.canonical_parent_id);
  const result = await client.query(
    `
      select
        (select count(*)::int from public.card_prints where id = any($1::uuid[])) as duplicate_parent_rows,
        (select count(*)::int from public.card_prints where id = any($2::uuid[])) as canonical_parent_rows,
        (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as duplicate_child_rows,
        (select count(*)::int from public.card_print_identity where card_print_id = any($1::uuid[])) as duplicate_identity_rows,
        (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as duplicate_external_mapping_rows,
        (select count(*)::int from public.justtcg_variant_price_snapshots where card_print_id = any($1::uuid[])) as duplicate_justtcg_snapshot_rows,
        (select count(*)::int from public.card_feed_events where card_print_id = any($1::uuid[])) as duplicate_feed_rows,
        (select count(*)::int from public.vault_item_instances where card_print_id = any($1::uuid[])) as duplicate_vault_instance_rows,
        (select count(*)::int from public.vault_items where card_id = any($1::uuid[])) as duplicate_vault_item_rows
    `,
    [duplicateIds, canonicalIds],
  );
  return {
    captured_at: new Date().toISOString(),
    counts: result.rows[0],
    hash_sha256: sha256(stableJson(result.rows[0])),
  };
}

async function runDryRun(sql, targetRows) {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client, targetRows);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    try {
      await client.query(sql);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error.message;
      await client.query('rollback').catch(() => {});
    }
    const afterRollbackSnapshot = await captureSnapshot(client, targetRows);
    return {
      execution_status: executionStatus,
      error_message: errorMessage,
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterRollbackSnapshot,
      rollback_proof_hash_match: beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function validateSql(sql) {
  const stripped = sql.replace(/--.*$/gm, '');
  return {
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(stripped),
    contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(stripped),
    contains_delete_statement: /\bdelete\s+from\b/i.test(stripped),
    contains_update_statement: /\bupdate\s+public\./i.test(stripped),
    contains_insert_statement: /\binsert\s+into\s+public\./i.test(stripped),
  };
}

function buildMarkdown(report) {
  return `# POST-REC-02A Dependency Transfer Duplicate Parent Cleanup Guarded Dry Run V1

Rollback-only dry-run for dependency-bearing duplicate parent cleanup.

## Safety

- db_writes_performed: ${report.safety.db_writes_performed}
- durable_writes_performed: ${report.safety.durable_writes_performed}
- migrations_created: ${report.safety.migrations_created}
- real_apply_performed: ${report.safety.real_apply_performed}

## Scope

- package_id: ${report.package_id}
- target_groups: ${report.scope.target_groups}
- target_sets: ${report.scope.target_sets.join(', ')}
- excluded_append_only_groups: ${report.scope.excluded_append_only_groups}
- duplicate_child_rows_from_strategy: ${report.scope.duplicate_child_rows_from_strategy}
- package_fingerprint: \`${report.package_fingerprint_sha256}\`
- sql_hash: \`${report.sql_artifact.sha256}\`

## Dry Run

- execution_status: ${report.execution.execution_status}
- error_message: ${report.execution.error_message ?? 'none'}
- rollback_proof_hash_match: ${report.execution.rollback_proof_hash_match}
- before_hash: \`${report.execution.before_snapshot?.hash_sha256 ?? 'n/a'}\`
- after_rollback_hash: \`${report.execution.after_rollback_snapshot?.hash_sha256 ?? 'n/a'}\`

## Approval Text

\`\`\`text
${report.required_operator_approval.exact_phrase}
\`\`\`
`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targetRows = buildTargetRows(source);
  const targetSets = [...new Set(targetRows.map((row) => row.set_code))].sort();
  const packageFingerprint = sha256(stableJson(targetRows));
  const sql = buildSql(targetRows, packageFingerprint);
  const sqlHash = sha256(sql);
  await writeText(OUTPUT_SQL, sql);
  const execution = await runDryRun(sql, targetRows);
  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    source_strategy: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    safety: {
      db_writes_performed: false,
      durable_writes_performed: false,
      migrations_created: false,
      real_apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
    },
    scope: {
      target_groups: targetRows.length,
      target_sets: targetSets,
      excluded_append_only_groups: source.summary?.blocked_append_only_policy ?? 0,
      duplicate_child_rows_from_strategy: targetRows.reduce((sum, row) => sum + row.duplicate_child_count, 0),
      target_rows: targetRows,
    },
    package_fingerprint_sha256: packageFingerprint,
    sql_artifact: {
      path: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
      sha256: sqlHash,
      ...validateSql(sql),
    },
    execution,
    required_operator_approval: {
      exact_phrase: `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. SQL hash: ${sqlHash}. Scope: ${targetRows.length} dependency-transfer duplicate parent cleanups across ${targetSets.join(', ')}; duplicate child rows handled=${targetRows.reduce((sum, row) => sum + row.duplicate_child_count, 0)}; append-only feed groups excluded=${source.summary?.blocked_append_only_policy ?? 0}. Dry-run proof: ${execution.before_snapshot?.hash_sha256 ?? 'n/a'} == ${execution.after_rollback_snapshot?.hash_sha256 ?? 'n/a'}. No global apply. No migrations. No image writes. No unsupported cleanup. No quarantine.`,
    },
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    output_sql: OUTPUT_SQL,
    package_fingerprint_sha256: packageFingerprint,
    sql_hash: sqlHash,
    execution_status: execution.execution_status,
    error_message: execution.error_message,
    rollback_proof_hash_match: execution.rollback_proof_hash_match,
  }, null, 2));
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
