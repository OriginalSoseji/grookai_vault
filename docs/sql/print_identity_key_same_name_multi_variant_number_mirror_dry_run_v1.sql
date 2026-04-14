-- PRINT_IDENTITY_KEY_SAME_NAME_MULTI_VARIANT_NUMBER_MIRROR_APPLY_V1
-- Read-only dry-run for the 194-row dominant remaining blocker family.
--
-- Important live correction:
--   - there are no persisted hydrated sibling rows with print_identity_key already populated
--   - the lawful numbered source surface comes from the row's own canonical identity
--     via effective set_code + authoritative numeric tcgdex localId
--   - source_card_print_id therefore refers to the target row's own bounded
--     self-mirror source surface, not to a separate reusable row

begin;

create temp view pik_same_name_multi_variant_blocked_base_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  cp.set_code as raw_set_code,
  s.code as joined_set_code,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key as current_print_identity_key,
  em.external_id as tcgdex_external_id,
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
                    regexp_replace(coalesce(cp.name, ''), '’', '''', 'g'),
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
left join public.sets s
  on s.id = cp.set_id
left join public.external_mappings em
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

create temp view pik_same_name_multi_variant_annotated_v1 as
select
  b.*,
  coalesce(b.raw_set_code, b.joined_set_code) as effective_set_code,
  count(*) over (
    partition by coalesce(b.raw_set_code, b.joined_set_code), b.normalized_name_token
  ) as same_name_count
from pik_same_name_multi_variant_blocked_base_v1 b;

create temp view pik_same_name_multi_variant_target_v1 as
select
  a.card_print_id as target_card_print_id,
  a.name as target_name,
  a.effective_set_code as target_set_code,
  a.number as target_number,
  a.number_plain as target_number_plain,
  a.variant_key as target_variant_key,
  a.printed_identity_modifier as target_printed_identity_modifier,
  a.card_print_id as source_card_print_id,
  lower(
    concat_ws(
      ':',
      a.effective_set_code,
      a.tcgdex_local_id,
      a.normalized_name_token
    )
  ) as source_print_identity_key,
  lower(
    concat_ws(
      ':',
      a.effective_set_code,
      a.tcgdex_local_id,
      a.normalized_name_token
    )
  ) as computed_print_identity_key,
  a.set_id,
  a.gv_id,
  a.tcgdex_local_id,
  a.same_name_count,
  case
    when a.effective_set_code in ('sv04.5', 'sv06.5', 'swsh10.5')
      and a.variant_key = ''
      and a.printed_identity_modifier = ''
      and a.same_name_count > 1
      and a.tcgdex_local_id ~ '^[0-9]+$'
      then 'SAFE_SELF_NUMBER_MIRROR'
    else 'EXCLUDED'
  end as validation_status
from pik_same_name_multi_variant_annotated_v1 a;

create temp view pik_same_name_multi_variant_other_rows_v1 as
select
  a.card_print_id
from pik_same_name_multi_variant_annotated_v1 a
where a.card_print_id not in (
  select target_card_print_id
  from pik_same_name_multi_variant_target_v1
  where validation_status = 'SAFE_SELF_NUMBER_MIRROR'
);

create temp view pik_same_name_multi_variant_internal_collisions_v1 as
select
  set_id,
  tcgdex_local_id,
  computed_print_identity_key,
  coalesce(target_variant_key, '') as normalized_variant_key,
  count(*) as rows_per_identity
from pik_same_name_multi_variant_target_v1
where validation_status = 'SAFE_SELF_NUMBER_MIRROR'
group by
  set_id,
  tcgdex_local_id,
  computed_print_identity_key,
  coalesce(target_variant_key, '')
having count(*) > 1;

create temp view pik_same_name_multi_variant_external_collisions_v1 as
select distinct
  t.target_card_print_id,
  cp2.id as conflicting_card_print_id
from pik_same_name_multi_variant_target_v1 t
join public.card_prints cp2
  on cp2.id <> t.target_card_print_id
 and cp2.set_id = t.set_id
 and cp2.number_plain = t.tcgdex_local_id
 and coalesce(cp2.variant_key, '') = coalesce(t.target_variant_key, '')
 and cp2.print_identity_key = t.computed_print_identity_key
where t.validation_status = 'SAFE_SELF_NUMBER_MIRROR';

-- Phase 1: dry-run target map.
select
  target_card_print_id,
  target_name,
  target_set_code,
  target_number,
  target_number_plain,
  target_variant_key,
  target_printed_identity_modifier,
  source_card_print_id,
  source_print_identity_key,
  computed_print_identity_key,
  validation_status
from pik_same_name_multi_variant_target_v1
where validation_status = 'SAFE_SELF_NUMBER_MIRROR'
order by target_set_code, computed_print_identity_key, target_card_print_id;

-- Summary proof.
select
  count(*)::int as target_row_count,
  count(*)::int as source_row_count,
  count(*) filter (where source_card_print_id = target_card_print_id)::int as self_mirror_source_count,
  (
    select count(*)::int
    from pik_same_name_multi_variant_internal_collisions_v1
  ) + (
    select count(*)::int
    from pik_same_name_multi_variant_external_collisions_v1
  ) as collision_count,
  count(*) filter (
    where validation_status <> 'SAFE_SELF_NUMBER_MIRROR'
      or target_set_code not in ('sv04.5', 'sv06.5', 'swsh10.5')
      or target_variant_key <> ''
      or target_printed_identity_modifier <> ''
      or target_number is not null
      or target_number_plain is not null
  )::int as ambiguity_count,
  (
    select count(*)::int
    from pik_same_name_multi_variant_other_rows_v1
    where card_print_id in (
      select target_card_print_id
      from pik_same_name_multi_variant_target_v1
      where validation_status = 'SAFE_SELF_NUMBER_MIRROR'
    )
  ) as other_rows_included
from pik_same_name_multi_variant_target_v1
where validation_status = 'SAFE_SELF_NUMBER_MIRROR';

rollback;
