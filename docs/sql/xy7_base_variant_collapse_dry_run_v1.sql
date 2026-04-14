-- XY7_BASE_VARIANT_COLLAPSE_V1
-- Dry-run proof for the 26-row deterministic base-variant surface in xy7.
-- Live schema notes:
--   - unresolved xy7 rows are anchored by active public.card_print_identity rows with set_code_identity = 'xy7'
--   - active identity state uses public.card_print_identity.is_active
--   - public.vault_items references card prints through card_id
-- Expected live results on 2026-04-09:
--   source_count = 26
--   normalized_map_count = 26
--   fan_in_group_count = 0
--   target_active_identity_conflict_count = 1
--   ambiguous = 0 / invalid = 0 / reused_targets = 0 / unmatched = 0

begin;

drop table if exists tmp_xy7_unresolved_v1;
drop table if exists tmp_xy7_canonical_v1;
drop table if exists tmp_xy7_exact_audit_v1;
drop table if exists tmp_xy7_match_rows_v1;
drop table if exists tmp_xy7_same_base_diff_name_rows_v1;
drop table if exists tmp_xy7_metrics_v1;
drop table if exists tmp_xy7_classification_v1;
drop table if exists tmp_xy7_collapse_map_v1;
drop table if exists tmp_xy7_target_active_identity_conflicts_v1;

create temp table tmp_xy7_unresolved_v1 on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
  cp.set_code as old_set_code,
  cp.number as old_parent_number,
  cp.number_plain as old_parent_number_plain,
  cpi.id as old_identity_id,
  cpi.printed_number as source_printed_number,
  lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\s+', ' ', 'g')) as source_exact_name_key,
  btrim(
    regexp_replace(
      replace(
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
        '-ex',
        ' ex'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as source_name_normalized_v3,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as source_base_number_plain,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'xy7'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_xy7_canonical_v1 on commit drop as
select
  cp.id as new_id,
  cp.name as new_name,
  cp.set_code as new_set_code,
  cp.number as new_number,
  cp.number_plain as new_number_plain,
  cp.gv_id as new_gv_id,
  lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as target_exact_name_key,
  btrim(
    regexp_replace(
      replace(
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
        '-ex',
        ' ex'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as target_name_normalized_v3
from public.card_prints cp
where cp.set_code = 'xy7'
  and cp.gv_id is not null;

create temp table tmp_xy7_exact_audit_v1 on commit drop as
select
  u.old_id,
  count(c.new_id)::int as same_token_candidate_count,
  count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
  count(c.new_id) filter (where c.target_exact_name_key <> u.source_exact_name_key)::int as same_token_different_name_count
from tmp_xy7_unresolved_v1 u
left join tmp_xy7_canonical_v1 c
  on c.new_number = u.source_printed_number
group by u.old_id, u.source_exact_name_key;

create temp table tmp_xy7_match_rows_v1 on commit drop as
select
  u.old_id,
  u.old_name,
  u.old_set_code,
  u.old_parent_number,
  u.old_parent_number_plain,
  u.old_identity_id,
  u.source_printed_number,
  u.source_exact_name_key,
  u.source_name_normalized_v3,
  u.source_base_number_plain,
  u.source_number_suffix,
  c.new_id,
  c.new_name,
  c.new_set_code,
  c.new_number,
  c.new_number_plain,
  c.new_gv_id,
  case
    when u.source_number_suffix is not null then 'suffix_variant'
    else 'name_normalize_v3'
  end as match_category
from tmp_xy7_unresolved_v1 u
join tmp_xy7_canonical_v1 c
  on c.new_number_plain = u.source_base_number_plain
 and c.target_name_normalized_v3 = u.source_name_normalized_v3;

create temp table tmp_xy7_same_base_diff_name_rows_v1 on commit drop as
select
  u.old_id,
  c.new_id
from tmp_xy7_unresolved_v1 u
join tmp_xy7_canonical_v1 c
  on c.new_number_plain = u.source_base_number_plain
 and c.target_name_normalized_v3 <> u.source_name_normalized_v3;

create temp table tmp_xy7_metrics_v1 on commit drop as
select
  u.old_id,
  ea.exact_match_count,
  ea.same_token_different_name_count,
  count(distinct mr.new_id)::int as base_match_count,
  count(distinct sbd.new_id)::int as same_base_different_name_count
from tmp_xy7_unresolved_v1 u
join tmp_xy7_exact_audit_v1 ea
  on ea.old_id = u.old_id
left join tmp_xy7_match_rows_v1 mr
  on mr.old_id = u.old_id
left join tmp_xy7_same_base_diff_name_rows_v1 sbd
  on sbd.old_id = u.old_id
group by u.old_id, ea.exact_match_count, ea.same_token_different_name_count;

create temp table tmp_xy7_classification_v1 on commit drop as
select
  u.old_id,
  u.old_name,
  u.source_printed_number,
  u.source_name_normalized_v3,
  u.source_base_number_plain,
  u.source_number_suffix,
  m.exact_match_count,
  m.same_token_different_name_count,
  m.base_match_count,
  m.same_base_different_name_count,
  case when m.base_match_count = 1 then mr.new_id else null end as new_id,
  case when m.base_match_count = 1 then mr.new_name else null end as new_name,
  case when m.base_match_count = 1 then mr.new_number else null end as new_number,
  case when m.base_match_count = 1 then mr.new_gv_id else null end as new_gv_id,
  case when m.base_match_count = 1 then mr.match_category else 'invalid' end as match_category,
  case
    when m.base_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when m.base_match_count > 1 then 'BLOCKED_CONFLICT'
    when m.base_match_count = 0 and m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'UNCLASSIFIED'
  end as execution_class
from tmp_xy7_unresolved_v1 u
join tmp_xy7_metrics_v1 m
  on m.old_id = u.old_id
left join lateral (
  select *
  from tmp_xy7_match_rows_v1 mr
  where mr.old_id = u.old_id
  order by mr.new_number, mr.new_id
  limit 1
) mr on true;

create temp table tmp_xy7_collapse_map_v1 on commit drop as
select
  row_number() over (
    order by
      coalesce(nullif(mr.source_base_number_plain, ''), '0')::int,
      mr.source_printed_number,
      mr.old_id
  )::int as seq,
  mr.*
from tmp_xy7_match_rows_v1 mr
join tmp_xy7_metrics_v1 m
  on m.old_id = mr.old_id
where m.base_match_count = 1;

create temp table tmp_xy7_target_active_identity_conflicts_v1 on commit drop as
select
  m.old_id,
  m.old_name,
  m.source_printed_number,
  m.new_id,
  m.new_name,
  m.new_number,
  m.new_gv_id,
  m.old_identity_id,
  cpi.id as target_identity_id
from tmp_xy7_collapse_map_v1 m
join public.card_print_identity cpi
  on cpi.card_print_id = m.new_id
 and cpi.is_active = true;

select
  (select count(*)::int from tmp_xy7_unresolved_v1) as source_count,
  (select count(*)::int from tmp_xy7_canonical_v1) as canonical_target_count,
  (select count(*)::int from tmp_xy7_classification_v1 where execution_class = 'BASE_VARIANT_COLLAPSE' and exact_match_count = 1) as exact_match_count,
  (select count(*)::int from tmp_xy7_classification_v1 where execution_class = 'BASE_VARIANT_COLLAPSE' and same_token_different_name_count > 0) as same_token_different_name_count,
  (select count(*)::int from tmp_xy7_classification_v1 where execution_class = 'BASE_VARIANT_COLLAPSE' and exact_match_count = 0) as exact_unmatched_count,
  (select count(*)::int from tmp_xy7_collapse_map_v1) as normalized_map_count,
  (select count(*)::int from tmp_xy7_metrics_v1 where base_match_count > 1) as ambiguous_groups,
  (select count(*)::int from tmp_xy7_classification_v1 where execution_class = 'UNCLASSIFIED') as invalid_groups,
  (
    select count(*)::int
    from (
      select new_id
      from tmp_xy7_collapse_map_v1
      group by new_id
      having count(*) > 1
    ) reused
  ) as reused_targets,
  (select count(*)::int from tmp_xy7_collapse_map_v1 where match_category = 'name_normalize_v3') as normalized_name_count,
  (select count(*)::int from tmp_xy7_collapse_map_v1 where match_category = 'suffix_variant') as suffix_variant_count,
  (select count(*)::int from tmp_xy7_target_active_identity_conflicts_v1) as target_active_identity_conflict_count;

select count(*)::int as fan_in_group_count
from (
  select new_id
  from tmp_xy7_collapse_map_v1
  group by new_id
  having count(*) > 1
) fan_in;

select
  'card_print_identity' as table_name,
  count(*)::int as row_count
from public.card_print_identity
where card_print_id in (select old_id from tmp_xy7_collapse_map_v1)
union all
select 'card_print_traits', count(*)::int
from public.card_print_traits
where card_print_id in (select old_id from tmp_xy7_collapse_map_v1)
union all
select 'card_printings', count(*)::int
from public.card_printings
where card_print_id in (select old_id from tmp_xy7_collapse_map_v1)
union all
select 'external_mappings', count(*)::int
from public.external_mappings
where card_print_id in (select old_id from tmp_xy7_collapse_map_v1)
union all
select 'vault_items', count(*)::int
from public.vault_items
where card_id in (select old_id from tmp_xy7_collapse_map_v1)
order by table_name;

select
  old_id,
  old_name,
  source_printed_number as old_printed_token,
  source_name_normalized_v3 as normalized_name,
  source_base_number_plain as normalized_token,
  new_id,
  new_name,
  new_number as new_printed_token,
  new_gv_id
from tmp_xy7_collapse_map_v1
order by seq;

select
  old_id,
  old_name,
  source_printed_number,
  new_id,
  new_name,
  new_number,
  new_gv_id,
  old_identity_id,
  target_identity_id
from tmp_xy7_target_active_identity_conflicts_v1
order by source_printed_number, old_id;

rollback;
