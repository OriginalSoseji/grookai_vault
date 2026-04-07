-- SM1_DUPLICATE_COLLAPSE_V1
-- Read-only dry-run proof for collapsing the single remaining null-gv_id sm1 parent.

-- 1. Build the unresolved and canonical proof surface.
with unresolved as (
  select
    cp.id as old_card_print_id,
    cp.name as old_name,
    cp.set_code as old_set_code,
    cpi.printed_number as old_printed_number,
    cpi.normalized_printed_name as old_normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as old_normalized_digits
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'sm1'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_card_print_id,
    cp.name as new_name,
    cp.number as new_number,
    cp.set_code as new_set_code,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as new_normalized_digits
  from public.card_prints cp
  where cp.set_code = 'sm1'
    and cp.gv_id is not null
),
candidates as (
  select
    u.old_card_print_id,
    c.new_card_print_id
  from unresolved u
  join canonical c
    on c.new_normalized_digits = u.old_normalized_digits
   and c.new_normalized_name = u.old_normalized_name
),
old_counts as (
  select old_card_print_id, count(*)::int as match_count
  from candidates
  group by old_card_print_id
),
new_counts as (
  select new_card_print_id, count(*)::int as match_count
  from candidates
  group by new_card_print_id
),
collapse_map as (
  select
    u.old_card_print_id,
    c.new_card_print_id,
    u.old_name,
    c.new_name,
    u.old_printed_number,
    c.new_number,
    c.new_gv_id,
    u.old_normalized_digits,
    c.new_normalized_digits,
    u.old_normalized_name,
    c.new_normalized_name
  from unresolved u
  join candidates candidate
    on candidate.old_card_print_id = u.old_card_print_id
  join canonical c
    on c.new_card_print_id = candidate.new_card_print_id
  join old_counts oc
    on oc.old_card_print_id = candidate.old_card_print_id
  join new_counts nc
    on nc.new_card_print_id = candidate.new_card_print_id
  where oc.match_count = 1
    and nc.match_count = 1
)
select
  (select count(*)::int from unresolved) as unresolved_count,
  (select count(*)::int from candidates) as canonical_match_count,
  (select count(*)::int from collapse_map) as map_count,
  (select count(distinct old_card_print_id)::int from collapse_map) as distinct_old_count,
  (select count(distinct new_card_print_id)::int from collapse_map) as distinct_new_count,
  (
    select count(*)::int
    from old_counts
    where match_count > 1
  ) as multiple_match_old_count,
  (
    select count(*)::int
    from unresolved u
    where not exists (
      select 1
      from collapse_map m
      where m.old_card_print_id = u.old_card_print_id
    )
  ) as unmatched_count,
  (
    select count(*)::int
    from new_counts
    where match_count > 1
  ) as multiple_match_new_count;

-- 2. Sample collapse-map row with normalized proof.
with unresolved as (
  select
    cp.id as old_card_print_id,
    cp.name as old_name,
    cpi.printed_number as old_printed_number,
    cpi.normalized_printed_name as old_normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as old_normalized_digits
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'sm1'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_card_print_id,
    cp.name as new_name,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as new_normalized_digits
  from public.card_prints cp
  where cp.set_code = 'sm1'
    and cp.gv_id is not null
),
candidates as (
  select
    u.old_card_print_id,
    c.new_card_print_id
  from unresolved u
  join canonical c
    on c.new_normalized_digits = u.old_normalized_digits
   and c.new_normalized_name = u.old_normalized_name
),
old_counts as (
  select old_card_print_id, count(*)::int as match_count
  from candidates
  group by old_card_print_id
),
new_counts as (
  select new_card_print_id, count(*)::int as match_count
  from candidates
  group by new_card_print_id
)
select
  u.old_card_print_id,
  u.old_name,
  u.old_printed_number,
  u.old_normalized_digits,
  u.old_normalized_name,
  c.new_card_print_id,
  c.new_name,
  c.new_number,
  c.new_gv_id,
  c.new_normalized_digits,
  c.new_normalized_name,
  (u.old_normalized_digits = c.new_normalized_digits) as normalized_digits_match,
  (u.old_normalized_name = c.new_normalized_name) as normalized_name_match
from unresolved u
join candidates candidate
  on candidate.old_card_print_id = u.old_card_print_id
join canonical c
  on c.new_card_print_id = candidate.new_card_print_id
join old_counts oc
  on oc.old_card_print_id = candidate.old_card_print_id
join new_counts nc
  on nc.new_card_print_id = candidate.new_card_print_id
where oc.match_count = 1
  and nc.match_count = 1;

-- 3. FK inventory for the specific old_id across live handled tables.
with collapse_map as (
  with unresolved as (
    select
      cp.id as old_card_print_id,
      cpi.normalized_printed_name as old_normalized_name,
      coalesce(
        nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
        '0'
      ) as old_normalized_digits
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = 'pokemon_eng_standard'
      and cpi.set_code_identity = 'sm1'
      and cp.gv_id is null
  ),
  canonical as (
    select
      cp.id as new_card_print_id,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name,
      coalesce(
        nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
        '0'
      ) as new_normalized_digits
    from public.card_prints cp
    where cp.set_code = 'sm1'
      and cp.gv_id is not null
  )
  select
    u.old_card_print_id,
    c.new_card_print_id
  from unresolved u
  join canonical c
    on c.new_normalized_digits = u.old_normalized_digits
   and c.new_normalized_name = u.old_normalized_name
)
select 'card_print_identity'::text as table_name, count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_card_print_id from collapse_map)
union all
select 'card_print_traits'::text as table_name, count(*)::int as row_count
from public.card_print_traits
where card_print_id in (select old_card_print_id from collapse_map)
union all
select 'card_printings'::text as table_name, count(*)::int as row_count
from public.card_printings
where card_print_id in (select old_card_print_id from collapse_map)
union all
select 'external_mappings'::text as table_name, count(*)::int as row_count
from public.external_mappings
where card_print_id in (select old_card_print_id from collapse_map)
union all
select 'vault_items'::text as table_name, count(*)::int as row_count
from public.vault_items
where card_id in (select old_card_print_id from collapse_map)
order by table_name;
