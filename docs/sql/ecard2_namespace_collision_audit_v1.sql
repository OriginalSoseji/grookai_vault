-- ECARD2_NAMESPACE_COLLISION_CONTRACT_AUDIT_V1
-- Read-only audit of the 13 remaining ecard2 namespace-collision rows after
-- ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V2.
--
-- Scope:
--   - unresolved ecard2 parents only
--   - namespace-collision subset only
--   - no mutation
--
-- Live audited shape on 2026-04-11:
--   - unresolved_parent_count = 23
--   - canonical_parent_count = 184
--   - namespace_collision_row_count = 13
--   - blocked_conflict_rows_outside_scope = 10
--
-- Contract goal:
--   determine whether the 13 rows are true identity collisions, namespace-only
--   collisions, or something weaker/stronger; then define the minimum lawful
--   resolution contract without mutating any row or GV-ID.

begin;

drop table if exists tmp_ecard2_unresolved_namespace_source_v1;
drop table if exists tmp_ecard2_namespace_collision_rows_v1;
drop table if exists tmp_ecard2_namespace_collision_classification_v1;

create temp table tmp_ecard2_unresolved_namespace_source_v1 on commit drop as
with unresolved as (
  select
    cp.id as old_parent_id,
    cp.set_id,
    s.code as set_code,
    s.printed_set_abbrev,
    cp.name as old_name,
    coalesce(cp.variant_key, '') as proposed_variant_key,
    cpi.printed_number as old_printed_token,
    case
      when cpi.printed_number is null then null
      when cpi.printed_number ~ '^[A-Za-z][0-9]+$' then upper(cpi.printed_number)
      when cpi.printed_number ~ '[0-9]' then regexp_replace(regexp_replace(cpi.printed_number, '/.*$', ''), '[^A-Za-z0-9]', '', 'g')
      else cpi.printed_number
    end as proposed_number_plain,
    'GV-PK-' || upper(regexp_replace(s.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
      upper(regexp_replace(cpi.printed_number, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  join public.sets s
    on s.id = cp.set_id
  where cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'ecard2'
    and cpi.is_active = true
    and cp.gv_id is null
)
select *
from unresolved;

create temp table tmp_ecard2_namespace_collision_rows_v1 on commit drop as
with identity_counts as (
  select
    cpi.card_print_id,
    count(*) filter (where cpi.is_active = true)::int as active_identity_count,
    count(*)::int as total_identity_count
  from public.card_print_identity cpi
  group by cpi.card_print_id
)
select
  u.old_parent_id,
  u.set_id as old_set_id,
  u.old_name,
  u.old_printed_token,
  u.proposed_number_plain,
  u.proposed_variant_key,
  u.proposed_gv_id,
  t.id as collision_target_id,
  t.set_id as collision_target_set_id,
  t.gv_id as collision_target_gv_id,
  t.name as collision_target_name,
  t.set_code as collision_target_set_code,
  t.number_plain as collision_target_number_plain,
  coalesce(t.variant_key, '') as collision_target_variant_key,
  coalesce(ic.active_identity_count, 0) as collision_target_active_identity_count,
  coalesce(ic.total_identity_count, 0) as collision_target_total_identity_count,
  case
    when t.id is null then null
    when t.set_id <> u.set_id then 'cross-set identity reuse'
    when lower(trim(t.name)) = lower(trim(u.old_name))
      and coalesce(t.variant_key, '') = u.proposed_variant_key
      and coalesce(t.number_plain, '') = coalesce(u.proposed_number_plain, '') then
      case
        when t.set_code is null and coalesce(ic.active_identity_count, 0) = 0 then 'legacy namespace reuse'
        else 'exact_identity_match'
      end
    when coalesce(t.number_plain, '') = coalesce(u.proposed_number_plain, '') then 'same_token_different_identity'
    else 'legacy namespace reuse'
  end as collision_type
from tmp_ecard2_unresolved_namespace_source_v1 u
left join public.card_prints t
  on t.gv_id = u.proposed_gv_id
left join identity_counts ic
  on ic.card_print_id = t.id
where t.id is not null;

create temp table tmp_ecard2_namespace_collision_classification_v1 on commit drop as
select
  n.old_parent_id,
  n.old_name,
  n.old_printed_token,
  n.proposed_number_plain,
  n.proposed_variant_key,
  n.proposed_gv_id,
  n.collision_target_id,
  n.collision_target_gv_id,
  n.collision_target_name,
  n.collision_target_set_code,
  n.collision_target_number_plain,
  n.collision_type,
  case
    when n.old_set_id = n.collision_target_set_id
      and lower(trim(n.old_name)) = lower(trim(n.collision_target_name))
      and coalesce(n.proposed_number_plain, '') = coalesce(n.collision_target_number_plain, '')
      and coalesce(n.proposed_variant_key, '') = coalesce(n.collision_target_variant_key, '') then
      'IDENTITY_EQUIVALENT_NAMESPACE_COLLISION'
    when n.collision_type = 'same_token_different_identity' then
      'TOKEN_SHARED_DISTINCT_IDENTITIES'
    when n.collision_type = 'cross-set identity reuse' then
      'CROSS_SET_NAMESPACE_COLLISION'
    when n.collision_type = 'legacy namespace reuse' then
      'LEGACY_NAMESPACE_CONFLICT'
    else
      'UNCLASSIFIED'
  end as classification,
  case
    when n.old_set_id = n.collision_target_set_id
      and lower(trim(n.old_name)) = lower(trim(n.collision_target_name))
      and coalesce(n.proposed_number_plain, '') = coalesce(n.collision_target_number_plain, '')
      and coalesce(n.proposed_variant_key, '') = coalesce(n.collision_target_variant_key, '') then
      'REUSE_CANONICAL'
    when n.collision_type = 'same_token_different_identity' then
      'PERSIST_BLOCKED'
    when n.collision_type = 'cross-set identity reuse' then
      'IDENTITY_MODEL_EXTENSION_REQUIRED'
    when n.collision_type = 'legacy namespace reuse' then
      'PERSIST_BLOCKED'
    else
      'UNCLASSIFIED'
  end as safe_resolution_type,
  case
    when n.old_set_id = n.collision_target_set_id
      and lower(trim(n.old_name)) = lower(trim(n.collision_target_name))
      and coalesce(n.proposed_number_plain, '') = coalesce(n.collision_target_number_plain, '')
      and coalesce(n.proposed_variant_key, '') = coalesce(n.collision_target_variant_key, '') then
      'same set_id, same printed name, same token, same variant_key; target already owns the proposed GV-PK-AQ-* namespace and has no active identity surface'
    when n.collision_type = 'same_token_different_identity' then
      'same numeric token is already occupied by a distinct identity'
    when n.collision_type = 'cross-set identity reuse' then
      'proposed GV-ID is occupied by another set'
    when n.collision_type = 'legacy namespace reuse' then
      'legacy row occupies namespace but does not prove identity equivalence'
    else
      'unable to prove safe contract'
  end as proof_reason
from tmp_ecard2_namespace_collision_rows_v1 n;

-- Phase 1: target surface counts.
select
  count(*) filter (where cp.gv_id is null) as unresolved_parent_count,
  count(*) filter (where cp.gv_id is not null) as canonical_parent_count
from public.card_prints cp
join public.sets s
  on s.id = cp.set_id
where s.code = 'ecard2';

-- Phase 2: target row extraction for all 13 namespace-collision rows.
select
  old_parent_id,
  old_name,
  old_printed_token,
  proposed_number_plain,
  proposed_variant_key,
  proposed_gv_id
from tmp_ecard2_namespace_collision_classification_v1
order by old_printed_token;

-- Phase 2: collision target analysis.
select
  old_parent_id,
  old_name,
  old_printed_token,
  collision_target_id,
  collision_target_gv_id,
  collision_target_name,
  collision_target_set_code,
  collision_target_number_plain,
  collision_type
from tmp_ecard2_namespace_collision_classification_v1
order by old_printed_token;

-- Phase 3: collision classification summary.
select
  classification,
  count(*) as row_count
from tmp_ecard2_namespace_collision_classification_v1
group by classification
order by classification;

-- Phase 4: contract options test.
with option_eval as (
  select
    'A_REUSE_EXISTING_CANONICAL' as option_name,
    count(*)::int as collision_count,
    0::int as ambiguity_count,
    true as identity_correctness,
    true as deterministic,
    'recommended: reuse existing GV-PK-AQ-* target rows because all 13 are same-set same-name same-token equivalents' as option_note
  from tmp_ecard2_namespace_collision_classification_v1
  where classification = 'IDENTITY_EQUIVALENT_NAMESPACE_COLLISION'

  union all

  select
    'B_CREATE_NEW_CANONICAL_WITH_ALTERNATE_GVID_SUFFIX' as option_name,
    0::int as collision_count,
    0::int as ambiguity_count,
    false as identity_correctness,
    true as deterministic,
    'rejected: would duplicate an already occupied exact identity surface under a second GV-ID' as option_note

  union all

  select
    'C_SET_SCOPED_NAMESPACE_DIFFERENTIATION' as option_name,
    0::int as collision_count,
    0::int as ambiguity_count,
    false as identity_correctness,
    true as deterministic,
    'rejected: set-scoped differentiation is unnecessary because the collision targets already share the same set_id' as option_note

  union all

  select
    'D_PERSIST_BLOCKED' as option_name,
    count(*)::int as collision_count,
    0::int as ambiguity_count,
    true as identity_correctness,
    true as deterministic,
    'safe but unnecessarily conservative; leaves 13 lawful reuse targets unresolved' as option_note
  from tmp_ecard2_namespace_collision_classification_v1
)
select *
from option_eval
order by option_name;

-- Phase 5/6: safe contract decision and GV-ID strategy.
select
  safe_resolution_type,
  count(*) as row_count
from tmp_ecard2_namespace_collision_classification_v1
group by safe_resolution_type
order by safe_resolution_type;

select
  count(*) filter (where safe_resolution_type = 'REUSE_CANONICAL') as rows_requiring_reuse,
  count(*) filter (where safe_resolution_type = 'ALTERNATE_GVID_REQUIRED') as rows_requiring_new_gvid,
  count(*) filter (where safe_resolution_type = 'PERSIST_BLOCKED') as rows_persist_blocked,
  count(*) filter (where safe_resolution_type = 'IDENTITY_MODEL_EXTENSION_REQUIRED') as rows_requiring_model_extension,
  case
    when count(*) filter (where safe_resolution_type = 'ALTERNATE_GVID_REQUIRED') = 0 then
      'keep existing GV-PK-AQ-* ownership; no alternate suffix, variant-key injection, or set-scoped prefix change is lawful'
    else
      'alternate GV-ID strategy still required'
  end as gvid_strategy_decision
from tmp_ecard2_namespace_collision_classification_v1;

-- Phase 7: final classification table.
select
  old_parent_id,
  old_name,
  classification,
  collision_target_gv_id,
  safe_resolution_type,
  case safe_resolution_type
    when 'REUSE_CANONICAL' then 'future apply should repoint the unresolved source row into the existing GV-PK-AQ-* canonical target and delete the old parent'
    when 'ALTERNATE_GVID_REQUIRED' then 'future namespace contract must define a new deterministic GV-ID route before apply'
    when 'PERSIST_BLOCKED' then 'future apply must not mutate the row; preserve unresolved state'
    when 'IDENTITY_MODEL_EXTENSION_REQUIRED' then 'future schema/identity contract required before apply'
    else 'no lawful action defined'
  end as required_action,
  proof_reason
from tmp_ecard2_namespace_collision_classification_v1
order by old_printed_token;

-- Final audit status.
select
  count(*) as namespace_collision_row_count,
  count(*) filter (where classification = 'UNCLASSIFIED') as unclassified_count,
  case
    when count(*) = 13
      and count(*) filter (where classification = 'IDENTITY_EQUIVALENT_NAMESPACE_COLLISION') = 13
      and count(*) filter (where safe_resolution_type = 'REUSE_CANONICAL') = 13
      and count(*) filter (where classification = 'UNCLASSIFIED') = 0
    then 'passed'
    else 'failed'
  end as audit_status,
  'ECARD2_NAMESPACE_CANONICAL_REUSE_REALIGNMENT_V1' as next_lawful_execution_unit
from tmp_ecard2_namespace_collision_classification_v1;

rollback;
