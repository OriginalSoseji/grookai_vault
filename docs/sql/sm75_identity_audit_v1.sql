-- SM75_IDENTITY_AUDIT_V1
-- Read-only proof queries for the remaining null-gv_id sm7.5 identity surface.
-- The runner applies normalizeCardNameV1(raw_name, { canonName }) to the source rows returned below.

-- 1. Target unresolved surface counts
with unresolved as (
  select cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'sm7.5'
    and cp.gv_id is null
)
select
  count(*)::int as total_unresolved,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
  count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
from unresolved;

-- 2. Canonical sm7.5 snapshot
select
  count(*)::int as canonical_sm7p5_count,
  count(*) filter (where cp.gv_id is not null)::int as canonical_sm7p5_non_null_gvid_count
from public.card_prints cp
where cp.set_code = 'sm7.5';

-- 3. Conflicting canonical sm75 snapshot
select
  count(*)::int as canonical_sm75_count,
  count(*) filter (where cp.gv_id is not null)::int as canonical_sm75_non_null_gvid_count
from public.card_prints cp
where cp.set_code = 'sm75';

-- 4. Canonical sm7.5 sample rows
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'sm7.5'
  and cp.gv_id is not null
order by
  coalesce(nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), ''), '0')::int,
  cp.number,
  cp.id
limit 25;

-- 5. Canonical sm75 sample rows
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'sm75'
  and cp.gv_id is not null
order by
  coalesce(nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), ''), '0')::int,
  cp.number,
  cp.id
limit 25;

-- 6. Strict overlap audit against canonical sm75 using DB-lane normalized names
with unresolved as (
  select
    cp.id as old_card_print_id,
    cp.name as old_name,
    cpi.printed_number,
    cpi.normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'sm7.5'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as canonical_card_print_id,
    cp.name as canonical_name,
    cp.number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
    cp.gv_id,
    cp.set_code
  from public.card_prints cp
  where cp.set_code = 'sm75'
    and cp.gv_id is not null
),
overlap_map as (
  select
    u.old_card_print_id,
    u.old_name,
    u.printed_number,
    count(*) filter (
      where c.number = u.printed_number
        and c.normalized_name = u.normalized_printed_name
    )::int as same_name_same_number_match_count,
    count(*) filter (
      where c.number = u.printed_number
        and c.normalized_name <> u.normalized_printed_name
    )::int as same_number_different_name_match_count,
    count(*) filter (
      where c.number <> u.printed_number
        and c.normalized_name = u.normalized_printed_name
    )::int as same_name_different_number_match_count,
    count(*) filter (where c.number = u.printed_number)::int as exact_number_match_count
  from unresolved u
  left join canonical c
    on c.number = u.printed_number
    or c.normalized_name = u.normalized_printed_name
  group by
    u.old_card_print_id,
    u.old_name,
    u.printed_number,
    u.normalized_printed_name
)
select
  count(*) filter (where same_name_same_number_match_count > 0)::int as same_name_same_number_overlap_count,
  count(*) filter (
    where same_name_same_number_match_count = 0
      and same_number_different_name_match_count > 0
  )::int as same_number_different_name_count,
  count(*) filter (where same_name_different_number_match_count > 0)::int as same_name_different_number_count,
  count(*) filter (where exact_number_match_count > 1)::int as multiple_canonical_match_count,
  count(*) filter (where exact_number_match_count = 0)::int as zero_canonical_match_count
from overlap_map;

-- 7. Strict overlap anomaly rows
with unresolved as (
  select
    cp.id as old_card_print_id,
    cp.name as old_name,
    cpi.printed_number,
    cpi.normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'sm7.5'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as canonical_card_print_id,
    cp.name as canonical_name,
    cp.number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
    cp.gv_id,
    cp.set_code
  from public.card_prints cp
  where cp.set_code = 'sm75'
    and cp.gv_id is not null
),
overlap_map as (
  select
    u.old_card_print_id,
    u.old_name,
    u.printed_number,
    count(*) filter (
      where c.number = u.printed_number
        and c.normalized_name = u.normalized_printed_name
    )::int as same_name_same_number_match_count,
    count(*) filter (
      where c.number = u.printed_number
        and c.normalized_name <> u.normalized_printed_name
    )::int as same_number_different_name_match_count,
    count(*) filter (
      where c.number <> u.printed_number
        and c.normalized_name = u.normalized_printed_name
    )::int as same_name_different_number_match_count,
    count(*) filter (where c.number = u.printed_number)::int as exact_number_match_count
  from unresolved u
  left join canonical c
    on c.number = u.printed_number
    or c.normalized_name = u.normalized_printed_name
  group by
    u.old_card_print_id,
    u.old_name,
    u.printed_number,
    u.normalized_printed_name
)
select *
from overlap_map
where exact_number_match_count > 1
   or exact_number_match_count = 0
   or same_name_same_number_match_count = 0
   or same_name_different_number_match_count > 0
order by
  coalesce(nullif(regexp_replace(printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
  printed_number,
  old_card_print_id;

-- 8. Source rows used by the runner for canon-aware name proof and proposed-gv_id collision audit
select
  cp.id as card_print_id,
  cp.name,
  cp.variant_key,
  cpi.printed_number,
  cpi.normalized_printed_name,
  s.code as set_code,
  s.name as set_name,
  s.printed_set_abbrev,
  s.printed_total
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
left join public.sets s
  on s.id = cp.set_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'sm7.5'
  and cp.gv_id is null
order by
  coalesce(nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
  cpi.printed_number,
  cp.id;

-- 9. Canonical sm75 rows used by the runner for canon-aware name proof
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'sm75'
  and cp.gv_id is not null
order by
  coalesce(nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), ''), '0')::int,
  cp.number,
  cp.id;

-- 10. Live canonical rows used by the runner to resolve proposed-gv_id collisions
select
  cp.id,
  cp.gv_id,
  cp.set_code,
  cp.number,
  cp.name
from public.card_prints cp
where cp.set_code in ('sm7.5', 'sm75')
  and cp.gv_id is not null
order by cp.gv_id, cp.id;

-- 11. Printed-set-abbrev validation for sm7.5 and any shared canonical sets
select
  s.id,
  s.code,
  s.name,
  s.printed_set_abbrev,
  s.printed_total,
  s.source
from public.sets s
where s.code in ('sm7.5', 'sm75')
   or s.printed_set_abbrev = 'DRM'
order by s.code, s.id;

-- 12. Raw/provenance evidence for unresolved sm7.5 rows
with unresolved as (
  select
    cp.id as card_print_id,
    cp.name,
    cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'sm7.5'
    and cp.gv_id is null
),
tcgdex_mapping as (
  select distinct
    u.card_print_id,
    em.external_id
  from unresolved u
  join public.external_mappings em
    on em.card_print_id = u.card_print_id
   and em.source = 'tcgdex'
   and em.active = true
),
tcgdex_raw as (
  select distinct
    tm.card_print_id,
    ri.id as raw_import_id,
    coalesce(ri.payload -> 'set' ->> 'id', ri.payload ->> '_set_external_id', ri.payload ->> 'set_external_id') as raw_set_id
  from tcgdex_mapping tm
  left join public.raw_imports ri
    on ri.source = 'tcgdex'
   and (
     (ri.payload -> 'card' ->> 'id') = tm.external_id
     or (ri.payload ->> '_external_id') = tm.external_id
   )
)
select
  (select count(*)::int from tcgdex_mapping) as unresolved_tcgdex_mapping_count,
  (select count(*)::int from tcgdex_raw where raw_import_id is not null) as unresolved_tcgdex_raw_link_count,
  array_remove(array_agg(distinct tcgdex_raw.raw_set_id), null) as raw_set_ids
from tcgdex_raw;

-- 13. Raw/provenance sample rows
with unresolved as (
  select
    cp.id as card_print_id,
    cp.name,
    cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'sm7.5'
    and cp.gv_id is null
)
select
  u.card_print_id,
  u.name,
  u.printed_number,
  em.external_id,
  ri.id as raw_import_id,
  coalesce(ri.payload -> 'card' ->> 'id', ri.payload ->> '_external_id') as raw_card_id,
  coalesce(ri.payload -> 'set' ->> 'id', ri.payload ->> '_set_external_id', ri.payload ->> 'set_external_id') as raw_set_id,
  coalesce(ri.payload -> 'card' ->> 'localId', ri.payload ->> 'localId') as raw_local_id,
  ri.payload -> 'card' ->> 'name' as raw_name
from unresolved u
join public.external_mappings em
  on em.card_print_id = u.card_print_id
 and em.source = 'tcgdex'
 and em.active = true
left join public.raw_imports ri
  on ri.source = 'tcgdex'
 and (
   (ri.payload -> 'card' ->> 'id') = em.external_id
   or (ri.payload ->> '_external_id') = em.external_id
 )
order by
  coalesce(nullif(regexp_replace(u.printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
  u.printed_number,
  u.card_print_id
limit 25;
