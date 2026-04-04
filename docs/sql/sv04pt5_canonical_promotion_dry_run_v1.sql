-- SV04PT5_CANONICAL_PROMOTION_V1
-- Read-only proof for promoting the null-`gv_id` sv04.5 main lane.
--
-- This artifact explicitly keeps `sv4pt5` out of the canonical-overlap test.
-- It does NOT ignore live `gv_id` uniqueness. If the proven public token for
-- sv04.5 generates a `gv_id` already present on any live row, the phase must stop.

drop table if exists tmp_sv04pt5_source_set;
drop table if exists tmp_sv04pt5_shiny_set;
drop table if exists tmp_sv04pt5_source_rows;
drop table if exists tmp_sv04pt5_printed_number_dupes;
drop table if exists tmp_sv04pt5_exact_canonical_overlap_excluding_sv4pt5;
drop table if exists tmp_sv04pt5_candidate_map;
drop table if exists tmp_sv04pt5_internal_gvid_collisions;
drop table if exists tmp_sv04pt5_live_gvid_collisions;
drop table if exists tmp_sv04pt5_sv4pt5_card_level_same_name_number;

create temp table tmp_sv04pt5_source_set as
select
  id,
  code,
  name,
  printed_set_abbrev,
  printed_total,
  source
from public.sets
where code = 'sv04.5';

create temp table tmp_sv04pt5_shiny_set as
select
  id,
  code,
  name,
  printed_set_abbrev,
  printed_total,
  source
from public.sets
where code = 'sv4pt5';

create temp table tmp_sv04pt5_source_rows as
select
  cp.id as card_print_id,
  cp.name,
  cp.gv_id,
  cp.variant_key,
  cpi.identity_domain,
  cpi.set_code_identity,
  cpi.printed_number,
  cpi.normalized_printed_name,
  source_set.printed_set_abbrev
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join tmp_sv04pt5_source_set source_set
  on true
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'sv04.5'
  and cp.gv_id is null;

create unique index tmp_sv04pt5_source_rows_id_uidx
  on tmp_sv04pt5_source_rows (card_print_id);

create temp table tmp_sv04pt5_printed_number_dupes as
select
  printed_number,
  count(*)::int as row_count
from tmp_sv04pt5_source_rows
group by printed_number
having count(*) > 1;

create temp table tmp_sv04pt5_exact_canonical_overlap_excluding_sv4pt5 as
select
  source.card_print_id,
  source.printed_number,
  source.name,
  canon.id as canonical_card_print_id,
  canon.set_code as canonical_set_code,
  canon.number as canonical_number,
  canon.name as canonical_name,
  canon.gv_id
from tmp_sv04pt5_source_rows source
join public.card_prints canon
  on canon.gv_id is not null
 and canon.set_code = 'sv04.5'
 and canon.number = source.printed_number
 and lower(regexp_replace(btrim(canon.name), '\s+', ' ', 'g')) = source.normalized_printed_name;

create temp table tmp_sv04pt5_candidate_map as
select
  source.card_print_id,
  source.name,
  source.set_code_identity,
  source.printed_number,
  source.identity_domain,
  source.printed_set_abbrev,
  'GV-PK-' ||
    upper(
      regexp_replace(
        regexp_replace(
          regexp_replace(btrim(source.printed_set_abbrev), '[^A-Za-z0-9]+', '-', 'g'),
          '-+',
          '-',
          'g'
        ),
        '(^-+|-+$)',
        '',
        'g'
      )
    ) ||
    '-' ||
    upper(regexp_replace(btrim(source.printed_number), '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
from tmp_sv04pt5_source_rows source
where source.printed_number ~ '^[0-9]+$'
  and source.printed_set_abbrev is not null
  and btrim(source.printed_set_abbrev) <> ''
  and coalesce(nullif(source.variant_key, ''), '') = '';

create unique index tmp_sv04pt5_candidate_map_id_uidx
  on tmp_sv04pt5_candidate_map (card_print_id);

create temp table tmp_sv04pt5_internal_gvid_collisions as
select
  proposed_gv_id,
  count(*)::int as row_count
from tmp_sv04pt5_candidate_map
group by proposed_gv_id
having count(*) > 1;

create temp table tmp_sv04pt5_live_gvid_collisions as
select
  candidate.card_print_id,
  candidate.name,
  candidate.printed_number,
  candidate.printed_set_abbrev,
  candidate.proposed_gv_id,
  live.id as live_card_print_id,
  live.set_code as live_set_code,
  live.number as live_number,
  live.name as live_name
from tmp_sv04pt5_candidate_map candidate
join public.card_prints live
  on live.gv_id = candidate.proposed_gv_id;

create temp table tmp_sv04pt5_sv4pt5_card_level_same_name_number as
select
  source.card_print_id,
  source.printed_number,
  source.name,
  shiny.id as shiny_card_print_id,
  shiny.number as shiny_number,
  shiny.name as shiny_name,
  shiny.gv_id
from tmp_sv04pt5_source_rows source
join public.card_prints shiny
  on shiny.gv_id is not null
 and shiny.set_code = 'sv4pt5'
 and shiny.number = source.printed_number
 and lower(regexp_replace(btrim(shiny.name), '\s+', ' ', 'g')) = source.normalized_printed_name;

-- A. Hard-gate summary
select jsonb_pretty(
  jsonb_build_object(
    'source_set', (
      select jsonb_build_object(
        'code', code,
        'name', name,
        'printed_set_abbrev', printed_set_abbrev,
        'printed_total', printed_total
      )
      from tmp_sv04pt5_source_set
    ),
    'shiny_set', (
      select jsonb_build_object(
        'code', code,
        'name', name,
        'printed_set_abbrev', printed_set_abbrev,
        'printed_total', printed_total
      )
      from tmp_sv04pt5_shiny_set
    ),
    'candidate_pool_count', (
      select count(*)::int from tmp_sv04pt5_source_rows
    ),
    'all_candidates_parent_gvid_null', (
      select count(*)::int = sum(case when gv_id is null then 1 else 0 end)::int
      from tmp_sv04pt5_source_rows
    ),
    'distinct_printed_number_count', (
      select count(distinct printed_number)::int from tmp_sv04pt5_source_rows
    ),
    'printed_number_duplicate_group_count', (
      select count(*)::int from tmp_sv04pt5_printed_number_dupes
    ),
    'exact_canonical_overlap_excluding_sv4pt5_count', (
      select count(*)::int from tmp_sv04pt5_exact_canonical_overlap_excluding_sv4pt5
    ),
    'candidate_map_count', (
      select count(*)::int from tmp_sv04pt5_candidate_map
    ),
    'distinct_proposed_gvid_count', (
      select count(distinct proposed_gv_id)::int from tmp_sv04pt5_candidate_map
    ),
    'internal_gvid_collision_count', (
      select count(*)::int from tmp_sv04pt5_internal_gvid_collisions
    ),
    'live_gvid_collision_count', (
      select count(*)::int from tmp_sv04pt5_live_gvid_collisions
    ),
    'sv4pt5_same_number_same_name_count', (
      select count(*)::int from tmp_sv04pt5_sv4pt5_card_level_same_name_number
    ),
    'live_collision_breakdown_by_set', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'live_set_code', live_set_code,
            'row_count', row_count
          )
          order by live_set_code
        ),
        '[]'::jsonb
      )
      from (
        select live_set_code, count(*)::int as row_count
        from tmp_sv04pt5_live_gvid_collisions
        group by live_set_code
      ) grouped
    )
  )
) as sv04pt5_phase_summary;

-- B. Sample candidate rows
select
  card_print_id,
  name,
  printed_number,
  proposed_gv_id
from tmp_sv04pt5_candidate_map
order by printed_number, card_print_id
limit 25;

-- C. Printed-number duplicates (must be empty)
select
  printed_number,
  row_count
from tmp_sv04pt5_printed_number_dupes
order by printed_number;

-- D. Exact canonical overlaps excluding sv4pt5 (must be empty)
select
  card_print_id,
  printed_number,
  name,
  canonical_card_print_id,
  canonical_set_code,
  canonical_number,
  canonical_name,
  gv_id
from tmp_sv04pt5_exact_canonical_overlap_excluding_sv4pt5
order by printed_number, card_print_id;

-- E. Live gv_id collisions (blocking)
select
  card_print_id,
  name,
  printed_number,
  printed_set_abbrev,
  proposed_gv_id,
  live_card_print_id,
  live_set_code,
  live_number,
  live_name
from tmp_sv04pt5_live_gvid_collisions
order by printed_number, card_print_id
limit 250;
