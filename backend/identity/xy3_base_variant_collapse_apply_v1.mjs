import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'XY3_BASE_VARIANT_COLLAPSE_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'xy3';
const TARGET_SET_CODE = 'xy3';
const CLASSIFICATION = 'BASE_VARIANT_COLLAPSE';
const BLOCKED_OLD_IDS = ['696cf830-c004-4fcf-9284-00e4e39eaf25'];
const BLOCKED_ROW_EXPECTED = {
  old_name: 'M Lucario EX',
  candidate_target_gv_ids: ['GV-PK-FFI-55', 'GV-PK-FFI-55A'],
};

const EXPECTED = {
  totalUnresolvedCount: 13,
  sourceCount: 12,
  blockedCount: 1,
  unclassifiedCount: 0,
  canonicalTargetCount: 114,
  exactMatchCount: 0,
  sameTokenDifferentNameCount: 12,
  exactUnmatchedCount: 13,
  normalizedMapCount: 12,
  normalizedAmbiguousCount: 0,
  normalizedInvalidCount: 0,
  baseReusedTargetCount: 0,
  distinctOldCount: 12,
  distinctNewCount: 12,
  normalizedNameCount: 12,
  suffixVariantCount: 0,
  fanInGroupCount: 0,
  archivedIdentityCount: 0,
  targetIdentityRowsBefore: 0,
  targetActiveIdentityRowsBefore: 0,
  oldTraitRowCount: 12,
  oldPrintingRowCount: 36,
  oldExternalMappingRowCount: 12,
  oldVaultItemRowCount: 0,
  traitTargetKeyConflictCount: 0,
  traitMergeableMetadataOnlyCount: 0,
  traitConflictingNonIdenticalCount: 0,
  printingFinishConflictCount: 36,
  printingMergeableMetadataOnlyCount: 36,
  printingConflictingNonIdenticalCount: 0,
  externalMappingConflictCount: 0,
  blockedIdentityRows: 1,
  blockedTraitRows: 1,
  blockedPrintingRows: 3,
  blockedExternalRows: 1,
  blockedVaultRows: 0,
  updatedIdentityRows: 12,
  mergedTraitMetadataRows: 0,
  insertedTraits: 12,
  deletedOldTraits: 12,
  mergedPrintingMetadataRows: 36,
  movedUniquePrintings: 0,
  deletedRedundantPrintings: 36,
  updatedExternalMappings: 12,
  updatedVaultItems: 0,
  remainingUnresolvedRows: 1,
  remainingBlockedRows: 1,
  remainingNonBlockedUnresolvedRows: 0,
  targetAnyIdentityRowsAfter: 12,
  targetActiveIdentityRowsAfter: 12,
  targetInactiveIdentityRowsAfter: 0,
  routeResolvableTargetCount: 12,
};

const SUPPORTED_REFERENCE_TABLES = new Set([
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'vault_items.card_id',
]);

const TMP = {
  unresolved: `tmp_${SOURCE_SET_CODE_IDENTITY}_base_unresolved`,
  canonical: `tmp_${SOURCE_SET_CODE_IDENTITY}_base_canonical`,
  exactAudit: `tmp_${SOURCE_SET_CODE_IDENTITY}_base_exact_audit`,
  matchRows: `tmp_${SOURCE_SET_CODE_IDENTITY}_base_match_rows`,
  metrics: `tmp_${SOURCE_SET_CODE_IDENTITY}_base_metrics`,
  classification: `tmp_${SOURCE_SET_CODE_IDENTITY}_base_classification`,
  collapseMap: `tmp_${SOURCE_SET_CODE_IDENTITY}_base_collapse_map`,
};

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
    drop table if exists ${TMP.unresolved};
    drop table if exists ${TMP.canonical};
    drop table if exists ${TMP.exactAudit};
    drop table if exists ${TMP.matchRows};
    drop table if exists ${TMP.metrics};
    drop table if exists ${TMP.classification};
    drop table if exists ${TMP.collapseMap};

    create temp table ${TMP.unresolved} on commit drop as
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

    create temp table ${TMP.canonical} on commit drop as
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

    create temp table ${TMP.exactAudit} on commit drop as
    select
      u.old_id,
      count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
      count(c.new_id) filter (
        where c.new_number = u.source_printed_number
          and c.target_exact_name_key <> u.source_exact_name_key
      )::int as same_token_different_name_count
    from ${TMP.unresolved} u
    left join ${TMP.canonical} c
      on c.new_number = u.source_printed_number
    group by u.old_id, u.source_exact_name_key, u.source_printed_number;

    create temp table ${TMP.matchRows} on commit drop as
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
    from ${TMP.unresolved} u
    join ${TMP.canonical} c
      on c.new_number_plain = u.source_base_number_plain
     and c.target_name_normalized_v3 = u.source_name_normalized_v3;

    create temp table ${TMP.metrics} on commit drop as
    select
      u.old_id,
      ea.exact_match_count,
      ea.same_token_different_name_count,
      count(distinct mr.new_id)::int as base_match_count
    from ${TMP.unresolved} u
    join ${TMP.exactAudit} ea
      on ea.old_id = u.old_id
    left join ${TMP.matchRows} mr
      on mr.old_id = u.old_id
    group by u.old_id, ea.exact_match_count, ea.same_token_different_name_count;

    create temp table ${TMP.classification} on commit drop as
    select
      u.old_id,
      u.old_name,
      u.source_printed_number,
      u.source_name_normalized_v3,
      u.source_base_number_plain,
      m.exact_match_count,
      m.same_token_different_name_count,
      m.base_match_count,
      case
        when u.old_id = '${BLOCKED_OLD_IDS[0]}' then 'BLOCKED'
        when m.base_match_count = 1 then 'APPLY'
        else 'UNCLASSIFIED'
      end as row_scope
    from ${TMP.unresolved} u
    join ${TMP.metrics} m
      on m.old_id = u.old_id;

    create temp table ${TMP.collapseMap} on commit drop as
    select
      row_number() over (
        order by
          coalesce(mr.source_base_number_plain, '0')::int,
          mr.source_printed_number,
          mr.old_id
      )::int as seq,
      mr.*
    from ${TMP.matchRows} mr
    join ${TMP.classification} c
      on c.old_id = mr.old_id
    where c.row_scope = 'APPLY';
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with blocked_rows as (
        select array_agg(old_id::text order by old_id) as blocked_old_ids
        from ${TMP.classification}
        where row_scope = 'BLOCKED'
      ),
      unclassified_rows as (
        select array_agg(old_id::text order by old_id) as unclassified_old_ids
        from ${TMP.classification}
        where row_scope = 'UNCLASSIFIED'
      ),
      reused_targets as (
        select new_id
        from ${TMP.collapseMap}
        group by new_id
        having count(*) > 1
      )
      select
        (select count(*)::int from ${TMP.unresolved}) as total_unresolved_count,
        (
          select count(*)::int
          from ${TMP.classification}
          where row_scope = 'APPLY'
        ) as source_count,
        (
          select count(*)::int
          from ${TMP.classification}
          where row_scope = 'BLOCKED'
        ) as blocked_count,
        (
          select count(*)::int
          from ${TMP.classification}
          where row_scope = 'UNCLASSIFIED'
        ) as unclassified_count,
        (select count(*)::int from ${TMP.canonical}) as canonical_target_count,
        (
          select count(*)::int
          from ${TMP.metrics}
          where exact_match_count = 1
        ) as exact_match_count,
        (
          select count(*)::int
          from ${TMP.classification}
          where row_scope = 'APPLY'
            and same_token_different_name_count > 0
        ) as same_token_different_name_count,
        (
          select count(*)::int
          from ${TMP.metrics}
          where exact_match_count = 0
        ) as exact_unmatched_count,
        (select count(*)::int from ${TMP.collapseMap}) as normalized_map_count,
        (
          select count(*)::int
          from ${TMP.metrics} m
          join ${TMP.classification} c
            on c.old_id = m.old_id
          where c.row_scope = 'APPLY'
            and m.base_match_count > 1
        ) as normalized_ambiguous_count,
        (
          select count(*)::int
          from ${TMP.metrics} m
          join ${TMP.classification} c
            on c.old_id = m.old_id
          where c.row_scope = 'APPLY'
            and m.base_match_count = 0
        ) as normalized_invalid_count,
        (select count(*)::int from reused_targets) as base_reused_target_count,
        (select count(distinct old_id)::int from ${TMP.collapseMap}) as distinct_old_count,
        (select count(distinct new_id)::int from ${TMP.collapseMap}) as distinct_new_count,
        (
          select count(*)::int
          from ${TMP.collapseMap}
          where match_category = 'name_normalize_v3'
        ) as normalized_name_count,
        (
          select count(*)::int
          from ${TMP.collapseMap}
          where match_category = 'suffix_variant'
        ) as suffix_variant_count,
        (
          select count(*)::int
          from public.card_print_identity cpi
          where cpi.card_print_id in (select distinct new_id from ${TMP.collapseMap})
        ) as target_identity_rows_before,
        (
          select count(*)::int
          from public.card_print_identity cpi
          where cpi.is_active = true
            and cpi.card_print_id in (select distinct new_id from ${TMP.collapseMap})
        ) as target_active_identity_rows_before,
        (select blocked_old_ids from blocked_rows) as blocked_old_ids,
        (select unclassified_old_ids from unclassified_rows) as unclassified_old_ids
    `,
  );
}

function assertPreconditions(summary) {
  assertEqual(normalizeCount(summary?.total_unresolved_count), EXPECTED.totalUnresolvedCount, 'TOTAL_UNRESOLVED_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.source_count), EXPECTED.sourceCount, 'SOURCE_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.blocked_count), EXPECTED.blockedCount, 'BLOCKED_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.unclassified_count), EXPECTED.unclassifiedCount, 'UNCLASSIFIED_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.canonical_target_count), EXPECTED.canonicalTargetCount, 'CANONICAL_TARGET_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.exact_match_count), EXPECTED.exactMatchCount, 'EXACT_MATCH_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.same_token_different_name_count), EXPECTED.sameTokenDifferentNameCount, 'SAME_TOKEN_DIFFERENT_NAME_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.exact_unmatched_count), EXPECTED.exactUnmatchedCount, 'EXACT_UNMATCHED_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.normalized_map_count), EXPECTED.normalizedMapCount, 'NORMALIZED_MAP_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.normalized_ambiguous_count), EXPECTED.normalizedAmbiguousCount, 'NORMALIZED_AMBIGUOUS_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.normalized_invalid_count), EXPECTED.normalizedInvalidCount, 'NORMALIZED_INVALID_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.base_reused_target_count), EXPECTED.baseReusedTargetCount, 'BASE_REUSED_TARGET_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.distinct_old_count), EXPECTED.distinctOldCount, 'DISTINCT_OLD_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.distinct_new_count), EXPECTED.distinctNewCount, 'DISTINCT_NEW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.normalized_name_count), EXPECTED.normalizedNameCount, 'NORMALIZED_NAME_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.suffix_variant_count), EXPECTED.suffixVariantCount, 'SUFFIX_VARIANT_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.target_identity_rows_before), EXPECTED.targetIdentityRowsBefore, 'TARGET_IDENTITY_ROWS_BEFORE_DRIFT');
  assertEqual(normalizeCount(summary?.target_active_identity_rows_before), EXPECTED.targetActiveIdentityRowsBefore, 'TARGET_ACTIVE_IDENTITY_ROWS_BEFORE_DRIFT');
  assertIdSetEqual(summary?.blocked_old_ids ?? [], BLOCKED_OLD_IDS, 'BLOCKED_OLD_IDS_DRIFT');
  assertIdSetEqual(summary?.unclassified_old_ids ?? [], [], 'UNCLASSIFIED_OLD_IDS_DRIFT');
}

async function loadBlockedCandidateTargets(client) {
  return queryRows(
    client,
    `
      select
        new_id,
        new_name,
        new_number,
        new_gv_id
      from ${TMP.matchRows}
      where old_id = $1
      order by new_number, new_id
    `,
    [BLOCKED_OLD_IDS[0]],
  );
}

function assertBlockedCandidateTargets(rows) {
  assertEqual(rows.length, 2, 'BLOCKED_CANDIDATE_COUNT_DRIFT');
  assertIdSetEqual(
    rows.map((row) => row.new_gv_id),
    BLOCKED_ROW_EXPECTED.candidate_target_gv_ids,
    'BLOCKED_CANDIDATE_GVIDS_DRIFT',
  );
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
        array_agg(old_id order by old_id) as source_old_ids
      from ${TMP.collapseMap}
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
  assertEqual(normalizeCount(summary?.fan_in_group_count), EXPECTED.fanInGroupCount, 'FAN_IN_GROUP_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.archived_identity_count), EXPECTED.archivedIdentityCount, 'ARCHIVED_IDENTITY_COUNT_DRIFT');
}

async function loadCollapseMapSamples(client) {
  return queryRows(
    client,
    `
      with positions as (
        select 1::int as seq
        union
        select ((count(*) + 1) / 2)::int as seq
        from ${TMP.collapseMap}
        union
        select count(*)::int as seq
        from ${TMP.collapseMap}
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
      from ${TMP.collapseMap} m
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
          select old_id from ${TMP.collapseMap}
        )
      `,
    );

    counts[`${tableName}.${columnName}`] = normalizeCount(row?.row_count);
  }

  return counts;
}

async function loadBlockedRowSnapshot(client) {
  return queryOne(
    client,
    `
      select
        cp.id as old_id,
        cp.name as old_name,
        cp.number as old_number,
        cp.number_plain as old_number_plain,
        cp.gv_id as old_gv_id,
        count(cpi.id)::int as identity_rows,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows,
        count(*) filter (where cpi.is_active = false)::int as inactive_identity_rows,
        (
          select count(*)::int
          from public.card_print_traits t
          where t.card_print_id = cp.id
        ) as trait_rows,
        (
          select count(*)::int
          from public.card_printings p
          where p.card_print_id = cp.id
        ) as printing_rows,
        (
          select count(*)::int
          from public.external_mappings em
          where em.card_print_id = cp.id
        ) as external_rows,
        (
          select count(*)::int
          from public.vault_items vi
          where vi.card_id = cp.id
        ) as vault_rows
      from public.card_prints cp
      left join public.card_print_identity cpi
        on cpi.card_print_id = cp.id
      where cp.id = $1
      group by cp.id, cp.name, cp.number, cp.number_plain, cp.gv_id
    `,
    [BLOCKED_OLD_IDS[0]],
  );
}

function assertBlockedRowSnapshot(snapshot) {
  if (!snapshot) {
    throw new Error(`BLOCKED_ROW_MISSING:${BLOCKED_OLD_IDS[0]}`);
  }

  assertEqual(snapshot.old_name, BLOCKED_ROW_EXPECTED.old_name, 'BLOCKED_ROW_NAME_DRIFT');
  assertEqual(normalizeCount(snapshot.identity_rows), EXPECTED.blockedIdentityRows, 'BLOCKED_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.trait_rows), EXPECTED.blockedTraitRows, 'BLOCKED_TRAIT_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.printing_rows), EXPECTED.blockedPrintingRows, 'BLOCKED_PRINTING_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.external_rows), EXPECTED.blockedExternalRows, 'BLOCKED_EXTERNAL_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.vault_rows), EXPECTED.blockedVaultRows, 'BLOCKED_VAULT_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.active_identity_rows), 1, 'BLOCKED_ACTIVE_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.inactive_identity_rows), 0, 'BLOCKED_INACTIVE_IDENTITY_ROWS_DRIFT');
  if (snapshot.old_gv_id !== null) {
    throw new Error(`BLOCKED_ROW_GVID_CHANGED:${snapshot.old_gv_id}`);
  }
}

function assertBlockedRowUntouched(beforeSnapshot, afterSnapshot) {
  const keys = [
    'old_id',
    'old_name',
    'old_number',
    'old_number_plain',
    'old_gv_id',
    'identity_rows',
    'active_identity_rows',
    'inactive_identity_rows',
    'trait_rows',
    'printing_rows',
    'external_rows',
    'vault_rows',
  ];

  for (const key of keys) {
    const beforeValue = beforeSnapshot?.[key] ?? null;
    const afterValue = afterSnapshot?.[key] ?? null;
    if (String(beforeValue) !== String(afterValue)) {
      throw new Error(`BLOCKED_ROW_MUTATED:${key}:${beforeValue}:${afterValue}`);
    }
  }
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
        join ${TMP.collapseMap} m
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
        join ${TMP.collapseMap} m
          on m.old_id = old_p.card_print_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from public.external_mappings old_em
        join ${TMP.collapseMap} m
          on m.old_id = old_em.card_print_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      )
      select
        (
          select count(*)::int
          from public.card_print_traits t
          where t.card_print_id in (select old_id from ${TMP.collapseMap})
        ) as old_trait_row_count,
        (
          select count(*)::int
          from public.card_printings p
          where p.card_print_id in (select old_id from ${TMP.collapseMap})
        ) as old_printing_row_count,
        (
          select count(*)::int
          from public.external_mappings em
          where em.card_print_id in (select old_id from ${TMP.collapseMap})
        ) as old_external_mapping_row_count,
        (
          select count(*)::int
          from public.vault_items vi
          where vi.card_id in (select old_id from ${TMP.collapseMap})
        ) as old_vault_item_row_count,
        (
          select count(*)::int
          from public.card_print_identity cpi
          where cpi.card_print_id in (select distinct new_id from ${TMP.collapseMap})
        ) as target_identity_row_count,
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
  assertEqual(normalizeCount(summary?.old_trait_row_count), EXPECTED.oldTraitRowCount, 'OLD_TRAIT_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.old_printing_row_count), EXPECTED.oldPrintingRowCount, 'OLD_PRINTING_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.old_external_mapping_row_count), EXPECTED.oldExternalMappingRowCount, 'OLD_EXTERNAL_MAPPING_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.old_vault_item_row_count), EXPECTED.oldVaultItemRowCount, 'OLD_VAULT_ITEM_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.target_identity_row_count), EXPECTED.targetIdentityRowsBefore, 'TARGET_IDENTITY_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.trait_target_key_conflict_count), EXPECTED.traitTargetKeyConflictCount, 'TRAIT_TARGET_KEY_CONFLICT_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.trait_mergeable_metadata_only_count), EXPECTED.traitMergeableMetadataOnlyCount, 'TRAIT_MERGEABLE_METADATA_ONLY_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.trait_conflicting_non_identical_count), EXPECTED.traitConflictingNonIdenticalCount, 'TRAIT_CONFLICTING_NON_IDENTICAL_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.printing_finish_conflict_count), EXPECTED.printingFinishConflictCount, 'PRINTING_FINISH_CONFLICT_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.printing_mergeable_metadata_only_count), EXPECTED.printingMergeableMetadataOnlyCount, 'PRINTING_MERGEABLE_METADATA_ONLY_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.printing_conflicting_non_identical_count), EXPECTED.printingConflictingNonIdenticalCount, 'PRINTING_CONFLICTING_NON_IDENTICAL_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.external_mapping_conflict_count), EXPECTED.externalMappingConflictCount, 'EXTERNAL_MAPPING_CONFLICT_COUNT_DRIFT');
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
      where cpi.card_print_id in (
        select distinct new_id from ${TMP.collapseMap}
      )
      group by cpi.card_print_id
      having count(*) filter (where cpi.is_active = true) <> 1
    `,
  );

  if (activeIdentityConflicts.length > 0) {
    throw new Error(`ACTIVE_IDENTITY_CONFLICT_AFTER_REPOINT:${JSON.stringify(activeIdentityConflicts)}`);
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

function assertApplyOperations(applyResult) {
  const operations = applyResult?.operations ?? {};

  assertEqual(normalizeCount(operations.archived_identity_rows), 0, 'ARCHIVED_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(operations.updated_identity_rows), EXPECTED.updatedIdentityRows, 'UPDATED_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(operations.merged_trait_metadata_rows), EXPECTED.mergedTraitMetadataRows, 'MERGED_TRAIT_METADATA_ROWS_DRIFT');
  assertEqual(normalizeCount(operations.inserted_traits), EXPECTED.insertedTraits, 'INSERTED_TRAITS_DRIFT');
  assertEqual(normalizeCount(operations.deleted_old_traits), EXPECTED.deletedOldTraits, 'DELETED_OLD_TRAITS_DRIFT');
  assertEqual(normalizeCount(operations.merged_printing_metadata_rows), EXPECTED.mergedPrintingMetadataRows, 'MERGED_PRINTING_METADATA_ROWS_DRIFT');
  assertEqual(normalizeCount(operations.moved_unique_printings), EXPECTED.movedUniquePrintings, 'MOVED_UNIQUE_PRINTINGS_DRIFT');
  assertEqual(normalizeCount(operations.deleted_redundant_printings), EXPECTED.deletedRedundantPrintings, 'DELETED_REDUNDANT_PRINTINGS_DRIFT');
  assertEqual(normalizeCount(operations.updated_external_mappings), EXPECTED.updatedExternalMappings, 'UPDATED_EXTERNAL_MAPPINGS_DRIFT');
  assertEqual(normalizeCount(operations.updated_vault_items), EXPECTED.updatedVaultItems, 'UPDATED_VAULT_ITEMS_DRIFT');
}

async function loadPostValidation(client, fkInventory) {
  const remainingOldReferences = await loadFkCounts(
    client,
    fkInventory,
    `select old_id from ${TMP.collapseMap}`,
  );

  const summary = await queryOne(
    client,
    `
      with unresolved_after as (
        select cp.id as old_id
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
        where cpi.card_print_id in (select new_id from ${TMP.collapseMap})
      ),
      target_gvid_drift as (
        select count(*)::int as row_count
        from ${TMP.collapseMap} m
        join public.card_prints cp
          on cp.id = m.new_id
        where cp.gv_id is distinct from m.new_gv_id
      ),
      route_resolvable as (
        select count(*)::int as row_count
        from public.card_prints cp
        where cp.id in (select new_id from ${TMP.collapseMap})
          and cp.gv_id is not null
      ),
      target_active_identity_state as (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from ${TMP.collapseMap})
        group by cpi.card_print_id
      )
      select
        (select count(*)::int from unresolved_after) as remaining_unresolved_rows,
        (
          select count(*)::int
          from unresolved_after
          where old_id = any($3::uuid[])
        ) as remaining_blocked_rows,
        (
          select count(*)::int
          from unresolved_after
          where old_id <> all($3::uuid[])
        ) as remaining_non_blocked_unresolved_rows,
        (
          select array_agg(old_id::text order by old_id)
          from unresolved_after
          where old_id = any($3::uuid[])
        ) as remaining_blocked_old_ids,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.set_code = $4
            and cp.gv_id is not null
        ) as canonical_target_count,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from ${TMP.collapseMap})
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
    [TARGET_IDENTITY_DOMAIN, SOURCE_SET_CODE_IDENTITY, BLOCKED_OLD_IDS, TARGET_SET_CODE],
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
  assertEqual(normalizeCount(postValidation.summary?.remaining_unresolved_rows), EXPECTED.remainingUnresolvedRows, 'REMAINING_UNRESOLVED_ROWS_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.remaining_blocked_rows), EXPECTED.remainingBlockedRows, 'REMAINING_BLOCKED_ROWS_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.remaining_non_blocked_unresolved_rows), EXPECTED.remainingNonBlockedUnresolvedRows, 'REMAINING_NON_BLOCKED_UNRESOLVED_ROWS_DRIFT');
  assertIdSetEqual(postValidation.summary?.remaining_blocked_old_ids ?? [], BLOCKED_OLD_IDS, 'REMAINING_BLOCKED_OLD_IDS_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.canonical_target_count), EXPECTED.canonicalTargetCount, 'CANONICAL_TARGET_COUNT_AFTER_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.target_any_identity_rows), EXPECTED.targetAnyIdentityRowsAfter, 'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.target_active_identity_rows), EXPECTED.targetActiveIdentityRowsAfter, 'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.target_inactive_identity_rows), EXPECTED.targetInactiveIdentityRowsAfter, 'TARGET_INACTIVE_IDENTITY_ROWS_AFTER_DRIFT');
  assertZero(postValidation.summary?.target_gvid_drift_count, 'TARGET_GVID_DRIFT_COUNT');
  assertEqual(normalizeCount(postValidation.summary?.route_resolvable_target_count), EXPECTED.routeResolvableTargetCount, 'ROUTE_RESOLVABLE_TARGET_COUNT_DRIFT');
  assertZero(postValidation.summary?.target_active_identity_conflict_count, 'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT');
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
    blocked_candidate_targets: null,
    fan_in_summary: null,
    collapse_map_samples: null,
    fk_inventory: null,
    blocked_row_snapshot_before: null,
    blocked_row_snapshot_after: null,
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
    application_name: `xy3_base_variant_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempBaseVariantSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.blocked_candidate_targets = await loadBlockedCandidateTargets(client);
    assertBlockedCandidateTargets(report.blocked_candidate_targets);

    report.fan_in_summary = await loadFanInSummary(client);
    assertFanInSummary(report.fan_in_summary);

    report.collapse_map_samples = await loadCollapseMapSamples(client);
    if (report.collapse_map_samples.length !== 3) {
      throw new Error(`COLLAPSE_MAP_SAMPLE_COUNT_DRIFT:${report.collapse_map_samples.length}:3`);
    }

    const fkInventory = await loadCardPrintFkInventory(client);
    const fkCounts = await loadFkCounts(client, fkInventory, `select old_id from ${TMP.collapseMap}`);
    assertNoUnexpectedReferencedTables(fkCounts);
    report.fk_inventory = await loadSupportedFkCounts(client);

    report.blocked_row_snapshot_before = await loadBlockedRowSnapshot(client);
    assertBlockedRowSnapshot(report.blocked_row_snapshot_before);

    report.collision_summary = await loadCollisionSummary(client);
    assertCollisionSummary(report.collision_summary);

    report.canonical_count_before = await loadCanonicalCount(client);
    assertEqual(normalizeCount(report.canonical_count_before?.canonical_target_count), EXPECTED.canonicalTargetCount, 'CANONICAL_TARGET_COUNT_BEFORE_DRIFT');

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
      using ${TMP.collapseMap} m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;

    report.post_validation = await loadPostValidation(client, fkInventory);
    assertPostValidation(report.post_validation, report.deleted_old_parent_rows);

    report.blocked_row_snapshot_after = await loadBlockedRowSnapshot(client);
    assertBlockedRowSnapshot(report.blocked_row_snapshot_after);
    assertBlockedRowUntouched(report.blocked_row_snapshot_before, report.blocked_row_snapshot_after);

    report.sample_before_after_rows = await loadSampleAfterRows(client, report.collapse_map_samples);
    for (const row of report.sample_before_after_rows) {
      if (row.old_parent_still_exists !== false) {
        throw new Error(`OLD_PARENT_STILL_EXISTS:${row.old_id}`);
      }
      if (row.target_gv_id_after !== row.new_gv_id) {
        throw new Error(`TARGET_GVID_DRIFT:${row.target_gv_id_after}:${row.new_gv_id}`);
      }
      if (normalizeCount(row.active_identity_row_count_on_new_parent) !== 1) {
        throw new Error(`TARGET_ACTIVE_IDENTITY_COUNT_DRIFT:${row.new_id}:${row.active_identity_row_count_on_new_parent}`);
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
