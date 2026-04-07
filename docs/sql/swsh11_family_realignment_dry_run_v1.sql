-- SWSH11_FAMILY_REALIGNMENT_V1
-- Exact read-only proof queries for collapsing unresolved swsh11 TG-family rows
-- onto canonical swsh11tg parents.

-- Phase 1: unresolved swsh11 target surface counts.
with unresolved_swsh11 as (
  select
    cp.id as old_card_print_id,
    cp.name as old_name,
    cp.gv_id as old_gv_id,
    cpi.printed_number,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh11'
    and cp.gv_id is null
)
select
  count(*)::int as total_unresolved,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
  count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved,
  count(*) filter (where printed_number ~ '^TG[0-9]+$')::int as tg_family_unresolved,
  count(*) filter (where printed_number !~ '^TG[0-9]+$')::int as non_tg_rows,
  count(*) filter (where old_gv_id is null)::int as parent_gvid_null_count
from unresolved_swsh11;

-- Phase 1: canonical swsh11tg family-lane count.
select
  count(*)::int as canonical_swsh11tg_count
from public.card_prints
where set_code = 'swsh11tg'
  and gv_id is not null;

-- Phase 1 / 2: exact 1:1 mapping proof and ambiguity counts.
with unresolved_swsh11 as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh11'
    and cp.gv_id is null
),
canonical_swsh11tg as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh11tg'
    and cp.gv_id is not null
),
candidate_matches as (
  select
    u.old_id,
    c.new_id
  from unresolved_swsh11 u
  join canonical_swsh11tg c
    on c.new_number = u.old_number
   and c.normalized_name = u.normalized_printed_name
),
old_counts as (
  select old_id, count(*)::int as match_count
  from candidate_matches
  group by old_id
),
new_counts as (
  select new_id, count(*)::int as match_count
  from candidate_matches
  group by new_id
),
collapse_map as (
  select
    u.old_id,
    c.new_id
  from unresolved_swsh11 u
  join candidate_matches candidate
    on candidate.old_id = u.old_id
  join canonical_swsh11tg c
    on c.new_id = candidate.new_id
  join old_counts old_match
    on old_match.old_id = candidate.old_id
  join new_counts new_match
    on new_match.new_id = candidate.new_id
  where old_match.match_count = 1
    and new_match.match_count = 1
)
select
  (select count(*)::int from collapse_map) as collapse_map_count,
  (select count(distinct old_id)::int from collapse_map) as distinct_old_count,
  (select count(distinct new_id)::int from collapse_map) as distinct_new_count,
  (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
  (select count(*)::int from new_counts where match_count > 1) as reused_new_count,
  (
    select count(*)::int
    from unresolved_swsh11 u
    where not exists (
      select 1
      from collapse_map m
      where m.old_id = u.old_id
    )
  ) as unmatched_count,
  (
    select count(*)::int
    from unresolved_swsh11 u
    where exists (
      select 1
      from public.card_prints cp
      where cp.set_code = 'swsh11tg'
        and cp.gv_id is not null
        and cp.number = u.old_number
        and lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) <> u.normalized_printed_name
    )
  ) as different_name_overlap_count,
  (
    select count(cpi.id)::int
    from collapse_map m
    left join public.card_print_identity cpi
      on cpi.card_print_id = m.new_id
  ) as target_identity_occupancy_count;

-- Phase 1 / 2: sample 25 resolved mappings.
with unresolved_swsh11 as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh11'
    and cp.gv_id is null
),
canonical_swsh11tg as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh11tg'
    and cp.gv_id is not null
)
select
  u.old_id as old_card_print_id,
  u.old_name,
  u.old_number as old_printed_number,
  c.new_id as target_card_print_id,
  c.new_gv_id as target_gv_id,
  c.new_name as target_name
from unresolved_swsh11 u
join canonical_swsh11tg c
  on c.new_number = u.old_number
 and c.normalized_name = u.normalized_printed_name
order by u.old_number, u.old_id
limit 25;
