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
const PHASE = 'XY7_BASE_VARIANT_COLLAPSE_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'xy7';
const TARGET_SET_CODE = 'xy7';
const CLASSIFICATION = 'BASE_VARIANT_COLLAPSE';

const EXPECTED = {
  sourceCount: 26,
  canonicalTargetCount: 100,
  exactMatchCount: 0,
  sameTokenDifferentNameCount: 25,
  exactUnmatchedCount: 26,
  normalizedMapCount: 26,
  normalizedAmbiguousCount: 0,
  normalizedInvalidCount: 0,
  baseReusedTargetCount: 0,
  distinctOldCount: 26,
  distinctNewCount: 26,
  normalizedNameCount: 25,
  suffixVariantCount: 1,
  fanInGroupCount: 0,
  targetActiveIdentityConflictCountBefore: 1,
  oldTraitRowCount: 26,
  oldPrintingRowCount: 78,
  oldExternalMappingRowCount: 26,
  oldVaultItemRowCount: 0,
  traitTargetKeyConflictCount: 1,
  traitMergeableMetadataOnlyCount: 0,
  traitConflictingNonIdenticalCount: 0,
  printingFinishConflictCount: 78,
  printingMergeableMetadataOnlyCount: 78,
  printingConflictingNonIdenticalCount: 0,
  externalMappingConflictCount: 0,
  archivedIdentityRows: 1,
  updatedIdentityRows: 26,
  mergedTraitMetadataRows: 0,
  insertedTraits: 25,
  deletedOldTraits: 26,
  mergedPrintingMetadataRows: 78,
  movedUniquePrintings: 0,
  deletedRedundantPrintings: 78,
  updatedExternalMappings: 26,
  updatedVaultItems: 0,
  deletedOldParentRows: 26,
  remainingUnresolvedRows: 0,
  targetAnyIdentityRowsAfter: 27,
  targetActiveIdentityRowsAfter: 26,
  targetInactiveIdentityRowsAfter: 1,
  routeResolvableTargetCount: 26,
};

function normalizeCount(value) {
  return Number(value ?? 0);
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
    drop table if exists tmp_xy7_unresolved;
    drop table if exists tmp_xy7_canonical;
    drop table if exists tmp_xy7_exact_audit;
    drop table if exists tmp_xy7_match_rows;
    drop table if exists tmp_xy7_same_base_diff_name_rows;
    drop table if exists tmp_xy7_metrics;
    drop table if exists tmp_xy7_classification;
    drop table if exists tmp_xy7_collapse_map;
    drop table if exists tmp_xy7_target_active_identity_conflicts;

    create temp table tmp_xy7_unresolved on commit drop as
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

    create temp table tmp_xy7_canonical on commit drop as
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

    create temp table tmp_xy7_exact_audit on commit drop as
    select
      u.old_id,
      count(c.new_id)::int as same_token_candidate_count,
      count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
      count(c.new_id) filter (where c.target_exact_name_key <> u.source_exact_name_key)::int as same_token_different_name_count
    from tmp_xy7_unresolved u
    left join tmp_xy7_canonical c
      on c.new_number = u.source_printed_number
    group by u.old_id, u.source_exact_name_key;

    create temp table tmp_xy7_match_rows on commit drop as
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
      case
        when u.source_number_suffix is not null then 'suffix_variant'
        else 'name_normalize_v3'
      end as match_category
    from tmp_xy7_unresolved u
    join tmp_xy7_canonical c
      on c.new_number_plain = u.source_base_number_plain
     and c.target_name_normalized_v3 = u.source_name_normalized_v3;

    create temp table tmp_xy7_same_base_diff_name_rows on commit drop as
    select
      u.old_id,
      c.new_id
    from tmp_xy7_unresolved u
    join tmp_xy7_canonical c
      on c.new_number_plain = u.source_base_number_plain
     and c.target_name_normalized_v3 <> u.source_name_normalized_v3;

    create temp table tmp_xy7_metrics on commit drop as
    select
      u.old_id,
      ea.exact_match_count,
      ea.same_token_different_name_count,
      count(distinct mr.new_id)::int as base_match_count,
      count(distinct sbd.new_id)::int as same_base_different_name_count
    from tmp_xy7_unresolved u
    join tmp_xy7_exact_audit ea
      on ea.old_id = u.old_id
    left join tmp_xy7_match_rows mr
      on mr.old_id = u.old_id
    left join tmp_xy7_same_base_diff_name_rows sbd
      on sbd.old_id = u.old_id
    group by u.old_id, ea.exact_match_count, ea.same_token_different_name_count;

    create temp table tmp_xy7_classification on commit drop as
    select
      u.old_id,
      u.old_name,
      u.source_printed_number,
      u.source_name_normalized_v3,
      u.source_base_number_plain,
      u.source_number_suffix,
      m.exact_match_count,
      m.same_token_different_name_count,
      m.base_match_count,
      m.same_base_different_name_count,
      case when m.base_match_count = 1 then mr.new_id else null end as new_id,
      case when m.base_match_count = 1 then mr.new_name else null end as new_name,
      case when m.base_match_count = 1 then mr.new_gv_id else null end as new_gv_id,
      case when m.base_match_count = 1 then mr.match_category else 'invalid' end as match_category,
      case
        when m.base_match_count = 1 then '${CLASSIFICATION}'
        when m.base_match_count > 1 then 'BLOCKED_CONFLICT'
        when m.base_match_count = 0 and m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
        else 'UNCLASSIFIED'
      end as execution_class
    from tmp_xy7_unresolved u
    join tmp_xy7_metrics m
      on m.old_id = u.old_id
    left join lateral (
      select *
      from tmp_xy7_match_rows mr
      where mr.old_id = u.old_id
      order by mr.new_number, mr.new_id
      limit 1
    ) mr on true;

    create temp table tmp_xy7_collapse_map on commit drop as
    select
      row_number() over (
        order by
          coalesce(nullif(mr.source_base_number_plain, ''), '0')::int,
          mr.source_printed_number,
          mr.old_id
      )::int as seq,
      mr.*
    from tmp_xy7_match_rows mr
    join tmp_xy7_metrics m
      on m.old_id = mr.old_id
    where m.base_match_count = 1;

    create temp table tmp_xy7_target_active_identity_conflicts on commit drop as
    select
      m.old_id,
      m.old_name,
      m.source_printed_number,
      m.new_id,
      m.new_name,
      m.new_number,
      m.new_gv_id,
      m.old_identity_id,
      cpi.id as target_identity_id
    from tmp_xy7_collapse_map m
    join public.card_print_identity cpi
      on cpi.card_print_id = m.new_id
     and cpi.is_active = true;
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with reused_targets as (
        select new_id
        from tmp_xy7_collapse_map
        group by new_id
        having count(*) > 1
      )
      select
        (select count(*)::int from tmp_xy7_unresolved) as source_count,
        (select count(*)::int from tmp_xy7_canonical) as canonical_target_count,
        (
          select count(*)::int
          from tmp_xy7_classification
          where execution_class = '${CLASSIFICATION}'
            and exact_match_count = 1
        ) as exact_match_count,
        (
          select count(*)::int
          from tmp_xy7_classification
          where execution_class = '${CLASSIFICATION}'
            and same_token_different_name_count > 0
        ) as same_token_different_name_count,
        (
          select count(*)::int
          from tmp_xy7_classification
          where execution_class = '${CLASSIFICATION}'
            and exact_match_count = 0
        ) as exact_unmatched_count,
        (select count(*)::int from tmp_xy7_collapse_map) as normalized_map_count,
        (
          select count(*)::int
          from tmp_xy7_metrics
          where base_match_count > 1
        ) as normalized_ambiguous_count,
        (
          select count(*)::int
          from tmp_xy7_classification
          where execution_class = 'UNCLASSIFIED'
        ) as normalized_invalid_count,
        (select count(*)::int from reused_targets) as base_reused_target_count,
        (select count(distinct old_id)::int from tmp_xy7_collapse_map) as distinct_old_count,
        (select count(distinct new_id)::int from tmp_xy7_collapse_map) as distinct_new_count,
        (
          select count(*)::int
          from tmp_xy7_collapse_map
          where match_category = 'name_normalize_v3'
        ) as normalized_name_count,
        (
          select count(*)::int
          from tmp_xy7_collapse_map
          where match_category = 'suffix_variant'
        ) as suffix_variant_count,
        (
          select count(*)::int
          from (
            select new_id
            from tmp_xy7_collapse_map
            group by new_id
            having count(*) > 1
          ) fan_in
        ) as fan_in_group_count,
        (select count(*)::int from tmp_xy7_target_active_identity_conflicts) as target_active_identity_conflict_count
    `,
  );
}

function assertPreconditions(summary) {
  assertEqual(normalizeCount(summary?.source_count), EXPECTED.sourceCount, 'SOURCE_COUNT_DRIFT');
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
    normalizeCount(summary?.fan_in_group_count),
    EXPECTED.fanInGroupCount,
    'FAN_IN_GROUP_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_active_identity_conflict_count),
    EXPECTED.targetActiveIdentityConflictCountBefore,
    'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT_DRIFT',
  );
}

async function loadTargetActiveIdentityConflicts(client) {
  return queryRows(
    client,
    `
      select
        old_id,
        old_name,
        source_printed_number,
        new_id,
        new_name,
        new_number,
        new_gv_id,
        old_identity_id,
        target_identity_id
      from tmp_xy7_target_active_identity_conflicts
      order by source_printed_number, old_id
    `,
  );
}

async function loadCollapseMapSamples(client) {
  return queryRows(
    client,
    `
      with sample_seq as (
        select 1 as seq
        union all
        select ((count(*) + 1) / 2)::int
        from tmp_xy7_collapse_map
        union all
        select count(*)::int
        from tmp_xy7_collapse_map
      )
      select
        m.seq,
        m.old_id,
        m.old_name,
        m.source_printed_number as old_printed_token,
        m.source_name_normalized_v3 as normalized_name,
        m.source_base_number_plain as normalized_token,
        m.new_id,
        m.new_name,
        m.new_number as new_printed_token,
        m.new_gv_id
      from tmp_xy7_collapse_map m
      join sample_seq s
        on s.seq = m.seq
      order by m.seq
    `,
  );
}

async function loadSupportedFkCounts(client, oldIdsTable = 'tmp_xy7_collapse_map') {
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id in (select old_id from ${oldIdsTable})) as card_print_identity,
        (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from ${oldIdsTable})) as card_print_traits,
        (select count(*)::int from public.card_printings where card_print_id in (select old_id from ${oldIdsTable})) as card_printings,
        (select count(*)::int from public.external_mappings where card_print_id in (select old_id from ${oldIdsTable})) as external_mappings,
        (select count(*)::int from public.vault_items where card_id in (select old_id from ${oldIdsTable})) as vault_items
    `,
  );

  return {
    card_print_identity: normalizeCount(row?.card_print_identity),
    card_print_traits: normalizeCount(row?.card_print_traits),
    card_printings: normalizeCount(row?.card_printings),
    external_mappings: normalizeCount(row?.external_mappings),
    vault_items: normalizeCount(row?.vault_items),
  };
}

async function loadCollisionSummary(client) {
  return queryOne(
    client,
    `
      with trait_conflicts as (
        select
          (
            (new_t.confidence is null and old_t.confidence is not null)
            or (new_t.hp is null and old_t.hp is not null)
            or (new_t.national_dex is null and old_t.national_dex is not null)
            or (new_t.types is null and old_t.types is not null)
            or ((new_t.rarity is null or new_t.rarity = 'None') and old_t.rarity is not null and old_t.rarity <> 'None')
            or (new_t.supertype is null and old_t.supertype is not null)
            or (new_t.card_category is null and old_t.card_category is not null)
            or ((new_t.legacy_rarity is null or new_t.legacy_rarity = 'None') and old_t.legacy_rarity is not null and old_t.legacy_rarity <> 'None')
          ) as mergeable_metadata_only,
          (
            (new_t.confidence is not null and old_t.confidence is not null and new_t.confidence is distinct from old_t.confidence)
            or (new_t.hp is not null and old_t.hp is not null and new_t.hp is distinct from old_t.hp)
            or (new_t.national_dex is not null and old_t.national_dex is not null and new_t.national_dex is distinct from old_t.national_dex)
            or (new_t.types is not null and old_t.types is not null and new_t.types is distinct from old_t.types)
            or (new_t.rarity is not null and new_t.rarity <> 'None' and old_t.rarity is not null and old_t.rarity <> 'None' and new_t.rarity is distinct from old_t.rarity)
            or (new_t.supertype is not null and old_t.supertype is not null and new_t.supertype is distinct from old_t.supertype)
            or (new_t.card_category is not null and old_t.card_category is not null and new_t.card_category is distinct from old_t.card_category)
            or (new_t.legacy_rarity is not null and new_t.legacy_rarity <> 'None' and old_t.legacy_rarity is not null and old_t.legacy_rarity <> 'None' and new_t.legacy_rarity is distinct from old_t.legacy_rarity)
          ) as conflicting_non_identical
        from public.card_print_traits old_t
        join tmp_xy7_collapse_map m
          on m.old_id = old_t.card_print_id
        join public.card_print_traits new_t
          on new_t.card_print_id = m.new_id
         and new_t.trait_type = old_t.trait_type
         and new_t.trait_value = old_t.trait_value
         and new_t.source = old_t.source
      ),
      printing_conflicts as (
        select
          (
            (new_p.provenance_source is null and old_p.provenance_source is not null)
            or (new_p.provenance_ref is null and old_p.provenance_ref is not null)
            or (new_p.created_by is null and old_p.created_by is not null)
          ) as mergeable_metadata_only,
          (
            (new_p.provenance_source is not null and old_p.provenance_source is not null and new_p.provenance_source is distinct from old_p.provenance_source)
            or (new_p.provenance_ref is not null and old_p.provenance_ref is not null and new_p.provenance_ref is distinct from old_p.provenance_ref)
            or (new_p.created_by is not null and old_p.created_by is not null and new_p.created_by is distinct from old_p.created_by)
          ) as conflicting_non_identical
        from public.card_printings old_p
        join tmp_xy7_collapse_map m
          on m.old_id = old_p.card_print_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from public.external_mappings old_em
        join tmp_xy7_collapse_map m
          on m.old_id = old_em.card_print_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      )
      select
        (select count(*)::int from trait_conflicts) as trait_target_key_conflict_count,
        (select count(*)::int from trait_conflicts where mergeable_metadata_only) as trait_mergeable_metadata_only_count,
        (select count(*)::int from trait_conflicts where conflicting_non_identical) as trait_conflicting_non_identical_count,
        (select count(*)::int from printing_conflicts) as printing_finish_conflict_count,
        (select count(*)::int from printing_conflicts where mergeable_metadata_only) as printing_mergeable_metadata_only_count,
        (select count(*)::int from printing_conflicts where conflicting_non_identical) as printing_conflicting_non_identical_count,
        (select row_count from external_conflicts) as external_mapping_conflict_count
    `,
  );
}

function assertCollisionSummary(summary) {
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

async function applyCollapse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const archivedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      is_active = false,
      updated_at = now()
    from tmp_xy7_target_active_identity_conflicts t
    where cpi.id = t.old_identity_id
      and cpi.is_active = true
  `);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.new_id,
      updated_at = now()
    from tmp_xy7_collapse_map m
    where cpi.card_print_id = m.old_id
  `);

  const activeIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (select distinct new_id from tmp_xy7_collapse_map)
      group by cpi.card_print_id
      having count(*) filter (where cpi.is_active = true) <> 1
    `,
  );

  if (activeIdentityConflicts.length > 0) {
    throw new Error(`TARGET_ACTIVE_IDENTITY_CONFLICT_AFTER_ARCHIVE:${JSON.stringify(activeIdentityConflicts)}`);
  }

  const mergedTraitMetadataRows = await client.query(`
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
    join tmp_xy7_collapse_map m
      on m.old_id = old_t.card_print_id
    where new_t.card_print_id = m.new_id
      and new_t.trait_type = old_t.trait_type
      and new_t.trait_value = old_t.trait_value
      and new_t.source = old_t.source
      and (
        (new_t.confidence is null and old_t.confidence is not null)
        or (new_t.hp is null and old_t.hp is not null)
        or (new_t.national_dex is null and old_t.national_dex is not null)
        or (new_t.types is null and old_t.types is not null)
        or ((new_t.rarity is null or new_t.rarity = 'None') and old_t.rarity is not null and old_t.rarity <> 'None')
        or (new_t.supertype is null and old_t.supertype is not null)
        or (new_t.card_category is null and old_t.card_category is not null)
        or ((new_t.legacy_rarity is null or new_t.legacy_rarity = 'None') and old_t.legacy_rarity is not null and old_t.legacy_rarity <> 'None')
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
    join tmp_xy7_collapse_map m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_xy7_collapse_map m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadataRows = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_xy7_collapse_map m
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
    from tmp_xy7_collapse_map m
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
    using tmp_xy7_collapse_map m
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
    from tmp_xy7_collapse_map m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_xy7_collapse_map m
    join public.card_prints cp_new
      on cp_new.id = m.new_id
    where vi.card_id = m.old_id
  `);

  const fkAfter = await loadSupportedFkCounts(client);
  const remainingOldReferences = Object.entries(fkAfter)
    .filter(([, rowCount]) => rowCount > 0)
    .map(([tableRef, rowCount]) => ({ table_ref: tableRef, row_count: rowCount }));

  if (remainingOldReferences.length > 0) {
    throw new Error(`REMAINING_OLD_REFERENCES_AFTER_REPOINT:${JSON.stringify(remainingOldReferences)}`);
  }

  return {
    fk_before: fkBefore,
    operations: {
      archived_identity_rows: archivedIdentityRows.rowCount ?? 0,
      updated_identity_rows: updatedIdentityRows.rowCount ?? 0,
      merged_trait_metadata_rows: mergedTraitMetadataRows.rowCount ?? 0,
      inserted_traits: insertedTraits.rowCount ?? 0,
      deleted_old_traits: deletedOldTraits.rowCount ?? 0,
      merged_printing_metadata_rows: mergedPrintingMetadataRows.rowCount ?? 0,
      moved_unique_printings: movedUniquePrintings.rowCount ?? 0,
      deleted_redundant_printings: deletedRedundantPrintings.rowCount ?? 0,
      updated_external_mappings: updatedExternalMappings.rowCount ?? 0,
      updated_vault_items: updatedVaultItems.rowCount ?? 0,
    },
    fk_after: fkAfter,
  };
}

function assertApplyOperations(applyOperations) {
  const ops = applyOperations?.operations ?? {};

  assertEqual(
    normalizeCount(ops.archived_identity_rows),
    EXPECTED.archivedIdentityRows,
    'ARCHIVED_IDENTITY_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(ops.updated_identity_rows),
    EXPECTED.updatedIdentityRows,
    'UPDATED_IDENTITY_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(ops.merged_trait_metadata_rows),
    EXPECTED.mergedTraitMetadataRows,
    'MERGED_TRAIT_METADATA_ROWS_DRIFT',
  );
  assertEqual(normalizeCount(ops.inserted_traits), EXPECTED.insertedTraits, 'INSERTED_TRAITS_DRIFT');
  assertEqual(
    normalizeCount(ops.deleted_old_traits),
    EXPECTED.deletedOldTraits,
    'DELETED_OLD_TRAITS_DRIFT',
  );
  assertEqual(
    normalizeCount(ops.merged_printing_metadata_rows),
    EXPECTED.mergedPrintingMetadataRows,
    'MERGED_PRINTING_METADATA_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(ops.moved_unique_printings),
    EXPECTED.movedUniquePrintings,
    'MOVED_UNIQUE_PRINTINGS_DRIFT',
  );
  assertEqual(
    normalizeCount(ops.deleted_redundant_printings),
    EXPECTED.deletedRedundantPrintings,
    'DELETED_REDUNDANT_PRINTINGS_DRIFT',
  );
  assertEqual(
    normalizeCount(ops.updated_external_mappings),
    EXPECTED.updatedExternalMappings,
    'UPDATED_EXTERNAL_MAPPINGS_DRIFT',
  );
  assertEqual(
    normalizeCount(ops.updated_vault_items),
    EXPECTED.updatedVaultItems,
    'UPDATED_VAULT_ITEMS_DRIFT',
  );
}

async function loadPostValidation(client) {
  return queryOne(
    client,
    `
      with unresolved_after as (
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cpi.is_active = true
          and cp.gv_id is null
      ),
      target_identity as (
        select
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows,
          count(*) filter (where cpi.is_active = false)::int as inactive_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_xy7_collapse_map)
      ),
      target_gvid_drift as (
        select count(*)::int as row_count
        from tmp_xy7_collapse_map m
        join public.card_prints cp
          on cp.id = m.new_id
        where cp.gv_id is distinct from m.new_gv_id
      ),
      route_resolvable as (
        select count(*)::int as row_count
        from public.card_prints cp
        where cp.id in (select new_id from tmp_xy7_collapse_map)
          and cp.gv_id is not null
      ),
      target_active_identity_state as (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_xy7_collapse_map)
        group by cpi.card_print_id
      )
      select
        (select row_count from unresolved_after) as remaining_unresolved_rows,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.set_code = $3
            and cp.gv_id is not null
        ) as canonical_target_count,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_xy7_collapse_map)
        ) as remaining_old_parent_rows,
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
}

function assertPostValidation(summary) {
  assertZero(summary?.remaining_old_parent_rows, 'REMAINING_OLD_PARENT_ROWS');
  assertEqual(
    normalizeCount(summary?.remaining_unresolved_rows),
    EXPECTED.remainingUnresolvedRows,
    'REMAINING_UNRESOLVED_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_any_identity_rows),
    EXPECTED.targetAnyIdentityRowsAfter,
    'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_active_identity_rows),
    EXPECTED.targetActiveIdentityRowsAfter,
    'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_inactive_identity_rows),
    EXPECTED.targetInactiveIdentityRowsAfter,
    'TARGET_INACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertZero(summary?.target_gvid_drift_count, 'TARGET_GVID_DRIFT_COUNT');
  assertEqual(
    normalizeCount(summary?.route_resolvable_target_count),
    EXPECTED.routeResolvableTargetCount,
    'ROUTE_RESOLVABLE_TARGET_COUNT_DRIFT',
  );
  assertZero(
    summary?.target_active_identity_conflict_count,
    'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT_AFTER_APPLY',
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
      name_normalize_v3:
        "lowercase -> unicode apostrophe to ASCII -> normalize dash separators to spaces -> remove GX/EX punctuation variants -> collapse whitespace -> trim",
      token_normalize_v1: 'numeric base extraction; suffix routing only when a same-set canonical target exists',
    },
    preconditions: null,
    target_active_identity_conflicts_before: null,
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
    application_name: `xy7_base_variant_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempCollapseSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.target_active_identity_conflicts_before = await loadTargetActiveIdentityConflicts(client);
    assertEqual(
      report.target_active_identity_conflicts_before.length,
      EXPECTED.targetActiveIdentityConflictCountBefore,
      'TARGET_ACTIVE_IDENTITY_CONFLICT_ROW_COUNT_DRIFT',
    );

    report.collapse_map_samples = await loadCollapseMapSamples(client);
    assertEqual(report.collapse_map_samples.length, 3, 'COLLAPSE_MAP_SAMPLE_COUNT_DRIFT');

    report.fk_inventory = await loadSupportedFkCounts(client);
    assertEqual(
      normalizeCount(report.fk_inventory?.card_print_identity),
      EXPECTED.sourceCount,
      'FK_CARD_PRINT_IDENTITY_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(report.fk_inventory?.card_print_traits),
      EXPECTED.oldTraitRowCount,
      'FK_CARD_PRINT_TRAITS_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(report.fk_inventory?.card_printings),
      EXPECTED.oldPrintingRowCount,
      'FK_CARD_PRINTINGS_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(report.fk_inventory?.external_mappings),
      EXPECTED.oldExternalMappingRowCount,
      'FK_EXTERNAL_MAPPINGS_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(report.fk_inventory?.vault_items),
      EXPECTED.oldVaultItemRowCount,
      'FK_VAULT_ITEMS_COUNT_DRIFT',
    );

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
      using tmp_xy7_collapse_map m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;
    assertEqual(report.deleted_old_parent_rows, EXPECTED.deletedOldParentRows, 'DELETED_OLD_PARENT_ROWS_DRIFT');

    report.post_validation = await loadPostValidation(client);
    assertPostValidation(report.post_validation);

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
