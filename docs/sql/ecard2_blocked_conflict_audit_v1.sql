-- ECARD2_BLOCKED_CONFLICT_AUDIT_V1
-- Read-only decomposition audit of the 10 remaining unresolved ecard2 rows.
--
-- Goal:
--   determine whether the residual holo-token rows are truly blocked conflicts
--   under current live schema, or whether they collapse into a narrower lawful
--   next execution surface.
--
-- Important live correction:
--   The earlier blocked label came from numeric-base heuristics (`H23 -> 23`).
--   This audit re-evaluates the rows against exact printed token ownership and
--   live GV-ID availability.

begin;

drop table if exists tmp_ecard2_blocked_rows_v1;
drop table if exists tmp_ecard2_blocked_surface_v1;
drop table if exists tmp_ecard2_blocked_candidate_targets_v1;
drop table if exists tmp_ecard2_blocked_row_metrics_v1;
drop table if exists tmp_ecard2_blocked_classification_v1;

create temp table tmp_ecard2_blocked_rows_v1 on commit drop as
select *
from (
  values
    ('8272e758-ac91-41c3-87ad-9b3622155bf1'::uuid, 'Exeggutor', 'H10'),
    ('c7fdcf93-bf83-41fa-a6e2-edd63bc391f0'::uuid, 'Kingdra', 'H14'),
    ('62661fa2-40b4-48bf-96c1-8d225581a3d2'::uuid, 'Scizor', 'H21'),
    ('eb8d04d0-07ae-4805-8861-b1a1a286f52a'::uuid, 'Slowking', 'H22'),
    ('10c9d12e-77c9-4334-9fde-1542a79b1f5a'::uuid, 'Steelix', 'H23'),
    ('7215c907-c6ae-4951-b552-a7a543bae195'::uuid, 'Sudowoodo', 'H24'),
    ('6a14016b-edef-4f74-b360-20187e09e2bb'::uuid, 'Tentacruel', 'H26'),
    ('aef2e04c-4713-4801-b815-5fa354d68659'::uuid, 'Togetic', 'H27'),
    ('4fcf41bc-8e06-44fe-ad64-da6664f4d859'::uuid, 'Umbreon', 'H29'),
    ('1081cdf5-5334-432f-85d9-4d0c769836f8'::uuid, 'Vileplume', 'H31')
) as blocked_rows(id, expected_name, expected_printed_token);

create temp table tmp_ecard2_blocked_surface_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name,
  case
    when cpi.printed_number ~ '^[A-Za-z][0-9]+$' then upper(cpi.printed_number)
    when cpi.printed_number ~ '[0-9]' then regexp_replace(regexp_replace(cpi.printed_number, '/.*$', ''), '[^A-Za-z0-9]', '', 'g')
    else cpi.printed_number
  end as number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  lower(trim(coalesce(cpi.normalized_printed_name, cp.name))) as normalized_name,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token,
  cpi.printed_number as old_printed_token,
  'GV-PK-' || upper(regexp_replace(s.printed_set_abbrev, '[^A-Za-z0-9]+', '', 'g')) || '-' ||
    upper(regexp_replace(cpi.printed_number, '[^A-Za-z0-9]+', '', 'g')) as proposed_gv_id,
  cp.set_id
from tmp_ecard2_blocked_rows_v1 b
join public.card_prints cp
  on cp.id = b.id
join public.card_print_identity cpi
  on cpi.card_print_id = cp.id
 and cpi.is_active = true
 and cpi.set_code_identity = 'ecard2'
join public.sets s
  on s.id = cp.set_id;

create temp table tmp_ecard2_blocked_candidate_targets_v1 on commit drop as
with exact_candidates as (
  select
    s.old_parent_id,
    cp.id as candidate_id,
    cp.gv_id as candidate_gv_id,
    cp.name as candidate_name,
    cp.number as candidate_number,
    cp.number_plain as candidate_number_plain,
    coalesce(cp.variant_key, '') as candidate_variant_key,
    cp.set_code as candidate_set_code,
    'exact'::text as match_type,
    'same set, same exact printed token, same printed name'::text as candidate_reason
  from tmp_ecard2_blocked_surface_v1 s
  join public.card_prints cp
    on cp.set_id = s.set_id
   and cp.gv_id is not null
   and cp.number = s.old_printed_token
   and lower(trim(cp.name)) = lower(trim(s.name))
),
normalized_candidates as (
  select
    s.old_parent_id,
    cp.id as candidate_id,
    cp.gv_id as candidate_gv_id,
    cp.name as candidate_name,
    cp.number as candidate_number,
    cp.number_plain as candidate_number_plain,
    coalesce(cp.variant_key, '') as candidate_variant_key,
    cp.set_code as candidate_set_code,
    'normalized'::text as match_type,
    'same set, same derived exact-token number_plain, same printed name'::text as candidate_reason
  from tmp_ecard2_blocked_surface_v1 s
  join public.card_prints cp
    on cp.set_id = s.set_id
   and cp.gv_id is not null
   and cp.number_plain = s.number_plain
   and lower(trim(cp.name)) = lower(trim(s.name))
),
suffix_candidates as (
  select
    s.old_parent_id,
    cp.id as candidate_id,
    cp.gv_id as candidate_gv_id,
    cp.name as candidate_name,
    cp.number as candidate_number,
    cp.number_plain as candidate_number_plain,
    coalesce(cp.variant_key, '') as candidate_variant_key,
    cp.set_code as candidate_set_code,
    'suffix'::text as match_type,
    'same set, same numeric base token, same printed name'::text as candidate_reason
  from tmp_ecard2_blocked_surface_v1 s
  join public.card_prints cp
    on cp.set_id = s.set_id
   and cp.gv_id is not null
   and cp.number_plain = s.normalized_token
   and lower(trim(cp.name)) = lower(trim(s.name))
),
partial_candidates as (
  select
    s.old_parent_id,
    cp.id as candidate_id,
    cp.gv_id as candidate_gv_id,
    cp.name as candidate_name,
    cp.number as candidate_number,
    cp.number_plain as candidate_number_plain,
    coalesce(cp.variant_key, '') as candidate_variant_key,
    cp.set_code as candidate_set_code,
    'partial'::text as match_type,
    case
      when cp.set_id = s.set_id then 'same set numeric-base token already owned by a different printed identity'
      else 'cross-set same-name numeric-base coincidence only; not lawful alias proof'
    end as candidate_reason
  from tmp_ecard2_blocked_surface_v1 s
  join public.card_prints cp
    on cp.gv_id is not null
   and cp.number_plain = s.normalized_token
   and (
     cp.set_id = s.set_id
     or lower(trim(cp.name)) = lower(trim(s.name))
   )
   and not (
     cp.set_id = s.set_id
     and cp.number = s.old_printed_token
     and lower(trim(cp.name)) = lower(trim(s.name))
   )
   and not (
     cp.set_id = s.set_id
     and cp.number_plain = s.number_plain
     and lower(trim(cp.name)) = lower(trim(s.name))
   )
)
select *
from exact_candidates
union all
select *
from normalized_candidates
union all
select *
from suffix_candidates
union all
select *
from partial_candidates;

create temp table tmp_ecard2_blocked_row_metrics_v1 on commit drop as
select
  s.old_parent_id,
  count(*) filter (where c.match_type = 'exact')::int as exact_count,
  count(*) filter (where c.match_type = 'normalized')::int as normalized_count,
  count(*) filter (where c.match_type = 'suffix')::int as suffix_count,
  count(*) filter (where c.match_type = 'partial' and c.candidate_set_code = 'ecard2')::int as partial_in_set_count,
  count(*) filter (where c.match_type = 'partial' and c.candidate_set_code <> 'ecard2')::int as partial_cross_set_count,
  (
    select count(*)::int
    from public.card_prints cp
    where cp.gv_id = s.proposed_gv_id
  ) as gvid_collision_count
from tmp_ecard2_blocked_surface_v1 s
left join tmp_ecard2_blocked_candidate_targets_v1 c
  on c.old_parent_id = s.old_parent_id
group by s.old_parent_id, s.proposed_gv_id;

create temp table tmp_ecard2_blocked_classification_v1 on commit drop as
select
  s.old_parent_id,
  s.name,
  s.number_plain,
  s.variant_key,
  s.normalized_name,
  s.normalized_token,
  s.old_printed_token,
  s.proposed_gv_id,
  m.exact_count,
  m.normalized_count,
  m.suffix_count,
  m.partial_in_set_count,
  m.partial_cross_set_count,
  m.gvid_collision_count,
  case
    when m.exact_count + m.normalized_count + m.suffix_count > 1 then 'MULTI_CANONICAL_TARGET_CONFLICT'
    when m.exact_count + m.normalized_count + m.suffix_count = 0
      and m.gvid_collision_count = 0 then 'PROMOTION_REQUIRED'
    when m.exact_count + m.normalized_count + m.suffix_count = 0
      and m.gvid_collision_count > 0 then 'OTHER'
    when m.partial_in_set_count > 0
      and m.exact_count + m.normalized_count + m.suffix_count = 0
      and m.gvid_collision_count = 0 then 'PROMOTION_REQUIRED'
    else 'OTHER'
  end as classification,
  case
    when m.exact_count + m.normalized_count + m.suffix_count = 0
      and m.partial_in_set_count > 0
      and m.partial_cross_set_count = 0
      and m.gvid_collision_count = 0 then
      'H-prefix exact-token promotion surface with only in-set numeric-base partial collisions'
    when m.exact_count + m.normalized_count + m.suffix_count = 0
      and m.partial_in_set_count > 0
      and m.partial_cross_set_count > 0
      and m.gvid_collision_count = 0 then
      'H-prefix exact-token promotion surface with in-set numeric-base partial collisions plus cross-set same-name coincidences'
    when m.exact_count + m.normalized_count + m.suffix_count > 1 then
      'multiple lawful same-set canonical targets exist'
    else
      'non-standard blocked pattern'
  end as grouped_root_cause,
  case
    when m.exact_count + m.normalized_count + m.suffix_count = 0
      and m.gvid_collision_count = 0 then
      'no same-set exact/normalized/same-name suffix target exists; proposed GV-ID is unoccupied; numeric-base partial matches do not own the H-prefixed token'
    when m.exact_count + m.normalized_count + m.suffix_count > 1 then
      'multiple lawful same-set candidates exist on the exact printed surface'
    else
      'requires follow-up audit'
  end as proof_reason
from tmp_ecard2_blocked_surface_v1 s
join tmp_ecard2_blocked_row_metrics_v1 m
  on m.old_parent_id = s.old_parent_id;

-- Phase 1: target row extraction.
select
  old_parent_id,
  name,
  number_plain,
  variant_key,
  normalized_name,
  normalized_token
from tmp_ecard2_blocked_classification_v1
order by old_printed_token;

-- Phase 2: candidate target analysis.
select
  c.old_parent_id,
  b.name as old_name,
  b.old_printed_token,
  c.candidate_id,
  c.candidate_gv_id,
  c.candidate_name,
  c.candidate_number,
  c.candidate_number_plain,
  c.candidate_set_code,
  c.match_type,
  c.candidate_reason
from tmp_ecard2_blocked_candidate_targets_v1 c
join tmp_ecard2_blocked_classification_v1 b
  on b.old_parent_id = c.old_parent_id
order by b.old_printed_token, c.match_type, c.candidate_set_code nulls first, c.candidate_number, c.candidate_id;

-- Phase 3: final classification.
select
  old_parent_id,
  name,
  old_printed_token,
  classification,
  grouped_root_cause,
  proof_reason
from tmp_ecard2_blocked_classification_v1
order by old_printed_token;

-- Phase 4: grouping summary.
select
  classification,
  count(*) as row_count
from tmp_ecard2_blocked_classification_v1
group by classification
order by classification;

select
  grouped_root_cause,
  count(*) as row_count
from tmp_ecard2_blocked_classification_v1
group by grouped_root_cause
order by grouped_root_cause;

-- Phase 5: next execution recommendation.
select
  count(*) as blocked_row_count,
  count(*) filter (where classification = 'PROMOTION_REQUIRED') as promotion_required_count,
  count(*) filter (where classification = 'MULTI_CANONICAL_TARGET_CONFLICT') as multi_target_conflict_count,
  count(*) filter (where classification = 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES') as token_collision_count,
  count(*) filter (where classification = 'SUFFIX_OWNERSHIP_CONFLICT') as suffix_conflict_count,
  count(*) filter (where classification = 'IDENTITY_MODEL_GAP') as identity_model_gap_count,
  count(*) filter (where classification = 'OTHER') as other_count,
  case
    when count(*) = 10
      and count(*) filter (where classification = 'PROMOTION_REQUIRED') = 10 then
      'ECARD2_HOLO_PREFIX_EXACT_TOKEN_PROMOTION_V1'
    else
      'ECARD2_BLOCKED_CONFLICT_CONTRACT_AUDIT_V2'
  end as next_lawful_execution_unit,
  case
    when count(*) filter (where classification = 'PROMOTION_REQUIRED') = 10 then
      'single unified promotion codex'
    else
      'multiple follow-up codexes required'
  end as execution_split_decision,
  case
    when count(*) filter (where classification = 'OTHER') = 0 then 'passed'
    else 'failed'
  end as audit_status
from tmp_ecard2_blocked_classification_v1;

rollback;
