-- CEL25_MIXED_EXECUTION_AUDIT_V1
-- Read-only decomposition audit for unresolved cel25 identity surface.
-- Live schema notes:
--   - unresolved cel25 surface is defined by active card_print_identity rows with set_code_identity = 'cel25'
--   - unresolved parents currently sit on null-gv_id card_prints with null set_code / number fields
--   - canonical cel25 targets are card_prints where set_code = 'cel25' and gv_id is not null
--   - active identity semantics use card_print_identity.is_active
-- Stable normalization contract:
--   NAME_NORMALIZE_V3 = lowercase -> apostrophe normalize -> GX/EX hyphen normalize -> dash normalize -> whitespace collapse -> trim
--   TOKEN_NORMALIZE_V1 = numeric base extraction; suffix routing only when proven lawful by unique base-number + normalized-name target
-- Expected live results on 2026-04-08:
--   unresolved_parent_count = 47
--   unresolved_identity_row_count = 47
--   canonical_parent_count = 47
--   classification_counts = DUPLICATE_COLLAPSE 25 / BASE_VARIANT_COLLAPSE 20 / BLOCKED_CONFLICT 2
--   ALIAS_COLLAPSE = 0 / PROMOTION_REQUIRED = 0 / ACTIVE_IDENTITY_FANIN = 0 / UNCLASSIFIED = 0
--   next_lawful_execution_unit = CEL25_NUMERIC_DUPLICATE_COLLAPSE

begin;

drop table if exists tmp_cel25_unresolved_v1;
drop table if exists tmp_cel25_canonical_in_set_v1;
drop table if exists tmp_cel25_canonical_all_v1;
drop table if exists tmp_cel25_exact_match_rows_v1;
drop table if exists tmp_cel25_same_token_diff_name_rows_v1;
drop table if exists tmp_cel25_base_match_rows_v1;
drop table if exists tmp_cel25_same_base_diff_name_rows_v1;
drop table if exists tmp_cel25_cross_lane_candidate_rows_v1;
drop table if exists tmp_cel25_row_metrics_v1;
drop table if exists tmp_cel25_preclassification_v1;
drop table if exists tmp_cel25_fan_in_groups_v1;
drop table if exists tmp_cel25_classification_v1;

create temp table tmp_cel25_unresolved_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  cp.gv_id as old_gv_id,
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
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'cel25'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_cel25_canonical_in_set_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.set_code as candidate_target_set_code,
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
where cp.set_code = 'cel25'
  and cp.gv_id is not null;

create temp table tmp_cel25_canonical_all_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.set_code as candidate_target_set_code,
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

create temp table tmp_cel25_exact_match_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_set_code,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_cel25_unresolved_v1 u
join tmp_cel25_canonical_in_set_v1 c
  on c.candidate_target_number = u.old_printed_token
 and c.exact_name_key = u.exact_name_key;

create temp table tmp_cel25_same_token_diff_name_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_set_code,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_cel25_unresolved_v1 u
join tmp_cel25_canonical_in_set_v1 c
  on c.candidate_target_number = u.old_printed_token
 and c.exact_name_key <> u.exact_name_key;

create temp table tmp_cel25_base_match_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_set_code,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_cel25_unresolved_v1 u
join tmp_cel25_canonical_in_set_v1 c
  on c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 = u.normalized_name_v3;

create temp table tmp_cel25_same_base_diff_name_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_set_code,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_cel25_unresolved_v1 u
join tmp_cel25_canonical_in_set_v1 c
  on c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 <> u.normalized_name_v3;

create temp table tmp_cel25_cross_lane_candidate_rows_v1 on commit drop as
select
  u.old_parent_id,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_set_code,
  c.candidate_target_number,
  c.candidate_target_gv_id
from tmp_cel25_unresolved_v1 u
join tmp_cel25_canonical_all_v1 c
  on c.candidate_target_set_code <> 'cel25'
 and c.candidate_target_number_plain = u.base_number_plain
 and c.normalized_name_v3 = u.normalized_name_v3;

create temp table tmp_cel25_row_metrics_v1 on commit drop as
select
  u.old_parent_id,
  count(distinct em.candidate_target_id)::int as exact_match_count,
  count(distinct stdn.candidate_target_id)::int as same_token_different_name_count,
  count(distinct bm.candidate_target_id)::int as base_match_count,
  count(distinct sbdn.candidate_target_id)::int as same_base_different_name_count,
  count(distinct cl.candidate_target_id)::int as cross_lane_candidate_count
from tmp_cel25_unresolved_v1 u
left join tmp_cel25_exact_match_rows_v1 em
  on em.old_parent_id = u.old_parent_id
left join tmp_cel25_same_token_diff_name_rows_v1 stdn
  on stdn.old_parent_id = u.old_parent_id
left join tmp_cel25_base_match_rows_v1 bm
  on bm.old_parent_id = u.old_parent_id
left join tmp_cel25_same_base_diff_name_rows_v1 sbdn
  on sbdn.old_parent_id = u.old_parent_id
left join tmp_cel25_cross_lane_candidate_rows_v1 cl
  on cl.old_parent_id = u.old_parent_id
group by u.old_parent_id;

create temp table tmp_cel25_preclassification_v1 on commit drop as
select
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
    when m.exact_match_count = 1 then em.candidate_target_gv_id
    when m.exact_match_count = 0 and m.base_match_count = 1 then bm.candidate_target_gv_id
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count = 1 then cl.candidate_target_gv_id
    else null
  end as candidate_target_gv_id,
  case
    when m.exact_match_count = 1 then em.candidate_target_set_code
    when m.exact_match_count = 0 and m.base_match_count = 1 then bm.candidate_target_set_code
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count = 1 then cl.candidate_target_set_code
    else null
  end as candidate_target_set_code,
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
  end as preliminary_execution_class,
  case
    when m.exact_match_count = 1 then 'exact printed token plus exact normalized name uniquely matches canonical cel25 parent'
    when m.exact_match_count > 1 then 'multiple exact in-set canonical targets'
    when m.exact_match_count = 0 and m.base_match_count = 1 and u.token_suffix is not null
      then 'suffix-marked source routes by base number plus normalized name to unique canonical cel25 parent'
    when m.exact_match_count = 0 and m.base_match_count = 1
      then 'normalized name routes by base number to unique canonical cel25 parent'
    when m.exact_match_count = 0 and m.base_match_count > 1 then 'multiple normalized in-set canonical targets'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count = 1
      then 'no lawful in-set canonical target; unique cross-lane normalized target exists'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count > 1
      then 'cross-lane candidate surface exists but spans multiple canonical targets'
    when m.exact_match_count = 0 and m.base_match_count = 0 and m.cross_lane_candidate_count = 0 and m.same_base_different_name_count = 0
      then 'no lawful in-set or cross-lane canonical target exists'
    when m.same_base_different_name_count > 0
      then 'same base number exists in cel25 but name semantics diverge outside stable normalization contract'
    else 'unclassified'
  end as preliminary_proof_reason
from tmp_cel25_unresolved_v1 u
join tmp_cel25_row_metrics_v1 m
  on m.old_parent_id = u.old_parent_id
left join lateral (
  select *
  from tmp_cel25_exact_match_rows_v1 em
  where em.old_parent_id = u.old_parent_id
  order by em.candidate_target_id
  limit 1
) em on true
left join lateral (
  select *
  from tmp_cel25_base_match_rows_v1 bm
  where bm.old_parent_id = u.old_parent_id
  order by bm.candidate_target_id
  limit 1
) bm on true
left join lateral (
  select *
  from tmp_cel25_cross_lane_candidate_rows_v1 cl
  where cl.old_parent_id = u.old_parent_id
  order by cl.candidate_target_set_code, cl.candidate_target_id
  limit 1
) cl on true;

create temp table tmp_cel25_fan_in_groups_v1 on commit drop as
select
  candidate_target_id as target_card_print_id,
  count(*)::int as incoming_sources,
  array_agg(old_parent_id order by old_parent_id) as source_ids,
  array_agg(old_name order by old_parent_id) as source_names,
  array_agg(old_printed_token order by old_parent_id) as source_tokens
from tmp_cel25_preclassification_v1
where preliminary_execution_class in ('DUPLICATE_COLLAPSE', 'BASE_VARIANT_COLLAPSE', 'ALIAS_COLLAPSE')
  and candidate_target_id is not null
group by candidate_target_id
having count(*) > 1;

create temp table tmp_cel25_classification_v1 on commit drop as
select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.normalized_name,
  case
    when f.target_card_print_id is not null then null
    when p.preliminary_execution_class = 'BLOCKED_CONFLICT' then null
    when p.preliminary_execution_class = 'PROMOTION_REQUIRED' then null
    else p.candidate_target_id
  end as candidate_target_id,
  case
    when f.target_card_print_id is not null then null
    when p.preliminary_execution_class = 'BLOCKED_CONFLICT' then null
    when p.preliminary_execution_class = 'PROMOTION_REQUIRED' then null
    else p.candidate_target_gv_id
  end as candidate_target_gv_id,
  case
    when f.target_card_print_id is not null then null
    when p.preliminary_execution_class = 'BLOCKED_CONFLICT' then null
    when p.preliminary_execution_class = 'PROMOTION_REQUIRED' then null
    else p.candidate_target_set_code
  end as candidate_target_set_code,
  case
    when f.target_card_print_id is not null then 'ACTIVE_IDENTITY_FANIN'
    else p.preliminary_execution_class
  end as execution_class,
  case
    when f.target_card_print_id is not null
      then 'multiple unresolved rows converge onto the same canonical target and require active/inactive identity selection before repoint'
    else p.preliminary_proof_reason
  end as proof_reason
from tmp_cel25_preclassification_v1 p
left join tmp_cel25_fan_in_groups_v1 f
  on f.target_card_print_id = p.candidate_target_id;

-- CHECK 1 — unresolved surface count
select
  (select count(*)::int from tmp_cel25_unresolved_v1) as unresolved_parent_count,
  (select count(*)::int from tmp_cel25_unresolved_v1) as unresolved_identity_row_count,
  (select count(*)::int from tmp_cel25_canonical_in_set_v1) as canonical_parent_count;

-- CHECK 2 — exact token + name matches against canonical cel25 rows
with exact_unique_rows as (
  select old_parent_id
  from tmp_cel25_row_metrics_v1
  where exact_match_count = 1
),
exact_reused_targets as (
  select candidate_target_id
  from tmp_cel25_exact_match_rows_v1
  group by candidate_target_id
  having count(*) > 1
)
select
  (select count(*)::int from exact_unique_rows) as exact_lawful_match_count,
  (
    select count(*)::int
    from tmp_cel25_row_metrics_v1
    where same_token_different_name_count > 0
  ) as same_token_different_name_conflict_count,
  (
    select count(*)::int
    from tmp_cel25_row_metrics_v1
    where exact_match_count = 0
  ) as exact_unmatched_row_count,
  (select count(*)::int from exact_reused_targets) as exact_reused_canonical_target_count;

-- CHECK 3 — normalized-name / suffix-route matches on the exact-unmatched residual subset
with exact_unmatched_rows as (
  select old_parent_id
  from tmp_cel25_row_metrics_v1
  where exact_match_count = 0
),
normalized_unique_rows as (
  select old_parent_id
  from tmp_cel25_row_metrics_v1
  where exact_match_count = 0
    and base_match_count = 1
),
suffix_route_rows as (
  select u.old_parent_id
  from tmp_cel25_unresolved_v1 u
  join tmp_cel25_row_metrics_v1 m
    on m.old_parent_id = u.old_parent_id
  where m.exact_match_count = 0
    and m.base_match_count = 1
    and u.token_suffix is not null
),
normalized_reused_targets as (
  select bm.candidate_target_id
  from tmp_cel25_base_match_rows_v1 bm
  join tmp_cel25_row_metrics_v1 m
    on m.old_parent_id = bm.old_parent_id
  where m.exact_match_count = 0
    and m.base_match_count = 1
  group by bm.candidate_target_id
  having count(*) > 1
),
invalid_groups as (
  select old_parent_id
  from tmp_cel25_row_metrics_v1
  where exact_match_count = 0
    and base_match_count = 0
    and same_base_different_name_count > 0
),
ambiguous_groups as (
  select old_parent_id
  from tmp_cel25_row_metrics_v1
  where exact_match_count = 0
    and (base_match_count > 1 or cross_lane_candidate_count > 1)
)
select
  (select count(*)::int from normalized_unique_rows) as normalized_name_match_count,
  (select count(*)::int from suffix_route_rows) as suffix_route_match_count,
  (select count(*)::int from normalized_reused_targets) as normalized_reused_target_count,
  (select count(*)::int from invalid_groups) as invalid_group_count,
  (select count(*)::int from ambiguous_groups) as ambiguous_group_count;

-- CHECK 4 — fan-in detection
select
  count(*)::int as fan_in_group_count
from tmp_cel25_fan_in_groups_v1;

select
  target_card_print_id,
  incoming_sources,
  source_ids,
  source_names,
  source_tokens
from tmp_cel25_fan_in_groups_v1
order by target_card_print_id;

-- CHECK 5 — promotion surface
select
  count(*)::int as promotion_candidate_count
from tmp_cel25_classification_v1
where execution_class = 'PROMOTION_REQUIRED';

select
  old_parent_id,
  old_name,
  old_printed_token,
  proof_reason
from tmp_cel25_classification_v1
where execution_class = 'PROMOTION_REQUIRED'
order by old_printed_token, old_parent_id;

-- CHECK 6 — alias / cross-lane target detection
select
  count(distinct old_parent_id)::int as raw_cross_lane_candidate_old_row_count,
  count(*)::int as raw_cross_lane_candidate_row_count,
  count(distinct candidate_target_set_code)::int as raw_cross_lane_target_set_count,
  array_agg(distinct candidate_target_set_code order by candidate_target_set_code) as raw_cross_lane_target_set_codes,
  (
    select count(*)::int
    from tmp_cel25_classification_v1
    where execution_class = 'ALIAS_COLLAPSE'
  ) as lawful_alias_collapse_row_count,
  case
    when exists (select 1 from tmp_cel25_classification_v1 where execution_class = 'ALIAS_COLLAPSE')
      then 'SUPPORTED'
    when exists (select 1 from tmp_cel25_cross_lane_candidate_rows_v1)
      then 'BLOCKED_NON_LAWFUL_ECHO_ONLY'
    else 'NOT_PRESENT'
  end as alias_collapse_status
from tmp_cel25_cross_lane_candidate_rows_v1;

-- CHECK 7 — blocked conflict surface
select
  count(*)::int as blocked_conflict_count
from tmp_cel25_classification_v1
where execution_class = 'BLOCKED_CONFLICT';

select
  c.old_parent_id,
  c.old_name,
  c.old_printed_token,
  c.normalized_name,
  c.proof_reason,
  coalesce(
    (
      select json_agg(
        json_build_object(
          'candidate_target_id', s.candidate_target_id,
          'candidate_target_name', s.candidate_target_name,
          'candidate_target_set_code', s.candidate_target_set_code,
          'candidate_target_number', s.candidate_target_number,
          'candidate_target_gv_id', s.candidate_target_gv_id
        )
        order by s.candidate_target_set_code, s.candidate_target_number, s.candidate_target_id
      )
      from tmp_cel25_same_base_diff_name_rows_v1 s
      where s.old_parent_id = c.old_parent_id
    ),
    '[]'::json
  ) as conflicting_same_base_candidates
from tmp_cel25_classification_v1 c
where c.execution_class = 'BLOCKED_CONFLICT'
order by c.old_printed_token, c.old_parent_id;

-- CHECK 8 — final per-row classification table
select
  old_parent_id,
  old_name,
  old_printed_token,
  normalized_name,
  candidate_target_id,
  candidate_target_gv_id,
  candidate_target_set_code,
  execution_class,
  proof_reason
from tmp_cel25_classification_v1
order by
  case
    when regexp_replace(old_printed_token, '[^0-9]', '', 'g') = '' then 999999
    else regexp_replace(old_printed_token, '[^0-9]', '', 'g')::int
  end,
  old_printed_token,
  old_parent_id;

select
  execution_class,
  count(*)::int as row_count
from tmp_cel25_classification_v1
group by execution_class
order by execution_class;

select
  count(*)::int as unclassified_count
from tmp_cel25_classification_v1
where execution_class = 'UNCLASSIFIED';

rollback;
