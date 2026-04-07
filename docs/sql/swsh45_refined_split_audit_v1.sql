-- SWSH45_REFINED_SPLIT_AUDIT_V1
-- Read-only proof queries for the split swsh4.5 unresolved surface.

-- 1. Target surface counts
with unresolved as (
  select cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh4.5'
    and cp.gv_id is null
)
select
  count(*)::int as total_unresolved,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
  count(*) filter (where printed_number ~ '^SV[0-9]+$')::int as sv_family_unresolved,
  count(*) filter (
    where printed_number !~ '^[0-9]+$'
      and printed_number !~ '^SV[0-9]+$'
  )::int as other_non_numeric_unresolved
from unresolved;

-- 2. Canonical swsh45sv target summary
select
  count(*)::int as canonical_swsh45sv_total_rows,
  count(*) filter (where cp.gv_id is not null)::int as canonical_swsh45sv_non_null_gvid_count
from public.card_prints cp
where cp.set_code = 'swsh45sv'
  and cp.gv_id is not null;

-- 3. Canonical swsh45sv sample rows
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'swsh45sv'
  and cp.gv_id is not null
order by cp.number, cp.id
limit 25;

-- 4. Strict SV-family mapping proof
with family_unresolved as (
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
    and cpi.set_code_identity = 'swsh4.5'
    and cp.gv_id is null
    and cpi.printed_number ~ '^SV[0-9]+$'
),
canonical_family as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number,
    cp.gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh45sv'
    and cp.gv_id is not null
),
candidate_matches as (
  select
    u.old_id,
    c.new_id
  from family_unresolved u
  join canonical_family c
    on c.number = u.printed_number
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
    candidate.old_id,
    candidate.new_id
  from candidate_matches candidate
  join old_counts old_match
    on old_match.old_id = candidate.old_id
  join new_counts new_match
    on new_match.new_id = candidate.new_id
  where old_match.match_count = 1
    and new_match.match_count = 1
)
select
  (select count(*)::int from collapse_map) as family_mapping_candidate_count,
  (select count(distinct old_id)::int from collapse_map) as family_distinct_old_count,
  (select count(distinct new_id)::int from collapse_map) as family_distinct_new_count,
  (select count(*)::int from old_counts where match_count > 1) as family_multiple_match_old_count,
  (select count(*)::int from new_counts where match_count > 1) as family_reused_new_count,
  (
    select count(*)::int
    from family_unresolved u
    where not exists (
      select 1
      from collapse_map m
      where m.old_id = u.old_id
    )
  ) as family_unmatched_count,
  (
    select count(*)::int
    from family_unresolved u
    where exists (
      select 1
      from canonical_family c
      where c.number = u.printed_number
        and c.normalized_name = u.normalized_name
    )
  ) as family_same_number_same_name_count,
  (
    select count(*)::int
    from family_unresolved u
    where exists (
      select 1
      from canonical_family c
      where c.number = u.printed_number
        and c.normalized_name <> u.normalized_name
    )
  ) as family_same_number_different_name_count;

-- 5. Sample SV-family mappings
with family_unresolved as (
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
    and cpi.set_code_identity = 'swsh4.5'
    and cp.gv_id is null
    and cpi.printed_number ~ '^SV[0-9]+$'
),
canonical_family as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number,
    cp.gv_id,
    cp.set_code,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh45sv'
    and cp.gv_id is not null
)
select
  u.old_id,
  u.old_name,
  u.printed_number,
  c.new_id,
  c.new_name,
  c.number,
  c.gv_id,
  c.set_code
from family_unresolved u
join canonical_family c
  on c.number = u.printed_number
 and c.normalized_name = u.normalized_name
order by u.printed_number, u.old_id
limit 25;

-- 6. Numeric blocker details
with numeric_unresolved as (
  select
    cp.id as card_print_id,
    cp.name as unresolved_name,
    cpi.printed_number,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as normalized_digits
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh4.5'
    and cp.gv_id is null
    and cpi.printed_number ~ '^[0-9]+$'
),
canonical_base as (
  select
    cp.id as candidate_card_print_id,
    cp.name as candidate_name,
    cp.number as candidate_number,
    cp.gv_id as candidate_gv_id,
    cp.set_code as candidate_set_code,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as normalized_digits
  from public.card_prints cp
  where cp.set_code = 'swsh4.5'
    and cp.gv_id is not null
),
canonical_family as (
  select
    cp.id as family_card_print_id,
    cp.name as family_name,
    cp.number as family_number,
    cp.gv_id as family_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh45sv'
    and cp.gv_id is not null
)
select
  u.card_print_id,
  u.unresolved_name,
  u.printed_number,
  b.candidate_card_print_id,
  b.candidate_name,
  b.candidate_number,
  b.candidate_gv_id,
  b.candidate_set_code,
  case
    when b.candidate_card_print_id is null then 'no_target'
    when b.normalized_name = u.normalized_name then 'same_number_same_name'
    else 'same_number_different_name'
  end as collision_type,
  (
    select count(*)::int
    from canonical_base b2
    where b2.normalized_digits = u.normalized_digits
      and b2.normalized_name = u.normalized_name
  ) as lawful_base_target_count,
  (
    select count(*)::int
    from canonical_family f
    where f.family_number = u.printed_number
      and f.normalized_name = u.normalized_name
  ) as lawful_family_target_count
from numeric_unresolved u
left join canonical_base b
  on b.normalized_digits = u.normalized_digits
order by
  coalesce(
    nullif(ltrim(regexp_replace(u.printed_number, '[^0-9]', '', 'g'), '0'), ''),
    '0'
  )::int,
  b.candidate_number,
  b.candidate_card_print_id;

-- 7. Family subset FK readiness snapshot
with family_old_ids as (
  select cp.id as old_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh4.5'
    and cp.gv_id is null
    and cpi.printed_number ~ '^SV[0-9]+$'
)
select *
from (
  select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
    count(*)::int as row_count
  from public.card_print_identity
  where card_print_id in (select old_id from family_old_ids)
  union all
  select 'card_print_traits', 'card_print_id', count(*)::int
  from public.card_print_traits
  where card_print_id in (select old_id from family_old_ids)
  union all
  select 'card_printings', 'card_print_id', count(*)::int
  from public.card_printings
  where card_print_id in (select old_id from family_old_ids)
  union all
  select 'external_mappings', 'card_print_id', count(*)::int
  from public.external_mappings
  where card_print_id in (select old_id from family_old_ids)
  union all
  select 'vault_items', 'card_id', count(*)::int
  from public.vault_items
  where card_id in (select old_id from family_old_ids)
) readiness
order by table_name, column_name;
