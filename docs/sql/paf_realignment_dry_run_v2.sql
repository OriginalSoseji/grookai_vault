-- PAF_REALIGNMENT_V3
-- Family-gated dry-run proof for Paldean Fates namespace realignment.
--
-- Locked family rule:
-- - all sv04.5 null-gv_id rows are the base/main family
-- - all sv4pt5 non-null-gv_id rows are the shiny family
-- - base/main must own GV-PK-PAF-###
-- - shiny must own GV-PK-PAF-###-S

drop table if exists tmp_paf_v2_base_lane;
drop table if exists tmp_paf_v2_shiny_lane;
drop table if exists tmp_paf_v2_base_duplicate_printed_numbers;
drop table if exists tmp_paf_v2_shiny_reassignment_map;
drop table if exists tmp_paf_v2_base_promotion_map;
drop table if exists tmp_paf_v2_unexpected_shiny_old_gvid_rows;
drop table if exists tmp_paf_v2_proposed_shiny_suffix_collisions;
drop table if exists tmp_paf_v2_proposed_base_post_realign_collisions;
drop table if exists tmp_paf_v2_out_of_scope_collisions;
drop table if exists tmp_paf_v2_overlap_info;

create temp table tmp_paf_v2_base_lane as
select
  cp.id as card_print_id,
  cp.name,
  cp.gv_id,
  cp.variant_key,
  cpi.printed_number,
  lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
  s.printed_set_abbrev
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where cpi.is_active = true
  and cpi.set_code_identity = 'sv04.5'
  and cp.gv_id is null;

create temp table tmp_paf_v2_shiny_lane as
select
  cp.id as card_print_id,
  cp.name,
  cp.number as printed_number,
  cp.gv_id as current_gv_id,
  cp.variant_key,
  lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
  s.printed_set_abbrev
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where cp.set_code = 'sv4pt5'
  and cp.gv_id is not null;

create temp table tmp_paf_v2_base_duplicate_printed_numbers as
select
  printed_number,
  count(*)::int as row_count
from tmp_paf_v2_base_lane
group by printed_number
having count(*) > 1;

create temp table tmp_paf_v2_overlap_info as
select
  base.card_print_id as base_card_print_id,
  shiny.card_print_id as shiny_card_print_id,
  base.name,
  base.printed_number
from tmp_paf_v2_base_lane base
join tmp_paf_v2_shiny_lane shiny
  on shiny.printed_number = base.printed_number
 and shiny.normalized_name = base.normalized_name;

create temp table tmp_paf_v2_shiny_reassignment_map as
select
  shiny.card_print_id,
  shiny.name,
  shiny.printed_number,
  shiny.current_gv_id,
  'GV-PK-' || upper(shiny.printed_set_abbrev) || '-' || upper(shiny.printed_number) as expected_old_gv_id,
  'GV-PK-' || upper(shiny.printed_set_abbrev) || '-' || upper(shiny.printed_number) || '-S' as proposed_gv_id
from tmp_paf_v2_shiny_lane shiny;

create temp table tmp_paf_v2_base_promotion_map as
select
  base.card_print_id,
  base.name,
  base.printed_number,
  'GV-PK-' || upper(base.printed_set_abbrev) || '-' || upper(base.printed_number) as proposed_gv_id
from tmp_paf_v2_base_lane base;

create temp table tmp_paf_v2_unexpected_shiny_old_gvid_rows as
select
  card_print_id,
  name,
  printed_number,
  current_gv_id,
  expected_old_gv_id
from tmp_paf_v2_shiny_reassignment_map
where current_gv_id <> expected_old_gv_id;

create temp table tmp_paf_v2_proposed_shiny_suffix_collisions as
select
  proposed_gv_id,
  count(*)::int as row_count
from tmp_paf_v2_shiny_reassignment_map
group by proposed_gv_id
having count(*) > 1;

insert into tmp_paf_v2_proposed_shiny_suffix_collisions (proposed_gv_id, row_count)
select
  live.gv_id as proposed_gv_id,
  count(*)::int as row_count
from public.card_prints live
join tmp_paf_v2_shiny_reassignment_map shiny
  on shiny.proposed_gv_id = live.gv_id
where live.id <> shiny.card_print_id
group by live.gv_id;

create temp table tmp_paf_v2_proposed_base_post_realign_collisions as
select
  live.gv_id as proposed_gv_id,
  live.id as live_card_print_id,
  live.set_code as live_set_code,
  live.number as live_number,
  live.name as live_name
from public.card_prints live
join tmp_paf_v2_base_promotion_map base
  on base.proposed_gv_id = live.gv_id
where live.id not in (
  select card_print_id
  from tmp_paf_v2_shiny_reassignment_map
);

create temp table tmp_paf_v2_out_of_scope_collisions as
select
  live.id as live_card_print_id,
  live.set_code as live_set_code,
  live.number as live_number,
  live.name as live_name,
  live.gv_id
from public.card_prints live
where live.gv_id in (
  select proposed_gv_id from tmp_paf_v2_base_promotion_map
  union
  select proposed_gv_id from tmp_paf_v2_shiny_reassignment_map
)
  and live.set_code not in ('sv04.5', 'sv4pt5');

select jsonb_pretty(
  jsonb_build_object(
    'base_candidate_count', (select count(*)::int from tmp_paf_v2_base_lane),
    'shiny_candidate_count', (select count(*)::int from tmp_paf_v2_shiny_lane),
    'overlap_count_informational', (select count(*)::int from tmp_paf_v2_overlap_info),
    'base_duplicate_printed_number_group_count', (select count(*)::int from tmp_paf_v2_base_duplicate_printed_numbers),
    'unexpected_shiny_old_gvid_count', (select count(*)::int from tmp_paf_v2_unexpected_shiny_old_gvid_rows),
    'proposed_shiny_suffix_collision_count', (select count(*)::int from tmp_paf_v2_proposed_shiny_suffix_collisions),
    'proposed_base_post_realign_collision_count', (select count(*)::int from tmp_paf_v2_proposed_base_post_realign_collisions),
    'out_of_scope_collision_count', (select count(*)::int from tmp_paf_v2_out_of_scope_collisions)
  )
) as paf_realignment_v2_summary;

select
  card_print_id,
  name,
  printed_number,
  current_gv_id,
  expected_old_gv_id,
  proposed_gv_id
from tmp_paf_v2_shiny_reassignment_map
order by printed_number, card_print_id
limit 25;

select
  card_print_id,
  name,
  printed_number,
  proposed_gv_id
from tmp_paf_v2_base_promotion_map
order by printed_number, card_print_id
limit 25;
