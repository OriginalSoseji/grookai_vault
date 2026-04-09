-- SM7_IDENTITY_RESOLUTION_V1
-- Live proof for adaptive identity resolution on sm7.
-- Expected live counts on 2026-04-07:
--   unresolved_source_count = 35
--   canonical_target_count = 183
--   exact_match_count = 0
--   same_token_different_name_count = 33
--   exact_unmatched_count = 35
--   classification = BASE_VARIANT_COLLAPSE
--   lawful_base_variant_map_count = 35
--   name_normalize_v2_count = 33
--   suffix_variant_count = 2

begin;

drop table if exists tmp_sm7_source_unresolved_v1;
drop table if exists tmp_sm7_canonical_targets_v1;
drop table if exists tmp_sm7_exact_match_audit_v1;
drop table if exists tmp_sm7_base_variant_map_v1;

create temp table tmp_sm7_source_unresolved_v1 on commit drop as
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
            replace(
              replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
              chr(96),
              ''''
            ),
            chr(180),
            ''''
          ),
          chr(8212),
          ' '
        ),
        '\s*-\s*gx\b',
        ' gx',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as source_name_normalized_v2,
  lower(btrim(coalesce(cpi.normalized_printed_name, cp.name))) as source_exact_name_key
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'sm7'
  and cp.gv_id is null;

create temp table tmp_sm7_canonical_targets_v1 on commit drop as
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
            replace(
              replace(lower(cp.name), chr(8217), ''''),
              chr(96),
              ''''
            ),
            chr(180),
            ''''
          ),
          chr(8212),
          ' '
        ),
        '\s*-\s*gx\b',
        ' gx',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as target_name_normalized_v2,
  lower(btrim(cp.name)) as target_exact_name_key
from public.card_prints cp
where cp.set_code = 'sm7'
  and cp.gv_id is not null;

create temp table tmp_sm7_exact_match_audit_v1 on commit drop as
with token_candidates as (
  select
    s.old_id,
    s.old_name,
    s.source_printed_number,
    s.source_exact_name_key,
    c.new_id,
    c.new_name,
    c.new_number,
    c.new_gv_id,
    c.target_exact_name_key
  from tmp_sm7_source_unresolved_v1 s
  left join tmp_sm7_canonical_targets_v1 c
    on c.new_number = s.source_printed_number
)
select
  s.old_id,
  count(c.new_id)::int as same_token_candidate_count,
  count(c.new_id) filter (where c.target_exact_name_key = s.source_exact_name_key)::int as exact_match_count,
  count(c.new_id) filter (where c.target_exact_name_key <> s.source_exact_name_key)::int as same_token_different_name_count
from tmp_sm7_source_unresolved_v1 s
left join token_candidates c
  on c.old_id = s.old_id
group by s.old_id, s.source_exact_name_key;

create temp table tmp_sm7_base_variant_map_v1 on commit drop as
select
  s.old_id,
  s.old_name,
  s.old_set_code,
  s.old_parent_number,
  s.old_parent_number_plain,
  s.source_printed_number,
  s.source_base_number_plain,
  s.source_number_suffix,
  s.source_name_normalized_v2,
  c.new_id,
  c.new_name,
  c.new_set_code,
  c.new_number,
  c.new_number_plain,
  c.new_gv_id,
  c.target_name_normalized_v2,
  case
    when s.source_printed_number <> c.new_number then 'suffix_variant'
    else 'name_normalize_v2'
  end as match_category
from tmp_sm7_source_unresolved_v1 s
join tmp_sm7_canonical_targets_v1 c
  on c.new_number_plain = s.source_base_number_plain
 and c.target_name_normalized_v2 = s.source_name_normalized_v2;

-- 1. Unresolved source count
select count(*)::int as unresolved_source_count
from tmp_sm7_source_unresolved_v1;

-- 2. Canonical target count
select count(*)::int as canonical_target_count
from tmp_sm7_canonical_targets_v1;

-- 3. Exact-token audit used for class detection
select
  (select count(*)::int from tmp_sm7_exact_match_audit_v1 where exact_match_count = 1) as exact_match_count,
  (select count(*)::int from tmp_sm7_exact_match_audit_v1 where exact_match_count > 1) as exact_multiple_match_count,
  (select count(*)::int from tmp_sm7_exact_match_audit_v1 where same_token_different_name_count > 0) as same_token_different_name_count,
  (select count(*)::int from tmp_sm7_exact_match_audit_v1 where exact_match_count = 0) as exact_unmatched_count;

-- 4. Classification decision
select
  s.old_id,
  s.old_name,
  s.source_printed_number as old_printed_token,
  c.new_id as candidate_canonical_id,
  c.new_name as candidate_canonical_name,
  c.new_gv_id as candidate_canonical_gv_id
from tmp_sm7_source_unresolved_v1 s
join tmp_sm7_canonical_targets_v1 c
  on c.new_number = s.source_printed_number
where lower(btrim(c.new_name)) <> s.source_exact_name_key
order by
  coalesce(nullif(regexp_replace(s.source_printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
  s.source_printed_number,
  s.old_id
limit 12;

-- 5. Classification decision
with audit as (
  select
    (select count(*)::int from tmp_sm7_source_unresolved_v1) as source_count,
    (select count(*)::int from tmp_sm7_exact_match_audit_v1 where exact_match_count = 1) as exact_matches,
    (select count(*)::int from tmp_sm7_exact_match_audit_v1 where same_token_different_name_count > 0) as conflicts,
    (select count(*)::int from tmp_sm7_exact_match_audit_v1 where exact_match_count = 0) as unmatched
)
select
  source_count,
  exact_matches,
  conflicts,
  unmatched,
  case
    when exact_matches = source_count
     and conflicts = 0
     and unmatched = 0
      then 'DUPLICATE_COLLAPSE'
    else 'BASE_VARIANT_COLLAPSE'
  end as classification
from audit;

-- 6. Scope proof and old-parent null surface
select
  count(*)::int as null_old_parent_set_code_count,
  count(*) filter (where old_parent_number is null)::int as null_old_parent_number_count,
  count(*) filter (where old_parent_number_plain is null)::int as null_old_parent_number_plain_count,
  count(*) filter (where old_set_code is not null and old_set_code <> 'sm7')::int as out_of_scope_old_set_count
from tmp_sm7_source_unresolved_v1;

-- 7. Base-variant map proof
with old_counts as (
  select old_id, count(*)::int as match_count
  from tmp_sm7_base_variant_map_v1
  group by old_id
),
new_counts as (
  select new_id, count(*)::int as match_count
  from tmp_sm7_base_variant_map_v1
  group by new_id
)
select
  (select count(*)::int from tmp_sm7_base_variant_map_v1) as lawful_base_variant_map_count,
  (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
  (select count(*)::int from new_counts where match_count > 1) as reused_target_count,
  (
    select count(*)::int
    from tmp_sm7_source_unresolved_v1 s
    where not exists (
      select 1
      from tmp_sm7_base_variant_map_v1 m
      where m.old_id = s.old_id
    )
  ) as unmatched_count,
  (
    select count(*)::int
    from tmp_sm7_base_variant_map_v1
    where new_set_code <> 'sm7'
  ) as cross_set_target_count;

-- 8. Normalization path summary
select
  match_category,
  count(*)::int as row_count
from tmp_sm7_base_variant_map_v1
group by match_category
order by match_category;

-- 9. Invalid base groups after normalization
with grouped as (
  select
    source_base_number_plain,
    count(*)::int as source_rows
  from tmp_sm7_source_unresolved_v1
  group by source_base_number_plain
),
canonical_grouped as (
  select
    new_number_plain,
    count(*)::int as canonical_rows
  from tmp_sm7_canonical_targets_v1
  group by new_number_plain
),
matched_grouped as (
  select
    source_base_number_plain,
    count(*)::int as matched_rows
  from tmp_sm7_base_variant_map_v1
  group by source_base_number_plain
)
select
  g.source_base_number_plain,
  g.source_rows,
  coalesce(c.canonical_rows, 0) as canonical_rows,
  coalesce(m.matched_rows, 0) as matched_rows
from grouped g
left join canonical_grouped c
  on c.new_number_plain = g.source_base_number_plain
left join matched_grouped m
  on m.source_base_number_plain = g.source_base_number_plain
where coalesce(c.canonical_rows, 0) <> 1
   or coalesce(m.matched_rows, 0) <> g.source_rows
order by g.source_base_number_plain::int;

-- 10. FK readiness snapshot
select 'card_print_identity' as table_name, count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_id from tmp_sm7_base_variant_map_v1)
union all
select 'card_print_traits' as table_name, count(*)::int as row_count
from public.card_print_traits
where card_print_id in (select old_id from tmp_sm7_base_variant_map_v1)
union all
select 'card_printings' as table_name, count(*)::int as row_count
from public.card_printings
where card_print_id in (select old_id from tmp_sm7_base_variant_map_v1)
union all
select 'external_mappings' as table_name, count(*)::int as row_count
from public.external_mappings
where card_print_id in (select old_id from tmp_sm7_base_variant_map_v1)
union all
select 'vault_items' as table_name, count(*)::int as row_count
from public.vault_items
where card_id in (select old_id from tmp_sm7_base_variant_map_v1);

-- 11. Sample before/after mappings
select
  old_id,
  old_name,
  source_printed_number as old_printed_number,
  new_id,
  new_name,
  new_number as target_printed_number,
  new_gv_id,
  new_set_code,
  match_category
from tmp_sm7_base_variant_map_v1
where old_id in (
  '8dfd2103-36c3-4a05-bff3-d1a1ba2c0210',
  '80f4988a-c101-4351-8b15-0798eb9e7c8e',
  '92e9ffdd-ca1f-496f-a3ef-cf90a207e26d'
)
order by source_base_number_plain::int, source_printed_number;

rollback;
