-- SM75_ALIAS_REALIGNMENT_COLLAPSE_TO_SM75_V1
-- Read-only proof queries for collapsing the sm7.5 alias lane into canonical sm75.
-- The runner applies normalizeCardNameV1(raw_name, { canonName }) to the source rows returned below.

-- 1. Unresolved sm7.5 surface count
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

-- 2. Canonical sm75 occupancy and target identity occupancy
with target_ids as (
  select cp.id
  from public.card_prints cp
  where cp.set_code = 'sm75'
    and cp.gv_id is not null
)
select
  (select count(*)::int from target_ids) as canonical_sm75_count,
  (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id in (select id from target_ids)) as target_any_identity_rows,
  (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id in (select id from target_ids) and cpi.is_active = true) as target_active_identity_rows;

-- 3A. Runner source rows: unresolved sm7.5 parents
select
  cp.id as old_id,
  cp.name as old_name,
  cp.set_code as old_set_code,
  cp.variant_key,
  cpi.printed_number as old_number,
  cpi.normalized_printed_name
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'sm7.5'
  and cp.gv_id is null
order by cpi.printed_number::int, cp.id;

-- 3B. Runner source rows: canonical sm75 parents
select
  cp.id as new_id,
  cp.name as new_name,
  cp.set_code as new_set_code,
  cp.number as new_number,
  cp.gv_id as new_gv_id
from public.card_prints cp
where cp.set_code = 'sm75'
  and cp.gv_id is not null
order by cp.number::int, cp.id;

-- 4. Strict DB-lane overlap summary against canonical sm75
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number,
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
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
    cp.gv_id
  from public.card_prints cp
  where cp.set_code = 'sm75'
    and cp.gv_id is not null
),
overlap_map as (
  select
    u.old_id,
    u.old_name,
    u.old_number,
    count(*) filter (
      where c.new_number = u.old_number
        and c.normalized_name = u.normalized_printed_name
    )::int as same_name_same_number_match_count,
    count(*) filter (
      where c.new_number = u.old_number
        and c.normalized_name <> u.normalized_printed_name
    )::int as same_number_different_name_match_count,
    count(*) filter (
      where c.new_number <> u.old_number
        and c.normalized_name = u.normalized_printed_name
    )::int as same_name_different_number_match_count,
    count(*) filter (where c.new_number = u.old_number)::int as exact_number_match_count
  from unresolved u
  left join canonical c
    on c.new_number = u.old_number
    or c.normalized_name = u.normalized_printed_name
  group by u.old_id, u.old_name, u.old_number, u.normalized_printed_name
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

-- 5. Strict anomaly rows that the runner repairs via normalizeCardNameV1(raw_name, { canonName })
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number,
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
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
    cp.gv_id
  from public.card_prints cp
  where cp.set_code = 'sm75'
    and cp.gv_id is not null
)
select
  u.old_id,
  u.old_name,
  u.old_number,
  c.new_id,
  c.new_name,
  c.new_number,
  c.gv_id
from unresolved u
join canonical c
  on c.new_number = u.old_number
where c.normalized_name <> u.normalized_printed_name
order by u.old_number::int, u.old_id;

-- 6. Same-number collapse-map proof after audit-proven canon-aware normalization
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cp.set_code as old_set_code,
    cpi.printed_number as old_number
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
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_number,
    cp.gv_id as new_gv_id
  from public.card_prints cp
  where cp.set_code = 'sm75'
    and cp.gv_id is not null
),
number_map as (
  select
    u.old_id,
    c.new_id,
    u.old_name,
    c.new_name,
    u.old_number,
    c.new_number,
    u.old_set_code,
    c.new_set_code,
    c.new_gv_id
  from unresolved u
  join canonical c
    on c.new_number = u.old_number
)
select
  (select count(*)::int from number_map) as map_count,
  (select count(distinct old_id)::int from number_map) as distinct_old_count,
  (select count(distinct new_id)::int from number_map) as distinct_new_count,
  (select count(*)::int from unresolved u where not exists (
    select 1 from number_map m where m.old_id = u.old_id
  )) as unmatched_count,
  (select count(*)::int from (
    select old_id from number_map group by old_id having count(*) > 1
  ) duplicate_old) as multiple_match_old_count,
  (select count(*)::int from (
    select new_id from number_map group by new_id having count(*) > 1
  ) duplicate_new) as reused_new_count;

-- 7. Human-readable sample rows
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number
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
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_number,
    cp.gv_id as new_gv_id
  from public.card_prints cp
  where cp.set_code = 'sm75'
    and cp.gv_id is not null
)
select
  u.old_id,
  u.old_name,
  u.old_number,
  c.new_id,
  c.new_name,
  c.new_number,
  c.new_set_code,
  c.new_gv_id
from unresolved u
join canonical c
  on c.new_number = u.old_number
where u.old_number in ('1', '11')
order by u.old_number::int, u.old_id;

-- 8. FK catalog snapshot for every table that references public.card_prints
select
  rel.relname as table_name,
  att.attname as column_name
from pg_constraint c
join pg_class rel on rel.oid = c.conrelid
join pg_namespace n on n.oid = rel.relnamespace
join pg_class frel on frel.oid = c.confrelid
join pg_namespace fn on fn.oid = frel.relnamespace
join unnest(c.conkey) with ordinality as k(attnum, ord) on true
join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
where c.contype = 'f'
  and n.nspname = 'public'
  and fn.nspname = 'public'
  and frel.relname = 'card_prints'
order by rel.relname, att.attname;

-- 9. FK counts for the supported touched tables
with unresolved_old_ids as (
  select cp.id as old_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'sm7.5'
    and cp.gv_id is null
)
select 'card_print_identity.card_print_id' as table_ref, count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_id from unresolved_old_ids)
union all
select 'card_print_traits.card_print_id', count(*)::int
from public.card_print_traits
where card_print_id in (select old_id from unresolved_old_ids)
union all
select 'card_printings.card_print_id', count(*)::int
from public.card_printings
where card_print_id in (select old_id from unresolved_old_ids)
union all
select 'external_mappings.card_print_id', count(*)::int
from public.external_mappings
where card_print_id in (select old_id from unresolved_old_ids)
union all
select 'vault_items.card_id', count(*)::int
from public.vault_items
where card_id in (select old_id from unresolved_old_ids);

-- 10. Collision audit using the same-number map
with unresolved as (
  select
    cp.id as old_id,
    cpi.printed_number as old_number
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
    cp.id as new_id,
    cp.number as new_number
  from public.card_prints cp
  where cp.set_code = 'sm75'
    and cp.gv_id is not null
),
number_map as (
  select
    u.old_id,
    c.new_id
  from unresolved u
  join canonical c
    on c.new_number = u.old_number
),
trait_key_conflicts as (
  select
    old_t.id as old_trait_id,
    new_t.id as new_trait_id,
    old_t.confidence as old_confidence,
    new_t.confidence as new_confidence,
    old_t.hp as old_hp,
    new_t.hp as new_hp,
    old_t.national_dex as old_national_dex,
    new_t.national_dex as new_national_dex,
    old_t.types as old_types,
    new_t.types as new_types,
    old_t.rarity as old_rarity,
    new_t.rarity as new_rarity,
    old_t.supertype as old_supertype,
    new_t.supertype as new_supertype,
    old_t.card_category as old_card_category,
    new_t.card_category as new_card_category,
    old_t.legacy_rarity as old_legacy_rarity,
    new_t.legacy_rarity as new_legacy_rarity
  from number_map m
  join public.card_print_traits old_t
    on old_t.card_print_id = m.old_id
  join public.card_print_traits new_t
    on new_t.card_print_id = m.new_id
   and new_t.trait_type = old_t.trait_type
   and new_t.trait_value = old_t.trait_value
   and new_t.source = old_t.source
),
printing_finish_conflicts as (
  select
    old_p.id as old_printing_id,
    new_p.id as new_printing_id,
    old_p.is_provisional as old_is_provisional,
    new_p.is_provisional as new_is_provisional,
    old_p.provenance_source as old_provenance_source,
    new_p.provenance_source as new_provenance_source,
    old_p.provenance_ref as old_provenance_ref,
    new_p.provenance_ref as new_provenance_ref,
    old_p.created_by as old_created_by,
    new_p.created_by as new_created_by
  from number_map m
  join public.card_printings old_p
    on old_p.card_print_id = m.old_id
  join public.card_printings new_p
    on new_p.card_print_id = m.new_id
   and new_p.finish_key = old_p.finish_key
)
select
  (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from number_map)) as old_trait_row_count,
  (select count(*)::int from trait_key_conflicts) as trait_target_key_conflict_count,
  (select count(*)::int from trait_key_conflicts where old_confidence is distinct from new_confidence
    or old_hp is distinct from new_hp
    or old_national_dex is distinct from new_national_dex
    or old_types is distinct from new_types
    or old_rarity is distinct from new_rarity
    or old_supertype is distinct from new_supertype
    or old_card_category is distinct from new_card_category
    or old_legacy_rarity is distinct from new_legacy_rarity
  ) as trait_conflicting_non_identical_count,
  (select count(*)::int from public.card_printings where card_print_id in (select old_id from number_map)) as old_printing_row_count,
  (select count(*)::int from printing_finish_conflicts) as printing_finish_conflict_count,
  (select count(*)::int from printing_finish_conflicts where old_is_provisional = new_is_provisional
    and (new_provenance_source is null or new_provenance_source = old_provenance_source)
    and (new_provenance_ref is null or new_provenance_ref = old_provenance_ref)
    and (new_created_by is null or new_created_by = old_created_by)
  ) as printing_mergeable_metadata_only_count,
  (select count(*)::int from printing_finish_conflicts where old_is_provisional is distinct from new_is_provisional
    or (old_provenance_source is not null and new_provenance_source is not null and old_provenance_source <> new_provenance_source)
    or (old_provenance_ref is not null and new_provenance_ref is not null and old_provenance_ref <> new_provenance_ref)
    or (old_created_by is not null and new_created_by is not null and old_created_by <> new_created_by)
  ) as printing_conflicting_non_identical_count,
  (select count(*)::int from public.external_mappings where card_print_id in (select old_id from number_map)) as old_external_mapping_row_count,
  (select count(*)::int from number_map m join public.external_mappings old_em on old_em.card_print_id = m.old_id
    join public.external_mappings new_em on new_em.card_print_id = m.new_id
     and new_em.source = old_em.source
     and new_em.external_id = old_em.external_id
  ) as external_mapping_conflict_count,
  (select count(*)::int from public.card_print_identity where card_print_id in (select new_id from number_map)) as target_identity_row_count;

-- 11. Post-apply validation query set
-- Run this only after the alias collapse has committed.
select
  (
    select count(*)::int
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = 'pokemon_eng_standard'
      and cpi.set_code_identity = 'sm7.5'
      and cp.gv_id is null
  ) as remaining_unresolved_null_gvid_rows,
  (
    select count(*)::int
    from public.card_prints
    where set_code = 'sm75'
      and gv_id is not null
  ) as canonical_sm75_count;
