-- PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V2
-- Live read-only dry-run proof for the bounded numberless promo backfill
-- after promo collision cleanup. This recomputes the promo lane from current
-- database state and derives the live apply scope without assuming the prior
-- failed V1 counts still hold.

begin;

create temp table tmp_pik_promo_live_lane_v2 on commit drop as
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key as current_print_identity_key,
  cp.gv_id,
  cp.set_code as raw_set_code,
  s.code as joined_set_code,
  em.external_id as tcgdex_external_id,
  ri.payload->'card'->>'localId' as tcgdex_local_id
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

create temp table tmp_pik_promo_derived_v2 on commit drop as
select
  p.card_print_id,
  p.name,
  p.number,
  p.number_plain,
  p.variant_key,
  p.printed_identity_modifier,
  p.current_print_identity_key,
  p.gv_id,
  lower(coalesce(nullif(p.joined_set_code, ''), nullif(p.raw_set_code, ''))) as set_code,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(p.name, ''), '[’`´]', '''', 'g'),
                    'δ',
                    ' delta ',
                    'gi'
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
  ) as normalized_name_token,
  lower(
    coalesce(
      nullif(p.tcgdex_local_id, ''),
      nullif(split_part(lower(p.tcgdex_external_id), '-', 2), '')
    )
  ) as normalized_promo_number,
  lower(nullif(p.printed_identity_modifier, '')) as normalized_printed_identity_modifier
from tmp_pik_promo_live_lane_v2 p;

create temp table tmp_pik_promo_classified_v2 on commit drop as
select
  d.*,
  case
    when d.normalized_promo_number is not null then
      lower(concat_ws(':', d.set_code, d.normalized_promo_number, d.normalized_name_token))
    when d.normalized_printed_identity_modifier is not null then
      lower(
        concat_ws(
          ':',
          d.set_code,
          d.normalized_name_token,
          d.normalized_printed_identity_modifier
        )
      )
    else null
  end as computed_print_identity_key,
  count(*) over (
    partition by d.set_code, d.normalized_name_token
  ) as same_name_in_set_count,
  count(*) over (
    partition by
      case
        when d.normalized_promo_number is not null then
          lower(concat_ws(':', d.set_code, d.normalized_promo_number, d.normalized_name_token))
        when d.normalized_printed_identity_modifier is not null then
          lower(
            concat_ws(
              ':',
              d.set_code,
              d.normalized_name_token,
              d.normalized_printed_identity_modifier
            )
          )
        else null
      end
  ) as exact_promo_identity_count
from tmp_pik_promo_derived_v2 d;

create temp table tmp_pik_promo_existing_conflicts_v2 on commit drop as
select
  c.card_print_id,
  count(*)::int as conflict_count
from tmp_pik_promo_classified_v2 c
join public.card_prints cp2
  on cp2.print_identity_key = c.computed_print_identity_key
 and cp2.id <> c.card_print_id
where c.computed_print_identity_key is not null
group by c.card_print_id;

create temp table tmp_pik_promo_final_v2 on commit drop as
select
  c.card_print_id,
  c.name,
  c.set_code,
  c.number,
  c.number_plain,
  c.variant_key,
  c.printed_identity_modifier,
  c.current_print_identity_key,
  c.computed_print_identity_key,
  case
    when c.computed_print_identity_key is null then 'BLOCKED_AMBIGUOUS'
    when c.exact_promo_identity_count > 1 then 'BLOCKED_INTERNAL_COLLISION'
    when exists (
      select 1
      from tmp_pik_promo_existing_conflicts_v2 ec
      where ec.card_print_id = c.card_print_id
    ) then 'BLOCKED_EXISTING_KEY_COLLISION'
    when c.current_print_identity_key is not null
      and c.current_print_identity_key <> c.computed_print_identity_key then 'BLOCKED_HYDRATION_DRIFT'
    when c.current_print_identity_key = c.computed_print_identity_key then 'ALREADY_APPLIED'
    else 'SAFE_APPLY'
  end as validation_status,
  case
    when c.computed_print_identity_key is null then 'NON_CANONICAL'
    when c.same_name_in_set_count > 1 then 'PROMO_VARIANT'
    else 'PROMO_CANONICAL'
  end as classification
from tmp_pik_promo_classified_v2 c;

select
  card_print_id,
  name,
  set_code,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  computed_print_identity_key,
  validation_status
from tmp_pik_promo_final_v2
order by set_code, computed_print_identity_key, name, card_print_id;

select
  count(*) filter (where validation_status = 'SAFE_APPLY')::int as target_row_count,
  count(*) filter (
    where validation_status in ('BLOCKED_INTERNAL_COLLISION', 'BLOCKED_EXISTING_KEY_COLLISION')
  )::int as collision_count,
  count(*) filter (where validation_status = 'BLOCKED_AMBIGUOUS')::int as ambiguity_count,
  count(*) filter (where validation_status <> 'SAFE_APPLY')::int as excluded_rows_count
from tmp_pik_promo_final_v2;

select
  classification,
  count(*)::int as row_count
from tmp_pik_promo_final_v2
group by classification
order by row_count desc, classification;

select
  validation_status,
  count(*)::int as row_count
from tmp_pik_promo_final_v2
group by validation_status
order by row_count desc, validation_status;

select
  card_print_id,
  computed_print_identity_key,
  current_print_identity_key
from tmp_pik_promo_final_v2
where validation_status <> 'SAFE_APPLY'
order by validation_status, card_print_id;

rollback;
