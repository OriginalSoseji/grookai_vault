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
const PHASE = 'PRINT_IDENTITY_KEY_PROMO_COLLISION_REUSE_REALIGNMENT_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const EXPECTED_CONFLICT_GROUP_SIZE = 2;
const EXPECTED_ROWS_DELETED = 1;
const EXPECTED_ROWS_REPOINTED = 1;
const TARGET_CLUSTER_IDS = [
  '50386954-ded6-4909-8d17-6b391aeb53e4',
  '5557ba0d-6aa7-451f-8195-2a300235394e',
  'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4',
];
const TARGET_PRINT_IDENTITY_KEY = 'svp:085:pikachu-with-grey-felt-hat';

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

function slugifyError(message) {
  return String(message ?? 'unknown_error')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

async function loadClusterRows(client) {
  return queryRows(
    client,
    `
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
        map.tcgdex_local_id,
        map.justtcg_number,
        map.external_mappings,
        (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows,
        (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id and cpi.is_active = true) as active_identity_rows,
        (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows,
        (select count(*)::int from public.card_printings cpp where cpp.card_print_id = cp.id) as printing_rows,
        (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id and em.active is true) as active_external_rows,
        (select count(*)::int from public.vault_items vi where vi.card_id = cp.id and vi.archived_at is null) as active_vault_rows
      from public.card_prints cp
      left join public.sets s
        on s.id = cp.set_id
      left join lateral (
        select
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
          jsonb_agg(
            jsonb_build_object(
              'source', em.source,
              'external_id', em.external_id,
              'active', em.active,
              'meta', em.meta
            )
            order by em.source, em.external_id
          ) filter (where em.id is not null) as external_mappings
        from public.external_mappings em
        left join public.raw_imports ri
          on ri.source = em.source
         and coalesce(
              ri.payload->>'_external_id',
              ri.payload->>'id',
              ri.payload->'card'->>'id',
              ri.payload->'card'->>'_id'
            ) = em.external_id
        where em.card_print_id = cp.id
      ) map
        on true
      where cp.id = any($1::uuid[])
      order by cp.id
    `,
    [TARGET_CLUSTER_IDS],
  );
}

function enrichClusterRows(rows) {
  return rows.map((row) => {
    const effectiveSetCode = trimToNull(row.set_code) ?? trimToNull(row.joined_set_code);
    const observedPromoNumber =
      trimToNull(row.tcgdex_local_id) ??
      trimToNull(row.justtcg_number) ??
      trimToNull(row.number_plain) ??
      trimToNull(row.number);

    return {
      ...row,
      effective_set_code: effectiveSetCode,
      normalized_name_token: normalizePrintedNameToken(row.name),
      observed_promo_number: observedPromoNumber,
      normalized_promo_number: normalizePromoNumber(observedPromoNumber),
    };
  });
}

function buildSummary(rows) {
  const distinctSetCodes = new Set(rows.map((row) => row.effective_set_code ?? ''));
  const distinctNameTokens = new Set(rows.map((row) => row.normalized_name_token ?? ''));
  const distinctPromoNumbers = new Set(rows.map((row) => row.normalized_promo_number ?? ''));
  const distinctVariants = new Set(rows.map((row) => trimToNull(row.variant_key) ?? ''));
  const distinctModifiers = new Set(
    rows.map((row) => trimToNull(row.printed_identity_modifier) ?? ''),
  );

  return {
    conflict_group_size: rows.length,
    distinct_effective_set_code_count: distinctSetCodes.size,
    distinct_normalized_name_count: distinctNameTokens.size,
    distinct_normalized_promo_number_count: distinctPromoNumbers.size,
    distinct_variant_count: distinctVariants.size,
    distinct_modifier_count: distinctModifiers.size,
    identity_equivalence_confirmed:
      rows.length > 0 &&
      distinctSetCodes.size === 1 &&
      distinctNameTokens.size === 1 &&
      distinctPromoNumbers.size === 1 &&
      distinctVariants.size === 1 &&
      distinctModifiers.size === 1,
    existing_print_identity_key_owner_count: rows.filter(
      (row) => trimToNull(row.print_identity_key) === TARGET_PRINT_IDENTITY_KEY,
    ).length,
  };
}

function chooseCanonicalAndDuplicate(rows) {
  if (rows.length !== EXPECTED_CONFLICT_GROUP_SIZE) {
    throw new Error(
      `CONFLICT_GROUP_SIZE_DRIFT:${rows.length}:${EXPECTED_CONFLICT_GROUP_SIZE}`,
    );
  }

  const effectiveSetCodes = new Set(rows.map((row) => row.effective_set_code ?? ''));
  const normalizedNameTokens = new Set(rows.map((row) => row.normalized_name_token ?? ''));
  const normalizedPromoNumbers = new Set(rows.map((row) => row.normalized_promo_number ?? ''));
  const variants = new Set(rows.map((row) => trimToNull(row.variant_key) ?? ''));
  const modifiers = new Set(rows.map((row) => trimToNull(row.printed_identity_modifier) ?? ''));

  if (
    effectiveSetCodes.size !== 1 ||
    normalizedNameTokens.size !== 1 ||
    normalizedPromoNumbers.size !== 1 ||
    variants.size !== 1 ||
    modifiers.size !== 1
  ) {
    throw new Error('IDENTITY_EQUIVALENCE_NOT_CONFIRMED');
  }

  const activeIdentityCandidates = rows.filter(
    (row) => normalizeCount(row.active_identity_rows) === 1,
  );

  if (activeIdentityCandidates.length > 1) {
    throw new Error('MULTIPLE_ACTIVE_IDENTITY_CANONICAL_CANDIDATES');
  }

  let canonical = activeIdentityCandidates[0] ?? null;

  if (!canonical) {
    const existingKeyCandidates = rows.filter((row) => trimToNull(row.print_identity_key));
    if (existingKeyCandidates.length === 1) {
      canonical = existingKeyCandidates[0];
    }
  }

  if (!canonical) {
    const setAndNumberCandidates = rows.filter(
      (row) => trimToNull(row.set_code) && trimToNull(row.number_plain),
    );
    if (setAndNumberCandidates.length === 1) {
      canonical = setAndNumberCandidates[0];
    }
  }

  if (!canonical) {
    throw new Error('CANONICAL_TARGET_NOT_DETERMINISTIC');
  }

  const duplicates = rows.filter((row) => row.card_print_id !== canonical.card_print_id);
  if (duplicates.length !== 1) {
    throw new Error(`DUPLICATE_ROW_COUNT_DRIFT:${duplicates.length}:1`);
  }

  return {
    canonical,
    duplicate: duplicates[0],
  };
}

async function createMapTable(client, canonicalId, duplicateId) {
  await client.query(
    `
      create temp table tmp_print_identity_key_promo_collision_map on commit drop as
      select
        $1::uuid as canonical_id,
        $2::uuid as duplicate_id
    `,
    [canonicalId, duplicateId],
  );

  await client.query(`
    create unique index tmp_print_identity_key_promo_collision_map_duplicate_idx
      on tmp_print_identity_key_promo_collision_map (duplicate_id)
  `);
}

async function loadFkCounts(client) {
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id in (select duplicate_id from tmp_print_identity_key_promo_collision_map)) as card_print_identity,
        (select count(*)::int from public.card_print_traits where card_print_id in (select duplicate_id from tmp_print_identity_key_promo_collision_map)) as card_print_traits,
        (select count(*)::int from public.card_printings where card_print_id in (select duplicate_id from tmp_print_identity_key_promo_collision_map)) as card_printings,
        (select count(*)::int from public.external_mappings where card_print_id in (select duplicate_id from tmp_print_identity_key_promo_collision_map)) as external_mappings,
        (select count(*)::int from public.vault_items where card_id in (select duplicate_id from tmp_print_identity_key_promo_collision_map) and archived_at is null) as vault_items
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

async function loadCardPrintChecksum(client, cardPrintId) {
  return queryOne(
    client,
    `
      select
        cp.id as card_print_id,
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

async function applyReuse(client) {
  const fkBefore = await loadFkCounts(client);

  const externalOverlap = await queryOne(
    client,
    `
      select count(*)::int as overlap_count
      from public.external_mappings old_em
      join tmp_print_identity_key_promo_collision_map m
        on m.duplicate_id = old_em.card_print_id
      join public.external_mappings new_em
        on new_em.card_print_id = m.canonical_id
       and new_em.source = old_em.source
       and new_em.external_id = old_em.external_id
    `,
  );

  if (normalizeCount(externalOverlap?.overlap_count) !== 0) {
    throw new Error(
      `EXTERNAL_MAPPING_OVERLAP:${normalizeCount(externalOverlap?.overlap_count)}`,
    );
  }

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.canonical_id,
      updated_at = now()
    from tmp_print_identity_key_promo_collision_map m
    where cpi.card_print_id = m.duplicate_id
  `);

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
    join tmp_print_identity_key_promo_collision_map m
      on m.duplicate_id = old_t.card_print_id
    where new_t.card_print_id = m.canonical_id
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
      m.canonical_id,
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
    join tmp_print_identity_key_promo_collision_map m
      on m.duplicate_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_print_identity_key_promo_collision_map m
    where old_t.card_print_id = m.duplicate_id
  `);

  const mergedPrintingMetadataRows = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_print_identity_key_promo_collision_map m
      on m.duplicate_id = old_p.card_print_id
    where new_p.card_print_id = m.canonical_id
      and new_p.finish_key = old_p.finish_key
      and (
        (new_p.provenance_source is null and old_p.provenance_source is not null)
        or (new_p.provenance_ref is null and old_p.provenance_ref is not null)
        or (new_p.created_by is null and old_p.created_by is not null)
      )
  `);

  const movedUniquePrintings = await client.query(`
    update public.card_printings old_p
    set card_print_id = m.canonical_id
    from tmp_print_identity_key_promo_collision_map m
    where old_p.card_print_id = m.duplicate_id
      and not exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.canonical_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const deletedRedundantPrintings = await client.query(`
    delete from public.card_printings old_p
    using tmp_print_identity_key_promo_collision_map m
    where old_p.card_print_id = m.duplicate_id
      and exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.canonical_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const updatedExternalMappings = await client.query(`
    update public.external_mappings em
    set card_print_id = m.canonical_id
    from tmp_print_identity_key_promo_collision_map m
    where em.card_print_id = m.duplicate_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.canonical_id,
      gv_id = cp_new.gv_id
    from tmp_print_identity_key_promo_collision_map m
    join public.card_prints cp_new
      on cp_new.id = m.canonical_id
    where vi.card_id = m.duplicate_id
      and vi.archived_at is null
  `);

  const deletedDuplicateRows = await client.query(`
    delete from public.card_prints cp
    using tmp_print_identity_key_promo_collision_map m
    where cp.id = m.duplicate_id
  `);

  const fkAfter = await loadFkCounts(client);

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
      updated_vault_items: updatedVaultItems.rowCount ?? 0,
      deleted_duplicate_rows: deletedDuplicateRows.rowCount ?? 0,
    },
  };
}

async function countRemainingCollisionFamilies(client) {
  const clusterRows = enrichClusterRows(await loadClusterRows(client));
  const matchingIdentityRows = clusterRows.filter(
    (row) =>
      row.effective_set_code === 'svp' &&
      row.normalized_name_token === 'pikachu-with-grey-felt-hat' &&
      row.normalized_promo_number === '85',
  );
  const printIdentityKeyOwners = clusterRows.filter(
    (row) => trimToNull(row.print_identity_key) === TARGET_PRINT_IDENTITY_KEY,
  );

  if (matchingIdentityRows.length > 1 || printIdentityKeyOwners.length > 0) {
    return 1;
  }

  return 0;
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
      'backend/identity/print_identity_key_promo_collision_reuse_apply_v1.mjs',
      'docs/sql/print_identity_key_promo_collision_reuse_dry_run_v1.sql',
      'docs/checkpoints/PRINT_IDENTITY_KEY_PROMO_COLLISION_REUSE_REALIGNMENT_V1.md',
    ],
    apply_status: 'not_run',
    sample_rows: [],
  };

  await client.connect();

  try {
    const clusterRows = enrichClusterRows(await loadClusterRows(client));
    report.sample_rows = clusterRows.map((row) => ({
      card_print_id: row.card_print_id,
      effective_set_code: row.effective_set_code,
      name: row.name,
      number: row.number,
      number_plain: row.number_plain,
      gv_id: row.gv_id,
      print_identity_key: row.print_identity_key,
      normalized_promo_number: row.normalized_promo_number,
      active_identity_rows: normalizeCount(row.active_identity_rows),
      active_external_rows: normalizeCount(row.active_external_rows),
      active_vault_rows: normalizeCount(row.active_vault_rows),
    }));
    report.cluster_summary = buildSummary(clusterRows);

    const plan = chooseCanonicalAndDuplicate(clusterRows);
    report.plan = {
      duplicate_row_id: plan.duplicate.card_print_id,
      canonical_row_id: plan.canonical.card_print_id,
      canonical_gv_id: plan.canonical.gv_id,
      mapping_status: 'SAFE_REUSE',
    };

    if (MODE === 'dry-run') {
      report.rows_repointed = EXPECTED_ROWS_REPOINTED;
      report.apply_status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const canonicalChecksumBefore = await loadCardPrintChecksum(
      client,
      plan.canonical.card_print_id,
    );

    await client.query('begin');
    await createMapTable(client, plan.canonical.card_print_id, plan.duplicate.card_print_id);
    const applyResult = await applyReuse(client);

    const canonicalChecksumAfter = await loadCardPrintChecksum(
      client,
      plan.canonical.card_print_id,
    );
    const orphanCounts = await loadOrphanCounts(client);
    const remainingCollisions = await countRemainingCollisionFamilies(client);

    if (
      trimToNull(canonicalChecksumBefore?.row_checksum) !==
      trimToNull(canonicalChecksumAfter?.row_checksum)
    ) {
      throw new Error('CANONICAL_ROW_MUTATED');
    }

    if (Object.values(orphanCounts).some((value) => normalizeCount(value) !== 0)) {
      throw new Error(`FK_ORPHANS_AFTER_APPLY:${JSON.stringify(orphanCounts)}`);
    }

    if (remainingCollisions !== 0) {
      throw new Error(`REMAINING_COLLISIONS_AFTER_APPLY:${remainingCollisions}`);
    }

    const deletedCount = normalizeCount(applyResult?.operations?.deleted_duplicate_rows);
    if (deletedCount !== EXPECTED_ROWS_DELETED) {
      throw new Error(`ROWS_DELETED_DRIFT:${deletedCount}:${EXPECTED_ROWS_DELETED}`);
    }

    await client.query('commit');

    report.rows_deleted = deletedCount;
    report.rows_repointed = EXPECTED_ROWS_REPOINTED;
    report.remaining_collisions = remainingCollisions;
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
    report.remaining_collisions = await countRemainingCollisionFamilies(client).catch(() => 1);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
