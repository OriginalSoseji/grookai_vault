begin;

-- XY4_MIXED_EXECUTION_AUDIT_V1
-- Audit-only decomposition for unresolved xy4 rows.
-- Live result on 2026-04-11:
--   unresolved_parent_count = 0
--   canonical_parent_count = 123
--   BASE_VARIANT_COLLAPSE = 0
--   ACTIVE_IDENTITY_FANIN = 0
--   BLOCKED_CONFLICT = 0
--   UNCLASSIFIED = 0
--   fan_in_group_count = 0
-- Recommended next execution unit:
--   XY4_COMPLETE_VERIFICATION_V1
-- Note:
--   the prior mixed-execution selection inputs are stale relative to the live DB state.

drop table if exists tmp_xy4_unresolved;
create temporary table tmp_xy4_unresolved as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  cp.number_plain as old_token,
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
        where cp2.set_code = 'xy4'
          and cp2.gv_id is not null
          and cp2.number_plain = regexp_replace(cp.number_plain, '^([0-9]+)[A-Za-z]+$', '\1a')
      )
      then regexp_replace(cp.number_plain, '^([0-9]+)[A-Za-z]+$', '\1a')
    else lower(cp.number_plain)
  end as normalized_token
from public.card_prints cp
where cp.set_code = 'xy4'
  and cp.gv_id is null;

drop table if exists tmp_xy4_canonical;
create temporary table tmp_xy4_canonical as
select
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.number_plain as candidate_token,
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
where cp.set_code = 'xy4'
  and cp.gv_id is not null;

drop table if exists tmp_xy4_candidate_map;
create temporary table tmp_xy4_candidate_map as
select
  u.old_parent_id,
  u.old_name,
  u.old_token,
  u.normalized_name,
  u.normalized_token,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_token,
  c.candidate_target_gv_id
from tmp_xy4_unresolved u
left join tmp_xy4_canonical c
  on c.normalized_name = u.normalized_name
 and c.normalized_token = u.normalized_token;

drop table if exists tmp_xy4_candidate_metrics;
create temporary table tmp_xy4_candidate_metrics as
select
  old_parent_id,
  count(*) filter (where candidate_target_id is not null) as candidate_count,
  count(distinct candidate_target_id) filter (where candidate_target_id is not null) as distinct_target_count
from tmp_xy4_candidate_map
group by old_parent_id;

drop table if exists tmp_xy4_frozen_map;
create temporary table tmp_xy4_frozen_map as
select distinct on (m.old_parent_id)
  m.old_parent_id,
  m.old_name,
  m.old_token,
  m.normalized_name,
  m.normalized_token,
  m.candidate_target_id,
  m.candidate_target_name,
  m.candidate_target_gv_id
from tmp_xy4_candidate_map m
join tmp_xy4_candidate_metrics cm
  on cm.old_parent_id = m.old_parent_id
where cm.distinct_target_count = 1
  and m.candidate_target_id is not null
order by m.old_parent_id, m.candidate_target_id;

drop table if exists tmp_xy4_fan_in_groups;
create temporary table tmp_xy4_fan_in_groups as
select
  candidate_target_id as target_card_print_id,
  count(*) as incoming_sources,
  array_agg(old_parent_id order by old_token, old_parent_id) as source_row_ids,
  array_agg(old_name order by old_token, old_parent_id) as source_names,
  array_agg(old_token order by old_token, old_parent_id) as source_tokens,
  (count(distinct normalized_name) = 1) as normalization_only
from tmp_xy4_frozen_map
group by candidate_target_id
having count(*) > 1;

drop table if exists tmp_xy4_classification;
create temporary table tmp_xy4_classification as
select
  u.old_parent_id,
  u.old_name,
  u.old_token,
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
    when cm.distinct_target_count = 0 then 'No canonical target matched normalized name + normalized token inside xy4.'
    when cm.distinct_target_count > 1 then 'Multiple canonical targets matched the same normalized identity; collapse would be ambiguous.'
    when fig.target_card_print_id is not null and coalesce(fig.normalization_only, false) then 'Many-to-one convergence onto a single canonical target; fan-in is normalization-only.'
    when cm.distinct_target_count = 1 then 'Single same-set canonical target matched normalized name + normalized token with no fan-in.'
    else 'Classification fell outside the defined execution classes.'
  end as proof_reason
from tmp_xy4_unresolved u
left join tmp_xy4_candidate_metrics cm
  on cm.old_parent_id = u.old_parent_id
left join tmp_xy4_frozen_map fm
  on fm.old_parent_id = u.old_parent_id
left join tmp_xy4_fan_in_groups fig
  on fig.target_card_print_id = fm.candidate_target_id;

-- CHECK 1 — unresolved vs canonical parent counts
select
  (select count(*)::int from tmp_xy4_unresolved) as unresolved_parent_count,
  (select count(*)::int from tmp_xy4_canonical) as canonical_parent_count;

-- CHECK 2 — normalized target matching rows
select
  old_parent_id,
  old_name,
  old_token,
  normalized_name,
  normalized_token,
  candidate_target_id,
  candidate_target_name,
  candidate_target_gv_id
from tmp_xy4_frozen_map
order by old_token, old_name, old_parent_id;

-- CHECK 3 — fan-in group summary
select
  count(*)::int as fan_in_group_count
from tmp_xy4_fan_in_groups;

-- CHECK 3b — fan-in group detail
select
  fig.target_card_print_id,
  c.candidate_target_name,
  c.candidate_token,
  c.candidate_target_gv_id,
  fig.incoming_sources,
  fig.source_row_ids,
  fig.source_names,
  fig.source_tokens,
  fig.normalization_only
from tmp_xy4_fan_in_groups fig
join tmp_xy4_canonical c
  on c.candidate_target_id = fig.target_card_print_id
order by c.candidate_token, fig.target_card_print_id;

-- CHECK 4 — final row-level classification
select
  old_parent_id,
  old_name,
  old_token,
  candidate_target_id,
  candidate_target_gv_id,
  execution_class,
  proof_reason
from tmp_xy4_classification
order by old_token, old_name, old_parent_id;

-- CHECK 5 — execution split summary
select
  execution_class,
  count(*)::int as row_count
from tmp_xy4_classification
group by execution_class
order by execution_class;

select
  count(*) filter (where execution_class = 'BASE_VARIANT_COLLAPSE')::int as base_variant_count,
  count(*) filter (where execution_class = 'ACTIVE_IDENTITY_FANIN')::int as active_identity_fanin_count,
  count(*) filter (where execution_class = 'BLOCKED_CONFLICT')::int as blocked_conflict_count,
  count(*) filter (where execution_class = 'UNCLASSIFIED')::int as unclassified_count
from tmp_xy4_classification;

-- CHECK 6 — next lawful execution unit
with counts as (
  select
    (select count(*)::int from tmp_xy4_unresolved) as unresolved_parent_count,
    count(*) filter (where execution_class = 'BASE_VARIANT_COLLAPSE')::int as base_variant_count,
    count(*) filter (where execution_class = 'ACTIVE_IDENTITY_FANIN')::int as active_identity_fanin_count,
    count(*) filter (where execution_class = 'BLOCKED_CONFLICT')::int as blocked_conflict_count,
    count(*) filter (where execution_class = 'UNCLASSIFIED')::int as unclassified_count
  from tmp_xy4_classification
)
select
  case
    when unresolved_parent_count = 0 then 'XY4_COMPLETE_VERIFICATION_V1'
    when unclassified_count > 0 then 'BLOCKED'
    when blocked_conflict_count > 0 then 'XY4_BLOCKED_CONFLICT_AUDIT_V1'
    when active_identity_fanin_count > 0 then 'XY4_BASE_VARIANT_FANIN_COLLAPSE_V1'
    when base_variant_count > 0 then 'XY4_BASE_VARIANT_COLLAPSE_V1'
    else 'BLOCKED'
  end as next_lawful_execution_unit,
  case
    when unresolved_parent_count = 0 then 'No unresolved xy4 rows remain in the live DB; mixed execution is stale and the lawful next step is closure verification.'
    when unclassified_count > 0 then 'Unclassified rows remain; next unit is not safe.'
    when blocked_conflict_count > 0 then 'Blocked rows remain; next unit must isolate the conflict surface first.'
    when active_identity_fanin_count > 0 then 'Same-set normalization rows remain and at least one lawful fan-in group exists.'
    when base_variant_count > 0 then 'All remaining rows are 1:1 base-variant collapse.'
    else 'No deterministic execution unit could be derived.'
  end as recommendation_reason
from counts;

rollback;
