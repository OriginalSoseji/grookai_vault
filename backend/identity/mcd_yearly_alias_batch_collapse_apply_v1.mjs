import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const PHASE = 'MCD_YEARLY_ALIAS_BATCH_COLLAPSE_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const YEAR_PAIRS = Object.freeze([
  { alias_code: '2014xy', canonical_code: 'mcd14', year_label: '2014' },
  { alias_code: '2015xy', canonical_code: 'mcd15', year_label: '2015' },
  { alias_code: '2016xy', canonical_code: 'mcd16', year_label: '2016' },
  { alias_code: '2017sm', canonical_code: 'mcd17', year_label: '2017' },
  { alias_code: '2018sm', canonical_code: 'mcd18', year_label: '2018' },
  { alias_code: '2019sm', canonical_code: 'mcd19', year_label: '2019' },
]);

const BACKUP_SCHEMA_PATH = path.join(
  process.cwd(),
  'backups',
  'mcd_yearly_alias_batch_collapse_preapply_schema.sql',
);
const BACKUP_DATA_PATH = path.join(
  process.cwd(),
  'backups',
  'mcd_yearly_alias_batch_collapse_preapply_data.sql',
);
const REPORT_JSON_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'mcd_yearly_alias_batch_collapse_v1.json',
);

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

function pairLabel(pair) {
  return `${pair.alias_code}->${pair.canonical_code}`;
}

function pickSampleRows(rows) {
  if (rows.length === 0) {
    return { first: null, middle: null, last: null };
  }

  return {
    first: rows[0],
    middle: rows[Math.floor(rows.length / 2)],
    last: rows[rows.length - 1],
  };
}

function mapSignature(rows) {
  return rows
    .map((row) => `${row.old_id}:${row.new_id}`)
    .sort()
    .join('|');
}

function summarizeFailure(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack ?? null : null,
  };
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
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

async function loadSchemaSnapshot(client, tableName) {
  const [columns, constraints, indexes] = await Promise.all([
    queryRows(
      client,
      `
        select column_name, data_type, udt_name, is_nullable, column_default
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
          con.conname as constraint_name,
          case con.contype
            when 'p' then 'p'
            when 'u' then 'u'
            when 'f' then 'f'
            when 'c' then 'c'
            else con.contype::text
          end as constraint_type,
          pg_get_constraintdef(con.oid) as constraint_definition
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace n on n.oid = rel.relnamespace
        where n.nspname = 'public'
          and rel.relname = $1
        order by con.conname
      `,
      [tableName],
    ),
    queryRows(
      client,
      `
        select indexname, indexdef
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

async function loadYearSummary(client, pair) {
  return queryOne(
    client,
    `
      with unresolved as (
        select
          cp.id as old_id,
          cpi.printed_number as old_number,
          coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
          coalesce(
            cpi.normalized_printed_name,
            lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g'))
          ) as normalized_printed_name
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is null
      ),
      canonical as (
        select
          cp.id as new_id,
          cp.number as new_number,
          coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
          cp.gv_id as new_gv_id,
          lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name
        from public.card_prints cp
        where cp.set_code = $3
          and cp.gv_id is not null
      ),
      candidate_matches as (
        select u.old_id, c.new_id
        from unresolved u
        join canonical c
          on c.new_number_normalized = u.old_number_normalized
         and c.normalized_name = u.normalized_printed_name
      ),
      old_counts as (
        select old_id, count(*)::int as match_count
        from candidate_matches
        group by old_id
      ),
      new_counts as (
        select new_id, count(*)::int as match_count
        from candidate_matches
        group by new_id
      ),
      collapse_map as (
        select u.old_id, c.new_id
        from unresolved u
        join candidate_matches candidate
          on candidate.old_id = u.old_id
        join canonical c
          on c.new_id = candidate.new_id
        join old_counts old_match
          on old_match.old_id = candidate.old_id
        join new_counts new_match
          on new_match.new_id = candidate.new_id
        where old_match.match_count = 1
          and new_match.match_count = 1
      ),
      target_identity as (
        select
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from collapse_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.new_id
      )
      select
        (select count(*)::int from unresolved) as source_count,
        (select count(*)::int from unresolved where old_number ~ '^[0-9]+$') as numeric_count,
        (select count(*)::int from unresolved where old_number !~ '^[0-9]+$') as non_numeric_count,
        (select count(*)::int from canonical) as target_count,
        (select count(*)::int from candidate_matches) as mapping_candidate_count,
        (select count(*)::int from collapse_map) as map_count,
        (select count(distinct old_id)::int from collapse_map) as distinct_old_count,
        (select count(distinct new_id)::int from collapse_map) as distinct_new_count,
        (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
        (select count(*)::int from new_counts where match_count > 1) as reused_new_count,
        (
          select count(*)::int
          from unresolved u
          where not exists (
            select 1
            from collapse_map m
            where m.old_id = u.old_id
          )
        ) as unmatched_count,
        (
          select count(*)::int
          from unresolved u
          where exists (
            select 1
            from canonical c
            where c.new_number_normalized = u.old_number_normalized
              and c.normalized_name = u.normalized_printed_name
          )
        ) as same_number_same_name_count,
        (
          select count(*)::int
          from unresolved u
          where exists (
            select 1
            from canonical c
            where c.new_number_normalized = u.old_number_normalized
              and c.normalized_name <> u.normalized_printed_name
          )
        ) as same_number_different_name_count,
        (
          select count(*)::int
          from canonical
          where new_gv_id like ('GV-PK-MCD-' || $4 || '-%')
        ) as canonical_namespace_match_count,
        (
          select count(*)::int
          from canonical
          where new_gv_id not like ('GV-PK-MCD-' || $4 || '-%')
        ) as namespace_conflict_count,
        target_identity.any_identity_rows as target_any_identity_rows,
        target_identity.active_identity_rows as target_active_identity_rows
      from target_identity
    `,
    [
      TARGET_IDENTITY_DOMAIN,
      pair.alias_code,
      pair.canonical_code,
      pair.year_label,
    ],
  );
}

async function loadYearUnresolvedRows(client, pair) {
  return queryRows(
    client,
    `
      select
        cp.id as old_id,
        cp.name as old_name,
        cp.set_code as old_set_code,
        cpi.printed_number as old_number,
        coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
        coalesce(
          cpi.normalized_printed_name,
          lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g'))
        ) as normalized_printed_name
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
      order by coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0')::int, cp.id
    `,
    [TARGET_IDENTITY_DOMAIN, pair.alias_code],
  );
}

async function loadYearMapRows(client, pair) {
  return queryRows(
    client,
    `
      with unresolved as (
        select
          cp.id as old_id,
          cp.name as old_name,
          cp.set_code as old_set_code,
          cpi.printed_number as old_number,
          coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
          coalesce(
            cpi.normalized_printed_name,
            lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g'))
          ) as normalized_printed_name
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is null
      ),
      canonical as (
        select
          cp.id as new_id,
          cp.name as new_name,
          cp.set_code as new_set_code,
          cp.number as new_number,
          coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
          cp.gv_id as new_gv_id,
          lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name
        from public.card_prints cp
        where cp.set_code = $3
          and cp.gv_id is not null
      ),
      candidate_matches as (
        select u.old_id, c.new_id
        from unresolved u
        join canonical c
          on c.new_number_normalized = u.old_number_normalized
         and c.normalized_name = u.normalized_printed_name
      ),
      old_counts as (
        select old_id, count(*)::int as match_count
        from candidate_matches
        group by old_id
      ),
      new_counts as (
        select new_id, count(*)::int as match_count
        from candidate_matches
        group by new_id
      )
      select
        row_number() over (order by u.old_number_normalized::int, u.old_id)::int as seq,
        u.old_id,
        c.new_id,
        u.old_name,
        c.new_name,
        u.old_set_code,
        c.new_set_code,
        u.old_number,
        c.new_number,
        u.old_number_normalized,
        c.new_number_normalized,
        u.normalized_printed_name,
        c.normalized_name,
        c.new_gv_id
      from unresolved u
      join candidate_matches candidate
        on candidate.old_id = u.old_id
      join canonical c
        on c.new_id = candidate.new_id
      join old_counts old_match
        on old_match.old_id = candidate.old_id
      join new_counts new_match
        on new_match.new_id = candidate.new_id
      where old_match.match_count = 1
        and new_match.match_count = 1
      order by seq
    `,
    [
      TARGET_IDENTITY_DOMAIN,
      pair.alias_code,
      pair.canonical_code,
    ],
  );
}

async function loadFkCountsByIds(client, fkInventory, ids) {
  const results = [];
  for (const fk of fkInventory) {
    const row = await queryOne(
      client,
      `select count(*)::int as row_count from public.${quoteIdent(fk.table_name)} where ${quoteIdent(fk.column_name)} = any($1::uuid[])`,
      [ids],
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

async function loadCollisionSummary(client, mapRows) {
  if (mapRows.length === 0) {
    return {
      old_trait_row_count: 0,
      trait_target_key_conflict_count: 0,
      trait_conflicting_non_identical_count: 0,
      old_printing_row_count: 0,
      printing_finish_conflict_count: 0,
      printing_mergeable_metadata_only_count: 0,
      printing_conflicting_non_identical_count: 0,
      old_external_mapping_row_count: 0,
      external_mapping_conflict_count: 0,
    };
  }

  const payload = JSON.stringify(
    mapRows.map((row) => ({
      old_id: row.old_id,
      new_id: row.new_id,
    })),
  );

  return queryOne(
    client,
    `
      with collapse_map as (
        select old_id, new_id
        from jsonb_to_recordset($1::jsonb) as payload(
          old_id uuid,
          new_id uuid
        )
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
        from collapse_map m
        join public.card_print_traits old_t
          on old_t.card_print_id = m.old_id
        join public.card_print_traits new_t
          on new_t.card_print_id = m.new_id
         and new_t.trait_type = old_t.trait_type
         and new_t.trait_value = old_t.trait_value
         and new_t.source = old_t.source
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
        from collapse_map m
        join public.card_printings old_p
          on old_p.card_print_id = m.old_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from collapse_map m
        join public.external_mappings old_em
          on old_em.card_print_id = m.old_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      )
      select
        (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from collapse_map)) as old_trait_row_count,
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
        (select count(*)::int from public.card_printings where card_print_id in (select old_id from collapse_map)) as old_printing_row_count,
        (select count(*)::int from printing_finish_conflicts) as printing_finish_conflict_count,
        (
          select count(*)::int
          from printing_finish_conflicts
          where old_is_provisional = new_is_provisional
            and (new_provenance_source is null or new_provenance_source = old_provenance_source)
            and (new_provenance_ref is null or new_provenance_ref = old_provenance_ref)
            and (new_created_by is null or new_created_by = old_created_by)
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
        (select count(*)::int from public.external_mappings where card_print_id in (select old_id from collapse_map)) as old_external_mapping_row_count,
        external_conflicts.row_count as external_mapping_conflict_count
      from external_conflicts
    `,
    [payload],
  );
}

function determineBlockReason(summary, fkCounts, collisionSummary) {
  const unsupported = fkCounts.filter((row) => row.row_count > 0 && !row.supported_handler);
  if (normalizeCount(summary?.source_count) === 0) {
    return 'NO_SOURCE_ROWS';
  }
  if (normalizeCount(summary?.numeric_count) !== normalizeCount(summary?.source_count)) {
    return `NON_NUMERIC_SOURCE_ROWS:${normalizeCount(summary?.non_numeric_count)}`;
  }
  if (normalizeCount(summary?.target_count) === 0) {
    return 'CANONICAL_TARGET_MISSING';
  }
  if (normalizeCount(summary?.source_count) !== normalizeCount(summary?.target_count)) {
    return `SOURCE_TARGET_COUNT_MISMATCH:${normalizeCount(summary?.source_count)}:${normalizeCount(summary?.target_count)}`;
  }
  if (normalizeCount(summary?.mapping_candidate_count) !== normalizeCount(summary?.source_count)) {
    return `MAPPING_CANDIDATE_COUNT_MISMATCH:${normalizeCount(summary?.mapping_candidate_count)}:${normalizeCount(summary?.source_count)}`;
  }
  if (normalizeCount(summary?.map_count) !== normalizeCount(summary?.source_count)) {
    return `MAP_COUNT_MISMATCH:${normalizeCount(summary?.map_count)}:${normalizeCount(summary?.source_count)}`;
  }
  if (normalizeCount(summary?.distinct_old_count) !== normalizeCount(summary?.source_count)) {
    return `DISTINCT_OLD_COUNT_MISMATCH:${normalizeCount(summary?.distinct_old_count)}:${normalizeCount(summary?.source_count)}`;
  }
  if (normalizeCount(summary?.distinct_new_count) !== normalizeCount(summary?.source_count)) {
    return `DISTINCT_NEW_COUNT_MISMATCH:${normalizeCount(summary?.distinct_new_count)}:${normalizeCount(summary?.source_count)}`;
  }
  if (normalizeCount(summary?.multiple_match_old_count) !== 0) {
    return `MULTIPLE_MATCH_OLD:${normalizeCount(summary?.multiple_match_old_count)}`;
  }
  if (normalizeCount(summary?.reused_new_count) !== 0) {
    return `REUSED_NEW:${normalizeCount(summary?.reused_new_count)}`;
  }
  if (normalizeCount(summary?.unmatched_count) !== 0) {
    return `UNMATCHED_ROWS:${normalizeCount(summary?.unmatched_count)}`;
  }
  if (normalizeCount(summary?.same_number_same_name_count) !== normalizeCount(summary?.source_count)) {
    return `SAME_NUMBER_SAME_NAME_MISMATCH:${normalizeCount(summary?.same_number_same_name_count)}:${normalizeCount(summary?.source_count)}`;
  }
  if (normalizeCount(summary?.same_number_different_name_count) !== 0) {
    return `SAME_NUMBER_DIFFERENT_NAME:${normalizeCount(summary?.same_number_different_name_count)}`;
  }
  if (normalizeCount(summary?.canonical_namespace_match_count) !== normalizeCount(summary?.target_count)) {
    return `CANONICAL_NAMESPACE_MISMATCH:${normalizeCount(summary?.canonical_namespace_match_count)}:${normalizeCount(summary?.target_count)}`;
  }
  if (normalizeCount(summary?.namespace_conflict_count) !== 0) {
    return `NAMESPACE_CONFLICT:${normalizeCount(summary?.namespace_conflict_count)}`;
  }
  if (normalizeCount(summary?.target_any_identity_rows) !== 0) {
    return `TARGET_IDENTITY_ROWS_PRESENT:${normalizeCount(summary?.target_any_identity_rows)}`;
  }
  if (normalizeCount(summary?.target_active_identity_rows) !== 0) {
    return `TARGET_ACTIVE_IDENTITY_ROWS_PRESENT:${normalizeCount(summary?.target_active_identity_rows)}`;
  }
  if (unsupported.length > 0) {
    return `UNSUPPORTED_REFERENCING_TABLES:${JSON.stringify(unsupported)}`;
  }
  if (normalizeCount(collisionSummary?.trait_conflicting_non_identical_count) !== 0) {
    return `TRAIT_CONFLICTING_NON_IDENTICAL:${normalizeCount(collisionSummary?.trait_conflicting_non_identical_count)}`;
  }
  if (
    normalizeCount(collisionSummary?.printing_mergeable_metadata_only_count)
    !== normalizeCount(collisionSummary?.printing_finish_conflict_count)
  ) {
    return `PRINTING_MERGEABLE_COUNT_DRIFT:${normalizeCount(collisionSummary?.printing_mergeable_metadata_only_count)}:${normalizeCount(collisionSummary?.printing_finish_conflict_count)}`;
  }
  if (normalizeCount(collisionSummary?.printing_conflicting_non_identical_count) !== 0) {
    return `PRINTING_CONFLICTING_NON_IDENTICAL:${normalizeCount(collisionSummary?.printing_conflicting_non_identical_count)}`;
  }
  if (normalizeCount(collisionSummary?.external_mapping_conflict_count) !== 0) {
    return `EXTERNAL_MAPPING_CONFLICT:${normalizeCount(collisionSummary?.external_mapping_conflict_count)}`;
  }
  return null;
}

async function auditYear(client, pair, fkInventory) {
  const summary = await loadYearSummary(client, pair);
  const unresolvedRows = await loadYearUnresolvedRows(client, pair);
  const mapRows = await loadYearMapRows(client, pair);
  const fkCounts = await loadFkCountsByIds(
    client,
    fkInventory,
    unresolvedRows.map((row) => row.old_id),
  );
  const collisionSummary = await loadCollisionSummary(client, mapRows);
  const blockReason = determineBlockReason(summary, fkCounts, collisionSummary);

  return {
    ...pair,
    ...summary,
    apply_safe: blockReason === null,
    block_reason: blockReason,
    unresolved_rows: unresolvedRows,
    map_rows: mapRows,
    sample_rows_before: pickSampleRows(mapRows),
    fk_inventory: fkCounts,
    collision_summary: collisionSummary,
  };
}

function buildSchemaBackupContent({
  generatedAt,
  safeAudits,
  blockedAudits,
  combinedFkCounts,
  fkInventory,
  schemaSnapshot,
}) {
  const lines = [
    `-- ${PHASE} PRE-APPLY SCHEMA SNAPSHOT`,
    `-- Generated at: ${generatedAt}`,
    `-- Mode: ${MODE}`,
    `-- apply_safe_years: ${safeAudits.map((audit) => pairLabel(audit)).join(', ') || '(none)'}`,
    `-- blocked_years: ${blockedAudits.map((audit) => `${pairLabel(audit)}:${audit.block_reason}`).join(', ') || '(none)'}`,
    `-- combined_collapse_map_count: ${safeAudits.reduce((sum, audit) => sum + audit.map_rows.length, 0)}`,
    '',
    '-- Sample collapse map rows by year',
  ];

  for (const audit of safeAudits) {
    lines.push(`-- ${pairLabel(audit)} count=${audit.map_rows.length}`);
    for (const [label, row] of Object.entries(audit.sample_rows_before)) {
      if (!row) {
        continue;
      }
      lines.push(
        `--   ${label}: old_id=${row.old_id} old_name=${row.old_name} old_number=${row.old_number} new_id=${row.new_id} new_name=${row.new_name} new_number=${row.new_number} new_gv_id=${row.new_gv_id}`,
      );
    }
  }

  lines.push('');
  lines.push('-- Combined referencing FK inventory to public.card_prints');
  for (const fk of fkInventory) {
    const match = combinedFkCounts.find(
      (row) => row.table_name === fk.table_name && row.column_name === fk.column_name,
    );
    lines.push(
      `-- ${fk.table_name}.${fk.column_name} -> old_id row_count=${normalizeCount(match?.row_count)} supported_handler=${SUPPORTED_REFERENCE_TABLES.has(`${fk.table_name}.${fk.column_name}`)}`,
    );
  }

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

function buildDataBackupContent({ generatedAt, safeAudits, tableSnapshots }) {
  const lines = [
    `-- ${PHASE} PRE-APPLY DATA SNAPSHOT`,
    `-- Generated at: ${generatedAt}`,
    `-- Mode: ${MODE}`,
    `-- apply_safe_years: ${safeAudits.map((audit) => pairLabel(audit)).join(', ') || '(none)'}`,
    `-- combined_collapse_map_count: ${safeAudits.reduce((sum, audit) => sum + audit.map_rows.length, 0)}`,
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

async function createBackupArtifacts(client, safeAudits, blockedAudits, fkInventory) {
  if (safeAudits.length === 0) {
    throw new Error('NO_APPLY_SAFE_YEARS_FOR_BACKUP');
  }

  const generatedAt = new Date().toISOString();
  const ids = [
    ...new Set(
      safeAudits.flatMap((audit) => audit.map_rows.flatMap((row) => [row.old_id, row.new_id])),
    ),
  ];
  const oldIds = [
    ...new Set(
      safeAudits.flatMap((audit) => audit.map_rows.map((row) => row.old_id)),
    ),
  ];
  const combinedFkCounts = await loadFkCountsByIds(client, fkInventory, oldIds);
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
    safeAudits,
    blockedAudits,
    combinedFkCounts,
    fkInventory,
    schemaSnapshot,
  });
  const dataContent = buildDataBackupContent({
    generatedAt,
    safeAudits,
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
    combined_fk_counts: combinedFkCounts,
    table_row_counts: tableSnapshots.map((table) => ({
      table_name: table.table_name,
      row_count: table.rows.length,
    })),
  };
}

async function createTempYearMap(client, mapRows) {
  const payload = JSON.stringify(
    mapRows.map((row) => ({
      seq: row.seq,
      old_id: row.old_id,
      new_id: row.new_id,
      new_gv_id: row.new_gv_id,
    })),
  );

  await client.query(`drop table if exists tmp_mcd_year_apply_map`);
  await client.query(
    `
      create temp table tmp_mcd_year_apply_map (
        seq int not null,
        old_id uuid not null,
        new_id uuid not null,
        new_gv_id text not null
      ) on commit drop
    `,
  );
  await client.query(
    `
      insert into tmp_mcd_year_apply_map (seq, old_id, new_id, new_gv_id)
      select seq, old_id, new_id, new_gv_id
      from jsonb_to_recordset($1::jsonb) as payload(
        seq int,
        old_id uuid,
        new_id uuid,
        new_gv_id text
      )
    `,
    [payload],
  );
  await client.query(
    `create unique index tmp_mcd_year_apply_map_old_uidx on tmp_mcd_year_apply_map (old_id)`,
  );
  await client.query(
    `create unique index tmp_mcd_year_apply_map_new_uidx on tmp_mcd_year_apply_map (new_id)`,
  );
}

async function loadBatchFkCounts(client) {
  return {
    'card_print_identity.card_print_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.card_print_identity
            where card_print_id in (select old_id from tmp_mcd_year_apply_map)
          `,
        )
      )?.row_count,
    ),
    'card_print_traits.card_print_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.card_print_traits
            where card_print_id in (select old_id from tmp_mcd_year_apply_map)
          `,
        )
      )?.row_count,
    ),
    'card_printings.card_print_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.card_printings
            where card_print_id in (select old_id from tmp_mcd_year_apply_map)
          `,
        )
      )?.row_count,
    ),
    'external_mappings.card_print_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.external_mappings
            where card_print_id in (select old_id from tmp_mcd_year_apply_map)
          `,
        )
      )?.row_count,
    ),
    'vault_items.card_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.vault_items
            where card_id in (select old_id from tmp_mcd_year_apply_map)
          `,
        )
      )?.row_count,
    ),
  };
}

async function applyYearBatch(client) {
  const fkBefore = await loadBatchFkCounts(client);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set card_print_id = m.new_id
    from tmp_mcd_year_apply_map m
    where cpi.card_print_id = m.old_id
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
      m.new_id,
      t.trait_type,
      t.trait_value,
      t.source,
      t.confidence,
      t.created_at,
      t.hp,
      t.national_dex,
      t.types,
      t.rarity,
      t.supertype,
      t.card_category,
      t.legacy_rarity
    from public.card_print_traits t
    join tmp_mcd_year_apply_map m
      on m.old_id = t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedTraits = await client.query(`
    delete from public.card_print_traits t
    using tmp_mcd_year_apply_map m
    where t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadata = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_mcd_year_apply_map m
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
    from tmp_mcd_year_apply_map m
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
    using tmp_mcd_year_apply_map m
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
    from tmp_mcd_year_apply_map m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_mcd_year_apply_map m
    join public.card_prints cp_new
      on cp_new.id = m.new_id
    where vi.card_id = m.old_id
  `);

  const fkAfter = await loadBatchFkCounts(client);
  const remaining = Object.entries(fkAfter)
    .filter(([, count]) => count > 0)
    .map(([table_ref, row_count]) => ({ table_ref, row_count }));

  if (remaining.length > 0) {
    throw new Error(`BATCH_REMAINING_OLD_REFERENCES:${JSON.stringify(remaining)}`);
  }

  return {
    fk_before: fkBefore,
    operations: {
      updated_identity_rows: updatedIdentityRows.rowCount ?? 0,
      inserted_traits: insertedTraits.rowCount ?? 0,
      deleted_old_traits: deletedTraits.rowCount ?? 0,
      merged_printing_metadata_rows: mergedPrintingMetadata.rowCount ?? 0,
      moved_unique_printings: movedUniquePrintings.rowCount ?? 0,
      deleted_redundant_printings: deletedRedundantPrintings.rowCount ?? 0,
      updated_external_mappings: updatedExternalMappings.rowCount ?? 0,
      updated_vault_items: updatedVaultItems.rowCount ?? 0,
    },
    fk_after: fkAfter,
  };
}

async function loadRemainingOldReferencesFromTemp(client, fkInventory) {
  const results = [];
  for (const fk of fkInventory) {
    const row = await queryOne(
      client,
      `select count(*)::int as row_count from public.${quoteIdent(fk.table_name)} where ${quoteIdent(fk.column_name)} in (select old_id from tmp_mcd_year_apply_map)`,
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

async function loadYearPostValidation(client, pair, fkInventory, activeIdentityTotalBefore) {
  const remainingOldReferences = await loadRemainingOldReferencesFromTemp(client, fkInventory);
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
        from tmp_mcd_year_apply_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.new_id
      ),
      route_rows as (
        select count(*)::int as row_count
        from public.card_prints
        where id in (select new_id from tmp_mcd_year_apply_map)
          and gv_id is not null
      ),
      active_identity_total as (
        select count(*)::int as row_count
        from public.card_print_identity
        where is_active = true
      )
      select
        (select count(*)::int from public.card_prints where id in (select old_id from tmp_mcd_year_apply_map)) as remaining_old_parent_rows,
        (select row_count from unresolved_after) as remaining_unresolved_null_gvid_rows_for_alias,
        (select count(*)::int from public.card_prints where set_code = $3 and gv_id is not null) as canonical_target_count,
        (
          select count(*)::int
          from tmp_mcd_year_apply_map m
          join public.card_prints cp
            on cp.id = m.new_id
          where cp.gv_id is distinct from m.new_gv_id
        ) as target_gv_id_drift_count,
        (select any_identity_rows from target_identity) as target_any_identity_rows,
        (select active_identity_rows from target_identity) as target_active_identity_rows,
        (select row_count from route_rows) as route_resolvable_target_rows,
        (select row_count from active_identity_total) as active_identity_total_after,
        $4::int as active_identity_total_before
    `,
    [
      TARGET_IDENTITY_DOMAIN,
      pair.alias_code,
      pair.canonical_code,
      activeIdentityTotalBefore,
    ],
  );

  return {
    summary,
    remaining_old_references: remainingOldReferences,
  };
}

function assertYearPostValidation(pair, postValidation, deletedOldParentRows, expectedCount) {
  const remainingReferences = postValidation.remaining_old_references.filter((row) => row.row_count > 0);
  if (remainingReferences.length > 0) {
    throw new Error(`POST_VALIDATION_OLD_REFERENCES:${pair.alias_code}:${JSON.stringify(remainingReferences)}`);
  }
  if (deletedOldParentRows !== expectedCount) {
    throw new Error(`DELETED_OLD_PARENT_COUNT_DRIFT:${pair.alias_code}:${deletedOldParentRows}:${expectedCount}`);
  }
  if (normalizeCount(postValidation.summary?.remaining_old_parent_rows) !== 0) {
    throw new Error(`REMAINING_OLD_PARENT_ROWS:${pair.alias_code}:${normalizeCount(postValidation.summary?.remaining_old_parent_rows)}`);
  }
  if (normalizeCount(postValidation.summary?.remaining_unresolved_null_gvid_rows_for_alias) !== 0) {
    throw new Error(`REMAINING_UNRESOLVED_NULL_GVID_ROWS:${pair.alias_code}:${normalizeCount(postValidation.summary?.remaining_unresolved_null_gvid_rows_for_alias)}`);
  }
  if (normalizeCount(postValidation.summary?.canonical_target_count) !== expectedCount) {
    throw new Error(`CANONICAL_TARGET_COUNT_AFTER_DRIFT:${pair.alias_code}:${normalizeCount(postValidation.summary?.canonical_target_count)}:${expectedCount}`);
  }
  if (normalizeCount(postValidation.summary?.target_gv_id_drift_count) !== 0) {
    throw new Error(`TARGET_GV_ID_DRIFT_COUNT:${pair.alias_code}:${normalizeCount(postValidation.summary?.target_gv_id_drift_count)}`);
  }
  if (normalizeCount(postValidation.summary?.target_any_identity_rows) !== expectedCount) {
    throw new Error(`TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT:${pair.alias_code}:${normalizeCount(postValidation.summary?.target_any_identity_rows)}:${expectedCount}`);
  }
  if (normalizeCount(postValidation.summary?.target_active_identity_rows) !== expectedCount) {
    throw new Error(`TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT:${pair.alias_code}:${normalizeCount(postValidation.summary?.target_active_identity_rows)}:${expectedCount}`);
  }
  if (normalizeCount(postValidation.summary?.route_resolvable_target_rows) !== expectedCount) {
    throw new Error(`ROUTE_RESOLVABLE_TARGET_ROWS_DRIFT:${pair.alias_code}:${normalizeCount(postValidation.summary?.route_resolvable_target_rows)}:${expectedCount}`);
  }
  if (
    normalizeCount(postValidation.summary?.active_identity_total_after)
    !== normalizeCount(postValidation.summary?.active_identity_total_before)
  ) {
    throw new Error(
      `ACTIVE_IDENTITY_TOTAL_DRIFT:${pair.alias_code}:${normalizeCount(postValidation.summary?.active_identity_total_after)}:${normalizeCount(postValidation.summary?.active_identity_total_before)}`,
    );
  }
}

async function loadSampleAfterRows(client, sampleRowsBefore) {
  const loadOne = async (sample) => {
    if (!sample) {
      return null;
    }

    const row = await queryOne(
      client,
      `
        select
          exists(select 1 from public.card_prints where id = $1) as old_parent_still_exists,
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
    first: await loadOne(sampleRowsBefore.first),
    middle: await loadOne(sampleRowsBefore.middle),
    last: await loadOne(sampleRowsBefore.last),
  };
}

function assertSampleAfterRows(sampleRowsBefore, sampleRowsAfter, aliasCode) {
  for (const label of ['first', 'middle', 'last']) {
    const before = sampleRowsBefore?.[label];
    const after = sampleRowsAfter?.[label];
    if (!before || !after) {
      throw new Error(`MISSING_SAMPLE_AFTER:${aliasCode}:${label}`);
    }
    if (after.old_parent_still_exists !== false) {
      throw new Error(`SAMPLE_OLD_PARENT_STILL_EXISTS:${aliasCode}:${label}:${after.old_id}`);
    }
    if (after.new_gv_id !== before.new_gv_id) {
      throw new Error(`SAMPLE_TARGET_GV_ID_DRIFT:${aliasCode}:${label}`);
    }
    if (normalizeCount(after.active_identity_row_count_on_new_parent) !== 1) {
      throw new Error(`SAMPLE_ACTIVE_IDENTITY_COUNT_DRIFT:${aliasCode}:${label}:${normalizeCount(after.active_identity_row_count_on_new_parent)}`);
    }
  }
}

function sumFkCounts(years) {
  const totals = {
    card_print_identity: 0,
    card_print_traits: 0,
    card_printings: 0,
    external_mappings: 0,
    vault_items: 0,
  };

  for (const year of years) {
    totals.card_print_identity += normalizeCount(year.fk_movement_summary?.updated_identity_rows);
    totals.card_print_traits += normalizeCount(year.fk_movement_summary?.inserted_traits);
    totals.card_printings += normalizeCount(year.fk_movement_summary?.moved_unique_printings)
      + normalizeCount(year.fk_movement_summary?.merged_printing_metadata_rows)
      + normalizeCount(year.fk_movement_summary?.deleted_redundant_printings);
    totals.external_mappings += normalizeCount(year.fk_movement_summary?.updated_external_mappings);
    totals.vault_items += normalizeCount(year.fk_movement_summary?.updated_vault_items);
  }

  return totals;
}

function buildAuditSummary(audits) {
  const safeAudits = audits.filter((audit) => audit.apply_safe);
  const blockedAudits = audits.filter((audit) => !audit.apply_safe);

  return {
    total_year_pairs: audits.length,
    apply_safe_year_count: safeAudits.length,
    blocked_year_count: blockedAudits.length,
    combined_source_count: safeAudits.reduce((sum, audit) => sum + normalizeCount(audit.source_count), 0),
    combined_target_count: safeAudits.reduce((sum, audit) => sum + normalizeCount(audit.target_count), 0),
    combined_map_count: safeAudits.reduce((sum, audit) => sum + normalizeCount(audit.map_count), 0),
    combined_fk_counts: {
      card_print_identity: safeAudits.reduce((sum, audit) => sum + normalizeCount(audit.fk_inventory.find((row) => row.table_name === 'card_print_identity' && row.column_name === 'card_print_id')?.row_count), 0),
      card_print_traits: safeAudits.reduce((sum, audit) => sum + normalizeCount(audit.fk_inventory.find((row) => row.table_name === 'card_print_traits' && row.column_name === 'card_print_id')?.row_count), 0),
      card_printings: safeAudits.reduce((sum, audit) => sum + normalizeCount(audit.fk_inventory.find((row) => row.table_name === 'card_printings' && row.column_name === 'card_print_id')?.row_count), 0),
      external_mappings: safeAudits.reduce((sum, audit) => sum + normalizeCount(audit.fk_inventory.find((row) => row.table_name === 'external_mappings' && row.column_name === 'card_print_id')?.row_count), 0),
      vault_items: safeAudits.reduce((sum, audit) => sum + normalizeCount(audit.fk_inventory.find((row) => row.table_name === 'vault_items' && row.column_name === 'card_id')?.row_count), 0),
    },
  };
}

function writeJsonReport(report) {
  ensureParentDir(REPORT_JSON_PATH);
  fs.writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

async function applyYear(client, frozenAudit, fkInventory) {
  const pair = {
    alias_code: frozenAudit.alias_code,
    canonical_code: frozenAudit.canonical_code,
    year_label: frozenAudit.year_label,
  };

  try {
    await client.query('begin');

    const liveAudit = await auditYear(client, pair, fkInventory);
    if (!liveAudit.apply_safe) {
      throw new Error(`YEAR_NOT_APPLY_SAFE:${pair.alias_code}:${liveAudit.block_reason}`);
    }
    if (mapSignature(liveAudit.map_rows) !== mapSignature(frozenAudit.map_rows)) {
      throw new Error(`FROZEN_MAP_DRIFT:${pair.alias_code}`);
    }

    const activeIdentityTotalBefore = await loadActiveIdentityCount(client);
    await createTempYearMap(client, liveAudit.map_rows);

    const batch = await applyYearBatch(client);
    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using tmp_mcd_year_apply_map m
      where cp.id = m.old_id
    `);

    const postValidation = await loadYearPostValidation(
      client,
      pair,
      fkInventory,
      activeIdentityTotalBefore,
    );
    assertYearPostValidation(
      pair,
      postValidation,
      deletedParents.rowCount ?? 0,
      normalizeCount(liveAudit.source_count),
    );

    const sampleRowsAfter = await loadSampleAfterRows(client, liveAudit.sample_rows_before);
    assertSampleAfterRows(liveAudit.sample_rows_before, sampleRowsAfter, pair.alias_code);

    await client.query('commit');

    return {
      alias_code: pair.alias_code,
      canonical_code: pair.canonical_code,
      year_label: pair.year_label,
      status: 'applied',
      collapsed_count: normalizeCount(liveAudit.source_count),
      deleted_old_parent_rows: deletedParents.rowCount ?? 0,
      fk_before: batch.fk_before,
      fk_after: batch.fk_after,
      fk_movement_summary: batch.operations,
      post_validation: postValidation.summary,
      sample_rows_before: liveAudit.sample_rows_before,
      sample_rows_after: sampleRowsAfter,
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original failure.
    }

    return {
      alias_code: pair.alias_code,
      canonical_code: pair.canonical_code,
      year_label: pair.year_label,
      status: 'blocked_during_apply',
      block_reason: error instanceof Error ? error.message : String(error),
      failure: summarizeFailure(error),
    };
  }
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
    year_pairs: YEAR_PAIRS,
    audit_results: [],
    audit_summary: null,
    backup_artifacts: null,
    applied_years: [],
    blocked_years: [],
    combined_fk_movement_summary: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `mcd_yearly_alias_batch_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    const fkInventory = await loadCardPrintFkInventory(client);
    const audits = [];
    for (const pair of YEAR_PAIRS) {
      audits.push(await auditYear(client, pair, fkInventory));
    }

    report.audit_results = audits.map((audit) => ({
      ...audit,
      unresolved_rows: undefined,
      map_rows: undefined,
    }));
    report.audit_summary = buildAuditSummary(audits);

    const safeAudits = audits.filter((audit) => audit.apply_safe);
    const blockedAudits = audits.filter((audit) => !audit.apply_safe);
    report.blocked_years = blockedAudits.map((audit) => ({
      alias_code: audit.alias_code,
      canonical_code: audit.canonical_code,
      year_label: audit.year_label,
      block_reason: audit.block_reason,
    }));

    if (safeAudits.length === 0) {
      throw new Error('NO_APPLY_SAFE_YEARS');
    }

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      writeJsonReport(report);
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    report.backup_artifacts = await createBackupArtifacts(
      client,
      safeAudits,
      blockedAudits,
      fkInventory,
    );

    for (const audit of safeAudits) {
      const result = await applyYear(client, audit, fkInventory);
      if (result.status === 'applied') {
        report.applied_years.push(result);
      } else {
        report.blocked_years.push({
          alias_code: result.alias_code,
          canonical_code: result.canonical_code,
          year_label: result.year_label,
          block_reason: result.block_reason,
        });
      }
    }

    if (report.applied_years.length === 0) {
      throw new Error('NO_YEARS_APPLIED_AFTER_LIVE_RECHECK');
    }

    report.combined_fk_movement_summary = sumFkCounts(report.applied_years);
    report.status = 'apply_passed';
    writeJsonReport(report);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.status = 'failed';
    report.failure = summarizeFailure(error);
    writeJsonReport(report);
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
