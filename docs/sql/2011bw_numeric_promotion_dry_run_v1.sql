-- NUMERIC_PROMOTION_FOR_2011BW_V1
-- Exact read-only proof queries for the 2011bw numeric-only promotion surface.

-- Shared candidate surface.
with candidate_surface as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.gv_id as parent_gv_id,
    cp.variant_key,
    cp.set_code as parent_set_code,
    cpi.id as card_print_identity_id,
    cpi.identity_domain,
    cpi.set_code_identity,
    cpi.printed_number,
    cpi.normalized_printed_name,
    s.printed_set_abbrev,
    s.printed_total
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
)
select
  count(*)::int as candidate_count,
  count(*) filter (where parent_gv_id is null)::int as parent_gvid_null_count,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_only_count,
  count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_count,
  count(distinct set_code_identity)::int as distinct_set_code_identity_count
from candidate_surface;

-- Canonical base-lane presence.
select
  count(*)::int as canonical_base_count
from public.card_prints
where gv_id is not null
  and set_code = '2011bw';

-- printed_number uniqueness.
with candidate_surface as (
  select cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
)
select
  printed_number,
  count(*)::int as row_count
from candidate_surface
group by printed_number
having count(*) > 1
order by printed_number;

-- printed_set_abbrev presence and stability.
with candidate_surface as (
  select
    s.printed_set_abbrev,
    s.printed_total
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
)
select
  array_agg(distinct printed_set_abbrev order by printed_set_abbrev) filter (where printed_set_abbrev is not null) as printed_set_abbrev_values,
  array_agg(distinct printed_total order by printed_total) filter (where printed_total is not null) as printed_total_values,
  count(*) filter (where printed_set_abbrev is null or btrim(printed_set_abbrev) = '')::int as missing_printed_set_abbrev_count
from candidate_surface;

-- No exact canonical overlap for the same printed card.
with candidate_surface as (
  select
    cp.id as card_print_id,
    cp.name,
    cpi.printed_number,
    cpi.normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
)
select
  source.card_print_id,
  source.name,
  source.printed_number,
  canon.id as canonical_card_print_id,
  canon.name as canonical_name,
  canon.number as canonical_number,
  canon.gv_id
from candidate_surface source
join public.card_prints canon
  on canon.gv_id is not null
 and canon.set_code = '2011bw'
 and canon.number = source.printed_number
 and lower(regexp_replace(btrim(canon.name), '\s+', ' ', 'g')) = source.normalized_printed_name
order by source.printed_number::int, source.card_print_id;

-- Proposed gv_id derivation using the live base-lane builder equivalent for numeric-only rows.
with candidate_surface as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.variant_key,
    cpi.printed_number,
    s.printed_set_abbrev
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
),
candidate_with_proposed_gvid as (
  select
    card_print_id,
    name,
    printed_number,
    printed_set_abbrev,
    'GV-PK-' ||
      upper(regexp_replace(btrim(printed_set_abbrev), '[^A-Za-z0-9]+', '-', 'g')) ||
      '-' ||
      upper(regexp_replace(btrim(printed_number), '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
  from candidate_surface
)
select
  proposed_gv_id,
  count(*)::int as row_count
from candidate_with_proposed_gvid
group by proposed_gv_id
having count(*) > 1
order by proposed_gv_id;

-- Live gv_id collision audit.
with candidate_surface as (
  select
    cp.id as card_print_id,
    cp.name,
    cpi.printed_number,
    s.printed_set_abbrev
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
),
candidate_with_proposed_gvid as (
  select
    card_print_id,
    name,
    printed_number,
    printed_set_abbrev,
    'GV-PK-' ||
      upper(regexp_replace(btrim(printed_set_abbrev), '[^A-Za-z0-9]+', '-', 'g')) ||
      '-' ||
      upper(regexp_replace(btrim(printed_number), '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
  from candidate_surface
)
select
  c.card_print_id,
  c.name,
  c.printed_number,
  c.printed_set_abbrev,
  c.proposed_gv_id,
  live.id as live_card_print_id,
  live.set_code as live_set_code,
  live.number as live_number,
  live.name as live_name
from candidate_with_proposed_gvid c
join public.card_prints live
  on live.gv_id = c.proposed_gv_id
order by c.printed_number::int, c.card_print_id;

-- Sample 12 candidate rows with proposed gv_id.
with candidate_surface as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.variant_key,
    cpi.printed_number,
    s.printed_set_abbrev
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
),
candidate_with_proposed_gvid as (
  select
    card_print_id,
    name,
    printed_number,
    printed_set_abbrev,
    'GV-PK-' ||
      upper(regexp_replace(btrim(printed_set_abbrev), '[^A-Za-z0-9]+', '-', 'g')) ||
      '-' ||
      upper(regexp_replace(btrim(printed_number), '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
  from candidate_surface
)
select
  card_print_id,
  name,
  printed_number,
  printed_set_abbrev,
  proposed_gv_id
from candidate_with_proposed_gvid
order by printed_number::int, card_print_id
limit 12;
