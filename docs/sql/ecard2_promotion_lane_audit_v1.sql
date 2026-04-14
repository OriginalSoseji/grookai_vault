-- ECARD2_PROMOTION_LANE_AUDIT_V1
-- Read-only row-level decomposition audit for the unresolved ecard2 surface.
--
-- Scope:
--   - set_code_identity = 'ecard2'
--   - unresolved parents = active public.card_print_identity rows whose parent card_prints.gv_id is null
--   - canonical in-set targets = public.card_prints where set_code = 'ecard2' and gv_id is not null
--
-- Stable normalization contract used:
--   NAME_NORMALIZE_V3 = lowercase -> apostrophe normalize -> GX/EX hyphen normalize -> dash normalize -> whitespace collapse -> trim
--   TOKEN_NORMALIZE_V1 = numeric base extraction only; suffix routing requires a lawful canonical target
--
-- Live audited findings on 2026-04-11:
--   - unresolved_parent_count = 34
--   - canonical_parent_count = 160
--   - PROMOTION_REQUIRED = 24
--   - BASE_VARIANT_COLLAPSE = 0
--   - BLOCKED_CONFLICT = 10
--   - UNCLASSIFIED = 0
--
-- Important audit correction:
--   The earlier coarse selection heuristic exposed 4 cross-set same-name/same-number coincidences.
--   Row-level audit proves those are not lawful same-set BASE_VARIANT targets:
--     - 3 reclassify to PROMOTION_REQUIRED
--     - 1 (Steelix / H23) remains BLOCKED_CONFLICT because its numeric base collides with ecard2 Muk / 23
--
-- Additional promotion-lane split:
--   - promotion_ready_count = 11
--   - promotion_namespace_collision_count = 13
--   The 24 promotion rows do not execute as one artifact because 13 proposed GV-PK-AQ-* ids are already
--   occupied by set_id-matched rows with set_code null and zero active identities.

begin;

drop table if exists tmp_ecard2_unresolved_v1;
drop table if exists tmp_ecard2_canonical_in_set_v1;
drop table if exists tmp_ecard2_canonical_all_v1;
drop table if exists tmp_ecard2_exact_match_rows_v1;
drop table if exists tmp_ecard2_base_match_rows_v1;
drop table if exists tmp_ecard2_same_token_diff_name_rows_v1;
drop table if exists tmp_ecard2_same_base_diff_name_rows_v1;
drop table if exists tmp_ecard2_cross_set_candidate_rows_v1;
drop table if exists tmp_ecard2_row_metrics_v1;
drop table if exists tmp_ecard2_blocked_targets_v1;
drop table if exists tmp_ecard2_cross_set_review_v1;
drop table if exists tmp_ecard2_classification_v1;
drop table if exists tmp_ecard2_promotion_lane_split_v1;
drop table if exists tmp_ecard2_namespace_collision_rows_v1;

create temp table tmp_ecard2_unresolved_v1 on commit drop as
select
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
  ) as normalized_name,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'ecard2'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_ecard2_canonical_in_set_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.gv_id as candidate_target_gv_id,
  cp.name as candidate_target_name,
  cp.number as candidate_target_number,
  cp.number_plain as candidate_target_number_plain,
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
  ) as normalized_name
from public.card_prints cp
where cp.set_code = 'ecard2'
  and cp.gv_id is not null;

create temp table tmp_ecard2_canonical_all_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.set_code as candidate_target_set_code,
  cp.set_id as candidate_target_set_id,
  cp.gv_id as candidate_target_gv_id,
  cp.name as candidate_target_name,
  cp.number as candidate_target_number,
  cp.number_plain as candidate_target_number_plain,
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
  ) as normalized_name
from public.card_prints cp
where cp.gv_id is not null;

create temp table tmp_ecard2_exact_match_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_gv_id,
  c.candidate_target_name,
  c.candidate_target_number,
  'exact_token'::text as match_type
from tmp_ecard2_unresolved_v1 u
join tmp_ecard2_canonical_in_set_v1 c
  on c.candidate_target_number = u.old_printed_token
 and c.exact_name_key = u.exact_name_key;

create temp table tmp_ecard2_same_token_diff_name_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_gv_id,
  c.candidate_target_name,
  c.candidate_target_number
from tmp_ecard2_unresolved_v1 u
join tmp_ecard2_canonical_in_set_v1 c
  on c.candidate_target_number = u.old_printed_token
 and c.exact_name_key <> u.exact_name_key;

create temp table tmp_ecard2_base_match_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_gv_id,
  c.candidate_target_name,
  c.candidate_target_number,
  'normalized_name'::text as match_type
from tmp_ecard2_unresolved_v1 u
join tmp_ecard2_canonical_in_set_v1 c
  on c.candidate_target_number_plain = u.normalized_token
 and c.normalized_name = u.normalized_name;

create temp table tmp_ecard2_same_base_diff_name_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_gv_id,
  c.candidate_target_name,
  c.candidate_target_number,
  c.candidate_target_number_plain
from tmp_ecard2_unresolved_v1 u
join tmp_ecard2_canonical_in_set_v1 c
  on c.candidate_target_number_plain = u.normalized_token
 and c.normalized_name <> u.normalized_name;

create temp table tmp_ecard2_cross_set_candidate_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_set_code,
  c.candidate_target_gv_id,
  c.candidate_target_name,
  c.candidate_target_number
from tmp_ecard2_unresolved_v1 u
join tmp_ecard2_canonical_all_v1 c
  on c.candidate_target_set_code <> 'ecard2'
 and c.candidate_target_number_plain = u.normalized_token
 and c.normalized_name = u.normalized_name;

create temp table tmp_ecard2_row_metrics_v1 on commit drop as
select
  u.old_parent_id,
  count(distinct em.candidate_target_id)::int as exact_match_count,
  count(distinct stdn.candidate_target_id)::int as same_token_different_name_count,
  count(distinct bm.candidate_target_id)::int as base_match_count,
  count(distinct sbdn.candidate_target_id)::int as same_base_different_name_count,
  count(distinct cl.candidate_target_id)::int as cross_set_candidate_count
from tmp_ecard2_unresolved_v1 u
left join tmp_ecard2_exact_match_rows_v1 em
  on em.old_parent_id = u.old_parent_id
left join tmp_ecard2_same_token_diff_name_rows_v1 stdn
  on stdn.old_parent_id = u.old_parent_id
left join tmp_ecard2_base_match_rows_v1 bm
  on bm.old_parent_id = u.old_parent_id
left join tmp_ecard2_same_base_diff_name_rows_v1 sbdn
  on sbdn.old_parent_id = u.old_parent_id
left join tmp_ecard2_cross_set_candidate_rows_v1 cl
  on cl.old_parent_id = u.old_parent_id
group by u.old_parent_id;

create temp table tmp_ecard2_blocked_targets_v1 on commit drop as
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  sbdn.candidate_target_id as blocked_against_target_id,
  sbdn.candidate_target_gv_id as blocked_against_target_gv_id,
  sbdn.candidate_target_name as blocked_against_target_name,
  sbdn.candidate_target_number as blocked_against_target_number,
  sbdn.candidate_target_number_plain as blocked_against_target_number_plain
from tmp_ecard2_unresolved_v1 u
join tmp_ecard2_same_base_diff_name_rows_v1 sbdn
  on sbdn.old_parent_id = u.old_parent_id;

create temp table tmp_ecard2_cross_set_review_v1 on commit drop as
select
  u.old_parent_id,
  count(distinct cl.candidate_target_id)::int as cross_set_candidate_count,
  string_agg(
    distinct coalesce(cl.candidate_target_set_code, '<null>') || ':' || cl.candidate_target_gv_id,
    ', ' order by coalesce(cl.candidate_target_set_code, '<null>'), cl.candidate_target_gv_id
  ) as cross_set_candidate_summary
from tmp_ecard2_unresolved_v1 u
left join tmp_ecard2_cross_set_candidate_rows_v1 cl
  on cl.old_parent_id = u.old_parent_id
group by u.old_parent_id;

create temp table tmp_ecard2_classification_v1 on commit drop as
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  case
    when rm.exact_match_count = 1 then em.candidate_target_id
    when rm.exact_match_count = 0 and rm.base_match_count = 1 then bm.candidate_target_id
    else null
  end as candidate_target_id,
  case
    when rm.exact_match_count = 1 then em.candidate_target_gv_id
    when rm.exact_match_count = 0 and rm.base_match_count = 1 then bm.candidate_target_gv_id
    else null
  end as candidate_target_gv_id,
  case
    when rm.exact_match_count > 1 then 'BLOCKED_CONFLICT'
    when rm.same_token_different_name_count > 0 then 'BLOCKED_CONFLICT'
    when rm.base_match_count > 1 then 'BLOCKED_CONFLICT'
    when rm.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    when rm.exact_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when rm.exact_match_count = 0 and rm.base_match_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when rm.exact_match_count = 0 and rm.base_match_count = 0 then 'PROMOTION_REQUIRED'
    else 'UNCLASSIFIED'
  end as execution_class,
  case
    when rm.exact_match_count > 1 then
      'multiple same-set exact-token targets remain after normalization'
    when rm.same_token_different_name_count > 0 then
      'same printed token collides with a different in-set canonical identity'
    when rm.base_match_count > 1 then
      'multiple same-set normalized targets remain after numeric base routing'
    when rm.same_base_different_name_count > 0 then
      'numeric base ' || coalesce(u.normalized_token, '<null>') || ' is already owned in-set by a different canonical card'
    when rm.exact_match_count = 1 then
      'deterministic same-set exact-token target'
    when rm.exact_match_count = 0 and rm.base_match_count = 1 then
      'deterministic same-set normalized target'
    when coalesce(csr.cross_set_candidate_count, 0) > 0 then
      'no lawful same-set target exists; cross-set same-name/number coincidence (' || csr.cross_set_candidate_summary || ') does not prove alias behavior'
    when rm.exact_match_count = 0 and rm.base_match_count = 0 then
      'no lawful canonical target exists after same-set matching; stable unresolved print is promotion-safe'
    else
      'classification gap'
  end as proof_reason
from tmp_ecard2_unresolved_v1 u
join tmp_ecard2_row_metrics_v1 rm
  on rm.old_parent_id = u.old_parent_id
left join lateral (
  select candidate_target_id, candidate_target_gv_id
  from tmp_ecard2_exact_match_rows_v1 em
  where em.old_parent_id = u.old_parent_id
  order by candidate_target_id
  limit 1
) em on true
left join lateral (
  select candidate_target_id, candidate_target_gv_id
  from tmp_ecard2_base_match_rows_v1 bm
  where bm.old_parent_id = u.old_parent_id
  order by candidate_target_id
  limit 1
) bm on true
left join tmp_ecard2_cross_set_review_v1 csr
  on csr.old_parent_id = u.old_parent_id;

create temp table tmp_ecard2_promotion_lane_split_v1 on commit drop as
select
  c.old_parent_id,
  c.old_name,
  c.old_printed_token,
  'GV-PK-AQ-' || c.old_printed_token as proposed_gv_id,
  case
    when exists (
      select 1
      from public.card_prints cp
      where cp.gv_id = 'GV-PK-AQ-' || c.old_printed_token
    ) then 'PROMOTION_NAMESPACE_COLLISION'
    else 'PROMOTION_READY'
  end as promotion_lane
from tmp_ecard2_classification_v1 c
where c.execution_class = 'PROMOTION_REQUIRED';

create temp table tmp_ecard2_namespace_collision_rows_v1 on commit drop as
select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.proposed_gv_id,
  cp.id as colliding_row_id,
  cp.set_id as colliding_set_id,
  cp.set_code as colliding_set_code,
  cp.name as colliding_name,
  cp.number as colliding_number,
  cp.gv_id as colliding_gv_id,
  coalesce(ai.active_identity_count, 0) as colliding_active_identity_count
from tmp_ecard2_promotion_lane_split_v1 p
join public.card_prints cp
  on cp.gv_id = p.proposed_gv_id
left join (
  select
    cpi.card_print_id,
    count(*) filter (where cpi.is_active)::int as active_identity_count
  from public.card_print_identity cpi
  group by cpi.card_print_id
) ai
  on ai.card_print_id = cp.id
where p.promotion_lane = 'PROMOTION_NAMESPACE_COLLISION';

-- PHASE 1 — target surface counts
select
  (select count(*)::int from tmp_ecard2_unresolved_v1) as unresolved_parent_count,
  (select count(*)::int from tmp_ecard2_canonical_in_set_v1) as canonical_parent_count;

-- PHASE 2 — normalized candidate review
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_gv_id,
  c.candidate_target_number as candidate_target_number_plain,
  c.match_type
from tmp_ecard2_unresolved_v1 u
join (
  select old_parent_id, candidate_target_id, candidate_target_name, candidate_target_gv_id, candidate_target_number, match_type
  from tmp_ecard2_exact_match_rows_v1
  union all
  select old_parent_id, candidate_target_id, candidate_target_name, candidate_target_gv_id, candidate_target_number, match_type
  from tmp_ecard2_base_match_rows_v1
  union all
  select old_parent_id, candidate_target_id, candidate_target_name, candidate_target_gv_id, candidate_target_number, 'cross_set_coincidence'::text as match_type
  from tmp_ecard2_cross_set_candidate_rows_v1
) c
  on c.old_parent_id = u.old_parent_id
order by u.old_printed_token, u.old_name, c.match_type, c.candidate_target_gv_id;

-- PHASE 3 — promotion candidate evidence
select
  c.old_parent_id,
  c.old_name,
  c.old_printed_token,
  c.proof_reason as why_no_lawful_target_exists,
  case
    when pls.promotion_lane = 'PROMOTION_NAMESPACE_COLLISION' then
      'promotion-safe by identity proof, but exact-token GV namespace is already occupied by a stranded row and must be split from collision-free promotions'
    else
      'stable printed identity surface with no lawful same-set target and no in-set numeric ownership conflict'
  end as why_promotion_is_lawful
from tmp_ecard2_classification_v1 c
left join tmp_ecard2_promotion_lane_split_v1 pls
  on pls.old_parent_id = c.old_parent_id
where c.execution_class = 'PROMOTION_REQUIRED'
order by c.old_printed_token, c.old_name;

-- PHASE 4 — blocked conflict surface with proof
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  b.blocked_against_target_id,
  b.blocked_against_target_gv_id,
  b.blocked_against_target_name,
  b.blocked_against_target_number,
  b.blocked_against_target_number_plain,
  c.proof_reason
from tmp_ecard2_blocked_targets_v1 b
join tmp_ecard2_classification_v1 c
  on c.old_parent_id = b.old_parent_id
order by b.old_printed_token, b.old_name;

-- PHASE 5 — final required classification table
select
  old_parent_id,
  old_name,
  old_printed_token,
  normalized_name,
  candidate_target_id,
  candidate_target_gv_id,
  execution_class,
  proof_reason
from tmp_ecard2_classification_v1
order by execution_class, old_printed_token, old_name;

-- PHASE 6A — top-level execution split summary
select
  count(*) filter (where execution_class = 'PROMOTION_REQUIRED')::int as promotion_required_count,
  count(*) filter (where execution_class = 'BASE_VARIANT_COLLAPSE')::int as base_variant_collapse_count,
  count(*) filter (where execution_class = 'BLOCKED_CONFLICT')::int as blocked_conflict_count,
  count(*) filter (where execution_class = 'UNCLASSIFIED')::int as unclassified_count
from tmp_ecard2_classification_v1;

-- PHASE 6B — promotion lane sub-split
select
  count(*) filter (where promotion_lane = 'PROMOTION_READY')::int as promotion_ready_count,
  count(*) filter (where promotion_lane = 'PROMOTION_NAMESPACE_COLLISION')::int as promotion_namespace_collision_count
from tmp_ecard2_promotion_lane_split_v1;

-- PHASE 6C — namespace collision proof for the split promotion lane
select
  old_parent_id,
  old_name,
  old_printed_token,
  proposed_gv_id,
  colliding_row_id,
  colliding_set_id,
  colliding_set_code,
  colliding_name,
  colliding_number,
  colliding_gv_id,
  colliding_active_identity_count
from tmp_ecard2_namespace_collision_rows_v1
order by old_printed_token, old_name;

-- PHASE 6D — exact next lawful execution unit
select
  'ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V1'::text as next_lawful_execution_unit,
  (
    select count(*)::int
    from tmp_ecard2_promotion_lane_split_v1
    where promotion_lane = 'PROMOTION_READY'
  ) as next_unit_row_count,
  false as promotions_can_run_in_one_bounded_artifact,
  '24 promotion rows split into 11 collision-free exact-token promotions and 13 namespace-collision rows; run the 11-row collision-free promotion subset first'::text as recommendation_reason;

rollback;
