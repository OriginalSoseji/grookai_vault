-- PRINT_IDENTITY_KEY_BACKFILL_SPLIT_PLAN_V1
-- Read-only execution split plan for print_identity_key backfill.
--
-- Objective:
--   Partition the currently audited derivation blocker surface into:
--   1. SAFE_BACKFILL_LANE (31 rows)
--   2. BLOCKED_LANE (1332 rows)
--
-- This artifact performs no mutation.

begin;

create temp view pik_split_canonical_surface_v1 as
select
  cp.id as card_print_id,
  cp.gv_id,
  cp.set_id,
  cp.set_code,
  s.code as joined_set_code,
  s.name as joined_set_name,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.print_identity_key
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.gv_id is not null;

create temp view pik_split_blocker_surface_v1 as
select
  *
from pik_split_canonical_surface_v1
where (set_code is null or btrim(set_code) = '')
   or (number_plain is null or btrim(number_plain) = '')
   or (name is null or btrim(name) = '')
   or (variant_key <> '' and variant_key !~ '^[A-Za-z0-9_]+$')
   or (printed_identity_modifier <> '' and printed_identity_modifier !~ '^[a-z0-9_]+$');

create temp view pik_split_rule_projection_v1 as
select
  b.*,
  case
    when b.set_code is not null and btrim(b.set_code) <> '' then b.set_code
    when b.joined_set_code is not null and btrim(b.joined_set_code) <> '' then b.joined_set_code
    else null
  end as effective_set_code,
  case
    when b.number_plain is not null and btrim(b.number_plain) <> '' then b.number_plain
    when b.number is not null
      and regexp_replace(b.number, '[^0-9]+', '', 'g') <> ''
      then regexp_replace(b.number, '[^0-9]+', '', 'g')
    when b.number is not null
      and btrim(b.number) <> ''
      and trim(
        both '-' from regexp_replace(
          regexp_replace(trim(b.number), '[^A-Za-z0-9]+', '-', 'g'),
          '-+',
          '-',
          'g'
        )
      ) <> ''
      then lower(
        trim(
          both '-' from regexp_replace(
            regexp_replace(trim(b.number), '[^A-Za-z0-9]+', '-', 'g'),
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
                    regexp_replace(coalesce(b.name, ''), '’', '''', 'g'),
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
    when b.variant_key = '' then ''
    when b.variant_key ~ '^[A-Za-z0-9_]+$' then lower(b.variant_key)
    when b.joined_set_code = 'ex10'
      and b.name = 'Unown'
      and b.number_plain is not null
      and btrim(b.number_plain) <> ''
      and b.variant_key = b.number_plain
      then b.variant_key
    else null
  end as normalized_variant_key,
  case
    when b.printed_identity_modifier = '' then ''
    when b.printed_identity_modifier ~ '^[a-z0-9_]+$' then b.printed_identity_modifier
    else null
  end as normalized_printed_identity_modifier
from pik_split_blocker_surface_v1 b;

create temp view pik_split_lane_assignment_v1 as
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
  end as proposed_print_identity_key
from pik_split_rule_projection_v1 p;

create temp view pik_split_safe_backfill_lane_v1 as
select
  card_print_id,
  gv_id,
  set_id,
  coalesce(joined_set_code, set_code) as observed_set_code,
  effective_set_code,
  name,
  number,
  number_plain as current_number_plain,
  effective_number_plain,
  variant_key as current_variant_key,
  normalized_variant_key,
  printed_identity_modifier,
  normalized_printed_name_token,
  proposed_print_identity_key,
  lane_reason
from pik_split_lane_assignment_v1
where execution_lane = 'SAFE_BACKFILL_LANE';

create temp view pik_split_blocked_lane_v1 as
select
  card_print_id,
  gv_id,
  set_id,
  coalesce(joined_set_code, set_code) as observed_set_code,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  execution_lane,
  lane_reason
from pik_split_lane_assignment_v1
where execution_lane = 'BLOCKED_LANE';

create temp view pik_split_safe_collision_check_v1 as
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
    s.card_print_id as row_id,
    s.set_id,
    s.effective_number_plain as number_plain,
    s.proposed_print_identity_key as print_identity_key,
    s.normalized_variant_key as variant_key
  from pik_split_safe_backfill_lane_v1 s
)
select
  count(*)::int as collision_group_count
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

create temp view pik_split_summary_v1 as
select
  (select count(*)::int from pik_split_safe_backfill_lane_v1) as safe_backfill_count,
  (select count(*)::int from pik_split_blocked_lane_v1) as blocked_count,
  (select collision_group_count from pik_split_safe_collision_check_v1) as safe_lane_collision_group_count,
  'PRINT_IDENTITY_KEY_BACKFILL_APPLY_V1'::text as next_safe_execution_unit,
  'PRINT_IDENTITY_KEY_BLOCKED_SURFACE_AUDIT_V1'::text as next_blocked_execution_unit,
  case
    when (select count(*)::int from pik_split_safe_backfill_lane_v1) = 31
      and (select count(*)::int from pik_split_blocked_lane_v1) = 1332
      and (select collision_group_count from pik_split_safe_collision_check_v1) = 0
      then 'passed'
    else 'failed'
  end as plan_status;

-- Phase 1: safe backfill surface.
select
  safe_backfill_count,
  next_safe_execution_unit
from pik_split_summary_v1;

select
  card_print_id,
  observed_set_code,
  name,
  number,
  current_number_plain,
  effective_number_plain,
  current_variant_key,
  normalized_variant_key,
  proposed_print_identity_key,
  lane_reason
from pik_split_safe_backfill_lane_v1
order by observed_set_code, name, card_print_id;

-- Phase 2: blocked surface.
select
  blocked_count,
  next_blocked_execution_unit
from pik_split_summary_v1;

select
  card_print_id,
  observed_set_code,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  lane_reason
from pik_split_blocked_lane_v1
order by observed_set_code, name, card_print_id;

-- Phase 3-4: execution split and safety.
select
  safe_backfill_count,
  blocked_count,
  safe_lane_collision_group_count,
  next_safe_execution_unit,
  next_blocked_execution_unit,
  plan_status
from pik_split_summary_v1;

rollback;
