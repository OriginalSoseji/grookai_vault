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
const PHASE = 'XY10_BASE_VARIANT_FANIN_COLLAPSE_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'xy10';
const TARGET_SET_CODE = 'xy10';

const EXPECTED = {
  sourceCount: 25,
  canonicalTargetCount: 126,
  exactMatchCount: 0,
  sameTokenDifferentNameCount: 22,
  exactUnmatchedCount: 25,
  normalizedMapCount: 25,
  normalizedAmbiguousCount: 0,
  normalizedInvalidCount: 0,
  baseVariantCount: 21,
  activeIdentityFaninCount: 4,
  blockedConflictCount: 0,
  unclassifiedCount: 0,
  baseReusedTargetCount: 2,
  distinctOldCount: 25,
  distinctNewCount: 23,
  normalizedNameCount: 22,
  suffixVariantCount: 3,
  fanInGroupCount: 2,
  targetActiveIdentityConflictCountBefore: 1,
  deletedOldParentRows: 25,
  remainingUnresolvedRows: 0,
  targetAnyIdentityRowsAfter: 26,
  targetActiveIdentityRowsAfter: 23,
  targetInactiveIdentityRowsAfter: 3,
  routeResolvableTargetCount: 23,
};

const BACKUP_SCHEMA_PATH = path.join(
  process.cwd(),
  'backups',
  'xy10_base_variant_fanin_preapply_schema.sql',
);
const BACKUP_DATA_PATH = path.join(
  process.cwd(),
  'backups',
  'xy10_base_variant_fanin_preapply_data.sql',
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

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
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

function normalizeExactNameKey(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase().replace(/\s+/g, ' ').trim();
}

function nameNormalizeV3(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, ' ')
    .replace(/\s*-\s*gx\b/gi, ' gx')
    .replace(/\s*-\s*ex\b/gi, ' ex')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(left, right) {
  const source = String(left ?? '');
  const target = String(right ?? '');
  const matrix = Array.from({ length: source.length + 1 }, () =>
    new Array(target.length + 1).fill(0),
  );

  for (let row = 0; row <= source.length; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column <= target.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= source.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      const substitutionCost = source[row - 1] === target[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );
    }
  }

  return matrix[source.length][target.length];
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
    drop table if exists tmp_xy10_unresolved;
    drop table if exists tmp_xy10_canonical;
    drop table if exists tmp_xy10_exact_audit;
    drop table if exists tmp_xy10_match_rows;
    drop table if exists tmp_xy10_same_base_diff_name_rows;
    drop table if exists tmp_xy10_metrics;
    drop table if exists tmp_xy10_collapse_map;
    drop table if exists tmp_xy10_reused_targets;
    drop table if exists tmp_xy10_fan_in_groups;
    drop table if exists tmp_xy10_classification;
    drop table if exists tmp_xy10_target_active_identity_conflicts;
    drop table if exists tmp_xy10_fanin_resolution;

    create temp table tmp_xy10_unresolved on commit drop as
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

    create temp table tmp_xy10_canonical on commit drop as
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

    create temp table tmp_xy10_exact_audit on commit drop as
    select
      u.old_id,
      count(c.new_id)::int as same_token_candidate_count,
      count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
      count(c.new_id) filter (where c.target_exact_name_key <> u.source_exact_name_key)::int as same_token_different_name_count
    from tmp_xy10_unresolved u
    left join tmp_xy10_canonical c
      on c.new_number = u.source_printed_number
    group by u.old_id, u.source_exact_name_key;

    create temp table tmp_xy10_match_rows on commit drop as
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
        when lower(coalesce(c.new_number, '')) <> lower(coalesce(u.source_printed_number, ''))
          then 'suffix_variant'
        else 'name_normalize_v3'
      end as match_category
    from tmp_xy10_unresolved u
    join tmp_xy10_canonical c
      on c.new_number_plain = u.source_base_number_plain
     and c.target_name_normalized_v3 = u.source_name_normalized_v3;

    create temp table tmp_xy10_same_base_diff_name_rows on commit drop as
    select
      u.old_id,
      c.new_id
    from tmp_xy10_unresolved u
    join tmp_xy10_canonical c
      on c.new_number_plain = u.source_base_number_plain
     and c.target_name_normalized_v3 <> u.source_name_normalized_v3;

    create temp table tmp_xy10_metrics on commit drop as
    select
      u.old_id,
      ea.exact_match_count,
      ea.same_token_different_name_count,
      count(distinct mr.new_id)::int as base_match_count,
      count(distinct sbd.new_id)::int as same_base_different_name_count
    from tmp_xy10_unresolved u
    join tmp_xy10_exact_audit ea
      on ea.old_id = u.old_id
    left join tmp_xy10_match_rows mr
      on mr.old_id = u.old_id
    left join tmp_xy10_same_base_diff_name_rows sbd
      on sbd.old_id = u.old_id
    group by u.old_id, ea.exact_match_count, ea.same_token_different_name_count;

    create temp table tmp_xy10_collapse_map on commit drop as
    select
      row_number() over (
        order by
          coalesce(nullif(mr.source_base_number_plain, ''), '0')::int,
          mr.source_printed_number,
          mr.old_id
      )::int as seq,
      mr.*
    from tmp_xy10_match_rows mr
    join tmp_xy10_metrics m
      on m.old_id = mr.old_id
    where m.base_match_count = 1;

    create temp table tmp_xy10_reused_targets on commit drop as
    select
      new_id,
      count(*)::int as incoming_sources
    from tmp_xy10_collapse_map
    group by new_id
    having count(*) > 1;

    create temp table tmp_xy10_fan_in_groups on commit drop as
    select
      m.new_id as target_card_print_id,
      min(m.new_name) as target_name,
      min(m.new_number) as target_number,
      min(m.new_gv_id) as target_gv_id,
      count(*)::int as incoming_sources,
      array_agg(m.old_id order by m.source_printed_number, m.old_id) as source_old_ids,
      array_agg(m.old_name order by m.source_printed_number, m.old_id) as source_old_names,
      array_agg(m.source_printed_number order by m.source_printed_number, m.old_id) as source_printed_numbers,
      (count(distinct m.source_name_normalized_v3) = 1) as normalization_only
    from tmp_xy10_collapse_map m
    join tmp_xy10_reused_targets rt
      on rt.new_id = m.new_id
    group by m.new_id;

    create temp table tmp_xy10_classification on commit drop as
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
        when m.base_match_count = 1 and exists (
          select 1
          from tmp_xy10_reused_targets rt
          where rt.new_id = mr.new_id
        ) then 'ACTIVE_IDENTITY_FANIN'
        when m.base_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
        when m.base_match_count > 1 then 'BLOCKED_CONFLICT'
        when m.base_match_count = 0 and m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
        else 'UNCLASSIFIED'
      end as execution_class
    from tmp_xy10_unresolved u
    join tmp_xy10_metrics m
      on m.old_id = u.old_id
    left join lateral (
      select *
      from tmp_xy10_match_rows mr
      where mr.old_id = u.old_id
      order by mr.new_number, mr.new_id
      limit 1
    ) mr on true;

    create temp table tmp_xy10_target_active_identity_conflicts on commit drop as
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
    from tmp_xy10_collapse_map m
    join public.card_print_identity cpi
      on cpi.card_print_id = m.new_id
     and cpi.is_active = true
    where not exists (
      select 1
      from tmp_xy10_reused_targets rt
      where rt.new_id = m.new_id
    );

    create temp table tmp_xy10_fanin_resolution (
      target_card_print_id uuid not null,
      target_gv_id text not null,
      target_name text not null,
      target_number text not null,
      source_old_id uuid not null,
      source_old_name text not null,
      source_printed_number text not null,
      identity_id uuid not null,
      identity_printed_number text not null,
      identity_normalized_printed_name text null,
      is_active boolean not null,
      resolution_action text not null,
      name_match_rank int not null,
      token_match_rank int not null,
      lexical_distance int not null,
      deterministic_tiebreak text not null
    ) on commit drop;

    create unique index tmp_xy10_fanin_resolution_identity_uidx
      on tmp_xy10_fanin_resolution (identity_id);
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      select
        (select count(*)::int from tmp_xy10_unresolved) as source_count,
        (select count(*)::int from tmp_xy10_canonical) as canonical_target_count,
        (
          select count(*)::int
          from tmp_xy10_classification
          where exact_match_count = 1
        ) as exact_match_count,
        (
          select count(*)::int
          from tmp_xy10_classification
          where execution_class in ('BASE_VARIANT_COLLAPSE', 'ACTIVE_IDENTITY_FANIN')
            and same_token_different_name_count > 0
        ) as same_token_different_name_count,
        (
          select count(*)::int
          from tmp_xy10_classification
          where execution_class in ('BASE_VARIANT_COLLAPSE', 'ACTIVE_IDENTITY_FANIN')
            and exact_match_count = 0
        ) as exact_unmatched_count,
        (select count(*)::int from tmp_xy10_collapse_map) as normalized_map_count,
        (
          select count(*)::int
          from tmp_xy10_metrics
          where base_match_count > 1
        ) as normalized_ambiguous_count,
        (
          select count(*)::int
          from tmp_xy10_classification
          where execution_class = 'UNCLASSIFIED'
        ) as normalized_invalid_count,
        (
          select count(*)::int
          from tmp_xy10_classification
          where execution_class = 'BASE_VARIANT_COLLAPSE'
        ) as base_variant_count,
        (
          select count(*)::int
          from tmp_xy10_classification
          where execution_class = 'ACTIVE_IDENTITY_FANIN'
        ) as active_identity_fanin_count,
        (
          select count(*)::int
          from tmp_xy10_classification
          where execution_class = 'BLOCKED_CONFLICT'
        ) as blocked_conflict_count,
        (
          select count(*)::int
          from tmp_xy10_classification
          where execution_class = 'UNCLASSIFIED'
        ) as unclassified_count,
        (select count(*)::int from tmp_xy10_reused_targets) as base_reused_target_count,
        (select count(distinct old_id)::int from tmp_xy10_collapse_map) as distinct_old_count,
        (select count(distinct new_id)::int from tmp_xy10_collapse_map) as distinct_new_count,
        (
          select count(*)::int
          from tmp_xy10_collapse_map
          where match_category = 'name_normalize_v3'
        ) as normalized_name_count,
        (
          select count(*)::int
          from tmp_xy10_collapse_map
          where match_category = 'suffix_variant'
        ) as suffix_variant_count,
        (select count(*)::int from tmp_xy10_fan_in_groups) as fan_in_group_count,
        (select count(*)::int from tmp_xy10_target_active_identity_conflicts) as target_active_identity_conflict_count
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
    normalizeCount(summary?.base_variant_count),
    EXPECTED.baseVariantCount,
    'BASE_VARIANT_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.active_identity_fanin_count),
    EXPECTED.activeIdentityFaninCount,
    'ACTIVE_IDENTITY_FANIN_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.blocked_conflict_count),
    EXPECTED.blockedConflictCount,
    'BLOCKED_CONFLICT_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.unclassified_count),
    EXPECTED.unclassifiedCount,
    'UNCLASSIFIED_COUNT_DRIFT',
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

async function loadFanInGroups(client) {
  return queryRows(
    client,
    `
      select
        target_card_print_id,
        target_name,
        target_number,
        target_gv_id,
        incoming_sources,
        source_old_ids,
        source_old_names,
        source_printed_numbers,
        normalization_only
      from tmp_xy10_fan_in_groups
      order by target_number, target_card_print_id
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
        source_printed_number,
        new_id,
        new_name,
        new_number,
        new_gv_id,
        old_identity_id,
        target_identity_id
      from tmp_xy10_target_active_identity_conflicts
      order by source_printed_number, old_id
    `,
  );
}

async function insertFanInResolutionRows(client, rows) {
  if (rows.length === 0) {
    return;
  }

  await client.query(
    `
      insert into tmp_xy10_fanin_resolution (
        target_card_print_id,
        target_gv_id,
        target_name,
        target_number,
        source_old_id,
        source_old_name,
        source_printed_number,
        identity_id,
        identity_printed_number,
        identity_normalized_printed_name,
        is_active,
        resolution_action,
        name_match_rank,
        token_match_rank,
        lexical_distance,
        deterministic_tiebreak
      )
      select
        target_card_print_id,
        target_gv_id,
        target_name,
        target_number,
        source_old_id,
        source_old_name,
        source_printed_number,
        identity_id,
        identity_printed_number,
        identity_normalized_printed_name,
        is_active,
        resolution_action,
        name_match_rank,
        token_match_rank,
        lexical_distance,
        deterministic_tiebreak
      from json_to_recordset($1::json) as x(
        target_card_print_id uuid,
        target_gv_id text,
        target_name text,
        target_number text,
        source_old_id uuid,
        source_old_name text,
        source_printed_number text,
        identity_id uuid,
        identity_printed_number text,
        identity_normalized_printed_name text,
        is_active boolean,
        resolution_action text,
        name_match_rank int,
        token_match_rank int,
        lexical_distance int,
        deterministic_tiebreak text
      )
    `,
    [JSON.stringify(rows)],
  );
}

async function buildFanInResolution(client) {
  const collapseMapRows = await queryRows(
    client,
    `
      select
        seq,
        old_id,
        new_id,
        old_name,
        new_name,
        source_printed_number,
        new_number,
        new_gv_id
      from tmp_xy10_collapse_map
      where new_id in (select new_id from tmp_xy10_reused_targets)
      order by seq
    `,
  );

  const identityRows = await queryRows(
    client,
    `
      select
        cpi.id as identity_id,
        cpi.card_print_id,
        cpi.printed_number as identity_printed_number,
        cpi.normalized_printed_name as identity_normalized_printed_name,
        cpi.source_name_raw,
        cpi.is_active
      from public.card_print_identity cpi
      where cpi.card_print_id in (
        select old_id from tmp_xy10_collapse_map
        where new_id in (select new_id from tmp_xy10_reused_targets)
        union
        select new_id from tmp_xy10_reused_targets
      )
      order by cpi.card_print_id, cpi.is_active desc, cpi.id
    `,
  );

  const activeIdentityByCardPrintId = new Map();
  for (const row of identityRows) {
    if (!row.is_active) {
      continue;
    }

    if (activeIdentityByCardPrintId.has(row.card_print_id)) {
      throw new Error(`MULTIPLE_ACTIVE_IDENTITIES_PER_CARD_PRINT:${row.card_print_id}`);
    }

    activeIdentityByCardPrintId.set(row.card_print_id, row);
  }

  const collapseRowsByNewId = new Map();
  for (const row of collapseMapRows) {
    const bucket = collapseRowsByNewId.get(row.new_id) ?? [];
    bucket.push(row);
    collapseRowsByNewId.set(row.new_id, bucket);
  }

  const fanInResolutionRows = [];
  const fanInGroups = [];

  for (const [newId, rows] of collapseRowsByNewId.entries()) {
    const targetTemplate = rows[0];
    const candidates = rows.map((row) => {
      const identityRow = activeIdentityByCardPrintId.get(row.old_id);
      if (!identityRow) {
        throw new Error(`MISSING_ACTIVE_IDENTITY_FOR_FANIN_SOURCE:${row.old_id}`);
      }

      const identityName = normalizeTextOrNull(identityRow.source_name_raw) ?? row.old_name;
      return {
        target_card_print_id: newId,
        target_gv_id: row.new_gv_id,
        target_name: row.new_name,
        target_number: row.new_number,
        source_old_id: row.old_id,
        source_old_name: row.old_name,
        source_printed_number: row.source_printed_number,
        identity_id: identityRow.identity_id,
        identity_printed_number: identityRow.identity_printed_number,
        identity_normalized_printed_name: identityRow.identity_normalized_printed_name,
        is_active: identityRow.is_active,
        name_match_rank:
          nameNormalizeV3(identityName) === nameNormalizeV3(row.new_name) ? 1 : 0,
        token_match_rank:
          normalizeTextOrNull(identityRow.identity_printed_number) === normalizeTextOrNull(row.new_number)
            ? 1
            : 0,
        lexical_distance: levenshteinDistance(
          normalizeTextOrNull(identityName)?.toLowerCase() ?? '',
          normalizeTextOrNull(row.new_name)?.toLowerCase() ?? '',
        ),
        deterministic_tiebreak: identityRow.identity_id,
      };
    });

    const targetIdentityRow = activeIdentityByCardPrintId.get(newId);
    if (targetIdentityRow) {
      const identityName =
        normalizeTextOrNull(targetIdentityRow.source_name_raw) ?? targetTemplate.new_name;
      candidates.push({
        target_card_print_id: newId,
        target_gv_id: targetTemplate.new_gv_id,
        target_name: targetTemplate.new_name,
        target_number: targetTemplate.new_number,
        source_old_id: newId,
        source_old_name: targetTemplate.new_name,
        source_printed_number:
          normalizeTextOrNull(targetIdentityRow.identity_printed_number) ?? targetTemplate.new_number,
        identity_id: targetIdentityRow.identity_id,
        identity_printed_number: targetIdentityRow.identity_printed_number,
        identity_normalized_printed_name: targetIdentityRow.identity_normalized_printed_name,
        is_active: targetIdentityRow.is_active,
        name_match_rank:
          nameNormalizeV3(identityName) === nameNormalizeV3(targetTemplate.new_name) ? 1 : 0,
        token_match_rank:
          normalizeTextOrNull(targetIdentityRow.identity_printed_number) ===
          normalizeTextOrNull(targetTemplate.new_number)
            ? 1
            : 0,
        lexical_distance: levenshteinDistance(
          normalizeTextOrNull(identityName)?.toLowerCase() ?? '',
          normalizeTextOrNull(targetTemplate.new_name)?.toLowerCase() ?? '',
        ),
        deterministic_tiebreak: targetIdentityRow.identity_id,
      });
    }

    if (candidates.length <= 1) {
      continue;
    }

    if (candidates.some((candidate) => candidate.name_match_rank !== 1)) {
      throw new Error(`FANIN_SEMANTIC_DIVERGENCE:${newId}`);
    }

    candidates.sort((left, right) => {
      if (right.name_match_rank !== left.name_match_rank) {
        return right.name_match_rank - left.name_match_rank;
      }
      if (right.token_match_rank !== left.token_match_rank) {
        return right.token_match_rank - left.token_match_rank;
      }
      if (left.lexical_distance !== right.lexical_distance) {
        return left.lexical_distance - right.lexical_distance;
      }
      return left.deterministic_tiebreak.localeCompare(right.deterministic_tiebreak);
    });

    const selected = candidates[0];
    const archived = candidates.slice(1);

    fanInGroups.push({
      target_card_print_id: newId,
      target_gv_id: selected.target_gv_id,
      target_name: selected.target_name,
      target_number: selected.target_number,
      incoming_sources: candidates.length,
      selected_identity_id: selected.identity_id,
      selected_source_old_id: selected.source_old_id,
      selected_source_name: selected.source_old_name,
      selected_source_printed_number: selected.source_printed_number,
      archived_identity_ids: archived.map((row) => row.identity_id),
      archived_source_old_ids: archived.map((row) => row.source_old_id),
      archived_source_names: archived.map((row) => row.source_old_name),
      archived_source_printed_numbers: archived.map((row) => row.source_printed_number),
    });

    fanInResolutionRows.push({
      ...selected,
      resolution_action: 'keep_active',
    });

    for (const archivedRow of archived) {
      fanInResolutionRows.push({
        ...archivedRow,
        resolution_action: 'archive_history',
      });
    }
  }

  await insertFanInResolutionRows(client, fanInResolutionRows);

  return {
    fan_in_group_count: fanInGroups.length,
    archived_from_fanin_count: fanInResolutionRows.filter(
      (row) => row.resolution_action === 'archive_history',
    ).length,
    fan_in_groups: fanInGroups,
  };
}

function assertFanInResolution(summary) {
  assertEqual(
    normalizeCount(summary?.fan_in_group_count),
    EXPECTED.fanInGroupCount,
    'FAN_IN_GROUP_COUNT_DRIFT',
  );
}

async function loadCollapseMapSamples(client) {
  const samples = await queryRows(
    client,
    `
      select
        m.seq,
        m.old_id,
        m.new_id,
        m.old_name,
        m.new_name,
        m.old_set_code,
        m.new_set_code,
        m.old_parent_number,
        m.old_parent_number_plain,
        m.source_printed_number,
        m.source_base_number_plain,
        m.source_number_suffix,
        m.source_exact_name_key,
        m.source_name_normalized_v3,
        m.new_number,
        m.new_number_plain,
        m.target_exact_name_key,
        m.target_name_normalized_v3,
        m.match_category,
        m.new_gv_id,
        cls.execution_class
      from tmp_xy10_collapse_map m
      join tmp_xy10_classification cls
        on cls.old_id = m.old_id
      order by m.seq
    `,
  );

  if (samples.length === 0) {
    return [];
  }

  const fanInSample = await queryOne(
    client,
    `
      select
        m.seq,
        m.old_id,
        m.new_id,
        m.old_name,
        m.new_name,
        m.old_set_code,
        m.new_set_code,
        m.old_parent_number,
        m.old_parent_number_plain,
        m.source_printed_number,
        m.source_base_number_plain,
        m.source_number_suffix,
        m.source_exact_name_key,
        m.source_name_normalized_v3,
        m.new_number,
        m.new_number_plain,
        m.target_exact_name_key,
        m.target_name_normalized_v3,
        m.match_category,
        m.new_gv_id,
        cls.execution_class
      from tmp_xy10_collapse_map m
      join tmp_xy10_classification cls
        on cls.old_id = m.old_id
      where cls.execution_class = 'ACTIVE_IDENTITY_FANIN'
      order by
        case when m.match_category = 'suffix_variant' then 0 else 1 end,
        m.seq
      limit 1
    `,
  );

  const orderedSamples = [samples[0], fanInSample ?? null, samples[samples.length - 1]].filter(Boolean);
  const deduped = [];
  const seen = new Set();

  for (const sample of orderedSamples) {
    if (seen.has(sample.old_id)) {
      continue;
    }
    deduped.push(sample);
    seen.add(sample.old_id);
  }

  if (deduped.length < 3 && samples.length >= 3) {
    const middleIndex = Math.floor((samples.length - 1) / 2);
    const middleSample = samples[middleIndex];
    if (!seen.has(middleSample.old_id)) {
      deduped.splice(1, 0, middleSample);
      seen.add(middleSample.old_id);
    }
  }

  return deduped.slice(0, Math.min(3, deduped.length));
}

async function loadSupportedFkCounts(client, oldIdsTable = 'tmp_xy10_collapse_map') {
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
        join tmp_xy10_collapse_map m
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
        join tmp_xy10_collapse_map m
          on m.old_id = old_p.card_print_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from public.external_mappings old_em
        join tmp_xy10_collapse_map m
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
  assertZero(
    summary?.trait_conflicting_non_identical_count,
    'TRAIT_CONFLICTING_NON_IDENTICAL_COUNT',
  );
  assertZero(
    summary?.printing_conflicting_non_identical_count,
    'PRINTING_CONFLICTING_NON_IDENTICAL_COUNT',
  );
  assertZero(summary?.external_mapping_conflict_count, 'EXTERNAL_MAPPING_CONFLICT_COUNT');
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

  const indexes = await queryRows(
    client,
    `
      select
        schemaname,
        tablename as table_name,
        indexname,
        indexdef
      from pg_indexes
      where schemaname = 'public'
        and tablename = any($1::text[])
      order by table_name, indexname
    `,
    [tableNames],
  );

  const constraints = await queryRows(
    client,
    `
      select
        cls.relname as table_name,
        con.conname as constraint_name,
        con.contype,
        pg_get_constraintdef(con.oid) as constraint_def
      from pg_constraint con
      join pg_class cls
        on cls.oid = con.conrelid
      join pg_namespace nsp
        on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public'
        and cls.relname = any($1::text[])
      order by cls.relname, con.conname
    `,
    [tableNames],
  );

  return { columns, indexes, constraints };
}

async function loadBackupTableRows(client, tableName, keyColumn, ids) {
  const columns = await queryRows(
    client,
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [tableName],
  );

  const columnNames = columns.map((row) => row.column_name);
  const rows =
    ids.length === 0
      ? []
      : await queryRows(
          client,
          `
            select *
            from public.${quoteIdent(tableName)}
            where ${quoteIdent(keyColumn)} = any($1::uuid[])
            order by 1
          `,
          [ids],
        );

  return {
    table_name: tableName,
    columns: columnNames,
    rows,
  };
}

function buildSchemaBackupContent({ generatedAt, collapseMapRows, schemaSnapshot, fkCounts }) {
  const sections = [];

  sections.push(`-- ${PHASE} PRE-APPLY SCHEMA SNAPSHOT`);
  sections.push(`-- Generated at: ${generatedAt}`);
  sections.push(`-- old_ids: ${collapseMapRows.length}`);
  sections.push(`-- new_ids: ${new Set(collapseMapRows.map((row) => row.new_id)).size}`);
  sections.push(`-- fk_counts: ${JSON.stringify(fkCounts)}`);

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
        sections.push(`--   ${constraint.constraint_name} [${constraint.contype}] ${constraint.constraint_def}`);
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

function buildDataBackupContent({ generatedAt, collapseMapRows, tableSnapshots }) {
  const sections = [];

  sections.push(`-- ${PHASE} PRE-APPLY DATA SNAPSHOT`);
  sections.push(`-- Generated at: ${generatedAt}`);
  sections.push(`-- old_ids: ${collapseMapRows.length}`);
  sections.push(`-- new_ids: ${new Set(collapseMapRows.map((row) => row.new_id)).size}`);
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

async function createBackupArtifacts(client, collapseMapRows, fkCounts) {
  const generatedAt = new Date().toISOString();
  const tableNames = BACKUP_TABLE_CONFIG.map((table) => table.table_name);
  const schemaSnapshot = await loadSchemaSnapshot(client, tableNames);
  const ids = [...new Set(collapseMapRows.flatMap((row) => [row.old_id, row.new_id]))];
  const tableSnapshots = [];

  for (const tableConfig of BACKUP_TABLE_CONFIG) {
    tableSnapshots.push(
      await loadBackupTableRows(client, tableConfig.table_name, tableConfig.key_column, ids),
    );
  }

  const schemaContent = buildSchemaBackupContent({
    generatedAt,
    collapseMapRows,
    schemaSnapshot,
    fkCounts,
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

async function applyCollapse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const archivedFromFanIn = await client.query(`
    update public.card_print_identity cpi
    set
      is_active = false,
      updated_at = now()
    from tmp_xy10_fanin_resolution fan_in
    where cpi.id = fan_in.identity_id
      and fan_in.resolution_action = 'archive_history'
      and cpi.is_active = true
  `);

  const archivedFromTargetConflicts = await client.query(`
    update public.card_print_identity cpi
    set
      is_active = false,
      updated_at = now()
    from tmp_xy10_target_active_identity_conflicts t
    where cpi.id = t.old_identity_id
      and cpi.is_active = true
  `);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.new_id,
      updated_at = now()
    from tmp_xy10_collapse_map m
    where cpi.card_print_id = m.old_id
  `);

  const activeIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (select distinct new_id from tmp_xy10_collapse_map)
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
    join tmp_xy10_collapse_map m
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
    join tmp_xy10_collapse_map m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_xy10_collapse_map m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadataRows = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_xy10_collapse_map m
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
    from tmp_xy10_collapse_map m
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
    using tmp_xy10_collapse_map m
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
    from tmp_xy10_collapse_map m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_xy10_collapse_map m
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
      archived_identity_rows: (archivedFromFanIn.rowCount ?? 0) + (archivedFromTargetConflicts.rowCount ?? 0),
      archived_from_fanin_rows: archivedFromFanIn.rowCount ?? 0,
      archived_from_target_conflict_rows: archivedFromTargetConflicts.rowCount ?? 0,
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
        where cpi.card_print_id in (select new_id from tmp_xy10_collapse_map)
      ),
      target_gvid_drift as (
        select count(*)::int as row_count
        from tmp_xy10_collapse_map m
        join public.card_prints cp
          on cp.id = m.new_id
        where cp.gv_id is distinct from m.new_gv_id
      ),
      route_resolvable as (
        select count(*)::int as row_count
        from public.card_prints cp
        where cp.id in (select new_id from tmp_xy10_collapse_map)
          and cp.gv_id is not null
      ),
      target_active_identity_state as (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_xy10_collapse_map)
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
          where cp.id in (select old_id from tmp_xy10_collapse_map)
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
    normalizeCount(summary?.targetAnyIdentityRowsAfter ?? summary?.target_any_identity_rows),
    EXPECTED.targetAnyIdentityRowsAfter,
    'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.targetActiveIdentityRowsAfter ?? summary?.target_active_identity_rows),
    EXPECTED.targetActiveIdentityRowsAfter,
    'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.targetInactiveIdentityRowsAfter ?? summary?.target_inactive_identity_rows),
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
    classification: 'BASE_VARIANT_COLLAPSE + ACTIVE_IDENTITY_FANIN',
    normalization_contract: {
      name_normalize_v3:
        "lowercase -> unicode apostrophe to ASCII -> normalize dash separators to spaces -> remove GX/EX punctuation variants -> collapse whitespace -> trim",
      token_normalize_v1: 'numeric base extraction; suffix routing only when a same-set canonical target exists',
    },
    fan_in_rule:
      'Only reused targets enter ACTIVE_IDENTITY_FANIN; separate target-active-identity conflicts are archived only when a non-reused canonical target already carries one active identity.',
    preconditions: null,
    fan_in_groups: null,
    target_active_identity_conflicts_before: null,
    fan_in_resolution: null,
    collapse_map_samples: null,
    fk_inventory: null,
    collision_summary: null,
    canonical_count_before: null,
    backup_artifacts: null,
    apply_operations: null,
    deleted_old_parent_rows: 0,
    post_validation: null,
    sample_before_after_rows: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `xy10_base_variant_fanin_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempCollapseSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.fan_in_groups = await loadFanInGroups(client);
    assertEqual(report.fan_in_groups.length, EXPECTED.fanInGroupCount, 'FAN_IN_GROUP_DETAIL_COUNT_DRIFT');
    for (const group of report.fan_in_groups) {
      if (group.normalization_only !== true) {
        throw new Error(`FAN_IN_GROUP_NOT_NORMALIZATION_ONLY:${group.target_card_print_id}`);
      }
    }

    report.target_active_identity_conflicts_before = await loadTargetActiveIdentityConflicts(client);
    assertEqual(
      report.target_active_identity_conflicts_before.length,
      EXPECTED.targetActiveIdentityConflictCountBefore,
      'TARGET_ACTIVE_IDENTITY_CONFLICT_ROW_COUNT_DRIFT',
    );

    report.fan_in_resolution = await buildFanInResolution(client);
    assertFanInResolution(report.fan_in_resolution);

    report.collapse_map_samples = await loadCollapseMapSamples(client);
    assertEqual(report.collapse_map_samples.length, 3, 'COLLAPSE_MAP_SAMPLE_COUNT_DRIFT');

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

    const collapseMapRows = await queryRows(
      client,
      `
        select *
        from tmp_xy10_collapse_map
        order by seq
      `,
    );

    report.backup_artifacts = await createBackupArtifacts(client, collapseMapRows, report.fk_inventory);
    report.apply_operations = await applyCollapse(client);

    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using tmp_xy10_collapse_map m
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
