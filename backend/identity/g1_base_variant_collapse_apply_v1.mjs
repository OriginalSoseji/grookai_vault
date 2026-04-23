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
import pg from 'pg';

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
const { Client } = pg;

const TARGET_SET_CODE = 'g1';
const IDENTITY_DOMAIN = 'pokemon_eng_standard';
const APPLY_CLASS = 'BASE_VARIANT_COLLAPSE';
const PROMOTION_CLASS = 'PROMOTION_REQUIRED';
const RC_PREFIX_PATTERN = '^RC[0-9]+$';

const TMP = {
  unresolved: 'tmp_g1_unresolved_v1',
  canonical: 'tmp_g1_canonical_in_set_v1',
  candidateRows: 'tmp_g1_candidate_rows_v1',
  metrics: 'tmp_g1_metrics_v1',
  classification: 'tmp_g1_classification_v1',
  applyRows: 'tmp_g1_apply_rows_v1',
  excludedRows: 'tmp_g1_excluded_rows_v1',
  collapseMap: 'tmp_g1_collapse_map_v1',
  targetActiveIdentityConflicts: 'tmp_g1_target_active_identity_conflicts_v1',
  oldIds: 'tmp_g1_old_ids_v1',
};

const SUPPORTED_FKS = [
  ['card_print_identity', 'card_print_id'],
  ['card_print_traits', 'card_print_id'],
  ['card_printings', 'card_print_id'],
  ['external_mappings', 'card_print_id'],
  ['vault_items', 'card_id'],
];

const EXPECTED = {
  totalUnresolvedCount: 29,
  canonicalTargetCount: 100,
  applyScopeCount: 13,
  excludedPromotionScopeCount: 16,
  normalizedMapCount: 13,
  sameTokenNameNormalizeCount: 12,
  suffixToBaseSingleTargetCount: 1,
  unmatchedApplyCount: 0,
  ambiguousApplyCount: 0,
  reusedTargetsInApplyScope: 0,
  overlapWithPromotionRows: 0,
  fanInGroupCount: 0,
  targetActiveIdentityConflictCountBefore: 1,
  unsupportedReferenceCount: 0,
  collapseCount: 13,
  remainingUnresolvedRows: 16,
  remainingPromotionRequiredRows: 16,
  canonicalCountAfter: 100,
};

const EXPECTED_MAP = [
  {
    old_id: '50339ab4-4d1c-48b9-8628-73bf7db7466e',
    old_name: 'M Venusaur EX',
    old_printed_token: '2',
    new_id: '99612176-e359-4104-86a4-9805ca4bfd4f',
    new_gv_id: 'GV-PK-GEN-2',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: '95619b17-efd1-4024-b7e7-0cbec99563de',
    old_name: 'M Charizard EX',
    old_printed_token: '12',
    new_id: '64460521-9f20-4115-9896-c581029d18a8',
    new_gv_id: 'GV-PK-GEN-12',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: '6dc60443-defe-4215-8eed-d527e4ed92a6',
    old_name: 'Ninetales EX',
    old_printed_token: '13',
    new_id: '42fe2b2d-208d-4290-84ed-8cb76e029144',
    new_gv_id: 'GV-PK-GEN-13',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: 'c96abf3a-259e-4d9e-a512-0309a56e3a8c',
    old_name: 'Blastoise EX',
    old_printed_token: '17',
    new_id: '05415fbd-9785-4d4b-a600-05fceeb00e1d',
    new_gv_id: 'GV-PK-GEN-17',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: '3892fb4e-0a8a-4383-a92a-59382a7346e5',
    old_name: 'M Blastoise EX',
    old_printed_token: '18',
    new_id: '291c15ca-9a4c-41cc-96a3-bcaf85c2771f',
    new_gv_id: 'GV-PK-GEN-18',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: 'c2bacdbe-d06f-4a03-97d0-3e130b09fa51',
    old_name: 'Meowstic EX',
    old_printed_token: '37',
    new_id: 'c6b3dd2a-7366-4780-b707-b0c26dbb299c',
    new_gv_id: 'GV-PK-GEN-37',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: '2f64204c-ca45-48ee-8e0f-b3bba0220450',
    old_name: 'Golem EX',
    old_printed_token: '46',
    new_id: '70bb108a-2a29-41ee-b449-52c6558346dc',
    new_gv_id: 'GV-PK-GEN-46',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: 'c79b0839-1eef-4845-b00c-f9b72dd08cf1',
    old_name: 'Team Flare Grunt',
    old_printed_token: '73a',
    new_id: '28dd8192-92d1-446e-8979-7d6b47083022',
    new_gv_id: 'GV-PK-GEN-73',
    collapse_reason: 'SUFFIX_TO_BASE_SINGLE_TARGET_COLLAPSE',
  },
  {
    old_id: '43b1fb28-fb36-45c5-8476-4fe038f517f7',
    old_name: 'Sylveon EX',
    old_printed_token: 'RC21',
    new_id: '69d21e53-2f8c-4e3e-986b-73ed87ff943c',
    new_gv_id: 'GV-PK-GEN-RC21',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: '76f8bf1d-0e92-4bf6-b84b-61ee8ef6df96',
    old_name: 'Flareon EX',
    old_printed_token: 'RC28',
    new_id: '1ac5d2df-f9d5-4442-9e11-8322cf97c7de',
    new_gv_id: 'GV-PK-GEN-RC28',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: 'a65be2db-b9f3-4f8d-9df5-593bd2a4ba07',
    old_name: 'M Gardevoir EX',
    old_printed_token: 'RC31',
    new_id: '02b086ef-d294-439b-a872-b3bdf2738c52',
    new_gv_id: 'GV-PK-GEN-RC31',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: '4ec0a100-19b9-4cf0-9887-4cc5f70bce15',
    old_name: 'Sylveon EX',
    old_printed_token: 'RC32',
    new_id: 'f19dbfb7-0c97-4763-a79e-06ae44bab5f6',
    new_gv_id: 'GV-PK-GEN-RC32',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
  {
    old_id: '6c85fab5-fee4-4509-beeb-66030d85466b',
    old_name: 'Flareon EX',
    old_printed_token: 'RC6',
    new_id: 'a9eac1dd-7a1c-471b-9ba3-918a3c2b8a48',
    new_gv_id: 'GV-PK-GEN-RC6',
    collapse_reason: 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE',
  },
];

const EXPECTED_EXCLUDED_PROMOTION_IDS = [
  '6334f5d9-24e6-48d7-8823-306116d5f96d',
  'f18339d6-1831-4674-9670-074c3a2fd654',
  'b3e323e4-9be5-46d0-afd2-608a20212841',
  'e1434f2c-9e83-41ab-907f-687a05deeddf',
  'f92324a2-6e79-497b-a2ef-0dd1f87a1dcc',
  '7fa534ce-e63c-4c5c-8d58-bbdc5881e240',
  '84034d9b-e2e3-48b8-9c03-6d92f67ef527',
  '708b039d-efca-4744-aedf-65e6c82a6d25',
  '424ad8ec-c185-48d5-8ce4-9b0a24ccc0d0',
  'bbb281fa-3cf3-4989-8c6b-2cab82b8bcac',
  '8a1eddc6-0161-4e99-bfd3-206a956161ee',
  '3ad8de82-2862-4194-96ae-2d43a3e41b14',
  '061fc3b1-6b96-4eb0-b8ef-c4d3193e847b',
  '6d5677ae-0337-4f82-baab-3b7a3921a031',
  '8ca0294e-ada1-4a3f-b1fe-eb4a4fd10750',
  'f5a11553-b2f7-425c-8b4b-f422737dfb68',
];

function usage() {
  console.error('Usage: node backend/identity/g1_base_variant_collapse_apply_v1.mjs --dry-run|--apply');
  process.exit(1);
}

function parseMode(argv) {
  const hasDryRun = argv.includes('--dry-run');
  const hasApply = argv.includes('--apply');
  if (hasDryRun === hasApply) usage();
  return hasApply ? 'apply' : 'dry-run';
}

function normalizeCount(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  return Number.parseInt(String(value), 10);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertZero(actual, label) {
  assertEqual(actual, 0, label);
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

async function createTempTables(client) {
  await client.query(`
    drop table if exists ${TMP.unresolved};
    drop table if exists ${TMP.canonical};
    drop table if exists ${TMP.candidateRows};
    drop table if exists ${TMP.metrics};
    drop table if exists ${TMP.classification};
    drop table if exists ${TMP.applyRows};
    drop table if exists ${TMP.excludedRows};
    drop table if exists ${TMP.collapseMap};
    drop table if exists ${TMP.targetActiveIdentityConflicts};
    drop table if exists ${TMP.oldIds};

    create temp table ${TMP.unresolved} on commit drop as
    select
      cp.id as old_parent_id,
      cp.name as old_name,
      coalesce(cpi.printed_number, cp.number) as old_printed_token,
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
      ) as normalized_name,
      nullif(regexp_replace(coalesce(cpi.printed_number, cp.number, ''), '[^0-9]', '', 'g'), '') as normalized_token,
      nullif(substring(coalesce(cpi.printed_number, cp.number, '') from '^[0-9]+([A-Za-z]+)$'), '') as source_suffix,
      cp.set_id
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.identity_domain = '${IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${TARGET_SET_CODE}'
      and cpi.is_active = true
      and cp.gv_id is null;

    create temp table ${TMP.canonical} on commit drop as
    select
      cp.id as candidate_target_id,
      cp.name as candidate_target_name,
      cp.gv_id as candidate_target_gv_id,
      cp.number as candidate_target_number,
      cp.number_plain as candidate_target_number_plain,
      coalesce(cp.variant_key, '') as candidate_target_variant_key,
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
      ) as normalized_name
    from public.card_prints cp
    join public.sets s
      on s.id = cp.set_id
    where s.code = '${TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create temp table ${TMP.candidateRows} on commit drop as
    select
      u.old_parent_id,
      u.old_name,
      u.old_printed_token,
      u.normalized_name,
      u.normalized_token,
      c.candidate_target_id,
      c.candidate_target_name,
      c.candidate_target_gv_id,
      c.candidate_target_number,
      c.candidate_target_number_plain,
      c.candidate_target_variant_key,
      case
        when c.candidate_target_number = u.old_printed_token
          and c.normalized_name = u.normalized_name
          then 'exact'
        when c.candidate_target_number_plain = u.normalized_token
          and c.normalized_name = u.normalized_name
          and c.candidate_target_number <> u.old_printed_token
          then 'normalized'
        when c.candidate_target_number = u.old_printed_token
          then 'same_token_different_name'
        when c.candidate_target_number_plain = u.normalized_token
          then 'partial'
        else 'other'
      end as match_type
    from ${TMP.unresolved} u
    join ${TMP.canonical} c
      on c.candidate_target_number = u.old_printed_token
      or c.candidate_target_number_plain = u.normalized_token;

    create temp table ${TMP.metrics} on commit drop as
    select
      u.old_parent_id,
      u.old_name,
      u.old_printed_token,
      u.normalized_name,
      u.normalized_token,
      u.source_suffix,
      count(distinct c.candidate_target_id) filter (
        where c.match_type in ('exact', 'normalized')
      )::int as lawful_candidate_count,
      count(distinct c.candidate_target_id) filter (
        where c.match_type = 'exact'
      )::int as exact_candidate_count,
      count(distinct c.candidate_target_id) filter (
        where c.match_type = 'normalized'
      )::int as normalized_candidate_count,
      count(distinct c.candidate_target_id) filter (
        where c.match_type = 'same_token_different_name'
      )::int as same_token_different_name_count
    from ${TMP.unresolved} u
    left join ${TMP.candidateRows} c
      on c.old_parent_id = u.old_parent_id
    group by
      u.old_parent_id,
      u.old_name,
      u.old_printed_token,
      u.normalized_name,
      u.normalized_token,
      u.source_suffix;

    create temp table ${TMP.classification} on commit drop as
    select
      m.old_parent_id,
      m.old_name,
      m.old_printed_token,
      m.normalized_name,
      m.normalized_token,
      case
        when m.lawful_candidate_count = 1 then '${APPLY_CLASS}'
        when m.lawful_candidate_count > 1 then 'MULTI_CANONICAL_TARGET_CONFLICT'
        when m.lawful_candidate_count = 0
          and m.old_printed_token ~ '${RC_PREFIX_PATTERN}'
          then '${PROMOTION_CLASS}'
        when m.lawful_candidate_count = 0
          and m.same_token_different_name_count > 0
          then 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES'
        when m.lawful_candidate_count = 0 then 'IDENTITY_MODEL_GAP'
        else 'UNCLASSIFIED'
      end as execution_class,
      case
        when m.lawful_candidate_count = 1
          and m.exact_candidate_count = 1
          then 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE'
        when m.lawful_candidate_count = 1
          and m.normalized_candidate_count = 1
          and m.source_suffix is not null
          then 'SUFFIX_TO_BASE_SINGLE_TARGET_COLLAPSE'
        when m.old_printed_token ~ '${RC_PREFIX_PATTERN}'
          then 'EXCLUDED_PROMOTION'
        else 'OTHER'
      end as grouped_root_cause
    from ${TMP.metrics} m;

    create temp table ${TMP.applyRows} on commit drop as
    select *
    from ${TMP.classification}
    where execution_class = '${APPLY_CLASS}';

    create temp table ${TMP.excludedRows} on commit drop as
    select *
    from ${TMP.classification}
    where execution_class = '${PROMOTION_CLASS}';

    create temp table ${TMP.collapseMap} on commit drop as
    select
      row_number() over (
        order by
          coalesce(nullif(regexp_replace(a.old_printed_token, '[^0-9]', '', 'g'), ''), '0')::int,
          a.old_printed_token,
          a.old_parent_id
      )::int as seq,
      a.old_parent_id as old_id,
      a.old_name,
      a.old_printed_token,
      a.normalized_name,
      a.normalized_token,
      c.candidate_target_id as new_id,
      c.candidate_target_name as new_name,
      c.candidate_target_number as new_printed_token,
      c.candidate_target_gv_id as new_gv_id,
      a.grouped_root_cause as collapse_reason
    from ${TMP.applyRows} a
    join ${TMP.candidateRows} c
      on c.old_parent_id = a.old_parent_id
     and c.match_type in ('exact', 'normalized');

    create temp table ${TMP.oldIds} on commit drop as
    select old_id
    from ${TMP.collapseMap};

    create temp table ${TMP.targetActiveIdentityConflicts} on commit drop as
    select
      m.old_id,
      m.old_name,
      m.old_printed_token,
      m.new_id,
      m.new_name,
      m.new_printed_token,
      m.new_gv_id,
      old_cpi.id as old_identity_id,
      target_cpi.id as target_identity_id
    from ${TMP.collapseMap} m
    join public.card_print_identity old_cpi
      on old_cpi.card_print_id = m.old_id
     and old_cpi.is_active = true
    join public.card_print_identity target_cpi
      on target_cpi.card_print_id = m.new_id
     and target_cpi.is_active = true;
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with reused_targets as (
        select new_id
        from ${TMP.collapseMap}
        group by new_id
        having count(*) > 1
      ),
      unmatched_apply as (
        select a.old_parent_id
        from ${TMP.applyRows} a
        left join ${TMP.collapseMap} m
          on m.old_id = a.old_parent_id
        where m.old_id is null
      ),
      ambiguous_apply as (
        select old_parent_id
        from ${TMP.metrics}
        where old_parent_id in (select old_parent_id from ${TMP.applyRows})
          and lawful_candidate_count <> 1
      )
      select
        (select count(*)::int from ${TMP.unresolved}) as total_unresolved_count,
        (select count(*)::int from ${TMP.canonical}) as canonical_target_count,
        (select count(*)::int from ${TMP.applyRows}) as apply_scope_count,
        (select count(*)::int from ${TMP.excludedRows}) as excluded_promotion_scope_count,
        (select count(*)::int from ${TMP.collapseMap}) as normalized_map_count,
        (
          select count(*)::int
          from ${TMP.collapseMap}
          where collapse_reason = 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE'
        ) as same_token_name_normalize_count,
        (
          select count(*)::int
          from ${TMP.collapseMap}
          where collapse_reason = 'SUFFIX_TO_BASE_SINGLE_TARGET_COLLAPSE'
        ) as suffix_to_base_single_target_count,
        (select count(*)::int from unmatched_apply) as unmatched_apply_count,
        (select count(*)::int from ambiguous_apply) as ambiguous_apply_count,
        (select count(*)::int from reused_targets) as reused_targets_in_apply_scope,
        (
          select count(*)::int
          from ${TMP.applyRows} a
          join ${TMP.excludedRows} e
            on e.old_parent_id = a.old_parent_id
        ) as overlap_with_promotion_rows,
        (
          select count(*)::int
          from (
            select new_id
            from ${TMP.collapseMap}
            group by new_id
            having count(*) > 1
          ) fan_in
        ) as fan_in_group_count,
        (
          select count(*)::int
          from ${TMP.targetActiveIdentityConflicts}
        ) as target_active_identity_conflict_count
    `,
  );
}

function assertPreconditions(summary) {
  assertEqual(normalizeCount(summary?.total_unresolved_count), EXPECTED.totalUnresolvedCount, 'TOTAL_UNRESOLVED_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.canonical_target_count), EXPECTED.canonicalTargetCount, 'CANONICAL_TARGET_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.apply_scope_count), EXPECTED.applyScopeCount, 'APPLY_SCOPE_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.excluded_promotion_scope_count), EXPECTED.excludedPromotionScopeCount, 'EXCLUDED_PROMOTION_SCOPE_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.normalized_map_count), EXPECTED.normalizedMapCount, 'NORMALIZED_MAP_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.same_token_name_normalize_count), EXPECTED.sameTokenNameNormalizeCount, 'SAME_TOKEN_NAME_NORMALIZE_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.suffix_to_base_single_target_count), EXPECTED.suffixToBaseSingleTargetCount, 'SUFFIX_TO_BASE_SINGLE_TARGET_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.unmatched_apply_count), EXPECTED.unmatchedApplyCount, 'UNMATCHED_APPLY_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.ambiguous_apply_count), EXPECTED.ambiguousApplyCount, 'AMBIGUOUS_APPLY_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.reused_targets_in_apply_scope), EXPECTED.reusedTargetsInApplyScope, 'REUSED_TARGETS_IN_APPLY_SCOPE_DRIFT');
  assertEqual(normalizeCount(summary?.overlap_with_promotion_rows), EXPECTED.overlapWithPromotionRows, 'OVERLAP_WITH_PROMOTION_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.fan_in_group_count), EXPECTED.fanInGroupCount, 'FAN_IN_GROUP_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.target_active_identity_conflict_count),
    EXPECTED.targetActiveIdentityConflictCountBefore,
    'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT_DRIFT',
  );
}

function toComparableMapRow(row) {
  return {
    old_id: row.old_id,
    old_name: row.old_name,
    old_printed_token: row.old_printed_token,
    new_id: row.new_id,
    new_gv_id: row.new_gv_id,
    collapse_reason: row.collapse_reason,
  };
}

function sortByOldId(rows) {
  return [...rows].sort((a, b) => a.old_id.localeCompare(b.old_id));
}

function assertExpectedRows(actualRows, expectedRows, label, projector = (value) => value) {
  const actual = sortByOldId(actualRows.map(projector));
  const expected = sortByOldId(expectedRows.map(projector));
  const actualSerialized = JSON.stringify(actual);
  const expectedSerialized = JSON.stringify(expected);
  if (actualSerialized !== expectedSerialized) {
    throw new Error(`${label}: ${actualSerialized} != ${expectedSerialized}`);
  }
}

async function loadCollapseMap(client) {
  return queryRows(
    client,
    `
      select
        seq,
        old_id,
        old_name,
        old_printed_token,
        normalized_name,
        normalized_token,
        new_id,
        new_name,
        new_printed_token,
        new_gv_id,
        collapse_reason
      from ${TMP.collapseMap}
      order by seq
    `,
  );
}

async function loadExcludedRows(client) {
  return queryRows(
    client,
    `
      select
        old_parent_id as old_id,
        old_name,
        old_printed_token,
        execution_class
      from ${TMP.excludedRows}
      order by old_printed_token, old_parent_id
    `,
  );
}

async function loadTargetActiveIdentityConflicts(client) {
  return queryRows(
    client,
    `
      select
        old_id,
        old_name,
        old_printed_token,
        new_id,
        new_name,
        new_printed_token,
        new_gv_id,
        old_identity_id,
        target_identity_id
      from ${TMP.targetActiveIdentityConflicts}
      order by old_printed_token, old_id
    `,
  );
}

async function loadSupportedFkCounts(client) {
  return queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id in (select old_id from ${TMP.oldIds})) as card_print_identity,
        (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from ${TMP.oldIds})) as card_print_traits,
        (select count(*)::int from public.card_printings where card_print_id in (select old_id from ${TMP.oldIds})) as card_printings,
        (select count(*)::int from public.external_mappings where card_print_id in (select old_id from ${TMP.oldIds})) as external_mappings,
        (select count(*)::int from public.vault_items where card_id in (select old_id from ${TMP.oldIds})) as vault_items
    `,
  );
}

async function loadUnsupportedFkReferences(client) {
  const fkRows = await queryRows(
    client,
    `
      select
        tc.table_name,
        kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and tc.table_schema = 'public'
        and ccu.table_schema = 'public'
        and ccu.table_name = 'card_prints'
      order by tc.table_name, kcu.column_name
    `,
  );

  const supportedKeys = new Set(SUPPORTED_FKS.map(([table, column]) => `${table}.${column}`));
  const unsupported = [];

  for (const row of fkRows) {
    const key = `${row.table_name}.${row.column_name}`;
    if (supportedKeys.has(key)) continue;

    const countRow = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${quoteIdent(row.table_name)}
        where ${quoteIdent(row.column_name)} in (select old_id from ${TMP.oldIds})
      `,
    );

    const rowCount = normalizeCount(countRow?.row_count);
    if (rowCount > 0) {
      unsupported.push({
        table_name: row.table_name,
        column_name: row.column_name,
        row_count: rowCount,
      });
    }
  }

  return unsupported;
}

async function loadCollapseMapSamples(client) {
  return queryRows(
    client,
    `
      with sample_seq as (
        select 1 as seq
        union all
        select ((count(*) + 1) / 2)::int
        from ${TMP.collapseMap}
        union all
        select count(*)::int
        from ${TMP.collapseMap}
      )
      select
        m.seq,
        m.old_id,
        m.old_name,
        m.old_printed_token,
        m.new_id,
        m.new_name,
        m.new_printed_token,
        m.new_gv_id,
        m.collapse_reason
      from ${TMP.collapseMap} m
      join sample_seq s
        on s.seq = m.seq
      order by m.seq
    `,
  );
}

async function loadExcludedPromotionSamples(client) {
  return queryRows(
    client,
    `
      with ranked as (
        select
          row_number() over (order by old_printed_token, old_parent_id)::int as seq,
          old_parent_id as old_id,
          old_name,
          old_printed_token
        from ${TMP.excludedRows}
      ),
      sample_seq as (
        select 1 as seq
        union all
        select ((count(*) + 1) / 2)::int
        from ranked
        union all
        select count(*)::int
        from ranked
      )
      select
        r.seq,
        r.old_id,
        r.old_name,
        r.old_printed_token,
        'EXCLUDED_PROMOTION' as row_scope
      from ranked r
      join sample_seq s
        on s.seq = r.seq
      order by r.seq
    `,
  );
}

async function applyCollapse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const archivedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      is_active = false,
      updated_at = now()
    from ${TMP.targetActiveIdentityConflicts} t
    where cpi.id = t.old_identity_id
      and cpi.is_active = true
  `);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.new_id,
      updated_at = now()
    from ${TMP.collapseMap} m
    where cpi.card_print_id = m.old_id
  `);

  const activeIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (select distinct new_id from ${TMP.collapseMap})
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
    join ${TMP.collapseMap} m
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
    join ${TMP.collapseMap} m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using ${TMP.collapseMap} m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadataRows = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join ${TMP.collapseMap} m
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
    from ${TMP.collapseMap} m
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
    using ${TMP.collapseMap} m
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
    from ${TMP.collapseMap} m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from ${TMP.collapseMap} m
    join public.card_prints cp_new
      on cp_new.id = m.new_id
    where vi.card_id = m.old_id
  `);

  const fkAfter = await loadSupportedFkCounts(client);
  const remainingOldReferences = Object.entries(fkAfter)
    .filter(([, rowCount]) => normalizeCount(rowCount) > 0)
    .map(([tableRef, rowCount]) => ({ table_ref: tableRef, row_count: normalizeCount(rowCount) }));

  if (remainingOldReferences.length > 0) {
    throw new Error(`REMAINING_OLD_REFERENCES_AFTER_REPOINT:${JSON.stringify(remainingOldReferences)}`);
  }

  const deletedOldParents = await client.query(`
    delete from public.card_prints cp
    using ${TMP.collapseMap} m
    where cp.id = m.old_id
  `);

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
      deleted_old_parents: deletedOldParents.rowCount ?? 0,
    },
    fk_after: fkAfter,
  };
}

async function loadPostValidation(client) {
  return queryOne(
    client,
    `
      with unresolved_after as (
        select count(*)::int as row_count
        from public.card_prints cp
        join public.sets s
          on s.id = cp.set_id
        where s.code = $1
          and cp.gv_id is null
      ),
      promotion_required_after as (
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cp.id in (select old_parent_id from ${TMP.excludedRows})
          and cp.gv_id is null
          and cpi.is_active = true
          and cpi.printed_number ~ $2
      ),
      canonical_after as (
        select count(*)::int as row_count
        from public.card_prints cp
        join public.sets s
          on s.id = cp.set_id
        where s.code = $1
          and cp.gv_id is not null
      ),
      target_active_identity_state as (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select distinct new_id from ${TMP.collapseMap})
        group by cpi.card_print_id
        having count(*) filter (where cpi.is_active = true) <> 1
      ),
      excluded_row_state as (
        select count(*)::int as row_count
        from public.card_prints cp
        where cp.id in (select old_parent_id from ${TMP.excludedRows})
          and cp.gv_id is null
      )
      select
        (select row_count from unresolved_after) as remaining_unresolved_rows,
        (select row_count from promotion_required_after) as remaining_promotion_required_rows,
        (select row_count from canonical_after) as canonical_target_count,
        (select row_count from excluded_row_state) as untouched_excluded_row_count,
        (
          select count(*)::int
          from target_active_identity_state
        ) as target_active_identity_conflict_count
    `,
    [TARGET_SET_CODE, RC_PREFIX_PATTERN],
  );
}

function assertPostValidation(postValidation) {
  assertEqual(normalizeCount(postValidation?.remaining_unresolved_rows), EXPECTED.remainingUnresolvedRows, 'REMAINING_UNRESOLVED_ROWS_DRIFT');
  assertEqual(
    normalizeCount(postValidation?.remaining_promotion_required_rows),
    EXPECTED.remainingPromotionRequiredRows,
    'REMAINING_PROMOTION_REQUIRED_ROWS_DRIFT',
  );
  assertEqual(normalizeCount(postValidation?.canonical_target_count), EXPECTED.canonicalCountAfter, 'CANONICAL_TARGET_COUNT_AFTER_DRIFT');
  assertEqual(
    normalizeCount(postValidation?.untouched_excluded_row_count),
    EXPECTED.excludedPromotionScopeCount,
    'UNTOUCHED_EXCLUDED_ROW_COUNT_DRIFT',
  );
  assertZero(normalizeCount(postValidation?.target_active_identity_conflict_count), 'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT_AFTER_DRIFT');
}

async function main() {
  const mode = parseMode(process.argv.slice(2));

  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const report = {
    mode,
    target_set_code: TARGET_SET_CODE,
    apply_status: mode === 'apply' ? 'not_started' : 'dry_run_complete',
    preconditions: null,
    unsupported_fk_references: [],
    target_active_identity_conflicts_before: [],
    fk_inventory_before: null,
    fk_movement_summary: null,
    post_validation: null,
    sample_apply_rows: [],
    excluded_promotion_example_rows: [],
  };

  try {
    await client.query('begin');
    await createTempTables(client);

    const summary = await loadPreconditionSummary(client);
    report.preconditions = summary;
    assertPreconditions(summary);

    const collapseMap = await loadCollapseMap(client);
    assertExpectedRows(collapseMap, EXPECTED_MAP, 'COLLAPSE_MAP_DRIFT', toComparableMapRow);

    const excludedRows = await loadExcludedRows(client);
    const excludedIds = excludedRows.map((row) => ({ old_id: row.old_id }));
    const expectedExcludedIds = EXPECTED_EXCLUDED_PROMOTION_IDS.map((old_id) => ({ old_id }));
    assertExpectedRows(excludedIds, expectedExcludedIds, 'EXCLUDED_PROMOTION_IDS_DRIFT');

    const unsupportedFkReferences = await loadUnsupportedFkReferences(client);
    report.unsupported_fk_references = unsupportedFkReferences;
    assertEqual(unsupportedFkReferences.length, EXPECTED.unsupportedReferenceCount, 'UNSUPPORTED_REFERENCE_COUNT_DRIFT');

    report.target_active_identity_conflicts_before = await loadTargetActiveIdentityConflicts(client);
    report.sample_apply_rows = await loadCollapseMapSamples(client);
    report.excluded_promotion_example_rows = await loadExcludedPromotionSamples(client);

    if (mode === 'dry-run') {
      await client.query('rollback');
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    report.fk_inventory_before = await loadSupportedFkCounts(client);
    const applyResult = await applyCollapse(client);
    report.fk_movement_summary = applyResult;

    assertEqual(
      normalizeCount(applyResult?.operations?.deleted_old_parents),
      EXPECTED.collapseCount,
      'DELETED_OLD_PARENTS_DRIFT',
    );

    report.post_validation = await loadPostValidation(client);
    assertPostValidation(report.post_validation);

    await client.query('commit');
    report.apply_status = 'applied';
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // no-op
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
