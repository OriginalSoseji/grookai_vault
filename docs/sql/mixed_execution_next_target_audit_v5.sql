-- MIXED_EXECUTION_NEXT_TARGET_SELECTION_V5
-- Read-only prioritization audit for the remaining blocked-conflict-heavy sets
-- after full ecard2 closure.
--
-- Live schema notes:
--   - unresolved set surfaces are defined by active public.card_print_identity rows
--     whose set_code_identity is in scope and whose parent public.card_prints row has gv_id is null
--   - canonical in-set targets are public.card_prints joined through public.sets.code
--   - active identity semantics use public.card_print_identity.is_active
-- Stable normalization contract:
--   NAME_NORMALIZE_V3 = lowercase -> apostrophe normalize -> GX/EX hyphen normalize -> dash normalize -> whitespace collapse -> trim
--   TOKEN_NORMALIZE_V1 = numeric base extraction; suffix routing only when proven lawful by unique base-number + normalized-name target
-- Target set list:
--   g1, pl2, pl4
-- Live result on 2026-04-12:
--   selected_next_target = g1
--   selected_execution_class = BLOCKED_CONFLICT_HEAVY
--   expected_root_cause_category = token_collisions

begin;

drop table if exists tmp_mixed_next_target_sets_v5;
drop table if exists tmp_mixed_next_target_unresolved_v5;
drop table if exists tmp_mixed_next_target_canonical_in_set_v5;
drop table if exists tmp_mixed_next_target_canonical_all_v5;
drop table if exists tmp_mixed_next_target_exact_match_rows_v5;
drop table if exists tmp_mixed_next_target_same_token_diff_name_rows_v5;
drop table if exists tmp_mixed_next_target_base_match_rows_v5;
drop table if exists tmp_mixed_next_target_same_base_diff_name_rows_v5;
drop table if exists tmp_mixed_next_target_cross_lane_candidate_rows_v5;
drop table if exists tmp_mixed_next_target_row_metrics_v5;
drop table if exists tmp_mixed_next_target_preclassification_v5;
drop table if exists tmp_mixed_next_target_fan_in_groups_v5;
drop table if exists tmp_mixed_next_target_set_metrics_v5;
drop table if exists tmp_mixed_next_target_ranked_v5;
drop table if exists tmp_mixed_next_target_root_cause_counts_v5;
drop table if exists tmp_mixed_next_target_blocked_preview_v5;

create temp table tmp_mixed_next_target_sets_v5 (
  set_code text primary key
) on commit drop;

insert into tmp_mixed_next_target_sets_v5 (set_code)
values
  ('g1'),
  ('pl2'),
  ('pl4');

create temp table tmp_mixed_next_target_unresolved_v5 on commit drop as
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
join tmp_mixed_next_target_sets_v5 ts
  on ts.set_code = cpi.set_code_identity
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_mixed_next_target_canonical_in_set_v5 on commit drop as
select
  s.code as target_set_code,
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
join public.sets s
  on s.id = cp.set_id
join tmp_mixed_next_target_sets_v5 ts
  on ts.set_code = s.code
where cp.gv_id is not null;

create temp table tmp_mixed_next_target_canonical_all_v5 on commit drop as
select
  s.code as candidate_target_set_code,
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
join public.sets s
  on s.id = cp.set_id
where cp.gv_id is not null;

create temp table tmp_mixed_next_target_exact_match_rows_v5 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id
from tmp_mixed_next_target_unresolved_v5 u
join tmp_mixed_next_target_canonical_in_set_v5 c
  on c.target_set_code = u.target_set_code
 and c.candidate_target_number = u.old_printed_token
 and c.exact_name_key = u.exact_name_key;

create temp table tmp_mixed_next_target_same_token_diff_name_rows_v5 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id
from tmp_mixed_next_target_unresolved_v5 u
join tmp_mixed_next_target_canonical_in_set_v5 c
  on c.target_set_code = u.target_set_code
 and c.candidate_target_number = u.old_printed_token
 and c.exact_name_key <> u.exact_name_key;

create temp table tmp_mixed_next_target_base_match_rows_v5 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id
from tmp_mixed_next_target_unresolved_v5 u
join tmp_mixed_next_target_canonical_in_set_v5 c
  on c.target_set_code = u.target_set_code
 and c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 = u.normalized_name_v3;

create temp table tmp_mixed_next_target_same_base_diff_name_rows_v5 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id
from tmp_mixed_next_target_unresolved_v5 u
join tmp_mixed_next_target_canonical_in_set_v5 c
  on c.target_set_code = u.target_set_code
 and c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 <> u.normalized_name_v3;

create temp table tmp_mixed_next_target_cross_lane_candidate_rows_v5 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_set_code
from tmp_mixed_next_target_unresolved_v5 u
join tmp_mixed_next_target_canonical_all_v5 c
  on c.candidate_target_set_code <> u.target_set_code
 and c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 = u.normalized_name_v3;

create temp table tmp_mixed_next_target_row_metrics_v5 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  count(distinct em.candidate_target_id)::int as exact_match_count,
  count(distinct stdn.candidate_target_id)::int as same_token_different_name_count,
  count(distinct bm.candidate_target_id)::int as base_match_count,
  count(distinct sbdn.candidate_target_id)::int as same_base_different_name_count,
  count(distinct cl.candidate_target_id)::int as cross_lane_candidate_count
from tmp_mixed_next_target_unresolved_v5 u
left join tmp_mixed_next_target_exact_match_rows_v5 em
  on em.target_set_code = u.target_set_code
 and em.old_parent_id = u.old_parent_id
left join tmp_mixed_next_target_same_token_diff_name_rows_v5 stdn
  on stdn.target_set_code = u.target_set_code
 and stdn.old_parent_id = u.old_parent_id
left join tmp_mixed_next_target_base_match_rows_v5 bm
  on bm.target_set_code = u.target_set_code
 and bm.old_parent_id = u.old_parent_id
left join tmp_mixed_next_target_same_base_diff_name_rows_v5 sbdn
  on sbdn.target_set_code = u.target_set_code
 and sbdn.old_parent_id = u.old_parent_id
left join tmp_mixed_next_target_cross_lane_candidate_rows_v5 cl
  on cl.target_set_code = u.target_set_code
 and cl.old_parent_id = u.old_parent_id
group by u.target_set_code, u.old_parent_id;

create temp table tmp_mixed_next_target_preclassification_v5 on commit drop as
select
  u.target_set_code,
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.token_suffix,
  m.exact_match_count,
  m.same_token_different_name_count,
  m.base_match_count,
  m.same_base_different_name_count,
  m.cross_lane_candidate_count,
  case
    when m.exact_match_count = 1 then 'DUPLICATE_COLLAPSE'
    when m.exact_match_count > 1 then 'BLOCKED_CONFLICT'
    when m.exact_match_count = 0 and m.base_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when m.exact_match_count = 0 and m.base_match_count > 1 then 'BLOCKED_CONFLICT'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count = 1 then 'ALIAS_COLLAPSE'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count > 1 then 'BLOCKED_CONFLICT'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.same_base_different_name_count = 0 then 'PROMOTION_REQUIRED'
    when m.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'UNCLASSIFIED'
  end as preliminary_execution_class,
  case
    when m.same_token_different_name_count > 0 then 'token_collisions'
    when m.same_base_different_name_count > 0 and u.token_suffix is not null then 'suffix_ambiguity'
    when m.exact_match_count > 1 or m.base_match_count > 1 or m.cross_lane_candidate_count > 1 then 'promotion_ambiguity'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.same_base_different_name_count = 0 then 'identity_model_gaps'
    else 'token_collisions'
  end as preview_root_cause,
  case
    when m.same_token_different_name_count > 0 then 'same exact printed token already owned by different canonical name'
    when m.same_base_different_name_count > 0 and u.token_suffix is not null then 'suffixed token converges into numeric-base ownership conflict'
    when m.exact_match_count > 1 or m.base_match_count > 1 or m.cross_lane_candidate_count > 1 then 'multiple lawful candidates exist on current normalization surface'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.same_base_different_name_count = 0 then 'no lawful target surfaced under current model; follow-up contract likely needed'
    else 'blocked conflict on current identity surface'
  end as proof_reason
from tmp_mixed_next_target_unresolved_v5 u
join tmp_mixed_next_target_row_metrics_v5 m
  on m.target_set_code = u.target_set_code
 and m.old_parent_id = u.old_parent_id;

create temp table tmp_mixed_next_target_fan_in_groups_v5 on commit drop as
select
  target_set_code,
  candidate_target_id as target_card_print_id,
  count(*)::int as incoming_sources
from (
  select
    p.target_set_code,
    p.old_parent_id,
    case
      when p.preliminary_execution_class = 'DUPLICATE_COLLAPSE' then (
        select em.candidate_target_id
        from tmp_mixed_next_target_exact_match_rows_v5 em
        where em.target_set_code = p.target_set_code
          and em.old_parent_id = p.old_parent_id
        order by em.candidate_target_id
        limit 1
      )
      when p.preliminary_execution_class = 'BASE_VARIANT_COLLAPSE' then (
        select bm.candidate_target_id
        from tmp_mixed_next_target_base_match_rows_v5 bm
        where bm.target_set_code = p.target_set_code
          and bm.old_parent_id = p.old_parent_id
        order by bm.candidate_target_id
        limit 1
      )
      when p.preliminary_execution_class = 'ALIAS_COLLAPSE' then (
        select cl.candidate_target_id
        from tmp_mixed_next_target_cross_lane_candidate_rows_v5 cl
        where cl.target_set_code = p.target_set_code
          and cl.old_parent_id = p.old_parent_id
        order by cl.candidate_target_set_code, cl.candidate_target_id
        limit 1
      )
      else null
    end as candidate_target_id
  from tmp_mixed_next_target_preclassification_v5 p
) mapped
where candidate_target_id is not null
group by target_set_code, candidate_target_id
having count(*) > 1;

create temp table tmp_mixed_next_target_set_metrics_v5 on commit drop as
select
  ts.set_code,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_unresolved_v5 u
    where u.target_set_code = ts.set_code
  ), 0) as unresolved_parent_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_canonical_in_set_v5 c
    where c.target_set_code = ts.set_code
  ), 0) as canonical_parent_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_row_metrics_v5 rm
    where rm.target_set_code = ts.set_code
      and rm.same_token_different_name_count > 0
  ), 0) as same_token_conflicts,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v5 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'PROMOTION_REQUIRED'
  ), 0) as unmatched_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_fan_in_groups_v5 f
    where f.target_set_code = ts.set_code
  ), 0) as fan_in_group_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v5 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class in ('BASE_VARIANT_COLLAPSE', 'DUPLICATE_COLLAPSE', 'ALIAS_COLLAPSE')
  ), 0) as normalization_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v5 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'BLOCKED_CONFLICT'
  ), 0) as blocked_conflict_count,
  coalesce((
    select count(*)::int
    from tmp_mixed_next_target_preclassification_v5 p
    where p.target_set_code = ts.set_code
      and p.preliminary_execution_class = 'UNCLASSIFIED'
  ), 0) as unclassified_count
from tmp_mixed_next_target_sets_v5 ts;

create temp table tmp_mixed_next_target_ranked_v5 on commit drop as
select
  m.*,
  case
    when m.unclassified_count > 0 then 'BLOCKED'
    when m.blocked_conflict_count >= m.normalization_count then 'BLOCKED_CONFLICT_HEAVY'
    else 'OTHER'
  end as execution_class,
  row_number() over (
    order by
      m.blocked_conflict_count,
      (m.unresolved_parent_count - m.normalization_count),
      m.same_token_conflicts,
      m.unresolved_parent_count,
      m.set_code
  ) as safety_rank
from tmp_mixed_next_target_set_metrics_v5 m;

create temp table tmp_mixed_next_target_root_cause_counts_v5 on commit drop as
select
  p.target_set_code,
  p.preview_root_cause,
  count(*)::int as row_count
from tmp_mixed_next_target_preclassification_v5 p
where p.preliminary_execution_class = 'BLOCKED_CONFLICT'
group by p.target_set_code, p.preview_root_cause;

create temp table tmp_mixed_next_target_blocked_preview_v5 on commit drop as
select *
from (
  select
    p.target_set_code,
    p.old_parent_id,
    p.old_name,
    p.old_printed_token,
    p.preview_root_cause,
    p.proof_reason,
    p.same_token_different_name_count,
    p.base_match_count,
    p.same_base_different_name_count,
    p.cross_lane_candidate_count,
    row_number() over (
      partition by p.target_set_code
      order by
        p.same_token_different_name_count desc,
        p.same_base_different_name_count desc,
        p.cross_lane_candidate_count desc,
        p.old_printed_token,
        p.old_parent_id
    ) as rn
  from tmp_mixed_next_target_preclassification_v5 p
  where p.preliminary_execution_class = 'BLOCKED_CONFLICT'
) ranked
where rn <= 5;

-- PHASE 1 / 2 — per-set metrics and execution-class detection
select
  set_code,
  unresolved_parent_count,
  canonical_parent_count,
  same_token_conflicts,
  unmatched_count,
  fan_in_group_count,
  normalization_count,
  blocked_conflict_count,
  unclassified_count,
  execution_class,
  safety_rank
from tmp_mixed_next_target_ranked_v5
order by safety_rank, set_code;

-- PHASE 3 — dominant blocked root-cause preview
select
  target_set_code,
  preview_root_cause,
  row_count
from tmp_mixed_next_target_root_cause_counts_v5
order by target_set_code, row_count desc, preview_root_cause;

select
  target_set_code,
  old_parent_id,
  old_name,
  old_printed_token,
  preview_root_cause,
  proof_reason,
  same_token_different_name_count,
  base_match_count,
  same_base_different_name_count,
  cross_lane_candidate_count
from tmp_mixed_next_target_blocked_preview_v5
order by target_set_code, rn;

-- PHASE 4 / 5 — safety ranking and selected next target
select
  safety_rank,
  set_code,
  execution_class,
  blocked_conflict_count,
  normalization_count,
  same_token_conflicts,
  unresolved_parent_count
from tmp_mixed_next_target_ranked_v5
order by safety_rank, set_code;

select
  r.set_code as selected_next_target,
  r.execution_class as selected_execution_class,
  rc.preview_root_cause as expected_root_cause_category,
  'contract-first blocked conflict audit'::text as expected_contract_type
from tmp_mixed_next_target_ranked_v5 r
left join lateral (
  select preview_root_cause
  from tmp_mixed_next_target_root_cause_counts_v5 rc
  where rc.target_set_code = r.set_code
  order by rc.row_count desc, rc.preview_root_cause
  limit 1
) rc on true
where r.safety_rank = 1;

-- Validation — unclassified rows must remain zero across the target bucket
select
  sum(unclassified_count)::int as total_unclassified_count
from tmp_mixed_next_target_ranked_v5;

rollback;
