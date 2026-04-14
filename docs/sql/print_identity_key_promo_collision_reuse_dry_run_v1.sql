begin;

-- PRINT_IDENTITY_KEY_PROMO_COLLISION_REUSE_REALIGNMENT_V1
-- Dry-run only. No mutation.
--
-- The requested execution unit assumes a two-row conflict group. This query
-- proves the current live cluster before any FK movement is attempted.

with target_rows as (
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
    cp.print_identity_key
  from public.card_prints cp
  left join public.sets s
    on s.id = cp.set_id
  where cp.id in (
    '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid,
    '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid,
    'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4'::uuid
  )
),
mapping_rollup as (
  select
    tr.card_print_id,
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
  from target_rows tr
  left join public.external_mappings em
    on em.card_print_id = tr.card_print_id
  left join public.raw_imports ri
    on ri.source = em.source
   and coalesce(
        ri.payload->>'_external_id',
        ri.payload->>'id',
        ri.payload->'card'->>'id',
        ri.payload->'card'->>'_id'
      ) = em.external_id
  group by tr.card_print_id
),
enriched as (
  select
    tr.card_print_id,
    coalesce(nullif(tr.set_code, ''), nullif(tr.joined_set_code, '')) as effective_set_code,
    tr.name,
    tr.number,
    tr.number_plain,
    tr.variant_key,
    tr.printed_identity_modifier,
    tr.gv_id,
    tr.print_identity_key,
    mr.tcgdex_local_id,
    mr.justtcg_number,
    coalesce(
      nullif(mr.tcgdex_local_id, ''),
      nullif(mr.justtcg_number, ''),
      nullif(tr.number_plain, ''),
      nullif(tr.number, '')
    ) as observed_promo_number,
    nullif(
      regexp_replace(
        coalesce(
          nullif(mr.tcgdex_local_id, ''),
          nullif(mr.justtcg_number, ''),
          nullif(tr.number_plain, ''),
          nullif(tr.number, '')
        ),
        '\D',
        '',
        'g'
      ),
      ''
    ) as promo_number_digits,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(coalesce(tr.name, ''), '[’''`´]', '''', 'g'),
                'δ',
                ' delta ',
                'g'
              ),
              '[★*]',
              ' star ',
              'g'
            ),
            '\s+EX\b',
            '-ex',
            'gi'
          ),
          '\s+GX\b',
          '-gx',
          'gi'
        ),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      )
    ) as normalized_name_token,
    (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = tr.card_print_id and cpi.is_active is true) as active_identity_rows,
    (select count(*)::int from public.card_printings cpp where cpp.card_print_id = tr.card_print_id) as printing_rows,
    (select count(*)::int from public.external_mappings em where em.card_print_id = tr.card_print_id and em.active is true) as active_external_rows,
    (select count(*)::int from public.vault_items vi where vi.card_id = tr.card_print_id and vi.archived_at is null) as active_vault_rows,
    mr.external_mappings
  from target_rows tr
  left join mapping_rollup mr
    on mr.card_print_id = tr.card_print_id
),
summary as (
  select
    count(*)::int as conflict_group_size,
    count(distinct effective_set_code)::int as distinct_effective_set_code_count,
    count(distinct normalized_name_token)::int as distinct_normalized_name_count,
    count(distinct regexp_replace(coalesce(promo_number_digits, ''), '^0+(?!$)', ''))::int as distinct_normalized_promo_number_count,
    count(distinct variant_key)::int as distinct_variant_count,
    count(distinct printed_identity_modifier)::int as distinct_modifier_count,
    count(*) filter (where print_identity_key = 'svp:085:pikachu-with-grey-felt-hat')::int as existing_print_identity_key_owner_count
  from enriched
)
select
  e.card_print_id,
  e.effective_set_code,
  e.name,
  e.number,
  e.number_plain,
  e.variant_key,
  e.printed_identity_modifier,
  e.gv_id,
  e.print_identity_key,
  e.tcgdex_local_id,
  e.justtcg_number,
  e.observed_promo_number,
  regexp_replace(coalesce(e.promo_number_digits, ''), '^0+(?!$)', '') as normalized_promo_number_equivalence,
  e.active_identity_rows,
  e.printing_rows,
  e.active_external_rows,
  e.active_vault_rows,
  case
    when (select conflict_group_size from summary) = 2 then 'SAFE_REUSE'
    else 'HARD_GATE_FAILED_CONFLICT_GROUP_SIZE_DRIFT'
  end as mapping_status,
  e.external_mappings
from enriched e
order by e.card_print_id;

with target_rows as (
  select
    cp.id as card_print_id,
    cp.set_id,
    cp.set_code,
    s.code as joined_set_code,
    cp.name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
    cp.print_identity_key
  from public.card_prints cp
  left join public.sets s
    on s.id = cp.set_id
  where cp.id in (
    '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid,
    '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid,
    'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4'::uuid
  )
),
mapping_rollup as (
  select
    tr.card_print_id,
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
    ) as justtcg_number
  from target_rows tr
  left join public.external_mappings em
    on em.card_print_id = tr.card_print_id
  left join public.raw_imports ri
    on ri.source = em.source
   and coalesce(
        ri.payload->>'_external_id',
        ri.payload->>'id',
        ri.payload->'card'->>'id',
        ri.payload->'card'->>'_id'
      ) = em.external_id
  group by tr.card_print_id
),
enriched as (
  select
    coalesce(nullif(tr.set_code, ''), nullif(tr.joined_set_code, '')) as effective_set_code,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(coalesce(tr.name, ''), '[’''`´]', '''', 'g'),
                'δ',
                ' delta ',
                'g'
              ),
              '[★*]',
              ' star ',
              'g'
            ),
            '\s+EX\b',
            '-ex',
            'gi'
          ),
          '\s+GX\b',
          '-gx',
          'gi'
        ),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      )
    ) as normalized_name_token,
    regexp_replace(
      coalesce(
        nullif(mr.tcgdex_local_id, ''),
        nullif(mr.justtcg_number, ''),
        nullif(tr.number_plain, ''),
        nullif(tr.number, '')
      ),
      '^0+(?!$)',
      ''
    ) as normalized_promo_number,
    tr.variant_key,
    tr.printed_identity_modifier,
    tr.print_identity_key
  from target_rows tr
  left join mapping_rollup mr
    on mr.card_print_id = tr.card_print_id
),
summary as (
  select
    count(*)::int as conflict_group_size,
    count(distinct effective_set_code)::int as distinct_effective_set_code_count,
    count(distinct normalized_name_token)::int as distinct_normalized_name_count,
    count(distinct normalized_promo_number)::int as distinct_normalized_promo_number_count,
    count(distinct variant_key)::int as distinct_variant_count,
    count(distinct printed_identity_modifier)::int as distinct_modifier_count
  from enriched
)
select
  s.conflict_group_size,
  case when s.conflict_group_size = 2 then 0 else 1 end as ambiguity_count,
  1 as collision_count,
  case
    when s.conflict_group_size = 2
      and s.distinct_effective_set_code_count = 1
      and s.distinct_normalized_name_count = 1
      and s.distinct_normalized_promo_number_count = 1
      and s.distinct_variant_count = 1
      and s.distinct_modifier_count = 1
      then 'yes'
    else 'no'
  end as apply_ready,
  case
    when s.conflict_group_size <> 2 then 'CONFLICT_GROUP_SIZE_DRIFT'
    when s.distinct_effective_set_code_count <> 1 then 'SET_CODE_DRIFT'
    when s.distinct_normalized_name_count <> 1 then 'NAME_DRIFT'
    when s.distinct_normalized_promo_number_count <> 1 then 'PROMO_NUMBER_DRIFT'
    when s.distinct_variant_count <> 1 then 'VARIANT_DRIFT'
    when s.distinct_modifier_count <> 1 then 'MODIFIER_DRIFT'
    else 'SAFE_REUSE'
  end as gate_status
from summary s;

rollback;
