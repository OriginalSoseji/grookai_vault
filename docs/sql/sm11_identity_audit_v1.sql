-- SM11_IDENTITY_RESOLUTION_V1
-- Live proof for resolving sm11 via standard Class F normalization.
-- Expected live counts on 2026-04-07:
--   unresolved_source_count = 12
--   canonical_target_count = 258
--   exact_match_count = 0
--   same_token_different_name_count = 12
--   exact_unmatched_count = 12
--   classification = BASE_VARIANT_COLLAPSE
--   lawful_base_variant_map_count = 12
--   lawful_reused_target_count = 0
--   name_normalize_v2_count = 12
--   suffix_variant_count = 0
--   fan_in_group_count = 0
--   archived_identity_count = 0

begin;

drop table if exists tmp_sm11_source_unresolved_v1;
drop table if exists tmp_sm11_canonical_targets_v1;
drop table if exists tmp_sm11_exact_match_audit_v1;
drop table if exists tmp_sm11_base_variant_map_v1;
drop table if exists tmp_sm11_fan_in_groups_v1;

create temp table tmp_sm11_source_unresolved_v1 on commit drop as
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
      replace(
        replace(
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
          chr(8211),
          ' '
        ),
        '-gx',
        ' gx'
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
  and cpi.set_code_identity = 'sm11'
  and cp.gv_id is null;

create temp table tmp_sm11_canonical_targets_v1 on commit drop as
select
  cp.id as new_id,
  cp.name as new_name,
  cp.set_code as new_set_code,
  cp.number as new_number,
  cp.number_plain as new_number_plain,
  cp.gv_id as new_gv_id,
  btrim(
    regexp_replace(
      replace(
        replace(
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
          chr(8211),
          ' '
        ),
        '-gx',
        ' gx'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as target_name_normalized_v2,
  lower(btrim(cp.name)) as target_exact_name_key
from public.card_prints cp
where cp.set_code = 'sm11'
  and cp.gv_id is not null;

create temp table tmp_sm11_exact_match_audit_v1 on commit drop as
select
  s.old_id,
  count(c.new_id)::int as same_token_candidate_count,
  count(c.new_id) filter (where c.target_exact_name_key = s.source_exact_name_key)::int as exact_match_count,
  count(c.new_id) filter (where c.target_exact_name_key <> s.source_exact_name_key)::int as same_token_different_name_count
from tmp_sm11_source_unresolved_v1 s
left join tmp_sm11_canonical_targets_v1 c
  on c.new_number = s.source_printed_number
group by s.old_id, s.source_exact_name_key;

create temp table tmp_sm11_base_variant_map_v1 on commit drop as
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
from tmp_sm11_source_unresolved_v1 s
join tmp_sm11_canonical_targets_v1 c
  on c.new_number_plain = s.source_base_number_plain
 and c.target_name_normalized_v2 = s.source_name_normalized_v2;

create temp table tmp_sm11_fan_in_groups_v1 on commit drop as
select
  m.new_id as target_card_print_id,
  m.new_name as canonical_target_name,
  m.new_number as canonical_target_number,
  m.new_gv_id as canonical_target_gv_id,
  count(*)::int as incoming_sources,
  array_agg(m.old_id order by m.source_printed_number, m.old_id) as source_ids,
  array_agg(m.old_name order by m.source_printed_number, m.old_id) as source_names,
  array_agg(m.source_printed_number order by m.source_printed_number, m.old_id) as source_tokens,
  array_agg(m.match_category order by m.source_printed_number, m.old_id) as match_categories
from tmp_sm11_base_variant_map_v1 m
group by m.new_id, m.new_name, m.new_number, m.new_gv_id
having count(*) > 1;

-- 1. unresolved source count
select count(*)::int as unresolved_source_count
from tmp_sm11_source_unresolved_v1;

-- 2. canonical target count
select count(*)::int as canonical_target_count
from tmp_sm11_canonical_targets_v1;

-- 3. class-detection exact-token audit
select
  (select count(*)::int from tmp_sm11_exact_match_audit_v1 where exact_match_count = 1) as exact_match_count,
  (select count(*)::int from tmp_sm11_exact_match_audit_v1 where exact_match_count > 1) as exact_multiple_match_count,
  (select count(*)::int from tmp_sm11_exact_match_audit_v1 where same_token_different_name_count > 0) as same_token_different_name_count,
  (select count(*)::int from tmp_sm11_exact_match_audit_v1 where exact_match_count = 0) as exact_unmatched_count;

-- 4. representative blocked pairs that force Class F
select
  s.old_id as old_parent_id,
  s.old_name,
  s.source_printed_number as old_printed_token,
  c.new_id as candidate_canonical_id,
  c.new_name as candidate_canonical_name,
  c.new_gv_id as candidate_canonical_gv_id
from tmp_sm11_source_unresolved_v1 s
join tmp_sm11_canonical_targets_v1 c
  on c.new_number = s.source_printed_number
where c.target_exact_name_key <> s.source_exact_name_key
order by
  coalesce(nullif(regexp_replace(s.source_printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
  s.source_printed_number,
  s.old_id;

-- 5. base-variant map proof
with old_counts as (
  select old_id, count(*)::int as match_count
  from tmp_sm11_base_variant_map_v1
  group by old_id
),
new_counts as (
  select new_id, count(*)::int as match_count
  from tmp_sm11_base_variant_map_v1
  group by new_id
)
select
  (select count(*)::int from tmp_sm11_base_variant_map_v1) as lawful_base_variant_map_count,
  (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
  (select count(*)::int from new_counts where match_count > 1) as reused_target_count,
  (
    select count(*)::int
    from tmp_sm11_source_unresolved_v1 s
    where not exists (
      select 1
      from tmp_sm11_base_variant_map_v1 m
      where m.old_id = s.old_id
    )
  ) as unmatched_count,
  (
    select count(*)::int
    from tmp_sm11_base_variant_map_v1
    where new_set_code <> 'sm11'
  ) as cross_set_target_count,
  (
    select count(distinct new_id)::int
    from tmp_sm11_base_variant_map_v1
  ) as distinct_target_count;

-- 6. normalization-path summary
select
  count(*)::int as lawful_base_variant_map_count,
  count(*) filter (where match_category = 'name_normalize_v2')::int as name_normalize_v2_count,
  count(*) filter (where match_category = 'suffix_variant')::int as suffix_variant_count
from tmp_sm11_base_variant_map_v1;

-- 7. fan-in audit
select count(*)::int as fan_in_group_count
from tmp_sm11_fan_in_groups_v1;

select
  target_card_print_id,
  canonical_target_name,
  canonical_target_number,
  canonical_target_gv_id,
  incoming_sources,
  source_ids,
  source_names,
  source_tokens,
  match_categories
from tmp_sm11_fan_in_groups_v1
order by canonical_target_number::int, target_card_print_id;

select 0::int as archived_identity_count;

-- 8. readiness snapshot counts
select 'card_print_identity' as table_name, count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_id from tmp_sm11_base_variant_map_v1)
union all
select 'card_print_traits', count(*)::int
from public.card_print_traits
where card_print_id in (select old_id from tmp_sm11_base_variant_map_v1)
union all
select 'card_printings', count(*)::int
from public.card_printings
where card_print_id in (select old_id from tmp_sm11_base_variant_map_v1)
union all
select 'external_mappings', count(*)::int
from public.external_mappings
where card_print_id in (select old_id from tmp_sm11_base_variant_map_v1)
union all
select 'vault_items', count(*)::int
from public.vault_items
where card_id in (select old_id from tmp_sm11_base_variant_map_v1);

-- 9. sample planned mappings: first, middle, last
select
  m.old_id as old_card_print_id,
  m.old_name,
  m.source_printed_number as old_printed_number,
  m.new_id as target_card_print_id,
  m.new_gv_id as target_gv_id,
  m.new_name as target_name,
  m.new_set_code as target_set_code
from tmp_sm11_base_variant_map_v1 m
where m.old_id in (
  'c3b07f58-8f7c-482d-a17a-79762a726e0d',
  'd1724470-ae4b-4633-8b6c-c3855cc9c72c',
  '260149de-243d-4b58-9d88-4c42bfbc09c1'
)
order by
  coalesce(nullif(regexp_replace(m.source_printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
  m.source_printed_number,
  m.old_id;

commit;
