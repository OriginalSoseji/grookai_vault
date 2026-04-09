-- EXU_ALIAS_COLLAPSE_TO_EX10_V1
-- Read-only proof queries for collapsing the unresolved exu alias lane into
-- canonical ex10 rows by exact printed token + normalized name.

-- 1. Unresolved exu source count.
with unresolved as (
  select cpi.printed_number as printed_token
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'exu'
    and cp.gv_id is null
)
select
  count(*)::int as source_count,
  count(*) filter (where printed_token ~ '^[0-9]+$')::int as numeric_source_count,
  count(*) filter (where printed_token !~ '^[0-9]+$')::int as non_numeric_source_count,
  case when count(*) = 27 then 'OK' else 'DRIFT' end as source_count_status
from unresolved;

-- 2. Canonical ex10 target count and target identity occupancy on the scoped tokens.
with unresolved_tokens as (
  select distinct cpi.printed_number as printed_token
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'exu'
    and cp.gv_id is null
),
scoped_targets as (
  select cp.id
  from public.card_prints cp
  where cp.set_code = 'ex10'
    and cp.gv_id is not null
    and cp.number in (select printed_token from unresolved_tokens)
)
select
  (select count(*)::int from public.card_prints cp where cp.set_code = 'ex10' and cp.gv_id is not null) as canonical_ex10_count,
  (select count(*)::int from scoped_targets) as scoped_target_count,
  (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id in (select id from scoped_targets)) as scoped_target_identity_rows,
  (select count(*) filter (where cpi.is_active = true)::int from public.card_print_identity cpi where cpi.card_print_id in (select id from scoped_targets)) as scoped_target_active_identity_rows;

-- 3A. Runner source rows: unresolved exu parents.
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
  and cpi.set_code_identity = 'exu'
  and cp.gv_id is null
order by cpi.printed_number, cp.id;

-- 3B. Runner target rows: canonical ex10 parents.
select
  cp.id as new_id,
  cp.name as new_name,
  cp.set_code as new_set_code,
  cp.number as new_token,
  cp.gv_id as new_gv_id,
  lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
from public.card_prints cp
where cp.set_code = 'ex10'
  and cp.gv_id is not null
order by cp.number, cp.id;

-- 4. Exact-token + normalized-name overlap proof.
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
    and cpi.set_code_identity = 'exu'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_token,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.set_code = 'ex10'
    and cp.gv_id is not null
),
overlap_map as (
  select
    u.old_id,
    u.old_name,
    u.old_set_code,
    u.old_token,
    u.old_normalized_name,
    count(*) filter (
      where c.new_token = u.old_token
    )::int as same_token_candidate_count,
    count(*) filter (
      where c.new_token = u.old_token
        and c.new_normalized_name = u.old_normalized_name
    )::int as exact_token_same_name_match_count,
    count(*) filter (
      where c.new_token = u.old_token
        and c.new_normalized_name <> u.old_normalized_name
    )::int as same_token_different_name_count
  from unresolved u
  left join canonical c
    on c.new_token = u.old_token
  group by u.old_id, u.old_name, u.old_set_code, u.old_token, u.old_normalized_name
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
)
select
  (select count(*)::int from unresolved) as unresolved_count,
  (select count(*)::int from canonical) as canonical_target_count,
  (select count(*)::int from overlap_map where exact_token_same_name_match_count = 1) as exact_token_same_name_count,
  (select count(*)::int from overlap_map where exact_token_same_name_match_count = 0) as unmatched_count,
  (select count(*)::int from overlap_map where exact_token_same_name_match_count > 1) as multiple_match_old_count,
  (select count(*)::int from overlap_map where same_token_different_name_count > 0) as same_token_different_name_conflict_count,
  (select count(*)::int from collapse_map) as map_count,
  (select count(distinct old_id)::int from collapse_map) as distinct_old_count,
  (select count(distinct new_id)::int from collapse_map) as distinct_new_count,
  (select count(*)::int from (select new_id from collapse_map group by new_id having count(*) > 1) reused) as reused_new_count,
  (select count(*)::int from collapse_map where new_set_code <> 'ex10') as out_of_scope_new_target_count,
  (select count(*)::int from unresolved where old_set_code is not null) as non_null_old_parent_set_code_count;

-- 5. Ambiguity rows: multiple canonical matches.
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
    and cpi.set_code_identity = 'exu'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_token,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.set_code = 'ex10'
    and cp.gv_id is not null
)
select
  u.old_id,
  u.old_name,
  u.old_token,
  count(*)::int as candidate_count
from unresolved u
join canonical c
  on c.new_token = u.old_token
 and c.new_normalized_name = u.old_normalized_name
group by u.old_id, u.old_name, u.old_token
having count(*) > 1
order by u.old_token, u.old_id;

-- 6. Ambiguity rows: reused canonical targets.
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
    and cpi.set_code_identity = 'exu'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.number as new_token,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.set_code = 'ex10'
    and cp.gv_id is not null
),
collapse_map as (
  select
    u.old_id,
    c.new_id
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
)
select
  new_id,
  count(*)::int as reused_count
from collapse_map
group by new_id
having count(*) > 1
order by new_id;

-- 7. Unmatched rows and same-token different-name conflicts.
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
    and cpi.set_code_identity = 'exu'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_token,
    cp.gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.set_code = 'ex10'
    and cp.gv_id is not null
)
select
  'UNMATCHED'::text as anomaly_type,
  u.old_id,
  u.old_name,
  u.old_token,
  u.old_normalized_name,
  null::uuid as new_id,
  null::text as new_name,
  null::text as new_token,
  null::text as new_gv_id
from unresolved u
where not exists (
  select 1
  from canonical c
  where c.new_token = u.old_token
    and c.new_normalized_name = u.old_normalized_name
)
union all
select
  'SAME_TOKEN_DIFFERENT_NAME'::text as anomaly_type,
  u.old_id,
  u.old_name,
  u.old_token,
  u.old_normalized_name,
  c.new_id,
  c.new_name,
  c.new_token,
  c.gv_id as new_gv_id
from unresolved u
join canonical c
  on c.new_token = u.old_token
 and c.new_normalized_name <> u.old_normalized_name
order by anomaly_type, old_token, old_id;

-- 8. FK readiness snapshot counts for the frozen old_id scope.
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
    and cpi.set_code_identity = 'exu'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.number as new_token,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.set_code = 'ex10'
    and cp.gv_id is not null
),
collapse_map as (
  select
    u.old_id,
    c.new_id
  from unresolved u
  join canonical c
    on c.new_token = u.old_token
   and c.new_normalized_name = u.old_normalized_name
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

-- 9. Sample mappings: first, middle, last.
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
    and cpi.set_code_identity = 'exu'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_token,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as new_normalized_name
  from public.card_prints cp
  where cp.set_code = 'ex10'
    and cp.gv_id is not null
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
where seq in (1, 14, 27)
order by seq;
