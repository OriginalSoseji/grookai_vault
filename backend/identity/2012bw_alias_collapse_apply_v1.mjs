import '../env.mjs';
import { Client } from 'pg';

const PHASE = '2012BW_ALIAS_COLLAPSE_TO_MCD12_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = '2012bw';
const TARGET_SET_CODE = 'mcd12';
const EXPECTED = {
  unresolvedCount: 12,
  numericUnresolved: 12,
  nonNumericUnresolved: 0,
  canonicalTargetCount: 12,
  mapCount: 12,
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
    drop table if exists tmp_2012bw_unresolved;
    drop table if exists tmp_2012bw_canonical;
    drop table if exists tmp_2012bw_candidates;
    drop table if exists tmp_2012bw_old_counts;
    drop table if exists tmp_2012bw_new_counts;
    drop table if exists tmp_2012bw_collapse_map;

    create temp table tmp_2012bw_unresolved on commit drop as
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
      and cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${SOURCE_SET_CODE_IDENTITY}'
      and cp.gv_id is null;

    create temp table tmp_2012bw_canonical on commit drop as
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.set_code as new_set_code,
      cp.number as new_number,
      coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
      cp.gv_id as new_gv_id,
      lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name
    from public.card_prints cp
    where cp.set_code = '${TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create temp table tmp_2012bw_candidates on commit drop as
    select
      u.old_id,
      c.new_id
    from tmp_2012bw_unresolved u
    join tmp_2012bw_canonical c
      on c.new_number_normalized = u.old_number_normalized
     and c.normalized_name = u.normalized_printed_name;

    create temp table tmp_2012bw_old_counts on commit drop as
    select old_id, count(*)::int as match_count
    from tmp_2012bw_candidates
    group by old_id;

    create temp table tmp_2012bw_new_counts on commit drop as
    select new_id, count(*)::int as match_count
    from tmp_2012bw_candidates
    group by new_id;

    create temp table tmp_2012bw_collapse_map on commit drop as
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
    from tmp_2012bw_unresolved u
    join tmp_2012bw_candidates candidate
      on candidate.old_id = u.old_id
    join tmp_2012bw_canonical c
      on c.new_id = candidate.new_id
    join tmp_2012bw_old_counts old_counts
      on old_counts.old_id = candidate.old_id
    join tmp_2012bw_new_counts new_counts
      on new_counts.new_id = candidate.new_id
    where old_counts.match_count = 1
      and new_counts.match_count = 1;

    create unique index tmp_2012bw_collapse_map_old_uidx
      on tmp_2012bw_collapse_map (old_id);

    create unique index tmp_2012bw_collapse_map_new_uidx
      on tmp_2012bw_collapse_map (new_id);
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with unresolved_counts as (
        select
          count(*)::int as unresolved_count,
          count(*) filter (where old_number ~ '^[0-9]+$')::int as numeric_unresolved,
          count(*) filter (where old_number !~ '^[0-9]+$')::int as non_numeric_unresolved
        from tmp_2012bw_unresolved
      ),
      canonical_target as (
        select count(*)::int as row_count from tmp_2012bw_canonical
      ),
      map_summary as (
        select
          count(*)::int as map_count,
          count(distinct old_id)::int as distinct_old_count,
          count(distinct new_id)::int as distinct_new_count
        from tmp_2012bw_collapse_map
      ),
      multiple_old as (
        select count(*)::int as row_count from tmp_2012bw_old_counts where match_count > 1
      ),
      reused_new as (
        select count(*)::int as row_count from tmp_2012bw_new_counts where match_count > 1
      ),
      unmatched as (
        select count(*)::int as row_count
        from tmp_2012bw_unresolved u
        where not exists (select 1 from tmp_2012bw_collapse_map m where m.old_id = u.old_id)
      ),
      same_number_same_name as (
        select count(*)::int as row_count
        from tmp_2012bw_unresolved u
        where exists (
          select 1
          from tmp_2012bw_canonical c
          where c.new_number_normalized = u.old_number_normalized
            and c.normalized_name = u.normalized_printed_name
        )
      ),
      same_number_different_name as (
        select count(*)::int as row_count
        from tmp_2012bw_unresolved u
        where exists (
          select 1
          from tmp_2012bw_canonical c
          where c.new_number_normalized = u.old_number_normalized
            and c.normalized_name <> u.normalized_printed_name
        )
      ),
      target_identity as (
        select
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from tmp_2012bw_collapse_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.new_id
      )
      select
        unresolved_count,
        numeric_unresolved,
        non_numeric_unresolved,
        canonical_target.row_count as canonical_target_count,
        map_count,
        distinct_old_count,
        distinct_new_count,
        multiple_old.row_count as multiple_match_old_count,
        reused_new.row_count as reused_new_count,
        unmatched.row_count as unmatched_count,
        same_number_same_name.row_count as same_number_same_name_count,
        same_number_different_name.row_count as same_number_different_name_count,
        target_identity.any_identity_rows as target_any_identity_rows,
        target_identity.active_identity_rows as target_active_identity_rows
      from unresolved_counts
      cross join canonical_target
      cross join map_summary
      cross join multiple_old
      cross join reused_new
      cross join unmatched
      cross join same_number_same_name
      cross join same_number_different_name
      cross join target_identity
    `,
  );
}

function assertPreconditions(summary) {
  assertEqual(normalizeCount(summary?.unresolved_count), EXPECTED.unresolvedCount, 'UNRESOLVED_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.numeric_unresolved), EXPECTED.numericUnresolved, 'NUMERIC_UNRESOLVED_DRIFT');
  assertEqual(normalizeCount(summary?.non_numeric_unresolved), EXPECTED.nonNumericUnresolved, 'NON_NUMERIC_UNRESOLVED_DRIFT');
  assertEqual(normalizeCount(summary?.canonical_target_count), EXPECTED.canonicalTargetCount, 'CANONICAL_TARGET_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.map_count), EXPECTED.mapCount, 'MAP_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.distinct_old_count), EXPECTED.mapCount, 'DISTINCT_OLD_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.distinct_new_count), EXPECTED.mapCount, 'DISTINCT_NEW_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.same_number_same_name_count), EXPECTED.mapCount, 'SAME_NUMBER_SAME_NAME_COUNT_DRIFT');
  assertZero(summary?.multiple_match_old_count, 'MULTIPLE_MATCH_OLD');
  assertZero(summary?.reused_new_count, 'REUSED_NEW');
  assertZero(summary?.unmatched_count, 'UNMATCHED_COUNT');
  assertZero(summary?.same_number_different_name_count, 'SAME_NUMBER_DIFFERENT_NAME_COUNT');
  assertZero(summary?.target_any_identity_rows, 'TARGET_ANY_IDENTITY_ROWS_PRESENT');
  assertZero(summary?.target_active_identity_rows, 'TARGET_ACTIVE_IDENTITY_ROWS_PRESENT');
}

async function loadSampleMapRows(client) {
  const rows = await queryRows(
    client,
    `
      select seq, old_id, new_id, old_name, new_name, old_set_code, new_set_code,
             old_number, new_number, old_number_normalized, new_number_normalized,
             normalized_printed_name, normalized_name, new_gv_id
      from tmp_2012bw_collapse_map
      order by seq
    `,
  );

  if (rows.length === 0) {
    return { first: null, middle: null, last: null };
  }

  return {
    first: rows[0],
    middle: rows[Math.floor(rows.length / 2)],
    last: rows[rows.length - 1],
  };
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
    const row = await queryOne(
      client,
      `select count(*)::int as row_count from public.${quoteIdent(fk.table_name)} where ${quoteIdent(fk.column_name)} in (${sourceClause})`,
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
      with trait_key_conflicts as (
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
        from tmp_2012bw_collapse_map m
        join public.card_print_traits old_t on old_t.card_print_id = m.old_id
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
        from tmp_2012bw_collapse_map m
        join public.card_printings old_p on old_p.card_print_id = m.old_id
        join public.card_printings new_p on new_p.card_print_id = m.new_id and new_p.finish_key = old_p.finish_key
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from tmp_2012bw_collapse_map m
        join public.external_mappings old_em on old_em.card_print_id = m.old_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      ),
      target_identity as (
        select count(*)::int as row_count
        from public.card_print_identity
        where card_print_id in (select new_id from tmp_2012bw_collapse_map)
      )
      select
        (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from tmp_2012bw_collapse_map)) as old_trait_row_count,
        (select count(*)::int from trait_key_conflicts) as trait_target_key_conflict_count,
        (select count(*)::int from trait_key_conflicts where old_confidence is distinct from new_confidence or old_hp is distinct from new_hp or old_national_dex is distinct from new_national_dex or old_types is distinct from new_types or old_rarity is distinct from new_rarity or old_supertype is distinct from new_supertype or old_card_category is distinct from new_card_category or old_legacy_rarity is distinct from new_legacy_rarity) as trait_conflicting_non_identical_count,
        (select count(*)::int from public.card_printings where card_print_id in (select old_id from tmp_2012bw_collapse_map)) as old_printing_row_count,
        (select count(*)::int from printing_finish_conflicts) as printing_finish_conflict_count,
        (select count(*)::int from printing_finish_conflicts where old_is_provisional = new_is_provisional and (new_provenance_source is null or new_provenance_source = old_provenance_source) and (new_provenance_ref is null or new_provenance_ref = old_provenance_ref) and (new_created_by is null or new_created_by = old_created_by)) as printing_mergeable_metadata_only_count,
        (select count(*)::int from printing_finish_conflicts where old_is_provisional is distinct from new_is_provisional or (old_provenance_source is not null and new_provenance_source is not null and old_provenance_source <> new_provenance_source) or (old_provenance_ref is not null and new_provenance_ref is not null and old_provenance_ref <> new_provenance_ref) or (old_created_by is not null and new_created_by is not null and old_created_by <> new_created_by)) as printing_conflicting_non_identical_count,
        (select count(*)::int from public.external_mappings where card_print_id in (select old_id from tmp_2012bw_collapse_map)) as old_external_mapping_row_count,
        external_conflicts.row_count as external_mapping_conflict_count,
        target_identity.row_count as target_identity_row_count
      from external_conflicts
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
  if (mergeablePrintings !== finishConflicts) {
    throw new Error(`PRINTING_MERGEABLE_COUNT_DRIFT:${mergeablePrintings}:${finishConflicts}`);
  }
  assertZero(summary?.printing_conflicting_non_identical_count, 'PRINTING_CONFLICTING_NON_IDENTICAL');
}

async function loadCanonicalCount(client) {
  return queryOne(
    client,
    `select count(*)::int as canonical_target_count from public.card_prints where set_code = $1 and gv_id is not null`,
    [TARGET_SET_CODE],
  );
}

async function loadActiveIdentityCount(client) {
  const row = await queryOne(client, `select count(*)::int as row_count from public.card_print_identity where is_active = true`);
  return normalizeCount(row?.row_count);
}

async function loadBatchFkCounts(client) {
  return {
    'card_print_identity.card_print_id': normalizeCount((await queryOne(client, `select count(*)::int as row_count from public.card_print_identity where card_print_id in (select old_id from tmp_2012bw_collapse_map)`))?.row_count),
    'card_print_traits.card_print_id': normalizeCount((await queryOne(client, `select count(*)::int as row_count from public.card_print_traits where card_print_id in (select old_id from tmp_2012bw_collapse_map)`))?.row_count),
    'card_printings.card_print_id': normalizeCount((await queryOne(client, `select count(*)::int as row_count from public.card_printings where card_print_id in (select old_id from tmp_2012bw_collapse_map)`))?.row_count),
    'external_mappings.card_print_id': normalizeCount((await queryOne(client, `select count(*)::int as row_count from public.external_mappings where card_print_id in (select old_id from tmp_2012bw_collapse_map)`))?.row_count),
    'vault_items.card_id': normalizeCount((await queryOne(client, `select count(*)::int as row_count from public.vault_items where card_id in (select old_id from tmp_2012bw_collapse_map)`))?.row_count),
  };
}

async function applySingleBatch(client) {
  const fkBefore = await loadBatchFkCounts(client);

  const updatedIdentityRows = await client.query(`update public.card_print_identity cpi set card_print_id = m.new_id from tmp_2012bw_collapse_map m where cpi.card_print_id = m.old_id`);
  const insertedTraits = await client.query(`insert into public.card_print_traits (card_print_id, trait_type, trait_value, source, confidence, created_at, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity) select m.new_id, t.trait_type, t.trait_value, t.source, t.confidence, t.created_at, t.hp, t.national_dex, t.types, t.rarity, t.supertype, t.card_category, t.legacy_rarity from public.card_print_traits t join tmp_2012bw_collapse_map m on m.old_id = t.card_print_id on conflict (card_print_id, trait_type, trait_value, source) do nothing`);
  const deletedTraits = await client.query(`delete from public.card_print_traits t using tmp_2012bw_collapse_map m where t.card_print_id = m.old_id`);
  const mergedPrintingMetadata = await client.query(`update public.card_printings new_p set provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source), provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref), created_by = coalesce(new_p.created_by, old_p.created_by) from public.card_printings old_p join tmp_2012bw_collapse_map m on m.old_id = old_p.card_print_id where new_p.card_print_id = m.new_id and new_p.finish_key = old_p.finish_key and ((new_p.provenance_source is null and old_p.provenance_source is not null) or (new_p.provenance_ref is null and old_p.provenance_ref is not null) or (new_p.created_by is null and old_p.created_by is not null))`);
  const movedUniquePrintings = await client.query(`update public.card_printings old_p set card_print_id = m.new_id from tmp_2012bw_collapse_map m where old_p.card_print_id = m.old_id and not exists (select 1 from public.card_printings new_p where new_p.card_print_id = m.new_id and new_p.finish_key = old_p.finish_key)`);
  const deletedRedundantPrintings = await client.query(`delete from public.card_printings old_p using tmp_2012bw_collapse_map m where old_p.card_print_id = m.old_id and exists (select 1 from public.card_printings new_p where new_p.card_print_id = m.new_id and new_p.finish_key = old_p.finish_key)`);
  const updatedExternalMappings = await client.query(`update public.external_mappings em set card_print_id = m.new_id from tmp_2012bw_collapse_map m where em.card_print_id = m.old_id`);
  const updatedVaultItems = await client.query(`update public.vault_items vi set card_id = m.new_id, gv_id = cp_new.gv_id from tmp_2012bw_collapse_map m join public.card_prints cp_new on cp_new.id = m.new_id where vi.card_id = m.old_id`);

  const fkAfter = await loadBatchFkCounts(client);
  const remaining = Object.entries(fkAfter).filter(([, count]) => count > 0).map(([table_ref, row_count]) => ({ table_ref, row_count }));
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

async function loadPostValidation(client, fkInventory, activeIdentityTotalBefore) {
  const remainingOldReferences = await loadFkCounts(client, fkInventory, `select old_id from tmp_2012bw_collapse_map`);
  const summary = await queryOne(
    client,
    `
      with unresolved_after as (
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.is_active = true and cpi.identity_domain = $1 and cpi.set_code_identity = $2 and cp.gv_id is null
      ),
      target_identity as (
        select count(cpi.id)::int as any_identity_rows, count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from tmp_2012bw_collapse_map m
        left join public.card_print_identity cpi on cpi.card_print_id = m.new_id
      ),
      route_rows as (
        select count(*)::int as row_count from public.card_prints where id in (select new_id from tmp_2012bw_collapse_map) and gv_id is not null
      ),
      active_identity_total as (
        select count(*)::int as row_count from public.card_print_identity where is_active = true
      )
      select
        (select count(*)::int from public.card_prints where id in (select old_id from tmp_2012bw_collapse_map)) as remaining_old_parent_rows,
        (select row_count from unresolved_after) as remaining_unresolved_null_gvid_rows_for_2012bw,
        (select count(*)::int from public.card_prints where set_code = $3 and gv_id is not null) as canonical_target_count,
        (select count(*)::int from tmp_2012bw_collapse_map m join public.card_prints cp on cp.id = m.new_id where cp.gv_id is distinct from m.new_gv_id) as target_gv_id_drift_count,
        (select any_identity_rows from target_identity) as target_any_identity_rows,
        (select active_identity_rows from target_identity) as target_active_identity_rows,
        (select row_count from route_rows) as route_resolvable_target_rows,
        (select row_count from active_identity_total) as active_identity_total_after,
        $4::int as active_identity_total_before
    `,
    [TARGET_IDENTITY_DOMAIN, SOURCE_SET_CODE_IDENTITY, TARGET_SET_CODE, activeIdentityTotalBefore],
  );
  return { summary, remaining_old_references: remainingOldReferences };
}

function assertPostValidation(postValidation, deletedOldParentRows) {
  const remainingReferences = postValidation.remaining_old_references.filter((row) => row.row_count > 0);
  if (remainingReferences.length > 0) {
    throw new Error(`POST_VALIDATION_OLD_REFERENCES:${JSON.stringify(remainingReferences)}`);
  }
  assertEqual(deletedOldParentRows, EXPECTED.mapCount, 'DELETED_OLD_PARENT_COUNT_DRIFT');
  assertZero(postValidation.summary?.remaining_old_parent_rows, 'REMAINING_OLD_PARENT_ROWS');
  assertZero(postValidation.summary?.remaining_unresolved_null_gvid_rows_for_2012bw, 'REMAINING_UNRESOLVED_NULL_GVID_ROWS_FOR_2012BW');
  assertEqual(normalizeCount(postValidation.summary?.canonical_target_count), EXPECTED.canonicalTargetCount, 'CANONICAL_TARGET_COUNT_AFTER_DRIFT');
  assertZero(postValidation.summary?.target_gv_id_drift_count, 'TARGET_GV_ID_DRIFT_COUNT');
  assertEqual(normalizeCount(postValidation.summary?.target_any_identity_rows), EXPECTED.mapCount, 'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.target_active_identity_rows), EXPECTED.mapCount, 'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.route_resolvable_target_rows), EXPECTED.mapCount, 'ROUTE_RESOLVABLE_TARGET_ROWS_DRIFT');
  assertEqual(normalizeCount(postValidation.summary?.active_identity_total_after), normalizeCount(postValidation.summary?.active_identity_total_before), 'ACTIVE_IDENTITY_TOTAL_DRIFT');
}

async function loadSampleAfterRows(client, sampleRowsBefore) {
  const loadOne = async (sample) => {
    if (!sample) {
      return null;
    }
    const row = await queryOne(
      client,
      `select exists (select 1 from public.card_prints where id = $1) as old_parent_still_exists, new_cp.id as new_id, new_cp.name as new_name, new_cp.number as new_number, new_cp.set_code as new_set_code, new_cp.gv_id as new_gv_id, count(cpi.id)::int as identity_row_count_on_new_parent, count(*) filter (where cpi.is_active = true)::int as active_identity_row_count_on_new_parent from public.card_prints new_cp left join public.card_print_identity cpi on cpi.card_print_id = new_cp.id where new_cp.id = $2 group by new_cp.id, new_cp.name, new_cp.number, new_cp.set_code, new_cp.gv_id`,
      [sample.old_id, sample.new_id],
    );
    return { ...sample, ...row };
  };
  return { first: await loadOne(sampleRowsBefore.first), middle: await loadOne(sampleRowsBefore.middle), last: await loadOne(sampleRowsBefore.last) };
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
    sample_rows_before: null,
    fk_inventory: null,
    collision_summary: null,
    canonical_count_before: null,
    active_identity_total_before: null,
    batch: null,
    fk_movement_summary: null,
    deleted_old_parent_rows: 0,
    post_validation: null,
    sample_rows_after: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `2012bw_alias_collapse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempCollapseSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);
    report.sample_rows_before = await loadSampleMapRows(client);

    const fkInventory = await loadCardPrintFkInventory(client);
    report.fk_inventory = await loadFkCounts(client, fkInventory, `select old_id from tmp_2012bw_collapse_map`);
    assertNoUnexpectedReferencedTables(report.fk_inventory);

    report.collision_summary = await loadCollisionSummary(client);
    assertCollisionSummary(report.collision_summary);

    report.canonical_count_before = await loadCanonicalCount(client);
    assertEqual(normalizeCount(report.canonical_count_before?.canonical_target_count), EXPECTED.canonicalTargetCount, 'CANONICAL_TARGET_COUNT_BEFORE_DRIFT');
    report.active_identity_total_before = await loadActiveIdentityCount(client);

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.batch = await applySingleBatch(client);
    report.fk_movement_summary = report.batch.operations;

    const deletedParents = await client.query(`delete from public.card_prints cp using tmp_2012bw_collapse_map m where cp.id = m.old_id`);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;

    report.post_validation = await loadPostValidation(client, fkInventory, report.active_identity_total_before);
    assertPostValidation(report.post_validation, report.deleted_old_parent_rows);
    report.sample_rows_after = await loadSampleAfterRows(client, report.sample_rows_before);

    for (const label of ['first', 'middle', 'last']) {
      const sample = report.sample_rows_after?.[label];
      if (!sample) {
        throw new Error(`MISSING_SAMPLE_AFTER:${label}`);
      }
      if (sample.old_parent_still_exists !== false) {
        throw new Error(`SAMPLE_OLD_PARENT_STILL_EXISTS:${label}:${sample.old_id}`);
      }
      if (sample.new_gv_id !== report.sample_rows_before?.[label]?.new_gv_id) {
        throw new Error(`SAMPLE_TARGET_GV_ID_DRIFT:${label}`);
      }
      if (sample.active_identity_row_count_on_new_parent !== 1) {
        throw new Error(`SAMPLE_ACTIVE_IDENTITY_COUNT_DRIFT:${label}:${sample.active_identity_row_count_on_new_parent}`);
      }
    }

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original failure.
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
