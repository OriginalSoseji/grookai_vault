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
const SOURCE_JSON = path.join(AUDIT_DIR, 'post_reconcile_duplicate_parent_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'post_reconcile_pkg01_ready_duplicate_parent_cleanup_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'post_reconcile_pkg01_ready_duplicate_parent_cleanup_guarded_dry_run_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'post_reconcile_pkg01_ready_duplicate_parent_cleanup_guarded_dry_run_v1.sql');

const PACKAGE_ID = 'POST-REC-01-READY-DUPLICATE-PARENT-CLEANUP';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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
  return (source.ready_groups ?? []).map((group) => ({
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
-- Scope: ${targetRows.length} deterministic padded/unpadded duplicate parent groups.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table post_rec01_targets (
  canonical_parent_id uuid primary key,
  duplicate_parent_id uuid not null unique,
  canonical_gv_id text not null,
  duplicate_gv_id text not null,
  set_code text not null,
  normalized_key text not null,
  duplicate_child_count integer not null
) on commit drop;

insert into post_rec01_targets (
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
  v_bad_identity integer;
  v_bad_child_refs integer;
  v_new_printing_gv_conflicts integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from post_rec01_targets;
  if v_targets <> ${targetRows.length} then
    raise exception 'POST-REC-01 target count guard failed: expected ${targetRows.length}, got %', v_targets;
  end if;

  select count(*) into v_missing_parent
  from post_rec01_targets target
  left join public.card_prints canonical on canonical.id = target.canonical_parent_id
  left join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.id is null
     or duplicate.id is null
     or canonical.id = duplicate.id;

  if v_missing_parent <> 0 then
    raise exception 'POST-REC-01 missing parent guard failed: % rows', v_missing_parent;
  end if;

  select count(*) into v_bad_parent_shape
  from post_rec01_targets target
  join public.card_prints canonical on canonical.id = target.canonical_parent_id
  join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.set_code <> duplicate.set_code
     or canonical.set_code <> target.set_code
     or canonical.name <> duplicate.name
     or canonical.number !~ '^0+[0-9]+[A-Za-z]*$'
     or duplicate.number ~ '^0+[0-9]+[A-Za-z]*$';

  if v_bad_parent_shape <> 0 then
    raise exception 'POST-REC-01 parent shape guard failed: % rows', v_bad_parent_shape;
  end if;

  select count(*) into v_bad_identity
  from post_rec01_targets target
  where not exists (
    select 1
    from public.card_print_identity cpi
    where cpi.card_print_id = target.canonical_parent_id
      and cpi.is_active = true
  );

  if v_bad_identity <> 0 then
    raise exception 'POST-REC-01 canonical active identity guard failed: % rows', v_bad_identity;
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
        'external_mappings'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec01_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'POST-REC-01 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
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
         join post_rec01_targets target on target.duplicate_parent_id = cpr.card_print_id
       )',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_bad_child_refs := coalesce(v_bad_child_refs, 0) + v_dynamic_refs;
  end loop;

  if coalesce(v_bad_child_refs, 0) <> 0 then
    raise exception 'POST-REC-01 duplicate child dependency guard failed: % refs', v_bad_child_refs;
  end if;

  select count(*) into v_new_printing_gv_conflicts
  from public.card_printings duplicate_child
  join post_rec01_targets target on target.duplicate_parent_id = duplicate_child.card_print_id
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
    raise exception 'POST-REC-01 transfer printing_gv_id conflict guard failed: % rows', v_new_printing_gv_conflicts;
  end if;
end $$;

delete from public.external_mappings em
using post_rec01_targets target
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
from post_rec01_targets target
where em.card_print_id = target.duplicate_parent_id;

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
join post_rec01_targets target on target.duplicate_parent_id = trait.card_print_id
on conflict (card_print_id, trait_type, trait_value, source) do nothing;

delete from public.card_print_traits trait
using post_rec01_targets target
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
join post_rec01_targets target on target.duplicate_parent_id = species.card_print_id
on conflict (card_print_id, species_id, role) where active = true do nothing;

delete from public.card_print_species species
using post_rec01_targets target
where species.card_print_id = target.duplicate_parent_id;

delete from public.card_print_identity identity
using post_rec01_targets target
where identity.card_print_id = target.duplicate_parent_id;

delete from public.card_printings duplicate_child
using post_rec01_targets target
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
from post_rec01_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id;

do $$
declare
  v_remaining_children integer;
  v_remaining_identities integer;
  v_remaining_traits integer;
  v_remaining_species integer;
  v_remaining_mappings integer;
begin
  select count(*) into v_remaining_children
  from public.card_printings cpr
  join post_rec01_targets target on target.duplicate_parent_id = cpr.card_print_id;
  select count(*) into v_remaining_identities
  from public.card_print_identity identity
  join post_rec01_targets target on target.duplicate_parent_id = identity.card_print_id;
  select count(*) into v_remaining_traits
  from public.card_print_traits trait
  join post_rec01_targets target on target.duplicate_parent_id = trait.card_print_id;
  select count(*) into v_remaining_species
  from public.card_print_species species
  join post_rec01_targets target on target.duplicate_parent_id = species.card_print_id;
  select count(*) into v_remaining_mappings
  from public.external_mappings em
  join post_rec01_targets target on target.duplicate_parent_id = em.card_print_id;

  if v_remaining_children + v_remaining_identities + v_remaining_traits + v_remaining_species + v_remaining_mappings <> 0 then
    raise exception 'POST-REC-01 duplicate dependency cleanup incomplete: children %, identities %, traits %, species %, mappings %',
      v_remaining_children, v_remaining_identities, v_remaining_traits, v_remaining_species, v_remaining_mappings;
  end if;
end $$;

delete from public.card_prints cp
using post_rec01_targets target
where cp.id = target.duplicate_parent_id;

do $$
declare
  v_remaining_duplicate_parents integer;
begin
  select count(*) into v_remaining_duplicate_parents
  from public.card_prints cp
  join post_rec01_targets target on target.duplicate_parent_id = cp.id;

  if v_remaining_duplicate_parents <> 0 then
    raise exception 'POST-REC-01 duplicate parent delete simulation incomplete: % rows', v_remaining_duplicate_parents;
  end if;
end $$;

rollback;
`;
}

async function captureSnapshot(client, targetRows) {
  const parentIds = [...new Set([
    ...targetRows.map((row) => row.canonical_parent_id),
    ...targetRows.map((row) => row.duplicate_parent_id),
  ])];
  const result = await client.query(
    `
      select
        cp.id::text,
        to_jsonb(cp) as card_print,
        coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.printing_gv_id, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as card_printings,
        coalesce((select jsonb_agg(to_jsonb(identity) order by identity.id) from public.card_print_identity identity where identity.card_print_id = cp.id), '[]'::jsonb) as card_print_identity,
        coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings,
        coalesce((select jsonb_agg(to_jsonb(trait) order by trait.trait_type, trait.trait_value, trait.source, trait.id) from public.card_print_traits trait where trait.card_print_id = cp.id), '[]'::jsonb) as card_print_traits,
        coalesce((select jsonb_agg(to_jsonb(species) order by species.species_id, species.role, species.source, species.id) from public.card_print_species species where species.card_print_id = cp.id), '[]'::jsonb) as card_print_species
      from public.card_prints cp
      where cp.id = any($1::uuid[])
      order by cp.set_code, cp.number, cp.name, cp.id
    `,
    [parentIds],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    impact_counts: {
      card_prints_found: result.rows.length,
      card_printings_found: result.rows.reduce((sum, row) => sum + row.card_printings.length, 0),
      identities_found: result.rows.reduce((sum, row) => sum + row.card_print_identity.length, 0),
      external_mappings_found: result.rows.reduce((sum, row) => sum + row.external_mappings.length, 0),
      traits_found: result.rows.reduce((sum, row) => sum + row.card_print_traits.length, 0),
      species_found: result.rows.reduce((sum, row) => sum + row.card_print_species.length, 0),
    },
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
  return `# POST-REC-01 Ready Duplicate Parent Cleanup Guarded Dry Run V1

Rollback-only dry-run proof for the first ready duplicate-parent cleanup package.

## Safety

- db_writes_performed: ${report.safety.db_writes_performed}
- durable_writes_performed: ${report.safety.durable_writes_performed}
- migrations_created: ${report.safety.migrations_created}
- real_apply_performed: ${report.safety.real_apply_performed}

## Scope

- package_id: ${report.package_id}
- target_groups: ${report.scope.target_groups}
- target_sets: ${report.scope.target_sets.join(', ')}
- duplicate_child_rows_from_readiness: ${report.scope.duplicate_child_rows_from_readiness}
- package_fingerprint: \`${report.package_fingerprint_sha256}\`
- sql_hash: \`${report.sql_artifact.sha256}\`

## Dry Run

- execution_status: ${report.execution.execution_status}
- rollback_proof_hash_match: ${report.execution.rollback_proof_hash_match}
- before_hash: \`${report.execution.before_snapshot?.hash_sha256 ?? 'n/a'}\`
- after_rollback_hash: \`${report.execution.after_rollback_snapshot?.hash_sha256 ?? 'n/a'}\`

## Approval Text

\`\`\`text
${report.required_operator_approval.exact_phrase}
\`\`\`

## Notes

This is not real apply authority. It proves the scoped cleanup can run inside a rollback-only transaction without durable changes. Real apply requires exact approval using the package fingerprint, SQL hash, scope, and dry-run proof above.
`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targetRows = buildTargetRows(source);
  const packageFingerprint = sha256(stableJson(targetRows));
  const sql = buildSql(targetRows, packageFingerprint);
  const sqlHash = sha256(sql);
  const sqlValidation = validateSql(sql);

  await writeText(OUTPUT_SQL, sql);
  const execution = await runDryRun(sql, targetRows);
  const targetSets = [...new Set(targetRows.map((row) => row.set_code))].sort();
  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    source_readiness: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
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
      duplicate_child_rows_from_readiness: targetRows.reduce((sum, row) => sum + row.duplicate_child_count, 0),
      target_rows: targetRows,
    },
    package_fingerprint_sha256: packageFingerprint,
    sql_artifact: {
      path: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
      sha256: sqlHash,
      ...sqlValidation,
    },
    execution,
    required_operator_approval: {
      exact_phrase: `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. SQL hash: ${sqlHash}. Scope: ${targetRows.length} deterministic padded/unpadded duplicate parent cleanups across ${targetSets.join(', ')}; duplicate child rows handled=${targetRows.reduce((sum, row) => sum + row.duplicate_child_count, 0)}. Dry-run proof: ${execution.before_snapshot?.hash_sha256 ?? 'n/a'} == ${execution.after_rollback_snapshot?.hash_sha256 ?? 'n/a'}. No global apply. No migrations. No image writes. No unsupported cleanup. No quarantine.`,
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
    rollback_proof_hash_match: execution.rollback_proof_hash_match,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
