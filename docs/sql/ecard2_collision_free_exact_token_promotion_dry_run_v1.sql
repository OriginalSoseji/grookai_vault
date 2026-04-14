-- ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V1
-- Read-only dry-run proof for the requested 24-row ecard2 promotion surface.
--
-- Live hard-gate result on 2026-04-11:
--   promotion_source_count = 24
--   collision_count = 13
--   duplicate_proposed_key_count = 0
--   blocked_overlap_count = 0
--
-- This means the requested 24-row "collision-free" apply artifact is blocked.

begin;

drop table if exists tmp_ecard2_promotion_unresolved_v1;
drop table if exists tmp_ecard2_promotion_canonical_in_set_v1;
drop table if exists tmp_ecard2_promotion_classified_v1;
drop table if exists tmp_ecard2_promotion_scope_v1;
drop table if exists tmp_ecard2_blocked_scope_v1;
drop table if exists tmp_ecard2_existing_key_collisions_v1;
drop table if exists tmp_ecard2_duplicate_proposed_keys_v1;
drop table if exists tmp_ecard2_blocked_overlap_v1;

create temp table tmp_ecard2_promotion_unresolved_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.set_id,
  s.code as set_code,
  s.printed_set_abbrev,
  cp.name as old_name,
  coalesce(cp.variant_key, '') as variant_key,
  cpi.printed_number as old_printed_token,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as proposed_number_plain
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'ecard2'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_ecard2_promotion_canonical_in_set_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.number_plain as candidate_target_number_plain
from public.card_prints cp
where cp.set_code = 'ecard2'
  and cp.gv_id is not null;

create temp table tmp_ecard2_promotion_classified_v1 on commit drop as
with row_metrics as (
  select
    u.old_parent_id,
    count(distinct c.candidate_target_id) filter (
      where c.candidate_target_number_plain = u.proposed_number_plain
        and lower(c.candidate_target_name) <> lower(u.old_name)
    )::int as same_base_different_name_count
  from tmp_ecard2_promotion_unresolved_v1 u
  left join tmp_ecard2_promotion_canonical_in_set_v1 c
    on c.candidate_target_number_plain = u.proposed_number_plain
  group by u.old_parent_id
)
select
  u.*,
  case
    when coalesce(rm.same_base_different_name_count, 0) > 0 then 'BLOCKED_CONFLICT'
    else 'PROMOTION_REQUIRED'
  end as execution_class
from tmp_ecard2_promotion_unresolved_v1 u
left join row_metrics rm
  on rm.old_parent_id = u.old_parent_id;

create temp table tmp_ecard2_promotion_scope_v1 on commit drop as
select
  c.old_parent_id,
  c.old_name,
  c.old_printed_token,
  c.set_id,
  c.set_code,
  c.variant_key,
  c.old_name as proposed_name,
  c.old_printed_token as proposed_number,
  c.proposed_number_plain,
  c.variant_key as proposed_variant_key,
  'GV-PK-' || upper(regexp_replace(c.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
    upper(regexp_replace(c.old_printed_token, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
from tmp_ecard2_promotion_classified_v1 c
where c.execution_class = 'PROMOTION_REQUIRED';

create temp table tmp_ecard2_blocked_scope_v1 on commit drop as
select *
from tmp_ecard2_promotion_classified_v1
where execution_class = 'BLOCKED_CONFLICT';

create temp table tmp_ecard2_existing_key_collisions_v1 on commit drop as
select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.proposed_gv_id,
  cp.id as colliding_card_print_id,
  cp.set_id as colliding_set_id,
  cp.set_code as colliding_set_code,
  cp.name as colliding_name,
  cp.number as colliding_number,
  cp.gv_id as colliding_gv_id,
  coalesce(ai.active_identity_count, 0) as colliding_active_identity_count
from tmp_ecard2_promotion_scope_v1 p
join public.card_prints cp
  on cp.gv_id = p.proposed_gv_id
left join (
  select
    cpi.card_print_id,
    count(*) filter (where cpi.is_active)::int as active_identity_count
  from public.card_print_identity cpi
  group by cpi.card_print_id
) ai
  on ai.card_print_id = cp.id;

create temp table tmp_ecard2_duplicate_proposed_keys_v1 on commit drop as
select
  set_id,
  proposed_number,
  proposed_number_plain,
  proposed_variant_key,
  count(*)::int as row_count
from tmp_ecard2_promotion_scope_v1
group by set_id, proposed_number, proposed_number_plain, proposed_variant_key
having count(*) > 1;

create temp table tmp_ecard2_blocked_overlap_v1 on commit drop as
select
  p.old_parent_id as promotion_old_parent_id,
  b.old_parent_id as blocked_old_parent_id,
  p.proposed_number,
  p.proposed_variant_key
from tmp_ecard2_promotion_scope_v1 p
join tmp_ecard2_blocked_scope_v1 b
  on b.set_id = p.set_id
 and b.old_printed_token = p.proposed_number
 and coalesce(b.variant_key, '') = p.proposed_variant_key;

-- Source count proof
select
  (select count(*)::int from tmp_ecard2_promotion_scope_v1) as promotion_source_count,
  (select count(*)::int from tmp_ecard2_blocked_scope_v1) as blocked_scope_count;

-- Per-row promotion identity surface and proposed canonical outputs
select
  old_parent_id,
  old_name,
  old_printed_token,
  set_code,
  variant_key,
  jsonb_build_object(
    'set_id', set_id,
    'set_code', set_code,
    'number', proposed_number,
    'number_plain', proposed_number_plain,
    'variant_key', proposed_variant_key
  ) as proposed_canonical_identity_key,
  proposed_name,
  proposed_number_plain,
  proposed_variant_key,
  proposed_gv_id
from tmp_ecard2_promotion_scope_v1
order by old_printed_token, old_name;

-- Existing canonical collisions
select
  old_parent_id,
  old_name,
  old_printed_token,
  proposed_gv_id,
  colliding_card_print_id,
  colliding_set_id,
  colliding_set_code,
  colliding_name,
  colliding_number,
  colliding_gv_id,
  colliding_active_identity_count
from tmp_ecard2_existing_key_collisions_v1
order by old_printed_token, old_name;

-- Duplicate proposed key proof
select
  set_id,
  proposed_number,
  proposed_number_plain,
  proposed_variant_key,
  row_count
from tmp_ecard2_duplicate_proposed_keys_v1
order by proposed_number, proposed_variant_key;

-- Blocked overlap proof
select
  promotion_old_parent_id,
  blocked_old_parent_id,
  proposed_number,
  proposed_variant_key
from tmp_ecard2_blocked_overlap_v1
order by proposed_number, promotion_old_parent_id;

-- FK readiness snapshot
select
  (select count(*)::int from public.card_print_identity where card_print_id in (select old_parent_id from tmp_ecard2_promotion_scope_v1)) as card_print_identity,
  (select count(*)::int from public.card_print_traits where card_print_id in (select old_parent_id from tmp_ecard2_promotion_scope_v1)) as card_print_traits,
  (select count(*)::int from public.card_printings where card_print_id in (select old_parent_id from tmp_ecard2_promotion_scope_v1)) as card_printings,
  (select count(*)::int from public.external_mappings where card_print_id in (select old_parent_id from tmp_ecard2_promotion_scope_v1)) as external_mappings,
  (select count(*)::int from public.vault_items where card_id in (select old_parent_id from tmp_ecard2_promotion_scope_v1)) as vault_items;

-- Proof summary
select
  (select count(*)::int from tmp_ecard2_existing_key_collisions_v1) as collision_count,
  (select count(*)::int from tmp_ecard2_duplicate_proposed_keys_v1) as duplicate_proposed_key_count,
  (select count(*)::int from tmp_ecard2_blocked_overlap_v1) as blocked_overlap_count;

rollback;
