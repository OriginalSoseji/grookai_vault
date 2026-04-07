-- RECLASSIFICATION_AUDIT_FOR_2012BW_TO_MCD12_V1
-- Exact read-only queries for auditing whether unresolved 2012bw rows are
-- duplicate canonical rows that map 1:1 onto canonical mcd12.

-- Phase 1: unresolved 2012bw surface counts.
with unresolved as (
  select cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2012bw'
    and cp.gv_id is null
)
select
  count(*)::int as total_unresolved,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
  count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
from unresolved;

-- Phase 2: canonical mcd12 target summary.
select
  count(*)::int as canonical_mcd12_total_rows,
  count(*) filter (where gv_id is not null)::int as canonical_mcd12_non_null_gvid_count
from public.card_prints
where set_code = 'mcd12';

-- Phase 2: canonical mcd12 sample rows.
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'mcd12'
  and cp.gv_id is not null
order by cp.number::int, cp.id
limit 25;

-- Phase 3: strict 1:1 mapping audit by normalized digits and normalized name.
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2012bw'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number,
    cp.gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'mcd12'
    and cp.gv_id is not null
),
candidate_matches as (
  select
    u.old_id,
    c.new_id
  from unresolved u
  join canonical c
    on coalesce(nullif(ltrim(u.printed_number, '0'), ''), '0')
     = coalesce(nullif(ltrim(c.number, '0'), ''), '0')
   and c.normalized_name = u.normalized_name
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
  from unresolved u
  join candidate_matches candidate
    on candidate.old_id = u.old_id
  join canonical c
    on c.new_id = candidate.new_id
  join old_counts old_match
    on old_match.old_id = candidate.old_id
  join new_counts new_match
    on new_match.new_id = candidate.new_id
  where old_match.match_count = 1
    and new_match.match_count = 1
)
select
  (select count(*)::int from collapse_map) as mapping_candidate_count,
  (select count(distinct old_id)::int from collapse_map) as distinct_old_count,
  (select count(distinct new_id)::int from collapse_map) as distinct_new_count,
  (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
  (select count(*)::int from new_counts where match_count > 1) as reused_new_count,
  (
    select count(*)::int
    from unresolved u
    where not exists (
      select 1
      from collapse_map m
      where m.old_id = u.old_id
    )
  ) as unmatched_count,
  (
    select count(*)::int
    from unresolved u
    where exists (
      select 1
      from canonical c
      where coalesce(nullif(ltrim(u.printed_number, '0'), ''), '0')
         = coalesce(nullif(ltrim(c.number, '0'), ''), '0')
        and c.normalized_name = u.normalized_name
    )
  ) as same_number_same_name_count,
  (
    select count(*)::int
    from unresolved u
    where exists (
      select 1
      from canonical c
      where coalesce(nullif(ltrim(u.printed_number, '0'), ''), '0')
         = coalesce(nullif(ltrim(c.number, '0'), ''), '0')
        and c.normalized_name <> u.normalized_name
    )
  ) as same_number_different_name_count;

-- Phase 3: mapping samples.
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number,
    cp.variant_key,
    s.printed_set_abbrev,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2012bw'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number,
    cp.gv_id,
    cp.set_code,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'mcd12'
    and cp.gv_id is not null
)
select
  u.old_id,
  u.old_name,
  u.printed_number,
  u.variant_key,
  u.printed_set_abbrev,
  c.new_id,
  c.new_name,
  c.number,
  c.gv_id,
  c.set_code
from unresolved u
join canonical c
  on coalesce(nullif(ltrim(u.printed_number, '0'), ''), '0')
   = coalesce(nullif(ltrim(c.number, '0'), ''), '0')
 and c.normalized_name = u.normalized_name
order by u.printed_number::int, u.old_id
limit 25;

-- Phase 4: canonical rows required for namespace verification.
select
  cp.id,
  cp.name,
  cp.number,
  cp.gv_id,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'mcd12'
  and cp.gv_id is not null
order by cp.number::int, cp.id;

-- Phase 5: FK readiness snapshot for unresolved 2012bw parent ids.
with unresolved_ids as (
  select cp.id as old_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2012bw'
    and cp.gv_id is null
)
select *
from (
  select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
    count(*)::int as row_count
  from public.card_print_identity
  where card_print_id in (select old_id from unresolved_ids)
  union all
  select 'card_print_traits', 'card_print_id', count(*)::int
  from public.card_print_traits
  where card_print_id in (select old_id from unresolved_ids)
  union all
  select 'card_printings', 'card_print_id', count(*)::int
  from public.card_printings
  where card_print_id in (select old_id from unresolved_ids)
  union all
  select 'external_mappings', 'card_print_id', count(*)::int
  from public.external_mappings
  where card_print_id in (select old_id from unresolved_ids)
  union all
  select 'vault_items', 'card_id', count(*)::int
  from public.vault_items
  where card_id in (select old_id from unresolved_ids)
) readiness
order by table_name, column_name;
