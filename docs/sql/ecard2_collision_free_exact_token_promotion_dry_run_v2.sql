-- ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V2
-- Read-only dry-run proof for the 11-row collision-free promotion surface in ecard2.
--
-- Scope:
--   - apply surface = PROMOTION_READY_COLLISION_FREE only
--   - excluded rows = 13 PROMOTION_NAMESPACE_COLLISION + 10 BLOCKED_CONFLICT
--   - no mutation

begin;

drop table if exists tmp_ecard2_unresolved_v2;
drop table if exists tmp_ecard2_canonical_in_set_v2;
drop table if exists tmp_ecard2_row_metrics_v2;
drop table if exists tmp_ecard2_base_classification_v2;
drop table if exists tmp_ecard2_promotion_scope_v2;
drop table if exists tmp_ecard2_identity_key_collisions_v2;
drop table if exists tmp_ecard2_gvid_collisions_v2;
drop table if exists tmp_ecard2_promotion_collision_audit_v2;
drop table if exists tmp_ecard2_final_classification_v2;
drop table if exists tmp_ecard2_ready_scope_v2;
drop table if exists tmp_ecard2_duplicate_ready_keys_v2;

create temp table tmp_ecard2_unresolved_v2 on commit drop as
select
  cp.id as old_parent_id,
  cp.set_id,
  s.code as set_code,
  s.printed_set_abbrev,
  cp.name as old_name,
  coalesce(cp.variant_key, '') as variant_key,
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
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as proposed_number_plain
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'ecard2'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_ecard2_canonical_in_set_v2 on commit drop as
select
  cp.id as candidate_target_id,
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

create temp table tmp_ecard2_row_metrics_v2 on commit drop as
select
  u.old_parent_id,
  count(distinct c.candidate_target_id) filter (
    where c.candidate_target_number = u.old_printed_token
      and c.exact_name_key = u.exact_name_key
  )::int as exact_match_count,
  count(distinct c.candidate_target_id) filter (
    where c.candidate_target_number_plain = u.proposed_number_plain
      and c.normalized_name = u.normalized_name
  )::int as base_match_count,
  count(distinct c.candidate_target_id) filter (
    where c.candidate_target_number_plain = u.proposed_number_plain
      and c.normalized_name <> u.normalized_name
  )::int as same_base_different_name_count
from tmp_ecard2_unresolved_v2 u
left join tmp_ecard2_canonical_in_set_v2 c
  on c.candidate_target_number = u.old_printed_token
  or c.candidate_target_number_plain = u.proposed_number_plain
group by u.old_parent_id;

create temp table tmp_ecard2_base_classification_v2 on commit drop as
select
  u.*,
  case
    when rm.exact_match_count > 0 then 'UNCLASSIFIED'
    when rm.base_match_count > 0 then 'UNCLASSIFIED'
    when rm.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'PROMOTION_REQUIRED'
  end as base_execution_class
from tmp_ecard2_unresolved_v2 u
join tmp_ecard2_row_metrics_v2 rm
  on rm.old_parent_id = u.old_parent_id;

create temp table tmp_ecard2_promotion_scope_v2 on commit drop as
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  b.set_id,
  b.set_code,
  b.proposed_number_plain,
  b.variant_key as proposed_variant_key,
  'GV-PK-' || upper(regexp_replace(b.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
    upper(regexp_replace(b.old_printed_token, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
from tmp_ecard2_base_classification_v2 b
where b.base_execution_class = 'PROMOTION_REQUIRED';

create temp table tmp_ecard2_identity_key_collisions_v2 on commit drop as
select
  p.old_parent_id,
  cp.id as collision_target_id
from tmp_ecard2_promotion_scope_v2 p
join public.card_prints cp
  on cp.set_id = p.set_id
 and cp.number_plain = p.proposed_number_plain
 and coalesce(cp.variant_key, '') = coalesce(p.proposed_variant_key, '')
 and cp.id <> p.old_parent_id;

create temp table tmp_ecard2_gvid_collisions_v2 on commit drop as
select
  p.old_parent_id,
  cp.id as collision_target_id
from tmp_ecard2_promotion_scope_v2 p
join public.card_prints cp
  on cp.gv_id = p.proposed_gv_id
 and cp.id <> p.old_parent_id;

create temp table tmp_ecard2_promotion_collision_audit_v2 on commit drop as
select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.proposed_number_plain,
  p.proposed_variant_key,
  p.proposed_gv_id,
  case when ik.collision_target_id is null then 'no' else 'yes' end as identity_key_collision,
  case when gv.collision_target_id is null then 'no' else 'yes' end as gvid_collision
from tmp_ecard2_promotion_scope_v2 p
left join tmp_ecard2_identity_key_collisions_v2 ik
  on ik.old_parent_id = p.old_parent_id
left join tmp_ecard2_gvid_collisions_v2 gv
  on gv.old_parent_id = p.old_parent_id;

create temp table tmp_ecard2_final_classification_v2 on commit drop as
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  null::text as proposed_gv_id,
  'BLOCKED_CONFLICT'::text as execution_class
from tmp_ecard2_base_classification_v2 b
where b.base_execution_class = 'BLOCKED_CONFLICT'

union all

select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.proposed_gv_id,
  case
    when a.identity_key_collision = 'no' and a.gvid_collision = 'no' then 'PROMOTION_READY_COLLISION_FREE'
    when a.identity_key_collision = 'yes' or a.gvid_collision = 'yes' then 'PROMOTION_NAMESPACE_COLLISION'
    else 'UNCLASSIFIED'
  end as execution_class
from tmp_ecard2_promotion_scope_v2 p
join tmp_ecard2_promotion_collision_audit_v2 a
  on a.old_parent_id = p.old_parent_id;

create temp table tmp_ecard2_ready_scope_v2 on commit drop as
select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.proposed_number_plain,
  p.proposed_variant_key,
  p.proposed_gv_id,
  'READY'::text as validation_status
from tmp_ecard2_promotion_scope_v2 p
join tmp_ecard2_promotion_collision_audit_v2 a
  on a.old_parent_id = p.old_parent_id
where a.identity_key_collision = 'no'
  and a.gvid_collision = 'no';

create temp table tmp_ecard2_duplicate_ready_keys_v2 on commit drop as
select
  set_id,
  proposed_number_plain,
  proposed_variant_key,
  count(*)::int as row_count
from tmp_ecard2_ready_scope_v2 r
join tmp_ecard2_promotion_scope_v2 p
  on p.old_parent_id = r.old_parent_id
group by set_id, proposed_number_plain, proposed_variant_key
having count(*) > 1;

select
  (select count(*)::int from tmp_ecard2_ready_scope_v2) as promotion_source_count,
  (select count(*)::int from tmp_ecard2_identity_key_collisions_v2 ik join tmp_ecard2_ready_scope_v2 r on r.old_parent_id = ik.old_parent_id) as identity_key_collisions,
  (select count(*)::int from tmp_ecard2_gvid_collisions_v2 gv join tmp_ecard2_ready_scope_v2 r on r.old_parent_id = gv.old_parent_id) as gvid_collisions,
  (select count(*)::int from tmp_ecard2_duplicate_ready_keys_v2) as duplicate_proposed_keys,
  (
    select count(*)::int
    from tmp_ecard2_ready_scope_v2 r
    join tmp_ecard2_final_classification_v2 f
      on f.old_parent_id = r.old_parent_id
    where f.execution_class <> 'PROMOTION_READY_COLLISION_FREE'
  ) as overlap_with_excluded_rows,
  (
    select count(*)::int
    from tmp_ecard2_final_classification_v2
    where execution_class = 'PROMOTION_NAMESPACE_COLLISION'
  ) as excluded_namespace_collision_count,
  (
    select count(*)::int
    from tmp_ecard2_final_classification_v2
    where execution_class = 'BLOCKED_CONFLICT'
  ) as excluded_blocked_conflict_count;

select
  old_parent_id as old_id,
  old_name,
  old_printed_token as old_token,
  proposed_number_plain,
  proposed_variant_key,
  proposed_gv_id,
  validation_status
from tmp_ecard2_ready_scope_v2
order by old_printed_token, old_name;

rollback;
