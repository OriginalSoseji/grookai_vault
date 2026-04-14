-- PRINT_IDENTITY_KEY_BACKFILL_DRY_RUN_V1
-- Read-only dry-run proof for the bounded 31-row print_identity_key backfill.

begin;

create temp view pik_backfill_dry_run_canonical_surface_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  cp.set_code,
  s.code as joined_set_code,
  cp.name as current_name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key as current_print_identity_key
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.gv_id is not null
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

create temp view pik_backfill_dry_run_projection_v1 as
select
  c.*,
  case
    when c.set_code is not null and btrim(c.set_code) <> '' then c.set_code
    when c.joined_set_code is not null and btrim(c.joined_set_code) <> '' then c.joined_set_code
    else null
  end as effective_set_code,
  case
    when c.number_plain is not null and btrim(c.number_plain) <> '' then c.number_plain
    when c.number is not null
      and regexp_replace(c.number, '[^0-9]+', '', 'g') <> ''
      then regexp_replace(c.number, '[^0-9]+', '', 'g')
    when c.number is not null
      and btrim(c.number) <> ''
      and trim(
        both '-' from regexp_replace(
          regexp_replace(trim(c.number), '[^A-Za-z0-9]+', '-', 'g'),
          '-+',
          '-',
          'g'
        )
      ) <> ''
      then lower(
        trim(
          both '-' from regexp_replace(
            regexp_replace(trim(c.number), '[^A-Za-z0-9]+', '-', 'g'),
            '-+',
            '-',
            'g'
          )
        )
      )
    else null
  end as effective_number_plain,
  lower(
    regexp_replace(
      trim(
        both '-' from regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(c.current_name, ''), '’', '''', 'g'),
                    'δ', ' delta ', 'g'
                  ),
                  '[★*]', ' star ', 'g'
                ),
                '\s+EX\b', '-ex', 'gi'
              ),
              '\s+GX\b', '-gx', 'gi'
            ),
            '[^a-zA-Z0-9]+', '-', 'g'
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
    when c.variant_key = '' then ''
    when c.variant_key ~ '^[A-Za-z0-9_]+$' then lower(c.variant_key)
    when c.joined_set_code = 'ex10'
      and c.current_name = 'Unown'
      and c.number_plain is not null
      and btrim(c.number_plain) <> ''
      and c.variant_key = c.number_plain
      then c.variant_key
    else null
  end as normalized_variant_key,
  case
    when c.printed_identity_modifier = '' then ''
    when c.printed_identity_modifier ~ '^[a-z0-9_]+$' then c.printed_identity_modifier
    else null
  end as normalized_printed_identity_modifier
from pik_backfill_dry_run_canonical_surface_v1 c;

create temp view pik_backfill_dry_run_lane_assignment_v1 as
select
  p.*,
  case
    when p.effective_set_code is null then 'BLOCKED_LANE'
    when p.effective_number_plain is null then 'BLOCKED_LANE'
    when p.normalized_printed_name_token is null or p.normalized_printed_name_token = '' then 'BLOCKED_LANE'
    when p.normalized_variant_key is null then 'BLOCKED_LANE'
    when p.normalized_printed_identity_modifier is null then 'BLOCKED_LANE'
    else 'SAFE_BACKFILL_LANE'
  end as execution_lane,
  case
    when p.effective_set_code is null then 'set_code unresolved after fallback'
    when p.effective_number_plain is null then 'number_plain missing and not derivable'
    when p.normalized_printed_name_token is null or p.normalized_printed_name_token = '' then 'normalized printed name missing'
    when p.normalized_variant_key is null then 'variant_key outside bounded legacy contract'
    when p.normalized_printed_identity_modifier is null then 'printed_identity_modifier malformed'
    else 'derivable under bounded extended rules'
  end as lane_reason,
  case
    when p.effective_set_code is null then null
    when p.effective_number_plain is null then null
    when p.normalized_printed_name_token is null or p.normalized_printed_name_token = '' then null
    when p.normalized_variant_key is null then null
    when p.normalized_printed_identity_modifier is null then null
    else lower(
      concat_ws(
        ':',
        p.effective_set_code,
        p.effective_number_plain,
        p.normalized_printed_name_token,
        nullif(p.normalized_printed_identity_modifier, '')
      )
    )
  end as computed_print_identity_key
from pik_backfill_dry_run_projection_v1 p;

create temp view pik_backfill_dry_run_targets_v1 as
select
  card_print_id,
  current_name,
  effective_set_code as set_code,
  effective_number_plain as number_plain,
  normalized_variant_key as variant_key,
  computed_print_identity_key,
  lane_reason
from pik_backfill_dry_run_lane_assignment_v1
where execution_lane = 'SAFE_BACKFILL_LANE'
  and current_print_identity_key is null;

create temp view pik_backfill_dry_run_blocked_v1 as
select
  card_print_id
from pik_backfill_dry_run_lane_assignment_v1
where execution_lane = 'BLOCKED_LANE'
  and current_print_identity_key is null;

create temp view pik_backfill_dry_run_collision_check_v1 as
with full_surface as (
  select
    cp.id as row_id,
    cp.set_id,
    cp.number_plain,
    cp.print_identity_key,
    coalesce(cp.variant_key, '') as variant_key
  from public.card_prints cp
  where cp.gv_id is not null
    and cp.print_identity_key is not null

  union all

  select
    l.card_print_id as row_id,
    cp.set_id,
    l.number_plain,
    l.computed_print_identity_key as print_identity_key,
    l.variant_key
  from pik_backfill_dry_run_targets_v1 l
  join public.card_prints cp
    on cp.id = l.card_print_id
)
select
  count(*)::int as collision_count
from (
  select
    set_id,
    number_plain,
    print_identity_key,
    variant_key
  from full_surface
  group by
    set_id,
    number_plain,
    print_identity_key,
    variant_key
  having count(*) > 1
) dupes;

create temp view pik_backfill_dry_run_summary_v1 as
select
  (select count(*)::int from pik_backfill_dry_run_targets_v1) as target_row_count,
  (select count(*)::int from pik_backfill_dry_run_blocked_v1) as blocked_row_count,
  (select collision_count from pik_backfill_dry_run_collision_check_v1) as collision_count,
  0::int as blocked_rows_touched;

select
  target_row_count,
  blocked_row_count,
  collision_count,
  blocked_rows_touched
from pik_backfill_dry_run_summary_v1;

select
  card_print_id,
  current_name,
  set_code,
  number_plain,
  variant_key,
  computed_print_identity_key
from pik_backfill_dry_run_targets_v1
order by set_code, current_name, card_print_id;

rollback;
