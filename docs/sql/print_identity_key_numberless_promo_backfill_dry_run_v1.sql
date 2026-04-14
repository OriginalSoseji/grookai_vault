-- PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V1
-- Read-only dry-run proof for bounded print_identity_key backfill of the
-- 181-row numberless promo family.

begin;

create temp table tmp_pik_promo_surface_v1 on commit drop as
select
  cp.id as card_print_id,
  cp.name,
  s.code as set_code,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key as current_print_identity_key,
  cp.gv_id,
  em.external_id as tcgdex_external_id,
  ri.payload->'card'->>'localId' as tcgdex_local_id,
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
  and (cp.set_code is null or btrim(cp.set_code) = '')
  and (cp.number is null or btrim(cp.number) = '')
  and (cp.number_plain is null or btrim(cp.number_plain) = '')
  and s.code in ('2021swsh', 'me01', 'svp');

create temp table tmp_pik_promo_classified_v1 on commit drop as
select
  p.*,
  lower(
    concat_ws(
      ':',
      p.set_code,
      p.promo_number,
      p.normalized_name
    )
  ) as computed_print_identity_key,
  count(*) over (
    partition by p.set_code, p.normalized_name
  ) as same_name_in_set_count,
  count(*) over (
    partition by p.set_code, p.promo_number, p.normalized_name
  ) as exact_promo_identity_count
from tmp_pik_promo_surface_v1 p;

create temp table tmp_pik_promo_final_v1 on commit drop as
select
  p.*,
  case
    when p.promo_number is null or btrim(p.promo_number) = '' then 'NON_CANONICAL'
    when p.exact_promo_identity_count > 1 then 'NON_CANONICAL'
    when p.same_name_in_set_count > 1 then 'PROMO_VARIANT'
    else 'PROMO_CANONICAL'
  end as classification
from tmp_pik_promo_classified_v1 p;

create temp view tmp_pik_promo_existing_key_conflicts_v1 as
select
  t.card_print_id as target_card_print_id,
  t.name as target_name,
  t.set_code,
  t.promo_number,
  t.computed_print_identity_key,
  cp2.id as conflicting_card_print_id,
  cp2.name as conflicting_name,
  cp2.number as conflicting_number,
  cp2.number_plain as conflicting_number_plain,
  cp2.gv_id as conflicting_gv_id
from tmp_pik_promo_final_v1 t
join public.card_prints cp2
  on cp2.print_identity_key = t.computed_print_identity_key
 and cp2.id <> t.card_print_id
where t.classification <> 'NON_CANONICAL';

-- Phase 1: per-row dry-run output.
select
  card_print_id,
  name,
  set_code,
  promo_number,
  variant_key,
  printed_identity_modifier,
  computed_print_identity_key
from tmp_pik_promo_final_v1
order by set_code, promo_number, name, card_print_id;

-- Phase 1 summary proof.
select
  count(*)::int as target_row_count,
  count(*) filter (where classification = 'PROMO_CANONICAL')::int as promo_canonical_count,
  count(*) filter (where classification = 'PROMO_VARIANT')::int as promo_variant_count,
  count(*) filter (where classification = 'NON_CANONICAL')::int as non_canonical_count,
  (
    select count(*)::int
    from (
      select computed_print_identity_key
      from tmp_pik_promo_final_v1
      where classification <> 'NON_CANONICAL'
      group by computed_print_identity_key
      having count(*) > 1
    ) collisions
  ) + (
    select count(*)::int
    from (
      select distinct target_card_print_id
      from tmp_pik_promo_existing_key_conflicts_v1
    ) existing_conflicts
  ) as collision_count,
  count(*) filter (where classification = 'NON_CANONICAL')::int as ambiguity_count
from tmp_pik_promo_final_v1;

-- Classification breakdown and same-name promo families.
select
  classification,
  count(*)::int as row_count
from tmp_pik_promo_final_v1
group by classification
order by row_count desc, classification;

select
  set_code,
  normalized_name,
  count(*)::int as rows_per_name,
  string_agg(promo_number, ', ' order by promo_number) as promo_numbers
from tmp_pik_promo_final_v1
group by set_code, normalized_name
having count(*) > 1
order by set_code, normalized_name;

select
  target_card_print_id,
  target_name,
  set_code,
  promo_number,
  computed_print_identity_key,
  conflicting_card_print_id,
  conflicting_name,
  conflicting_number,
  conflicting_number_plain,
  conflicting_gv_id
from tmp_pik_promo_existing_key_conflicts_v1
order by target_name, target_card_print_id, conflicting_card_print_id;

rollback;
