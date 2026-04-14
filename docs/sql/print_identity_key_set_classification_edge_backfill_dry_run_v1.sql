-- PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_BACKFILL_APPLY_V1
-- Read-only dry-run for the bounded set-classification edge lane.
--
-- Live contract for this lane:
--   - target rows = 238
--   - authoritative set_code = public.sets.code via card_prints.set_id
--   - authoritative number = numeric tcgdex localId
--   - number_plain is generated from number in the live schema
--   - print_identity_key derives only after both mirrors are present

begin;

create temp view pik_set_class_edge_apply_base_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  cp.set_code as old_set_code,
  s.code as derived_set_code,
  cp.name,
  cp.number as old_number,
  cp.number_plain as old_number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key as current_print_identity_key,
  em.external_id as tcgdex_external_id,
  split_part(lower(em.external_id), '-', 1) as tcgdex_set_code,
  coalesce(
    nullif(ri.payload->'card'->>'localId', ''),
    nullif(split_part(lower(em.external_id), '-', 2), '')
  ) as tcgdex_local_id,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(cp.name, ''), '[\u2018\u2019`´]', '''', 'g'),
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
  ) as normalized_name_token
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
  );

create temp view pik_set_class_edge_apply_target_v1 as
with annotated as (
  select
    b.*,
    count(*) over (
      partition by b.derived_set_code, b.normalized_name_token
    ) as same_name_count
  from pik_set_class_edge_apply_base_v1 b
)
select
  a.card_print_id,
  a.gv_id,
  a.set_id,
  a.name,
  a.old_set_code,
  a.derived_set_code,
  a.old_number,
  a.old_number_plain,
  a.tcgdex_local_id as derived_number,
  a.tcgdex_local_id as derived_number_plain,
  a.variant_key,
  a.printed_identity_modifier,
  a.current_print_identity_key,
  a.tcgdex_external_id,
  a.tcgdex_set_code,
  a.normalized_name_token,
  lower(
    concat_ws(
      ':',
      a.derived_set_code,
      a.tcgdex_local_id,
      a.normalized_name_token,
      nullif(lower(a.printed_identity_modifier), '')
    )
  ) as computed_print_identity_key
from annotated a
where a.derived_set_code not in ('ecard3', 'col1')
  and a.same_name_count = 1
  and a.tcgdex_local_id ~ '^[0-9]+$'
  and (
    a.old_set_code is null
    or btrim(a.old_set_code) = ''
    or a.old_set_code <> a.derived_set_code
  );

create temp view pik_set_class_edge_apply_internal_collision_v1 as
select
  t.set_id,
  t.derived_number_plain,
  t.computed_print_identity_key,
  coalesce(t.variant_key, '') as variant_key,
  count(*) as rows_per_identity
from pik_set_class_edge_apply_target_v1 t
group by
  t.set_id,
  t.derived_number_plain,
  t.computed_print_identity_key,
  coalesce(t.variant_key, '')
having count(*) > 1;

create temp view pik_set_class_edge_apply_external_collision_v1 as
select distinct
  t.card_print_id,
  cp2.id as conflicting_card_print_id,
  cp2.gv_id as conflicting_gv_id,
  cp2.print_identity_key as conflicting_print_identity_key
from pik_set_class_edge_apply_target_v1 t
join public.card_prints cp2
  on cp2.id <> t.card_print_id
 and cp2.set_id = t.set_id
 and cp2.number_plain = t.derived_number_plain
 and coalesce(cp2.variant_key, '') = coalesce(t.variant_key, '')
 and cp2.print_identity_key = t.computed_print_identity_key;

select
  t.card_print_id,
  t.name,
  t.old_set_code,
  t.derived_set_code,
  t.old_number,
  t.derived_number,
  t.old_number_plain,
  t.derived_number_plain as number_plain,
  t.variant_key,
  t.computed_print_identity_key,
  case
    when ec.card_print_id is not null then 'EXTERNAL_COLLISION'
    when ic.computed_print_identity_key is not null then 'INTERNAL_COLLISION'
    else 'SAFE_BACKFILL'
  end as validation_status
from pik_set_class_edge_apply_target_v1 t
left join pik_set_class_edge_apply_internal_collision_v1 ic
  on ic.set_id = t.set_id
 and ic.derived_number_plain = t.derived_number_plain
 and ic.computed_print_identity_key = t.computed_print_identity_key
 and ic.variant_key = coalesce(t.variant_key, '')
left join pik_set_class_edge_apply_external_collision_v1 ec
  on ec.card_print_id = t.card_print_id
order by
  t.derived_set_code,
  t.derived_number_plain,
  t.normalized_name_token,
  t.card_print_id;

select
  count(*)::int as target_row_count,
  (select count(*)::int from pik_set_class_edge_apply_internal_collision_v1)
    + (select count(*)::int from pik_set_class_edge_apply_external_collision_v1)
    as collision_count,
  count(*) filter (
    where not (
      tcgdex_set_code = derived_set_code
      and normalized_name_token <> ''
      and current_print_identity_key is null
    )
  )::int as ambiguity_count
from pik_set_class_edge_apply_target_v1;

rollback;
