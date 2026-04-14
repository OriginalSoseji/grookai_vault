-- G1_BASE_VARIANT_COLLAPSE_V1
-- Read-only proof for the 13-row g1 base-variant collapse lane.
--
-- Scope:
--   - APPLY: 13 rows classified BASE_VARIANT_COLLAPSE
--   - EXCLUDED: 16 RC-prefix rows classified PROMOTION_REQUIRED
--
-- Invariants:
--   - same-set targets only
--   - no fan-in
--   - no reused targets
--   - no overlap with excluded RC-prefix rows

begin;

drop table if exists tmp_g1_unresolved_v1;
drop table if exists tmp_g1_canonical_in_set_v1;
drop table if exists tmp_g1_candidate_rows_v1;
drop table if exists tmp_g1_metrics_v1;
drop table if exists tmp_g1_classification_v1;
drop table if exists tmp_g1_apply_rows_v1;
drop table if exists tmp_g1_excluded_rows_v1;
drop table if exists tmp_g1_collapse_map_v1;

create temp table tmp_g1_unresolved_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name as old_name,
  coalesce(cpi.printed_number, cp.number) as old_printed_token,
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
  nullif(regexp_replace(coalesce(cpi.printed_number, cp.number, ''), '[^0-9]', '', 'g'), '') as normalized_token,
  nullif(substring(coalesce(cpi.printed_number, cp.number, '') from '^[0-9]+([A-Za-z]+)$'), '') as source_suffix,
  cp.set_id
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'g1'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_g1_canonical_in_set_v1 on commit drop as
select
  cp.id as candidate_target_id,
  cp.name as candidate_target_name,
  cp.gv_id as candidate_target_gv_id,
  cp.number as candidate_target_number,
  cp.number_plain as candidate_target_number_plain,
  coalesce(cp.variant_key, '') as candidate_target_variant_key,
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
join public.sets s
  on s.id = cp.set_id
where s.code = 'g1'
  and cp.gv_id is not null;

create temp table tmp_g1_candidate_rows_v1 on commit drop as
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  c.candidate_target_id,
  c.candidate_target_name,
  c.candidate_target_gv_id,
  c.candidate_target_number,
  c.candidate_target_number_plain,
  c.candidate_target_variant_key,
  case
    when c.candidate_target_number = u.old_printed_token
      and c.normalized_name = u.normalized_name
      then 'exact'
    when c.candidate_target_number_plain = u.normalized_token
      and c.normalized_name = u.normalized_name
      and c.candidate_target_number <> u.old_printed_token
      then 'normalized'
    when c.candidate_target_number = u.old_printed_token
      then 'same_token_different_name'
    when c.candidate_target_number_plain = u.normalized_token
      then 'partial'
    else 'other'
  end as match_type
from tmp_g1_unresolved_v1 u
join tmp_g1_canonical_in_set_v1 c
  on c.candidate_target_number = u.old_printed_token
  or c.candidate_target_number_plain = u.normalized_token;

create temp table tmp_g1_metrics_v1 on commit drop as
select
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  u.source_suffix,
  count(distinct c.candidate_target_id) filter (
    where c.match_type in ('exact', 'normalized')
  )::int as lawful_candidate_count,
  count(distinct c.candidate_target_id) filter (
    where c.match_type = 'exact'
  )::int as exact_candidate_count,
  count(distinct c.candidate_target_id) filter (
    where c.match_type = 'normalized'
  )::int as normalized_candidate_count,
  count(distinct c.candidate_target_id) filter (
    where c.match_type = 'same_token_different_name'
  )::int as same_token_different_name_count
from tmp_g1_unresolved_v1 u
left join tmp_g1_candidate_rows_v1 c
  on c.old_parent_id = u.old_parent_id
group by
  u.old_parent_id,
  u.old_name,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  u.source_suffix;

create temp table tmp_g1_classification_v1 on commit drop as
select
  m.old_parent_id,
  m.old_name,
  m.old_printed_token,
  m.normalized_name,
  m.normalized_token,
  case
    when m.lawful_candidate_count = 1 then 'BASE_VARIANT_COLLAPSE'
    when m.lawful_candidate_count > 1 then 'MULTI_CANONICAL_TARGET_CONFLICT'
    when m.lawful_candidate_count = 0
      and m.old_printed_token ~ '^RC[0-9]+$'
      then 'PROMOTION_REQUIRED'
    when m.lawful_candidate_count = 0
      and m.same_token_different_name_count > 0
      then 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES'
    when m.lawful_candidate_count = 0 then 'IDENTITY_MODEL_GAP'
    else 'UNCLASSIFIED'
  end as execution_class,
  case
    when m.lawful_candidate_count = 1
      and m.exact_candidate_count = 1
      then 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE'
    when m.lawful_candidate_count = 1
      and m.normalized_candidate_count = 1
      and m.source_suffix is not null
      then 'SUFFIX_TO_BASE_SINGLE_TARGET_COLLAPSE'
    when m.old_printed_token ~ '^RC[0-9]+$'
      then 'EXCLUDED_PROMOTION'
    else 'OTHER'
  end as grouped_root_cause
from tmp_g1_metrics_v1 m;

create temp table tmp_g1_apply_rows_v1 on commit drop as
select *
from tmp_g1_classification_v1
where execution_class = 'BASE_VARIANT_COLLAPSE';

create temp table tmp_g1_excluded_rows_v1 on commit drop as
select *
from tmp_g1_classification_v1
where execution_class = 'PROMOTION_REQUIRED';

create temp table tmp_g1_collapse_map_v1 on commit drop as
select
  row_number() over (
    order by
      coalesce(nullif(regexp_replace(a.old_printed_token, '[^0-9]', '', 'g'), ''), '0')::int,
      a.old_printed_token,
      a.old_parent_id
  )::int as seq,
  a.old_parent_id as old_id,
  a.old_name,
  a.old_printed_token,
  a.normalized_name,
  a.normalized_token,
  c.candidate_target_id as new_id,
  c.candidate_target_name as new_name,
  c.candidate_target_number as new_printed_token,
  c.candidate_target_gv_id as new_gv_id,
  a.grouped_root_cause as collapse_reason
from tmp_g1_apply_rows_v1 a
join tmp_g1_candidate_rows_v1 c
  on c.old_parent_id = a.old_parent_id
 and c.match_type in ('exact', 'normalized');

with reused_targets as (
  select new_id
  from tmp_g1_collapse_map_v1
  group by new_id
  having count(*) > 1
),
unmatched_apply as (
  select a.old_parent_id
  from tmp_g1_apply_rows_v1 a
  left join tmp_g1_collapse_map_v1 m
    on m.old_id = a.old_parent_id
  where m.old_id is null
),
ambiguous_apply as (
  select old_parent_id
  from tmp_g1_metrics_v1
  where old_parent_id in (select old_parent_id from tmp_g1_apply_rows_v1)
    and lawful_candidate_count <> 1
)
select
  (select count(*)::int from tmp_g1_unresolved_v1) as total_unresolved_count,
  (select count(*)::int from tmp_g1_apply_rows_v1) as apply_scope_count,
  (select count(*)::int from tmp_g1_excluded_rows_v1) as excluded_promotion_scope_count,
  (select count(*)::int from tmp_g1_collapse_map_v1) as normalized_map_count,
  (
    select count(*)::int
    from tmp_g1_collapse_map_v1
    where collapse_reason = 'SAME_TOKEN_NAME_NORMALIZE_COLLAPSE'
  ) as same_token_name_normalize_count,
  (
    select count(*)::int
    from tmp_g1_collapse_map_v1
    where collapse_reason = 'SUFFIX_TO_BASE_SINGLE_TARGET_COLLAPSE'
  ) as suffix_to_base_single_target_count,
  (select count(*)::int from unmatched_apply) as unmatched_rows_in_apply_scope,
  (select count(*)::int from ambiguous_apply) as ambiguous_rows_in_apply_scope,
  (select count(*)::int from reused_targets) as reused_targets_in_apply_scope,
  (
    select count(*)::int
    from tmp_g1_apply_rows_v1 a
    join tmp_g1_excluded_rows_v1 e
      on e.old_parent_id = a.old_parent_id
  ) as overlap_with_rc_prefix_promotion_rows,
  (
    select count(*)::int
    from (
      select new_id
      from tmp_g1_collapse_map_v1
      group by new_id
      having count(*) > 1
    ) fan_in
  ) as fan_in_group_count;

select
  old_id,
  old_name,
  old_printed_token,
  normalized_name,
  normalized_token,
  new_id,
  new_gv_id,
  collapse_reason
from tmp_g1_collapse_map_v1
order by seq;

select
  old_parent_id as old_id,
  old_name,
  old_printed_token,
  'EXCLUDED_PROMOTION' as row_scope
from tmp_g1_excluded_rows_v1
order by old_printed_token, old_parent_id;

rollback;
