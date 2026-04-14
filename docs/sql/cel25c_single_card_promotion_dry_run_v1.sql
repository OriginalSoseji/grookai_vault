-- CEL25C_HERE_COMES_TEAM_ROCKET_CANONICAL_PROMOTION_V1
-- Read-only dry run for the requested single-row Classic Collection promotion.
-- Live audit currently shows that the requested identity contract collides with
-- an existing cel25c canonical row (Venusaur / GV-PK-CEL-15CC), so this script
-- proves the blocker instead of mutating canonical data.

begin;

create temp view cel25c_hctr_target_set_v1 as
select
  s.id as set_id,
  s.code as set_code,
  s.name as set_name,
  s.printed_set_abbrev
from public.sets s
where s.code = 'cel25c';

create temp view cel25c_hctr_requested_identity_v1 as
select
  ts.set_id,
  ts.set_code,
  'Here Comes Team Rocket!'::text as name,
  '15'::text as number,
  '15'::text as number_plain,
  'cc'::text as variant_key,
  ''::text as printed_identity_modifier,
  'GV-PK-CEL-15CC'::text as proposed_gv_id
from cel25c_hctr_target_set_v1 ts;

create temp view cel25c_hctr_existing_exact_v1 as
select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.gv_id
from public.card_prints cp
join cel25c_hctr_requested_identity_v1 req
  on req.set_id = cp.set_id
where cp.gv_id is not null
  and cp.name = req.name
  and cp.number = req.number
  and coalesce(cp.variant_key, '') = req.variant_key;

create temp view cel25c_hctr_placeholder_source_v1 as
select
  cp.id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  cp.gv_id
from public.card_prints cp
join cel25c_hctr_requested_identity_v1 req
  on req.set_id = cp.set_id
where cp.gv_id is null
  and cp.name = req.name
  and cp.number = req.number;

create temp view cel25c_hctr_identity_key_collisions_v1 as
select
  cp.id as collision_target_id,
  cp.name as collision_target_name,
  cp.number as collision_target_number,
  cp.number_plain as collision_target_number_plain,
  coalesce(cp.variant_key, '') as collision_target_variant_key,
  coalesce(cp.printed_identity_modifier, '') as collision_target_printed_identity_modifier,
  cp.gv_id as collision_target_gv_id
from public.card_prints cp
join cel25c_hctr_requested_identity_v1 req
  on req.set_id = cp.set_id
where cp.gv_id is not null
  and cp.number_plain = req.number_plain
  and coalesce(cp.variant_key, '') = req.variant_key
order by cp.id;

create temp view cel25c_hctr_gvid_collisions_v1 as
select
  cp.id as collision_target_id,
  cp.name as collision_target_name,
  cp.number as collision_target_number,
  cp.number_plain as collision_target_number_plain,
  coalesce(cp.variant_key, '') as collision_target_variant_key,
  coalesce(cp.printed_identity_modifier, '') as collision_target_printed_identity_modifier,
  cp.gv_id as collision_target_gv_id,
  s.code as collision_target_set_code
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
join cel25c_hctr_requested_identity_v1 req
  on req.proposed_gv_id = cp.gv_id
order by cp.id;

create temp view cel25c_hctr_stale_bridge_v1 as
select
  em.id as external_mapping_id,
  em.external_id,
  em.card_print_id as current_card_print_id,
  cp.name as current_name,
  cp.number as current_number,
  cp.gv_id as current_gv_id
from public.external_mappings em
join public.card_prints cp
  on cp.id = em.card_print_id
where em.source = 'justtcg'
  and em.active is true
  and em.external_id = 'pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection';

-- Phase 1: requested identity and current placeholder.
select
  req.name,
  req.number,
  req.number_plain,
  req.variant_key,
  req.set_id,
  req.proposed_gv_id,
  (select count(*)::int from cel25c_hctr_existing_exact_v1) as existing_row_count,
  (select count(*)::int from cel25c_hctr_placeholder_source_v1) as source_placeholder_count
from cel25c_hctr_requested_identity_v1 req;

select
  id,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  gv_id
from cel25c_hctr_placeholder_source_v1;

-- Phase 2: exact canonical existence proof.
select
  id,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  gv_id
from cel25c_hctr_existing_exact_v1;

-- Phase 3: collision proof.
select
  collision_target_id,
  collision_target_name,
  collision_target_number,
  collision_target_number_plain,
  collision_target_variant_key,
  collision_target_printed_identity_modifier,
  collision_target_gv_id
from cel25c_hctr_identity_key_collisions_v1;

select
  collision_target_id,
  collision_target_name,
  collision_target_number,
  collision_target_number_plain,
  collision_target_variant_key,
  collision_target_gv_id,
  collision_target_set_code
from cel25c_hctr_gvid_collisions_v1;

-- Bridge context.
select
  external_mapping_id,
  external_id,
  current_card_print_id,
  current_name,
  current_number,
  current_gv_id
from cel25c_hctr_stale_bridge_v1;

-- Final summary.
select
  (select count(*)::int from cel25c_hctr_existing_exact_v1) as existing_row_count,
  (select count(*)::int from cel25c_hctr_identity_key_collisions_v1) as identity_key_collision_count,
  (select count(*)::int from cel25c_hctr_gvid_collisions_v1) as gv_id_collision_count,
  0::int as rows_insertable_now,
  0::int as gv_id_change_required,
  case
    when (select count(*)::int from cel25c_hctr_target_set_v1) = 0
      then 'BLOCKED_SET_MISSING'
    when (select count(*)::int from cel25c_hctr_placeholder_source_v1) <> 1
      then 'BLOCKED_SOURCE_PLACEHOLDER_DRIFT'
    when (select count(*)::int from cel25c_hctr_existing_exact_v1) > 0
      then 'BLOCKED_CANONICAL_ALREADY_EXISTS'
    when (select count(*)::int from cel25c_hctr_identity_key_collisions_v1) > 0
      then 'BLOCKED_IDENTITY_KEY_COLLISION'
    when (select count(*)::int from cel25c_hctr_gvid_collisions_v1) > 0
      then 'BLOCKED_GV_ID_COLLISION'
    else 'READY_TO_INSERT'
  end as hard_gate_status;

rollback;
