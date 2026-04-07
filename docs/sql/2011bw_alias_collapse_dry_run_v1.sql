-- 2011BW_ALIAS_COLLAPSE_TO_MCD11_V1
-- Read-only proof queries for collapsing the unresolved 2011bw alias lane into canonical mcd11.

-- 1. Unresolved 2011bw surface counts.
with unresolved as (
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
  count(*)::int as total_unresolved,
  count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
  count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
from unresolved;

-- 2. Canonical mcd11 lane summary and target identity occupancy.
with target_ids as (
  select cp.id
  from public.card_prints cp
  where cp.set_code = 'mcd11'
    and cp.gv_id is not null
)
select
  (select count(*)::int from target_ids) as canonical_mcd11_count,
  (select count(*)::int from public.card_print_identity where card_print_id in (select id from target_ids)) as target_any_identity_rows,
  (select count(*)::int from public.card_print_identity where card_print_id in (select id from target_ids) and is_active = true) as target_active_identity_rows;

-- 3. Strict 1:1 normalized-digit plus normalized-name map proof.
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cp.set_code as old_set_code,
    cpi.printed_number as old_number,
    coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.set_code as new_set_code,
    cp.number as new_number,
    coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'mcd11'
    and cp.gv_id is not null
),
candidate_matches as (
  select u.old_id, c.new_id
  from unresolved u
  join canonical c
    on c.new_number_normalized = u.old_number_normalized
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
  select u.old_id, c.new_id
  from unresolved u
  join candidate_matches candidate on candidate.old_id = u.old_id
  join canonical c on c.new_id = candidate.new_id
  join old_counts old_match on old_match.old_id = candidate.old_id
  join new_counts new_match on new_match.new_id = candidate.new_id
  where old_match.match_count = 1
    and new_match.match_count = 1
)
select
  (select count(*)::int from collapse_map) as map_count,
  (select count(distinct old_id)::int from collapse_map) as distinct_old_count,
  (select count(distinct new_id)::int from collapse_map) as distinct_new_count,
  (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
  (select count(*)::int from new_counts where match_count > 1) as reused_new_count,
  (select count(*)::int from unresolved u where not exists (select 1 from collapse_map m where m.old_id = u.old_id)) as unmatched_count,
  (select count(*)::int from unresolved u where exists (select 1 from canonical c where c.new_number_normalized = u.old_number_normalized and c.normalized_name = u.normalized_printed_name)) as same_number_same_name_count,
  (select count(*)::int from unresolved u where exists (select 1 from canonical c where c.new_number_normalized = u.old_number_normalized and c.normalized_name <> u.normalized_printed_name)) as same_number_different_name_count;

-- 4. Human-readable sample mappings.
with unresolved as (
  select
    cp.id as old_id,
    cp.name as old_name,
    cpi.printed_number as old_number,
    coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
    coalesce(
      cpi.normalized_printed_name,
      lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))
    ) as normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
),
canonical as (
  select
    cp.id as new_id,
    cp.name as new_name,
    cp.number as new_number,
    cp.gv_id as new_gv_id,
    lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'mcd11'
    and cp.gv_id is not null
)
select
  u.old_id as old_card_print_id,
  u.old_name,
  u.old_number as old_printed_number,
  c.new_id as target_card_print_id,
  c.new_name as target_name,
  c.new_number as target_number,
  c.new_gv_id as target_gv_id
from unresolved u
join canonical c
  on coalesce(nullif(ltrim(c.new_number, '0'), ''), '0') = u.old_number_normalized
 and c.normalized_name = u.normalized_printed_name
order by u.old_number_normalized::int, u.old_id;

-- 5. FK inventory and row counts on old parents.
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

with unresolved_ids as (
  select cp.id as old_id
  from public.card_print_identity cpi
  join public.card_prints cp on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = '2011bw'
    and cp.gv_id is null
)
select 'card_print_identity.card_print_id' as table_ref, count(*)::int as row_count from public.card_print_identity where card_print_id in (select old_id from unresolved_ids)
union all
select 'card_print_traits.card_print_id', count(*)::int from public.card_print_traits where card_print_id in (select old_id from unresolved_ids)
union all
select 'card_printings.card_print_id', count(*)::int from public.card_printings where card_print_id in (select old_id from unresolved_ids)
union all
select 'external_mappings.card_print_id', count(*)::int from public.external_mappings where card_print_id in (select old_id from unresolved_ids)
union all
select 'vault_items.card_id', count(*)::int from public.vault_items where card_id in (select old_id from unresolved_ids);

-- 6. Collision audit across touched FK tables.
with unresolved as (
  select cp.id as old_id, coalesce(nullif(ltrim(cpi.printed_number, '0'), ''), '0') as old_number_normalized,
         coalesce(cpi.normalized_printed_name, lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g'))) as normalized_printed_name
  from public.card_print_identity cpi
  join public.card_prints cp on cp.id = cpi.card_print_id
  where cpi.is_active = true and cpi.identity_domain = 'pokemon_eng_standard' and cpi.set_code_identity = '2011bw' and cp.gv_id is null
),
canonical as (
  select cp.id as new_id, coalesce(nullif(ltrim(cp.number, '0'), ''), '0') as new_number_normalized,
         lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as normalized_name
  from public.card_prints cp
  where cp.set_code = 'mcd11' and cp.gv_id is not null
),
collapse_map as (
  select u.old_id, c.new_id
  from unresolved u
  join canonical c on c.new_number_normalized = u.old_number_normalized and c.normalized_name = u.normalized_printed_name
)
select
  (select count(*)::int from public.card_print_traits where card_print_id in (select old_id from collapse_map)) as old_trait_row_count,
  (select count(*)::int from collapse_map m join public.card_print_traits old_t on old_t.card_print_id = m.old_id join public.card_print_traits new_t on new_t.card_print_id = m.new_id and new_t.trait_type = old_t.trait_type and new_t.trait_value = old_t.trait_value and new_t.source = old_t.source) as trait_target_key_conflict_count,
  (select count(*)::int from collapse_map m join public.card_print_traits old_t on old_t.card_print_id = m.old_id join public.card_print_traits new_t on new_t.card_print_id = m.new_id and new_t.trait_type = old_t.trait_type and new_t.trait_value = old_t.trait_value and new_t.source = old_t.source where old_t.confidence is distinct from new_t.confidence or old_t.hp is distinct from new_t.hp or old_t.national_dex is distinct from new_t.national_dex or old_t.types is distinct from new_t.types or old_t.rarity is distinct from new_t.rarity or old_t.supertype is distinct from new_t.supertype or old_t.card_category is distinct from new_t.card_category or old_t.legacy_rarity is distinct from new_t.legacy_rarity) as trait_conflicting_non_identical_count,
  (select count(*)::int from public.card_printings where card_print_id in (select old_id from collapse_map)) as old_printing_row_count,
  (select count(*)::int from collapse_map m join public.card_printings old_p on old_p.card_print_id = m.old_id join public.card_printings new_p on new_p.card_print_id = m.new_id and new_p.finish_key = old_p.finish_key) as printing_finish_conflict_count,
  (select count(*)::int from collapse_map m join public.card_printings old_p on old_p.card_print_id = m.old_id join public.card_printings new_p on new_p.card_print_id = m.new_id and new_p.finish_key = old_p.finish_key where old_p.is_provisional = new_p.is_provisional and (new_p.provenance_source is null or new_p.provenance_source = old_p.provenance_source) and (new_p.provenance_ref is null or new_p.provenance_ref = old_p.provenance_ref) and (new_p.created_by is null or new_p.created_by = old_p.created_by)) as printing_mergeable_metadata_only_count,
  (select count(*)::int from collapse_map m join public.external_mappings old_em on old_em.card_print_id = m.old_id join public.external_mappings new_em on new_em.card_print_id = m.new_id and new_em.source = old_em.source and new_em.external_id = old_em.external_id) as external_mapping_conflict_count,
  (select count(*)::int from public.card_print_identity where card_print_id in (select new_id from collapse_map)) as target_identity_row_count;

-- 7. Post-apply validation query set.
select
  (select count(*)::int from public.card_print_identity cpi join public.card_prints cp on cp.id = cpi.card_print_id where cpi.is_active = true and cpi.identity_domain = 'pokemon_eng_standard' and cpi.set_code_identity = '2011bw' and cp.gv_id is null) as remaining_unresolved_null_gvid_rows_for_2011bw,
  (select count(*)::int from public.card_prints where set_code = 'mcd11' and gv_id is not null) as canonical_mcd11_count;
