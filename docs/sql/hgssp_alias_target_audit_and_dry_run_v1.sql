-- HGSSP_ALIAS_COLLAPSE_V1
-- Read-only target discovery and dry-run proof for collapsing unresolved hgssp
-- alias-lane parents into the one lawful canonical target namespace.

-- 1. Unresolved hgssp source count.
with unresolved as (
  select cpi.printed_number as printed_token
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
)
select
  count(*)::int as source_count,
  count(*) filter (where printed_token ~ '^[0-9]+$')::int as numeric_source_count,
  count(*) filter (where printed_token !~ '^[0-9]+$')::int as non_numeric_source_count,
  case when count(*) = 25 then 'OK' else 'DRIFT' end as source_count_status
from unresolved;

-- 2. Exact runner source rows.
select
  cp.id as old_id,
  cp.name as old_name,
  cp.set_code as old_set_code,
  cp.variant_key,
  cpi.printed_number as old_token,
  coalesce(
    cpi.normalized_printed_name,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
  ) as old_normalized_name
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'hgssp'
  and cp.gv_id is null
order by cpi.printed_number, cp.id;

-- 3. Candidate canonical target namespaces by exact token + normalized name.
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_token,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as old_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.set_code as new_set_code,
    cp.name as new_name,
    cp.number as new_token,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.gv_id is not null
),
candidate_coverage as (
  select
    c.new_set_code as target_set_code,
    count(*)::int as match_rows,
    count(distinct u.old_id)::int as distinct_old_count,
    count(distinct c.new_id)::int as distinct_new_count
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  group by c.new_set_code
)
select
  target_set_code,
  match_rows,
  distinct_old_count,
  distinct_new_count,
  case
    when distinct_old_count = (select count(*) from unresolved) then 'FULL_SURFACE'
    else 'PARTIAL'
  end as discovery_status
from candidate_coverage
order by distinct_old_count desc, match_rows desc, target_set_code;

-- 4. Winning target discovery proof: exactly one namespace must absorb all rows.
with unresolved as (
  select
    cp.id as old_id,
    cpi.printed_number as old_token,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as old_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.set_code as new_set_code,
    cp.number as new_token,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.gv_id is not null
),
candidate_coverage as (
  select
    c.new_set_code as target_set_code,
    count(distinct u.old_id)::int as distinct_old_count
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  group by c.new_set_code
),
winning_target as (
  select target_set_code
  from candidate_coverage
  where distinct_old_count = (select count(*) from unresolved)
)
select
  (select count(*)::int from unresolved) as unresolved_count,
  (select count(*)::int from candidate_coverage) as candidate_target_count,
  (select count(*)::int from winning_target) as winning_target_count,
  (select target_set_code from winning_target limit 1) as winning_target_set_code;

-- 5. Canonical target count for the winning namespace.
with unresolved as (
  select
    cp.id as old_id,
    cpi.printed_number as old_token,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as old_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
),
canonical as (
  select
    cp.set_code as new_set_code,
    cp.number as new_token,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.gv_id is not null
),
candidate_coverage as (
  select
    c.new_set_code as target_set_code,
    count(distinct u.old_id)::int as distinct_old_count
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  group by c.new_set_code
),
winning_target as (
  select target_set_code
  from candidate_coverage
  where distinct_old_count = (select count(*) from unresolved)
)
select
  cp.set_code as target_set_code,
  count(*)::int as canonical_target_count
from public.card_prints cp
where cp.gv_id is not null
  and cp.set_code = (select target_set_code from winning_target limit 1)
group by cp.set_code;

-- 6. Frozen exact 1:1 collapse map proof inside the winning namespace.
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cp.set_code as old_set_code,
    cpi.printed_number as old_token,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as old_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.set_code as new_set_code,
    cp.name as new_name,
    cp.number as new_token,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.gv_id is not null
),
candidate_coverage as (
  select
    c.new_set_code as target_set_code,
    count(distinct u.old_id)::int as distinct_old_count
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  group by c.new_set_code
),
winning_target as (
  select target_set_code
  from candidate_coverage
  where distinct_old_count = (select count(*) from unresolved)
),
collapse_map as (
  select
    u.old_id,
    c.new_id,
    u.old_name,
    c.new_name,
    u.old_set_code,
    c.new_set_code,
    u.old_token,
    c.new_token,
    u.old_normalized_name,
    c.new_normalized_name,
    c.new_gv_id
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  where c.new_set_code = (select target_set_code from winning_target limit 1)
)
select
  (select target_set_code from winning_target limit 1) as target_set_code,
  (select count(*)::int from collapse_map) as map_count,
  (select count(distinct old_id)::int from collapse_map) as distinct_old_count,
  (select count(distinct new_id)::int from collapse_map) as distinct_new_count,
  (select count(*)::int from unresolved u where not exists (
    select 1 from collapse_map m where m.old_id = u.old_id
  )) as unmatched_count,
  (select count(*)::int from (
    select old_id from collapse_map group by old_id having count(*) > 1
  ) duplicate_old) as multiple_match_old_count,
  (select count(*)::int from (
    select new_id from collapse_map group by new_id having count(*) > 1
  ) duplicate_new) as reused_new_count,
  (select count(*)::int from unresolved where old_set_code is not null) as non_null_old_parent_set_code_count,
  (select count(*)::int from collapse_map where new_set_code <> (select target_set_code from winning_target limit 1)) as out_of_scope_new_target_count;

-- 7. Same-token different-name conflicts in the winning namespace.
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_token,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as old_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.set_code as new_set_code,
    cp.name as new_name,
    cp.number as new_token,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.gv_id is not null
),
candidate_coverage as (
  select
    c.new_set_code as target_set_code,
    count(distinct u.old_id)::int as distinct_old_count
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  group by c.new_set_code
),
winning_target as (
  select target_set_code
  from candidate_coverage
  where distinct_old_count = (select count(*) from unresolved)
)
select
  u.old_id,
  u.old_name,
  u.old_token,
  u.old_normalized_name,
  c.new_id,
  c.new_name,
  c.new_token,
  c.new_gv_id
from unresolved u
join canonical c
  on c.new_set_code = (select target_set_code from winning_target limit 1)
 and c.new_token = u.old_token
 and c.new_normalized_name <> u.old_normalized_name
order by u.old_token, u.old_id;

-- 8. Readiness snapshot counts for the frozen old_id scope.
with unresolved as (
  select
    cp.id as old_id,
    cpi.printed_number as old_token,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as old_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.set_code as new_set_code,
    cp.number as new_token,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.gv_id is not null
),
candidate_coverage as (
  select
    c.new_set_code as target_set_code,
    count(distinct u.old_id)::int as distinct_old_count
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  group by c.new_set_code
),
winning_target as (
  select target_set_code
  from candidate_coverage
  where distinct_old_count = (select count(*) from unresolved)
),
collapse_map as (
  select
    u.old_id,
    c.new_id
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  where c.new_set_code = (select target_set_code from winning_target limit 1)
)
select *
from (
  select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
    count(*)::int as row_count
  from public.card_print_identity
  where card_print_id in (select old_id from collapse_map)
  union all
  select 'card_print_traits', 'card_print_id', count(*)::int
  from public.card_print_traits
  where card_print_id in (select old_id from collapse_map)
  union all
  select 'card_printings', 'card_print_id', count(*)::int
  from public.card_printings
  where card_print_id in (select old_id from collapse_map)
  union all
  select 'external_mappings', 'card_print_id', count(*)::int
  from public.external_mappings
  where card_print_id in (select old_id from collapse_map)
  union all
  select 'vault_items', 'card_id', count(*)::int
  from public.vault_items
  where card_id in (select old_id from collapse_map)
) readiness
order by table_name, column_name;

-- 9. Collision-audit primitives for the frozen map.
with unresolved as (
  select
    cp.id as old_id,
    cpi.printed_number as old_token,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as old_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.set_code as new_set_code,
    cp.number as new_token,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.gv_id is not null
),
candidate_coverage as (
  select
    c.new_set_code as target_set_code,
    count(distinct u.old_id)::int as distinct_old_count
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  group by c.new_set_code
),
winning_target as (
  select target_set_code
  from candidate_coverage
  where distinct_old_count = (select count(*) from unresolved)
),
collapse_map as (
  select
    u.old_id,
    c.new_id
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  where c.new_set_code = (select target_set_code from winning_target limit 1)
)
select
  (select count(*)::int
   from public.card_print_traits old_t
   join collapse_map m on m.old_id = old_t.card_print_id) as old_trait_row_count,
  (select count(*)::int
   from public.card_print_traits old_t
   join collapse_map m on m.old_id = old_t.card_print_id
   join public.card_print_traits new_t
     on new_t.card_print_id = m.new_id
    and new_t.trait_type = old_t.trait_type
    and new_t.trait_value = old_t.trait_value
    and new_t.source = old_t.source) as trait_target_key_conflict_count,
  (select count(*)::int
   from public.card_printings old_p
   join collapse_map m on m.old_id = old_p.card_print_id) as old_printing_row_count,
  (select count(*)::int
   from public.card_printings old_p
   join collapse_map m on m.old_id = old_p.card_print_id
   join public.card_printings new_p
     on new_p.card_print_id = m.new_id
    and new_p.finish_key = old_p.finish_key) as printing_finish_conflict_count,
  (select count(*)::int
   from public.external_mappings old_em
   join collapse_map m on m.old_id = old_em.card_print_id) as old_external_mapping_row_count,
  (select count(*)::int
   from collapse_map m
   join public.external_mappings old_em on old_em.card_print_id = m.old_id
   join public.external_mappings new_em
     on new_em.card_print_id = m.new_id
    and new_em.source = old_em.source
    and new_em.external_id = old_em.external_id) as external_mapping_conflict_count,
  (select count(*)::int
   from public.card_print_identity cpi
   where cpi.card_print_id in (select new_id from collapse_map)) as target_identity_row_count;

-- 10. Sample mappings: first, middle, last.
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_token,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as old_normalized_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'hgssp'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.set_code as new_set_code,
    cp.name as new_name,
    cp.number as new_token,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.gv_id is not null
),
candidate_coverage as (
  select
    c.new_set_code as target_set_code,
    count(distinct u.old_id)::int as distinct_old_count
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  group by c.new_set_code
),
winning_target as (
  select target_set_code
  from candidate_coverage
  where distinct_old_count = (select count(*) from unresolved)
),
collapse_map as (
  select
    row_number() over (order by u.old_token, u.old_id) as seq,
    u.old_id,
    u.old_name,
    u.old_token,
    c.new_id,
    c.new_name,
    c.new_token,
    c.new_set_code,
    c.new_gv_id
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
  where c.new_set_code = (select target_set_code from winning_target limit 1)
)
select
  seq,
  old_id,
  old_name,
  old_token,
  new_id,
  new_name,
  new_token,
  new_set_code,
  new_gv_id
from collapse_map
where seq in (1, 13, 25)
order by seq;
