begin;

-- XY10_MIXED_EXECUTION_AUDIT_V1
-- Audit-only decomposition for unresolved xy10 rows.
-- Expected live result:
--   unresolved_parent_count = 25
--   canonical_parent_count = 126
--   BASE_VARIANT_COLLAPSE = 21
--   ACTIVE_IDENTITY_FANIN = 4
--   BLOCKED_CONFLICT = 0
--   UNCLASSIFIED = 0
--   fan_in_group_count = 2
-- Recommended next execution unit:
--   XY10_BASE_VARIANT_FANIN_COLLAPSE_V1

drop table if exists tmp_xy10_unresolved;
create temporary table tmp_xy10_unresolved as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  cp.number_plain as old_printed_token,
  lower(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              replace(cp.name, '’', ''''),
              '([[:alnum:]])[[:space:]]+gx\b',
              '\1-gx',
              'gi'
            ),
            '([[:alnum:]])[[:space:]]+ex\b',
            '\1-ex',
            'gi'
          ),
          '[—–]+',
          ' ',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  ) as normalized_name,
  case
    when cp.number_plain ~ '^[0-9]+[A-Za-z]+$'
      and exists (
        select 1
        from public.card_prints cp2
        join public.sets s2 on s2.id = cp2.set_id
        where s2.set_code = 'xy10'
          and cp2.gv_id is not null
          and cp2.number_plain = regexp_replace(cp.number_plain, '^([0-9]+)[A-Za-z]+$', '\1a')
      )
      then regexp_replace(cp.number_plain, '^([0-9]+)[A-Za-z]+$', '\1a')
    else lower(cp.number_plain)
  end as normalized_token,
  regexp_replace(lower(cp.number_plain), '^([0-9]+).*$','\1') as base_number
from public.card_prints cp
join public.sets s on s.id = cp.set_id
where s.set_code = 'xy10'
  and cp.gv_id is null;

drop table if exists tmp_xy10_canonical;
create temporary table tmp_xy10_canonical as
select
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.number_plain as candidate_printed_token,
  cp.gv_id as candidate_target_gv_id,
  lower(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              replace(cp.name, '’', ''''),
              '([[:alnum:]])[[:space:]]+gx\b',
              '\1-gx',
              'gi'
            ),
            '([[:alnum:]])[[:space:]]+ex\b',
            '\1-ex',
            'gi'
          ),
          '[—–]+',
          ' ',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  ) as normalized_name,
  lower(cp.number_plain) as normalized_token
from public.card_prints cp
join public.sets s on s.id = cp.set_id
where s.set_code = 'xy10'
  and cp.gv_id is not null;

drop table if exists tmp_xy10_candidate_map;
create temporary table tmp_xy10_candidate_map as
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_printed_token,
  c.candidate_target_gv_id
from tmp_xy10_unresolved u
left join tmp_xy10_canonical c
  on c.normalized_name = u.normalized_name
 and c.normalized_token = u.normalized_token;

drop table if exists tmp_xy10_candidate_metrics;
create temporary table tmp_xy10_candidate_metrics as
select
  old_parent_id,
  count(*) filter (where candidate_target_id is not null) as candidate_count,
  count(distinct candidate_target_id) filter (where candidate_target_id is not null) as distinct_target_count
from tmp_xy10_candidate_map
group by old_parent_id;

drop table if exists tmp_xy10_frozen_map;
create temporary table tmp_xy10_frozen_map as
select distinct on (m.old_parent_id)
  m.old_parent_id,
  m.old_name,
  m.old_printed_token,
  m.normalized_name,
  m.normalized_token,
  m.candidate_target_id,
  m.candidate_target_name,
  m.candidate_target_gv_id
from tmp_xy10_candidate_map m
join tmp_xy10_candidate_metrics cm
  on cm.old_parent_id = m.old_parent_id
where cm.distinct_target_count = 1
  and m.candidate_target_id is not null
order by m.old_parent_id, m.candidate_target_id;

drop table if exists tmp_xy10_fan_in_groups;
create temporary table tmp_xy10_fan_in_groups as
select
  candidate_target_id as target_card_print_id,
  count(*) as incoming_sources,
  array_agg(old_parent_id order by old_printed_token, old_parent_id) as source_row_ids,
  array_agg(old_name order by old_printed_token, old_parent_id) as source_names,
  array_agg(old_printed_token order by old_printed_token, old_parent_id) as source_tokens,
  (count(distinct normalized_name) = 1) as normalization_only
from tmp_xy10_frozen_map
group by candidate_target_id
having count(*) > 1;

drop table if exists tmp_xy10_classification;
create temporary table tmp_xy10_classification as
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  fm.candidate_target_id,
  fm.candidate_target_gv_id,
  case
    when cm.distinct_target_count = 0 then 'BLOCKED_CONFLICT'
    when cm.distinct_target_count > 1 then 'BLOCKED_CONFLICT'
    when fig.target_card_print_id is not null and coalesce(fig.normalization_only, false) then 'ACTIVE_IDENTITY_FANIN'
    when cm.distinct_target_count = 1 then 'BASE_VARIANT_COLLAPSE'
    else 'UNCLASSIFIED'
  end as execution_class,
  case
    when cm.distinct_target_count = 0 then 'No canonical target matched normalized name + normalized token inside xy10.'
    when cm.distinct_target_count > 1 then 'Multiple canonical targets matched the same normalized identity; collapse would be ambiguous.'
    when fig.target_card_print_id is not null and coalesce(fig.normalization_only, false) then 'Many-to-one convergence onto a single canonical target; fan-in is normalization-only and requires active identity selection before collapse.'
    when cm.distinct_target_count = 1 then 'Single same-set canonical target matched normalized name + normalized token with no fan-in.'
    else 'Classification fell outside the defined execution classes.'
  end as proof_reason
from tmp_xy10_unresolved u
left join tmp_xy10_candidate_metrics cm
  on cm.old_parent_id = u.old_parent_id
left join tmp_xy10_frozen_map fm
  on fm.old_parent_id = u.old_parent_id
left join tmp_xy10_fan_in_groups fig
  on fig.target_card_print_id = fm.candidate_target_id;

-- CHECK 1 — unresolved vs canonical parent counts
select
  (select count(*) from tmp_xy10_unresolved) as unresolved_parent_count,
  (select count(*) from tmp_xy10_canonical) as canonical_parent_count;

-- CHECK 2 — normalized target matching rows
select
  old_parent_id,
  old_name,
  old_printed_token,
  normalized_name,
  normalized_token,
  candidate_target_id,
  candidate_target_name,
  candidate_target_gv_id
from tmp_xy10_frozen_map
order by old_printed_token, old_name, old_parent_id;

-- CHECK 3 — fan-in group summary
select
  count(*) as fan_in_group_count
from tmp_xy10_fan_in_groups;

-- CHECK 3b — fan-in group detail
select
  fig.target_card_print_id,
  c.candidate_target_name,
  c.candidate_printed_token,
  c.candidate_target_gv_id,
  fig.incoming_sources,
  fig.source_row_ids,
  fig.source_names,
  fig.source_tokens,
  fig.normalization_only
from tmp_xy10_fan_in_groups fig
join tmp_xy10_canonical c
  on c.candidate_target_id = fig.target_card_print_id
order by c.candidate_printed_token, fig.target_card_print_id;

-- CHECK 4 — final row-level classification
select
  old_parent_id,
  old_name,
  old_printed_token,
  candidate_target_id,
  candidate_target_gv_id,
  execution_class,
  proof_reason
from tmp_xy10_classification
order by old_printed_token, old_name, old_parent_id;

-- CHECK 5 — execution split summary
select
  execution_class,
  count(*) as row_count
from tmp_xy10_classification
group by execution_class
order by execution_class;

select
  count(*) filter (where execution_class = 'BASE_VARIANT_COLLAPSE') as base_variant_count,
  count(*) filter (where execution_class = 'ACTIVE_IDENTITY_FANIN') as active_identity_fanin_count,
  count(*) filter (where execution_class = 'BLOCKED_CONFLICT') as blocked_conflict_count,
  count(*) filter (where execution_class = 'UNCLASSIFIED') as unclassified_count
from tmp_xy10_classification;

select
  case
    when count(*) filter (where execution_class = 'UNCLASSIFIED') > 0 then 'BLOCKED'
    when count(*) filter (where execution_class = 'BLOCKED_CONFLICT') > 0 then 'BLOCKED'
    when count(*) filter (where execution_class = 'ACTIVE_IDENTITY_FANIN') > 0
      then 'XY10_BASE_VARIANT_FANIN_COLLAPSE_V1'
    else 'XY10_BASE_VARIANT_COLLAPSE_V1'
  end as next_lawful_execution_unit,
  case
    when count(*) filter (where execution_class = 'UNCLASSIFIED') > 0
      then 'Unclassified rows remain; next unit is not safe.'
    when count(*) filter (where execution_class = 'BLOCKED_CONFLICT') > 0
      then 'Blocked rows remain; next unit must isolate the conflict surface first.'
    when count(*) filter (where execution_class = 'ACTIVE_IDENTITY_FANIN') > 0
      then 'All rows are same-set normalization-only; a combined fan-in-safe base collapse artifact is the narrowest deterministic next step.'
    else 'All rows are 1:1 base-variant collapse.'
  end as recommendation_reason
from tmp_xy10_classification;

rollback;
