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
const PHASE = 'ECARD2_NAMESPACE_CANONICAL_REUSE_REALIGNMENT_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_SET_CODE = 'ecard2';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const TMP_UNRESOLVED = 'tmp_ecard2_namespace_reuse_unresolved_v1';
const TMP_CANDIDATES = 'tmp_ecard2_namespace_reuse_candidates_v1';
const TMP_CANDIDATE_COUNTS = 'tmp_ecard2_namespace_reuse_candidate_counts_v1';
const TMP_MAP = 'tmp_ecard2_namespace_reuse_map_v1';

const EXPECTED = {
  totalUnresolvedCount: 23,
  sourceCount: 13,
  outOfScopeUnresolvedCount: 10,
  ambiguousMappingCount: 0,
  reusedTargetCount: 0,
  canonicalCount: 184,
  sourceIdentityRows: 13,
  targetIdentityRowsBefore: 0,
  targetActiveIdentityRowsBefore: 0,
  sourceTraitRows: 13,
  targetTraitRowsBefore: 0,
  sourcePrintingRows: 26,
  targetPrintingRowsBefore: 26,
  sourceExternalRows: 13,
  targetExternalRowsBefore: 26,
  sourceVaultRows: 0,
  targetVaultRowsBefore: 0,
  printingOverlapCount: 26,
  printingMergeableMetadataOnlyCount: 26,
  printingConflictingNonIdenticalCount: 0,
  externalOverlapCount: 0,
  updatedIdentityRows: 13,
  insertedTraits: 13,
  deletedOldTraits: 13,
  mergedPrintingMetadataRows: 26,
  movedUniquePrintings: 0,
  deletedRedundantPrintings: 26,
  updatedExternalMappings: 13,
  updatedVaultItems: 0,
  deletedOldParents: 13,
  remainingUnresolvedRows: 10,
  remainingNamespaceCollisionRows: 0,
  remainingBlockedConflictRows: 10,
  targetAnyIdentityRowsAfter: 13,
  targetActiveIdentityRowsAfter: 13,
  targetTraitRowsAfter: 13,
  targetPrintingRowsAfter: 26,
  targetExternalRowsAfter: 39,
  targetVaultRowsAfter: 0,
  expectedSourceTokens: ['11', '12', '13', '15', '16', '17', '18', '19', '20', '25', '28', '30', '32'],
  expectedTargetGvIds: [
    'GV-PK-AQ-11',
    'GV-PK-AQ-12',
    'GV-PK-AQ-13',
    'GV-PK-AQ-15',
    'GV-PK-AQ-16',
    'GV-PK-AQ-17',
    'GV-PK-AQ-18',
    'GV-PK-AQ-19',
    'GV-PK-AQ-20',
    'GV-PK-AQ-25',
    'GV-PK-AQ-28',
    'GV-PK-AQ-30',
    'GV-PK-AQ-32',
  ],
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

function assertStringSetEqual(actual, expected, code) {
  const actualSorted = [...(actual ?? [])].map((value) => String(value)).sort();
  const expectedSorted = [...expected].map((value) => String(value)).sort();
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

async function buildTempReuseSurface(client) {
  await client.query(`
    drop table if exists ${TMP_UNRESOLVED};
    drop table if exists ${TMP_CANDIDATES};
    drop table if exists ${TMP_CANDIDATE_COUNTS};
    drop table if exists ${TMP_MAP};

    create temp table ${TMP_UNRESOLVED} on commit drop as
    select
      cp.id as old_id,
      cp.set_id,
      cp.name as old_name,
      coalesce(cp.variant_key, '') as proposed_variant_key,
      cpi.printed_number as old_printed_token,
      case
        when cpi.printed_number is null then null
        when cpi.printed_number ~ '^[A-Za-z][0-9]+$' then upper(cpi.printed_number)
        when cpi.printed_number ~ '[0-9]' then regexp_replace(regexp_replace(cpi.printed_number, '/.*$', ''), '[^A-Za-z0-9]', '', 'g')
        else cpi.printed_number
      end as proposed_number_plain,
      'GV-PK-' || upper(regexp_replace(s.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
        upper(regexp_replace(cpi.printed_number, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    join public.sets s
      on s.id = cp.set_id
    where cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${TARGET_SET_CODE}'
      and cpi.is_active = true
      and cp.gv_id is null;

    create temp table ${TMP_CANDIDATES} on commit drop as
    select
      u.old_id,
      u.set_id as old_set_id,
      u.old_name,
      u.old_printed_token,
      u.proposed_number_plain,
      u.proposed_variant_key,
      u.proposed_gv_id,
      cp.id as target_id,
      cp.set_id as target_set_id,
      cp.name as target_name,
      cp.number as target_number,
      cp.number_plain as target_number_plain,
      coalesce(cp.variant_key, '') as target_variant_key,
      cp.gv_id as target_gv_id,
      cp.set_code as target_set_code
    from ${TMP_UNRESOLVED} u
    join public.card_prints cp
      on cp.gv_id = u.proposed_gv_id
     and cp.set_id = u.set_id
     and lower(trim(cp.name)) = lower(trim(u.old_name))
     and coalesce(cp.number_plain, '') = coalesce(u.proposed_number_plain, '')
     and coalesce(cp.variant_key, '') = coalesce(u.proposed_variant_key, '');

    create temp table ${TMP_CANDIDATE_COUNTS} on commit drop as
    select
      u.old_id,
      count(c.target_id)::int as candidate_count
    from ${TMP_UNRESOLVED} u
    left join ${TMP_CANDIDATES} c
      on c.old_id = u.old_id
    group by u.old_id;

    create temp table ${TMP_MAP} on commit drop as
    select
      row_number() over (order by c.old_printed_token, c.old_id)::int as seq,
      c.old_id,
      c.old_name,
      c.old_printed_token,
      c.proposed_number_plain,
      c.proposed_variant_key,
      c.proposed_gv_id,
      c.target_id,
      c.target_name,
      c.target_number,
      c.target_number_plain,
      c.target_variant_key,
      c.target_gv_id,
      c.target_set_code
    from ${TMP_CANDIDATES} c
    join ${TMP_CANDIDATE_COUNTS} cc
      on cc.old_id = c.old_id
     and cc.candidate_count = 1;

    create unique index ${TMP_MAP}_old_uidx on ${TMP_MAP} (old_id);
    create unique index ${TMP_MAP}_target_uidx on ${TMP_MAP} (target_id);
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with reused_targets as (
        select target_id
        from ${TMP_MAP}
        group by target_id
        having count(*) > 1
      )
      select
        (select count(*)::int from ${TMP_UNRESOLVED}) as total_unresolved_count,
        (select count(*)::int from ${TMP_MAP}) as source_count,
        (
          select count(*)::int
          from ${TMP_UNRESOLVED}
          where old_id not in (select old_id from ${TMP_MAP})
        ) as out_of_scope_unresolved_count,
        (
          select count(*)::int
          from ${TMP_CANDIDATE_COUNTS}
          where candidate_count > 1
        ) as ambiguous_mapping_count,
        (select count(*)::int from reused_targets) as reused_target_count,
        (
          select count(*)::int
          from public.card_prints cp
          join public.sets s
            on s.id = cp.set_id
          where s.code = $1
            and cp.gv_id is not null
        ) as canonical_target_count,
        (
          select count(*)::int
          from public.card_print_identity
          where card_print_id in (select old_id from ${TMP_MAP})
        ) as source_identity_rows,
        (
          select count(*)::int
          from public.card_print_identity
          where card_print_id in (select target_id from ${TMP_MAP})
        ) as target_identity_rows_before,
        (
          select count(*)::int
          from public.card_print_identity
          where is_active = true
            and card_print_id in (select target_id from ${TMP_MAP})
        ) as target_active_identity_rows_before,
        (
          select count(*)::int
          from public.card_print_traits
          where card_print_id in (select old_id from ${TMP_MAP})
        ) as source_trait_rows,
        (
          select count(*)::int
          from public.card_print_traits
          where card_print_id in (select target_id from ${TMP_MAP})
        ) as target_trait_rows_before,
        (
          select count(*)::int
          from public.card_printings
          where card_print_id in (select old_id from ${TMP_MAP})
        ) as source_printing_rows,
        (
          select count(*)::int
          from public.card_printings
          where card_print_id in (select target_id from ${TMP_MAP})
        ) as target_printing_rows_before,
        (
          select count(*)::int
          from public.external_mappings
          where card_print_id in (select old_id from ${TMP_MAP})
        ) as source_external_rows,
        (
          select count(*)::int
          from public.external_mappings
          where card_print_id in (select target_id from ${TMP_MAP})
        ) as target_external_rows_before,
        (
          select count(*)::int
          from public.vault_items
          where card_id in (select old_id from ${TMP_MAP})
        ) as source_vault_rows,
        (
          select count(*)::int
          from public.vault_items
          where card_id in (select target_id from ${TMP_MAP})
        ) as target_vault_rows_before,
        (
          select array_agg(old_printed_token order by old_printed_token)
          from ${TMP_MAP}
        ) as source_tokens,
        (
          select array_agg(target_gv_id order by target_gv_id)
          from ${TMP_MAP}
        ) as target_gv_ids
    `,
    [TARGET_SET_CODE],
  );
}

function assertPreconditions(summary) {
  assertEqual(normalizeCount(summary?.total_unresolved_count), EXPECTED.totalUnresolvedCount, 'TOTAL_UNRESOLVED_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.source_count), EXPECTED.sourceCount, 'SOURCE_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.out_of_scope_unresolved_count),
    EXPECTED.outOfScopeUnresolvedCount,
    'OUT_OF_SCOPE_UNRESOLVED_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.ambiguous_mapping_count),
    EXPECTED.ambiguousMappingCount,
    'AMBIGUOUS_MAPPING_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.reused_target_count), EXPECTED.reusedTargetCount, 'REUSED_TARGET_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.canonical_target_count), EXPECTED.canonicalCount, 'CANONICAL_TARGET_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.source_identity_rows), EXPECTED.sourceIdentityRows, 'SOURCE_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.target_identity_rows_before), EXPECTED.targetIdentityRowsBefore, 'TARGET_IDENTITY_ROWS_BEFORE_DRIFT');
  assertEqual(
    normalizeCount(summary?.target_active_identity_rows_before),
    EXPECTED.targetActiveIdentityRowsBefore,
    'TARGET_ACTIVE_IDENTITY_ROWS_BEFORE_DRIFT',
  );
  assertEqual(normalizeCount(summary?.source_trait_rows), EXPECTED.sourceTraitRows, 'SOURCE_TRAIT_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.target_trait_rows_before), EXPECTED.targetTraitRowsBefore, 'TARGET_TRAIT_ROWS_BEFORE_DRIFT');
  assertEqual(normalizeCount(summary?.source_printing_rows), EXPECTED.sourcePrintingRows, 'SOURCE_PRINTING_ROWS_DRIFT');
  assertEqual(
    normalizeCount(summary?.target_printing_rows_before),
    EXPECTED.targetPrintingRowsBefore,
    'TARGET_PRINTING_ROWS_BEFORE_DRIFT',
  );
  assertEqual(normalizeCount(summary?.source_external_rows), EXPECTED.sourceExternalRows, 'SOURCE_EXTERNAL_ROWS_DRIFT');
  assertEqual(
    normalizeCount(summary?.target_external_rows_before),
    EXPECTED.targetExternalRowsBefore,
    'TARGET_EXTERNAL_ROWS_BEFORE_DRIFT',
  );
  assertEqual(normalizeCount(summary?.source_vault_rows), EXPECTED.sourceVaultRows, 'SOURCE_VAULT_ROWS_DRIFT');
  assertEqual(
    normalizeCount(summary?.target_vault_rows_before),
    EXPECTED.targetVaultRowsBefore,
    'TARGET_VAULT_ROWS_BEFORE_DRIFT',
  );
  assertStringSetEqual(summary?.source_tokens ?? [], EXPECTED.expectedSourceTokens, 'SOURCE_TOKENS_DRIFT');
  assertStringSetEqual(summary?.target_gv_ids ?? [], EXPECTED.expectedTargetGvIds, 'TARGET_GVIDS_DRIFT');
}

async function loadMapRows(client) {
  return queryRows(
    client,
    `
      select
        seq,
        old_id,
        old_name,
        old_printed_token,
        proposed_number_plain,
        proposed_variant_key,
        proposed_gv_id,
        target_id,
        target_name,
        target_number,
        target_number_plain,
        target_variant_key,
        target_gv_id,
        (target_id is not null)::boolean as identity_equivalence_confirmed
      from ${TMP_MAP}
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
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id in (select old_id from ${TMP_MAP})) as card_print_identity,
        (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from ${TMP_MAP})) as card_print_traits,
        (select count(*)::int from public.card_printings where card_print_id in (select old_id from ${TMP_MAP})) as card_printings,
        (select count(*)::int from public.external_mappings where card_print_id in (select old_id from ${TMP_MAP})) as external_mappings,
        (select count(*)::int from public.vault_items where card_id in (select old_id from ${TMP_MAP})) as vault_items
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
      with printing_conflicts as (
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
        join ${TMP_MAP} m
          on m.old_id = old_p.card_print_id
        join public.card_printings new_p
          on new_p.card_print_id = m.target_id
         and new_p.finish_key = old_p.finish_key
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from public.external_mappings old_em
        join ${TMP_MAP} m
          on m.old_id = old_em.card_print_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.target_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      )
      select
        (select count(*)::int from public.card_print_identity where card_print_id in (select old_id from ${TMP_MAP})) as old_identity_rows,
        (select count(*)::int from public.card_print_identity where card_print_id in (select target_id from ${TMP_MAP})) as target_identity_rows,
        (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from ${TMP_MAP})) as old_trait_rows,
        (select count(*)::int from public.card_print_traits where card_print_id in (select target_id from ${TMP_MAP})) as target_trait_rows,
        (select count(*)::int from public.card_printings where card_print_id in (select old_id from ${TMP_MAP})) as old_printing_rows,
        (select count(*)::int from public.card_printings where card_print_id in (select target_id from ${TMP_MAP})) as target_printing_rows,
        (select count(*)::int from public.external_mappings where card_print_id in (select old_id from ${TMP_MAP})) as old_external_rows,
        (select count(*)::int from public.external_mappings where card_print_id in (select target_id from ${TMP_MAP})) as target_external_rows,
        (select count(*)::int from public.vault_items where card_id in (select old_id from ${TMP_MAP})) as old_vault_rows,
        (select count(*)::int from public.vault_items where card_id in (select target_id from ${TMP_MAP})) as target_vault_rows,
        (select count(*)::int from printing_conflicts) as printing_overlap_count,
        (select count(*)::int from printing_conflicts where mergeable_metadata_only) as printing_mergeable_metadata_only_count,
        (select count(*)::int from printing_conflicts where conflicting_non_identical) as printing_conflicting_non_identical_count,
        (select row_count from external_conflicts) as external_overlap_count
    `,
  );
}

function assertCollisionSummary(summary) {
  assertEqual(normalizeCount(summary?.old_identity_rows), EXPECTED.sourceIdentityRows, 'OLD_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.target_identity_rows), EXPECTED.targetIdentityRowsBefore, 'TARGET_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.old_trait_rows), EXPECTED.sourceTraitRows, 'OLD_TRAIT_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.target_trait_rows), EXPECTED.targetTraitRowsBefore, 'TARGET_TRAIT_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.old_printing_rows), EXPECTED.sourcePrintingRows, 'OLD_PRINTING_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.target_printing_rows), EXPECTED.targetPrintingRowsBefore, 'TARGET_PRINTING_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.old_external_rows), EXPECTED.sourceExternalRows, 'OLD_EXTERNAL_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.target_external_rows), EXPECTED.targetExternalRowsBefore, 'TARGET_EXTERNAL_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.old_vault_rows), EXPECTED.sourceVaultRows, 'OLD_VAULT_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.target_vault_rows), EXPECTED.targetVaultRowsBefore, 'TARGET_VAULT_ROWS_DRIFT');
  assertEqual(normalizeCount(summary?.printing_overlap_count), EXPECTED.printingOverlapCount, 'PRINTING_OVERLAP_COUNT_DRIFT');
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
  assertEqual(normalizeCount(summary?.external_overlap_count), EXPECTED.externalOverlapCount, 'EXTERNAL_OVERLAP_COUNT_DRIFT');
}

async function loadCanonicalCount(client) {
  return queryOne(
    client,
    `
      select count(*)::int as canonical_target_count
      from public.card_prints cp
      join public.sets s
        on s.id = cp.set_id
      where s.code = $1
        and cp.gv_id is not null
    `,
    [TARGET_SET_CODE],
  );
}

async function applyReuse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.target_id,
      updated_at = now()
    from ${TMP_MAP} m
    where cpi.card_print_id = m.old_id
  `);

  const targetActiveIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (select target_id from ${TMP_MAP})
      group by cpi.card_print_id
      having count(*) filter (where cpi.is_active = true) <> 1
    `,
  );

  if (targetActiveIdentityConflicts.length > 0) {
    throw new Error(`ACTIVE_IDENTITY_CONFLICT_AFTER_REPOINT:${JSON.stringify(targetActiveIdentityConflicts)}`);
  }

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
      m.target_id,
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
    join ${TMP_MAP} m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using ${TMP_MAP} m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadataRows = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join ${TMP_MAP} m
      on m.old_id = old_p.card_print_id
    where new_p.card_print_id = m.target_id
      and new_p.finish_key = old_p.finish_key
      and (
        (new_p.provenance_source is null and old_p.provenance_source is not null)
        or (new_p.provenance_ref is null and old_p.provenance_ref is not null)
        or (new_p.created_by is null and old_p.created_by is not null)
      )
  `);

  const movedUniquePrintings = await client.query(`
    update public.card_printings old_p
    set card_print_id = m.target_id
    from ${TMP_MAP} m
    where old_p.card_print_id = m.old_id
      and not exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.target_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const deletedRedundantPrintings = await client.query(`
    delete from public.card_printings old_p
    using ${TMP_MAP} m
    where old_p.card_print_id = m.old_id
      and exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.target_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const updatedExternalMappings = await client.query(`
    update public.external_mappings em
    set card_print_id = m.target_id
    from ${TMP_MAP} m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.target_id,
      gv_id = cp_target.gv_id
    from ${TMP_MAP} m
    join public.card_prints cp_target
      on cp_target.id = m.target_id
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
      updated_identity_rows: normalizeCount(updatedIdentityRows.rowCount),
      inserted_traits: normalizeCount(insertedTraits.rowCount),
      deleted_old_traits: normalizeCount(deletedOldTraits.rowCount),
      merged_printing_metadata_rows: normalizeCount(mergedPrintingMetadataRows.rowCount),
      moved_unique_printings: normalizeCount(movedUniquePrintings.rowCount),
      deleted_redundant_printings: normalizeCount(deletedRedundantPrintings.rowCount),
      updated_external_mappings: normalizeCount(updatedExternalMappings.rowCount),
      updated_vault_items: normalizeCount(updatedVaultItems.rowCount),
    },
    fk_after: fkAfter,
  };
}

function assertApplyOperations(applyResult) {
  const operations = applyResult?.operations ?? {};
  assertEqual(normalizeCount(operations.updated_identity_rows), EXPECTED.updatedIdentityRows, 'UPDATED_IDENTITY_ROWS_DRIFT');
  assertEqual(normalizeCount(operations.inserted_traits), EXPECTED.insertedTraits, 'INSERTED_TRAITS_DRIFT');
  assertEqual(normalizeCount(operations.deleted_old_traits), EXPECTED.deletedOldTraits, 'DELETED_OLD_TRAITS_DRIFT');
  assertEqual(
    normalizeCount(operations.merged_printing_metadata_rows),
    EXPECTED.mergedPrintingMetadataRows,
    'MERGED_PRINTING_METADATA_ROWS_DRIFT',
  );
  assertEqual(normalizeCount(operations.moved_unique_printings), EXPECTED.movedUniquePrintings, 'MOVED_UNIQUE_PRINTINGS_DRIFT');
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

async function loadPostValidation(client, fkInventory) {
  const remainingOldReferences = await loadFkCounts(
    client,
    fkInventory,
    `select old_id from ${TMP_MAP}`,
  );

  const summary = await queryOne(
    client,
    `
      with unresolved_after as (
        select
          cp.id,
          cp.set_id,
          cp.name,
          coalesce(cp.variant_key, '') as proposed_variant_key,
          cpi.printed_number as printed_token,
          case
            when cpi.printed_number is null then null
            when cpi.printed_number ~ '^[A-Za-z][0-9]+$' then upper(cpi.printed_number)
            when cpi.printed_number ~ '[0-9]' then regexp_replace(regexp_replace(cpi.printed_number, '/.*$', ''), '[^A-Za-z0-9]', '', 'g')
            else cpi.printed_number
          end as proposed_number_plain,
          'GV-PK-' || upper(regexp_replace(s.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
            upper(regexp_replace(cpi.printed_number, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        join public.sets s
          on s.id = cp.set_id
        where cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cpi.is_active = true
          and cp.gv_id is null
      ),
      remaining_namespace as (
        select count(*)::int as row_count
        from unresolved_after u
        join public.card_prints cp
          on cp.gv_id = u.proposed_gv_id
         and cp.set_id = u.set_id
         and lower(trim(cp.name)) = lower(trim(u.name))
         and coalesce(cp.number_plain, '') = coalesce(u.proposed_number_plain, '')
         and coalesce(cp.variant_key, '') = coalesce(u.proposed_variant_key, '')
      ),
      target_identity as (
        select
          count(*)::int as any_identity_rows,
          count(*) filter (where is_active = true)::int as active_identity_rows
        from public.card_print_identity
        where card_print_id in (select target_id from ${TMP_MAP})
      ),
      target_active_identity_state as (
        select
          card_print_id,
          count(*) filter (where is_active = true)::int as active_identity_rows
        from public.card_print_identity
        where card_print_id in (select target_id from ${TMP_MAP})
        group by card_print_id
      ),
      target_gvid_drift as (
        select count(*)::int as row_count
        from ${TMP_MAP} m
        join public.card_prints cp
          on cp.id = m.target_id
        where cp.gv_id is distinct from m.target_gv_id
      )
      select
        (select count(*)::int from unresolved_after) as remaining_unresolved_rows,
        (select row_count from remaining_namespace) as remaining_namespace_collision_rows,
        (
          select count(*)::int
          from public.card_prints
          where id in (select old_id from ${TMP_MAP})
        ) as remaining_old_parent_rows,
        (
          select count(*)::int
          from public.card_prints cp
          join public.sets s
            on s.id = cp.set_id
          where s.code = $3
            and cp.gv_id is not null
        ) as canonical_target_count,
        (select any_identity_rows from target_identity) as target_any_identity_rows,
        (select active_identity_rows from target_identity) as target_active_identity_rows,
        (
          select count(*)::int
          from public.card_print_traits
          where card_print_id in (select target_id from ${TMP_MAP})
        ) as target_trait_rows,
        (
          select count(*)::int
          from public.card_printings
          where card_print_id in (select target_id from ${TMP_MAP})
        ) as target_printing_rows,
        (
          select count(*)::int
          from public.external_mappings
          where card_print_id in (select target_id from ${TMP_MAP})
        ) as target_external_rows,
        (
          select count(*)::int
          from public.vault_items
          where card_id in (select target_id from ${TMP_MAP})
        ) as target_vault_rows,
        (select row_count from target_gvid_drift) as target_gvid_drift_count,
        (
          select count(*)::int
          from target_active_identity_state
          where active_identity_rows <> 1
        ) as target_active_identity_conflict_count
    `,
    [TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE, TARGET_SET_CODE],
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

  assertEqual(deletedOldParentRows, EXPECTED.deletedOldParents, 'DELETED_OLD_PARENT_COUNT_DRIFT');
  assertEqual(
    normalizeCount(postValidation.summary?.remaining_unresolved_rows),
    EXPECTED.remainingUnresolvedRows,
    'REMAINING_UNRESOLVED_ROWS_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.remaining_namespace_collision_rows),
    EXPECTED.remainingNamespaceCollisionRows,
    'REMAINING_NAMESPACE_COLLISION_ROWS_DRIFT',
  );
  assertEqual(normalizeCount(postValidation.summary?.remaining_old_parent_rows), 0, 'REMAINING_OLD_PARENT_ROWS_DRIFT');
  assertEqual(
    normalizeCount(postValidation.summary?.canonical_target_count),
    EXPECTED.canonicalCount,
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
    normalizeCount(postValidation.summary?.target_trait_rows),
    EXPECTED.targetTraitRowsAfter,
    'TARGET_TRAIT_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_printing_rows),
    EXPECTED.targetPrintingRowsAfter,
    'TARGET_PRINTING_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_external_rows),
    EXPECTED.targetExternalRowsAfter,
    'TARGET_EXTERNAL_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_vault_rows),
    EXPECTED.targetVaultRowsAfter,
    'TARGET_VAULT_ROWS_AFTER_DRIFT',
  );
  assertZero(postValidation.summary?.target_gvid_drift_count, 'TARGET_GVID_DRIFT_COUNT');
  assertZero(postValidation.summary?.target_active_identity_conflict_count, 'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT');
}

async function loadSampleRows(client) {
  return queryRows(
    client,
    `
      select
        m.old_id,
        m.old_name,
        m.old_printed_token,
        m.target_id,
        m.target_gv_id,
        exists (
          select 1
          from public.card_prints old_cp
          where old_cp.id = m.old_id
        ) as old_parent_still_exists,
        (
          select count(*)::int
          from public.card_print_identity
          where card_print_id = m.target_id
            and is_active = true
        ) as target_active_identity_rows,
        (
          select count(*)::int
          from public.card_print_traits
          where card_print_id = m.target_id
        ) as target_trait_rows,
        (
          select count(*)::int
          from public.card_printings
          where card_print_id = m.target_id
        ) as target_printing_rows,
        (
          select count(*)::int
          from public.external_mappings
          where card_print_id = m.target_id
        ) as target_external_rows
      from ${TMP_MAP} m
      order by m.old_printed_token
      limit 3
    `,
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
    target_set_code: TARGET_SET_CODE,
    preconditions: null,
    reuse_rows: null,
    fk_inventory: null,
    collision_summary: null,
    canonical_count_before: null,
    apply_operations: null,
    deleted_old_parent_rows: 0,
    post_validation: null,
    sample_reuse_rows: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `ecard2_namespace_canonical_reuse_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempReuseSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);

    report.reuse_rows = await loadMapRows(client);
    if (report.reuse_rows.length !== EXPECTED.sourceCount) {
      throw new Error(`REUSE_ROW_COUNT_DRIFT:${report.reuse_rows.length}:${EXPECTED.sourceCount}`);
    }

    const fkInventory = await loadCardPrintFkInventory(client);
    const fkCounts = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from ${TMP_MAP}`,
    );
    assertNoUnexpectedReferencedTables(fkCounts);
    report.fk_inventory = await loadSupportedFkCounts(client);

    report.collision_summary = await loadCollisionSummary(client);
    assertCollisionSummary(report.collision_summary);

    report.canonical_count_before = await loadCanonicalCount(client);
    assertEqual(
      normalizeCount(report.canonical_count_before?.canonical_target_count),
      EXPECTED.canonicalCount,
      'CANONICAL_TARGET_COUNT_BEFORE_DRIFT',
    );

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.apply_operations = await applyReuse(client);
    assertApplyOperations(report.apply_operations);

    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using ${TMP_MAP} m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = normalizeCount(deletedParents.rowCount);

    report.post_validation = await loadPostValidation(client, fkInventory);
    assertPostValidation(report.post_validation, report.deleted_old_parent_rows);

    report.sample_reuse_rows = await loadSampleRows(client);
    for (const row of report.sample_reuse_rows) {
      if (row.old_parent_still_exists !== false) {
        throw new Error(`OLD_PARENT_STILL_EXISTS:${row.old_id}`);
      }
      if (normalizeCount(row.target_active_identity_rows) !== 1) {
        throw new Error(`TARGET_ACTIVE_IDENTITY_COUNT_DRIFT:${row.target_id}:${row.target_active_identity_rows}`);
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
