-- JUSTTCG_CLASSIC_COLLECTION_STALE_MAPPING_CONTRACT_AUDIT_V1
-- Read-only contract audit for the remaining Classic Collection stale JustTCG
-- mapping.
--
-- Purpose:
-- 1. extract the exact stale Classic Collection row
-- 2. show the strongest cross-set canonical candidate surfaced by naive logic
-- 3. prove why remap is blocked even though the cel25c set already exists
-- 4. define the lawful next step for eventual bridge repair

begin;

create temp view justtcg_classic_collection_target_row_v1 as
with active_set_alignment as (
  select
    jsm.justtcg_set_id,
    s.id as aligned_set_id,
    s.code as aligned_set_code,
    s.name as aligned_set_name
  from public.justtcg_set_mappings jsm
  join public.sets s
    on s.id = jsm.grookai_set_id
  where jsm.active is true
)
select
  em.id as external_mapping_id,
  em.external_id,
  ri.id as raw_import_id,
  ri.payload->>'name' as raw_name,
  ri.payload->>'number' as raw_number,
  ri.payload->>'set' as raw_set,
  ri.payload->>'set_name' as raw_set_name,
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
  mapped_set.code as current_set_code,
  align.aligned_set_id,
  align.aligned_set_code,
  align.aligned_set_name
from public.external_mappings em
join public.card_prints mapped_cp
  on mapped_cp.id = em.card_print_id
join public.sets mapped_set
  on mapped_set.id = mapped_cp.set_id
left join public.raw_imports ri
  on ri.source = 'justtcg'
 and coalesce(ri.payload->>'id', ri.payload->>'_external_id') = em.external_id
left join active_set_alignment align
  on align.justtcg_set_id = ri.payload->>'set'
where em.source = 'justtcg'
  and em.active is true
  and em.external_id = 'pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection';

create temp view justtcg_classic_collection_candidate_surface_v1 as
select
  target.external_id,
  cp.id as candidate_card_print_id,
  cp.gv_id as candidate_gv_id,
  cp.name as candidate_name,
  cp.number as candidate_number,
  cp.number_plain as candidate_number_plain,
  coalesce(cp.variant_key, '') as candidate_variant_key,
  s.code as candidate_set_code,
  case
    when s.code = target.aligned_set_code
      and cp.name = target.raw_name
      and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 'exact'
    when cp.name = target.raw_name
      and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 'normalized'
    when s.code = target.aligned_set_code
      and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      then 'partial'
    when cp.name = target.raw_name
      then 'partial'
    else null
  end as match_type
from justtcg_classic_collection_target_row_v1 target
join public.card_prints cp
  on cp.gv_id is not null
join public.sets s
  on s.id = cp.set_id
where (
    cp.name = target.raw_name
    and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
  )
   or (
    s.code = target.aligned_set_code
    and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
  )
order by
  case
    when s.code = target.aligned_set_code and cp.name = target.raw_name then 0
    when cp.name = target.raw_name then 1
    when s.code = target.aligned_set_code then 2
    else 3
  end,
  s.code,
  cp.number,
  cp.id;

create temp view justtcg_classic_collection_contract_analysis_v1 as
select
  target.external_mapping_id,
  target.external_id,
  target.raw_name,
  target.raw_number,
  target.raw_set,
  target.normalized_name,
  target.normalized_number,
  target.current_card_print_id,
  target.current_name,
  target.current_number,
  target.current_set_code,
  target.aligned_set_code,
  (
    select count(*)::int
    from public.card_prints cp
    join public.sets s
      on s.id = cp.set_id
    where s.code = 'cel25c'
      and cp.gv_id is not null
  ) as aligned_set_canonical_count,
  (
    select count(*)::int
    from public.card_prints cp
    join public.sets s
      on s.id = cp.set_id
    where s.code = 'cel25c'
      and cp.name = target.raw_name
      and cp.gv_id is not null
  ) as same_set_same_name_canonical_count,
  (
    select count(*)::int
    from public.card_prints cp
    join public.sets s
      on s.id = cp.set_id
    where s.code = 'cel25c'
      and regexp_replace(cp.number_plain, '^0+', '') = target.normalized_number
      and cp.gv_id is not null
  ) as same_set_same_number_canonical_count,
  (
    select row_to_json(x)
    from (
      select
        cand.candidate_card_print_id,
        cand.candidate_gv_id,
        cand.candidate_name,
        cand.candidate_number,
        cand.candidate_variant_key,
        cand.candidate_set_code,
        cand.match_type
      from justtcg_classic_collection_candidate_surface_v1 cand
      where cand.candidate_set_code <> 'cel25c'
      order by
        case
          when cand.candidate_set_code = 'base5' and cand.candidate_number_plain = '15' then 0
          else 1
        end,
        cand.candidate_set_code,
        cand.candidate_number
      limit 1
    ) x
  ) as naive_cross_set_candidate,
  'Naive matching surfaces `GV-PK-TR-15` because name and number align to the original Team Rocket print.'::text as why_naive_match_looks_valid,
  'The row is already aligned to the Classic Collection set (`cel25c`). Classic Collection is a distinct printed identity lane, so remapping to Team Rocket `base5` would be cross-set reuse and would erase the reprint identity.'::text as why_remap_is_blocked,
  'CLASSIC_COLLECTION_SAME_SET_CANONICAL_ABSENT'::text as root_cause,
  'PROMOTION_REQUIRED'::text as classification,
  'REQUIRE_NEW_CANONICAL_CARD'::text as safe_resolution_type,
  'CREATE_MISSING_CLASSIC_COLLECTION_CANONICAL_CARD_FIRST'::text as required_action
from justtcg_classic_collection_target_row_v1 target;

create temp view justtcg_classic_collection_contract_rules_v1 as
select
  1 as rule_order,
  'Classic Collection rows must never map to original source-set canon, even when name and number agree.'::text as system_rule
union all
select
  2 as rule_order,
  'Cross-set canonical reuse is prohibited for Classic Collection stale remap.'::text as system_rule
union all
select
  3 as rule_order,
  'A JustTCG Classic Collection row can remap only when a same-set canonical `cel25c` target with non-null `gv_id` exists.'::text as system_rule
union all
select
  4 as rule_order,
  'Because the `cel25c` set already exists and already contains canonical rows, the current blocker is the missing same-set card, not a missing set.'::text as system_rule;

-- Phase 1: target row extraction.
select
  external_id,
  raw_name,
  raw_number,
  raw_set,
  normalized_name,
  normalized_number
from justtcg_classic_collection_target_row_v1;

-- Phase 2: canonical comparison.
select
  external_id,
  (naive_cross_set_candidate->>'candidate_set_code') as candidate_set_code,
  (naive_cross_set_candidate->>'candidate_gv_id') as candidate_gv_id,
  (naive_cross_set_candidate->>'candidate_name') as candidate_name,
  (naive_cross_set_candidate->>'candidate_number') as candidate_number,
  why_naive_match_looks_valid
from justtcg_classic_collection_contract_analysis_v1;

-- Phase 3-7: contract analysis.
select
  external_id,
  aligned_set_code,
  aligned_set_canonical_count,
  same_set_same_name_canonical_count,
  same_set_same_number_canonical_count,
  classification,
  root_cause,
  safe_resolution_type,
  required_action,
  why_remap_is_blocked
from justtcg_classic_collection_contract_analysis_v1;

-- Phase 5: formal rules.
select
  rule_order,
  system_rule
from justtcg_classic_collection_contract_rules_v1
order by rule_order;

-- Phase 8: final classification output.
select
  external_id,
  classification,
  root_cause as reason,
  required_action
from justtcg_classic_collection_contract_analysis_v1;

-- Final summary.
select
  1::int as classic_collection_row_count,
  'PROMOTION_REQUIRED'::text as classification,
  case
    when (select aligned_set_canonical_count from justtcg_classic_collection_contract_analysis_v1) > 0
      then 'yes'
    else 'no'
  end as canonical_set_exists,
  'no'::text as remap_allowed,
  'JUSTTCG_CLASSIC_COLLECTION_MISSING_CANONICAL_CARD_AUDIT_V1'::text as next_execution_unit,
  case
    when (select aligned_set_canonical_count from justtcg_classic_collection_contract_analysis_v1) > 0
      and (select same_set_same_name_canonical_count from justtcg_classic_collection_contract_analysis_v1) = 0
      then 'passed'
    else 'failed'
  end as audit_status;

rollback;
