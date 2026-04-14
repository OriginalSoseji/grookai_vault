-- XY9_BASE_VARIANT_COLLAPSE_V1
-- Read-only dry run for the apply-safe xy9 base-variant surface.
-- Expected live shape:
--   total_unresolved_count = 21
--   apply_scope_count = 20
--   blocked_scope_count = 1
--   normalized_map_count = 20
--   blocked_old_id = a6d34131-d056-49ae-a8b7-21d808e351f6

drop table if exists tmp_xy9_base_unresolved;
drop table if exists tmp_xy9_base_canonical;
drop table if exists tmp_xy9_base_exact_audit;
drop table if exists tmp_xy9_base_match_rows;
drop table if exists tmp_xy9_base_metrics;
drop table if exists tmp_xy9_base_classification;
drop table if exists tmp_xy9_base_collapse_map;

create temp table tmp_xy9_base_unresolved on commit drop as
select
  cp.id as old_id,
  cp.name as old_name,
  cp.number as old_parent_number,
  cp.number_plain as old_parent_number_plain,
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
  and cpi.set_code_identity = 'xy9'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_xy9_base_canonical on commit drop as
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
where cp.set_code = 'xy9'
  and cp.gv_id is not null;

create temp table tmp_xy9_base_exact_audit on commit drop as
select
  u.old_id,
  count(c.new_id) filter (where c.target_exact_name_key = u.source_exact_name_key)::int as exact_match_count,
  count(c.new_id) filter (
    where c.new_number = u.source_printed_number
      and c.target_exact_name_key <> u.source_exact_name_key
  )::int as same_token_different_name_count
from tmp_xy9_base_unresolved u
left join tmp_xy9_base_canonical c
  on c.new_number = u.source_printed_number
group by u.old_id, u.source_exact_name_key, u.source_printed_number;

create temp table tmp_xy9_base_match_rows on commit drop as
select
  u.old_id,
  u.old_name,
  u.old_parent_number,
  u.old_parent_number_plain,
  u.source_printed_number,
  u.normalized_name,
  u.normalized_token,
  c.new_id,
  c.new_name,
  c.new_number,
  c.new_number_plain,
  c.new_gv_id,
  case
    when u.source_number_suffix is not null then 'suffix_variant'
    else 'name_normalize_v3'
  end as match_category
from tmp_xy9_base_unresolved u
join tmp_xy9_base_canonical c
  on c.new_number_plain = u.normalized_token
 and c.target_name_normalized_v3 = u.normalized_name;

create temp table tmp_xy9_base_metrics on commit drop as
select
  u.old_id,
  ea.exact_match_count,
  ea.same_token_different_name_count,
  count(distinct mr.new_id)::int as base_match_count
from tmp_xy9_base_unresolved u
join tmp_xy9_base_exact_audit ea
  on ea.old_id = u.old_id
left join tmp_xy9_base_match_rows mr
  on mr.old_id = u.old_id
group by u.old_id, ea.exact_match_count, ea.same_token_different_name_count;

create temp table tmp_xy9_base_classification on commit drop as
select
  u.old_id,
  u.old_name,
  u.source_printed_number,
  u.normalized_name,
  u.normalized_token,
  m.base_match_count,
  case
    when u.old_id = 'a6d34131-d056-49ae-a8b7-21d808e351f6' then 'BLOCKED'
    when m.base_match_count = 1 then 'APPLY'
    else 'UNCLASSIFIED'
  end as row_scope
from tmp_xy9_base_unresolved u
join tmp_xy9_base_metrics m
  on m.old_id = u.old_id;

create temp table tmp_xy9_base_collapse_map on commit drop as
select
  row_number() over (
    order by
      coalesce(mr.normalized_token, '0')::int,
      mr.source_printed_number,
      mr.old_id
  )::int as seq,
  mr.*
from tmp_xy9_base_match_rows mr
join tmp_xy9_base_classification c
  on c.old_id = mr.old_id
where c.row_scope = 'APPLY';

with reused_targets as (
  select new_id
  from tmp_xy9_base_collapse_map
  group by new_id
  having count(*) > 1
)
select
  (select count(*)::int from tmp_xy9_base_unresolved) as total_unresolved_count,
  (select count(*)::int from tmp_xy9_base_classification where row_scope = 'APPLY') as apply_scope_count,
  (select count(*)::int from tmp_xy9_base_classification where row_scope = 'BLOCKED') as blocked_scope_count,
  (select count(*)::int from tmp_xy9_base_collapse_map) as normalized_map_count,
  (
    select count(*)::int
    from tmp_xy9_base_metrics m
    join tmp_xy9_base_classification c on c.old_id = m.old_id
    where c.row_scope = 'APPLY'
      and m.base_match_count = 0
  ) as unmatched_apply_scope_count,
  (
    select count(*)::int
    from tmp_xy9_base_metrics m
    join tmp_xy9_base_classification c on c.old_id = m.old_id
    where c.row_scope = 'APPLY'
      and m.base_match_count > 1
  ) as ambiguous_apply_scope_count,
  (select count(*)::int from reused_targets) as reused_targets_apply_scope_count,
  (select count(*)::int from tmp_xy9_base_classification where row_scope = 'UNCLASSIFIED') as invalid_groups_count;

select
  c.old_id,
  c.old_name,
  c.normalized_name,
  c.normalized_token,
  case when c.row_scope = 'APPLY' then m.new_id else null end as new_id,
  case when c.row_scope = 'APPLY' then m.new_gv_id else null end as new_gv_id,
  c.row_scope
from tmp_xy9_base_classification c
left join tmp_xy9_base_collapse_map m
  on m.old_id = c.old_id
order by
  case c.row_scope when 'APPLY' then 0 else 1 end,
  coalesce(c.normalized_token, '0')::int,
  c.old_name,
  c.old_id;
