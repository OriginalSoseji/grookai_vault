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
const PHASE = 'SM1_DUPLICATE_COLLAPSE_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'sm1';
const TARGET_SET_CODE = 'sm1';

const EXPECTED = {
  unresolvedCount: 1,
  canonicalTargetCount: 172,
  canonicalMatchCount: 1,
  mapCount: 1,
};

const SUPPORTED_REFERENCE_TABLES = new Set([
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'vault_items.card_id',
]);

const BACKUP_SCHEMA_PATH = path.join(
  process.cwd(),
  'backups',
  'sm1_duplicate_collapse_preapply_schema.sql',
);
const BACKUP_DATA_PATH = path.join(
  process.cwd(),
  'backups',
  'sm1_duplicate_collapse_preapply_data.sql',
);

const BACKUP_TABLE_CONFIG = [
  { table_name: 'card_prints', key_column: 'id' },
  { table_name: 'card_print_identity', key_column: 'card_print_id' },
  { table_name: 'card_print_traits', key_column: 'card_print_id' },
  { table_name: 'card_printings', key_column: 'card_print_id' },
  { table_name: 'external_mappings', key_column: 'card_print_id' },
  { table_name: 'vault_items', key_column: 'card_id' },
];

function normalizeCount(value) {
  return Number(value ?? 0);
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function escapePgArrayElement(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (Array.isArray(value)) {
    return buildPgArrayLiteral(value);
  }

  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildPgArrayLiteral(values) {
  return `{${values.map((value) => escapePgArrayElement(value)).join(',')}}`;
}

function toSqlLiteral(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }

  if (value instanceof Date) {
    return sqlQuote(value.toISOString());
  }

  if (Array.isArray(value)) {
    return sqlQuote(buildPgArrayLiteral(value));
  }

  if (typeof value === 'object') {
    return sqlQuote(JSON.stringify(value));
  }

  return sqlQuote(value);
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
    drop table if exists tmp_sm1_unresolved;
    drop table if exists tmp_sm1_canonical;
    drop table if exists tmp_sm1_candidates;
    drop table if exists tmp_sm1_old_counts;
    drop table if exists tmp_sm1_new_counts;
    drop table if exists tmp_sm1_collapse_map;

    create temp table tmp_sm1_unresolved on commit drop as
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.set_code as old_set_code,
      cp.variant_key,
      cpi.printed_number as old_number,
      cpi.normalized_printed_name,
      coalesce(
        nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
        '0'
      ) as normalized_digits
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${SOURCE_SET_CODE_IDENTITY}'
      and cp.gv_id is null;

    create index tmp_sm1_unresolved_match_idx
      on tmp_sm1_unresolved (normalized_digits, normalized_printed_name);

    create temp table tmp_sm1_canonical on commit drop as
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
    where cp.set_code = '${TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create index tmp_sm1_canonical_match_idx
      on tmp_sm1_canonical (normalized_digits, normalized_name);

    create temp table tmp_sm1_candidates on commit drop as
    select
      u.old_id,
      c.new_id
    from tmp_sm1_unresolved u
    join tmp_sm1_canonical c
      on c.normalized_digits = u.normalized_digits
     and c.normalized_name = u.normalized_printed_name;

    create temp table tmp_sm1_old_counts on commit drop as
    select old_id, count(*)::int as match_count
    from tmp_sm1_candidates
    group by old_id;

    create temp table tmp_sm1_new_counts on commit drop as
    select new_id, count(*)::int as match_count
    from tmp_sm1_candidates
    group by new_id;

    create temp table tmp_sm1_collapse_map on commit drop as
    select
      1::int as seq,
      u.old_id,
      c.new_id,
      u.old_name,
      c.new_name,
      u.old_set_code,
      c.new_set_code,
      u.old_number,
      c.new_number,
      u.normalized_digits as old_normalized_digits,
      c.normalized_digits as new_normalized_digits,
      u.normalized_printed_name as old_normalized_name,
      c.normalized_name as new_normalized_name,
      c.new_gv_id
    from tmp_sm1_unresolved u
    join tmp_sm1_candidates candidate
      on candidate.old_id = u.old_id
    join tmp_sm1_canonical c
      on c.new_id = candidate.new_id
    join tmp_sm1_old_counts old_counts
      on old_counts.old_id = candidate.old_id
    join tmp_sm1_new_counts new_counts
      on new_counts.new_id = candidate.new_id
    where old_counts.match_count = 1
      and new_counts.match_count = 1;

    create unique index tmp_sm1_collapse_map_old_uidx
      on tmp_sm1_collapse_map (old_id);

    create unique index tmp_sm1_collapse_map_new_uidx
      on tmp_sm1_collapse_map (new_id);
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with unresolved_summary as (
        select count(*)::int as unresolved_count
        from tmp_sm1_unresolved
      ),
      canonical_summary as (
        select count(*)::int as canonical_target_count
        from tmp_sm1_canonical
      ),
      candidate_summary as (
        select
          count(*)::int as canonical_match_count,
          count(distinct new_id)::int as distinct_candidate_new_count
        from tmp_sm1_candidates
      ),
      map_summary as (
        select
          count(*)::int as map_count,
          count(distinct old_id)::int as distinct_old_count,
          count(distinct new_id)::int as distinct_new_count
        from tmp_sm1_collapse_map
      ),
      multiple_old as (
        select count(*)::int as multiple_match_old_count
        from tmp_sm1_old_counts
        where match_count > 1
      ),
      multiple_new as (
        select count(*)::int as multiple_match_new_count
        from tmp_sm1_new_counts
        where match_count > 1
      ),
      unmatched as (
        select count(*)::int as unmatched_count
        from tmp_sm1_unresolved u
        where not exists (
          select 1
          from tmp_sm1_collapse_map m
          where m.old_id = u.old_id
        )
      ),
      target_identity as (
        select
          count(*)::int as any_identity_rows,
          count(*) filter (where is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_sm1_collapse_map)
      )
      select
        unresolved_summary.unresolved_count,
        canonical_summary.canonical_target_count,
        candidate_summary.canonical_match_count,
        candidate_summary.distinct_candidate_new_count,
        map_summary.map_count,
        map_summary.distinct_old_count,
        map_summary.distinct_new_count,
        multiple_old.multiple_match_old_count,
        multiple_new.multiple_match_new_count,
        unmatched.unmatched_count,
        target_identity.any_identity_rows as target_any_identity_rows,
        target_identity.active_identity_rows as target_active_identity_rows
      from unresolved_summary
      cross join canonical_summary
      cross join candidate_summary
      cross join map_summary
      cross join multiple_old
      cross join multiple_new
      cross join unmatched
      cross join target_identity
    `,
  );
}

function assertPreconditions(summary) {
  assertEqual(
    normalizeCount(summary?.unresolved_count),
    EXPECTED.unresolvedCount,
    'UNRESOLVED_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.canonical_match_count),
    EXPECTED.canonicalMatchCount,
    'CANONICAL_MATCH_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.distinct_candidate_new_count),
    EXPECTED.canonicalMatchCount,
    'DISTINCT_CANDIDATE_NEW_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.map_count), EXPECTED.mapCount, 'MAP_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.distinct_old_count),
    EXPECTED.mapCount,
    'DISTINCT_OLD_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.distinct_new_count),
    EXPECTED.mapCount,
    'DISTINCT_NEW_COUNT_DRIFT',
  );
  assertZero(summary?.multiple_match_old_count, 'MULTIPLE_MATCH_OLD');
  assertZero(summary?.multiple_match_new_count, 'MULTIPLE_MATCH_NEW');
  assertZero(summary?.unmatched_count, 'UNMATCHED_COUNT');
  assertZero(summary?.target_any_identity_rows, 'TARGET_ANY_IDENTITY_ROWS_PRESENT');
  assertZero(summary?.target_active_identity_rows, 'TARGET_ACTIVE_IDENTITY_ROWS_PRESENT');
}

async function loadCollapseMapRow(client) {
  return queryOne(
    client,
    `
      select
        seq,
        old_id,
        new_id,
        old_name,
        new_name,
        old_set_code,
        new_set_code,
        old_number,
        new_number,
        old_normalized_digits,
        new_normalized_digits,
        old_normalized_name,
        new_normalized_name,
        new_gv_id
      from tmp_sm1_collapse_map
      limit 1
    `,
  );
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
  const counts = [];

  for (const fk of fkInventory) {
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${quoteIdent(fk.table_name)}
        where ${quoteIdent(fk.column_name)} in (${sourceClause})
      `,
    );

    counts.push({
      table_name: fk.table_name,
      column_name: fk.column_name,
      row_count: normalizeCount(row?.row_count),
      supported_handler: SUPPORTED_REFERENCE_TABLES.has(`${fk.table_name}.${fk.column_name}`),
    });
  }

  return counts;
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
        where t.card_print_id in (select old_id from tmp_sm1_collapse_map)
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
        from tmp_sm1_collapse_map m
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
        where p.card_print_id in (select old_id from tmp_sm1_collapse_map)
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
        from tmp_sm1_collapse_map m
        join public.card_printings old_p
          on old_p.card_print_id = m.old_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      mappings_on_old as (
        select count(*)::int as row_count
        from public.external_mappings em
        where em.card_print_id in (select old_id from tmp_sm1_collapse_map)
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from tmp_sm1_collapse_map m
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
        where cpi.card_print_id in (select new_id from tmp_sm1_collapse_map)
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
        mappings_on_old.row_count as old_external_mapping_row_count,
        external_conflicts.row_count as external_mapping_conflict_count,
        target_identity.row_count as target_identity_row_count
      from traits_on_old
      cross join printing_on_old
      cross join mappings_on_old
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

async function loadCanonicalCount(client) {
  return queryOne(
    client,
    `
      select count(*)::int as canonical_target_count
      from public.card_prints
      where set_code = $1
        and gv_id is not null
    `,
    [TARGET_SET_CODE],
  );
}

async function loadTableColumns(client, tableName) {
  return queryRows(
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
  );
}

async function loadSchemaSnapshot(client, tableNames) {
  const columns = await queryRows(
    client,
    `
      select
        table_name,
        column_name,
        ordinal_position,
        data_type,
        udt_name,
        is_nullable,
        column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name, ordinal_position
    `,
    [tableNames],
  );

  const constraints = await queryRows(
    client,
    `
      select
        c.relname as table_name,
        con.conname as constraint_name,
        con.contype,
        pg_get_constraintdef(con.oid) as constraint_def
      from pg_constraint con
      join pg_class c
        on c.oid = con.conrelid
      join pg_namespace n
        on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
      order by c.relname, con.conname
    `,
    [tableNames],
  );

  const indexes = await queryRows(
    client,
    `
      select
        tablename as table_name,
        indexname,
        indexdef
      from pg_indexes
      where schemaname = 'public'
        and tablename = any($1::text[])
      order by tablename, indexname
    `,
    [tableNames],
  );

  return { columns, constraints, indexes };
}

async function loadBackupTableRows(client, tableName, keyColumn, ids) {
  const columns = await loadTableColumns(client, tableName);
  const columnNames = columns.map((column) => column.column_name);
  const orderTerms = [quoteIdent(keyColumn)];
  if (columnNames.includes('id') && keyColumn !== 'id') {
    orderTerms.push(quoteIdent('id'));
  }

  const rows = await queryRows(
    client,
    `
      select ${columnNames.map((columnName) => quoteIdent(columnName)).join(', ')}
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(keyColumn)} = any($1::uuid[])
      order by ${orderTerms.join(', ')}
    `,
    [ids],
  );

  return {
    table_name: tableName,
    key_column: keyColumn,
    columns: columnNames,
    rows,
  };
}

function buildSchemaBackupContent({
  generatedAt,
  collapseMapRow,
  fkInventory,
  schemaSnapshot,
  fkCounts,
}) {
  const sections = [];

  sections.push(`-- ${PHASE} PRE-APPLY SCHEMA SNAPSHOT`);
  sections.push(`-- Generated at: ${generatedAt}`);
  sections.push(`-- Mode: apply`);
  sections.push(`-- old_id: ${collapseMapRow.old_id}`);
  sections.push(`-- new_id: ${collapseMapRow.new_id}`);
  sections.push(`-- old_name: ${collapseMapRow.old_name}`);
  sections.push(`-- new_name: ${collapseMapRow.new_name}`);
  sections.push(`-- old_number: ${collapseMapRow.old_number}`);
  sections.push(`-- new_number: ${collapseMapRow.new_number}`);
  sections.push(`-- new_gv_id: ${collapseMapRow.new_gv_id}`);
  sections.push('');
  sections.push('-- Referencing FK inventory to public.card_prints');

  for (const fk of fkInventory) {
    const count = fkCounts.find(
      (row) => row.table_name === fk.table_name && row.column_name === fk.column_name,
    );
    sections.push(
      `-- ${fk.table_name}.${fk.column_name} -> old_id row_count=${normalizeCount(count?.row_count)} supported_handler=${String(
        count?.supported_handler ?? false,
      )}`,
    );
  }

  for (const tableName of BACKUP_TABLE_CONFIG.map((table) => table.table_name)) {
    sections.push('');
    sections.push(`-- Table: public.${tableName}`);
    sections.push('-- Columns');

    for (const column of schemaSnapshot.columns.filter((row) => row.table_name === tableName)) {
      sections.push(
        `--   ${column.column_name} ${column.data_type} (${column.udt_name}) nullable=${column.is_nullable} default=${column.column_default ?? 'null'}`,
      );
    }

    sections.push('-- Constraints');
    const tableConstraints = schemaSnapshot.constraints.filter((row) => row.table_name === tableName);
    if (tableConstraints.length === 0) {
      sections.push('--   none');
    } else {
      for (const constraint of tableConstraints) {
        sections.push(
          `--   ${constraint.constraint_name} [${constraint.contype}] ${constraint.constraint_def}`,
        );
      }
    }

    sections.push('-- Indexes');
    const tableIndexes = schemaSnapshot.indexes.filter((row) => row.table_name === tableName);
    if (tableIndexes.length === 0) {
      sections.push('--   none');
    } else {
      for (const index of tableIndexes) {
        sections.push(`--   ${index.indexname}: ${index.indexdef}`);
      }
    }
  }

  sections.push('');
  return `${sections.join('\n')}\n`;
}

function buildUpsertStatements(tableSnapshot) {
  if (tableSnapshot.rows.length === 0) {
    return [`-- public.${tableSnapshot.table_name}: no rows captured`];
  }

  const columnList = tableSnapshot.columns.map((columnName) => quoteIdent(columnName)).join(', ');
  const updateSet = tableSnapshot.columns
    .filter((columnName) => columnName !== 'id')
    .map((columnName) => `${quoteIdent(columnName)} = excluded.${quoteIdent(columnName)}`)
    .join(', ');

  return tableSnapshot.rows.map((row) => {
    const values = tableSnapshot.columns.map((columnName) => toSqlLiteral(row[columnName])).join(', ');
    return [
      `insert into public.${quoteIdent(tableSnapshot.table_name)} (${columnList})`,
      `values (${values})`,
      `on conflict (${quoteIdent('id')}) do update set ${updateSet};`,
    ].join('\n');
  });
}

function buildDataBackupContent({ generatedAt, collapseMapRow, tableSnapshots }) {
  const sections = [];

  sections.push(`-- ${PHASE} PRE-APPLY DATA SNAPSHOT`);
  sections.push(`-- Generated at: ${generatedAt}`);
  sections.push(`-- old_id: ${collapseMapRow.old_id}`);
  sections.push(`-- new_id: ${collapseMapRow.new_id}`);
  sections.push('begin;');
  sections.push('');
  sections.push('-- Restore parent rows first');

  const cardPrintsSnapshot = tableSnapshots.find((table) => table.table_name === 'card_prints');
  sections.push(...buildUpsertStatements(cardPrintsSnapshot));

  for (const tableName of BACKUP_TABLE_CONFIG.map((table) => table.table_name).filter((name) => name !== 'card_prints')) {
    sections.push('');
    sections.push(`-- Restore public.${tableName}`);
    const snapshot = tableSnapshots.find((table) => table.table_name === tableName);
    sections.push(...buildUpsertStatements(snapshot));
  }

  sections.push('');
  sections.push('commit;');
  sections.push('');
  return `${sections.join('\n')}\n`;
}

async function createBackupArtifacts(client, collapseMapRow, fkInventory, fkCounts) {
  const generatedAt = new Date().toISOString();
  const tableNames = BACKUP_TABLE_CONFIG.map((table) => table.table_name);
  const schemaSnapshot = await loadSchemaSnapshot(client, tableNames);
  const ids = [collapseMapRow.old_id, collapseMapRow.new_id];
  const tableSnapshots = [];

  for (const tableConfig of BACKUP_TABLE_CONFIG) {
    tableSnapshots.push(
      await loadBackupTableRows(client, tableConfig.table_name, tableConfig.key_column, ids),
    );
  }

  const schemaContent = buildSchemaBackupContent({
    generatedAt,
    collapseMapRow,
    fkInventory,
    schemaSnapshot,
    fkCounts,
  });
  const dataContent = buildDataBackupContent({
    generatedAt,
    collapseMapRow,
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

async function loadSupportedFkCounts(client) {
  const tables = [
    ['card_print_identity', 'card_print_id'],
    ['card_print_traits', 'card_print_id'],
    ['card_printings', 'card_print_id'],
    ['external_mappings', 'card_print_id'],
    ['vault_items', 'card_id'],
  ];

  const counts = {};

  for (const [tableName, columnName] of tables) {
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${quoteIdent(tableName)}
        where ${quoteIdent(columnName)} in (
          select old_id from tmp_sm1_collapse_map
        )
      `,
    );

    counts[`${tableName}.${columnName}`] = normalizeCount(row?.row_count);
  }

  return counts;
}

async function applyCollapse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set card_print_id = m.new_id
    from tmp_sm1_collapse_map m
    where cpi.card_print_id = m.old_id
  `);

  const movedTraits = await client.query(`
    update public.card_print_traits old_t
    set card_print_id = m.new_id
    from tmp_sm1_collapse_map m
    where old_t.card_print_id = m.old_id
      and not exists (
        select 1
        from public.card_print_traits new_t
        where new_t.card_print_id = m.new_id
          and new_t.trait_type = old_t.trait_type
          and new_t.trait_value = old_t.trait_value
          and new_t.source = old_t.source
      )
  `);

  const deletedRedundantTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_sm1_collapse_map m
    where old_t.card_print_id = m.old_id
      and exists (
        select 1
        from public.card_print_traits new_t
        where new_t.card_print_id = m.new_id
          and new_t.trait_type = old_t.trait_type
          and new_t.trait_value = old_t.trait_value
          and new_t.source = old_t.source
      )
  `);

  const mergedPrintingMetadata = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_sm1_collapse_map m
      on m.old_id = old_p.card_print_id
    where new_p.card_print_id = m.new_id
      and new_p.finish_key = old_p.finish_key
      and (
        (new_p.provenance_source is null and old_p.provenance_source is not null)
        or (new_p.provenance_ref is null and old_p.provenance_ref is not null)
        or (new_p.created_by is null and old_p.created_by is not null)
      )
  `);

  const movedUniquePrintings = await client.query(`
    update public.card_printings old_p
    set card_print_id = m.new_id
    from tmp_sm1_collapse_map m
    where old_p.card_print_id = m.old_id
      and not exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.new_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const deletedRedundantPrintings = await client.query(`
    delete from public.card_printings old_p
    using tmp_sm1_collapse_map m
    where old_p.card_print_id = m.old_id
      and exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.new_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const updatedExternalMappings = await client.query(`
    update public.external_mappings em
    set card_print_id = m.new_id
    from tmp_sm1_collapse_map m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_sm1_collapse_map m
    join public.card_prints cp_new
      on cp_new.id = m.new_id
    where vi.card_id = m.old_id
  `);

  const fkAfter = await loadSupportedFkCounts(client);
  const remainingOldReferences = Object.entries(fkAfter)
    .filter(([, rowCount]) => rowCount > 0)
    .map(([table_ref, row_count]) => ({ table_ref, row_count }));

  if (remainingOldReferences.length > 0) {
    throw new Error(`REMAINING_OLD_REFERENCES_AFTER_REPOINT:${JSON.stringify(remainingOldReferences)}`);
  }

  return {
    fk_before: fkBefore,
    operations: {
      updated_identity_rows: updatedIdentityRows.rowCount ?? 0,
      moved_traits: movedTraits.rowCount ?? 0,
      deleted_redundant_traits: deletedRedundantTraits.rowCount ?? 0,
      merged_printing_metadata_rows: mergedPrintingMetadata.rowCount ?? 0,
      moved_unique_printings: movedUniquePrintings.rowCount ?? 0,
      deleted_redundant_printings: deletedRedundantPrintings.rowCount ?? 0,
      updated_external_mappings: updatedExternalMappings.rowCount ?? 0,
      updated_vault_items: updatedVaultItems.rowCount ?? 0,
    },
    fk_after: fkAfter,
  };
}

async function loadPostValidation(client, fkInventory) {
  const remainingOldReferences = await loadFkCounts(
    client,
    fkInventory,
    `select old_id from tmp_sm1_collapse_map`,
  );

  const summary = await queryOne(
    client,
    `
      with unresolved_after as (
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is null
      ),
      target_identity as (
        select
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_sm1_collapse_map)
      )
      select
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_sm1_collapse_map)
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
        ) as canonical_target_count,
        (
          select any_identity_rows
          from target_identity
        ) as target_any_identity_rows,
        (
          select active_identity_rows
          from target_identity
        ) as target_active_identity_rows
    `,
    [TARGET_IDENTITY_DOMAIN, SOURCE_SET_CODE_IDENTITY, TARGET_SET_CODE],
  );

  return {
    summary,
    remaining_old_references: remainingOldReferences,
  };
}

function assertPostValidation(postValidation, deletedOldParentRows) {
  const remainingReferences = postValidation.remaining_old_references.filter((row) => row.row_count > 0);
  if (remainingReferences.length > 0) {
    throw new Error(`POST_VALIDATION_OLD_REFERENCES:${JSON.stringify(remainingReferences)}`);
  }

  assertEqual(deletedOldParentRows, EXPECTED.mapCount, 'DELETED_OLD_PARENT_COUNT_DRIFT');
  assertZero(postValidation.summary?.remaining_old_parent_rows, 'REMAINING_OLD_PARENT_ROWS');
  assertZero(
    postValidation.summary?.remaining_unresolved_null_gvid_rows,
    'REMAINING_UNRESOLVED_NULL_GVID_ROWS',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_any_identity_rows),
    EXPECTED.mapCount,
    'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_active_identity_rows),
    EXPECTED.mapCount,
    'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
  );
}

async function loadSampleAfterRow(client, collapseMapRow) {
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
    [collapseMapRow.old_id, collapseMapRow.new_id],
  );

  return {
    ...collapseMapRow,
    ...row,
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    source_set_code_identity: SOURCE_SET_CODE_IDENTITY,
    target_set_code: TARGET_SET_CODE,
    preconditions: null,
    collapse_map: null,
    fk_inventory: null,
    collision_summary: null,
    canonical_count_before: null,
    backup_artifacts: null,
    apply_operations: null,
    deleted_old_parent_rows: 0,
    post_validation: null,
    sample_before_after: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `sm1_duplicate_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempCollapseSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.collapse_map = await loadCollapseMapRow(client);
    if (!report.collapse_map) {
      throw new Error('COLLAPSE_MAP_EMPTY');
    }

    if (
      report.collapse_map.old_normalized_digits !== report.collapse_map.new_normalized_digits ||
      report.collapse_map.old_normalized_name !== report.collapse_map.new_normalized_name
    ) {
      throw new Error('NORMALIZED_MATCH_PROOF_FAILED');
    }

    const fkInventory = await loadCardPrintFkInventory(client);
    report.fk_inventory = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from tmp_sm1_collapse_map`,
    );
    assertNoUnexpectedReferencedTables(report.fk_inventory);

    report.collision_summary = await loadCollisionSummary(client);
    assertCollisionSummary(report.collision_summary);

    report.canonical_count_before = await loadCanonicalCount(client);
    assertEqual(
      normalizeCount(report.canonical_count_before?.canonical_target_count),
      EXPECTED.canonicalTargetCount,
      'CANONICAL_TARGET_COUNT_BEFORE_DRIFT',
    );

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.backup_artifacts = await createBackupArtifacts(
      client,
      report.collapse_map,
      fkInventory,
      report.fk_inventory,
    );

    report.apply_operations = await applyCollapse(client);

    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using tmp_sm1_collapse_map m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;

    report.post_validation = await loadPostValidation(client, fkInventory);
    assertPostValidation(report.post_validation, report.deleted_old_parent_rows);

    report.sample_before_after = await loadSampleAfterRow(client, report.collapse_map);
    if (report.sample_before_after.old_parent_still_exists !== false) {
      throw new Error(`OLD_PARENT_STILL_EXISTS:${report.collapse_map.old_id}`);
    }
    if (report.sample_before_after.new_gv_id !== report.collapse_map.new_gv_id) {
      throw new Error(`TARGET_GVID_DRIFT:${report.sample_before_after.new_gv_id}:${report.collapse_map.new_gv_id}`);
    }

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original failure.
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
