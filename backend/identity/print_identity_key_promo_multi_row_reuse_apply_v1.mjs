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
const PHASE = 'PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_REUSE_REALIGNMENT_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const FAMILY_ROW_IDS = [
  '50386954-ded6-4909-8d17-6b391aeb53e4',
  '5557ba0d-6aa7-451f-8195-2a300235394e',
  'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4',
];
const EXPECTED_GROUP_SIZE = 3;
const EXPECTED_ROWS_DELETED = 2;
const EXPECTED_ROWS_REPOINTED = 2;
const SUPPORTED_FK_REFS = [
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'justtcg_variant_price_snapshots.card_print_id',
  'justtcg_variant_prices_latest.card_print_id',
  'justtcg_variants.card_print_id',
  'pricing_watch.card_print_id',
  'shared_cards.card_id',
  'slab_certs.card_print_id',
  'vault_items.card_id',
  'vault_item_instances.card_print_id',
];

function normalizeCount(value) {
  return Number(value ?? 0);
}

function trimToNull(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function slugifyError(message) {
  return String(message ?? 'unknown_error')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizePrintedNameToken(name) {
  return String(name ?? '')
    .replace(/[\u2018\u2019`´]/g, "'")
    .replace(/δ/gi, ' delta ')
    .replace(/[★*]/g, ' star ')
    .replace(/\s+EX\b/gi, '-ex')
    .replace(/\s+GX\b/gi, '-gx')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

function normalizePromoNumber(value) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D+/g, '');
  if (!digits) {
    return null;
  }

  const normalized = digits.replace(/^0+(?!$)/, '');
  return normalized === '' ? '0' : normalized;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

async function loadFamilyRows(client) {
  return queryRows(
    client,
    `
      with source_rollup as (
        select
          cp.id as card_print_id,
          max(
            case
              when em.source = 'tcgdex' and em.active is true
                then coalesce(
                  ri.payload->>'localId',
                  ri.payload->'card'->>'localId',
                  ri.payload->>'number',
                  ri.payload->'card'->>'number'
                )
              else null
            end
          ) as tcgdex_local_id,
          max(
            case
              when em.source = 'justtcg' and em.active is true
                then coalesce(em.meta->>'justtcg_number', ri.payload->>'number')
              else null
            end
          ) as justtcg_number,
          array_remove(
            array_agg(distinct case when em.active is true then em.source else null end),
            null
          ) as active_sources
        from public.card_prints cp
        left join public.external_mappings em
          on em.card_print_id = cp.id
        left join public.raw_imports ri
          on ri.source = em.source
         and coalesce(
              ri.payload->>'_external_id',
              ri.payload->>'id',
              ri.payload->'card'->>'id',
              ri.payload->'card'->>'_id'
            ) = em.external_id
        where cp.id = any($1::uuid[])
        group by cp.id
      ),
      identity_rollup as (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active is true)::int as active_identity_rows,
          max(cpi.set_code_identity) filter (where cpi.is_active is true) as set_code_identity,
          max(cpi.printed_number) filter (where cpi.is_active is true) as printed_number_identity,
          max(cpi.normalized_printed_name) filter (where cpi.is_active is true) as normalized_printed_name_identity
        from public.card_print_identity cpi
        where cpi.card_print_id = any($1::uuid[])
        group by cpi.card_print_id
      )
      select
        cp.id as card_print_id,
        cp.set_id,
        cp.set_code,
        s.code as joined_set_code,
        s.name as joined_set_name,
        cp.name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
        cp.gv_id,
        cp.print_identity_key,
        sr.tcgdex_local_id,
        sr.justtcg_number,
        sr.active_sources,
        coalesce(ir.active_identity_rows, 0) as active_identity_rows,
        ir.set_code_identity,
        ir.printed_number_identity,
        ir.normalized_printed_name_identity,
        (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows,
        (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows,
        (select count(*)::int from public.card_printings cpp where cpp.card_print_id = cp.id) as printing_rows,
        (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id and em.active is true) as active_external_rows,
        (select count(*)::int from public.vault_items vi where vi.card_id = cp.id) as vault_rows
      from public.card_prints cp
      left join public.sets s
        on s.id = cp.set_id
      left join source_rollup sr
        on sr.card_print_id = cp.id
      left join identity_rollup ir
        on ir.card_print_id = cp.id
      where cp.id = any($1::uuid[])
      order by cp.id
    `,
    [FAMILY_ROW_IDS],
  );
}

function classifyRow(row) {
  const effectiveSetCode = trimToNull(row.set_code) ?? trimToNull(row.joined_set_code);
  const observedPromoNumber =
    trimToNull(row.tcgdex_local_id) ??
    trimToNull(row.justtcg_number) ??
    trimToNull(row.number_plain) ??
    trimToNull(row.number);
  const normalizedNameToken = normalizePrintedNameToken(row.name);
  const normalizedPromoNumber = normalizePromoNumber(observedPromoNumber);

  let rowClassification = 'SHADOW_ROW';
  if (
    normalizeCount(row.active_identity_rows) === 1 &&
    effectiveSetCode === 'svp' &&
    normalizedPromoNumber === '85' &&
    trimToNull(row.set_code_identity) === 'svp' &&
    trimToNull(row.printed_number_identity) === '085' &&
    String(row.gv_id ?? '').startsWith('GV-PK-PR-SV-')
  ) {
    rowClassification = 'TRUE_CANONICAL';
  } else if (
    String(row.gv_id ?? '').startsWith('GV-PK-SVP-') ||
    (trimToNull(row.print_identity_key) && normalizeCount(row.active_identity_rows) === 0)
  ) {
    rowClassification = 'MALFORMED_ROW';
  }

  return {
    ...row,
    effective_set_code: effectiveSetCode,
    normalized_name_token: normalizedNameToken,
    observed_promo_number: observedPromoNumber,
    normalized_promo_number: normalizedPromoNumber,
    row_classification: rowClassification,
  };
}

function buildSummary(rows) {
  const distinctSetCodes = new Set(rows.map((row) => row.effective_set_code ?? ''));
  const distinctNameTokens = new Set(rows.map((row) => row.normalized_name_token ?? ''));
  const distinctPromoNumbers = new Set(rows.map((row) => row.normalized_promo_number ?? ''));
  const distinctVariants = new Set(rows.map((row) => row.variant_key ?? ''));
  const distinctModifiers = new Set(rows.map((row) => row.printed_identity_modifier ?? ''));

  return {
    group_size: rows.length,
    true_canonical_count: rows.filter((row) => row.row_classification === 'TRUE_CANONICAL').length,
    shadow_row_count: rows.filter((row) => row.row_classification === 'SHADOW_ROW').length,
    malformed_row_count: rows.filter((row) => row.row_classification === 'MALFORMED_ROW').length,
    distinct_effective_set_code_count: distinctSetCodes.size,
    distinct_normalized_name_count: distinctNameTokens.size,
    distinct_normalized_promo_number_count: distinctPromoNumbers.size,
    distinct_variant_count: distinctVariants.size,
    distinct_modifier_count: distinctModifiers.size,
    identity_equivalence_confirmed:
      rows.length === EXPECTED_GROUP_SIZE &&
      distinctSetCodes.size === 1 &&
      distinctNameTokens.size === 1 &&
      distinctPromoNumbers.size === 1 &&
      distinctVariants.size === 1 &&
      distinctModifiers.size === 1,
  };
}

function assertFamilySummary(summary) {
  if (summary.group_size !== EXPECTED_GROUP_SIZE) {
    throw new Error(`GROUP_SIZE_DRIFT:${summary.group_size}:${EXPECTED_GROUP_SIZE}`);
  }
  if (!summary.identity_equivalence_confirmed) {
    throw new Error('IDENTITY_EQUIVALENCE_NOT_CONFIRMED');
  }
  if (summary.true_canonical_count !== 1) {
    throw new Error(`TRUE_CANONICAL_COUNT_DRIFT:${summary.true_canonical_count}:1`);
  }
  if (summary.shadow_row_count !== 1) {
    throw new Error(`SHADOW_ROW_COUNT_DRIFT:${summary.shadow_row_count}:1`);
  }
  if (summary.malformed_row_count !== 1) {
    throw new Error(`MALFORMED_ROW_COUNT_DRIFT:${summary.malformed_row_count}:1`);
  }
}

function choosePlan(rows) {
  const canonical = rows.find((row) => row.row_classification === 'TRUE_CANONICAL');
  const oldRows = rows.filter((row) => row.row_classification !== 'TRUE_CANONICAL');

  if (!canonical) {
    throw new Error('CANONICAL_ROW_NOT_FOUND');
  }
  if (oldRows.length !== 2) {
    throw new Error(`NON_CANONICAL_COUNT_DRIFT:${oldRows.length}:2`);
  }

  return {
    canonical,
    oldRows,
  };
}

async function createMapTable(client, canonicalId, oldRows) {
  await client.query(`
    create temp table tmp_print_identity_key_promo_multi_map (
      old_id uuid not null primary key,
      new_id uuid not null,
      row_classification text not null
    ) on commit drop
  `);

  for (const row of oldRows) {
    await client.query(
      `
        insert into tmp_print_identity_key_promo_multi_map (old_id, new_id, row_classification)
        values ($1::uuid, $2::uuid, $3::text)
      `,
      [row.card_print_id, canonicalId, row.row_classification],
    );
  }
}

async function loadSupportedFkCounts(client) {
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as card_print_identity,
        (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as card_print_traits,
        (select count(*)::int from public.card_printings where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as card_printings,
        (select count(*)::int from public.external_mappings where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as external_mappings,
        (select count(*)::int from public.justtcg_variant_price_snapshots where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as justtcg_variant_price_snapshots,
        (select count(*)::int from public.justtcg_variant_prices_latest where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as justtcg_variant_prices_latest,
        (select count(*)::int from public.justtcg_variants where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as justtcg_variants,
        (select count(*)::int from public.pricing_watch where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as pricing_watch,
        (select count(*)::int from public.shared_cards where card_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as shared_cards,
        (select count(*)::int from public.slab_certs where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as slab_certs,
        (select count(*)::int from public.vault_items where card_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as vault_items
        ,
        (select count(*)::int from public.vault_item_instances where card_print_id in (select old_id from tmp_print_identity_key_promo_multi_map)) as vault_item_instances
    `,
  );

  return {
    'card_print_identity.card_print_id': normalizeCount(row?.card_print_identity),
    'card_print_traits.card_print_id': normalizeCount(row?.card_print_traits),
    'card_printings.card_print_id': normalizeCount(row?.card_printings),
    'external_mappings.card_print_id': normalizeCount(row?.external_mappings),
    'justtcg_variant_price_snapshots.card_print_id': normalizeCount(
      row?.justtcg_variant_price_snapshots,
    ),
    'justtcg_variant_prices_latest.card_print_id': normalizeCount(
      row?.justtcg_variant_prices_latest,
    ),
    'justtcg_variants.card_print_id': normalizeCount(row?.justtcg_variants),
    'pricing_watch.card_print_id': normalizeCount(row?.pricing_watch),
    'shared_cards.card_id': normalizeCount(row?.shared_cards),
    'slab_certs.card_print_id': normalizeCount(row?.slab_certs),
    'vault_items.card_id': normalizeCount(row?.vault_items),
    'vault_item_instances.card_print_id': normalizeCount(row?.vault_item_instances),
  };
}

async function loadUnsupportedFkReferences(client) {
  const fkRows = await queryRows(
    client,
    `
      select
        src.relname as table_name,
        att.attname as column_name
      from pg_constraint c
      join pg_class src
        on src.oid = c.conrelid
      join pg_namespace nsp
        on nsp.oid = src.relnamespace
      join pg_class tgt
        on tgt.oid = c.confrelid
      join pg_attribute att
        on att.attrelid = c.conrelid
       and att.attnum = c.conkey[1]
      where c.contype = 'f'
        and tgt.relname = 'card_prints'
        and nsp.nspname = 'public'
      order by src.relname, att.attname
    `,
  );

  const refs = [];

  for (const fkRow of fkRows) {
    const tableRef = `${fkRow.table_name}.${fkRow.column_name}`;
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${fkRow.table_name}
        where ${fkRow.column_name} in (select old_id from tmp_print_identity_key_promo_multi_map)
      `,
    );

    refs.push({
      table_ref: tableRef,
      supported: SUPPORTED_FK_REFS.includes(tableRef),
      row_count: normalizeCount(row?.row_count),
    });
  }

  return refs;
}

async function loadCardPrintChecksum(client, cardPrintId) {
  return queryOne(
    client,
    `
      select
        md5(
          concat_ws(
            '|',
            cp.id::text,
            cp.set_id::text,
            coalesce(cp.set_code, ''),
            coalesce(cp.name, ''),
            coalesce(cp.number, ''),
            coalesce(cp.number_plain, ''),
            coalesce(cp.variant_key, ''),
            coalesce(cp.printed_identity_modifier, ''),
            coalesce(cp.gv_id, ''),
            coalesce(cp.print_identity_key, '')
          )
        ) as row_checksum
      from public.card_prints cp
      where cp.id = $1::uuid
    `,
    [cardPrintId],
  );
}

async function loadOrphanCounts(client) {
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id not in (select id from public.card_prints)) as card_print_identity_orphans,
        (select count(*)::int from public.card_print_traits where card_print_id not in (select id from public.card_prints)) as card_print_traits_orphans,
        (select count(*)::int from public.card_printings where card_print_id not in (select id from public.card_prints)) as card_printings_orphans,
        (select count(*)::int from public.external_mappings where card_print_id not in (select id from public.card_prints)) as external_mappings_orphans,
        (select count(*)::int from public.vault_items where card_id not in (select id from public.card_prints)) as vault_items_orphans
    `,
  );

  return {
    card_print_identity: normalizeCount(row?.card_print_identity_orphans),
    card_print_traits: normalizeCount(row?.card_print_traits_orphans),
    card_printings: normalizeCount(row?.card_printings_orphans),
    external_mappings: normalizeCount(row?.external_mappings_orphans),
    vault_items: normalizeCount(row?.vault_items_orphans),
  };
}

async function loadRemainingFamilyCount(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_prints
      where id = any($1::uuid[])
    `,
    [FAMILY_ROW_IDS],
  );

  return normalizeCount(row?.row_count);
}

async function applyReuse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const externalOverlap = await queryOne(
    client,
    `
      select count(*)::int as overlap_count
      from public.external_mappings old_em
      join tmp_print_identity_key_promo_multi_map m
        on m.old_id = old_em.card_print_id
      join public.external_mappings new_em
        on new_em.card_print_id = m.new_id
       and new_em.source = old_em.source
       and new_em.external_id = old_em.external_id
    `,
  );

  if (normalizeCount(externalOverlap?.overlap_count) !== 0) {
    throw new Error(`EXTERNAL_MAPPING_OVERLAP:${normalizeCount(externalOverlap?.overlap_count)}`);
  }

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.new_id,
      updated_at = now()
    from tmp_print_identity_key_promo_multi_map m
    where cpi.card_print_id = m.old_id
  `);

  const activeIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active is true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (select distinct new_id from tmp_print_identity_key_promo_multi_map)
      group by cpi.card_print_id
      having count(*) filter (where cpi.is_active is true) <> 1
    `,
  );

  if (activeIdentityConflicts.length > 0) {
    throw new Error(
      `ACTIVE_IDENTITY_CONFLICT_AFTER_REPOINT:${JSON.stringify(activeIdentityConflicts)}`,
    );
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
    join tmp_print_identity_key_promo_multi_map m
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
    join tmp_print_identity_key_promo_multi_map m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_print_identity_key_promo_multi_map m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadataRows = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_print_identity_key_promo_multi_map m
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
    from tmp_print_identity_key_promo_multi_map m
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
    using tmp_print_identity_key_promo_multi_map m
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
    from tmp_print_identity_key_promo_multi_map m
    where em.card_print_id = m.old_id
  `);

  const updatedJustTcgVariantPriceSnapshots = await client.query(`
    update public.justtcg_variant_price_snapshots jvps
    set card_print_id = m.new_id
    from tmp_print_identity_key_promo_multi_map m
    where jvps.card_print_id = m.old_id
  `);

  const updatedJustTcgVariantPricesLatest = await client.query(`
    update public.justtcg_variant_prices_latest jvpl
    set card_print_id = m.new_id
    from tmp_print_identity_key_promo_multi_map m
    where jvpl.card_print_id = m.old_id
  `);

  const updatedJustTcgVariants = await client.query(`
    update public.justtcg_variants jv
    set card_print_id = m.new_id
    from tmp_print_identity_key_promo_multi_map m
    where jv.card_print_id = m.old_id
  `);

  await client.query(`
    create temp table tmp_print_identity_key_promo_multi_pricing_watch_survivors on commit drop as
    with pricing_watch_candidates as (
      select
        pw.id,
        pw.card_print_id,
        coalesce(m.new_id, pw.card_print_id) as resolved_card_print_id,
        pw.watch_reason,
        pw.priority,
        pw.next_run_at,
        pw.last_run_at,
        pw.backoff_until,
        case when m.old_id is null then 1 else 0 end as already_on_target
      from public.pricing_watch pw
      left join tmp_print_identity_key_promo_multi_map m
        on m.old_id = pw.card_print_id
      where pw.card_print_id in (
        select old_id from tmp_print_identity_key_promo_multi_map
        union
        select distinct new_id from tmp_print_identity_key_promo_multi_map
      )
    ),
    ranked as (
      select
        *,
        row_number() over (
          partition by resolved_card_print_id, watch_reason
          order by
            already_on_target desc,
            coalesce(next_run_at, last_run_at, backoff_until, 'epoch'::timestamptz) desc,
            priority desc,
            id desc
        ) as rn
      from pricing_watch_candidates
    )
    select
      id as survivor_id,
      resolved_card_print_id as new_id,
      watch_reason
    from ranked
    where rn = 1
  `);

  const updatedPricingWatch = await client.query(`
    update public.pricing_watch pw
    set card_print_id = s.new_id
    from tmp_print_identity_key_promo_multi_pricing_watch_survivors s
    where pw.id = s.survivor_id
      and pw.card_print_id <> s.new_id
  `);

  const deletedRedundantPricingWatch = await client.query(`
    delete from public.pricing_watch pw
    using tmp_print_identity_key_promo_multi_map m
    where pw.card_print_id = m.old_id
      and not exists (
        select 1
        from tmp_print_identity_key_promo_multi_pricing_watch_survivors s
        where s.survivor_id = pw.id
      )
  `);

  const sharedCardConflictRow = await queryOne(
    client,
    `
      select count(*)::int as conflict_count
      from public.shared_cards sc
      join tmp_print_identity_key_promo_multi_map m
        on m.old_id = sc.card_id
      join public.card_prints cp_new
        on cp_new.id = m.new_id
      join public.shared_cards existing
        on existing.user_id = sc.user_id
       and existing.id <> sc.id
       and (
         existing.card_id = m.new_id
         or existing.gv_id = cp_new.gv_id
       )
    `,
  );

  if (normalizeCount(sharedCardConflictRow?.conflict_count) !== 0) {
    throw new Error(`SHARED_CARD_CONFLICT:${normalizeCount(sharedCardConflictRow?.conflict_count)}`);
  }

  const updatedSharedCards = await client.query(`
    update public.shared_cards sc
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id,
      updated_at = now()
    from tmp_print_identity_key_promo_multi_map m
    join public.card_prints cp_new
      on cp_new.id = m.new_id
    where sc.card_id = m.old_id
  `);

  const updatedSlabCerts = await client.query(`
    update public.slab_certs sc
    set
      card_print_id = m.new_id,
      updated_at = now()
    from tmp_print_identity_key_promo_multi_map m
    where sc.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_print_identity_key_promo_multi_map m
    join public.card_prints cp_new
      on cp_new.id = m.new_id
    where vi.card_id = m.old_id
  `);

  const updatedVaultItemInstances = await client.query(`
    update public.vault_item_instances vii
    set
      card_print_id = m.new_id,
      updated_at = now()
    from tmp_print_identity_key_promo_multi_map m
    where vii.card_print_id = m.old_id
  `);

  const fkAfter = await loadSupportedFkCounts(client);
  const remainingOldReferences = Object.entries(fkAfter)
    .filter(([, rowCount]) => normalizeCount(rowCount) > 0)
    .map(([tableRef, rowCount]) => ({ table_ref: tableRef, row_count: normalizeCount(rowCount) }));

  if (remainingOldReferences.length > 0) {
    throw new Error(
      `REMAINING_OLD_REFERENCES_AFTER_REPOINT:${JSON.stringify(remainingOldReferences)}`,
    );
  }

  const deletedRows = await client.query(`
    delete from public.card_prints cp
    using tmp_print_identity_key_promo_multi_map m
    where cp.id = m.old_id
  `);

  return {
    fk_before: fkBefore,
    fk_after: fkAfter,
    operations: {
      updated_identity_rows: updatedIdentityRows.rowCount ?? 0,
      merged_trait_metadata_rows: mergedTraitMetadataRows.rowCount ?? 0,
      inserted_traits: insertedTraits.rowCount ?? 0,
      deleted_old_traits: deletedOldTraits.rowCount ?? 0,
      merged_printing_metadata_rows: mergedPrintingMetadataRows.rowCount ?? 0,
      moved_unique_printings: movedUniquePrintings.rowCount ?? 0,
      deleted_redundant_printings: deletedRedundantPrintings.rowCount ?? 0,
      updated_external_mappings: updatedExternalMappings.rowCount ?? 0,
      updated_justtcg_variant_price_snapshots:
        updatedJustTcgVariantPriceSnapshots.rowCount ?? 0,
      updated_justtcg_variant_prices_latest:
        updatedJustTcgVariantPricesLatest.rowCount ?? 0,
      updated_justtcg_variants: updatedJustTcgVariants.rowCount ?? 0,
      updated_pricing_watch: updatedPricingWatch.rowCount ?? 0,
      deleted_redundant_pricing_watch: deletedRedundantPricingWatch.rowCount ?? 0,
      updated_shared_cards: updatedSharedCards.rowCount ?? 0,
      updated_slab_certs: updatedSlabCerts.rowCount ?? 0,
      updated_vault_items: updatedVaultItems.rowCount ?? 0,
      updated_vault_item_instances: updatedVaultItemInstances.rowCount ?? 0,
      deleted_rows: deletedRows.rowCount ?? 0,
    },
  };
}

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  const report = {
    phase: PHASE,
    mode: MODE,
    rows_deleted: 0,
    rows_repointed: 0,
    remaining_collisions: 1,
    files_changed: [
      'backend/identity/print_identity_key_promo_multi_row_reuse_apply_v1.mjs',
      'docs/sql/print_identity_key_promo_multi_row_reuse_dry_run_v1.sql',
      'docs/checkpoints/PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_REUSE_REALIGNMENT_V1.md',
    ],
    apply_status: 'not_run',
    sample_rows: [],
  };

  await client.connect();

  try {
    const familyRows = (await loadFamilyRows(client)).map(classifyRow);
    const summary = buildSummary(familyRows);
    assertFamilySummary(summary);

    const plan = choosePlan(familyRows);
    report.sample_rows = familyRows.map((row) => ({
      card_print_id: row.card_print_id,
      row_classification: row.row_classification,
      gv_id: row.gv_id,
      effective_set_code: row.effective_set_code,
      number: row.number,
      number_plain: row.number_plain,
      print_identity_key: row.print_identity_key,
    }));
    report.summary = summary;
    report.plan = {
      canonical_row_id: plan.canonical.card_print_id,
      shadow_row_id: plan.oldRows.find((row) => row.row_classification === 'SHADOW_ROW')?.card_print_id ?? null,
      malformed_row_id: plan.oldRows.find((row) => row.row_classification === 'MALFORMED_ROW')?.card_print_id ?? null,
      mapping_status: 'SAFE_REUSE',
    };

    if (MODE === 'dry-run') {
      report.rows_repointed = EXPECTED_ROWS_REPOINTED;
      report.apply_status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    await client.query('begin');
    await createMapTable(client, plan.canonical.card_print_id, plan.oldRows);

    const unsupportedRefs = await loadUnsupportedFkReferences(client);
    const unsupportedNonZero = unsupportedRefs.filter(
      (ref) => !ref.supported && normalizeCount(ref.row_count) > 0,
    );
    if (unsupportedNonZero.length > 0) {
      throw new Error(`UNSUPPORTED_FK_REFERENCES_IN_SCOPE:${JSON.stringify(unsupportedNonZero)}`);
    }

    const canonicalChecksumBefore = await loadCardPrintChecksum(
      client,
      plan.canonical.card_print_id,
    );

    const applyResult = await applyReuse(client);

    const canonicalChecksumAfter = await loadCardPrintChecksum(
      client,
      plan.canonical.card_print_id,
    );
    const orphanCounts = await loadOrphanCounts(client);
    const remainingFamilyCount = await loadRemainingFamilyCount(client);

    if (
      trimToNull(canonicalChecksumBefore?.row_checksum) !==
      trimToNull(canonicalChecksumAfter?.row_checksum)
    ) {
      throw new Error('CANONICAL_ROW_MUTATED');
    }

    if (Object.values(orphanCounts).some((value) => normalizeCount(value) !== 0)) {
      throw new Error(`FK_ORPHANS_AFTER_APPLY:${JSON.stringify(orphanCounts)}`);
    }

    if (remainingFamilyCount !== 1) {
      throw new Error(`REMAINING_FAMILY_COUNT_DRIFT:${remainingFamilyCount}:1`);
    }

    const deletedRows = normalizeCount(applyResult?.operations?.deleted_rows);
    if (deletedRows !== EXPECTED_ROWS_DELETED) {
      throw new Error(`ROWS_DELETED_DRIFT:${deletedRows}:${EXPECTED_ROWS_DELETED}`);
    }

    await client.query('commit');

    report.rows_deleted = deletedRows;
    report.rows_repointed = EXPECTED_ROWS_REPOINTED;
    report.remaining_collisions = 0;
    report.apply_status = 'apply_passed';
    report.apply_result = applyResult;
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // no open transaction
    }

    report.apply_status = `failed_closed_on_${slugifyError(error.message)}`;
    report.error = error.message;
    report.remaining_collisions = 1;
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
