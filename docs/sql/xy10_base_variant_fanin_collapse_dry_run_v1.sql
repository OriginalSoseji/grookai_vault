begin;

-- XY10_BASE_VARIANT_FANIN_COLLAPSE_V1
-- Dry-run decomposition and apply-proof for the full unresolved xy10 surface.
-- Expected live result:
--   source_count = 25
--   base_variant_count = 21
--   active_identity_fanin_count = 4
--   blocked_conflict_count = 0
--   fan_in_group_count = 2
--   target_active_identity_conflict_count_before = 1

drop table if exists tmp_xy10_unresolved;
drop table if exists tmp_xy10_canonical;
drop table if exists tmp_xy10_exact_audit;
drop table if exists tmp_xy10_match_rows;
drop table if exists tmp_xy10_same_base_diff_name_rows;
drop table if exists tmp_xy10_metrics;
drop table if exists tmp_xy10_collapse_map;
drop table if exists tmp_xy10_reused_targets;
drop table if exists tmp_xy10_fan_in_groups;
drop table if exists tmp_xy10_classification;
drop table if exists tmp_xy10_target_active_identity_conflicts;

create temporary table tmp_xy10_unresolved as
select
  cp.id as old_id,
  cp.name as old_name,
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
  ) as normalized_name,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_number_suffix
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'xy10'
  and cpi.is_active = true
  and cp.gv_id is null;

create temporary table tmp_xy10_canonical as
select
  cp.id as new_id,
  cp.name as new_name,
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
where cp.set_code = 'xy10'
  and cp.gv_id is not null;

create temporary table tmp_xy10_exact_audit as
select
  u.old_id,
  count(c.new_id)::int as same_token_candidate_count,
  count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
  count(c.new_id) filter (where c.target_exact_name_key <> u.source_exact_name_key)::int as same_token_different_name_count
from tmp_xy10_unresolved u
left join tmp_xy10_canonical c
  on c.new_number = u.source_printed_number
group by u.old_id, u.source_exact_name_key;

create temporary table tmp_xy10_match_rows as
select
  u.old_id,
  u.old_name,
  u.old_parent_number,
  u.old_parent_number_plain,
  u.old_identity_id,
  u.source_printed_number,
  u.source_exact_name_key,
  u.normalized_name,
  u.normalized_token,
  u.source_number_suffix,
  c.new_id,
  c.new_name,
  c.new_number,
  c.new_number_plain,
  c.new_gv_id,
  c.target_exact_name_key,
  c.target_name_normalized_v3,
  case
    when lower(coalesce(c.new_number, '')) <> lower(coalesce(u.source_printed_number, ''))
      then 'suffix_variant'
    else 'name_normalize_v3'
  end as match_category
from tmp_xy10_unresolved u
join tmp_xy10_canonical c
  on c.new_number_plain = u.normalized_token
 and c.target_name_normalized_v3 = u.normalized_name;

create temporary table tmp_xy10_same_base_diff_name_rows as
select
  u.old_id,
  c.new_id
from tmp_xy10_unresolved u
join tmp_xy10_canonical c
  on c.new_number_plain = u.normalized_token
 and c.target_name_normalized_v3 <> u.normalized_name;

create temporary table tmp_xy10_metrics as
select
  u.old_id,
  ea.exact_match_count,
  ea.same_token_different_name_count,
  count(distinct mr.new_id)::int as base_match_count,
  count(distinct sbd.new_id)::int as same_base_different_name_count
from tmp_xy10_unresolved u
join tmp_xy10_exact_audit ea
  on ea.old_id = u.old_id
left join tmp_xy10_match_rows mr
  on mr.old_id = u.old_id
left join tmp_xy10_same_base_diff_name_rows sbd
  on sbd.old_id = u.old_id
group by u.old_id, ea.exact_match_count, ea.same_token_different_name_count;

create temporary table tmp_xy10_collapse_map as
select
  row_number() over (
    order by
      coalesce(nullif(mr.normalized_token, ''), '0')::int,
      mr.source_printed_number,
      mr.old_id
  )::int as seq,
  mr.*
from tmp_xy10_match_rows mr
join tmp_xy10_metrics m
  on m.old_id = mr.old_id
where m.base_match_count = 1;

create temporary table tmp_xy10_reused_targets as
select
  new_id,
  count(*)::int as incoming_sources
from tmp_xy10_collapse_map
group by new_id
having count(*) > 1;

create temporary table tmp_xy10_fan_in_groups as
select
  m.new_id as target_card_print_id,
  min(m.new_name) as target_name,
  min(m.new_number) as target_number,
  min(m.new_gv_id) as target_gv_id,
  count(*)::int as incoming_sources,
  array_agg(m.old_id order by m.source_printed_number, m.old_id) as source_old_ids,
  array_agg(m.old_name order by m.source_printed_number, m.old_id) as source_old_names,
  array_agg(m.source_printed_number order by m.source_printed_number, m.old_id) as source_printed_numbers,
  (count(distinct m.normalized_name) = 1) as normalization_only
from tmp_xy10_collapse_map m
join tmp_xy10_reused_targets rt
  on rt.new_id = m.new_id
group by m.new_id;

create temporary table tmp_xy10_classification as
select
  u.old_id,
  u.old_name,
  u.source_printed_number as old_printed_token,
  u.normalized_name,
  u.normalized_token,
  case when m.base_match_count = 1 then mr.new_id else null end as new_id,
  case when m.base_match_count = 1 then mr.new_gv_id else null end as new_gv_id,
  case
    when m.base_match_count = 1 and exists (
      select 1
      from tmp_xy10_reused_targets rt
      where rt.new_id = mr.new_id
    ) then 'ACTIVE_IDENTITY_FANIN'
    when m.base_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when m.base_match_count > 1 then 'BLOCKED_CONFLICT'
    when m.base_match_count = 0 and m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'UNCLASSIFIED'
  end as execution_class
from tmp_xy10_unresolved u
join tmp_xy10_metrics m
  on m.old_id = u.old_id
left join lateral (
  select *
  from tmp_xy10_match_rows mr
  where mr.old_id = u.old_id
  order by mr.new_number, mr.new_id
  limit 1
) mr on true;

create temporary table tmp_xy10_target_active_identity_conflicts as
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
from tmp_xy10_collapse_map m
join public.card_print_identity cpi
  on cpi.card_print_id = m.new_id
 and cpi.is_active = true
where not exists (
  select 1
  from tmp_xy10_reused_targets rt
  where rt.new_id = m.new_id
);

select
  (select count(*) from tmp_xy10_unresolved) as source_count,
  (select count(*) from tmp_xy10_canonical) as canonical_target_count;

select
  count(*) filter (where execution_class = 'BASE_VARIANT_COLLAPSE') as base_variant_count,
  count(*) filter (where execution_class = 'ACTIVE_IDENTITY_FANIN') as active_identity_fanin_count,
  count(*) filter (where execution_class = 'BLOCKED_CONFLICT') as blocked_conflict_count,
  count(*) filter (where execution_class = 'UNCLASSIFIED') as unclassified_count
from tmp_xy10_classification;

select
  (select count(*) from tmp_xy10_collapse_map) as normalized_map_count,
  (select count(*) from tmp_xy10_metrics where base_match_count > 1) as ambiguous_count,
  (select count(*) from tmp_xy10_classification where execution_class = 'UNCLASSIFIED') as invalid_group_count,
  (select count(*) from tmp_xy10_classification where new_id is null) as unmatched_count,
  (select count(*) from tmp_xy10_reused_targets) as reused_target_count,
  (select count(*) from tmp_xy10_target_active_identity_conflicts) as target_active_identity_conflict_count_before;

select
  count(*) as fan_in_group_count
from tmp_xy10_fan_in_groups;

select
  target_card_print_id,
  target_name,
  target_number,
  target_gv_id,
  incoming_sources,
  source_old_ids,
  source_old_names,
  source_printed_numbers,
  normalization_only
from tmp_xy10_fan_in_groups
order by target_number, target_card_print_id;

select
  cls.old_id,
  cls.old_name,
  cls.old_printed_token,
  cls.normalized_name,
  cls.normalized_token,
  cls.new_id,
  cls.new_gv_id,
  cls.execution_class
from tmp_xy10_classification cls
order by cls.normalized_token, cls.old_printed_token, cls.old_id;

rollback;
