-- ECARD2_PROMOTION_NAMESPACE_COLLISION_AUDIT_V1
-- Read-only re-audit of the unresolved ecard2 promotion surface after the failed
-- 24-row collision-free promotion attempt.
--
-- Scope:
--   - set_code_identity = 'ecard2'
--   - unresolved parents = active public.card_print_identity rows whose parent
--     public.card_prints.gv_id is null
--   - current canonical rows = public.card_prints where gv_id is not null
--
-- Live audited findings on 2026-04-11:
--   - unresolved_parent_count = 34
--   - canonical_parent_count = 160
--   - PROMOTION_READY_COLLISION_FREE = 11
--   - PROMOTION_NAMESPACE_COLLISION = 13
--   - BLOCKED_CONFLICT = 10
--   - UNCLASSIFIED = 0
--
-- Critical correction:
--   The requested 24-row collision-free promotion surface does not exist live.
--   The 24 promotion-required rows split into:
--     - 11 rows with no identity-key or GV-ID collision
--     - 13 rows colliding with legacy null-set_code AQ namespace rows

begin;

drop table if exists tmp_ecard2_unresolved_v1;
drop table if exists tmp_ecard2_canonical_in_set_v1;
drop table if exists tmp_ecard2_row_metrics_v1;
drop table if exists tmp_ecard2_base_classification_v1;
drop table if exists tmp_ecard2_promotion_scope_v1;
drop table if exists tmp_ecard2_identity_key_collision_rows_v1;
drop table if exists tmp_ecard2_gvid_collision_rows_v1;
drop table if exists tmp_ecard2_promotion_collision_audit_v1;
drop table if exists tmp_ecard2_final_classification_v1;

create temp table tmp_ecard2_unresolved_v1 on commit drop as
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
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
join public.sets s
  on s.id = cp.set_id
where cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'ecard2'
  and cpi.is_active = true
  and cp.gv_id is null;

create temp table tmp_ecard2_canonical_in_set_v1 on commit drop as
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

create temp table tmp_ecard2_row_metrics_v1 on commit drop as
select
  u.old_parent_id,
  count(distinct c.candidate_target_id) filter (
    where c.candidate_target_number = u.old_printed_token
      and c.exact_name_key = u.exact_name_key
  )::int as exact_match_count,
  count(distinct c.candidate_target_id) filter (
    where c.candidate_target_number_plain = u.normalized_token
      and c.normalized_name = u.normalized_name
  )::int as base_match_count,
  count(distinct c.candidate_target_id) filter (
    where c.candidate_target_number_plain = u.normalized_token
      and c.normalized_name <> u.normalized_name
  )::int as same_base_different_name_count
from tmp_ecard2_unresolved_v1 u
left join tmp_ecard2_canonical_in_set_v1 c
  on c.candidate_target_number = u.old_printed_token
  or c.candidate_target_number_plain = u.normalized_token
group by u.old_parent_id;

create temp table tmp_ecard2_base_classification_v1 on commit drop as
select
  u.old_parent_id,
  u.set_id,
  u.set_code,
  u.printed_set_abbrev,
  u.old_name,
  u.variant_key,
  u.old_printed_token,
  u.normalized_name,
  u.normalized_token,
  case
    when rm.exact_match_count > 0 then 'BLOCKED_CONFLICT'
    when rm.base_match_count > 0 then 'BLOCKED_CONFLICT'
    when rm.same_base_different_name_count > 0 then 'BLOCKED_CONFLICT'
    else 'PROMOTION_REQUIRED'
  end as base_execution_class,
  case
    when rm.exact_match_count > 0 then
      'same-set exact-token target exists; row is not promotion-eligible'
    when rm.base_match_count > 0 then
      'same-set normalized target exists; row is not promotion-eligible'
    when rm.same_base_different_name_count > 0 then
      'numeric base ' || coalesce(u.normalized_token, '<null>') || ' is already owned by a different in-set canonical identity'
    else
      'no lawful same-set canonical target exists after NAME_NORMALIZE_V3 + TOKEN_NORMALIZE_V1'
  end as base_proof_reason
from tmp_ecard2_unresolved_v1 u
join tmp_ecard2_row_metrics_v1 rm
  on rm.old_parent_id = u.old_parent_id;

create temp table tmp_ecard2_promotion_scope_v1 on commit drop as
select
  c.old_parent_id,
  c.set_id,
  c.set_code,
  c.old_name,
  c.old_printed_token,
  c.normalized_name,
  c.normalized_token as proposed_number_plain,
  c.variant_key as proposed_variant_key,
  'GV-PK-' || upper(regexp_replace(c.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
    upper(regexp_replace(c.old_printed_token, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
from tmp_ecard2_base_classification_v1 c
where c.base_execution_class = 'PROMOTION_REQUIRED';

create temp table tmp_ecard2_identity_key_collision_rows_v1 on commit drop as
select
  p.old_parent_id,
  cp.id as collision_target_id,
  cp.set_code as collision_target_set_code,
  cp.name as collision_target_name,
  cp.number as collision_target_number,
  cp.number_plain as collision_target_number_plain,
  coalesce(cp.variant_key, '') as collision_target_variant_key,
  cp.gv_id as collision_target_gv_id
from tmp_ecard2_promotion_scope_v1 p
join public.card_prints cp
  on cp.set_id = p.set_id
 and cp.number_plain = p.proposed_number_plain
 and coalesce(cp.variant_key, '') = coalesce(p.proposed_variant_key, '')
 and cp.id <> p.old_parent_id;

create temp table tmp_ecard2_gvid_collision_rows_v1 on commit drop as
select
  p.old_parent_id,
  cp.id as collision_target_id,
  cp.set_code as collision_target_set_code,
  cp.name as collision_target_name,
  cp.number as collision_target_number,
  cp.number_plain as collision_target_number_plain,
  coalesce(cp.variant_key, '') as collision_target_variant_key,
  cp.gv_id as collision_target_gv_id
from tmp_ecard2_promotion_scope_v1 p
join public.card_prints cp
  on cp.gv_id = p.proposed_gv_id
 and cp.id <> p.old_parent_id;

create temp table tmp_ecard2_promotion_collision_audit_v1 on commit drop as
with active_identity_counts as (
  select
    cpi.card_print_id,
    count(*) filter (where cpi.is_active)::int as active_identity_count
  from public.card_print_identity cpi
  group by cpi.card_print_id
)
select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.proposed_number_plain,
  p.proposed_variant_key,
  p.proposed_gv_id,
  case when ic.collision_target_id is null then 'no' else 'yes' end as identity_key_collision,
  case when gc.collision_target_id is null then 'no' else 'yes' end as gvid_collision,
  coalesce(gc.collision_target_id, ic.collision_target_id) as collision_target_id,
  coalesce(gc.collision_target_gv_id, ic.collision_target_gv_id) as collision_target_gv_id,
  coalesce(gc.collision_target_name, ic.collision_target_name) as collision_target_name,
  coalesce(gc.collision_target_set_code, ic.collision_target_set_code) as collision_target_set_code,
  coalesce(ai.active_identity_count, 0) as collision_target_active_identity_count,
  case
    when ic.collision_target_id is not null
      and gc.collision_target_id is not null
      and ic.collision_target_id = gc.collision_target_id
      and coalesce(gc.collision_target_set_code, '') = ''
      and coalesce(ai.active_identity_count, 0) = 0 then 'LEGACY_NAMESPACE_ALIAS_COLLISION'
    when ic.collision_target_id is not null
      and gc.collision_target_id is not null then 'IDENTITY_AND_GVID_COLLISION'
    when ic.collision_target_id is null
      and gc.collision_target_id is not null then 'GVID_ONLY_COLLISION'
    when ic.collision_target_id is not null
      and gc.collision_target_id is null then 'OTHER'
    else 'NONE'
  end as collision_type,
  case
    when ic.collision_target_id is not null
      and gc.collision_target_id is not null
      and ic.collision_target_id = gc.collision_target_id
      and coalesce(gc.collision_target_set_code, '') = ''
      and coalesce(ai.active_identity_count, 0) = 0 then
      'same identity key and same proposed GV-ID are already occupied by a legacy null-set_code row with zero active identities'
    when ic.collision_target_id is not null
      and gc.collision_target_id is not null then
      'both canonical identity key and proposed GV-ID are already owned by a live row'
    when ic.collision_target_id is null
      and gc.collision_target_id is not null then
      'proposed GV-ID is already occupied even though the canonical identity key is free'
    when ic.collision_target_id is not null
      and gc.collision_target_id is null then
      'canonical identity key is already occupied even though the proposed GV-ID is free'
    else
      'no identity-key or GV-ID collision'
  end as collision_reason
from tmp_ecard2_promotion_scope_v1 p
left join tmp_ecard2_identity_key_collision_rows_v1 ic
  on ic.old_parent_id = p.old_parent_id
left join tmp_ecard2_gvid_collision_rows_v1 gc
  on gc.old_parent_id = p.old_parent_id
left join active_identity_counts ai
  on ai.card_print_id = coalesce(gc.collision_target_id, ic.collision_target_id);

create temp table tmp_ecard2_final_classification_v1 on commit drop as
select
  b.old_parent_id,
  b.old_name,
  b.old_printed_token,
  null::text as proposed_gv_id,
  'BLOCKED_CONFLICT'::text as execution_class,
  b.base_proof_reason as proof_reason
from tmp_ecard2_base_classification_v1 b
where b.base_execution_class = 'BLOCKED_CONFLICT'

union all

select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.proposed_gv_id,
  case
    when pca.identity_key_collision = 'no' and pca.gvid_collision = 'no' then 'PROMOTION_READY_COLLISION_FREE'
    when pca.collision_type in ('LEGACY_NAMESPACE_ALIAS_COLLISION', 'GVID_ONLY_COLLISION', 'IDENTITY_AND_GVID_COLLISION', 'OTHER') then 'PROMOTION_NAMESPACE_COLLISION'
    else 'UNCLASSIFIED'
  end as execution_class,
  case
    when pca.identity_key_collision = 'no' and pca.gvid_collision = 'no' then
      'exact-token promotion is collision-free under both canonical identity key and GV namespace'
    when pca.collision_type = 'LEGACY_NAMESPACE_ALIAS_COLLISION' then
      'promotion identity is lawful, but exact-token namespace is already occupied by a legacy null-set_code AQ row'
    when pca.collision_type = 'GVID_ONLY_COLLISION' then
      'promotion identity is lawful, but proposed GV-ID collides with a live namespace owner'
    when pca.collision_type = 'IDENTITY_AND_GVID_COLLISION' then
      'promotion identity is lawful, but both canonical identity key and proposed GV-ID collide with a live namespace owner'
    when pca.collision_type = 'OTHER' then
      'promotion identity cannot proceed because the canonical identity key is already occupied'
    else
      'classification gap'
  end as proof_reason
from tmp_ecard2_promotion_collision_audit_v1 pca
join tmp_ecard2_promotion_scope_v1 p
  on p.old_parent_id = pca.old_parent_id;

-- PHASE 1 — target surface counts
select
  (select count(*)::int from tmp_ecard2_unresolved_v1) as unresolved_parent_count,
  (
    select count(*)::int
    from public.card_prints cp
    where cp.set_code = 'ecard2'
      and cp.gv_id is not null
  ) as canonical_parent_count;

-- PHASE 2 — live promotion key + GV-ID proposal audit
select
  p.old_parent_id,
  p.old_name,
  p.old_printed_token,
  p.proposed_number_plain,
  p.proposed_variant_key,
  p.proposed_gv_id,
  pca.identity_key_collision,
  pca.gvid_collision,
  pca.collision_target_id,
  pca.collision_target_gv_id,
  pca.collision_reason
from tmp_ecard2_promotion_scope_v1 p
join tmp_ecard2_promotion_collision_audit_v1 pca
  on pca.old_parent_id = p.old_parent_id
order by p.old_printed_token, p.old_name;

-- PHASE 3 — final classification table
select
  old_parent_id,
  old_name,
  old_printed_token,
  proposed_gv_id,
  execution_class,
  proof_reason
from tmp_ecard2_final_classification_v1
order by execution_class, old_printed_token, old_name;

-- PHASE 4 — collision summary
select
  count(*) filter (where execution_class = 'PROMOTION_READY_COLLISION_FREE')::int as promotion_ready_collision_free_count,
  count(*) filter (where execution_class = 'PROMOTION_NAMESPACE_COLLISION')::int as promotion_namespace_collision_count,
  count(*) filter (where execution_class = 'BLOCKED_CONFLICT')::int as blocked_conflict_count,
  count(*) filter (where execution_class = 'UNCLASSIFIED')::int as unclassified_count
from tmp_ecard2_final_classification_v1;

-- PHASE 5 — namespace collision characterization
select
  pca.old_parent_id,
  pca.old_name,
  pca.old_printed_token,
  pca.collision_type,
  pca.collision_target_gv_id,
  pca.collision_target_name,
  pca.collision_target_set_code
from tmp_ecard2_promotion_collision_audit_v1 pca
where pca.collision_type <> 'NONE'
order by pca.old_printed_token, pca.old_name;

-- PHASE 6 — next execution split
select
  true as collision_free_rows_can_execute_immediately,
  true as namespace_collision_rows_require_separate_contract_audit,
  false as namespace_collision_rows_blocked_beyond_namespace,
  'ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V2'::text as next_lawful_execution_unit,
  '11 rows are collision-free and can promote immediately; 13 rows are legacy namespace alias collisions and require ECARD2_NAMESPACE_COLLISION_CONTRACT_AUDIT_V1'::text as recommendation_reason;

rollback;
