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
const PHASE = 'CEL25_BASE_VARIANT_COLLAPSE_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'cel25';
const TARGET_SET_CODE = 'cel25';
const CLASSIFICATION = 'BASE_VARIANT_COLLAPSE';
const BLOCKED_OLD_IDS = [
  'c2bdbb6f-10de-4a93-abcf-ed3b8837908b',
  'f7c22698-daa3-4412-84ef-436fb1fe130f',
];

const EXPECTED = {
  totalUnresolvedCount: 22,
  numericResidualCount: 0,
  sourceCount: 20,
  blockedCount: 2,
  unclassifiedCount: 0,
  canonicalTargetCount: 47,
  exactMatchCount: 0,
  sameTokenDifferentNameCount: 0,
  exactUnmatchedCount: 20,
  normalizedMapCount: 20,
  normalizedAmbiguousCount: 0,
  normalizedInvalidCount: 0,
  baseReusedTargetCount: 0,
  distinctOldCount: 20,
  distinctNewCount: 20,
  normalizedNameCount: 0,
  suffixVariantCount: 20,
  fanInGroupCount: 0,
  archivedIdentityCount: 0,
  targetIdentityRowsBefore: 0,
  oldTraitRowCount: 20,
  oldPrintingRowCount: 20,
  oldExternalMappingRowCount: 20,
  oldVaultItemRowCount: 0,
  traitTargetKeyConflictCount: 0,
  traitMergeableMetadataOnlyCount: 0,
  traitConflictingNonIdenticalCount: 0,
  printingFinishConflictCount: 3,
  printingMergeableMetadataOnlyCount: 3,
  printingConflictingNonIdenticalCount: 0,
  externalMappingConflictCount: 0,
  updatedIdentityRows: 20,
  mergedTraitMetadataRows: 0,
  insertedTraits: 20,
  deletedOldTraits: 20,
  mergedPrintingMetadataRows: 3,
  movedUniquePrintings: 17,
  deletedRedundantPrintings: 3,
  updatedExternalMappings: 20,
  updatedVaultItems: 0,
  remainingUnresolvedTotalRows: 2,
  remainingBaseVariantRows: 0,
  remainingBlockedRows: 2,
  remainingUnclassifiedRows: 0,
  targetAnyIdentityRowsAfter: 20,
  targetActiveIdentityRowsAfter: 20,
  targetInactiveIdentityRowsAfter: 0,
  routeResolvableTargetCount: 20,
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

function assertIdSetEqual(actual, expected, code) {
  const actualSorted = [...(actual ?? [])].map(String).sort();
  const expectedSorted = [...expected].map(String).sort();
  if (actualSorted.length !== expectedSorted.length) {
    throw new Error(`${code}:${JSON.stringify(actualSorted)}:${JSON.stringify(expectedSorted)}`);
  }
  for (let index = 0; index < actualSorted.length; index += 1) {
    if (actualSorted[index] !== expectedSorted[index]) {
      throw new Error(`${code}:${JSON.stringify(actualSorted)}:${JSON.stringify(expectedSorted)}`);
    }
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

async function buildTempBaseVariantSurface(client) {
  await client.query(`
    drop table if exists tmp_cel25_base_unresolved;
    drop table if exists tmp_cel25_base_canonical;
    drop table if exists tmp_cel25_base_exact_audit;
    drop table if exists tmp_cel25_base_match_rows;
    drop table if exists tmp_cel25_base_same_base_diff_name_rows;
    drop table if exists tmp_cel25_base_metrics;
    drop table if exists tmp_cel25_base_classification;
    drop table if exists tmp_cel25_base_collapse_map;

    create temp table tmp_cel25_base_unresolved on commit drop as
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.set_code as old_set_code,
      cp.number as old_parent_number,
      cp.number_plain as old_parent_number_plain,
      cpi.id as old_identity_id,
      cpi.printed_number as source_printed_number,
      lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\\s+', ' ', 'g')) as source_exact_name_key,
      btrim(
        regexp_replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                      chr(96),
                      ''''
                    ),
                    chr(180),
                    ''''
                  ),
                  chr(8212),
                  ' '
                ),
                chr(8211),
                ' '
              ),
              '-gx',
              ' gx'
            ),
            '-ex',
            ' ex'
          ),
          '\\s+',
          ' ',
          'g'
        )
      ) as source_name_normalized_v3,
      nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as source_base_number_plain,
      nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${SOURCE_SET_CODE_IDENTITY}'
      and cpi.is_active = true
      and cp.gv_id is null;

    create index tmp_cel25_base_unresolved_token_idx
      on tmp_cel25_base_unresolved (source_printed_number);

    create temp table tmp_cel25_base_canonical on commit drop as
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.set_code as new_set_code,
      cp.number as new_number,
      cp.number_plain as new_number_plain,
      cp.gv_id as new_gv_id,
      lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as target_exact_name_key,
      btrim(
        regexp_replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(lower(cp.name), chr(8217), ''''),
                      chr(96),
                      ''''
                    ),
                    chr(180),
                    ''''
                  ),
                  chr(8212),
                  ' '
                ),
                chr(8211),
                ' '
              ),
              '-gx',
              ' gx'
            ),
            '-ex',
            ' ex'
          ),
          '\\s+',
          ' ',
          'g'
        )
      ) as target_name_normalized_v3
    from public.card_prints cp
    where cp.set_code = '${TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create index tmp_cel25_base_canonical_number_plain_idx
      on tmp_cel25_base_canonical (new_number_plain);

    create temp table tmp_cel25_base_exact_audit on commit drop as
    select
      u.old_id,
      count(c.new_id)::int as same_token_candidate_count,
      count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
      count(c.new_id) filter (where c.target_exact_name_key <> u.source_exact_name_key)::int as same_token_different_name_count
    from tmp_cel25_base_unresolved u
    left join tmp_cel25_base_canonical c
      on c.new_number = u.source_printed_number
    group by u.old_id, u.source_exact_name_key;

    create temp table tmp_cel25_base_match_rows on commit drop as
    select
      u.old_id,
      u.old_name,
      u.old_set_code,
      u.old_parent_number,
      u.old_parent_number_plain,
      u.old_identity_id,
      u.source_printed_number,
      u.source_exact_name_key,
      u.source_name_normalized_v3,
      u.source_base_number_plain,
      u.source_number_suffix,
      c.new_id,
      c.new_name,
      c.new_set_code,
      c.new_number,
      c.new_number_plain,
      c.new_gv_id,
      c.target_exact_name_key,
      c.target_name_normalized_v3,
      'suffix_variant'::text as match_category
    from tmp_cel25_base_unresolved u
    join tmp_cel25_base_canonical c
      on c.new_number_plain = u.source_base_number_plain
     and c.target_name_normalized_v3 = u.source_name_normalized_v3
    where u.source_number_suffix is not null;

    create temp table tmp_cel25_base_same_base_diff_name_rows on commit drop as
    select
      u.old_id,
      u.old_name,
      u.source_printed_number,
      u.source_name_normalized_v3,
      u.source_base_number_plain,
      c.new_id,
      c.new_name,
      c.new_set_code,
      c.new_number,
      c.new_number_plain,
      c.new_gv_id
    from tmp_cel25_base_unresolved u
    join tmp_cel25_base_canonical c
      on c.new_number_plain = u.source_base_number_plain
     and c.target_name_normalized_v3 <> u.source_name_normalized_v3
    where u.source_number_suffix is not null;

    create temp table tmp_cel25_base_metrics on commit drop as
    select
      u.old_id,
      ea.exact_match_count,
      ea.same_token_different_name_count,
      count(distinct bm.new_id)::int as base_match_count,
      count(distinct sbdn.new_id)::int as same_base_different_name_count
    from tmp_cel25_base_unresolved u
    join tmp_cel25_base_exact_audit ea
      on ea.old_id = u.old_id
    left join tmp_cel25_base_match_rows bm
      on bm.old_id = u.old_id
    left join tmp_cel25_base_same_base_diff_name_rows sbdn
      on sbdn.old_id = u.old_id
    group by
      u.old_id,
      ea.exact_match_count,
      ea.same_token_different_name_count;

    create temp table tmp_cel25_base_classification on commit drop as
    select
      u.old_id,
      u.old_name,
      u.old_set_code,
      u.old_parent_number,
      u.old_parent_number_plain,
      u.source_printed_number,
      u.source_exact_name_key,
      u.source_name_normalized_v3,
      u.source_base_number_plain,
      u.source_number_suffix,
      m.exact_match_count,
      m.same_token_different_name_count,
      m.base_match_count,
      m.same_base_different_name_count,
      case when m.base_match_count = 1 then bm.new_id else null end as new_id,
      case when m.base_match_count = 1 then bm.new_name else null end as new_name,
      case when m.base_match_count = 1 then bm.new_set_code else null end as new_set_code,
      case when m.base_match_count = 1 then bm.new_number else null end as new_number,
      case when m.base_match_count = 1 then bm.new_number_plain else null end as new_number_plain,
      case when m.base_match_count = 1 then bm.new_gv_id else null end as new_gv_id,
      case when m.base_match_count = 1 then bm.target_exact_name_key else null end as target_exact_name_key,
      case when m.base_match_count = 1 then bm.target_name_normalized_v3 else null end as target_name_normalized_v3,
      case when m.base_match_count = 1 then bm.match_category else 'invalid' end as match_category,
      case
        when u.source_number_suffix is null then 'UNCLASSIFIED'
        when m.base_match_count = 1 then '${CLASSIFICATION}'
        when m.base_match_count > 1 then 'BLOCKED_CONFLICT'
        when m.base_match_count = 0 and m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
        else 'UNCLASSIFIED'
      end as execution_class,
      case
        when u.source_number_suffix is null
          then 'unexpected non-suffix unresolved row entered base-variant execution unit'
        when m.base_match_count = 1
          then 'suffix-marked source routes by base number plus normalized name to unique canonical cel25 parent'
        when m.base_match_count > 1
          then 'multiple normalized in-set canonical targets exist for suffix-marked source'
        when m.base_match_count = 0 and m.same_base_different_name_count > 0
          then 'same base number exists in cel25 but name semantics diverge outside deterministic normalization'
        else 'suffix source could not be classified under deterministic normalization'
      end as proof_reason
    from tmp_cel25_base_unresolved u
    join tmp_cel25_base_metrics m
      on m.old_id = u.old_id
    left join lateral (
      select *
      from tmp_cel25_base_match_rows bm
      where bm.old_id = u.old_id
      order by bm.new_number, bm.new_id
      limit 1
    ) bm on true;

    create temp table tmp_cel25_base_collapse_map on commit drop as
    select
      row_number() over (
        order by
          coalesce(nullif(source_base_number_plain, ''), '0')::int,
          source_printed_number,
          old_id
      )::int as seq,
      old_id,
      new_id,
      old_name,
      new_name,
      old_set_code,
      new_set_code,
      old_parent_number,
      old_parent_number_plain,
      source_printed_number,
      source_exact_name_key,
      source_name_normalized_v3,
      source_base_number_plain,
      source_number_suffix,
      new_number,
      new_number_plain,
      target_exact_name_key,
      target_name_normalized_v3,
      new_gv_id,
      match_category,
      execution_class,
      proof_reason
    from tmp_cel25_base_classification
    where execution_class = '${CLASSIFICATION}';

    create unique index tmp_cel25_base_collapse_map_seq_uidx
      on tmp_cel25_base_collapse_map (seq);

    create unique index tmp_cel25_base_collapse_map_old_uidx
      on tmp_cel25_base_collapse_map (old_id);
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with reused_targets as (
        select new_id
        from tmp_cel25_base_collapse_map
        group by new_id
        having count(*) > 1
      )
      select
        (select count(*)::int from tmp_cel25_base_unresolved) as total_unresolved_count,
        (
          select count(*)::int
          from tmp_cel25_base_unresolved
          where source_number_suffix is null
        ) as numeric_residual_count,
        (
          select count(*)::int
          from tmp_cel25_base_classification
          where execution_class = '${CLASSIFICATION}'
        ) as source_count,
        (
          select count(*)::int
          from tmp_cel25_base_classification
          where execution_class = 'BLOCKED_CONFLICT'
        ) as blocked_count,
        (
          select count(*)::int
          from tmp_cel25_base_classification
          where execution_class = 'UNCLASSIFIED'
        ) as unclassified_count,
        (select count(*)::int from tmp_cel25_base_canonical) as canonical_target_count,
        (
          select count(*)::int
          from tmp_cel25_base_classification
          where execution_class = '${CLASSIFICATION}'
            and exact_match_count = 1
        ) as exact_match_count,
        (
          select count(*)::int
          from tmp_cel25_base_classification
          where execution_class = '${CLASSIFICATION}'
            and same_token_different_name_count > 0
        ) as same_token_different_name_count,
        (
          select count(*)::int
          from tmp_cel25_base_classification
          where execution_class = '${CLASSIFICATION}'
            and exact_match_count = 0
        ) as exact_unmatched_count,
        (select count(*)::int from tmp_cel25_base_collapse_map) as normalized_map_count,
        (
          select count(*)::int
          from tmp_cel25_base_metrics m
          join tmp_cel25_base_classification c
            on c.old_id = m.old_id
          where c.execution_class = '${CLASSIFICATION}'
            and m.base_match_count > 1
        ) as normalized_ambiguous_count,
        (
          select count(*)::int
          from tmp_cel25_base_classification
          where execution_class = 'UNCLASSIFIED'
        ) as normalized_invalid_count,
        (select count(*)::int from reused_targets) as base_reused_target_count,
        (select count(distinct old_id)::int from tmp_cel25_base_collapse_map) as distinct_old_count,
        (select count(distinct new_id)::int from tmp_cel25_base_collapse_map) as distinct_new_count,
        (
          select count(*)::int
          from tmp_cel25_base_collapse_map
          where match_category = 'name_normalize_v3'
        ) as normalized_name_count,
        (
          select count(*)::int
          from tmp_cel25_base_collapse_map
          where match_category = 'suffix_variant'
        ) as suffix_variant_count,
        (
          select count(*)::int
          from public.card_print_identity cpi
          where cpi.card_print_id in (select distinct new_id from tmp_cel25_base_collapse_map)
        ) as target_identity_rows_before,
        (
          select array_agg(old_id::text order by old_id)
          from tmp_cel25_base_classification
          where execution_class = 'BLOCKED_CONFLICT'
        ) as blocked_old_ids
    `,
  );
}

function assertPreconditions(summary) {
  assertEqual(
    normalizeCount(summary?.total_unresolved_count),
    EXPECTED.totalUnresolvedCount,
    'TOTAL_UNRESOLVED_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.numeric_residual_count),
    EXPECTED.numericResidualCount,
    'NUMERIC_RESIDUAL_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.source_count), EXPECTED.sourceCount, 'SOURCE_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.blocked_count), EXPECTED.blockedCount, 'BLOCKED_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.unclassified_count),
    EXPECTED.unclassifiedCount,
    'UNCLASSIFIED_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.exact_match_count),
    EXPECTED.exactMatchCount,
    'EXACT_MATCH_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.same_token_different_name_count),
    EXPECTED.sameTokenDifferentNameCount,
    'SAME_TOKEN_DIFFERENT_NAME_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.exact_unmatched_count),
    EXPECTED.exactUnmatchedCount,
    'EXACT_UNMATCHED_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.normalized_map_count),
    EXPECTED.normalizedMapCount,
    'NORMALIZED_MAP_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.normalized_ambiguous_count),
    EXPECTED.normalizedAmbiguousCount,
    'NORMALIZED_AMBIGUOUS_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.normalized_invalid_count),
    EXPECTED.normalizedInvalidCount,
    'NORMALIZED_INVALID_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.base_reused_target_count),
    EXPECTED.baseReusedTargetCount,
    'BASE_REUSED_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.distinct_old_count),
    EXPECTED.distinctOldCount,
    'DISTINCT_OLD_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.distinct_new_count),
    EXPECTED.distinctNewCount,
    'DISTINCT_NEW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.normalized_name_count),
    EXPECTED.normalizedNameCount,
    'NORMALIZED_NAME_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.suffix_variant_count),
    EXPECTED.suffixVariantCount,
    'SUFFIX_VARIANT_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_identity_rows_before),
    EXPECTED.targetIdentityRowsBefore,
    'TARGET_IDENTITY_ROWS_BEFORE_DRIFT',
  );
  assertIdSetEqual(summary?.blocked_old_ids ?? [], BLOCKED_OLD_IDS, 'BLOCKED_OLD_IDS_DRIFT');
}

async function loadFanInSummary(client) {
  const groups = await queryRows(
    client,
    `
      select
        new_id as target_card_print_id,
        min(new_name) as target_name,
        min(new_number) as target_number,
        min(new_gv_id) as target_gv_id,
        count(*)::int as incoming_sources,
        array_agg(old_id order by old_id) as source_old_ids,
        array_agg(old_name order by old_id) as source_old_names,
        array_agg(source_printed_number order by old_id) as source_printed_numbers
      from tmp_cel25_base_collapse_map
      group by new_id
      having count(*) > 1
      order by new_id
    `,
  );

  return {
    fan_in_group_count: groups.length,
    archived_identity_count: 0,
    fan_in_groups: groups,
  };
}

function assertFanInSummary(summary) {
  assertEqual(
    normalizeCount(summary?.fan_in_group_count),
    EXPECTED.fanInGroupCount,
    'FAN_IN_GROUP_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.archived_identity_count),
    EXPECTED.archivedIdentityCount,
    'ARCHIVED_IDENTITY_COUNT_DRIFT',
  );
}

async function loadCollapseMapSamples(client) {
  return queryRows(
    client,
    `
      with positions as (
        select 1::int as seq
        union
        select ((count(*) + 1) / 2)::int as seq
        from tmp_cel25_base_collapse_map
        union
        select count(*)::int as seq
        from tmp_cel25_base_collapse_map
      )
      select
        m.seq,
        m.old_id,
        m.old_name,
        m.old_parent_number,
        m.old_parent_number_plain,
        m.source_printed_number,
        m.source_base_number_plain as normalized_token,
        m.source_name_normalized_v3 as normalized_name,
        m.new_id,
        m.new_name,
        m.new_number,
        m.new_number_plain,
        m.new_gv_id,
        m.match_category
      from tmp_cel25_base_collapse_map m
      join positions p
        on p.seq = m.seq
      order by m.seq
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
          select old_id from tmp_cel25_base_collapse_map
        )
      `,
    );

    counts[`${tableName}.${columnName}`] = normalizeCount(row?.row_count);
  }

  return counts;
}

async function loadCollisionSummary(client) {
  return queryOne(
    client,
    `
      with traits_on_old as (
        select count(*)::int as row_count
        from public.card_print_traits t
        where t.card_print_id in (select old_id from tmp_cel25_base_collapse_map)
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
        from tmp_cel25_base_collapse_map m
        join public.card_print_traits old_t
          on old_t.card_print_id = m.old_id
        join public.card_print_traits new_t
          on new_t.card_print_id = m.new_id
         and new_t.trait_type = old_t.trait_type
         and new_t.trait_value = old_t.trait_value
         and new_t.source = old_t.source
      ),
      printings_on_old as (
        select count(*)::int as row_count
        from public.card_printings p
        where p.card_print_id in (select old_id from tmp_cel25_base_collapse_map)
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
        from tmp_cel25_base_collapse_map m
        join public.card_printings old_p
          on old_p.card_print_id = m.old_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      mappings_on_old as (
        select count(*)::int as row_count
        from public.external_mappings em
        where em.card_print_id in (select old_id from tmp_cel25_base_collapse_map)
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from tmp_cel25_base_collapse_map m
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
        where cpi.card_print_id in (select distinct new_id from tmp_cel25_base_collapse_map)
      ),
      target_traits as (
        select count(*)::int as row_count
        from public.card_print_traits t
        where t.card_print_id in (select distinct new_id from tmp_cel25_base_collapse_map)
      ),
      target_printings as (
        select count(*)::int as row_count
        from public.card_printings p
        where p.card_print_id in (select distinct new_id from tmp_cel25_base_collapse_map)
      ),
      target_external_mappings as (
        select count(*)::int as row_count
        from public.external_mappings em
        where em.card_print_id in (select distinct new_id from tmp_cel25_base_collapse_map)
      ),
      vault_on_old as (
        select count(*)::int as row_count
        from public.vault_items vi
        where vi.card_id in (select old_id from tmp_cel25_base_collapse_map)
      )
      select
        traits_on_old.row_count as old_trait_row_count,
        (select count(*)::int from trait_key_conflicts) as trait_target_key_conflict_count,
        (
          select count(*)::int
          from trait_key_conflicts
          where (
            (old_confidence is not distinct from new_confidence or old_confidence is null or new_confidence is null)
            and (old_hp is not distinct from new_hp or old_hp is null or new_hp is null)
            and (old_national_dex is not distinct from new_national_dex or old_national_dex is null or new_national_dex is null)
            and (old_types is not distinct from new_types or old_types is null or new_types is null)
            and (old_rarity is not distinct from new_rarity or nullif(old_rarity, 'None') is null or nullif(new_rarity, 'None') is null)
            and (old_supertype is not distinct from new_supertype or old_supertype is null or new_supertype is null)
            and (old_card_category is not distinct from new_card_category or old_card_category is null or new_card_category is null)
            and (old_legacy_rarity is not distinct from new_legacy_rarity or nullif(old_legacy_rarity, 'None') is null or nullif(new_legacy_rarity, 'None') is null)
          )
        ) as trait_mergeable_metadata_only_count,
        (
          select count(*)::int
          from trait_key_conflicts
          where (
              old_confidence is distinct from new_confidence
              and old_confidence is not null
              and new_confidence is not null
            )
             or (
              old_hp is distinct from new_hp
              and old_hp is not null
              and new_hp is not null
            )
             or (
              old_national_dex is distinct from new_national_dex
              and old_national_dex is not null
              and new_national_dex is not null
            )
             or (
              old_types is distinct from new_types
              and old_types is not null
              and new_types is not null
            )
             or (
              old_rarity is distinct from new_rarity
              and nullif(old_rarity, 'None') is not null
              and nullif(new_rarity, 'None') is not null
            )
             or (
              old_supertype is distinct from new_supertype
              and old_supertype is not null
              and new_supertype is not null
            )
             or (
              old_card_category is distinct from new_card_category
              and old_card_category is not null
              and new_card_category is not null
            )
             or (
              old_legacy_rarity is distinct from new_legacy_rarity
              and nullif(old_legacy_rarity, 'None') is not null
              and nullif(new_legacy_rarity, 'None') is not null
            )
        ) as trait_conflicting_non_identical_count,
        printings_on_old.row_count as old_printing_row_count,
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
             or (old_provenance_source is not null and new_provenance_source is not null and old_provenance_source <> new_provenance_source)
             or (old_provenance_ref is not null and new_provenance_ref is not null and old_provenance_ref <> new_provenance_ref)
             or (old_created_by is not null and new_created_by is not null and old_created_by <> new_created_by)
        ) as printing_conflicting_non_identical_count,
        mappings_on_old.row_count as old_external_mapping_row_count,
        external_conflicts.row_count as external_mapping_conflict_count,
        target_identity.row_count as target_identity_row_count,
        target_traits.row_count as target_trait_row_count,
        target_printings.row_count as target_printing_row_count,
        target_external_mappings.row_count as target_external_mapping_row_count,
        vault_on_old.row_count as old_vault_item_row_count
      from traits_on_old
      cross join printings_on_old
      cross join mappings_on_old
      cross join external_conflicts
      cross join target_identity
      cross join target_traits
      cross join target_printings
      cross join target_external_mappings
      cross join vault_on_old
    `,
  );
}

function assertCollisionSummary(summary) {
  assertEqual(
    normalizeCount(summary?.old_trait_row_count),
    EXPECTED.oldTraitRowCount,
    'OLD_TRAIT_ROW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.old_printing_row_count),
    EXPECTED.oldPrintingRowCount,
    'OLD_PRINTING_ROW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.old_external_mapping_row_count),
    EXPECTED.oldExternalMappingRowCount,
    'OLD_EXTERNAL_MAPPING_ROW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.old_vault_item_row_count),
    EXPECTED.oldVaultItemRowCount,
    'OLD_VAULT_ITEM_ROW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_identity_row_count),
    EXPECTED.targetIdentityRowsBefore,
    'TARGET_IDENTITY_ROW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.trait_target_key_conflict_count),
    EXPECTED.traitTargetKeyConflictCount,
    'TRAIT_TARGET_KEY_CONFLICT_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.trait_mergeable_metadata_only_count),
    EXPECTED.traitMergeableMetadataOnlyCount,
    'TRAIT_MERGEABLE_METADATA_ONLY_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.trait_conflicting_non_identical_count),
    EXPECTED.traitConflictingNonIdenticalCount,
    'TRAIT_CONFLICTING_NON_IDENTICAL_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.printing_finish_conflict_count),
    EXPECTED.printingFinishConflictCount,
    'PRINTING_FINISH_CONFLICT_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.printing_mergeable_metadata_only_count),
    EXPECTED.printingMergeableMetadataOnlyCount,
    'PRINTING_MERGEABLE_METADATA_ONLY_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.printing_conflicting_non_identical_count),
    EXPECTED.printingConflictingNonIdenticalCount,
    'PRINTING_CONFLICTING_NON_IDENTICAL_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.external_mapping_conflict_count),
    EXPECTED.externalMappingConflictCount,
    'EXTERNAL_MAPPING_CONFLICT_COUNT_DRIFT',
  );
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

function assertApplyOperations(applyResult) {
  const operations = applyResult?.operations ?? {};

  assertEqual(
    normalizeCount(operations.archived_identity_rows),
    EXPECTED.archivedIdentityCount,
    'ARCHIVED_IDENTITY_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.updated_identity_rows),
    EXPECTED.updatedIdentityRows,
    'UPDATED_IDENTITY_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.merged_trait_metadata_rows),
    EXPECTED.mergedTraitMetadataRows,
    'MERGED_TRAIT_METADATA_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.inserted_traits),
    EXPECTED.insertedTraits,
    'INSERTED_TRAITS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.deleted_old_traits),
    EXPECTED.deletedOldTraits,
    'DELETED_OLD_TRAITS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.merged_printing_metadata_rows),
    EXPECTED.mergedPrintingMetadataRows,
    'MERGED_PRINTING_METADATA_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.moved_unique_printings),
    EXPECTED.movedUniquePrintings,
    'MOVED_UNIQUE_PRINTINGS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.deleted_redundant_printings),
    EXPECTED.deletedRedundantPrintings,
    'DELETED_REDUNDANT_PRINTINGS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.updated_external_mappings),
    EXPECTED.updatedExternalMappings,
    'UPDATED_EXTERNAL_MAPPINGS_DRIFT',
  );
  assertEqual(
    normalizeCount(operations.updated_vault_items),
    EXPECTED.updatedVaultItems,
    'UPDATED_VAULT_ITEMS_DRIFT',
  );
}

async function applyCollapse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.new_id,
      updated_at = now()
    from tmp_cel25_base_collapse_map m
    where cpi.card_print_id = m.old_id
  `);

  const activeIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (
        select distinct new_id from tmp_cel25_base_collapse_map
      )
      group by cpi.card_print_id
      having count(*) filter (where cpi.is_active = true) <> 1
    `,
  );

  if (activeIdentityConflicts.length > 0) {
    throw new Error(`ACTIVE_IDENTITY_CONFLICT_AFTER_REPOINT:${JSON.stringify(activeIdentityConflicts)}`);
  }

  const mergedTraitMetadata = await client.query(`
    update public.card_print_traits new_t
    set
      confidence = coalesce(new_t.confidence, old_t.confidence),
      hp = coalesce(new_t.hp, old_t.hp),
      national_dex = coalesce(new_t.national_dex, old_t.national_dex),
      types = coalesce(new_t.types, old_t.types),
      rarity = case
        when new_t.rarity is null or new_t.rarity = 'None'
          then coalesce(nullif(old_t.rarity, 'None'), new_t.rarity)
        else new_t.rarity
      end,
      supertype = coalesce(new_t.supertype, old_t.supertype),
      card_category = coalesce(new_t.card_category, old_t.card_category),
      legacy_rarity = case
        when new_t.legacy_rarity is null or new_t.legacy_rarity = 'None'
          then coalesce(nullif(old_t.legacy_rarity, 'None'), new_t.legacy_rarity)
        else new_t.legacy_rarity
      end
    from public.card_print_traits old_t
    join tmp_cel25_base_collapse_map m
      on m.old_id = old_t.card_print_id
    where new_t.card_print_id = m.new_id
      and new_t.trait_type = old_t.trait_type
      and new_t.trait_value = old_t.trait_value
      and new_t.source = old_t.source
      and (
        new_t.confidence is distinct from old_t.confidence
        or new_t.hp is distinct from old_t.hp
        or new_t.national_dex is distinct from old_t.national_dex
        or new_t.types is distinct from old_t.types
        or new_t.rarity is distinct from old_t.rarity
        or new_t.supertype is distinct from old_t.supertype
        or new_t.card_category is distinct from old_t.card_category
        or new_t.legacy_rarity is distinct from old_t.legacy_rarity
      )
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
    join tmp_cel25_base_collapse_map m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_cel25_base_collapse_map m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadata = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_cel25_base_collapse_map m
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
    from tmp_cel25_base_collapse_map m
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
    using tmp_cel25_base_collapse_map m
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
    from tmp_cel25_base_collapse_map m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_cel25_base_collapse_map m
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
      archived_identity_rows: 0,
      updated_identity_rows: updatedIdentityRows.rowCount ?? 0,
      merged_trait_metadata_rows: mergedTraitMetadata.rowCount ?? 0,
      inserted_traits: insertedTraits.rowCount ?? 0,
      deleted_old_traits: deletedOldTraits.rowCount ?? 0,
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
    `select old_id from tmp_cel25_base_collapse_map`,
  );

  const summary = await queryOne(
    client,
    `
      with unresolved_after as (
        select
          cp.id as old_id,
          cp.name as old_name,
          cpi.printed_number as source_printed_number,
          btrim(
            regexp_replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                          chr(96),
                          ''''
                        ),
                        chr(180),
                        ''''
                      ),
                      chr(8212),
                      ' '
                    ),
                    chr(8211),
                    ' '
                  ),
                  '-gx',
                  ' gx'
                ),
                '-ex',
                ' ex'
              ),
              '\\s+',
              ' ',
              'g'
            )
          ) as source_name_normalized_v3,
          nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as source_base_number_plain,
          nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cpi.is_active = true
          and cp.gv_id is null
      ),
      canonical as (
        select
          cp.id as new_id,
          cp.number as new_number,
          cp.number_plain as new_number_plain,
          cp.gv_id as new_gv_id,
          btrim(
            regexp_replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(lower(cp.name), chr(8217), ''''),
                          chr(96),
                          ''''
                        ),
                        chr(180),
                        ''''
                      ),
                      chr(8212),
                      ' '
                    ),
                    chr(8211),
                    ' '
                  ),
                  '-gx',
                  ' gx'
                ),
                '-ex',
                ' ex'
              ),
              '\\s+',
              ' ',
              'g'
            )
          ) as target_name_normalized_v3
        from public.card_prints cp
        where cp.set_code = $3
          and cp.gv_id is not null
      ),
      base_matches_after as (
        select
          u.old_id,
          c.new_id
        from unresolved_after u
        join canonical c
          on c.new_number_plain = u.source_base_number_plain
         and c.target_name_normalized_v3 = u.source_name_normalized_v3
        where u.source_number_suffix is not null
      ),
      same_base_diff_name_after as (
        select
          u.old_id,
          c.new_id
        from unresolved_after u
        join canonical c
          on c.new_number_plain = u.source_base_number_plain
         and c.target_name_normalized_v3 <> u.source_name_normalized_v3
        where u.source_number_suffix is not null
      ),
      metrics_after as (
        select
          u.old_id,
          count(distinct bm.new_id)::int as base_match_count,
          count(distinct sbdn.new_id)::int as same_base_different_name_count
        from unresolved_after u
        left join base_matches_after bm
          on bm.old_id = u.old_id
        left join same_base_diff_name_after sbdn
          on sbdn.old_id = u.old_id
        group by u.old_id
      ),
      classification_after as (
        select
          u.old_id,
          case
            when u.source_number_suffix is null then 'UNCLASSIFIED'
            when m.base_match_count = 1 then '${CLASSIFICATION}'
            when m.base_match_count > 1 then 'BLOCKED_CONFLICT'
            when m.base_match_count = 0 and m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
            else 'UNCLASSIFIED'
          end as execution_class
        from unresolved_after u
        join metrics_after m
          on m.old_id = u.old_id
      ),
      target_identity as (
        select
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows,
          count(*) filter (where cpi.is_active = false)::int as inactive_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_cel25_base_collapse_map)
      ),
      target_gvid_drift as (
        select count(*)::int as row_count
        from tmp_cel25_base_collapse_map m
        join public.card_prints cp
          on cp.id = m.new_id
        where cp.gv_id is distinct from m.new_gv_id
      ),
      route_resolvable as (
        select count(*)::int as row_count
        from public.card_prints cp
        where cp.id in (select new_id from tmp_cel25_base_collapse_map)
          and cp.gv_id is not null
      ),
      target_active_identity_state as (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_cel25_base_collapse_map)
        group by cpi.card_print_id
      )
      select
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_cel25_base_collapse_map)
        ) as remaining_old_parent_rows,
        (select count(*)::int from unresolved_after) as remaining_unresolved_total_rows,
        (
          select count(*)::int
          from classification_after
          where execution_class = '${CLASSIFICATION}'
        ) as remaining_base_variant_rows,
        (
          select count(*)::int
          from classification_after
          where execution_class = 'BLOCKED_CONFLICT'
        ) as remaining_blocked_rows,
        (
          select count(*)::int
          from classification_after
          where execution_class = 'UNCLASSIFIED'
        ) as remaining_unclassified_rows,
        (
          select array_agg(old_id::text order by old_id)
          from classification_after
          where execution_class = 'BLOCKED_CONFLICT'
        ) as remaining_blocked_old_ids,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.set_code = $3
            and cp.gv_id is not null
        ) as canonical_target_count,
        (select any_identity_rows from target_identity) as target_any_identity_rows,
        (select active_identity_rows from target_identity) as target_active_identity_rows,
        (select inactive_identity_rows from target_identity) as target_inactive_identity_rows,
        (select row_count from target_gvid_drift) as target_gvid_drift_count,
        (select row_count from route_resolvable) as route_resolvable_target_count,
        (
          select count(*)::int
          from target_active_identity_state
          where active_identity_rows <> 1
        ) as target_active_identity_conflict_count
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

  assertEqual(deletedOldParentRows, EXPECTED.sourceCount, 'DELETED_OLD_PARENT_COUNT_DRIFT');
  assertZero(postValidation.summary?.remaining_old_parent_rows, 'REMAINING_OLD_PARENT_ROWS');
  assertEqual(
    normalizeCount(postValidation.summary?.remaining_unresolved_total_rows),
    EXPECTED.remainingUnresolvedTotalRows,
    'REMAINING_UNRESOLVED_TOTAL_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.remaining_base_variant_rows),
    EXPECTED.remainingBaseVariantRows,
    'REMAINING_BASE_VARIANT_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.remaining_blocked_rows),
    EXPECTED.remainingBlockedRows,
    'REMAINING_BLOCKED_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.remaining_unclassified_rows),
    EXPECTED.remainingUnclassifiedRows,
    'REMAINING_UNCLASSIFIED_ROWS_DRIFT',
  );
  assertIdSetEqual(
    postValidation.summary?.remaining_blocked_old_ids ?? [],
    BLOCKED_OLD_IDS,
    'REMAINING_BLOCKED_OLD_IDS_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_any_identity_rows),
    EXPECTED.targetAnyIdentityRowsAfter,
    'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_active_identity_rows),
    EXPECTED.targetActiveIdentityRowsAfter,
    'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_inactive_identity_rows),
    EXPECTED.targetInactiveIdentityRowsAfter,
    'TARGET_INACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertZero(postValidation.summary?.target_gvid_drift_count, 'TARGET_GVID_DRIFT_COUNT');
  assertEqual(
    normalizeCount(postValidation.summary?.route_resolvable_target_count),
    EXPECTED.routeResolvableTargetCount,
    'ROUTE_RESOLVABLE_TARGET_COUNT_DRIFT',
  );
  assertZero(
    postValidation.summary?.target_active_identity_conflict_count,
    'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT',
  );
}

async function loadSampleAfterRows(client, sampleRows) {
  const afterRows = [];

  for (const sample of sampleRows) {
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
          new_cp.number as new_number_after,
          new_cp.number_plain as new_number_plain_after,
          new_cp.set_code as new_set_code_after,
          new_cp.gv_id as target_gv_id_after,
          count(cpi.id)::int as identity_row_count_on_new_parent,
          count(*) filter (where cpi.is_active = true)::int as active_identity_row_count_on_new_parent,
          count(*) filter (where cpi.is_active = false)::int as inactive_identity_row_count_on_new_parent
        from public.card_prints new_cp
        left join public.card_print_identity cpi
          on cpi.card_print_id = new_cp.id
        where new_cp.id = $2
        group by
          new_cp.id,
          new_cp.name,
          new_cp.number,
          new_cp.number_plain,
          new_cp.set_code,
          new_cp.gv_id
      `,
      [sample.old_id, sample.new_id],
    );

    afterRows.push({
      ...sample,
      ...row,
    });
  }

  return afterRows;
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
    classification: CLASSIFICATION,
    normalization_contract: {
      name_normalize: 'NAME_NORMALIZE_V3',
      token_normalize: 'TOKEN_NORMALIZE_V1',
      same_set_only: true,
      blocked_old_ids: BLOCKED_OLD_IDS,
      fan_in_resolution_required: false,
    },
    preconditions: null,
    fan_in_summary: null,
    collapse_map_samples: null,
    fk_inventory: null,
    collision_summary: null,
    canonical_count_before: null,
    apply_operations: null,
    deleted_old_parent_rows: 0,
    post_validation: null,
    sample_before_after_rows: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `cel25_base_variant_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempBaseVariantSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.fan_in_summary = await loadFanInSummary(client);
    assertFanInSummary(report.fan_in_summary);

    report.collapse_map_samples = await loadCollapseMapSamples(client);
    if (report.collapse_map_samples.length !== 3) {
      throw new Error(`COLLAPSE_MAP_SAMPLE_COUNT_DRIFT:${report.collapse_map_samples.length}:3`);
    }

    const fkInventory = await loadCardPrintFkInventory(client);
    const fkCounts = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from tmp_cel25_base_collapse_map`,
    );
    assertNoUnexpectedReferencedTables(fkCounts);
    report.fk_inventory = await loadSupportedFkCounts(client);

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

    report.apply_operations = await applyCollapse(client);
    assertApplyOperations(report.apply_operations);

    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using tmp_cel25_base_collapse_map m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;

    report.post_validation = await loadPostValidation(client, fkInventory);
    assertPostValidation(report.post_validation, report.deleted_old_parent_rows);

    report.sample_before_after_rows = await loadSampleAfterRows(client, report.collapse_map_samples);
    for (const row of report.sample_before_after_rows) {
      if (row.old_parent_still_exists !== false) {
        throw new Error(`OLD_PARENT_STILL_EXISTS:${row.old_id}`);
      }
      if (row.target_gv_id_after !== row.new_gv_id) {
        throw new Error(`TARGET_GVID_DRIFT:${row.target_gv_id_after}:${row.new_gv_id}`);
      }
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
