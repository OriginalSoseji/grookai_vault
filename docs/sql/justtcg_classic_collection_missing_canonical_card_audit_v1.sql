-- JUSTTCG_CLASSIC_COLLECTION_MISSING_CANONICAL_CARD_AUDIT_V1
-- Read-only audit of the remaining Classic Collection stale JustTCG mapping
-- to determine whether the blocker is a missed same-set match, a missing
-- same-set canonical card, or a deeper identity-model limitation.

begin;

create temp view justtcg_classic_collection_missing_card_target_v1 as
with target_row as (
  select
    em.id as external_mapping_id,
    em.external_id,
    ri.id as raw_import_id,
    ri.payload->>'name' as raw_name,
    ri.payload->>'number' as raw_number,
    ri.payload->>'set' as raw_set,
    lower(regexp_replace(trim(coalesce(ri.payload->>'name', '')), '\s+', ' ', 'g')) as normalized_name,
    regexp_replace(
      regexp_replace(coalesce(ri.payload->>'number', ''), '/.*$', ''),
      '^0+',
      ''
    ) as normalized_number,
    em.card_print_id as current_card_print_id,
    mapped_cp.gv_id as current_gv_id,
    mapped_cp.name as current_name,
    mapped_cp.number as current_number,
    mapped_cp.number_plain as current_number_plain,
    coalesce(mapped_cp.variant_key, '') as current_variant_key,
    coalesce(mapped_cp.printed_identity_modifier, '') as current_printed_identity_modifier,
    mapped_set.code as current_set_code,
    case
      when mapped_cp.gv_id is null then 'MAPPED_TO_NON_CANONICAL_PLACEHOLDER'
      else 'MAPPED_TO_CANONICAL'
    end as current_mapping_status
  from public.external_mappings em
  join public.card_prints mapped_cp
    on mapped_cp.id = em.card_print_id
  join public.sets mapped_set
    on mapped_set.id = mapped_cp.set_id
  left join public.raw_imports ri
    on ri.source = 'justtcg'
   and coalesce(ri.payload->>'id', ri.payload->>'_external_id') = em.external_id
  where em.source = 'justtcg'
    and em.active is true
    and em.external_id = 'pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection'
)
select *
from target_row;

create temp view justtcg_classic_collection_same_set_candidates_v1 as
select
  target.external_id,
  cp.id as card_print_id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key,
  coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
  case
    when cp.name = target.raw_name
      and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 'exact'
    when lower(cp.name) = target.normalized_name
      and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 'normalized'
    when regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 'number_only'
    when cp.name ilike '%' || target.raw_name || '%'
      then 'partial'
    else null
  end as match_type
from justtcg_classic_collection_missing_card_target_v1 target
join public.card_prints cp
  on true
join public.sets s
  on s.id = cp.set_id
where s.code = 'cel25c'
  and (
    cp.name = target.raw_name
    or lower(cp.name) = target.normalized_name
    or regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
    or cp.name ilike '%' || target.raw_name || '%'
  )
order by
  case
    when cp.name = target.raw_name
      and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 0
    when lower(cp.name) = target.normalized_name
      and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 1
    when regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 2
    else 3
  end,
  cp.name,
  cp.number,
  cp.id;

create temp view justtcg_classic_collection_base_false_match_v1 as
select
  target.external_id,
  cp.id as candidate_card_print_id,
  cp.gv_id as candidate_gv_id,
  cp.name as candidate_name,
  cp.number as candidate_number,
  cp.number_plain as candidate_number_plain,
  coalesce(cp.variant_key, '') as candidate_variant_key,
  coalesce(cp.printed_identity_modifier, '') as candidate_printed_identity_modifier,
  s.code as candidate_set_code,
  'Base-set row shares the same visible card name and original collector number 15, so naive cross-set name + token logic surfaces it as a tempting target.'::text as why_naive_match_looks_valid,
  'Classic Collection identity is same-set-specific. `cel25c` reprints must not reuse original Team Rocket canon because that would erase the Classic Collection printed identity and violate the same-set remap rule.'::text as why_not_lawful
from justtcg_classic_collection_missing_card_target_v1 target
join public.card_prints cp
  on cp.gv_id is not null
join public.sets s
  on s.id = cp.set_id
where s.code = 'base5'
  and cp.name = target.raw_name
  and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
order by cp.number, cp.id
limit 1;

create temp view justtcg_classic_collection_missing_card_decision_v1 as
select
  target.external_id,
  target.raw_name,
  target.raw_number,
  target.raw_set,
  target.normalized_name,
  target.normalized_number,
  target.current_mapping_status,
  count(*) filter (where cand.gv_id is not null and cand.match_type in ('exact', 'normalized'))::int as same_set_canonical_target_count,
  count(*) filter (where cand.gv_id is null and cand.match_type in ('exact', 'normalized'))::int as same_set_noncanonical_placeholder_count,
  count(*) filter (where cand.gv_id is not null and cand.match_type = 'number_only')::int as same_set_number_only_canonical_count,
  case
    when count(*) filter (where cand.gv_id is not null and cand.match_type in ('exact', 'normalized')) > 0
      then 'MISSED_SAME_SET_CANONICAL_MATCH'
    when count(*) filter (where cand.gv_id is null and cand.match_type in ('exact', 'normalized')) > 0
      then 'MISSING_SAME_SET_CANONICAL_CARD'
    when count(*) filter (where cand.gv_id is not null and cand.match_type = 'number_only') > 0
      then 'MISSING_SAME_SET_CANONICAL_CARD'
    else 'OTHER'
  end as final_classification,
  case
    when count(*) filter (where cand.gv_id is not null and cand.match_type in ('exact', 'normalized')) > 0
      then 'yes'
    else 'no'
  end as same_set_canonical_target_exists,
  case
    when count(*) filter (where cand.gv_id is null and cand.match_type in ('exact', 'normalized')) > 0
      then 'yes'
    when count(*) filter (where cand.gv_id is not null and cand.match_type in ('exact', 'normalized')) > 0
      then 'n/a'
    else 'no'
  end as safe_future_canonical_candidate,
  case
    when count(*) filter (where cand.gv_id is not null and cand.match_type in ('exact', 'normalized')) > 0
      then 0
    when count(*) filter (where cand.gv_id is null and cand.match_type in ('exact', 'normalized')) > 0
      then 0
    else 1
  end as collision_count_if_promoted,
  0::int as ambiguity_count_if_promoted,
  case
    when count(*) filter (where cand.gv_id is not null and cand.match_type in ('exact', 'normalized')) > 0
      then 'yes'
    else 'no'
  end as remap_allowed_now,
  case
    when count(*) filter (where cand.gv_id is not null and cand.match_type in ('exact', 'normalized')) > 0
      then 'REMAP_TO_EXISTING_SAME_SET_CANONICAL'
    when count(*) filter (where cand.gv_id is null and cand.match_type in ('exact', 'normalized')) > 0
      then 'CREATE_MISSING_SAME_SET_CANONICAL_CARD_FIRST'
    else 'PERSIST_BLOCKED'
  end as required_next_action
from justtcg_classic_collection_missing_card_target_v1 target
left join justtcg_classic_collection_same_set_candidates_v1 cand
  on cand.external_id = target.external_id
group by
  target.external_id,
  target.raw_name,
  target.raw_number,
  target.raw_set,
  target.normalized_name,
  target.normalized_number,
  target.current_mapping_status;

-- Phase 1: target row extraction.
select
  external_id,
  raw_name,
  raw_number,
  raw_set,
  normalized_name,
  normalized_number,
  current_mapping_status
from justtcg_classic_collection_missing_card_target_v1;

-- Phase 2: same-set canonical card search.
select
  card_print_id,
  gv_id,
  name,
  number,
  number_plain,
  variant_key,
  printed_identity_modifier,
  match_type
from justtcg_classic_collection_same_set_candidates_v1
where match_type is not null
order by
  case match_type
    when 'exact' then 0
    when 'normalized' then 1
    when 'number_only' then 2
    else 3
  end,
  name,
  number,
  card_print_id;

-- Phase 3: base-set false match proof.
select
  candidate_card_print_id,
  candidate_gv_id,
  candidate_name,
  candidate_set_code,
  why_naive_match_looks_valid,
  why_not_lawful
from justtcg_classic_collection_base_false_match_v1;

-- Phase 4-6: final decision and safety test.
select
  final_classification,
  same_set_canonical_target_exists,
  safe_future_canonical_candidate,
  collision_count_if_promoted,
  ambiguity_count_if_promoted,
  remap_allowed_now,
  required_next_action
from justtcg_classic_collection_missing_card_decision_v1;

-- Final summary.
select
  1::int as classic_collection_row_count,
  final_classification,
  same_set_canonical_target_exists,
  safe_future_canonical_candidate,
  remap_allowed_now,
  required_next_action,
  'CEL25C_HERE_COMES_TEAM_ROCKET_CANONICAL_PROMOTION_V1'::text as next_execution_unit,
  case
    when final_classification = 'MISSING_SAME_SET_CANONICAL_CARD'
      and same_set_canonical_target_exists = 'no'
      and safe_future_canonical_candidate = 'yes'
      and remap_allowed_now = 'no'
      then 'passed'
    else 'failed'
  end as audit_status
from justtcg_classic_collection_missing_card_decision_v1;

rollback;
