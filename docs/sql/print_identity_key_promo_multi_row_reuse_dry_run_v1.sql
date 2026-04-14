begin;

-- PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_REUSE_REALIGNMENT_V1
-- Dry-run only. No mutation.

create temp table tmp_print_identity_key_promo_multi_family on commit drop as
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
    ) as justtcg_number
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
  where cp.id in (
    '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid,
    '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid,
    'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4'::uuid
  )
  group by cp.id
),
identity_rollup as (
  select
    cpi.card_print_id,
    count(*) filter (where cpi.is_active is true)::int as active_identity_rows,
    max(cpi.set_code_identity) filter (where cpi.is_active is true) as set_code_identity,
    max(cpi.printed_number) filter (where cpi.is_active is true) as printed_number_identity
  from public.card_print_identity cpi
  where cpi.card_print_id in (
    '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid,
    '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid,
    'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4'::uuid
  )
  group by cpi.card_print_id
)
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.number_plain,
  cp.print_identity_key,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  coalesce(nullif(cp.set_code, ''), s.code) as effective_set_code,
  lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(coalesce(cp.name, ''), '[’''`´]', '''', 'g'),
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
      nullif(sr.tcgdex_local_id, ''),
      nullif(sr.justtcg_number, ''),
      nullif(cp.number_plain, ''),
      nullif(cp.number, '')
    ),
    '^0+(?!$)',
    ''
  ) as normalized_promo_number,
  coalesce(ir.active_identity_rows, 0) as active_identity_rows,
  ir.set_code_identity,
  ir.printed_number_identity,
  case
    when coalesce(ir.active_identity_rows, 0) = 1
      and coalesce(nullif(cp.set_code, ''), s.code) = 'svp'
      and regexp_replace(
            coalesce(
              nullif(sr.tcgdex_local_id, ''),
              nullif(sr.justtcg_number, ''),
              nullif(cp.number_plain, ''),
              nullif(cp.number, '')
            ),
            '^0+(?!$)',
            ''
          ) = '85'
      and ir.set_code_identity = 'svp'
      and ir.printed_number_identity = '085'
      and cp.gv_id like 'GV-PK-PR-SV-%'
      then 'TRUE_CANONICAL'
    when cp.gv_id like 'GV-PK-SVP-%'
      or (cp.print_identity_key is not null and coalesce(ir.active_identity_rows, 0) = 0)
      then 'MALFORMED_ROW'
    else 'SHADOW_ROW'
  end as row_classification
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
left join source_rollup sr
  on sr.card_print_id = cp.id
left join identity_rollup ir
  on ir.card_print_id = cp.id
where cp.id in (
  '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid,
  '5557ba0d-6aa7-451f-8195-2a300235394e'::uuid,
  'a48b4ff3-64c4-4a63-8c6d-434cebbf32e4'::uuid
);

with canonical as (
  select card_print_id as canonical_row_id, gv_id as canonical_gv_id
  from tmp_print_identity_key_promo_multi_family
  where row_classification = 'TRUE_CANONICAL'
),
old_rows as (
  select
    f.card_print_id as duplicate_row_id,
    c.canonical_row_id,
    c.canonical_gv_id,
    f.row_classification
  from tmp_print_identity_key_promo_multi_family f
  cross join canonical c
  where f.row_classification in ('SHADOW_ROW', 'MALFORMED_ROW')
)
select
  canonical_row_id,
  case when row_classification = 'SHADOW_ROW' then duplicate_row_id end as shadow_row_id,
  case when row_classification = 'MALFORMED_ROW' then duplicate_row_id end as malformed_row_id,
  canonical_gv_id,
  'SAFE_REUSE' as mapping_status
from old_rows
order by row_classification, duplicate_row_id;

with summary as (
  select
    count(*)::int as group_size,
    count(*) filter (where row_classification = 'TRUE_CANONICAL')::int as true_canonical_count,
    count(*) filter (where row_classification = 'SHADOW_ROW')::int as shadow_row_count,
    count(*) filter (where row_classification = 'MALFORMED_ROW')::int as malformed_row_count,
    count(distinct effective_set_code)::int as distinct_set_count,
    count(distinct normalized_name_token)::int as distinct_name_count,
    count(distinct normalized_promo_number)::int as distinct_promo_number_count,
    count(distinct variant_key)::int as distinct_variant_count,
    count(distinct printed_identity_modifier)::int as distinct_modifier_count
  from tmp_print_identity_key_promo_multi_family
),
external_overlap as (
  select count(*)::int as overlap_count
  from public.external_mappings old_em
  join tmp_print_identity_key_promo_multi_family old_f
    on old_f.card_print_id = old_em.card_print_id
   and old_f.row_classification in ('SHADOW_ROW', 'MALFORMED_ROW')
  join tmp_print_identity_key_promo_multi_family canonical_f
    on canonical_f.row_classification = 'TRUE_CANONICAL'
  join public.external_mappings new_em
    on new_em.card_print_id = canonical_f.card_print_id
   and new_em.source = old_em.source
   and new_em.external_id = old_em.external_id
)
select
  s.group_size,
  case
    when s.group_size = 3
      and s.true_canonical_count = 1
      and s.shadow_row_count = 1
      and s.malformed_row_count = 1
      and s.distinct_set_count = 1
      and s.distinct_name_count = 1
      and s.distinct_promo_number_count = 1
      and s.distinct_variant_count = 1
      and s.distinct_modifier_count = 1
      then 0
    else 1
  end as ambiguity_count,
  coalesce(e.overlap_count, 0) as collision_count
from summary s
cross join external_overlap e;

select
  row_classification,
  card_print_id,
  (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = f.card_print_id) as card_print_identity_rows,
  (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = f.card_print_id) as card_print_traits_rows,
  (select count(*)::int from public.card_printings cpp where cpp.card_print_id = f.card_print_id) as card_printings_rows,
  (select count(*)::int from public.external_mappings em where em.card_print_id = f.card_print_id and em.active is true) as external_mappings_rows,
  (select count(*)::int from public.vault_items vi where vi.card_id = f.card_print_id) as vault_items_rows
from tmp_print_identity_key_promo_multi_family f
where row_classification in ('SHADOW_ROW', 'MALFORMED_ROW')
order by row_classification, card_print_id;

rollback;
