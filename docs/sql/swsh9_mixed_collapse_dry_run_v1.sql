-- SWSH9_MIXED_COLLAPSE_V1
-- Read-only proof queries for the swsh9 mixed collapse:
-- - numeric duplicate collapse into canonical swsh9
-- - TG duplicate collapse into canonical swsh9tg

-- 1. Collapse-map proof
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cp.set_code as old_set_code,
    cpi.printed_number as old_number,
    cpi.normalized_printed_name,
    case
      when cpi.printed_number ~ '^[0-9]+$' then 'numeric'
      else 'tg'
    end as lane,
    case
      when cpi.printed_number ~ '^[0-9]+$' then coalesce(
        nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
        '0'
      )
      else null
    end as normalized_digits
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
),
canonical_numeric as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as normalized_digits
  from public.card_prints cp
  where cp.set_code = 'swsh9'
    and cp.gv_id is not null
),
canonical_tg as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9tg'
    and cp.gv_id is not null
),
numeric_candidates as (
  select
    u.old_id,
    c.new_id
  from unresolved u
  join canonical_numeric c
    on u.lane = 'numeric'
   and c.normalized_digits = u.normalized_digits
   and c.normalized_name = u.normalized_printed_name
),
numeric_old_counts as (
  select old_id, count(*)::int as match_count
  from numeric_candidates
  group by old_id
),
numeric_new_counts as (
  select new_id, count(*)::int as match_count
  from numeric_candidates
  group by new_id
),
numeric_map as (
  select
    'numeric'::text as lane,
    u.old_id,
    c.new_id,
    u.old_name,
    c.new_name,
    u.old_number,
    c.new_number,
    c.new_set_code,
    c.new_gv_id
  from unresolved u
  join numeric_candidates candidate
    on candidate.old_id = u.old_id
  join canonical_numeric c
    on c.new_id = candidate.new_id
  join numeric_old_counts old_counts
    on old_counts.old_id = candidate.old_id
  join numeric_new_counts new_counts
    on new_counts.new_id = candidate.new_id
  where u.lane = 'numeric'
    and old_counts.match_count = 1
    and new_counts.match_count = 1
),
tg_candidates as (
  select
    u.old_id,
    c.new_id
  from unresolved u
  join canonical_tg c
    on u.lane = 'tg'
   and c.new_number = u.old_number
   and c.normalized_name = u.normalized_printed_name
),
tg_old_counts as (
  select old_id, count(*)::int as match_count
  from tg_candidates
  group by old_id
),
tg_new_counts as (
  select new_id, count(*)::int as match_count
  from tg_candidates
  group by new_id
),
tg_map as (
  select
    'tg'::text as lane,
    u.old_id,
    c.new_id,
    u.old_name,
    c.new_name,
    u.old_number,
    c.new_number,
    c.new_set_code,
    c.new_gv_id
  from unresolved u
  join tg_candidates candidate
    on candidate.old_id = u.old_id
  join canonical_tg c
    on c.new_id = candidate.new_id
  join tg_old_counts old_counts
    on old_counts.old_id = candidate.old_id
  join tg_new_counts new_counts
    on new_counts.new_id = candidate.new_id
  where u.lane = 'tg'
    and old_counts.match_count = 1
    and new_counts.match_count = 1
),
collapse_map as (
  select * from numeric_map
  union all
  select * from tg_map
)
select
  (select count(*)::int from unresolved) as total_unresolved,
  (select count(*)::int from unresolved where lane = 'numeric') as numeric_unresolved,
  (select count(*)::int from unresolved where lane = 'tg') as tg_unresolved,
  (select count(*)::int from unresolved where lane = 'tg' and old_number ~ '^TG[0-9]{2}$') as tg_tgxx_count,
  (select count(*)::int from numeric_map) as numeric_map_count,
  (select count(distinct old_id)::int from numeric_map) as numeric_distinct_old_count,
  (select count(distinct new_id)::int from numeric_map) as numeric_distinct_new_count,
  (select count(*)::int from numeric_old_counts where match_count > 1) as numeric_multiple_match_old_count,
  (select count(*)::int from numeric_new_counts where match_count > 1) as numeric_reused_new_count,
  (select count(*)::int from unresolved u where u.lane = 'numeric' and not exists (
    select 1 from numeric_map m where m.old_id = u.old_id
  )) as numeric_unmatched_count,
  (select count(*)::int from tg_map) as tg_map_count,
  (select count(distinct old_id)::int from tg_map) as tg_distinct_old_count,
  (select count(distinct new_id)::int from tg_map) as tg_distinct_new_count,
  (select count(*)::int from tg_old_counts where match_count > 1) as tg_multiple_match_old_count,
  (select count(*)::int from tg_new_counts where match_count > 1) as tg_reused_new_count,
  (select count(*)::int from unresolved u where u.lane = 'tg' and not exists (
    select 1 from tg_map m where m.old_id = u.old_id
  )) as tg_unmatched_count,
  (select count(*)::int from collapse_map) as combined_map_count,
  (select count(distinct old_id)::int from collapse_map) as combined_distinct_old_count,
  (select count(distinct new_id)::int from collapse_map) as combined_distinct_new_count;

-- 2. Human-readable sample rows
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number,
    cpi.normalized_printed_name,
    case
      when cpi.printed_number ~ '^[0-9]+$' then 'numeric'
      else 'tg'
    end as lane,
    case
      when cpi.printed_number ~ '^[0-9]+$' then coalesce(
        nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
        '0'
      )
      else null
    end as normalized_digits
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
),
canonical_numeric as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as normalized_digits
  from public.card_prints cp
  where cp.set_code = 'swsh9'
    and cp.gv_id is not null
),
canonical_tg as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9tg'
    and cp.gv_id is not null
)
select
  'numeric' as lane,
  u.old_id,
  c.new_id,
  u.old_name,
  c.new_name,
  u.old_number,
  c.new_number,
  c.new_set_code,
  c.new_gv_id
from unresolved u
join canonical_numeric c
  on u.lane = 'numeric'
 and c.normalized_digits = u.normalized_digits
 and c.normalized_name = u.normalized_printed_name
where u.old_number = '001'
union all
select
  'tg' as lane,
  u.old_id,
  c.new_id,
  u.old_name,
  c.new_name,
  u.old_number,
  c.new_number,
  c.new_set_code,
  c.new_gv_id
from unresolved u
join canonical_tg c
  on u.lane = 'tg'
 and c.new_number = u.old_number
 and c.normalized_name = u.normalized_printed_name
where u.old_number = 'TG01';

-- 3. FK catalog snapshot for every table that references public.card_prints
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

-- 4. FK inventory replacement without dynamic EXECUTE, for the expected touched tables
with unresolved_old_ids as (
  select cp.id as old_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
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

-- 5. Collision audit for traits, printings, external mappings, and target identity occupancy
with unresolved as (
  select
    cp.id as old_id,
    cpi.printed_number as old_number,
    cpi.normalized_printed_name,
    case
      when cpi.printed_number ~ '^[0-9]+$' then 'numeric'
      else 'tg'
    end as lane,
    case
      when cpi.printed_number ~ '^[0-9]+$' then coalesce(
        nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
        '0'
      )
      else null
    end as normalized_digits
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'swsh9'
    and cp.gv_id is null
),
canonical_numeric as (
  select
    cp.id as new_id,
    cp.number as new_number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name,
    coalesce(
      nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
      '0'
    ) as normalized_digits
  from public.card_prints cp
  where cp.set_code = 'swsh9'
    and cp.gv_id is not null
),
canonical_tg as (
  select
    cp.id as new_id,
    cp.number as new_number,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'swsh9tg'
    and cp.gv_id is not null
),
collapse_map as (
  select
    'numeric'::text as lane,
    u.old_id,
    c.new_id
  from unresolved u
  join canonical_numeric c
    on u.lane = 'numeric'
   and c.normalized_digits = u.normalized_digits
   and c.normalized_name = u.normalized_printed_name
  union all
  select
    'tg'::text as lane,
    u.old_id,
    c.new_id
  from unresolved u
  join canonical_tg c
    on u.lane = 'tg'
   and c.new_number = u.old_number
   and c.normalized_name = u.normalized_printed_name
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
  from collapse_map m
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
  from collapse_map m
  join public.card_printings old_p
    on old_p.card_print_id = m.old_id
  join public.card_printings new_p
    on new_p.card_print_id = m.new_id
   and new_p.finish_key = old_p.finish_key
)
select
  (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from collapse_map)) as old_trait_row_count,
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
  (select count(*)::int from public.card_printings where card_print_id in (select old_id from collapse_map)) as old_printing_row_count,
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
  (select count(*)::int from public.external_mappings where card_print_id in (select old_id from collapse_map)) as old_external_mapping_row_count,
  (select count(*)::int from collapse_map m join public.external_mappings old_em on old_em.card_print_id = m.old_id
    join public.external_mappings new_em on new_em.card_print_id = m.new_id
     and new_em.source = old_em.source
     and new_em.external_id = old_em.external_id
  ) as external_mapping_conflict_count,
  (select count(*)::int from public.card_print_identity where card_print_id in (select new_id from collapse_map)) as target_identity_row_count;

-- 6. Post-apply validation query set
-- Run this only after the collapse apply has committed.
select
  (
    select count(*)::int
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = 'pokemon_eng_standard'
      and cpi.set_code_identity = 'swsh9'
      and cp.gv_id is null
  ) as remaining_unresolved_null_gvid_rows,
  (
    select count(*)::int
    from public.card_prints
    where set_code = 'swsh9'
      and gv_id is not null
  ) as canonical_swsh9_count,
  (
    select count(*)::int
    from public.card_prints
    where set_code = 'swsh9tg'
      and gv_id is not null
  ) as canonical_swsh9tg_count;
