-- SM12_BASE_VARIANT_COLLAPSE_V1
-- Live proof for the sm12 base-variant prep step.
-- Expected live counts on 2026-04-07:
--   unresolved_source_count = 58
--   canonical_target_count = 271
--   conflict_group_count = 58
--   lawful_map_count = 58
--   name_normalize_v1_count = 57
--   suffix_variant_count = 1

begin;

drop table if exists tmp_sm12_source_unresolved_v1;
drop table if exists tmp_sm12_canonical_targets_v1;
drop table if exists tmp_sm12_candidate_map_v1;
drop table if exists tmp_sm12_conflict_groups_v1;

create temp table tmp_sm12_source_unresolved_v1 on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
  cp.set_code as old_set_code,
  cp.number as old_parent_number,
  cp.number_plain as old_parent_number_plain,
  cpi.printed_number as source_printed_number,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as source_base_number_plain,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix,
  btrim(
    regexp_replace(
      regexp_replace(
        replace(
          replace(
            replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
            chr(96),
            ''''
          ),
          chr(180),
          ''''
        ),
        '\s*-\s*gx\b',
        ' gx',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as source_name_normalized_v1
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'sm12'
  and cp.gv_id is null;

create temp table tmp_sm12_canonical_targets_v1 on commit drop as
select
  cp.id as new_id,
  cp.name as new_name,
  cp.set_code as new_set_code,
  cp.number as new_number,
  cp.number_plain as new_number_plain,
  cp.gv_id as new_gv_id,
  btrim(
    regexp_replace(
      regexp_replace(
        replace(
          replace(
            replace(lower(cp.name), chr(8217), ''''),
            chr(96),
            ''''
          ),
          chr(180),
          ''''
        ),
        '\s*-\s*gx\b',
        ' gx',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as target_name_normalized_v1
from public.card_prints cp
where cp.set_code = 'sm12'
  and cp.gv_id is not null;

create temp table tmp_sm12_candidate_map_v1 on commit drop as
select
  s.old_id,
  s.old_name,
  s.old_set_code,
  s.old_parent_number,
  s.old_parent_number_plain,
  s.source_printed_number,
  s.source_base_number_plain,
  s.source_number_suffix,
  s.source_name_normalized_v1,
  c.new_id,
  c.new_name,
  c.new_set_code,
  c.new_number,
  c.new_number_plain,
  c.new_gv_id,
  c.target_name_normalized_v1,
  case
    when s.source_printed_number <> c.new_number then 'suffix_variant'
    else 'name_normalize_v1'
  end as match_category
from tmp_sm12_source_unresolved_v1 s
join tmp_sm12_canonical_targets_v1 c
  on c.new_number_plain = s.source_base_number_plain
 and c.target_name_normalized_v1 = s.source_name_normalized_v1;

create temp table tmp_sm12_conflict_groups_v1 on commit drop as
select
  s.source_base_number_plain as number_plain,
  count(*)::int as total_rows,
  count(*) filter (where c.new_id is not null)::int as canonical_rows,
  count(*) filter (where s.old_id is not null)::int as noncanonical_rows
from tmp_sm12_source_unresolved_v1 s
left join tmp_sm12_canonical_targets_v1 c
  on c.new_number_plain = s.source_base_number_plain
group by s.source_base_number_plain
order by s.source_base_number_plain::int;

-- 1. Unresolved source count
select count(*)::int as unresolved_source_count
from tmp_sm12_source_unresolved_v1;

-- 2. Canonical target count
select count(*)::int as canonical_target_count
from tmp_sm12_canonical_targets_v1;

-- 3. Conflict groups inside the logical sm12 base surface
select
  number_plain,
  total_rows,
  canonical_rows,
  noncanonical_rows
from tmp_sm12_conflict_groups_v1
order by number_plain::int;

-- 4. Invalid groups: multiple canonicals or missing canonicals
select
  number_plain,
  total_rows,
  canonical_rows,
  noncanonical_rows
from tmp_sm12_conflict_groups_v1
where canonical_rows <> 1
   or noncanonical_rows < 1
order by number_plain::int;

-- 5. Mapping proof and ambiguity checks
with old_counts as (
  select old_id, count(*)::int as match_count
  from tmp_sm12_candidate_map_v1
  group by old_id
),
new_counts as (
  select new_id, count(*)::int as match_count
  from tmp_sm12_candidate_map_v1
  group by new_id
)
select
  (select count(*)::int from tmp_sm12_candidate_map_v1) as lawful_map_count,
  (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
  (select count(*)::int from new_counts where match_count > 1) as reused_target_count,
  (
    select count(*)::int
    from tmp_sm12_source_unresolved_v1 s
    where not exists (
      select 1
      from tmp_sm12_candidate_map_v1 m
      where m.old_id = s.old_id
    )
  ) as unmatched_count,
  (
    select count(*)::int
    from tmp_sm12_source_unresolved_v1 s
    join tmp_sm12_canonical_targets_v1 c
      on c.new_number_plain = s.source_base_number_plain
    where c.target_name_normalized_v1 <> s.source_name_normalized_v1
  ) as same_base_different_name_count;

-- 6. Classification summary
select
  match_category,
  count(*)::int as row_count
from tmp_sm12_candidate_map_v1
group by match_category
order by match_category;

-- 7. Normalized-name comparison samples
select
  old_id,
  old_name,
  source_printed_number,
  source_base_number_plain,
  source_name_normalized_v1,
  new_id,
  new_name,
  new_number,
  target_name_normalized_v1,
  match_category
from tmp_sm12_candidate_map_v1
order by source_base_number_plain::int, source_printed_number
limit 12;

-- 8. FK readiness snapshot
select 'card_print_identity' as table_name, count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_id from tmp_sm12_candidate_map_v1)
union all
select 'card_print_traits' as table_name, count(*)::int as row_count
from public.card_print_traits
where card_print_id in (select old_id from tmp_sm12_candidate_map_v1)
union all
select 'card_printings' as table_name, count(*)::int as row_count
from public.card_printings
where card_print_id in (select old_id from tmp_sm12_candidate_map_v1)
union all
select 'external_mappings' as table_name, count(*)::int as row_count
from public.external_mappings
where card_print_id in (select old_id from tmp_sm12_candidate_map_v1)
union all
select 'vault_items' as table_name, count(*)::int as row_count
from public.vault_items
where card_id in (select old_id from tmp_sm12_candidate_map_v1);

-- 9. Sample conflict groups with parent rows
select
  'source' as lane,
  s.old_id as id,
  s.old_name as name,
  s.source_base_number_plain as number_plain,
  s.source_printed_number as printed_number,
  null::text as gv_id
from tmp_sm12_source_unresolved_v1 s
where s.source_base_number_plain in ('1', '143', '267')
union all
select
  'canonical' as lane,
  c.new_id as id,
  c.new_name as name,
  c.new_number_plain as number_plain,
  c.new_number as printed_number,
  c.new_gv_id as gv_id
from tmp_sm12_canonical_targets_v1 c
where c.new_number_plain in ('1', '143', '267')
order by number_plain, lane;

rollback;
