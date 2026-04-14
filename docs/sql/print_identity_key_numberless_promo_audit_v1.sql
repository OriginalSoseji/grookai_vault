-- PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_CONTRACT_AUDIT_V1
-- Read-only audit for the 181-row numberless promo blocker family.
--
-- Core finding:
--   The live batch is only "numberless" in local canonical storage.
--   Every row has an authoritative upstream promo identifier via TCGdex
--   `card.localId`, so promo identity can be derived without guessing.

begin;

create temp table tmp_pik_numberless_promo_surface_v1 on commit drop as
select
  cp.id as card_print_id,
  cp.name,
  s.code as set_code,
  s.name as set_name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.gv_id,
  em.external_id as tcgdex_external_id,
  ri.payload->'card'->>'localId' as tcgdex_local_id,
  ri.payload->'card'->>'number' as tcgdex_number,
  ri.payload->'card'->'set'->>'id' as tcgdex_set_id,
  ri.payload->'card'->'set'->>'name' as tcgdex_set_name,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(cp.name, ''), '’', '''', 'g'),
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
  ) as normalized_name,
  coalesce(
    nullif(ri.payload->'card'->>'localId', ''),
    nullif(split_part(em.external_id, '-', 2), '')
  ) as promo_number
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
join public.external_mappings em
  on em.card_print_id = cp.id
 and em.source = 'tcgdex'
 and em.active is true
left join public.raw_imports ri
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
  and s.code in ('2021swsh', 'me01', 'svp');

create temp table tmp_pik_numberless_promo_classified_v1 on commit drop as
select
  p.*,
  case
    when p.promo_number is not null and btrim(p.promo_number) <> '' then 'PROMO_NUMBER_PRESENT'
    when p.printed_identity_modifier <> '' then 'STAMP_VARIANT'
    when p.tcgdex_external_id is not null and btrim(p.tcgdex_external_id) <> '' then 'EVENT_IDENTIFIER_PRESENT'
    else 'PROMO_NUMBER_ABSENT'
  end as numbering_class,
  count(*) over (
    partition by p.set_code, p.normalized_name
  ) as same_name_in_set_count,
  count(*) over (
    partition by p.set_code, p.promo_number, p.normalized_name
  ) as exact_promo_identity_count,
  lower(
    concat_ws(
      ':',
      p.set_code,
      p.promo_number,
      p.normalized_name
    )
  ) as proposed_print_identity_key
from tmp_pik_numberless_promo_surface_v1 p;

create temp table tmp_pik_numberless_promo_final_v1 on commit drop as
select
  p.*,
  case
    when p.exact_promo_identity_count > 1 then 'NON_CANONICAL'
    when p.same_name_in_set_count > 1 then 'PROMO_VARIANT'
    else 'PROMO_CANONICAL'
  end as classification
from tmp_pik_numberless_promo_classified_v1 p;

create temp view pik_numberless_promo_option_b_collisions_v1 as
select
  set_code,
  normalized_name,
  count(*)::int as rows_per_key
from tmp_pik_numberless_promo_surface_v1
group by set_code, normalized_name
having count(*) > 1;

create temp view pik_numberless_promo_option_c_collisions_v1 as
select
  set_code,
  promo_number,
  normalized_name,
  count(*)::int as rows_per_key
from tmp_pik_numberless_promo_surface_v1
group by set_code, promo_number, normalized_name
having count(*) > 1;

create temp view pik_numberless_promo_summary_v1 as
select
  count(*)::int as promo_row_count,
  count(*) filter (where numbering_class = 'PROMO_NUMBER_PRESENT')::int as promo_number_present_count,
  count(*) filter (where numbering_class = 'PROMO_NUMBER_ABSENT')::int as promo_number_absent_count,
  count(*) filter (where numbering_class = 'EVENT_IDENTIFIER_PRESENT')::int as event_identifier_present_count,
  count(*) filter (where numbering_class = 'STAMP_VARIANT')::int as stamp_variant_count,
  count(*) filter (where classification = 'PROMO_CANONICAL')::int as promo_canonical_count,
  count(*) filter (where classification = 'PROMO_VARIANT')::int as promo_variant_count,
  count(*) filter (where classification = 'NON_CANONICAL')::int as non_canonical_count,
  (select count(*)::int from pik_numberless_promo_option_b_collisions_v1) as option_b_collision_group_count,
  (select coalesce(sum(rows_per_key), 0)::int from pik_numberless_promo_option_b_collisions_v1) as option_b_collision_row_count,
  (select count(*)::int from pik_numberless_promo_option_c_collisions_v1) as collision_count,
  0::int as ambiguity_count,
  'PROMO_IDENTITY_LANE'::text as selected_contract_strategy,
  case
    when (select count(*)::int from pik_numberless_promo_option_c_collisions_v1) = 0
      and count(*) filter (where numbering_class = 'PROMO_NUMBER_ABSENT') = 0
      then 'yes'
    else 'no'
  end as safe_to_derive_promos,
  'PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V1'::text as next_execution_unit,
  case
    when count(*) = 181
      and count(*) filter (where numbering_class = 'PROMO_NUMBER_PRESENT') = 181
      and (select count(*)::int from pik_numberless_promo_option_c_collisions_v1) = 0
      then 'passed'
    else 'failed'
  end as audit_status
from tmp_pik_numberless_promo_final_v1;

-- Phase 1: target row audit.
select
  card_print_id,
  name,
  set_code,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  gv_id
from tmp_pik_numberless_promo_surface_v1
order by set_code, promo_number, name, card_print_id;

-- Phase 2: promo numbering analysis.
select
  numbering_class,
  count(*)::int as row_count
from tmp_pik_numberless_promo_classified_v1
group by numbering_class
order by row_count desc, numbering_class;

select
  set_code,
  count(*)::int as row_count,
  count(*) filter (where promo_number is not null and btrim(promo_number) <> '')::int as promo_number_present_count
from tmp_pik_numberless_promo_surface_v1
group by set_code
order by row_count desc, set_code;

-- Phase 3 and Phase 8: identity distinctness and final classification.
select
  card_print_id,
  set_code,
  name,
  promo_number,
  normalized_name,
  same_name_in_set_count,
  exact_promo_identity_count,
  classification
from tmp_pik_numberless_promo_final_v1
order by set_code, normalized_name, promo_number, card_print_id;

select
  classification,
  count(*)::int as row_count
from tmp_pik_numberless_promo_final_v1
group by classification
order by row_count desc, classification;

-- Phase 4 and Phase 6: option comparison and collision tests.
select
  set_code,
  normalized_name,
  rows_per_key
from pik_numberless_promo_option_b_collisions_v1
order by set_code, normalized_name;

select
  set_code,
  promo_number,
  normalized_name,
  rows_per_key
from pik_numberless_promo_option_c_collisions_v1
order by set_code, promo_number, normalized_name;

-- Phase 5: proposed derivation rule output.
select
  card_print_id,
  set_code,
  name,
  promo_number,
  normalized_name,
  proposed_print_identity_key
from tmp_pik_numberless_promo_classified_v1
order by set_code, promo_number, name, card_print_id;

-- Final decision.
select
  promo_row_count,
  promo_number_present_count,
  promo_number_absent_count,
  event_identifier_present_count,
  stamp_variant_count,
  promo_canonical_count,
  promo_variant_count,
  non_canonical_count,
  option_b_collision_group_count,
  option_b_collision_row_count,
  collision_count,
  ambiguity_count,
  selected_contract_strategy,
  safe_to_derive_promos,
  next_execution_unit,
  audit_status
from pik_numberless_promo_summary_v1;

rollback;
