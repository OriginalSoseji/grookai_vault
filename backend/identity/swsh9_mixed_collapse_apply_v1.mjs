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
const PHASE = 'SWSH9_MIXED_COLLAPSE_V1';
const MODE = process.argv.includes('--apply')
  ? 'apply'
  : 'dry-run';
const BATCH_SIZE = 100;

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'swsh9';
const NUMERIC_TARGET_SET_CODE = 'swsh9';
const TG_TARGET_SET_CODE = 'swsh9tg';

const EXPECTED = {
  totalUnresolved: 120,
  numericUnresolved: 90,
  tgUnresolved: 30,
  numericMapCount: 90,
  tgMapCount: 30,
  combinedMapCount: 120,
  combinedDistinctNewCount: 120,
  canonicalNumericTargetCount: 186,
  canonicalTgTargetCount: 30,
};

const SUPPORTED_REFERENCE_TABLES = new Set([
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'vault_items.card_id',
]);

function normalizeCount(value) {
  return Number(value ?? 0);
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
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
    drop table if exists tmp_swsh9_unresolved;
    drop table if exists tmp_swsh9_canonical_numeric;
    drop table if exists tmp_swsh9_canonical_tg;
    drop table if exists tmp_swsh9_numeric_candidates;
    drop table if exists tmp_swsh9_numeric_old_counts;
    drop table if exists tmp_swsh9_numeric_new_counts;
    drop table if exists tmp_swsh9_numeric_map;
    drop table if exists tmp_swsh9_tg_candidates;
    drop table if exists tmp_swsh9_tg_old_counts;
    drop table if exists tmp_swsh9_tg_new_counts;
    drop table if exists tmp_swsh9_tg_map;
    drop table if exists tmp_swsh9_collapse_map;
    drop table if exists tmp_swsh9_batch;

    create temp table tmp_swsh9_unresolved on commit drop as
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.set_code as old_set_code,
      cpi.printed_number as old_number,
      cpi.normalized_printed_name,
      case
        when cpi.printed_number ~ '^[0-9]+$' then 'numeric'
        else 'tg'
      end as lane,
      case
        when cpi.printed_number ~ '^[0-9]+$' then coalesce(
          nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
          '0'
        )
        else null
      end as normalized_digits
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${SOURCE_SET_CODE_IDENTITY}'
      and cp.gv_id is null;

    create index tmp_swsh9_unresolved_lane_idx
      on tmp_swsh9_unresolved (lane, old_number, normalized_printed_name);

    create temp table tmp_swsh9_canonical_numeric on commit drop as
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.set_code as new_set_code,
      cp.number as new_number,
      cp.gv_id as new_gv_id,
      lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name,
      coalesce(
        nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
        '0'
      ) as normalized_digits
    from public.card_prints cp
    where cp.set_code = '${NUMERIC_TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create index tmp_swsh9_canonical_numeric_match_idx
      on tmp_swsh9_canonical_numeric (normalized_digits, normalized_name);

    create temp table tmp_swsh9_canonical_tg on commit drop as
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.set_code as new_set_code,
      cp.number as new_number,
      cp.gv_id as new_gv_id,
      lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name
    from public.card_prints cp
    where cp.set_code = '${TG_TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create index tmp_swsh9_canonical_tg_match_idx
      on tmp_swsh9_canonical_tg (new_number, normalized_name);

    create temp table tmp_swsh9_numeric_candidates on commit drop as
    select
      u.old_id,
      c.new_id
    from tmp_swsh9_unresolved u
    join tmp_swsh9_canonical_numeric c
      on u.lane = 'numeric'
     and c.normalized_digits = u.normalized_digits
     and c.normalized_name = u.normalized_printed_name;

    create temp table tmp_swsh9_numeric_old_counts on commit drop as
    select old_id, count(*)::int as match_count
    from tmp_swsh9_numeric_candidates
    group by old_id;

    create temp table tmp_swsh9_numeric_new_counts on commit drop as
    select new_id, count(*)::int as match_count
    from tmp_swsh9_numeric_candidates
    group by new_id;

    create temp table tmp_swsh9_numeric_map on commit drop as
    select
      'numeric'::text as lane,
      u.old_id,
      c.new_id,
      u.old_name,
      c.new_name,
      u.old_set_code,
      c.new_set_code,
      u.old_number,
      c.new_number,
      c.new_gv_id
    from tmp_swsh9_unresolved u
    join tmp_swsh9_numeric_candidates candidate
      on candidate.old_id = u.old_id
    join tmp_swsh9_canonical_numeric c
      on c.new_id = candidate.new_id
    join tmp_swsh9_numeric_old_counts old_counts
      on old_counts.old_id = candidate.old_id
    join tmp_swsh9_numeric_new_counts new_counts
      on new_counts.new_id = candidate.new_id
    where u.lane = 'numeric'
      and old_counts.match_count = 1
      and new_counts.match_count = 1;

    create unique index tmp_swsh9_numeric_map_old_uidx
      on tmp_swsh9_numeric_map (old_id);

    create unique index tmp_swsh9_numeric_map_new_uidx
      on tmp_swsh9_numeric_map (new_id);

    create temp table tmp_swsh9_tg_candidates on commit drop as
    select
      u.old_id,
      c.new_id
    from tmp_swsh9_unresolved u
    join tmp_swsh9_canonical_tg c
      on u.lane = 'tg'
     and c.new_number = u.old_number
     and c.normalized_name = u.normalized_printed_name;

    create temp table tmp_swsh9_tg_old_counts on commit drop as
    select old_id, count(*)::int as match_count
    from tmp_swsh9_tg_candidates
    group by old_id;

    create temp table tmp_swsh9_tg_new_counts on commit drop as
    select new_id, count(*)::int as match_count
    from tmp_swsh9_tg_candidates
    group by new_id;

    create temp table tmp_swsh9_tg_map on commit drop as
    select
      'tg'::text as lane,
      u.old_id,
      c.new_id,
      u.old_name,
      c.new_name,
      u.old_set_code,
      c.new_set_code,
      u.old_number,
      c.new_number,
      c.new_gv_id
    from tmp_swsh9_unresolved u
    join tmp_swsh9_tg_candidates candidate
      on candidate.old_id = u.old_id
    join tmp_swsh9_canonical_tg c
      on c.new_id = candidate.new_id
    join tmp_swsh9_tg_old_counts old_counts
      on old_counts.old_id = candidate.old_id
    join tmp_swsh9_tg_new_counts new_counts
      on new_counts.new_id = candidate.new_id
    where u.lane = 'tg'
      and old_counts.match_count = 1
      and new_counts.match_count = 1;

    create unique index tmp_swsh9_tg_map_old_uidx
      on tmp_swsh9_tg_map (old_id);

    create unique index tmp_swsh9_tg_map_new_uidx
      on tmp_swsh9_tg_map (new_id);

    create temp table tmp_swsh9_collapse_map on commit drop as
    select
      row_number() over (
        order by
          case when lane = 'numeric' then 1 else 2 end,
          case
            when lane = 'numeric' then lpad(regexp_replace(old_number, '[^0-9]', '', 'g'), 6, '0')
            else old_number
          end,
          old_id
      )::int as seq,
      lane,
      old_id,
      new_id,
      old_name,
      new_name,
      old_set_code,
      new_set_code,
      old_number,
      new_number,
      new_gv_id
    from (
      select * from tmp_swsh9_numeric_map
      union all
      select * from tmp_swsh9_tg_map
    ) unioned;

    create unique index tmp_swsh9_collapse_map_old_uidx
      on tmp_swsh9_collapse_map (old_id);

    create unique index tmp_swsh9_collapse_map_new_uidx
      on tmp_swsh9_collapse_map (new_id);

    create temp table tmp_swsh9_batch (
      seq int primary key,
      lane text not null,
      old_id uuid not null,
      new_id uuid not null
    ) on commit drop;
  `);
}

async function loadPreconditionSummary(client) {
  const row = await queryOne(
    client,
    `
      with unresolved_counts as (
        select
          count(*)::int as total_unresolved,
          count(*) filter (where lane = 'numeric')::int as numeric_unresolved,
          count(*) filter (where lane = 'tg')::int as tg_unresolved,
          count(*) filter (where lane = 'tg' and old_number ~ '^TG[0-9]{2}$')::int as tg_tgxx_count
        from tmp_swsh9_unresolved
      ),
      numeric_summary as (
        select
          count(*)::int as numeric_map_count,
          count(distinct old_id)::int as numeric_distinct_old_count,
          count(distinct new_id)::int as numeric_distinct_new_count
        from tmp_swsh9_numeric_map
      ),
      tg_summary as (
        select
          count(*)::int as tg_map_count,
          count(distinct old_id)::int as tg_distinct_old_count,
          count(distinct new_id)::int as tg_distinct_new_count
        from tmp_swsh9_tg_map
      ),
      numeric_multiple_old as (
        select count(*)::int as row_count
        from tmp_swsh9_numeric_old_counts
        where match_count > 1
      ),
      numeric_reused_new as (
        select count(*)::int as row_count
        from tmp_swsh9_numeric_new_counts
        where match_count > 1
      ),
      tg_multiple_old as (
        select count(*)::int as row_count
        from tmp_swsh9_tg_old_counts
        where match_count > 1
      ),
      tg_reused_new as (
        select count(*)::int as row_count
        from tmp_swsh9_tg_new_counts
        where match_count > 1
      ),
      numeric_unmatched as (
        select count(*)::int as row_count
        from tmp_swsh9_unresolved u
        where u.lane = 'numeric'
          and not exists (
            select 1
            from tmp_swsh9_numeric_map m
            where m.old_id = u.old_id
          )
      ),
      tg_unmatched as (
        select count(*)::int as row_count
        from tmp_swsh9_unresolved u
        where u.lane = 'tg'
          and not exists (
            select 1
            from tmp_swsh9_tg_map m
            where m.old_id = u.old_id
          )
      ),
      combined_summary as (
        select
          count(*)::int as combined_map_count,
          count(distinct old_id)::int as combined_distinct_old_count,
          count(distinct new_id)::int as combined_distinct_new_count
        from tmp_swsh9_collapse_map
      ),
      target_identity_occupancy as (
        select
          m.lane,
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from tmp_swsh9_collapse_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.new_id
        group by m.lane
      )
      select
        unresolved_counts.total_unresolved,
        unresolved_counts.numeric_unresolved,
        unresolved_counts.tg_unresolved,
        unresolved_counts.tg_tgxx_count,
        numeric_summary.numeric_map_count,
        numeric_summary.numeric_distinct_old_count,
        numeric_summary.numeric_distinct_new_count,
        tg_summary.tg_map_count,
        tg_summary.tg_distinct_old_count,
        tg_summary.tg_distinct_new_count,
        numeric_multiple_old.row_count as numeric_multiple_match_old_count,
        numeric_reused_new.row_count as numeric_reused_new_count,
        tg_multiple_old.row_count as tg_multiple_match_old_count,
        tg_reused_new.row_count as tg_reused_new_count,
        numeric_unmatched.row_count as numeric_unmatched_count,
        tg_unmatched.row_count as tg_unmatched_count,
        combined_summary.combined_map_count,
        combined_summary.combined_distinct_old_count,
        combined_summary.combined_distinct_new_count,
        coalesce((
          select any_identity_rows
          from target_identity_occupancy
          where lane = 'numeric'
        ), 0) as numeric_target_any_identity_rows,
        coalesce((
          select active_identity_rows
          from target_identity_occupancy
          where lane = 'numeric'
        ), 0) as numeric_target_active_identity_rows,
        coalesce((
          select any_identity_rows
          from target_identity_occupancy
          where lane = 'tg'
        ), 0) as tg_target_any_identity_rows,
        coalesce((
          select active_identity_rows
          from target_identity_occupancy
          where lane = 'tg'
        ), 0) as tg_target_active_identity_rows
      from unresolved_counts
      cross join numeric_summary
      cross join tg_summary
      cross join numeric_multiple_old
      cross join numeric_reused_new
      cross join tg_multiple_old
      cross join tg_reused_new
      cross join numeric_unmatched
      cross join tg_unmatched
      cross join combined_summary
    `,
  );

  return row;
}

function assertPreconditions(summary) {
  assertEqual(normalizeCount(summary?.total_unresolved), EXPECTED.totalUnresolved, 'UNRESOLVED_TOTAL_DRIFT');
  assertEqual(
    normalizeCount(summary?.numeric_unresolved),
    EXPECTED.numericUnresolved,
    'UNRESOLVED_NUMERIC_DRIFT',
  );
  assertEqual(normalizeCount(summary?.tg_unresolved), EXPECTED.tgUnresolved, 'UNRESOLVED_TG_DRIFT');
  assertEqual(normalizeCount(summary?.tg_tgxx_count), EXPECTED.tgUnresolved, 'TG_PATTERN_DRIFT');

  assertEqual(normalizeCount(summary?.numeric_map_count), EXPECTED.numericMapCount, 'NUMERIC_MAP_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.numeric_distinct_old_count),
    EXPECTED.numericMapCount,
    'NUMERIC_DISTINCT_OLD_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.numeric_distinct_new_count),
    EXPECTED.numericMapCount,
    'NUMERIC_DISTINCT_NEW_DRIFT',
  );
  assertZero(summary?.numeric_multiple_match_old_count, 'NUMERIC_MULTIPLE_MATCH_OLD');
  assertZero(summary?.numeric_reused_new_count, 'NUMERIC_REUSED_NEW');
  assertZero(summary?.numeric_unmatched_count, 'NUMERIC_UNMATCHED');

  assertEqual(normalizeCount(summary?.tg_map_count), EXPECTED.tgMapCount, 'TG_MAP_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.tg_distinct_old_count), EXPECTED.tgMapCount, 'TG_DISTINCT_OLD_DRIFT');
  assertEqual(normalizeCount(summary?.tg_distinct_new_count), EXPECTED.tgMapCount, 'TG_DISTINCT_NEW_DRIFT');
  assertZero(summary?.tg_multiple_match_old_count, 'TG_MULTIPLE_MATCH_OLD');
  assertZero(summary?.tg_reused_new_count, 'TG_REUSED_NEW');
  assertZero(summary?.tg_unmatched_count, 'TG_UNMATCHED');

  assertEqual(normalizeCount(summary?.combined_map_count), EXPECTED.combinedMapCount, 'COMBINED_MAP_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.combined_distinct_old_count),
    EXPECTED.combinedMapCount,
    'COMBINED_DISTINCT_OLD_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.combined_distinct_new_count),
    EXPECTED.combinedDistinctNewCount,
    'COMBINED_DISTINCT_NEW_DRIFT',
  );

  assertZero(summary?.numeric_target_any_identity_rows, 'NUMERIC_TARGET_IDENTITY_OCCUPIED');
  assertZero(summary?.numeric_target_active_identity_rows, 'NUMERIC_TARGET_ACTIVE_IDENTITY_OCCUPIED');
  assertZero(summary?.tg_target_any_identity_rows, 'TG_TARGET_IDENTITY_OCCUPIED');
  assertZero(summary?.tg_target_active_identity_rows, 'TG_TARGET_ACTIVE_IDENTITY_OCCUPIED');
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
    const sql = `
      select count(*)::int as row_count
      from public.${quoteIdent(fk.table_name)}
      where ${quoteIdent(fk.column_name)} in (${sourceClause})
    `;
    const row = await queryOne(client, sql);
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
        where t.card_print_id in (select old_id from tmp_swsh9_collapse_map)
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
        from tmp_swsh9_collapse_map m
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
        where p.card_print_id in (select old_id from tmp_swsh9_collapse_map)
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
        from tmp_swsh9_collapse_map m
        join public.card_printings old_p
          on old_p.card_print_id = m.old_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      mapping_on_old as (
        select count(*)::int as row_count
        from public.external_mappings em
        where em.card_print_id in (select old_id from tmp_swsh9_collapse_map)
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from tmp_swsh9_collapse_map m
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
        where cpi.card_print_id in (select new_id from tmp_swsh9_collapse_map)
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
        )::int as canonical_numeric_target_count,
        count(*) filter (
          where set_code = $2 and gv_id is not null
        )::int as canonical_tg_target_count
      from public.card_prints
    `,
    [NUMERIC_TARGET_SET_CODE, TG_TARGET_SET_CODE],
  );
}

async function loadSampleMapRows(client) {
  const numeric = await queryOne(
    client,
    `
      select lane, old_id, new_id, old_name, new_name, old_number, new_number, new_set_code, new_gv_id
      from tmp_swsh9_collapse_map
      where lane = 'numeric'
      order by seq
      limit 1
    `,
  );
  const tg = await queryOne(
    client,
    `
      select lane, old_id, new_id, old_name, new_name, old_number, new_number, new_set_code, new_gv_id
      from tmp_swsh9_collapse_map
      where lane = 'tg'
      order by seq
      limit 1
    `,
  );

  return { numeric, tg };
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
    numeric: await loadOne(sampleMapRows.numeric),
    tg: await loadOne(sampleMapRows.tg),
  };
}

async function prepareBatch(client, nextSeq) {
  await client.query(`truncate table tmp_swsh9_batch`);

  await client.query(
    `
      insert into tmp_swsh9_batch (seq, lane, old_id, new_id)
      select seq, lane, old_id, new_id
      from tmp_swsh9_collapse_map
      where seq >= $1
      order by seq
      limit $2
    `,
    [nextSeq, BATCH_SIZE],
  );

  const row = await queryOne(client, `select count(*)::int as batch_size from tmp_swsh9_batch`);
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
          select old_id from tmp_swsh9_batch
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
    from tmp_swsh9_batch batch
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
    join tmp_swsh9_batch batch
      on batch.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_swsh9_batch batch
    where old_t.card_print_id = batch.old_id
  `);

  const mergedPrintingMetadata = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_swsh9_batch batch
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
    from tmp_swsh9_batch batch
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
    using tmp_swsh9_batch batch
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
    from tmp_swsh9_batch batch
    where em.card_print_id = batch.old_id
  `);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set card_print_id = batch.new_id
    from tmp_swsh9_batch batch
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

async function loadPostValidation(client, fkInventory) {
  const remainingOldReferences = await loadFkCounts(
    client,
    fkInventory,
    `select old_id from tmp_swsh9_collapse_map`,
  );

  const summary = await queryOne(
    client,
    `
      with target_identity_by_lane as (
        select
          m.lane,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from tmp_swsh9_collapse_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.new_id
        group by m.lane
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
      )
      select
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_swsh9_collapse_map)
        ) as remaining_old_parent_rows,
        (
          select row_count
          from unresolved_after
        ) as remaining_unresolved_null_gvid_rows,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.set_code = $3
            and cp.gv_id is not null
        ) as canonical_numeric_target_count,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.set_code = $4
            and cp.gv_id is not null
        ) as canonical_tg_target_count,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_swsh9_collapse_map)
        ) as old_parent_rows_still_present,
        (
          select coalesce(active_identity_rows, 0)
          from target_identity_by_lane
          where lane = 'numeric'
        ) as numeric_active_identity_rows_on_targets,
        (
          select coalesce(active_identity_rows, 0)
          from target_identity_by_lane
          where lane = 'tg'
        ) as tg_active_identity_rows_on_targets
    `,
    [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
      NUMERIC_TARGET_SET_CODE,
      TG_TARGET_SET_CODE,
    ],
  );

  return {
    summary,
    remaining_old_references: remainingOldReferences,
  };
}

function assertPostValidation(postValidation, deletedParentCount) {
  const remainingReferences = postValidation.remaining_old_references.filter((row) => row.row_count > 0);
  if (remainingReferences.length > 0) {
    throw new Error(`POST_VALIDATION_OLD_REFERENCES:${JSON.stringify(remainingReferences)}`);
  }

  assertEqual(deletedParentCount, EXPECTED.combinedMapCount, 'DELETED_PARENT_COUNT_DRIFT');
  assertZero(postValidation.summary?.remaining_old_parent_rows, 'REMAINING_OLD_PARENTS');
  assertZero(postValidation.summary?.old_parent_rows_still_present, 'OLD_PARENTS_STILL_PRESENT');
  assertZero(postValidation.summary?.remaining_unresolved_null_gvid_rows, 'REMAINING_UNRESOLVED_NULL_GVID');
  assertEqual(
    normalizeCount(postValidation.summary?.canonical_numeric_target_count),
    EXPECTED.canonicalNumericTargetCount,
    'CANONICAL_NUMERIC_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.canonical_tg_target_count),
    EXPECTED.canonicalTgTargetCount,
    'CANONICAL_TG_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.numeric_active_identity_rows_on_targets),
    EXPECTED.numericMapCount,
    'NUMERIC_ACTIVE_IDENTITY_TARGET_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.tg_active_identity_rows_on_targets),
    EXPECTED.tgMapCount,
    'TG_ACTIVE_IDENTITY_TARGET_DRIFT',
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
    numeric_target_set_code: NUMERIC_TARGET_SET_CODE,
    tg_target_set_code: TG_TARGET_SET_CODE,
    preconditions: null,
    fk_inventory: null,
    collision_summary: null,
    canonical_counts_before: null,
    sample_rows_before: null,
    batches: [],
    fk_movement_summary: null,
    deleted_old_parent_rows: null,
    post_validation: null,
    sample_rows_after: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `swsh9_mixed_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempCollapseSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    const fkInventory = await loadCardPrintFkInventory(client);
    report.fk_inventory = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from tmp_swsh9_collapse_map`,
    );
    assertNoUnexpectedReferencedTables(report.fk_inventory);

    report.collision_summary = await loadCollisionSummary(client);
    assertCollisionSummary(report.collision_summary);

    report.canonical_counts_before = await loadCanonicalCounts(client);
    assertEqual(
      normalizeCount(report.canonical_counts_before?.canonical_numeric_target_count),
      EXPECTED.canonicalNumericTargetCount,
      'CANONICAL_NUMERIC_TARGET_BEFORE_DRIFT',
    );
    assertEqual(
      normalizeCount(report.canonical_counts_before?.canonical_tg_target_count),
      EXPECTED.canonicalTgTargetCount,
      'CANONICAL_TG_TARGET_BEFORE_DRIFT',
    );

    report.sample_rows_before = await loadSampleMapRows(client);

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

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
      using tmp_swsh9_collapse_map m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;

    report.post_validation = await loadPostValidation(client, fkInventory);
    assertPostValidation(report.post_validation, report.deleted_old_parent_rows);

    report.sample_rows_after = await loadSampleAfterRows(client, report.sample_rows_before);

    if (report.sample_rows_after.numeric?.old_parent_still_exists !== false) {
      throw new Error(`NUMERIC_SAMPLE_OLD_PARENT_STILL_EXISTS:${report.sample_rows_after.numeric?.old_id ?? 'null'}`);
    }
    if (report.sample_rows_after.tg?.old_parent_still_exists !== false) {
      throw new Error(`TG_SAMPLE_OLD_PARENT_STILL_EXISTS:${report.sample_rows_after.tg?.old_id ?? 'null'}`);
    }

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Keep the original failure as the surfaced error.
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
