-- PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_NUMBER_RECOVERY_APPLY_V1
-- Read-only dry run for recovering number_plain on the 1125 numberless modern
-- main-set rows using authoritative tcgdex mappings.

begin;

create temp view pik_number_recovery_target_surface_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  s.code as set_code,
  cp.name as current_name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key,
  map.active_mapping_count,
  map.distinct_external_id_count,
  map.tcgdex_external_id,
  raw.raw_hit_count,
  raw.raw_import_id,
  raw.raw_local_id,
  raw.raw_card_id,
  raw.raw_name,
  raw.raw_set_id
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
left join lateral (
  select
    count(*)::int as active_mapping_count,
    count(distinct em.external_id)::int as distinct_external_id_count,
    min(em.external_id) as tcgdex_external_id
  from public.external_mappings em
  where em.card_print_id = cp.id
    and em.source = 'tcgdex'
    and em.active is true
) map
  on true
left join lateral (
  select
    count(*)::int as raw_hit_count,
    min(ri.id) as raw_import_id,
    min(ri.payload->'card'->>'localId') as raw_local_id,
    min(ri.payload->'card'->>'id') as raw_card_id,
    min(ri.payload->'card'->>'name') as raw_name,
    min(ri.payload->'card'->'set'->>'id') as raw_set_id
  from public.raw_imports ri
  where ri.source = 'tcgdex'
    and coalesce(
          ri.payload->>'_external_id',
          ri.payload->>'id',
          ri.payload->'card'->>'id',
          ri.payload->'card'->>'_id'
        ) = map.tcgdex_external_id
) raw
  on true
where cp.gv_id is not null
  and cp.print_identity_key is null
  and (cp.set_code is null or btrim(cp.set_code) = '')
  and (cp.number is null or btrim(cp.number) = '')
  and (cp.number_plain is null or btrim(cp.number_plain) = '')
  and s.code in (
    'sv02',
    'sv04',
    'sv04.5',
    'sv06',
    'sv06.5',
    'sv07',
    'sv08',
    'sv09',
    'sv10',
    'swsh10.5'
  );

create temp view pik_number_recovery_projection_v1 as
select
  t.*,
  case
    when t.tcgdex_external_id like (t.set_code || '-%')
      then substring(t.tcgdex_external_id from char_length(t.set_code) + 2)
    else null
  end as tcgdex_suffix,
  case
    when t.tcgdex_external_id like (t.set_code || '-%')
      and substring(t.tcgdex_external_id from char_length(t.set_code) + 2) ~ '^\d+[A-Za-z]*$'
      then regexp_replace(substring(t.tcgdex_external_id from char_length(t.set_code) + 2), '[A-Za-z]+$', '')
    else null
  end as tcgdex_suffix_numeric_token,
  case
    when t.raw_local_id ~ '^\d+$'
      then regexp_replace(t.raw_local_id, '^0+(?!$)', '')
    else null
  end as tcgdex_number_plain_from_local_id,
  case
    when t.tcgdex_external_id like (t.set_code || '-%')
      and substring(t.tcgdex_external_id from char_length(t.set_code) + 2) ~ '^\d+[A-Za-z]*$'
      then regexp_replace(
             regexp_replace(substring(t.tcgdex_external_id from char_length(t.set_code) + 2), '[A-Za-z]+$', ''),
             '^0+(?!$)',
             ''
           )
    else null
  end as extracted_number_plain,
  case
    when t.active_mapping_count <> 1 then 'INVALID_ACTIVE_MAPPING_COUNT'
    when t.distinct_external_id_count <> 1 then 'INVALID_DISTINCT_EXTERNAL_ID_COUNT'
    when t.raw_hit_count <> 1 then 'INVALID_RAW_IMPORT_HIT_COUNT'
    when t.tcgdex_external_id not like (t.set_code || '-%') then 'INVALID_EXTERNAL_ID_SHAPE'
    when t.raw_local_id !~ '^\d+$' then 'INVALID_TCGDEX_LOCAL_ID'
    when regexp_replace(t.raw_local_id, '^0+(?!$)', '') is distinct from
         regexp_replace(
           regexp_replace(substring(t.tcgdex_external_id from char_length(t.set_code) + 2), '[A-Za-z]+$', ''),
           '^0+(?!$)',
           ''
         ) then 'LOCAL_ID_EXTERNAL_ID_MISMATCH'
    when t.raw_name is distinct from t.current_name then 'RAW_NAME_MISMATCH'
    when t.raw_set_id is distinct from t.set_code then 'RAW_SET_MISMATCH'
    else 'SAFE_UPDATE'
  end as validation_status
from pik_number_recovery_target_surface_v1 t;

create temp view pik_number_recovery_collision_surface_v1 as
select
  cp.id as card_print_id,
  cp.set_id,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key
from public.card_prints cp
where cp.gv_id is not null
  and cp.number_plain is not null
  and btrim(cp.number_plain) <> ''
  and cp.id not in (
    select card_print_id
    from pik_number_recovery_projection_v1
  )

union all

select
  p.card_print_id,
  p.set_id,
  p.extracted_number_plain as number_plain,
  p.variant_key
from pik_number_recovery_projection_v1 p
where p.validation_status = 'SAFE_UPDATE';

create temp view pik_number_recovery_collision_groups_v1 as
select
  set_id,
  number_plain,
  variant_key,
  count(*)::int as rows_per_identity
from pik_number_recovery_collision_surface_v1
group by
  set_id,
  number_plain,
  variant_key
having count(*) > 1;

create temp view pik_number_recovery_remaining_blocked_after_v1 as
with blocker_surface as (
  select
    cp.id as card_print_id,
    cp.set_code,
    s.code as joined_set_code,
    cp.name,
    cp.number,
    coalesce(
      case
        when cp.id in (select card_print_id from pik_number_recovery_projection_v1)
          then (select extracted_number_plain from pik_number_recovery_projection_v1 p where p.card_print_id = cp.id)
        else cp.number_plain
      end,
      cp.number_plain
    ) as simulated_number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
    case
      when cp.set_code is not null and btrim(cp.set_code) <> '' then cp.set_code
      when s.code is not null and btrim(s.code) <> '' then s.code
      else null
    end as effective_set_code,
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
    ) as normalized_printed_name_token,
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
select
  count(*)::int as remaining_blocked_rows_after_apply
from blocker_surface
where not (
  effective_set_code is not null
  and simulated_number_plain is not null
  and btrim(simulated_number_plain) <> ''
  and normalized_printed_name_token is not null
  and normalized_printed_name_token <> ''
  and normalized_variant_key is not null
  and normalized_printed_identity_modifier is not null
);

create temp view pik_number_recovery_summary_v1 as
select
  count(*)::int as target_row_count,
  count(*) filter (where validation_status = 'SAFE_UPDATE')::int as successful_extractions,
  count(*) filter (where validation_status <> 'SAFE_UPDATE')::int as ambiguity_count,
  (select count(*)::int from pik_number_recovery_collision_groups_v1) as collision_count,
  (select remaining_blocked_rows_after_apply from pik_number_recovery_remaining_blocked_after_v1) as remaining_blocked_rows_after_apply
from pik_number_recovery_projection_v1;

-- Phase 1-2: target rows and extraction proof.
select
  card_print_id,
  current_name,
  set_code,
  tcgdex_external_id,
  raw_local_id as tcgdex_number,
  extracted_number_plain,
  validation_status
from pik_number_recovery_projection_v1
order by set_code, current_name, card_print_id;

-- Summary proof.
select
  target_row_count,
  successful_extractions,
  ambiguity_count,
  collision_count,
  remaining_blocked_rows_after_apply
from pik_number_recovery_summary_v1;

select
  set_id,
  number_plain,
  variant_key,
  rows_per_identity
from pik_number_recovery_collision_groups_v1;

rollback;
