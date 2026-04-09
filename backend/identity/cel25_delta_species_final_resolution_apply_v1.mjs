import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'CEL25_DELTA_SPECIES_FINAL_RESOLUTION_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'cel25';
const TARGET_SET_CODE = 'cel25';
const CLASSIFICATION = 'IDENTITY_MODEL_EXTENSION_REQUIRED_FINAL_RESOLUTION';
const CONTRACT_NAME = 'DELTA_SPECIES_PRINTED_IDENTITY_MODEL_CONTRACT_V1';

const SOURCE_OLD_ID = 'f7c22698-daa3-4412-84ef-436fb1fe130f';
const SOURCE_NAME = 'Gardevoir ex';
const SOURCE_PRINTED_NUMBER = '93A';
const SOURCE_NORMALIZED_TOKEN = '93';

const TARGET_NEW_ID = 'b4a42612-945d-419f-a4f4-c64ae5c26d6b';
const TARGET_NAME = 'Gardevoir ex δ';
const TARGET_NUMBER_PLAIN = '93';
const TARGET_VARIANT_KEY = 'cc';
const TARGET_GV_ID = 'GV-PK-CEL-93CC';
const TARGET_PRINTED_IDENTITY_MODIFIER = 'delta_species';

const EXPECTED = {
  totalUnresolvedCount: 1,
  sourceCount: 1,
  canonicalTargetCount: 47,
  targetCount: 1,
  sameTokenCanonicalCount: 1,
  unmatchedCount: 0,
  ambiguousTargetCount: 0,
  reusedTargetCount: 0,
  targetIdentityRowsBefore: 0,
  oldTraitRowCount: 1,
  oldPrintingRowCount: 1,
  oldExternalMappingRowCount: 1,
  oldVaultItemRowCount: 0,
  targetTraitRowCount: 1,
  targetPrintingRowCount: 1,
  targetExternalMappingRowCount: 1,
  traitTargetKeyConflictCount: 0,
  traitMergeableMetadataOnlyCount: 0,
  traitConflictingNonIdenticalCount: 0,
  printingFinishConflictCount: 0,
  printingMergeableMetadataOnlyCount: 0,
  printingConflictingNonIdenticalCount: 0,
  externalMappingConflictCount: 0,
  updatedIdentityRows: 1,
  mergedTraitMetadataRows: 0,
  insertedTraits: 1,
  deletedOldTraits: 1,
  mergedPrintingMetadataRows: 0,
  movedUniquePrintings: 1,
  deletedRedundantPrintings: 0,
  updatedExternalMappings: 1,
  updatedVaultItems: 0,
  remainingUnresolvedTotalRows: 0,
  targetAnyIdentityRowsAfter: 1,
  targetActiveIdentityRowsAfter: 1,
  targetInactiveIdentityRowsAfter: 0,
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

async function buildTempDeltaSurface(client) {
  await client.query(`
    drop table if exists tmp_cel25_delta_unresolved_all;
    drop table if exists tmp_cel25_delta_scope;
    drop table if exists tmp_cel25_delta_canonical;
    drop table if exists tmp_cel25_delta_candidate_rows;
    drop table if exists tmp_cel25_delta_match_counts;
    drop table if exists tmp_cel25_delta_collapse_map;

    create temp table tmp_cel25_delta_unresolved_all on commit drop as
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.set_code as old_set_code,
      cp.number as old_parent_number,
      cp.number_plain as old_parent_number_plain,
      cp.variant_key as old_variant_key,
      cp.printed_identity_modifier as old_printed_identity_modifier,
      cpi.id as old_identity_id,
      cpi.printed_number as source_printed_number,
      nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token,
      btrim(
        regexp_replace(
          replace(
            replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
            'δ',
            ' δ '
          ),
          '\\s+',
          ' ',
          'g'
        )
      ) as normalized_name
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${SOURCE_SET_CODE_IDENTITY}'
      and cpi.is_active = true
      and cp.gv_id is null;

    create temp table tmp_cel25_delta_scope on commit drop as
    select *
    from tmp_cel25_delta_unresolved_all
    where old_id = '${SOURCE_OLD_ID}'
      and old_name = '${SOURCE_NAME}'
      and source_printed_number = '${SOURCE_PRINTED_NUMBER}'
      and normalized_token = '${SOURCE_NORMALIZED_TOKEN}';

    create temp table tmp_cel25_delta_canonical on commit drop as
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.set_code as new_set_code,
      cp.number as new_number,
      cp.number_plain as new_number_plain,
      cp.variant_key as new_variant_key,
      cp.gv_id as new_gv_id,
      cp.printed_identity_modifier as new_printed_identity_modifier
    from public.card_prints cp
    where cp.set_code = '${TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create temp table tmp_cel25_delta_candidate_rows on commit drop as
    select
      s.old_id,
      s.old_name,
      s.old_set_code,
      s.old_parent_number,
      s.old_parent_number_plain,
      s.old_variant_key,
      s.old_identity_id,
      s.source_printed_number,
      s.normalized_token,
      s.normalized_name,
      c.new_id,
      c.new_name,
      c.new_set_code,
      c.new_number,
      c.new_number_plain,
      c.new_variant_key,
      c.new_gv_id,
      c.new_printed_identity_modifier
    from tmp_cel25_delta_scope s
    join tmp_cel25_delta_canonical c
      on c.new_number_plain = s.normalized_token
     and c.new_id = '${TARGET_NEW_ID}'
     and c.new_name = '${TARGET_NAME}'
     and c.new_variant_key = '${TARGET_VARIANT_KEY}'
     and c.new_gv_id = '${TARGET_GV_ID}'
     and c.new_printed_identity_modifier = '${TARGET_PRINTED_IDENTITY_MODIFIER}';

    create temp table tmp_cel25_delta_match_counts on commit drop as
    select
      s.old_id,
      count(distinct c.new_id)::int as candidate_count
    from tmp_cel25_delta_scope s
    left join tmp_cel25_delta_candidate_rows c
      on c.old_id = s.old_id
    group by s.old_id;

    create temp table tmp_cel25_delta_collapse_map on commit drop as
    select
      row_number() over (order by old_id)::int as seq,
      old_id,
      new_id,
      old_name,
      new_name,
      old_set_code,
      new_set_code,
      old_parent_number,
      old_parent_number_plain,
      old_variant_key,
      source_printed_number,
      normalized_token,
      normalized_name,
      new_number,
      new_number_plain,
      new_variant_key,
      new_gv_id,
      new_printed_identity_modifier
    from tmp_cel25_delta_candidate_rows;

    create unique index tmp_cel25_delta_collapse_map_old_uidx
      on tmp_cel25_delta_collapse_map (old_id);
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with reused_targets as (
        select new_id
        from tmp_cel25_delta_collapse_map
        group by new_id
        having count(*) > 1
      )
      select
        (select count(*)::int from tmp_cel25_delta_unresolved_all) as total_unresolved_count,
        (select count(*)::int from tmp_cel25_delta_scope) as source_count,
        (select count(*)::int from tmp_cel25_delta_canonical) as canonical_target_count,
        (
          select count(*)::int
          from tmp_cel25_delta_canonical
          where new_id = $1
            and new_name = $2
            and new_number_plain = $3
            and new_variant_key = $4
            and new_gv_id = $5
            and new_printed_identity_modifier = $6
        ) as target_count,
        (
          select count(*)::int
          from tmp_cel25_delta_canonical c
          join tmp_cel25_delta_scope s
            on c.new_number_plain = s.normalized_token
        ) as same_token_canonical_count,
        (select count(*)::int from tmp_cel25_delta_match_counts where candidate_count = 0) as unmatched_count,
        (select count(*)::int from tmp_cel25_delta_match_counts where candidate_count > 1) as ambiguous_target_count,
        (select count(*)::int from reused_targets) as reused_target_count,
        (
          select count(*)::int
          from public.card_print_identity
          where card_print_id in (select distinct new_id from tmp_cel25_delta_collapse_map)
        ) as target_identity_rows_before,
        (
          select array_agg(old_id::text order by old_id)
          from tmp_cel25_delta_scope
        ) as source_old_ids,
        (
          select array_agg(new_id::text order by new_id)
          from tmp_cel25_delta_collapse_map
        ) as target_new_ids
    `,
    [
      TARGET_NEW_ID,
      TARGET_NAME,
      TARGET_NUMBER_PLAIN,
      TARGET_VARIANT_KEY,
      TARGET_GV_ID,
      TARGET_PRINTED_IDENTITY_MODIFIER,
    ],
  );
}

function assertPreconditions(summary) {
  assertEqual(
    normalizeCount(summary?.total_unresolved_count),
    EXPECTED.totalUnresolvedCount,
    'TOTAL_UNRESOLVED_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.source_count), EXPECTED.sourceCount, 'SOURCE_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.target_count), EXPECTED.targetCount, 'TARGET_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.same_token_canonical_count),
    EXPECTED.sameTokenCanonicalCount,
    'SAME_TOKEN_CANONICAL_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.unmatched_count),
    EXPECTED.unmatchedCount,
    'UNMATCHED_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.ambiguous_target_count),
    EXPECTED.ambiguousTargetCount,
    'AMBIGUOUS_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.reused_target_count),
    EXPECTED.reusedTargetCount,
    'REUSED_TARGET_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_identity_rows_before),
    EXPECTED.targetIdentityRowsBefore,
    'TARGET_IDENTITY_ROWS_BEFORE_DRIFT',
  );
  assertIdSetEqual(summary?.source_old_ids ?? [], [SOURCE_OLD_ID], 'SOURCE_OLD_IDS_DRIFT');
  assertIdSetEqual(summary?.target_new_ids ?? [], [TARGET_NEW_ID], 'TARGET_NEW_IDS_DRIFT');
}

async function loadCollapseMapSamples(client) {
  return queryRows(
    client,
    `
      select
        seq,
        old_id,
        old_name,
        source_printed_number,
        normalized_name,
        normalized_token,
        new_id,
        new_name,
        new_number,
        new_variant_key,
        new_gv_id,
        new_printed_identity_modifier
      from tmp_cel25_delta_collapse_map
      order by seq
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
          select old_id from tmp_cel25_delta_collapse_map
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
      with old_traits as (
        select *
        from public.card_print_traits
        where card_print_id in (select old_id from tmp_cel25_delta_collapse_map)
      ),
      new_traits as (
        select *
        from public.card_print_traits
        where card_print_id in (select distinct new_id from tmp_cel25_delta_collapse_map)
      ),
      trait_conflicts as (
        select old_t.id as old_trait_id, new_t.id as new_trait_id
        from tmp_cel25_delta_collapse_map m
        join old_traits old_t
          on old_t.card_print_id = m.old_id
        join new_traits new_t
          on new_t.card_print_id = m.new_id
         and new_t.trait_type = old_t.trait_type
         and new_t.trait_value = old_t.trait_value
         and new_t.source = old_t.source
      ),
      old_printings as (
        select *
        from public.card_printings
        where card_print_id in (select old_id from tmp_cel25_delta_collapse_map)
      ),
      new_printings as (
        select *
        from public.card_printings
        where card_print_id in (select distinct new_id from tmp_cel25_delta_collapse_map)
      ),
      printing_conflicts as (
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
        from tmp_cel25_delta_collapse_map m
        join old_printings old_p
          on old_p.card_print_id = m.old_id
        join new_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from tmp_cel25_delta_collapse_map m
        join public.external_mappings old_em
          on old_em.card_print_id = m.old_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      )
      select
        (select count(*)::int from old_traits) as old_trait_row_count,
        (select count(*)::int from new_traits) as target_trait_row_count,
        (select count(*)::int from trait_conflicts) as trait_target_key_conflict_count,
        0::int as trait_mergeable_metadata_only_count,
        0::int as trait_conflicting_non_identical_count,
        (select count(*)::int from old_printings) as old_printing_row_count,
        (select count(*)::int from new_printings) as target_printing_row_count,
        (select count(*)::int from printing_conflicts) as printing_finish_conflict_count,
        (
          select count(*)::int
          from printing_conflicts
          where old_is_provisional = new_is_provisional
            and (new_provenance_source is null or new_provenance_source = old_provenance_source)
            and (new_provenance_ref is null or new_provenance_ref = old_provenance_ref)
            and (new_created_by is null or new_created_by = old_created_by)
        ) as printing_mergeable_metadata_only_count,
        (
          select count(*)::int
          from printing_conflicts
          where old_is_provisional is distinct from new_is_provisional
             or (old_provenance_source is not null and new_provenance_source is not null and old_provenance_source <> new_provenance_source)
             or (old_provenance_ref is not null and new_provenance_ref is not null and old_provenance_ref <> new_provenance_ref)
             or (old_created_by is not null and new_created_by is not null and old_created_by <> new_created_by)
        ) as printing_conflicting_non_identical_count,
        (
          select count(*)::int
          from public.external_mappings
          where card_print_id in (select old_id from tmp_cel25_delta_collapse_map)
        ) as old_external_mapping_row_count,
        (
          select count(*)::int
          from public.external_mappings
          where card_print_id in (select distinct new_id from tmp_cel25_delta_collapse_map)
        ) as target_external_mapping_row_count,
        (select row_count from external_conflicts) as external_mapping_conflict_count,
        (
          select count(*)::int
          from public.card_print_identity
          where card_print_id in (select distinct new_id from tmp_cel25_delta_collapse_map)
        ) as target_identity_row_count,
        (
          select count(*)::int
          from public.vault_items
          where card_id in (select old_id from tmp_cel25_delta_collapse_map)
        ) as old_vault_item_row_count
    `,
  );
}

function assertCollisionSummary(summary) {
  assertEqual(normalizeCount(summary?.old_trait_row_count), EXPECTED.oldTraitRowCount, 'OLD_TRAIT_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.target_trait_row_count), EXPECTED.targetTraitRowCount, 'TARGET_TRAIT_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.old_printing_row_count), EXPECTED.oldPrintingRowCount, 'OLD_PRINTING_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.target_printing_row_count), EXPECTED.targetPrintingRowCount, 'TARGET_PRINTING_ROW_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.old_external_mapping_row_count),
    EXPECTED.oldExternalMappingRowCount,
    'OLD_EXTERNAL_MAPPING_ROW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.target_external_mapping_row_count),
    EXPECTED.targetExternalMappingRowCount,
    'TARGET_EXTERNAL_MAPPING_ROW_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.old_vault_item_row_count), EXPECTED.oldVaultItemRowCount, 'OLD_VAULT_ITEM_ROW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.target_identity_row_count), EXPECTED.targetIdentityRowsBefore, 'TARGET_IDENTITY_ROW_COUNT_DRIFT');
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
  assertEqual(normalizeCount(operations.updated_identity_rows), EXPECTED.updatedIdentityRows, 'UPDATED_IDENTITY_ROWS_DRIFT');
  assertEqual(
    normalizeCount(operations.merged_trait_metadata_rows),
    EXPECTED.mergedTraitMetadataRows,
    'MERGED_TRAIT_METADATA_ROWS_DRIFT',
  );
  assertEqual(normalizeCount(operations.inserted_traits), EXPECTED.insertedTraits, 'INSERTED_TRAITS_DRIFT');
  assertEqual(normalizeCount(operations.deleted_old_traits), EXPECTED.deletedOldTraits, 'DELETED_OLD_TRAITS_DRIFT');
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
  assertEqual(normalizeCount(operations.updated_vault_items), EXPECTED.updatedVaultItems, 'UPDATED_VAULT_ITEMS_DRIFT');
}

async function applyCollapse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.new_id,
      updated_at = now()
    from tmp_cel25_delta_collapse_map m
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
        select distinct new_id from tmp_cel25_delta_collapse_map
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
    join tmp_cel25_delta_collapse_map m
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
    join tmp_cel25_delta_collapse_map m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_cel25_delta_collapse_map m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadata = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_cel25_delta_collapse_map m
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
    from tmp_cel25_delta_collapse_map m
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
    using tmp_cel25_delta_collapse_map m
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
    from tmp_cel25_delta_collapse_map m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_cel25_delta_collapse_map m
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
    `select old_id from tmp_cel25_delta_collapse_map`,
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
        where cpi.card_print_id in (select new_id from tmp_cel25_delta_collapse_map)
      ),
      target_state as (
        select
          cp.gv_id,
          cp.printed_identity_modifier
        from public.card_prints cp
        where cp.id in (select new_id from tmp_cel25_delta_collapse_map)
      ),
      target_gvid_drift as (
        select count(*)::int as row_count
        from tmp_cel25_delta_collapse_map m
        join public.card_prints cp
          on cp.id = m.new_id
        where cp.gv_id is distinct from m.new_gv_id
      )
      select
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_cel25_delta_collapse_map)
        ) as remaining_old_parent_rows,
        (select count(*)::int from unresolved_after) as remaining_unresolved_total_rows,
        (
          select array_agg(old_id::text order by old_id)
          from unresolved_after
        ) as remaining_unresolved_old_ids,
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
        (select gv_id from target_state) as target_gv_id,
        (select printed_identity_modifier from target_state) as target_printed_identity_modifier
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
  assertIdSetEqual(
    postValidation.summary?.remaining_unresolved_old_ids ?? [],
    [],
    'REMAINING_UNRESOLVED_OLD_IDS_DRIFT',
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
  assertEqual(postValidation.summary?.target_gv_id, TARGET_GV_ID, 'TARGET_GVID_AFTER_DRIFT');
  assertEqual(
    postValidation.summary?.target_printed_identity_modifier,
    TARGET_PRINTED_IDENTITY_MODIFIER,
    'TARGET_PRINTED_IDENTITY_MODIFIER_DRIFT',
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
          new_cp.variant_key as new_variant_key_after,
          new_cp.gv_id as target_gv_id_after,
          new_cp.printed_identity_modifier as target_printed_identity_modifier_after,
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
          new_cp.variant_key,
          new_cp.gv_id,
          new_cp.printed_identity_modifier
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
    contract_name: CONTRACT_NAME,
    scope_contract: {
      same_set_only: true,
      source_old_id: SOURCE_OLD_ID,
      source_name: SOURCE_NAME,
      source_printed_number: SOURCE_PRINTED_NUMBER,
      target_new_id: TARGET_NEW_ID,
      target_name: TARGET_NAME,
      target_gv_id: TARGET_GV_ID,
      target_printed_identity_modifier: TARGET_PRINTED_IDENTITY_MODIFIER,
    },
    preconditions: null,
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
    application_name: `cel25_delta_species_final_resolution_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempDeltaSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.collapse_map_samples = await loadCollapseMapSamples(client);
    if (report.collapse_map_samples.length !== 1) {
      throw new Error(`COLLAPSE_MAP_SAMPLE_COUNT_DRIFT:${report.collapse_map_samples.length}:1`);
    }
    if (report.collapse_map_samples[0].new_gv_id !== TARGET_GV_ID) {
      throw new Error(`TARGET_GVID_PRECONDITION_DRIFT:${report.collapse_map_samples[0].new_gv_id}:${TARGET_GV_ID}`);
    }
    if (report.collapse_map_samples[0].new_printed_identity_modifier !== TARGET_PRINTED_IDENTITY_MODIFIER) {
      throw new Error(
        `TARGET_PRINTED_IDENTITY_MODIFIER_PRECONDITION_DRIFT:${report.collapse_map_samples[0].new_printed_identity_modifier}:${TARGET_PRINTED_IDENTITY_MODIFIER}`,
      );
    }

    const fkInventory = await loadCardPrintFkInventory(client);
    const fkCounts = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from tmp_cel25_delta_collapse_map`,
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
      using tmp_cel25_delta_collapse_map m
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
      if (row.target_printed_identity_modifier_after !== TARGET_PRINTED_IDENTITY_MODIFIER) {
        throw new Error(
          `TARGET_PRINTED_IDENTITY_MODIFIER_AFTER_DRIFT:${row.target_printed_identity_modifier_after}:${TARGET_PRINTED_IDENTITY_MODIFIER}`,
        );
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
