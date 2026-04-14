-- JUSTTCG_STALE_REMAP_CONTRACT_AUDIT_V1
-- Read-only audit of the three remaining stale JustTCG bridge rows that still
-- point at non-canonical targets after insert-only backfill.
--
-- Purpose:
-- 1. extract the exact stale rows and their raw upstream context
-- 2. show the strongest lawful canonical candidates without forcing a remap
-- 3. classify each row's ambiguity deterministically
-- 4. define the fail-closed bridge contract for future handling

begin;

create temp view justtcg_stale_remap_rows_v1 as
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
),
stale_bridge_rows as (
  select
    em.id as external_mapping_id,
    em.external_id,
    em.card_print_id as current_mapped_card_print_id,
    mapped_cp.gv_id as current_mapped_gv_id,
    mapped_cp.name as current_mapped_name,
    mapped_cp.number as current_mapped_number,
    mapped_cp.number_plain as current_mapped_number_plain,
    coalesce(mapped_cp.variant_key, '') as current_mapped_variant_key,
    mapped_set.code as current_mapped_set_code,
    ri.id as raw_import_id,
    ri.payload->>'name' as raw_name,
    ri.payload->>'number' as raw_number,
    ri.payload->>'set' as raw_set,
    ri.payload->>'set_name' as raw_set_name,
    ri.payload->>'rarity' as raw_rarity,
    lower(
      regexp_replace(
        trim(
          regexp_replace(
            coalesce(ri.payload->>'name', ''),
            '\s*-\s*[0-9A-Za-z/]+\s*\(#.*\)\s*$',
            '',
            'g'
          )
        ),
        '\s+',
        ' ',
        'g'
      )
    ) as normalized_raw_name,
    regexp_replace(coalesce(ri.payload->>'number', ''), '/.*$', '') as raw_token,
    regexp_replace(
      regexp_replace(coalesce(ri.payload->>'number', ''), '/.*$', ''),
      '^0+',
      ''
    ) as normalized_raw_token_plain,
    ri.payload as raw_payload
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
    and mapped_cp.gv_id is null
)
select
  stale.external_mapping_id,
  stale.external_id,
  stale.raw_import_id,
  stale.raw_name,
  stale.raw_number,
  stale.raw_set,
  stale.raw_set_name,
  stale.raw_rarity,
  stale.current_mapped_card_print_id,
  stale.current_mapped_gv_id,
  stale.current_mapped_name,
  stale.current_mapped_number,
  stale.current_mapped_number_plain,
  stale.current_mapped_variant_key,
  stale.current_mapped_set_code,
  stale.normalized_raw_name,
  stale.raw_token,
  stale.normalized_raw_token_plain,
  align.aligned_set_id,
  align.aligned_set_code,
  align.aligned_set_name,
  stale.raw_payload
from stale_bridge_rows stale
left join active_set_alignment align
  on align.justtcg_set_id = stale.raw_set
order by stale.external_mapping_id;

create temp view justtcg_stale_remap_canonical_candidates_v1 as
select
  stale.external_id,
  cp.id as candidate_card_print_id,
  cp.gv_id as candidate_gv_id,
  cp.name as candidate_name,
  s.code as candidate_set,
  cp.number as candidate_number,
  cp.number_plain as candidate_number_plain,
  coalesce(cp.variant_key, '') as candidate_variant_key,
  case
    when stale.aligned_set_id is not null
      and cp.set_id = stale.aligned_set_id
      and lower(cp.name) = stale.normalized_raw_name
      and regexp_replace(cp.number_plain, '^0+', '') = stale.normalized_raw_token_plain
      then 'exact'
    when stale.aligned_set_id is not null
      and cp.set_id = stale.aligned_set_id
      and regexp_replace(cp.number_plain, '^0+', '') = stale.normalized_raw_token_plain
      then 'partial'
    when lower(cp.name) = stale.normalized_raw_name
      and regexp_replace(cp.number_plain, '^0+', '') = stale.normalized_raw_token_plain
      then 'partial'
    when lower(cp.name) = stale.normalized_raw_name
      then 'normalized'
    when regexp_replace(cp.number_plain, '^0+', '') = stale.normalized_raw_token_plain
      and stale.aligned_set_id is not null
      and cp.set_id = stale.aligned_set_id
      then 'suffix'
    else null
  end as match_type
from justtcg_stale_remap_rows_v1 stale
join public.card_prints cp
  on cp.gv_id is not null
join public.sets s
  on s.id = cp.set_id
where (
    lower(cp.name) = stale.normalized_raw_name
    and regexp_replace(cp.number_plain, '^0+', '') = stale.normalized_raw_token_plain
  )
   or (
    stale.aligned_set_id is not null
    and cp.set_id = stale.aligned_set_id
    and regexp_replace(cp.number_plain, '^0+', '') = stale.normalized_raw_token_plain
  )
order by stale.external_id, candidate_set, candidate_number, candidate_name;

create temp view justtcg_stale_remap_row_analysis_v1 as
with candidate_counts as (
  select
    stale.external_id,
    count(*)::int as candidate_count,
    count(*) filter (
      where stale.aligned_set_code is not null
        and cand.candidate_set = stale.aligned_set_code
        and cand.match_type = 'exact'
    )::int as aligned_exact_count,
    count(*) filter (
      where stale.aligned_set_code is not null
        and cand.candidate_set = stale.aligned_set_code
    )::int as aligned_any_count,
    count(*) filter (
      where stale.aligned_set_code is not null
        and cand.candidate_set <> stale.aligned_set_code
        and cand.match_type in ('exact', 'normalized', 'partial')
    )::int as cross_set_identity_candidate_count,
    count(*) filter (
      where cand.candidate_set = 'swsh1'
        and cand.candidate_name = 'Yamper'
        and regexp_replace(cand.candidate_number_plain, '^0+', '') = stale.normalized_raw_token_plain
    )::int as swsh1_underlying_match_count,
    count(*) filter (
      where cand.candidate_set = 'cel25c'
        and cand.candidate_name <> stale.raw_name
        and regexp_replace(cand.candidate_number_plain, '^0+', '') = stale.normalized_raw_token_plain
    )::int as aligned_number_collision_count
  from justtcg_stale_remap_rows_v1 stale
  left join justtcg_stale_remap_canonical_candidates_v1 cand
    on cand.external_id = stale.external_id
  group by stale.external_id, stale.aligned_set_code, stale.normalized_raw_token_plain
)
select
  stale.external_mapping_id,
  stale.external_id,
  stale.raw_import_id,
  stale.raw_name,
  stale.raw_number,
  stale.raw_set,
  stale.raw_set_name,
  stale.current_mapped_card_print_id,
  stale.current_mapped_name,
  stale.current_mapped_number,
  stale.current_mapped_set_code,
  stale.aligned_set_code,
  counts.candidate_count,
  counts.aligned_exact_count,
  counts.aligned_any_count,
  counts.cross_set_identity_candidate_count,
  counts.swsh1_underlying_match_count,
  counts.aligned_number_collision_count,
  case
    when stale.raw_set = 'battle-academy-2022-pokemon'
      then 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES'
    when stale.raw_set = 'celebrations-classic-collection-pokemon'
      then 'PROMOTION_REQUIRED'
    else 'OTHER'
  end as classification,
  case
    when stale.raw_set = 'battle-academy-2022-pokemon'
      then 'BATTLE_ACADEMY_OVERLAY_IDENTITY_MISSING'
    when stale.raw_set = 'celebrations-classic-collection-pokemon'
      then 'CLASSIC_COLLECTION_SAME_SET_CANONICAL_ABSENT'
    else 'OTHER'
  end as root_cause_category,
  case
    when stale.raw_set = 'battle-academy-2022-pokemon'
      then 'NEED_NEW_RULE'
    when stale.raw_set = 'celebrations-classic-collection-pokemon'
      then 'REQUIRE_MANUAL_REVIEW'
    else 'REQUIRE_MANUAL_REVIEW'
  end as safe_resolution_type,
  case
    when stale.raw_set = 'battle-academy-2022-pokemon'
      then 'Do not remap to the underlying Sword & Shield Yamper. Hold until a Battle Academy overlay canon contract exists and a lawful BA canonical target can be created.'
    when stale.raw_set = 'celebrations-classic-collection-pokemon'
      then 'Do not remap cross-set to Team Rocket. Hold until a lawful same-set cel25c canonical target exists and bridge only after that target is canonical.'
    else 'Manual review required.'
  end as required_action,
  case
    when stale.raw_set = 'battle-academy-2022-pokemon'
      then 'Raw source_name_raw carries deck-slot stamp evidence (#1 / #58 Pikachu Stamped). The only current canonical name+number hit is GV-PK-SSH-74 in swsh1, which is an underlying base print and not the Battle Academy overlay identity.'
    when stale.raw_set = 'celebrations-classic-collection-pokemon'
      then 'Raw row is a real Celebrations Classic Collection reprint (15/82). No same-set canonical target exists. GV-PK-TR-15 is a cross-set original Team Rocket print and cannot be reused as a cel25c mapping target.'
    else 'No deterministic remap rule exists.'
  end as proof_reason
from justtcg_stale_remap_rows_v1 stale
join candidate_counts counts
  on counts.external_id = stale.external_id
order by stale.external_mapping_id;

create temp view justtcg_stale_remap_system_rules_v1 as
select
  1 as rule_order,
  'Cross-set exact name+number agreement is insufficient for stale JustTCG remap. Bridge repair requires a lawful same-set canonical target.'::text as final_system_rule
union all
select
  2 as rule_order,
  'Battle Academy 2022 deck-stamped rows with source labels such as (#1 Pikachu Stamped) and (#58 Pikachu Stamped) must never remap to underlying Sword & Shield canon by token/name alone.'::text as final_system_rule
union all
select
  3 as rule_order,
  'Classic Collection reprint rows that point at non-canonical same-set placeholders remain blocked until the missing cel25c canonical row exists; original-set reuse is prohibited.'::text as final_system_rule
union all
select
  4 as rule_order,
  'Stale mappings that still point at gv_id-null targets remain fail-closed until either a same-set canonical target exists or a domain-specific identity contract is implemented.'::text as final_system_rule;

-- Phase 1: target row extraction.
select
  external_id,
  raw_name,
  raw_number,
  raw_set,
  raw_set_name,
  current_mapped_card_print_id as current_target_card_print_id,
  current_mapped_name as current_target_name,
  current_mapped_number as current_target_number,
  current_mapped_set_code as current_target_set_code
from justtcg_stale_remap_rows_v1
order by external_mapping_id;

-- Phase 2: canonical candidate analysis.
select
  external_id,
  candidate_card_print_id,
  candidate_gv_id,
  candidate_name,
  candidate_set,
  match_type
from justtcg_stale_remap_canonical_candidates_v1
where match_type is not null
order by external_id, candidate_set, candidate_number, candidate_name;

-- Phase 3-5: row-level classification and contract decision.
select
  external_id,
  classification,
  root_cause_category,
  safe_resolution_type,
  required_action,
  proof_reason
from justtcg_stale_remap_row_analysis_v1
order by external_mapping_id;

-- Phase 6: system rules.
select
  rule_order,
  final_system_rule
from justtcg_stale_remap_system_rules_v1
order by rule_order;

-- Phase 7: final classification table.
select
  external_id,
  classification,
  safe_resolution_type,
  required_action,
  proof_reason
from justtcg_stale_remap_row_analysis_v1
order by external_mapping_id;

-- Final summary.
with classification_summary as (
  select classification, count(*)::int as row_count
  from justtcg_stale_remap_row_analysis_v1
  group by classification
),
root_cause_summary as (
  select root_cause_category, count(*)::int as row_count
  from justtcg_stale_remap_row_analysis_v1
  group by root_cause_category
),
safe_resolution_summary as (
  select safe_resolution_type, count(*)::int as row_count
  from justtcg_stale_remap_row_analysis_v1
  group by safe_resolution_type
)
select
  (select count(*)::int from justtcg_stale_remap_row_analysis_v1) as stale_row_count,
  (
    select jsonb_object_agg(classification, row_count order by classification)
    from classification_summary
  ) as classification_counts,
  (
    select jsonb_object_agg(root_cause_category, row_count order by root_cause_category)
    from root_cause_summary
  ) as root_cause_categories,
  (
    select jsonb_object_agg(safe_resolution_type, row_count order by safe_resolution_type)
    from safe_resolution_summary
  ) as safe_resolution_counts,
  (
    select jsonb_agg(final_system_rule order by rule_order)
    from justtcg_stale_remap_system_rules_v1
  ) as final_system_rules,
  'JUSTTCG_BATTLE_ACADEMY_STALE_MAPPING_CONTRACT_AUDIT_V1'::text as next_execution_unit,
  case
    when (select count(*) from justtcg_stale_remap_row_analysis_v1) = 3
      and (select count(*) from justtcg_stale_remap_row_analysis_v1 where classification = 'OTHER') = 0
      then 'passed'
    else 'failed'
  end as audit_status;

rollback;
