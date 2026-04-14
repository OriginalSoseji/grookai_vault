import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'XY6_EXACT_TOKEN_PRECEDENCE_COLLAPSE_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'xy6';
const TARGET_SET_CODE = 'xy6';
const CLASSIFICATION = 'EXACT_TOKEN_PRECEDENCE_COLLAPSE';
const CONTRACT_NAME = 'EXACT_TOKEN_PRECEDENCE_OVER_SUFFIX_VARIANT_V1';

const SOURCE_OLD_ID = 'dc8c3dce-bede-47d2-ac8a-095bb633a3ba';
const EXACT_TARGET_NEW_ID = '8ad97482-9c74-4ae2-b08f-ea15fa92077e';
const SUFFIX_TARGET_ID = '420248aa-0279-4af7-889f-825602d0ae87';
const CHOSEN_TARGET_GV_ID = 'GV-PK-ROS-77';
const SUFFIX_TARGET_GV_ID = 'GV-PK-ROS-77A';

const EXPECTED = {
  totalUnresolvedCount: 1,
  sourceCount: 1,
  candidateCount: 2,
  exactTokenCandidateCount: 1,
  suffixCandidateCount: 1,
  additionalCandidateCount: 0,
  unmatchedCount: 0,
  reusedTargetCount: 0,
  chosenTargetCount: 1,
  canonicalTargetCount: 112,
  targetIdentityRowsBefore: 0,
  targetActiveIdentityRowsBefore: 0,
  oldTraitRowCount: 1,
  oldPrintingRowCount: 3,
  oldExternalMappingRowCount: 1,
  oldVaultItemRowCount: 0,
  traitTargetKeyConflictCount: 0,
  traitMergeableMetadataOnlyCount: 0,
  traitConflictingNonIdenticalCount: 0,
  printingFinishConflictCount: 3,
  printingMergeableMetadataOnlyCount: 3,
  printingConflictingNonIdenticalCount: 0,
  externalMappingConflictCount: 0,
  updatedIdentityRows: 1,
  mergedTraitMetadataRows: 0,
  insertedTraits: 1,
  deletedOldTraits: 1,
  mergedPrintingMetadataRows: 3,
  movedUniquePrintings: 0,
  deletedRedundantPrintings: 3,
  updatedExternalMappings: 1,
  updatedVaultItems: 0,
  remainingUnresolvedRows: 0,
  targetAnyIdentityRowsAfter: 1,
  targetActiveIdentityRowsAfter: 1,
  targetInactiveIdentityRowsAfter: 0,
  routeResolvableTargetCount: 1,
  exactTargetPrintingRowsBefore: 3,
  exactTargetExternalRowsBefore: 2,
  suffixTargetIdentityRowsBefore: 1,
  suffixTargetActiveIdentityRowsBefore: 1,
  suffixTargetInactiveIdentityRowsBefore: 0,
  suffixTargetTraitRowsBefore: 1,
  suffixTargetPrintingRowsBefore: 3,
  suffixTargetExternalRowsBefore: 1,
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

async function buildTempExactTokenSurface(client) {
  await client.query(`
    drop table if exists tmp_xy6_exact_source;
    drop table if exists tmp_xy6_exact_candidates;
    drop table if exists tmp_xy6_exact_metrics;
    drop table if exists tmp_xy6_exact_collapse_map;

    create temp table tmp_xy6_exact_source on commit drop as
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.number as old_parent_number,
      cp.number_plain as old_parent_number_plain,
      cp.variant_key as old_variant_key,
      cp.gv_id as old_gv_id,
      cpi.id as old_identity_id,
      cpi.set_code_identity as source_set_code_identity,
      coalesce(nullif(cp.set_code, ''), cpi.set_code_identity) as effective_source_set_code,
      cpi.printed_number as source_printed_number,
      nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as source_base_number_plain,
      nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix,
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
      ) as source_name_normalized_v3
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cp.id = '${SOURCE_OLD_ID}'
      and cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${SOURCE_SET_CODE_IDENTITY}'
      and cpi.is_active = true
      and cp.gv_id is null;

    create temp table tmp_xy6_exact_candidates on commit drop as
    select
      s.old_id,
      s.old_name,
      s.old_parent_number,
      s.old_parent_number_plain,
      s.old_variant_key,
      s.effective_source_set_code,
      s.source_printed_number,
      s.source_base_number_plain,
      s.source_number_suffix,
      s.source_name_normalized_v3,
      cp.id as new_id,
      cp.name as new_name,
      cp.number as new_number,
      cp.number_plain as new_number_plain,
      cp.variant_key as new_variant_key,
      cp.gv_id as new_gv_id,
      case
        when cp.number = s.source_printed_number then 'exact_token'
        when cp.number ~ ('^' || s.source_base_number_plain || '[A-Za-z]+$') then 'suffix'
        else 'other'
      end as match_type,
      case
        when cp.number = s.source_printed_number then 1
        when cp.number ~ ('^' || s.source_base_number_plain || '[A-Za-z]+$') then 2
        else 99
      end as precedence_rank
    from tmp_xy6_exact_source s
    join public.card_prints cp
      on cp.set_code = '${TARGET_SET_CODE}'
     and cp.gv_id is not null
     and cp.number_plain = s.source_base_number_plain
     and btrim(
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
        ) = s.source_name_normalized_v3;

    create temp table tmp_xy6_exact_metrics on commit drop as
    select
      s.old_id,
      count(c.new_id)::int as candidate_count,
      count(*) filter (where c.match_type = 'exact_token')::int as exact_token_candidate_count,
      count(*) filter (where c.match_type = 'suffix')::int as suffix_candidate_count,
      count(*) filter (where c.match_type not in ('exact_token', 'suffix'))::int as additional_candidate_count
    from tmp_xy6_exact_source s
    left join tmp_xy6_exact_candidates c
      on c.old_id = s.old_id
    group by s.old_id;

    create temp table tmp_xy6_exact_collapse_map on commit drop as
    select
      1::int as seq,
      s.old_id,
      s.old_name,
      s.old_parent_number,
      s.old_parent_number_plain,
      s.old_variant_key,
      s.effective_source_set_code as old_set_code,
      s.source_printed_number,
      s.source_base_number_plain as normalized_token,
      s.source_name_normalized_v3 as normalized_name,
      c.new_id,
      c.new_name,
      c.new_number,
      c.new_number_plain,
      c.new_variant_key,
      c.new_gv_id
    from tmp_xy6_exact_source s
    join tmp_xy6_exact_candidates c
      on c.old_id = s.old_id
     and c.match_type = 'exact_token';

    create unique index tmp_xy6_exact_collapse_map_old_uidx
      on tmp_xy6_exact_collapse_map (old_id);

    create unique index tmp_xy6_exact_collapse_map_new_uidx
      on tmp_xy6_exact_collapse_map (new_id);
  `);
}

async function loadSourceSurface(client) {
  return queryOne(
    client,
    `
      select
        old_id,
        old_name,
        effective_source_set_code,
        coalesce(old_parent_number_plain, source_base_number_plain) as effective_number_plain,
        old_variant_key,
        source_printed_number,
        source_base_number_plain,
        source_number_suffix
      from tmp_xy6_exact_source
    `,
  );
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with reused_targets as (
        select new_id
        from tmp_xy6_exact_collapse_map
        group by new_id
        having count(*) > 1
      )
      select
        (
          select count(*)::int
          from public.card_print_identity cpi
          join public.card_prints cp
            on cp.id = cpi.card_print_id
          where cpi.identity_domain = $1
            and cpi.set_code_identity = $2
            and cpi.is_active = true
            and cp.gv_id is null
        ) as total_unresolved_count,
        (select count(*)::int from tmp_xy6_exact_source) as source_count,
        (select count(*)::int from tmp_xy6_exact_candidates) as candidate_count,
        (select count(*)::int from tmp_xy6_exact_metrics where candidate_count = 0) as unmatched_count,
        (select count(*)::int from reused_targets) as reused_target_count,
        (select count(*)::int from tmp_xy6_exact_metrics where exact_token_candidate_count = 1) as exact_token_candidate_count,
        (select count(*)::int from tmp_xy6_exact_metrics where suffix_candidate_count = 1) as suffix_candidate_count,
        (select count(*)::int from tmp_xy6_exact_metrics where additional_candidate_count > 0) as additional_candidate_count,
        (select count(*)::int from tmp_xy6_exact_collapse_map) as chosen_target_count,
        (
          select count(*)::int
          from public.card_prints
          where set_code = $3
            and gv_id is not null
        ) as canonical_target_count,
        (
          select count(*)::int
          from public.card_print_identity
          where card_print_id in (select distinct new_id from tmp_xy6_exact_collapse_map)
        ) as target_identity_rows_before,
        (
          select count(*)::int
          from public.card_print_identity
          where is_active = true
            and card_print_id in (select distinct new_id from tmp_xy6_exact_collapse_map)
        ) as target_active_identity_rows_before,
        (
          select array_agg(old_id::text order by old_id)
          from tmp_xy6_exact_source
        ) as source_old_ids,
        (
          select array_agg(distinct effective_source_set_code order by effective_source_set_code)
          from tmp_xy6_exact_source
        ) as effective_source_set_codes,
        (
          select array_agg(new_id::text order by new_id)
          from tmp_xy6_exact_candidates
        ) as candidate_new_ids,
        (
          select array_agg(new_id::text order by new_id)
          from tmp_xy6_exact_candidates
          where match_type = 'exact_token'
        ) as exact_target_new_ids,
        (
          select array_agg(new_id::text order by new_id)
          from tmp_xy6_exact_candidates
          where match_type = 'suffix'
        ) as suffix_target_new_ids,
        (
          select array_agg(new_id::text order by new_id)
          from tmp_xy6_exact_collapse_map
        ) as chosen_target_new_ids
    `,
    [TARGET_IDENTITY_DOMAIN, SOURCE_SET_CODE_IDENTITY, TARGET_SET_CODE],
  );
}

function assertSourceSurface(source) {
  if (!source) {
    throw new Error(`SOURCE_SURFACE_MISSING:${SOURCE_OLD_ID}`);
  }
  if (source.old_id !== SOURCE_OLD_ID) {
    throw new Error(`SOURCE_ID_DRIFT:${source.old_id}:${SOURCE_OLD_ID}`);
  }
  if (source.old_name !== 'Shaymin EX') {
    throw new Error(`SOURCE_NAME_DRIFT:${source.old_name}`);
  }
  if (source.effective_source_set_code !== TARGET_SET_CODE) {
    throw new Error(`SOURCE_SET_SCOPE_DRIFT:${source.effective_source_set_code}:${TARGET_SET_CODE}`);
  }
  if (String(source.effective_number_plain) !== '77') {
    throw new Error(`SOURCE_NUMBER_PLAIN_DRIFT:${source.effective_number_plain}:77`);
  }
  if (source.source_printed_number !== '77') {
    throw new Error(`SOURCE_PRINTED_TOKEN_DRIFT:${source.source_printed_number}:77`);
  }
  if (source.source_number_suffix !== null) {
    throw new Error(`SOURCE_SUFFIX_DRIFT:${source.source_number_suffix}`);
  }
}

function assertPreconditions(summary) {
  assertEqual(
    normalizeCount(summary?.total_unresolved_count),
    EXPECTED.totalUnresolvedCount,
    'TOTAL_UNRESOLVED_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.source_count), EXPECTED.sourceCount, 'SOURCE_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.candidate_count), EXPECTED.candidateCount, 'CANDIDATE_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.exact_token_candidate_count),
    EXPECTED.exactTokenCandidateCount,
    'EXACT_TOKEN_CANDIDATE_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.suffix_candidate_count),
    EXPECTED.suffixCandidateCount,
    'SUFFIX_CANDIDATE_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.additional_candidate_count),
    EXPECTED.additionalCandidateCount,
    'ADDITIONAL_CANDIDATE_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.unmatched_count),
    EXPECTED.unmatchedCount,
    'UNMATCHED_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.reused_target_count),
    EXPECTED.reusedTargetCount,
    'REUSED_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.chosen_target_count),
    EXPECTED.chosenTargetCount,
    'CHOSEN_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_identity_rows_before),
    EXPECTED.targetIdentityRowsBefore,
    'TARGET_IDENTITY_ROWS_BEFORE_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_active_identity_rows_before),
    EXPECTED.targetActiveIdentityRowsBefore,
    'TARGET_ACTIVE_IDENTITY_ROWS_BEFORE_DRIFT',
  );
  assertIdSetEqual(summary?.source_old_ids ?? [], [SOURCE_OLD_ID], 'SOURCE_OLD_IDS_DRIFT');
  assertIdSetEqual(summary?.effective_source_set_codes ?? [], [TARGET_SET_CODE], 'SOURCE_SET_CODES_DRIFT');
  assertIdSetEqual(
    summary?.candidate_new_ids ?? [],
    [EXACT_TARGET_NEW_ID, SUFFIX_TARGET_ID],
    'CANDIDATE_NEW_IDS_DRIFT',
  );
  assertIdSetEqual(summary?.exact_target_new_ids ?? [], [EXACT_TARGET_NEW_ID], 'EXACT_TARGET_NEW_IDS_DRIFT');
  assertIdSetEqual(summary?.suffix_target_new_ids ?? [], [SUFFIX_TARGET_ID], 'SUFFIX_TARGET_NEW_IDS_DRIFT');
  assertIdSetEqual(summary?.chosen_target_new_ids ?? [], [EXACT_TARGET_NEW_ID], 'CHOSEN_TARGET_NEW_IDS_DRIFT');
}

async function loadCandidateRows(client) {
  return queryRows(
    client,
    `
      select
        old_id,
        new_id,
        new_name,
        new_number,
        new_number_plain,
        new_variant_key,
        new_gv_id,
        match_type,
        precedence_rank
      from tmp_xy6_exact_candidates
      order by precedence_rank, new_number, new_id
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
          select old_id from tmp_xy6_exact_collapse_map
        )
      `,
    );
    counts[`${tableName}.${columnName}`] = normalizeCount(row?.row_count);
  }
  return counts;
}

async function loadCardPrintSnapshot(client, id) {
  return queryOne(
    client,
    `
      select
        cp.id,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.variant_key,
        cp.gv_id,
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
      group by cp.id, cp.name, cp.number, cp.number_plain, cp.variant_key, cp.gv_id
    `,
    [id],
  );
}

function assertExactTargetBefore(snapshot) {
  if (!snapshot) {
    throw new Error(`EXACT_TARGET_MISSING:${EXACT_TARGET_NEW_ID}`);
  }
  if (snapshot.id !== EXACT_TARGET_NEW_ID) {
    throw new Error(`EXACT_TARGET_ID_DRIFT:${snapshot.id}:${EXACT_TARGET_NEW_ID}`);
  }
  if (snapshot.gv_id !== CHOSEN_TARGET_GV_ID) {
    throw new Error(`EXACT_TARGET_GVID_DRIFT:${snapshot.gv_id}:${CHOSEN_TARGET_GV_ID}`);
  }
  assertEqual(normalizeCount(snapshot.identity_rows), EXPECTED.targetIdentityRowsBefore, 'EXACT_TARGET_IDENTITY_ROWS_BEFORE_DRIFT');
  assertEqual(normalizeCount(snapshot.active_identity_rows), EXPECTED.targetActiveIdentityRowsBefore, 'EXACT_TARGET_ACTIVE_IDENTITY_ROWS_BEFORE_DRIFT');
  assertEqual(normalizeCount(snapshot.trait_rows), 0, 'EXACT_TARGET_TRAIT_ROWS_BEFORE_DRIFT');
  assertEqual(normalizeCount(snapshot.printing_rows), EXPECTED.exactTargetPrintingRowsBefore, 'EXACT_TARGET_PRINTING_ROWS_BEFORE_DRIFT');
  assertEqual(normalizeCount(snapshot.external_rows), EXPECTED.exactTargetExternalRowsBefore, 'EXACT_TARGET_EXTERNAL_ROWS_BEFORE_DRIFT');
}

function assertSuffixTargetSnapshot(snapshot) {
  if (!snapshot) {
    throw new Error(`SUFFIX_TARGET_MISSING:${SUFFIX_TARGET_ID}`);
  }
  if (snapshot.id !== SUFFIX_TARGET_ID) {
    throw new Error(`SUFFIX_TARGET_ID_DRIFT:${snapshot.id}:${SUFFIX_TARGET_ID}`);
  }
  if (snapshot.gv_id !== SUFFIX_TARGET_GV_ID) {
    throw new Error(`SUFFIX_TARGET_GVID_DRIFT:${snapshot.gv_id}:${SUFFIX_TARGET_GV_ID}`);
  }
  assertEqual(normalizeCount(snapshot.identity_rows), EXPECTED.suffixTargetIdentityRowsBefore, 'SUFFIX_TARGET_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.active_identity_rows), EXPECTED.suffixTargetActiveIdentityRowsBefore, 'SUFFIX_TARGET_ACTIVE_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.inactive_identity_rows), EXPECTED.suffixTargetInactiveIdentityRowsBefore, 'SUFFIX_TARGET_INACTIVE_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.trait_rows), EXPECTED.suffixTargetTraitRowsBefore, 'SUFFIX_TARGET_TRAIT_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.printing_rows), EXPECTED.suffixTargetPrintingRowsBefore, 'SUFFIX_TARGET_PRINTING_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.external_rows), EXPECTED.suffixTargetExternalRowsBefore, 'SUFFIX_TARGET_EXTERNAL_ROWS_DRIFT');
  assertEqual(normalizeCount(snapshot.vault_rows), 0, 'SUFFIX_TARGET_VAULT_ROWS_DRIFT');
}

function assertSnapshotUnchanged(beforeSnapshot, afterSnapshot, code) {
  const keys = [
    'id',
    'name',
    'number',
    'number_plain',
    'variant_key',
    'gv_id',
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
      throw new Error(`${code}:${key}:${beforeValue}:${afterValue}`);
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
        join tmp_xy6_exact_collapse_map m
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
        join tmp_xy6_exact_collapse_map m
          on m.old_id = old_p.card_print_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from public.external_mappings old_em
        join tmp_xy6_exact_collapse_map m
          on m.old_id = old_em.card_print_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      )
      select
        (
          select count(*)::int
          from public.card_print_traits
          where card_print_id in (select old_id from tmp_xy6_exact_collapse_map)
        ) as old_trait_row_count,
        (
          select count(*)::int
          from public.card_printings
          where card_print_id in (select old_id from tmp_xy6_exact_collapse_map)
        ) as old_printing_row_count,
        (
          select count(*)::int
          from public.external_mappings
          where card_print_id in (select old_id from tmp_xy6_exact_collapse_map)
        ) as old_external_mapping_row_count,
        (
          select count(*)::int
          from public.vault_items
          where card_id in (select old_id from tmp_xy6_exact_collapse_map)
        ) as old_vault_item_row_count,
        (
          select count(*)::int
          from public.card_print_identity
          where card_print_id in (select distinct new_id from tmp_xy6_exact_collapse_map)
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
    from tmp_xy6_exact_collapse_map m
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
        select distinct new_id from tmp_xy6_exact_collapse_map
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
    join tmp_xy6_exact_collapse_map m
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
    join tmp_xy6_exact_collapse_map m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_xy6_exact_collapse_map m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadataRows = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_xy6_exact_collapse_map m
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
    from tmp_xy6_exact_collapse_map m
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
    using tmp_xy6_exact_collapse_map m
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
    from tmp_xy6_exact_collapse_map m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_xy6_exact_collapse_map m
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
    `select old_id from tmp_xy6_exact_collapse_map`,
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
        where cpi.card_print_id in (select new_id from tmp_xy6_exact_collapse_map)
      ),
      target_gvid_drift as (
        select count(*)::int as row_count
        from tmp_xy6_exact_collapse_map m
        join public.card_prints cp
          on cp.id = m.new_id
        where cp.gv_id is distinct from m.new_gv_id
      ),
      route_resolvable as (
        select count(*)::int as row_count
        from public.card_prints cp
        where cp.id in (select new_id from tmp_xy6_exact_collapse_map)
          and cp.gv_id is not null
      ),
      target_active_identity_state as (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_xy6_exact_collapse_map)
        group by cpi.card_print_id
      )
      select
        (
          select count(*)::int
          from unresolved_after
        ) as remaining_unresolved_rows,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_xy6_exact_collapse_map)
        ) as remaining_old_parent_rows,
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

  assertEqual(deletedOldParentRows, 1, 'DELETED_OLD_PARENT_COUNT_DRIFT');
  assertZero(postValidation.summary?.remaining_unresolved_rows, 'REMAINING_UNRESOLVED_ROWS');
  assertZero(postValidation.summary?.remaining_old_parent_rows, 'REMAINING_OLD_PARENT_ROWS');
  assertEqual(normalizeCount(postValidation.summary?.canonical_target_count), EXPECTED.canonicalTargetCount, 'CANONICAL_TARGET_COUNT_AFTER_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.target_any_identity_rows), EXPECTED.targetAnyIdentityRowsAfter, 'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.target_active_identity_rows), EXPECTED.targetActiveIdentityRowsAfter, 'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.target_inactive_identity_rows), EXPECTED.targetInactiveIdentityRowsAfter, 'TARGET_INACTIVE_IDENTITY_ROWS_AFTER_DRIFT');
  assertZero(postValidation.summary?.target_gvid_drift_count, 'TARGET_GVID_DRIFT_COUNT');
  assertEqual(normalizeCount(postValidation.summary?.route_resolvable_target_count), EXPECTED.routeResolvableTargetCount, 'ROUTE_RESOLVABLE_TARGET_COUNT_DRIFT');
  assertZero(postValidation.summary?.target_active_identity_conflict_count, 'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT');
}

async function loadSampleAfterRow(client) {
  return queryOne(
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
        new_cp.variant_key as new_variant_key_after,
        new_cp.gv_id as target_gv_id_after,
        count(cpi.id)::int as identity_row_count_on_new_parent,
        count(*) filter (where cpi.is_active = true)::int as active_identity_row_count_on_new_parent,
        count(*) filter (where cpi.is_active = false)::int as inactive_identity_row_count_on_new_parent,
        (
          select count(*)::int
          from public.external_mappings em
          where em.card_print_id = new_cp.id
        ) as external_rows_on_new_parent
      from public.card_prints new_cp
      left join public.card_print_identity cpi
        on cpi.card_print_id = new_cp.id
      where new_cp.id = $2
      group by
        new_cp.id,
        new_cp.name,
        new_cp.number,
        new_cp.number_plain,
        new_cp.variant_key,
        new_cp.gv_id
    `,
    [SOURCE_OLD_ID, EXACT_TARGET_NEW_ID],
  );
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
    contract_name: CONTRACT_NAME,
    source_surface: null,
    preconditions: null,
    candidate_rows: null,
    fk_inventory: null,
    source_snapshot_before: null,
    exact_target_snapshot_before: null,
    suffix_target_snapshot_before: null,
    suffix_target_snapshot_after: null,
    collision_summary: null,
    canonical_count_before: null,
    apply_operations: null,
    deleted_old_parent_rows: 0,
    post_validation: null,
    sample_row: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `xy6_exact_token_precedence_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempExactTokenSurface(client);

    report.source_surface = await loadSourceSurface(client);
    assertSourceSurface(report.source_surface);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.candidate_rows = await loadCandidateRows(client);
    if (report.candidate_rows.length !== EXPECTED.candidateCount) {
      throw new Error(`CANDIDATE_ROW_COUNT_DRIFT:${report.candidate_rows.length}:${EXPECTED.candidateCount}`);
    }

    const fkInventory = await loadCardPrintFkInventory(client);
    const fkCounts = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from tmp_xy6_exact_collapse_map`,
    );
    assertNoUnexpectedReferencedTables(fkCounts);
    report.fk_inventory = await loadSupportedFkCounts(client);

    report.source_snapshot_before = await loadCardPrintSnapshot(client, SOURCE_OLD_ID);
    report.exact_target_snapshot_before = await loadCardPrintSnapshot(client, EXACT_TARGET_NEW_ID);
    report.suffix_target_snapshot_before = await loadCardPrintSnapshot(client, SUFFIX_TARGET_ID);
    assertExactTargetBefore(report.exact_target_snapshot_before);
    assertSuffixTargetSnapshot(report.suffix_target_snapshot_before);

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
      using tmp_xy6_exact_collapse_map m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;

    report.post_validation = await loadPostValidation(client, fkInventory);
    assertPostValidation(report.post_validation, report.deleted_old_parent_rows);

    report.suffix_target_snapshot_after = await loadCardPrintSnapshot(client, SUFFIX_TARGET_ID);
    assertSuffixTargetSnapshot(report.suffix_target_snapshot_after);
    assertSnapshotUnchanged(
      report.suffix_target_snapshot_before,
      report.suffix_target_snapshot_after,
      'SUFFIX_TARGET_MUTATED',
    );

    report.sample_row = await loadSampleAfterRow(client);
    if (report.sample_row?.old_parent_still_exists !== false) {
      throw new Error(`OLD_PARENT_STILL_EXISTS:${SOURCE_OLD_ID}`);
    }
    if (report.sample_row?.target_gv_id_after !== CHOSEN_TARGET_GV_ID) {
      throw new Error(`TARGET_GVID_DRIFT:${report.sample_row?.target_gv_id_after}:${CHOSEN_TARGET_GV_ID}`);
    }
    if (normalizeCount(report.sample_row?.active_identity_row_count_on_new_parent) !== 1) {
      throw new Error(`TARGET_ACTIVE_IDENTITY_COUNT_DRIFT:${EXACT_TARGET_NEW_ID}:${report.sample_row?.active_identity_row_count_on_new_parent}`);
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
