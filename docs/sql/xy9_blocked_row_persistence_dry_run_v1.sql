-- XY9_BLOCKED_ROW_PERSISTENCE_FAST_PATH_V1
-- Read-only dry run for the final blocked xy9 row.
-- Expected path: PATH_B_NO_STATUS_FIELD

begin;

with target_row as (
  select
    cp.id as row_id,
    cp.name,
    cp.gv_id,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cpi.set_code_identity,
    cpi.printed_number,
    lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\s+', ' ', 'g')) as exact_name_key,
    btrim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                    chr(96),
                    ''''
                  ),
                  chr(180),
                  ''''
                ),
                chr(8212),
                ' '
              ),
              chr(8211),
              ' '
            ),
            '-gx',
            ' gx'
          ),
          '-ex',
          ' ex'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) as normalized_name,
    nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.id = 'a6d34131-d056-49ae-a8b7-21d808e351f6'
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'xy9'
    and cpi.is_active = true
),
status_fields as (
  select
    table_name,
    column_name,
    data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('card_prints', 'card_print_identity')
    and column_name in (
      'identity_status',
      'status',
      'resolution_status',
      'match_status',
      'blocked_reason',
      'blocked_at',
      'is_blocked',
      'unresolved_reason'
    )
),
canonical as (
  select
    cp.id,
    cp.name,
    cp.number,
    cp.number_plain,
    cp.gv_id,
    btrim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(lower(cp.name), chr(8217), ''''),
                    chr(96),
                    ''''
                  ),
                  chr(180),
                  ''''
                ),
                chr(8212),
                ' '
              ),
              chr(8211),
              ' '
            ),
            '-gx',
            ' gx'
          ),
          '-ex',
          ' ex'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'xy9'
    and cp.gv_id is not null
),
surface_metrics as (
  select
    t.row_id,
    count(*) filter (
      where c.number = t.printed_number
        and lower(regexp_replace(btrim(c.name), '\s+', ' ', 'g')) = t.exact_name_key
    )::int as duplicate_exact_match_count,
    count(*) filter (
      where c.number_plain = t.normalized_token
        and c.normalized_name = t.normalized_name
    )::int as base_variant_candidate_count,
    count(*) filter (
      where c.number_plain = t.normalized_token
        and c.normalized_name = t.normalized_name
        and c.number ~ ('^' || t.normalized_token || '[A-Za-z]+$')
    )::int as suffix_owned_candidate_count
  from target_row t
  left join canonical c
    on c.number_plain = t.normalized_token
  group by t.row_id
),
fk_snapshot as (
  select
    (select count(*)::int from public.card_print_identity where card_print_id = 'a6d34131-d056-49ae-a8b7-21d808e351f6') as identity_rows,
    (select count(*)::int from public.card_print_traits where card_print_id = 'a6d34131-d056-49ae-a8b7-21d808e351f6') as trait_rows,
    (select count(*)::int from public.card_printings where card_print_id = 'a6d34131-d056-49ae-a8b7-21d808e351f6') as printing_rows,
    (select count(*)::int from public.external_mappings where card_print_id = 'a6d34131-d056-49ae-a8b7-21d808e351f6') as external_rows,
    (select count(*)::int from public.vault_items where card_id = 'a6d34131-d056-49ae-a8b7-21d808e351f6') as vault_rows
)
select
  t.row_id,
  t.name,
  t.set_code_identity,
  t.printed_number,
  t.gv_id,
  t.normalized_name,
  t.normalized_token,
  (t.gv_id is null) as gv_id_is_null,
  (select count(*)::int from status_fields) as blocked_status_field_count,
  sm.duplicate_exact_match_count,
  (sm.duplicate_exact_match_count = 1) as in_duplicate_collapse_surface,
  sm.base_variant_candidate_count,
  (sm.base_variant_candidate_count = 1) as in_base_variant_apply_surface,
  false as in_fan_in_surface,
  (sm.base_variant_candidate_count = 0) as in_promotion_surface,
  sm.suffix_owned_candidate_count,
  case
    when (select count(*)::int from status_fields) > 0 then 'PATH_A_EXISTING_STATUS_FIELD'
    else 'PATH_B_NO_STATUS_FIELD'
  end as chosen_path,
  row_to_json(fk_snapshot) as fk_snapshot
from target_row t
join surface_metrics sm
  on sm.row_id = t.row_id
cross join fk_snapshot;

select * from status_fields order by table_name, column_name;

rollback;
