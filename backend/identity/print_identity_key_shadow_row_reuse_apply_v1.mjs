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
const PHASE =
  'PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_SHADOW_ROW_REUSE_REALIGNMENT_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const EXPECTED_SHADOW_ROW_COUNT = 693;
const EXPECTED_REMAINING_BLOCKED_ROWS_AFTER = 639;
const MODERN_SET_CODES = [
  'sv02',
  'sv04',
  'sv04.5',
  'sv06',
  'sv06.5',
  'sv07',
  'sv08',
  'sv09',
  'sv10',
  'swsh10.5',
];
const SUPPORTED_FK_REFS = [
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'vault_items.card_id',
];

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

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

function normalizedNameSql(columnRef) {
  return `
    lower(
      regexp_replace(
        trim(
          both '-' from regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(coalesce(${columnRef}, ''), '’', '''', 'g'),
                      'δ',
                      ' delta ',
                      'g'
                    ),
                    '[★*]',
                    ' star ',
                    'g'
                  ),
                  '\\s+EX\\b',
                  '-ex',
                  'gi'
                ),
                '\\s+GX\\b',
                '-gx',
                'gi'
              ),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            ),
            '-+',
            '-',
            'g'
          )
        ),
        '(^-|-$)',
        '',
        'g'
      )
    )
  `;
}

async function createShadowMap(client) {
  await client.query(
    `
      create temp table tmp_pik_shadow_family on commit drop as
      select
        cp.id as shadow_id,
        cp.gv_id as shadow_gv_id,
        cp.set_id,
        s.code as shadow_set_code,
        cp.name as shadow_name,
        coalesce(cp.variant_key, '') as shadow_variant_key,
        em.external_id as tcgdex_external_id,
        ri.payload->'card'->>'localId' as tcgdex_number,
        regexp_replace(ri.payload->'card'->>'localId', '^0+(?!$)', '') as recovered_number_plain,
        ${normalizedNameSql('cp.name')} as shadow_normalized_name
      from public.card_prints cp
      join public.sets s
        on s.id = cp.set_id
      join public.external_mappings em
        on em.card_print_id = cp.id
       and em.source = 'tcgdex'
       and em.active is true
      join public.raw_imports ri
        on ri.source = 'tcgdex'
       and coalesce(
            ri.payload->>'_external_id',
            ri.payload->>'id',
            ri.payload->'card'->>'id',
            ri.payload->'card'->>'_id'
          ) = em.external_id
      where cp.gv_id is not null
        and cp.print_identity_key is null
        and (cp.set_code is null or btrim(cp.set_code) = '')
        and (cp.number is null or btrim(cp.number) = '')
        and (cp.number_plain is null or btrim(cp.number_plain) = '')
        and s.code = any($1::text[])
    `,
    [MODERN_SET_CODES],
  );

  await client.query(`
    create temp table tmp_pik_shadow_candidates on commit drop as
    select
      sf.shadow_id,
      sf.shadow_gv_id,
      sf.shadow_set_code,
      sf.shadow_name,
      sf.shadow_variant_key,
      sf.tcgdex_external_id,
      sf.tcgdex_number,
      sf.recovered_number_plain,
      cp2.id as canonical_id,
      cp2.gv_id as canonical_gv_id,
      cp2.name as canonical_name,
      cp2.number as canonical_number,
      cp2.number_plain as canonical_number_plain,
      coalesce(cp2.variant_key, '') as canonical_variant_key,
      ${normalizedNameSql('cp2.name')} as canonical_normalized_name
    from tmp_pik_shadow_family sf
    join public.card_prints cp2
      on cp2.set_id = sf.set_id
     and cp2.gv_id is not null
     and cp2.number_plain = sf.recovered_number_plain
     and coalesce(cp2.variant_key, '') = sf.shadow_variant_key
    where ${normalizedNameSql('cp2.name')} = sf.shadow_normalized_name
  `);

  await client.query(`
    create temp table tmp_pik_shadow_per_target on commit drop as
    select
      sf.shadow_id,
      sf.shadow_gv_id,
      sf.shadow_set_code,
      sf.shadow_name,
      sf.shadow_variant_key,
      sf.tcgdex_external_id,
      sf.tcgdex_number,
      sf.recovered_number_plain,
      count(c.canonical_id)::int as canonical_candidate_count,
      min(c.canonical_id::text)::uuid as canonical_id,
      min(c.canonical_gv_id) as canonical_gv_id
    from tmp_pik_shadow_family sf
    left join tmp_pik_shadow_candidates c
      on c.shadow_id = sf.shadow_id
    group by
      sf.shadow_id,
      sf.shadow_gv_id,
      sf.shadow_set_code,
      sf.shadow_name,
      sf.shadow_variant_key,
      sf.tcgdex_external_id,
      sf.tcgdex_number,
      sf.recovered_number_plain
  `);

  await client.query(`
    create temp table tmp_pik_shadow_map on commit drop as
    select
      shadow_id,
      shadow_gv_id,
      shadow_set_code,
      shadow_name,
      shadow_variant_key,
      tcgdex_external_id,
      tcgdex_number,
      recovered_number_plain,
      canonical_id,
      canonical_gv_id
    from tmp_pik_shadow_per_target
    where canonical_candidate_count = 1
  `);

  await client.query(`
    create unique index tmp_pik_shadow_map_shadow_id_idx
      on tmp_pik_shadow_map (shadow_id)
  `);
  await client.query(`
    create unique index tmp_pik_shadow_map_canonical_id_idx
      on tmp_pik_shadow_map (canonical_id)
  `);
}

async function loadPreconditions(client) {
  return queryOne(
    client,
    `
      with shadow_identity_summary as (
        select
          m.shadow_id,
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from tmp_pik_shadow_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.shadow_id
        group by m.shadow_id
      ),
      target_identity_summary as (
        select
          m.canonical_id,
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from tmp_pik_shadow_map m
        left join public.card_print_identity cpi
          on cpi.card_print_id = m.canonical_id
        group by m.canonical_id
      )
      select
        (select count(*)::int from tmp_pik_shadow_family) as modern_family_row_count,
        (select count(*)::int from tmp_pik_shadow_map) as shadow_row_count,
        (select count(distinct shadow_id)::int from tmp_pik_shadow_map) as distinct_shadow_count,
        (select count(distinct canonical_id)::int from tmp_pik_shadow_map) as distinct_canonical_count,
        (
          select count(*)::int
          from tmp_pik_shadow_per_target
          where canonical_candidate_count > 1
        ) as multi_target_count,
        (
          select count(*)::int
          from tmp_pik_shadow_map
          where canonical_id in (select shadow_id from tmp_pik_shadow_map)
        ) as shadow_to_shadow_target_count,
        (
          select count(*)::int
          from shadow_identity_summary
          where active_identity_rows <> 1
        ) as shadow_active_identity_conflict_count,
        (
          select count(*)::int
          from target_identity_summary
          where active_identity_rows <> 0
        ) as target_active_identity_conflict_count,
        (
          select count(*)::int
          from target_identity_summary
          where any_identity_rows <> 0
        ) as target_any_identity_conflict_count,
        (select count(*)::int from public.card_print_identity where card_print_id in (select shadow_id from tmp_pik_shadow_map)) as shadow_identity_rows,
        (select count(*)::int from public.card_print_identity where card_print_id in (select shadow_id from tmp_pik_shadow_map) and is_active = true) as shadow_active_identity_rows,
        (select count(*)::int from public.card_print_traits where card_print_id in (select shadow_id from tmp_pik_shadow_map)) as shadow_trait_rows,
        (
          select count(*)::int
          from public.card_print_traits old_t
          join tmp_pik_shadow_map m
            on m.shadow_id = old_t.card_print_id
          join public.card_print_traits new_t
            on new_t.card_print_id = m.canonical_id
           and new_t.trait_type = old_t.trait_type
           and new_t.trait_value = old_t.trait_value
           and new_t.source = old_t.source
        ) as trait_overlap_rows,
        (select count(*)::int from public.card_printings where card_print_id in (select shadow_id from tmp_pik_shadow_map)) as shadow_printing_rows,
        (
          select count(*)::int
          from public.card_printings old_p
          join tmp_pik_shadow_map m
            on m.shadow_id = old_p.card_print_id
          join public.card_printings new_p
            on new_p.card_print_id = m.canonical_id
           and new_p.finish_key = old_p.finish_key
        ) as printing_overlap_rows,
        (select count(*)::int from public.external_mappings where card_print_id in (select shadow_id from tmp_pik_shadow_map)) as shadow_external_rows,
        (
          select count(*)::int
          from public.external_mappings old_em
          join tmp_pik_shadow_map m
            on m.shadow_id = old_em.card_print_id
          join public.external_mappings new_em
            on new_em.card_print_id = m.canonical_id
           and new_em.source = old_em.source
           and new_em.external_id = old_em.external_id
        ) as external_overlap_rows,
        (select count(*)::int from public.vault_items where card_id in (select shadow_id from tmp_pik_shadow_map)) as shadow_vault_rows
    `,
  );
}

async function loadSupportedFkCounts(client) {
  return {
    'card_print_identity.card_print_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.card_print_identity
            where card_print_id in (select shadow_id from tmp_pik_shadow_map)
          `,
        )
      )?.row_count,
    ),
    'card_print_traits.card_print_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.card_print_traits
            where card_print_id in (select shadow_id from tmp_pik_shadow_map)
          `,
        )
      )?.row_count,
    ),
    'card_printings.card_print_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.card_printings
            where card_print_id in (select shadow_id from tmp_pik_shadow_map)
          `,
        )
      )?.row_count,
    ),
    'external_mappings.card_print_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.external_mappings
            where card_print_id in (select shadow_id from tmp_pik_shadow_map)
          `,
        )
      )?.row_count,
    ),
    'vault_items.card_id': normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.vault_items
            where card_id in (select shadow_id from tmp_pik_shadow_map)
          `,
        )
      )?.row_count,
    ),
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
    const refKey = `${fkRow.table_name}.${fkRow.column_name}`;
    const rowCount = normalizeCount(
      (
        await queryOne(
          client,
          `
            select count(*)::int as row_count
            from public.${fkRow.table_name}
            where ${fkRow.column_name} in (select shadow_id from tmp_pik_shadow_map)
          `,
        )
      )?.row_count,
    );

    refs.push({
      table_ref: refKey,
      supported: SUPPORTED_FK_REFS.includes(refKey),
      row_count: rowCount,
    });
  }

  return refs;
}

async function loadRemainingBlockedRows(client) {
  const row = await queryOne(
    client,
    `
      with blocker_surface as (
        select
          cp.id as card_print_id,
          cp.set_code,
          s.code as joined_set_code,
          cp.name,
          cp.number,
          cp.number_plain,
          coalesce(cp.variant_key, '') as variant_key,
          coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
          case
            when cp.set_code is not null and btrim(cp.set_code) <> '' then cp.set_code
            when s.code is not null and btrim(s.code) <> '' then s.code
            else null
          end as effective_set_code,
          case
            when cp.number_plain is not null and btrim(cp.number_plain) <> '' then cp.number_plain
            when cp.number is not null
              and regexp_replace(cp.number, '[^0-9]+', '', 'g') <> ''
              then regexp_replace(cp.number, '[^0-9]+', '', 'g')
            when cp.number is not null
              and btrim(cp.number) <> ''
              and trim(
                    both '-' from regexp_replace(
                      regexp_replace(trim(cp.number), '[^A-Za-z0-9]+', '-', 'g'),
                      '-+',
                      '-',
                      'g'
                    )
                  ) <> ''
              then lower(
                trim(
                  both '-' from regexp_replace(
                    regexp_replace(trim(cp.number), '[^A-Za-z0-9]+', '-', 'g'),
                    '-+',
                    '-',
                    'g'
                  )
                )
              )
            else null
          end as effective_number_plain,
          ${normalizedNameSql('cp.name')} as normalized_printed_name_token,
          case
            when coalesce(cp.variant_key, '') = '' then ''
            when cp.variant_key ~ '^[A-Za-z0-9_]+$' then lower(cp.variant_key)
            when s.code = 'ex10'
              and cp.name = 'Unown'
              and cp.number_plain is not null
              and btrim(cp.number_plain) <> ''
              and cp.variant_key = cp.number_plain
              then cp.variant_key
            else null
          end as normalized_variant_key,
          case
            when coalesce(cp.printed_identity_modifier, '') = '' then ''
            when cp.printed_identity_modifier ~ '^[a-z0-9_]+$' then cp.printed_identity_modifier
            else null
          end as normalized_printed_identity_modifier
        from public.card_prints cp
        left join public.sets s
          on s.id = cp.set_id
        where cp.gv_id is not null
          and cp.print_identity_key is null
          and (
            cp.set_code is null
            or btrim(cp.set_code) = ''
            or cp.number_plain is null
            or btrim(cp.number_plain) = ''
            or cp.name is null
            or btrim(cp.name) = ''
            or (
              coalesce(cp.variant_key, '') <> ''
              and cp.variant_key !~ '^[A-Za-z0-9_]+$'
            )
            or (
              coalesce(cp.printed_identity_modifier, '') <> ''
              and cp.printed_identity_modifier !~ '^[a-z0-9_]+$'
            )
          )
      )
      select count(*)::int as blocked_row_count
      from blocker_surface
      where not (
        effective_set_code is not null
        and effective_number_plain is not null
        and normalized_printed_name_token is not null
        and normalized_printed_name_token <> ''
        and normalized_variant_key is not null
        and normalized_printed_identity_modifier is not null
      )
    `,
  );

  return normalizeCount(row?.blocked_row_count);
}

async function loadTargetIdentitySummary(client) {
  return queryOne(
    client,
    `
      select
        count(distinct m.canonical_id)::int as target_row_count,
        count(cpi.id)::int as any_identity_rows,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from tmp_pik_shadow_map m
      left join public.card_print_identity cpi
        on cpi.card_print_id = m.canonical_id
    `,
  );
}

async function loadSnapshot(client, scopeSql) {
  return queryOne(
    client,
    `
      select
        count(*)::int as row_count,
        count(*) filter (where cp.gv_id is not null)::int as canonical_row_count,
        md5(
          string_agg(
            md5(
              concat_ws(
                '|',
                cp.id::text,
                coalesce(cp.gv_id, ''),
                cp.set_id::text,
                coalesce(cp.name, ''),
                coalesce(cp.number, ''),
                coalesce(cp.number_plain, ''),
                coalesce(cp.variant_key, ''),
                coalesce(cp.print_identity_key, '')
              )
            ),
            '' order by cp.id::text
          )
        ) as row_checksum
      from public.card_prints cp
      where cp.id in (${scopeSql})
    `,
  );
}

async function loadSurvivorSnapshot(client) {
  return queryOne(
    client,
    `
      select
        count(*)::int as row_count,
        count(*) filter (where cp.gv_id is not null)::int as canonical_row_count,
        md5(
          string_agg(
            md5(
              concat_ws(
                '|',
                cp.id::text,
                coalesce(cp.gv_id, ''),
                cp.set_id::text,
                coalesce(cp.name, ''),
                coalesce(cp.number, ''),
                coalesce(cp.number_plain, ''),
                coalesce(cp.variant_key, ''),
                coalesce(cp.print_identity_key, '')
              )
            ),
            '' order by cp.id::text
          )
        ) as row_checksum
      from public.card_prints cp
      where cp.id not in (select shadow_id from tmp_pik_shadow_map)
    `,
  );
}

async function loadActiveIdentityTotal(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_print_identity
      where is_active = true
    `,
  );

  return normalizeCount(row?.row_count);
}

async function loadDuplicateCanonicalGroupCount(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as duplicate_group_count
      from (
        select
          set_id,
          number_plain,
          coalesce(variant_key, '') as variant_key
        from public.card_prints
        where gv_id is not null
          and number_plain is not null
          and btrim(number_plain) <> ''
        group by
          set_id,
          number_plain,
          coalesce(variant_key, '')
        having count(*) > 1
      ) duplicate_groups
    `,
  );

  return normalizeCount(row?.duplicate_group_count);
}

async function loadOrphanCounts(client) {
  return queryOne(
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
}

async function loadSampleRows(client) {
  return queryRows(
    client,
    `
      select
        shadow_id,
        shadow_name,
        shadow_set_code,
        tcgdex_external_id,
        tcgdex_number,
        recovered_number_plain,
        canonical_id,
        canonical_gv_id
      from tmp_pik_shadow_map
      order by
        shadow_set_code,
        nullif(regexp_replace(recovered_number_plain, '[^0-9]+', '', 'g'), '')::int nulls last,
        shadow_name,
        shadow_id
      limit 5
    `,
  );
}

function assertPreconditions(preconditions, unsupportedRefs) {
  assertEqual(
    normalizeCount(preconditions?.shadow_row_count),
    EXPECTED_SHADOW_ROW_COUNT,
    'SHADOW_ROW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(preconditions?.distinct_shadow_count),
    EXPECTED_SHADOW_ROW_COUNT,
    'DISTINCT_SHADOW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(preconditions?.distinct_canonical_count),
    EXPECTED_SHADOW_ROW_COUNT,
    'DISTINCT_CANONICAL_COUNT_DRIFT',
  );
  assertZero(preconditions?.multi_target_count, 'MULTI_TARGET_COUNT_DRIFT');
  assertZero(preconditions?.shadow_to_shadow_target_count, 'SHADOW_TO_SHADOW_TARGET_COUNT_DRIFT');
  assertZero(
    preconditions?.shadow_active_identity_conflict_count,
    'SHADOW_ACTIVE_IDENTITY_CONFLICT_COUNT_DRIFT',
  );
  assertZero(
    preconditions?.target_active_identity_conflict_count,
    'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT_DRIFT',
  );
  assertZero(
    preconditions?.target_any_identity_conflict_count,
    'TARGET_ANY_IDENTITY_CONFLICT_COUNT_DRIFT',
  );
  assertZero(preconditions?.external_overlap_rows, 'EXTERNAL_OVERLAP_ROWS_DRIFT');

  const unsupportedNonZero = unsupportedRefs.filter(
    (ref) => !ref.supported && normalizeCount(ref.row_count) > 0,
  );
  if (unsupportedNonZero.length > 0) {
    throw new Error(
      `UNSUPPORTED_FK_REFERENCES_IN_SCOPE:${JSON.stringify(unsupportedNonZero)}`,
    );
  }
}

async function applyShadowReuse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.canonical_id,
      updated_at = now()
    from tmp_pik_shadow_map m
    where cpi.card_print_id = m.shadow_id
  `);

  const activeIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (
        select canonical_id from tmp_pik_shadow_map
      )
      group by cpi.card_print_id
      having count(*) filter (where cpi.is_active = true) <> 1
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
    join tmp_pik_shadow_map m
      on m.shadow_id = old_t.card_print_id
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
    join tmp_pik_shadow_map m
      on m.shadow_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_pik_shadow_map m
    where old_t.card_print_id = m.shadow_id
  `);

  const mergedPrintingMetadataRows = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_pik_shadow_map m
      on m.shadow_id = old_p.card_print_id
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
    from tmp_pik_shadow_map m
    where old_p.card_print_id = m.shadow_id
      and not exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.canonical_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const deletedRedundantPrintings = await client.query(`
    delete from public.card_printings old_p
    using tmp_pik_shadow_map m
    where old_p.card_print_id = m.shadow_id
      and exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.canonical_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const externalOverlapRow = await queryOne(
    client,
    `
      select count(*)::int as overlap_count
      from public.external_mappings old_em
      join tmp_pik_shadow_map m
        on m.shadow_id = old_em.card_print_id
      join public.external_mappings new_em
        on new_em.card_print_id = m.canonical_id
       and new_em.source = old_em.source
       and new_em.external_id = old_em.external_id
    `,
  );

  assertZero(externalOverlapRow?.overlap_count, 'EXTERNAL_MAPPING_OVERLAP_AFTER_DRIFT');

  const updatedExternalMappings = await client.query(`
    update public.external_mappings em
    set card_print_id = m.canonical_id
    from tmp_pik_shadow_map m
    where em.card_print_id = m.shadow_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.canonical_id,
      gv_id = cp_new.gv_id
    from tmp_pik_shadow_map m
    join public.card_prints cp_new
      on cp_new.id = m.canonical_id
    where vi.card_id = m.shadow_id
  `);

  const fkAfterRepoint = await loadSupportedFkCounts(client);
  const remainingOldReferences = Object.entries(fkAfterRepoint)
    .filter(([, rowCount]) => rowCount > 0)
    .map(([table_ref, row_count]) => ({ table_ref, row_count }));

  if (remainingOldReferences.length > 0) {
    throw new Error(
      `REMAINING_OLD_REFERENCES_AFTER_REPOINT:${JSON.stringify(remainingOldReferences)}`,
    );
  }

  const deletedShadowRows = await client.query(`
    delete from public.card_prints cp
    using tmp_pik_shadow_map m
    where cp.id = m.shadow_id
  `);

  return {
    fk_before: fkBefore,
    fk_after_repoint: fkAfterRepoint,
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
      deleted_shadow_rows: deletedShadowRows.rowCount ?? 0,
    },
  };
}

function buildRowsRepointedCount(preconditions) {
  return normalizeCount(preconditions?.shadow_row_count);
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    expected_counts: {
      shadow_rows: EXPECTED_SHADOW_ROW_COUNT,
      remaining_blocked_rows_after: EXPECTED_REMAINING_BLOCKED_ROWS_AFTER,
    },
    preconditions: null,
    unsupported_fk_references: [],
    remaining_blocked_rows_before: null,
    remaining_blocked_rows_after: null,
    active_identity_total_before: null,
    active_identity_total_after: null,
    duplicate_canonical_group_count_before: null,
    duplicate_canonical_group_count_after: null,
    target_snapshot_before: null,
    target_snapshot_after: null,
    survivor_snapshot_before: null,
    survivor_snapshot_after: null,
    target_identity_summary_before: null,
    target_identity_summary_after: null,
    orphan_counts_after: null,
    sample_rows: [],
    apply_operations: null,
    rows_repointed: 0,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    application_name: `${PHASE}:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    await createShadowMap(client);

    report.preconditions = await loadPreconditions(client);
    report.unsupported_fk_references = await loadUnsupportedFkReferences(client);
    report.remaining_blocked_rows_before = await loadRemainingBlockedRows(client);
    report.active_identity_total_before = await loadActiveIdentityTotal(client);
    report.duplicate_canonical_group_count_before =
      await loadDuplicateCanonicalGroupCount(client);
    report.target_identity_summary_before = await loadTargetIdentitySummary(client);
    report.target_snapshot_before = await loadSnapshot(
      client,
      'select canonical_id from tmp_pik_shadow_map',
    );
    report.survivor_snapshot_before = await loadSurvivorSnapshot(client);
    report.sample_rows = await loadSampleRows(client);
    report.rows_repointed = buildRowsRepointedCount(report.preconditions);

    assertPreconditions(report.preconditions, report.unsupported_fk_references);
    assertZero(
      report.duplicate_canonical_group_count_before,
      'DUPLICATE_CANONICAL_GROUP_COUNT_BEFORE',
    );

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.apply_operations = await applyShadowReuse(client);

    report.remaining_blocked_rows_after = await loadRemainingBlockedRows(client);
    report.active_identity_total_after = await loadActiveIdentityTotal(client);
    report.duplicate_canonical_group_count_after =
      await loadDuplicateCanonicalGroupCount(client);
    report.target_identity_summary_after = await loadTargetIdentitySummary(client);
    report.target_snapshot_after = await loadSnapshot(
      client,
      'select canonical_id from tmp_pik_shadow_map',
    );
    report.survivor_snapshot_after = await loadSurvivorSnapshot(client);
    report.orphan_counts_after = await loadOrphanCounts(client);

    assertEqual(
      normalizeCount(report.apply_operations?.operations?.deleted_shadow_rows),
      EXPECTED_SHADOW_ROW_COUNT,
      'DELETED_SHADOW_ROWS_DRIFT',
    );
    assertEqual(
      normalizeCount(report.rows_repointed),
      EXPECTED_SHADOW_ROW_COUNT,
      'ROWS_REPOINTED_DRIFT',
    );
    assertEqual(
      normalizeCount(report.remaining_blocked_rows_after),
      EXPECTED_REMAINING_BLOCKED_ROWS_AFTER,
      'REMAINING_BLOCKED_ROWS_AFTER_DRIFT',
    );
    assertEqual(
      normalizeCount(report.active_identity_total_after),
      normalizeCount(report.active_identity_total_before),
      'ACTIVE_IDENTITY_TOTAL_DRIFT',
    );
    assertZero(
      report.duplicate_canonical_group_count_after,
      'DUPLICATE_CANONICAL_GROUP_COUNT_AFTER',
    );

    assertEqual(
      normalizeCount(report.target_identity_summary_after?.target_row_count),
      EXPECTED_SHADOW_ROW_COUNT,
      'TARGET_ROW_COUNT_AFTER_DRIFT',
    );
    assertEqual(
      normalizeCount(report.target_identity_summary_after?.any_identity_rows),
      EXPECTED_SHADOW_ROW_COUNT,
      'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT',
    );
    assertEqual(
      normalizeCount(report.target_identity_summary_after?.active_identity_rows),
      EXPECTED_SHADOW_ROW_COUNT,
      'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
    );

    assertEqual(
      report.target_snapshot_after?.row_checksum ?? null,
      report.target_snapshot_before?.row_checksum ?? null,
      'TARGET_ROW_CHECKSUM_DRIFT',
    );
    assertEqual(
      report.survivor_snapshot_after?.row_checksum ?? null,
      report.survivor_snapshot_before?.row_checksum ?? null,
      'SURVIVOR_ROW_CHECKSUM_DRIFT',
    );
    assertEqual(
      normalizeCount(report.survivor_snapshot_after?.row_count),
      normalizeCount(report.survivor_snapshot_before?.row_count),
      'SURVIVOR_ROW_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(report.survivor_snapshot_after?.canonical_row_count),
      normalizeCount(report.survivor_snapshot_before?.canonical_row_count),
      'SURVIVOR_CANONICAL_ROW_COUNT_DRIFT',
    );

    assertZero(report.orphan_counts_after?.card_print_identity_orphans, 'CARD_PRINT_IDENTITY_ORPHANS');
    assertZero(report.orphan_counts_after?.card_print_traits_orphans, 'CARD_PRINT_TRAITS_ORPHANS');
    assertZero(report.orphan_counts_after?.card_printings_orphans, 'CARD_PRINTINGS_ORPHANS');
    assertZero(report.orphan_counts_after?.external_mappings_orphans, 'EXTERNAL_MAPPINGS_ORPHANS');
    assertZero(report.orphan_counts_after?.vault_items_orphans, 'VAULT_ITEMS_ORPHANS');

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
