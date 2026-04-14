-- MIXED_EXECUTION_NEXT_TARGET_SELECTION_V1
-- Read-only prioritization audit for the remaining mixed-execution bucket after cel25 closure.
-- Live schema notes:
--   - unresolved set surfaces are defined by active public.card_print_identity rows
--     whose set_code_identity is in scope and whose parent public.card_prints row has gv_id is null
--   - canonical in-set targets are public.card_prints where set_code is in scope and gv_id is not null
--   - active identity semantics use public.card_print_identity.is_active
-- Stable normalization contract:
--   NAME_NORMALIZE_V3 = lowercase -> apostrophe normalize -> GX/EX hyphen normalize -> dash normalize -> whitespace collapse -> trim
--   TOKEN_NORMALIZE_V1 = numeric base extraction; suffix routing only when proven lawful by unique base-number + normalized-name target
-- Target set list:
--   pl2, ecard2, g1, xy7, xy10, xy9, pl4, xy6, xy4, xy3
-- Expected live results on 2026-04-08:
--   selected_next_target = xy7
--   selected_execution_class = BASE_VARIANT_COLLAPSE

begin;

drop table if exists tmp_mixed_next_target_sets_v1;
drop table if exists tmp_mixed_next_target_unresolved_v1;
drop table if exists tmp_mixed_next_target_canonical_in_set_v1;
drop table if exists tmp_mixed_next_target_canonical_all_v1;
drop table if exists tmp_mixed_next_target_exact_match_rows_v1;
drop table if exists tmp_mixed_next_target_same_token_diff_name_rows_v1;
drop table if exists tmp_mixed_next_target_base_match_rows_v1;
drop table if exists tmp_mixed_next_target_same_base_diff_name_rows_v1;
drop table if exists tmp_mixed_next_target_cross_lane_candidate_rows_v1;
drop table if exists tmp_mixed_next_target_row_metrics_v1;
drop table if exists tmp_mixed_next_target_preclassification_v1;
drop table if exists tmp_mixed_next_target_fan_in_groups_v1;
drop table if exists tmp_mixed_next_target_set_metrics_v1;
drop table if exists tmp_mixed_next_target_ranked_v1;

create temp table tmp_mixed_next_target_sets_v1 (
  set_code text primary key
) on commit drop;

insert into tmp_mixed_next_target_sets_v1 (set_code)
values
  ('pl2'),
  ('ecard2'),
  ('g1'),
  ('xy7'),
  ('xy10'),
  ('xy9'),
  ('pl4'),
  ('xy6'),
  ('xy4'),
  ('xy3');

create temp table tmp_mixed_next_target_unresolved_v1 on commit drop as
select
  cpi.set_code_identity as target_set_code,
  cp.id as old_parent_id,
  cp.name as old_name,
  cpi.id as old_identity_id,
  cpi.printed_number as old_printed_token,
  lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\s+', ' ', 'g')) as exact_name_key,
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
  ) as normalized_name_v3,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as base_number_plain,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as token_suffix
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join tmp_mixed_next_target_sets_v1 ts
  on ts.set_code = cpi.set_code_identity
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_mixed_next_target_canonical_in_set_v1 on commit drop as
select
  cp.set_code as target_set_code,
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.number as candidate_target_number,
  cp.number_plain as candidate_target_number_plain,
  cp.gv_id as candidate_target_gv_id,
  lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) as exact_name_key,
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
  ) as normalized_name_v3
from public.card_prints cp
join tmp_mixed_next_target_sets_v1 ts
  on ts.set_code = cp.set_code
where cp.gv_id is not null;

create temp table tmp_mixed_next_target_canonical_all_v1 on commit drop as
select
  cp.set_code as candidate_target_set_code,
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.number as candidate_target_number,
  cp.number_plain as candidate_target_number_plain,
  cp.gv_id as candidate_target_gv_id,
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
  ) as normalized_name_v3
from public.card_prints cp
where cp.gv_id is not null;

create temp table tmp_mixed_next_target_exact_match_rows_v1 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_mixed_next_target_unresolved_v1 u
join tmp_mixed_next_target_canonical_in_set_v1 c
  on c.target_set_code = u.target_set_code
 and c.candidate_target_number = u.old_printed_token
 and c.exact_name_key = u.exact_name_key;

create temp table tmp_mixed_next_target_same_token_diff_name_rows_v1 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_mixed_next_target_unresolved_v1 u
join tmp_mixed_next_target_canonical_in_set_v1 c
  on c.target_set_code = u.target_set_code
 and c.candidate_target_number = u.old_printed_token
 and c.exact_name_key <> u.exact_name_key;

create temp table tmp_mixed_next_target_base_match_rows_v1 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_mixed_next_target_unresolved_v1 u
join tmp_mixed_next_target_canonical_in_set_v1 c
  on c.target_set_code = u.target_set_code
 and c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 = u.normalized_name_v3;

create temp table tmp_mixed_next_target_same_base_diff_name_rows_v1 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_mixed_next_target_unresolved_v1 u
join tmp_mixed_next_target_canonical_in_set_v1 c
  on c.target_set_code = u.target_set_code
 and c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 <> u.normalized_name_v3;

create temp table tmp_mixed_next_target_cross_lane_candidate_rows_v1 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_set_code,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_mixed_next_target_unresolved_v1 u
join tmp_mixed_next_target_canonical_all_v1 c
  on c.candidate_target_set_code <> u.target_set_code
 and c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 = u.normalized_name_v3;

create temp table tmp_mixed_next_target_row_metrics_v1 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  count(distinct em.candidate_target_id)::int as exact_match_count,
  count(distinct stdn.candidate_target_id)::int as same_token_different_name_count,
  count(distinct bm.candidate_target_id)::int as base_match_count,
  count(distinct sbdn.candidate_target_id)::int as same_base_different_name_count,
  count(distinct cl.candidate_target_id)::int as cross_lane_candidate_count
from tmp_mixed_next_target_unresolved_v1 u
left join tmp_mixed_next_target_exact_match_rows_v1 em
  on em.target_set_code = u.target_set_code
 and em.old_parent_id = u.old_parent_id
left join tmp_mixed_next_target_same_token_diff_name_rows_v1 stdn
  on stdn.target_set_code = u.target_set_code
 and stdn.old_parent_id = u.old_parent_id
left join tmp_mixed_next_target_base_match_rows_v1 bm
  on bm.target_set_code = u.target_set_code
 and bm.old_parent_id = u.old_parent_id
left join tmp_mixed_next_target_same_base_diff_name_rows_v1 sbdn
  on sbdn.target_set_code = u.target_set_code
 and sbdn.old_parent_id = u.old_parent_id
left join tmp_mixed_next_target_cross_lane_candidate_rows_v1 cl
  on cl.target_set_code = u.target_set_code
 and cl.old_parent_id = u.old_parent_id
group by u.target_set_code, u.old_parent_id;

create temp table tmp_mixed_next_target_preclassification_v1 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name_v3 as normalized_name,
  case
    when m.exact_match_count = 1 then em.candidate_target_id
    when m.exact_match_count = 0 and m.base_match_count = 1 then bm.candidate_target_id
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count = 1 then cl.candidate_target_id
    else null
  end as candidate_target_id,
  case
    when m.exact_match_count = 1 then 'DUPLICATE_COLLAPSE'
    when m.exact_match_count > 1 then 'BLOCKED_CONFLICT'
    when m.exact_match_count = 0 and m.base_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when m.exact_match_count = 0 and m.base_match_count > 1 then 'BLOCKED_CONFLICT'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count = 1 then 'ALIAS_COLLAPSE'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count > 1 then 'BLOCKED_CONFLICT'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count = 0 and m.same_base_different_name_count = 0 then 'PROMOTION_REQUIRED'
    when m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'UNCLASSIFIED'
  end as preliminary_execution_class
from tmp_mixed_next_target_unresolved_v1 u
join tmp_mixed_next_target_row_metrics_v1 m
  on m.target_set_code = u.target_set_code
 and m.old_parent_id = u.old_parent_id
left join lateral (
  select candidate_target_id
  from tmp_mixed_next_target_exact_match_rows_v1 em
  where em.target_set_code = u.target_set_code
    and em.old_parent_id = u.old_parent_id
  order by candidate_target_id
  limit 1
) em on true
left join lateral (
  select candidate_target_id
  from tmp_mixed_next_target_base_match_rows_v1 bm
  where bm.target_set_code = u.target_set_code
    and bm.old_parent_id = u.old_parent_id
  order by candidate_target_id
  limit 1
) bm on true
left join lateral (
  select candidate_target_id
  from tmp_mixed_next_target_cross_lane_candidate_rows_v1 cl
  where cl.target_set_code = u.target_set_code
    and cl.old_parent_id = u.old_parent_id
  order by cl.candidate_target_set_code, cl.candidate_target_id
  limit 1
) cl on true;

create temp table tmp_mixed_next_target_fan_in_groups_v1 on commit drop as
select
  target_set_code,
  candidate_target_id as target_card_print_id,
  count(*)::int as incoming_sources
from tmp_mixed_next_target_preclassification_v1
where preliminary_execution_class in ('DUPLICATE_COLLAPSE', 'BASE_VARIANT_COLLAPSE', 'ALIAS_COLLAPSE')
  and candidate_target_id is not null
group by target_set_code, candidate_target_id
having count(*) > 1;

create temp table tmp_mixed_next_target_set_metrics_v1 on commit drop as
select
  ts.set_code,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_unresolved_v1 u
    where u.target_set_code = ts.set_code
  ), 0) as unresolved_parent_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_canonical_in_set_v1 c
    where c.target_set_code = ts.set_code
  ), 0) as canonical_parent_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_row_metrics_v1 rm
    where rm.target_set_code = ts.set_code
      and rm.exact_match_count = 1
  ), 0) as exact_matches,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_row_metrics_v1 rm
    where rm.target_set_code = ts.set_code
      and rm.same_token_different_name_count > 0
  ), 0) as same_token_conflicts,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_row_metrics_v1 rm
    where rm.target_set_code = ts.set_code
      and rm.exact_match_count = 0
  ), 0) as unmatched_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_fan_in_groups_v1 f
    where f.target_set_code = ts.set_code
  ), 0) as fan_in_group_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v1 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'BASE_VARIANT_COLLAPSE'
  ), 0) as candidate_normalization_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v1 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'DUPLICATE_COLLAPSE'
  ), 0) as candidate_duplicate_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v1 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'PROMOTION_REQUIRED'
  ), 0) as candidate_promotion_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v1 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'BLOCKED_CONFLICT'
  ), 0) as blocked_conflict_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v1 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'ALIAS_COLLAPSE'
  ), 0) as alias_candidate_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v1 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'UNCLASSIFIED'
  ), 0) as unclassified_count
from tmp_mixed_next_target_sets_v1 ts;

create temp table tmp_mixed_next_target_ranked_v1 on commit drop as
select
  m.*,
  case
    when m.unclassified_count > 0 then 'BLOCKED'
    when m.blocked_conflict_count > 0
      and m.blocked_conflict_count >= greatest(
        m.candidate_duplicate_count,
        m.candidate_normalization_count,
        m.candidate_promotion_count,
        m.alias_candidate_count
      )
      then 'BLOCKED_CONFLICT_HEAVY'
    when m.candidate_duplicate_count = m.unresolved_parent_count
      and m.unresolved_parent_count > 0
      and m.fan_in_group_count = 0
      and m.candidate_normalization_count = 0
      and m.candidate_promotion_count = 0
      and m.blocked_conflict_count = 0
      and m.alias_candidate_count = 0
      then 'DUPLICATE_COLLAPSE'
    when m.candidate_normalization_count = m.unresolved_parent_count
      and m.unresolved_parent_count > 0
      and m.fan_in_group_count = 0
      and m.candidate_duplicate_count = 0
      and m.candidate_promotion_count = 0
      and m.blocked_conflict_count = 0
      and m.alias_candidate_count = 0
      then 'BASE_VARIANT_COLLAPSE'
    else 'MIXED_EXECUTION'
  end as execution_class,
  round(
    greatest(
      m.candidate_duplicate_count,
      m.candidate_normalization_count,
      m.candidate_promotion_count,
      m.alias_candidate_count
    )::numeric / nullif(m.unresolved_parent_count, 0),
    4
  ) as dominant_lane_ratio,
  row_number() over (
    order by
      case
        when m.unclassified_count > 0 then 4
        when m.blocked_conflict_count > 0
          and m.blocked_conflict_count >= greatest(
            m.candidate_duplicate_count,
            m.candidate_normalization_count,
            m.candidate_promotion_count,
            m.alias_candidate_count
          ) then 3
        when m.candidate_duplicate_count = m.unresolved_parent_count
          and m.unresolved_parent_count > 0
          and m.fan_in_group_count = 0
          and m.candidate_normalization_count = 0
          and m.candidate_promotion_count = 0
          and m.blocked_conflict_count = 0
          and m.alias_candidate_count = 0 then 0
        when m.candidate_normalization_count = m.unresolved_parent_count
          and m.unresolved_parent_count > 0
          and m.fan_in_group_count = 0
          and m.candidate_duplicate_count = 0
          and m.candidate_promotion_count = 0
          and m.blocked_conflict_count = 0
          and m.alias_candidate_count = 0 then 1
        else 2
      end,
      m.blocked_conflict_count,
      m.fan_in_group_count,
      m.candidate_promotion_count,
      m.alias_candidate_count,
      greatest(
        m.candidate_duplicate_count,
        m.candidate_normalization_count,
        m.candidate_promotion_count,
        m.alias_candidate_count
      )::numeric / nullif(m.unresolved_parent_count, 0) desc,
      m.unresolved_parent_count,
      m.set_code
  ) as safety_rank
from tmp_mixed_next_target_set_metrics_v1 m;

-- PHASE 1 / 2 — per-set metrics and execution-class detection
select
  set_code,
  unresolved_parent_count,
  canonical_parent_count,
  exact_matches,
  same_token_conflicts,
  unmatched_count,
  fan_in_group_count,
  candidate_normalization_count,
  candidate_duplicate_count,
  candidate_promotion_count,
  blocked_conflict_count,
  alias_candidate_count,
  unclassified_count,
  execution_class,
  dominant_lane_ratio,
  safety_rank
from tmp_mixed_next_target_ranked_v1
order by safety_rank, set_code;

-- PHASE 3 — safety ranking
select
  safety_rank,
  set_code,
  execution_class,
  blocked_conflict_count,
  fan_in_group_count,
  candidate_promotion_count,
  alias_candidate_count,
  dominant_lane_ratio,
  unresolved_parent_count
from tmp_mixed_next_target_ranked_v1
order by safety_rank, set_code;

-- PHASE 4 — selected next target
select
  set_code as selected_next_target,
  execution_class as selected_execution_class,
  unresolved_parent_count,
  blocked_conflict_count,
  fan_in_group_count,
  candidate_promotion_count,
  alias_candidate_count,
  dominant_lane_ratio
from tmp_mixed_next_target_ranked_v1
where safety_rank = 1;

-- Validation — unclassified rows must remain zero across the target bucket
select
  sum(unclassified_count)::int as total_unclassified_count
from tmp_mixed_next_target_ranked_v1;

rollback;
