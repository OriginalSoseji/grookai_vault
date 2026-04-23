/**
 * MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical identity outside runtime executor.
 * It is NOT part of the runtime authority system.
 *
 * RULES:
 * - must never be executed implicitly
 * - must never be called by workers
 * - must never be used in normal flows
 * - must require explicit operator intent
 */
import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

import { installIdentityMaintenanceBoundaryV1 } from './identity_maintenance_boundary_v1.mjs';

if (!process.env.ENABLE_IDENTITY_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled. Set ENABLE_IDENTITY_MAINTENANCE_MODE=true for explicit use.',
  );
}

if (process.env.IDENTITY_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'",
  );
}

if (process.env.IDENTITY_MAINTENANCE_ENTRYPOINT !== 'backend/identity/run_identity_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts must be launched from backend/identity/run_identity_maintenance_v1.mjs',
  );
}

const DRY_RUN = process.env.IDENTITY_MAINTENANCE_DRY_RUN !== 'false';
const { assertMaintenanceWriteAllowed } = installIdentityMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('IDENTITY MAINTENANCE: running in DRY RUN mode');
}

void assertMaintenanceWriteAllowed;
const PHASE = 'SWSH11_FAMILY_REALIGNMENT_V1';
const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const BATCH_SIZE = 30;

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'swsh11';
const TARGET_SET_CODE = 'swsh11tg';

const BACKUP_SCHEMA_PATH = path.join(
  process.cwd(),
  'backups',
  'swsh11_family_realignment_preapply_schema.sql',
);
const BACKUP_DATA_PATH = path.join(
  process.cwd(),
  'backups',
  'swsh11_family_realignment_preapply_data.sql',
);

const EXPECTED = {
  totalUnresolved: 30,
  numericUnresolved: 0,
  tgUnresolved: 30,
  mapCount: 30,
  canonicalTargetCount: 30,
};

const SUPPORTED_REFERENCE_TABLES = new Set([
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'vault_items.card_id',
]);

const BACKUP_TABLE_CONFIG = [
  { table_name: 'card_prints', key_column: 'id', conflict_columns: ['id'] },
  { table_name: 'card_print_identity', key_column: 'card_print_id', conflict_columns: ['id'] },
  { table_name: 'card_print_traits', key_column: 'card_print_id', conflict_columns: ['id'] },
  { table_name: 'card_printings', key_column: 'card_print_id', conflict_columns: ['id'] },
  { table_name: 'external_mappings', key_column: 'card_print_id', conflict_columns: ['id'] },
  { table_name: 'vault_items', key_column: 'card_id', conflict_columns: ['id'] },
];

function normalizeCount(value) {
  return Number(value ?? 0);
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`NON_FINITE_NUMERIC_LITERAL:${value}`);
    }
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    return quoteLiteral(JSON.stringify(value));
  }
  return quoteLiteral(String(value));
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) {
    throw new Error(`${code}:${actual}:${expected}`);
  }
}

function assertZero(actual, code) {
  if (normalizeCount(actual) !== 0) {
    throw new Error(`${code}:${actual}`);
  }
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function buildTempCollapseSurface(client) {
  await client.query(`
    drop table if exists tmp_swsh11_unresolved;
    drop table if exists tmp_swsh11_canonical_tg;
    drop table if exists tmp_swsh11_tg_candidates;
    drop table if exists tmp_swsh11_tg_old_counts;
    drop table if exists tmp_swsh11_tg_new_counts;
    drop table if exists tmp_swsh11_collapse_map;
    drop table if exists tmp_swsh11_batch;

    create temp table tmp_swsh11_unresolved on commit drop as
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.set_code as old_set_code,
      cpi.printed_number as old_number,
      coalesce(
        cpi.normalized_printed_name,
        lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g'))
      ) as normalized_printed_name
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${SOURCE_SET_CODE_IDENTITY}'
      and cp.gv_id is null;

    create index tmp_swsh11_unresolved_match_idx
      on tmp_swsh11_unresolved (old_number, normalized_printed_name);

    create temp table tmp_swsh11_canonical_tg on commit drop as
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.set_code as new_set_code,
      cp.number as new_number,
      cp.gv_id as new_gv_id,
      lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name
    from public.card_prints cp
    where cp.set_code = '${TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create index tmp_swsh11_canonical_tg_match_idx
      on tmp_swsh11_canonical_tg (new_number, normalized_name);

    create temp table tmp_swsh11_tg_candidates on commit drop as
    select
      u.old_id,
      c.new_id
    from tmp_swsh11_unresolved u
    join tmp_swsh11_canonical_tg c
      on c.new_number = u.old_number
     and c.normalized_name = u.normalized_printed_name;

    create temp table tmp_swsh11_tg_old_counts on commit drop as
    select old_id, count(*)::int as match_count
    from tmp_swsh11_tg_candidates
    group by old_id;

    create temp table tmp_swsh11_tg_new_counts on commit drop as
    select new_id, count(*)::int as match_count
    from tmp_swsh11_tg_candidates
    group by new_id;

    create temp table tmp_swsh11_collapse_map on commit drop as
    select
      row_number() over (
        order by u.old_number, u.old_id
      )::int as seq,
      u.old_id,
      c.new_id,
      u.old_name,
      c.new_name,
      u.old_set_code,
      c.new_set_code,
      u.old_number,
      c.new_number,
      c.new_gv_id
    from tmp_swsh11_unresolved u
    join tmp_swsh11_tg_candidates candidate
      on candidate.old_id = u.old_id
    join tmp_swsh11_canonical_tg c
      on c.new_id = candidate.new_id
    join tmp_swsh11_tg_old_counts old_counts
      on old_counts.old_id = candidate.old_id
    join tmp_swsh11_tg_new_counts new_counts
      on new_counts.new_id = candidate.new_id
    where old_counts.match_count = 1
      and new_counts.match_count = 1;

    create unique index tmp_swsh11_collapse_map_old_uidx
      on tmp_swsh11_collapse_map (old_id);

    create unique index tmp_swsh11_collapse_map_new_uidx
      on tmp_swsh11_collapse_map (new_id);

    create temp table tmp_swsh11_batch (
      seq int primary key,
      old_id uuid not null,
      new_id uuid not null
    ) on commit drop;
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with unresolved_counts as (
        select
          count(*)::int as total_unresolved,
          count(*) filter (where old_number ~ '^[0-9]+$')::int as numeric_unresolved,
          count(*) filter (where old_number ~ '^TG[0-9]+$')::int as tg_unresolved,
          count(*) filter (where old_number !~ '^TG[0-9]+$')::int as non_tg_row_count
        from tmp_swsh11_unresolved
      ),
      map_summary as (
        select
          count(*)::int as map_count,
          count(distinct old_id)::int as distinct_old_count,
          count(distinct new_id)::int as distinct_new_count
        from tmp_swsh11_collapse_map
      ),
      multiple_old as (
        select count(*)::int as row_count
        from tmp_swsh11_tg_old_counts
        where match_count > 1
      ),
      reused_new as (
        select count(*)::int as row_count
        from tmp_swsh11_tg_new_counts
        where match_count > 1
      ),
      unmatched as (
        select count(*)::int as row_count
        from tmp_swsh11_unresolved u
        where not exists (
          select 1
          from tmp_swsh11_collapse_map m
          where m.old_id = u.old_id
        )
      ),
      different_name_overlap as (
        select count(*)::int as row_count
        from tmp_swsh11_unresolved u
        where exists (
          select 1
          from public.card_prints cp
          where cp.set_code = $1
            and cp.gv_id is not null
            and cp.number = u.old_number
            and lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) <> u.normalized_printed_name
        )
      ),
      target_identity_occupancy as (
        select
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from tmp_swsh11_collapse_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.new_id
      ),
      canonical_target as (
        select count(*)::int as row_count
        from public.card_prints
        where set_code = $1
          and gv_id is not null
      )
      select
        unresolved_counts.total_unresolved,
        unresolved_counts.numeric_unresolved,
        unresolved_counts.tg_unresolved,
        unresolved_counts.non_tg_row_count,
        canonical_target.row_count as canonical_target_count,
        map_summary.map_count,
        map_summary.distinct_old_count,
        map_summary.distinct_new_count,
        multiple_old.row_count as multiple_match_old_count,
        reused_new.row_count as reused_new_count,
        unmatched.row_count as unmatched_count,
        different_name_overlap.row_count as different_name_overlap_count,
        target_identity_occupancy.any_identity_rows as target_any_identity_rows,
        target_identity_occupancy.active_identity_rows as target_active_identity_rows
      from unresolved_counts
      cross join canonical_target
      cross join map_summary
      cross join multiple_old
      cross join reused_new
      cross join unmatched
      cross join different_name_overlap
      cross join target_identity_occupancy
    `,
    [TARGET_SET_CODE],
  );
}

function assertPreconditions(summary) {
  assertEqual(
    normalizeCount(summary?.total_unresolved),
    EXPECTED.totalUnresolved,
    'UNRESOLVED_TOTAL_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.numeric_unresolved),
    EXPECTED.numericUnresolved,
    'UNRESOLVED_NUMERIC_DRIFT',
  );
  assertEqual(normalizeCount(summary?.tg_unresolved), EXPECTED.tgUnresolved, 'UNRESOLVED_TG_DRIFT');
  assertZero(summary?.non_tg_row_count, 'NON_TG_ROW_COUNT');
  assertEqual(
    normalizeCount(summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.map_count), EXPECTED.mapCount, 'COLLAPSE_MAP_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.distinct_old_count), EXPECTED.mapCount, 'DISTINCT_OLD_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.distinct_new_count), EXPECTED.mapCount, 'DISTINCT_NEW_COUNT_DRIFT');
  assertZero(summary?.multiple_match_old_count, 'MULTIPLE_MATCH_OLD');
  assertZero(summary?.reused_new_count, 'REUSED_NEW');
  assertZero(summary?.unmatched_count, 'UNMATCHED_COUNT');
  assertZero(summary?.different_name_overlap_count, 'DIFFERENT_NAME_OVERLAP_COUNT');
  assertZero(summary?.target_any_identity_rows, 'TARGET_ANY_IDENTITY_OCCUPIED');
  assertZero(summary?.target_active_identity_rows, 'TARGET_ACTIVE_IDENTITY_OCCUPIED');
}

async function loadCardPrintFkInventory(client) {
  return queryRows(
    client,
    `
      select distinct
        rel.relname as table_name,
        att.attname as column_name
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      join pg_class frel on frel.oid = c.confrelid
      join pg_namespace fn on fn.oid = frel.relnamespace
      join unnest(c.conkey) with ordinality as k(attnum, ord) on true
      join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
      where c.contype = 'f'
        and n.nspname = 'public'
        and fn.nspname = 'public'
        and frel.relname = 'card_prints'
      order by rel.relname, att.attname
    `,
  );
}

async function loadFkCounts(client, fkInventory, sourceClause) {
  const results = [];
  for (const fk of fkInventory) {
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${quoteIdent(fk.table_name)}
        where ${quoteIdent(fk.column_name)} in (${sourceClause})
      `,
    );
    results.push({
      table_name: fk.table_name,
      column_name: fk.column_name,
      row_count: normalizeCount(row?.row_count),
      supported_handler: SUPPORTED_REFERENCE_TABLES.has(`${fk.table_name}.${fk.column_name}`),
    });
  }
  return results;
}

function assertNoUnexpectedReferencedTables(fkCounts) {
  const unexpected = fkCounts.filter((row) => row.row_count > 0 && !row.supported_handler);
  if (unexpected.length > 0) {
    throw new Error(`UNSUPPORTED_REFERENCING_TABLES:${JSON.stringify(unexpected)}`);
  }
}

async function loadCollisionSummary(client) {
  return queryOne(
    client,
    `
      with traits_on_old as (
        select count(*)::int as row_count
        from public.card_print_traits t
        where t.card_print_id in (select old_id from tmp_swsh11_collapse_map)
      ),
      trait_key_conflicts as (
        select
          old_t.id as old_trait_id,
          new_t.id as new_trait_id,
          old_t.confidence as old_confidence,
          new_t.confidence as new_confidence,
          old_t.hp as old_hp,
          new_t.hp as new_hp,
          old_t.national_dex as old_national_dex,
          new_t.national_dex as new_national_dex,
          old_t.types as old_types,
          new_t.types as new_types,
          old_t.rarity as old_rarity,
          new_t.rarity as new_rarity,
          old_t.supertype as old_supertype,
          new_t.supertype as new_supertype,
          old_t.card_category as old_card_category,
          new_t.card_category as new_card_category,
          old_t.legacy_rarity as old_legacy_rarity,
          new_t.legacy_rarity as new_legacy_rarity
        from tmp_swsh11_collapse_map m
        join public.card_print_traits old_t
          on old_t.card_print_id = m.old_id
        join public.card_print_traits new_t
          on new_t.card_print_id = m.new_id
         and new_t.trait_type = old_t.trait_type
         and new_t.trait_value = old_t.trait_value
         and new_t.source = old_t.source
      ),
      printing_on_old as (
        select count(*)::int as row_count
        from public.card_printings p
        where p.card_print_id in (select old_id from tmp_swsh11_collapse_map)
      ),
      printing_finish_conflicts as (
        select
          old_p.id as old_printing_id,
          new_p.id as new_printing_id,
          old_p.is_provisional as old_is_provisional,
          new_p.is_provisional as new_is_provisional,
          old_p.provenance_source as old_provenance_source,
          new_p.provenance_source as new_provenance_source,
          old_p.provenance_ref as old_provenance_ref,
          new_p.provenance_ref as new_provenance_ref,
          old_p.created_by as old_created_by,
          new_p.created_by as new_created_by
        from tmp_swsh11_collapse_map m
        join public.card_printings old_p
          on old_p.card_print_id = m.old_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      mapping_on_old as (
        select count(*)::int as row_count
        from public.external_mappings em
        where em.card_print_id in (select old_id from tmp_swsh11_collapse_map)
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from tmp_swsh11_collapse_map m
        join public.external_mappings old_em
          on old_em.card_print_id = m.old_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      ),
      target_identity as (
        select count(*)::int as row_count
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_swsh11_collapse_map)
      )
      select
        traits_on_old.row_count as old_trait_row_count,
        (select count(*)::int from trait_key_conflicts) as trait_target_key_conflict_count,
        (
          select count(*)::int
          from trait_key_conflicts
          where old_confidence is distinct from new_confidence
             or old_hp is distinct from new_hp
             or old_national_dex is distinct from new_national_dex
             or old_types is distinct from new_types
             or old_rarity is distinct from new_rarity
             or old_supertype is distinct from new_supertype
             or old_card_category is distinct from new_card_category
             or old_legacy_rarity is distinct from new_legacy_rarity
        ) as trait_conflicting_non_identical_count,
        printing_on_old.row_count as old_printing_row_count,
        (select count(*)::int from printing_finish_conflicts) as printing_finish_conflict_count,
        (
          select count(*)::int
          from printing_finish_conflicts
          where old_is_provisional = new_is_provisional
            and (
              new_provenance_source is null
              or new_provenance_source = old_provenance_source
            )
            and (
              new_provenance_ref is null
              or new_provenance_ref = old_provenance_ref
            )
            and (
              new_created_by is null
              or new_created_by = old_created_by
            )
        ) as printing_mergeable_metadata_only_count,
        (
          select count(*)::int
          from printing_finish_conflicts
          where old_is_provisional is distinct from new_is_provisional
             or (
               old_provenance_source is not null
               and new_provenance_source is not null
               and old_provenance_source <> new_provenance_source
             )
             or (
               old_provenance_ref is not null
               and new_provenance_ref is not null
               and old_provenance_ref <> new_provenance_ref
             )
             or (
               old_created_by is not null
               and new_created_by is not null
               and old_created_by <> new_created_by
             )
        ) as printing_conflicting_non_identical_count,
        mapping_on_old.row_count as old_external_mapping_row_count,
        external_conflicts.row_count as external_mapping_conflict_count,
        target_identity.row_count as target_identity_row_count
      from traits_on_old
      cross join printing_on_old
      cross join mapping_on_old
      cross join external_conflicts
      cross join target_identity
    `,
  );
}

function assertCollisionSummary(summary) {
  assertZero(summary?.trait_conflicting_non_identical_count, 'TRAIT_CONFLICTING_NON_IDENTICAL');
  assertZero(summary?.external_mapping_conflict_count, 'EXTERNAL_MAPPING_CONFLICT');
  assertZero(summary?.target_identity_row_count, 'TARGET_IDENTITY_ROWS_PRESENT');

  const finishConflicts = normalizeCount(summary?.printing_finish_conflict_count);
  const mergeablePrintings = normalizeCount(summary?.printing_mergeable_metadata_only_count);
  const conflictingPrintings = normalizeCount(summary?.printing_conflicting_non_identical_count);

  if (mergeablePrintings !== finishConflicts) {
    throw new Error(`PRINTING_MERGEABLE_COUNT_DRIFT:${mergeablePrintings}:${finishConflicts}`);
  }
  assertZero(conflictingPrintings, 'PRINTING_CONFLICTING_NON_IDENTICAL');
}

async function loadCanonicalCounts(client) {
  return queryOne(
    client,
    `
      select
        count(*) filter (
          where set_code = $1 and gv_id is not null
        )::int as canonical_base_target_count,
        count(*) filter (
          where set_code = $2 and gv_id is not null
        )::int as canonical_tg_target_count
      from public.card_prints
    `,
    [SOURCE_SET_CODE_IDENTITY, TARGET_SET_CODE],
  );
}

async function loadActiveIdentityCount(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_print_identity
      where is_active = true
    `,
  );
  return normalizeCount(row?.row_count);
}

async function loadSampleMapRows(client) {
  const first = await queryOne(
    client,
    `
      select old_id, new_id, old_name, new_name, old_number, new_number, new_set_code, new_gv_id
      from tmp_swsh11_collapse_map
      order by seq
      limit 1
    `,
  );
  const middle = await queryOne(
    client,
    `
      select old_id, new_id, old_name, new_name, old_number, new_number, new_set_code, new_gv_id
      from tmp_swsh11_collapse_map
      order by seq
      offset 14
      limit 1
    `,
  );
  const last = await queryOne(
    client,
    `
      select old_id, new_id, old_name, new_name, old_number, new_number, new_set_code, new_gv_id
      from tmp_swsh11_collapse_map
      order by seq desc
      limit 1
    `,
  );

  return { first, middle, last };
}

async function loadSampleAfterRows(client, sampleMapRows) {
  const loadOne = async (sample) => {
    if (!sample) {
      return null;
    }

    const row = await queryOne(
      client,
      `
        select
          exists (
            select 1
            from public.card_prints old_cp
            where old_cp.id = $1
          ) as old_parent_still_exists,
          new_cp.id as new_id,
          new_cp.name as new_name,
          new_cp.number as new_number,
          new_cp.set_code as new_set_code,
          new_cp.gv_id as new_gv_id,
          count(cpi.id)::int as identity_row_count_on_new_parent,
          count(*) filter (where cpi.is_active = true)::int as active_identity_row_count_on_new_parent
        from public.card_prints new_cp
        left join public.card_print_identity cpi
          on cpi.card_print_id = new_cp.id
        where new_cp.id = $2
        group by new_cp.id, new_cp.name, new_cp.number, new_cp.set_code, new_cp.gv_id
      `,
      [sample.old_id, sample.new_id],
    );

    return {
      ...sample,
      ...row,
    };
  };

  return {
    first: await loadOne(sampleMapRows.first),
    middle: await loadOne(sampleMapRows.middle),
    last: await loadOne(sampleMapRows.last),
  };
}

async function loadSchemaSnapshot(client, tableName) {
  const [columns, constraints, indexes] = await Promise.all([
    queryRows(
      client,
      `
        select
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
        order by ordinal_position
      `,
      [tableName],
    ),
    queryRows(
      client,
      `
        select
          c.conname as constraint_name,
          c.contype as constraint_type,
          pg_get_constraintdef(c.oid) as constraint_definition
        from pg_constraint c
        join pg_class t
          on t.oid = c.conrelid
        join pg_namespace n
          on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = $1
        order by c.conname
      `,
      [tableName],
    ),
    queryRows(
      client,
      `
        select
          indexname,
          indexdef
        from pg_indexes
        where schemaname = 'public'
          and tablename = $1
        order by indexname
      `,
      [tableName],
    ),
  ]);

  return {
    table_name: tableName,
    columns,
    constraints,
    indexes,
  };
}

async function loadBackupTableRows(client, tableName, keyColumn, ids) {
  return {
    table_name: tableName,
    key_column: keyColumn,
    rows: await queryRows(
      client,
      `
        select *
        from public.${quoteIdent(tableName)}
        where ${quoteIdent(keyColumn)} = any($1::uuid[])
        order by 1
      `,
      [ids],
    ),
  };
}

function buildSchemaBackupContent({
  generatedAt,
  preconditions,
  collapseMapRows,
  sampleMapRows,
  fkInventory,
  fkCounts,
  schemaSnapshot,
}) {
  const lines = [
    `-- ${PHASE} PRE-APPLY SCHEMA SNAPSHOT`,
    `-- Generated at: ${generatedAt}`,
    `-- Mode: ${MODE}`,
    `-- source_set_code_identity: ${SOURCE_SET_CODE_IDENTITY}`,
    `-- target_set_code: ${TARGET_SET_CODE}`,
    `-- candidate_count: ${preconditions.candidate_count}`,
    '',
    '-- Sample collapse map rows',
  ];

  for (const [label, row] of Object.entries(sampleMapRows)) {
    if (!row) {
      continue;
    }
    lines.push(
      `-- ${label}: old_id=${row.old_id} old_name=${row.old_name} old_number=${row.old_number} new_id=${row.new_id} new_name=${row.new_name} new_number=${row.new_number} new_gv_id=${row.new_gv_id}`,
    );
  }

  lines.push('');
  lines.push('-- Referencing FK inventory to public.card_prints');
  for (const fk of fkInventory) {
    const match = fkCounts.find(
      (row) => row.table_name === fk.table_name && row.column_name === fk.column_name,
    );
    lines.push(
      `-- ${fk.table_name}.${fk.column_name} -> old_id row_count=${normalizeCount(match?.row_count)} supported_handler=${SUPPORTED_REFERENCE_TABLES.has(`${fk.table_name}.${fk.column_name}`)}`,
    );
  }

  lines.push('');
  lines.push(`-- collapse_map_count=${collapseMapRows.length}`);
  lines.push('');

  for (const table of schemaSnapshot) {
    lines.push(`-- Table: public.${table.table_name}`);
    lines.push('-- Columns');
    for (const column of table.columns) {
      lines.push(
        `--   ${column.column_name} ${column.data_type} (${column.udt_name}) nullable=${column.is_nullable} default=${column.column_default ?? 'null'}`,
      );
    }
    lines.push('-- Constraints');
    for (const constraint of table.constraints) {
      lines.push(
        `--   ${constraint.constraint_name} [${constraint.constraint_type}] ${constraint.constraint_definition}`,
      );
    }
    lines.push('-- Indexes');
    for (const index of table.indexes) {
      lines.push(`--   ${index.indexname}: ${index.indexdef}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function buildUpsertStatements(tableSnapshot, conflictColumns) {
  if (tableSnapshot.rows.length === 0) {
    return [`-- public.${tableSnapshot.table_name}: no rows captured`];
  }

  const columns = Object.keys(tableSnapshot.rows[0]);
  const columnList = columns.map(quoteIdent).join(', ');
  const conflictList = conflictColumns.map(quoteIdent).join(', ');
  const updateList = columns
    .filter((column) => !conflictColumns.includes(column))
    .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`)
    .join(', ');

  return tableSnapshot.rows.map((row) => {
    const values = columns.map((column) => sqlLiteral(row[column])).join(', ');
    return [
      `insert into public.${quoteIdent(tableSnapshot.table_name)} (${columnList})`,
      `values (${values})`,
      `on conflict (${conflictList}) do update set ${updateList};`,
    ].join('\n');
  });
}

function buildDataBackupContent({ generatedAt, collapseMapRows, tableSnapshots }) {
  const lines = [
    `-- ${PHASE} PRE-APPLY DATA SNAPSHOT`,
    `-- Generated at: ${generatedAt}`,
    `-- Mode: ${MODE}`,
    `-- source_set_code_identity: ${SOURCE_SET_CODE_IDENTITY}`,
    `-- target_set_code: ${TARGET_SET_CODE}`,
    `-- collapse_map_count: ${collapseMapRows.length}`,
    'begin;',
    '',
  ];

  for (const tableSnapshot of tableSnapshots) {
    lines.push(`-- Restore public.${tableSnapshot.table_name}`);
    const tableConfig = BACKUP_TABLE_CONFIG.find(
      (entry) => entry.table_name === tableSnapshot.table_name,
    );
    lines.push(...buildUpsertStatements(tableSnapshot, tableConfig?.conflict_columns ?? ['id']));
    lines.push('');
  }

  lines.push('commit;');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function createBackupArtifacts(client, preconditions, collapseMapRows, sampleMapRows, fkInventory, fkCounts) {
  const generatedAt = new Date().toISOString();
  const ids = [...new Set(collapseMapRows.flatMap((row) => [row.old_id, row.new_id]))];
  const schemaSnapshot = [];
  const tableSnapshots = [];

  for (const tableConfig of BACKUP_TABLE_CONFIG) {
    schemaSnapshot.push(await loadSchemaSnapshot(client, tableConfig.table_name));
    tableSnapshots.push(
      await loadBackupTableRows(client, tableConfig.table_name, tableConfig.key_column, ids),
    );
  }

  const schemaContent = buildSchemaBackupContent({
    generatedAt,
    preconditions,
    collapseMapRows,
    sampleMapRows,
    fkInventory,
    fkCounts,
    schemaSnapshot,
  });
  const dataContent = buildDataBackupContent({
    generatedAt,
    collapseMapRows,
    tableSnapshots,
  });

  ensureParentDir(BACKUP_SCHEMA_PATH);
  ensureParentDir(BACKUP_DATA_PATH);
  fs.writeFileSync(BACKUP_SCHEMA_PATH, schemaContent);
  fs.writeFileSync(BACKUP_DATA_PATH, dataContent);

  if (!fs.existsSync(BACKUP_SCHEMA_PATH) || !fs.existsSync(BACKUP_DATA_PATH)) {
    throw new Error('BACKUP_WRITE_FAILED');
  }

  return {
    schema_path: BACKUP_SCHEMA_PATH,
    data_path: BACKUP_DATA_PATH,
    table_row_counts: tableSnapshots.map((table) => ({
      table_name: table.table_name,
      row_count: table.rows.length,
    })),
  };
}

async function prepareBatch(client, nextSeq) {
  await client.query(`truncate table tmp_swsh11_batch`);

  await client.query(
    `
      insert into tmp_swsh11_batch (seq, old_id, new_id)
      select seq, old_id, new_id
      from tmp_swsh11_collapse_map
      where seq >= $1
      order by seq
      limit $2
    `,
    [nextSeq, BATCH_SIZE],
  );

  const row = await queryOne(client, `select count(*)::int as batch_size from tmp_swsh11_batch`);
  return normalizeCount(row?.batch_size);
}

async function loadBatchFkCounts(client) {
  const tables = [
    ['card_print_identity', 'card_print_id'],
    ['card_print_traits', 'card_print_id'],
    ['card_printings', 'card_print_id'],
    ['external_mappings', 'card_print_id'],
    ['vault_items', 'card_id'],
  ];

  const result = {};
  for (const [table, column] of tables) {
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${quoteIdent(table)}
        where ${quoteIdent(column)} in (
          select old_id from tmp_swsh11_batch
        )
      `,
    );
    result[`${table}.${column}`] = normalizeCount(row?.row_count);
  }

  return result;
}

async function applyBatch(client, batchNumber, nextSeq) {
  const batchSize = await prepareBatch(client, nextSeq);
  if (batchSize === 0) {
    return null;
  }

  const fkBefore = await loadBatchFkCounts(client);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = batch.new_id,
      gv_id = cp_new.gv_id
    from tmp_swsh11_batch batch
    join public.card_prints cp_new
      on cp_new.id = batch.new_id
    where vi.card_id = batch.old_id
  `);

  const insertedTraits = await client.query(`
    insert into public.card_print_traits (
      card_print_id,
      trait_type,
      trait_value,
      source,
      confidence,
      created_at,
      hp,
      national_dex,
      types,
      rarity,
      supertype,
      card_category,
      legacy_rarity
    )
    select
      batch.new_id,
      old_t.trait_type,
      old_t.trait_value,
      old_t.source,
      old_t.confidence,
      old_t.created_at,
      old_t.hp,
      old_t.national_dex,
      old_t.types,
      old_t.rarity,
      old_t.supertype,
      old_t.card_category,
      old_t.legacy_rarity
    from public.card_print_traits old_t
    join tmp_swsh11_batch batch
      on batch.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_swsh11_batch batch
    where old_t.card_print_id = batch.old_id
  `);

  const mergedPrintingMetadata = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_swsh11_batch batch
      on batch.old_id = old_p.card_print_id
    where new_p.card_print_id = batch.new_id
      and new_p.finish_key = old_p.finish_key
      and (
        (new_p.provenance_source is null and old_p.provenance_source is not null)
        or (new_p.provenance_ref is null and old_p.provenance_ref is not null)
        or (new_p.created_by is null and old_p.created_by is not null)
      )
  `);

  const movedUniquePrintings = await client.query(`
    update public.card_printings old_p
    set card_print_id = batch.new_id
    from tmp_swsh11_batch batch
    where old_p.card_print_id = batch.old_id
      and not exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = batch.new_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const deletedRedundantPrintings = await client.query(`
    delete from public.card_printings old_p
    using tmp_swsh11_batch batch
    where old_p.card_print_id = batch.old_id
      and exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = batch.new_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const updatedExternalMappings = await client.query(`
    update public.external_mappings em
    set card_print_id = batch.new_id
    from tmp_swsh11_batch batch
    where em.card_print_id = batch.old_id
  `);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set card_print_id = batch.new_id
    from tmp_swsh11_batch batch
    where cpi.card_print_id = batch.old_id
  `);

  const fkAfter = await loadBatchFkCounts(client);
  const remaining = Object.entries(fkAfter)
    .filter(([, rowCount]) => rowCount > 0)
    .map(([tableRef, rowCount]) => ({ table_ref: tableRef, row_count: rowCount }));

  if (remaining.length > 0) {
    throw new Error(`BATCH_REMAINING_OLD_REFERENCES:${JSON.stringify(remaining)}`);
  }

  return {
    batch_number: batchNumber,
    start_seq: nextSeq,
    batch_size: batchSize,
    fk_before: fkBefore,
    operations: {
      updated_vault_items: updatedVaultItems.rowCount ?? 0,
      inserted_traits: insertedTraits.rowCount ?? 0,
      deleted_old_traits: deletedTraits.rowCount ?? 0,
      merged_printing_metadata_rows: mergedPrintingMetadata.rowCount ?? 0,
      moved_unique_printings: movedUniquePrintings.rowCount ?? 0,
      deleted_redundant_printings: deletedRedundantPrintings.rowCount ?? 0,
      updated_external_mappings: updatedExternalMappings.rowCount ?? 0,
      updated_identity_rows: updatedIdentityRows.rowCount ?? 0,
    },
    fk_after: fkAfter,
  };
}

async function loadPostValidation(client, fkInventory, activeIdentityTotalBefore) {
  const remainingOldReferences = await loadFkCounts(
    client,
    fkInventory,
    `select old_id from tmp_swsh11_collapse_map`,
  );

  const summary = await queryOne(
    client,
    `
      with target_identity as (
        select
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from tmp_swsh11_collapse_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.new_id
      ),
      unresolved_after as (
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is null
      ),
      route_rows as (
        select count(*)::int as row_count
        from public.card_prints cp
        where cp.id in (select new_id from tmp_swsh11_collapse_map)
          and cp.gv_id is not null
      ),
      active_identity_total as (
        select count(*)::int as row_count
        from public.card_print_identity
        where is_active = true
      )
      select
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_swsh11_collapse_map)
        ) as remaining_old_parent_rows,
        (
          select row_count
          from unresolved_after
        ) as remaining_unresolved_null_gvid_rows_for_swsh11,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.set_code = $2
            and cp.gv_id is not null
        ) as canonical_base_target_count,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.set_code = $3
            and cp.gv_id is not null
        ) as canonical_tg_target_count,
        (
          select active_identity_rows
          from target_identity
        ) as target_active_identity_rows,
        (
          select row_count
          from route_rows
        ) as route_resolvable_target_rows,
        (
          select row_count
          from active_identity_total
        ) as active_identity_total_after,
        $4::int as active_identity_total_before
    `,
    [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
      TARGET_SET_CODE,
      activeIdentityTotalBefore,
    ],
  );

  return {
    summary,
    remaining_old_references: remainingOldReferences,
  };
}

function assertPostValidation(postValidation, deletedParentCount, canonicalCountsBefore) {
  const remainingReferences = postValidation.remaining_old_references.filter((row) => row.row_count > 0);
  if (remainingReferences.length > 0) {
    throw new Error(`POST_VALIDATION_OLD_REFERENCES:${JSON.stringify(remainingReferences)}`);
  }

  assertEqual(deletedParentCount, EXPECTED.mapCount, 'DELETED_PARENT_COUNT_DRIFT');
  assertZero(postValidation.summary?.remaining_old_parent_rows, 'REMAINING_OLD_PARENTS');
  assertZero(
    postValidation.summary?.remaining_unresolved_null_gvid_rows_for_swsh11,
    'REMAINING_UNRESOLVED_NULL_GVID_FOR_SWSH11',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.canonical_base_target_count),
    normalizeCount(canonicalCountsBefore?.canonical_base_target_count),
    'CANONICAL_BASE_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.canonical_tg_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TG_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_active_identity_rows),
    EXPECTED.mapCount,
    'TARGET_ACTIVE_IDENTITY_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.route_resolvable_target_rows),
    EXPECTED.mapCount,
    'ROUTE_RESOLVABLE_TARGET_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.active_identity_total_after),
    normalizeCount(postValidation.summary?.active_identity_total_before),
    'ACTIVE_IDENTITY_TOTAL_DRIFT',
  );
}

function summarizeBatchOperations(batches) {
  return batches.reduce(
    (acc, batch) => {
      acc.updated_vault_items += normalizeCount(batch.operations.updated_vault_items);
      acc.inserted_traits += normalizeCount(batch.operations.inserted_traits);
      acc.deleted_old_traits += normalizeCount(batch.operations.deleted_old_traits);
      acc.merged_printing_metadata_rows += normalizeCount(batch.operations.merged_printing_metadata_rows);
      acc.moved_unique_printings += normalizeCount(batch.operations.moved_unique_printings);
      acc.deleted_redundant_printings += normalizeCount(batch.operations.deleted_redundant_printings);
      acc.updated_external_mappings += normalizeCount(batch.operations.updated_external_mappings);
      acc.updated_identity_rows += normalizeCount(batch.operations.updated_identity_rows);
      return acc;
    },
    {
      updated_vault_items: 0,
      inserted_traits: 0,
      deleted_old_traits: 0,
      merged_printing_metadata_rows: 0,
      moved_unique_printings: 0,
      deleted_redundant_printings: 0,
      updated_external_mappings: 0,
      updated_identity_rows: 0,
    },
  );
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    batch_size: BATCH_SIZE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    source_set_code_identity: SOURCE_SET_CODE_IDENTITY,
    target_set_code: TARGET_SET_CODE,
    preconditions: null,
    sample_rows_before: null,
    fk_inventory: null,
    collision_summary: null,
    canonical_counts_before: null,
    active_identity_total_before: null,
    backup_artifacts: null,
    batches: [],
    fk_movement_summary: null,
    deleted_old_parent_rows: 0,
    post_validation: null,
    sample_rows_after: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `swsh11_family_realignment_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempCollapseSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.sample_rows_before = await loadSampleMapRows(client);

    const fkInventory = await loadCardPrintFkInventory(client);
    report.fk_inventory = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from tmp_swsh11_collapse_map`,
    );
    assertNoUnexpectedReferencedTables(report.fk_inventory);

    report.collision_summary = await loadCollisionSummary(client);
    assertCollisionSummary(report.collision_summary);

    report.canonical_counts_before = await loadCanonicalCounts(client);
    if (normalizeCount(report.canonical_counts_before?.canonical_base_target_count) <= 0) {
      throw new Error('CANONICAL_BASE_LANE_MISSING');
    }
    assertEqual(
      normalizeCount(report.canonical_counts_before?.canonical_tg_target_count),
      EXPECTED.canonicalTargetCount,
      'CANONICAL_TG_TARGET_COUNT_BEFORE_DRIFT',
    );

    report.active_identity_total_before = await loadActiveIdentityCount(client);

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    const collapseMapRows = await queryRows(
      client,
      `
        select old_id, new_id, old_name, new_name, old_number, new_number, new_set_code, new_gv_id
        from tmp_swsh11_collapse_map
        order by seq
      `,
    );

    report.backup_artifacts = await createBackupArtifacts(
      client,
      report.preconditions,
      collapseMapRows,
      report.sample_rows_before,
      fkInventory,
      report.fk_inventory,
    );

    let nextSeq = 1;
    let batchNumber = 1;
    while (true) {
      const batch = await applyBatch(client, batchNumber, nextSeq);
      if (!batch) {
        break;
      }
      report.batches.push(batch);
      nextSeq += batch.batch_size;
      batchNumber += 1;
    }

    report.fk_movement_summary = summarizeBatchOperations(report.batches);

    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using tmp_swsh11_collapse_map m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;

    report.post_validation = await loadPostValidation(
      client,
      fkInventory,
      report.active_identity_total_before,
    );
    assertPostValidation(
      report.post_validation,
      report.deleted_old_parent_rows,
      report.canonical_counts_before,
    );

    report.sample_rows_after = await loadSampleAfterRows(client, report.sample_rows_before);

    for (const label of ['first', 'middle', 'last']) {
      const sample = report.sample_rows_after?.[label];
      if (!sample) {
        throw new Error(`MISSING_SAMPLE_AFTER:${label}`);
      }
      if (sample.old_parent_still_exists !== false) {
        throw new Error(`SAMPLE_OLD_PARENT_STILL_EXISTS:${label}:${sample.old_id}`);
      }
      if (sample.active_identity_row_count_on_new_parent !== 1) {
        throw new Error(`SAMPLE_ACTIVE_IDENTITY_COUNT_DRIFT:${label}:${sample.active_identity_row_count_on_new_parent}`);
      }
    }

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original failure.
    }

    report.status = 'failed';
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    console.error(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
