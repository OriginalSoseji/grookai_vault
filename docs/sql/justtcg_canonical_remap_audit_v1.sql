-- JUSTTCG_CANONICAL_REMAP_AUDIT_V1
-- Read-only audit of the current JustTCG bridge surface against the closed
-- canonical identity layer.
--
-- Purpose:
-- 1. validate active JustTCG external mappings against canonical truth
-- 2. classify every active mapping as STILL_CORRECT or STALE_TARGET_REQUIRES_REMAP
-- 3. classify every currently unmapped raw JustTCG card row as
--    NEWLY_MATCHABLE_AFTER_IDENTITY_CLEANUP, REVIEW_REQUIRED,
--    or NON_CANONICAL_UPSTREAM
-- 4. isolate the batch-safe bridge backfill surface

begin;

create temp view justtcg_active_mappings_v1 as
  select
    em.id as external_mapping_id,
    em.external_id as justtcg_external_id,
    em.card_print_id as mapped_card_print_id,
    em.active,
    cp.gv_id as mapped_gv_id,
    cp.name as mapped_name,
    cp.number as mapped_number,
    cp.number_plain as mapped_number_plain,
    coalesce(cp.variant_key, '') as mapped_variant_key,
    s.code as mapped_set_code
  from public.external_mappings em
  join public.card_prints cp
    on cp.id = em.card_print_id
  join public.sets s
    on s.id = cp.set_id
  where em.source = 'justtcg'
    and em.active is true;

create temp view justtcg_current_raw_cards_v1 as
  select
    ri.id as raw_id,
    coalesce(ri.payload->>'id', ri.payload->>'_external_id') as justtcg_external_id,
    ri.payload->>'name' as raw_name,
    ri.payload->>'number' as raw_number,
    ri.payload->>'set' as raw_set,
    ri.payload->>'rarity' as raw_rarity
  from public.raw_imports ri
  where ri.source = 'justtcg'
    and ri.payload->>'_kind' = 'card';

create temp view justtcg_staging_surface_v1 as
  select
    edc.raw_import_id as raw_id,
    edc.upstream_id as justtcg_external_id,
    edc.name_raw,
    edc.number_raw,
    edc.set_id,
    edc.card_print_id as staged_card_print_id,
    cp.gv_id as staged_gv_id,
    cp.name as staged_name,
    cp.number as staged_number,
    cp.number_plain as staged_number_plain,
    coalesce(cp.variant_key, '') as staged_variant_key,
    s.code as staged_set_code,
    coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') as stage_classification,
    coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '') as stage_classification_reason,
    coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '') as stage_matched_via
  from public.external_discovery_candidates edc
  left join public.card_prints cp
    on cp.id = edc.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where edc.source = 'justtcg';

create temp view justtcg_canonical_remap_audit_v1 as
with mapped_surface as (
  select
    'MAPPED_ACTIVE'::text as surface_type,
    am.external_mapping_id::text as subject_id,
    am.justtcg_external_id,
    rc.raw_id::text as raw_id,
    coalesce(rc.raw_name, ss.name_raw) as raw_name,
    coalesce(rc.raw_number, ss.number_raw) as raw_number,
    coalesce(rc.raw_set, ss.set_id) as raw_set,
    rc.raw_rarity,
    am.mapped_card_print_id::text as current_card_print_id,
    am.mapped_gv_id as current_gv_id,
    am.mapped_name as current_name,
    am.mapped_number as current_number,
    am.mapped_number_plain,
    am.mapped_variant_key as current_variant_key,
    am.mapped_set_code as current_set_code,
    ss.staged_card_print_id::text as candidate_card_print_id,
    ss.staged_gv_id as candidate_gv_id,
    ss.staged_name as candidate_name,
    ss.staged_number as candidate_number,
    ss.staged_number_plain as candidate_number_plain,
    ss.staged_variant_key as candidate_variant_key,
    ss.staged_set_code as candidate_set_code,
    ss.stage_classification,
    ss.stage_classification_reason,
    ss.stage_matched_via,
    case
      when am.mapped_gv_id is null then 'STALE_TARGET_REQUIRES_REMAP'
      else 'STILL_CORRECT'
    end as audit_classification,
    case
      when am.mapped_gv_id is null
        and ss.stage_classification = 'MATCHED'
        and ss.staged_card_print_id is not null
        then 'mapped_target_noncanonical_but_stage_has_deterministic_canonical_replacement'
      when am.mapped_gv_id is null
        then 'mapped_target_noncanonical_without_deterministic_replacement'
      when rc.raw_id is not null
        and ss.stage_classification = 'MATCHED'
        and ss.staged_card_print_id = am.mapped_card_print_id
        then 'current_stage_match_agrees_with_active_mapping'
      when rc.raw_id is null
        then 'active_mapping_target_is_canonical_without_current_raw_snapshot'
      else 'active_mapping_target_is_canonical'
    end as proof_reason,
    case
      when am.mapped_gv_id is null
        and ss.stage_classification = 'MATCHED'
        and ss.staged_card_print_id is not null
        then 'yes'
      else 'no'
    end as safe_batch_remap
  from justtcg_active_mappings_v1 am
  left join justtcg_current_raw_cards_v1 rc
    on rc.justtcg_external_id = am.justtcg_external_id
  left join justtcg_staging_surface_v1 ss
    on ss.justtcg_external_id = am.justtcg_external_id
),
raw_unmapped_surface as (
  select
    'RAW_UNMAPPED'::text as surface_type,
    rc.raw_id::text as subject_id,
    rc.justtcg_external_id,
    rc.raw_id::text as raw_id,
    rc.raw_name,
    rc.raw_number,
    rc.raw_set,
    rc.raw_rarity,
    null::text as current_card_print_id,
    null::text as current_gv_id,
    null::text as current_name,
    null::text as current_number,
    null::text as mapped_number_plain,
    null::text as current_variant_key,
    null::text as current_set_code,
    ss.staged_card_print_id::text as candidate_card_print_id,
    ss.staged_gv_id as candidate_gv_id,
    ss.staged_name as candidate_name,
    ss.staged_number as candidate_number,
    ss.staged_number_plain as candidate_number_plain,
    ss.staged_variant_key as candidate_variant_key,
    ss.staged_set_code as candidate_set_code,
    ss.stage_classification,
    ss.stage_classification_reason,
    ss.stage_matched_via,
    case
      when ss.stage_classification = 'MATCHED'
        and ss.staged_card_print_id is not null
        then 'NEWLY_MATCHABLE_AFTER_IDENTITY_CLEANUP'
      when ss.stage_classification in ('NEEDS_REVIEW', 'PROMOTION_CANDIDATE')
        then 'REVIEW_REQUIRED'
      when ss.stage_classification = 'NON_CANONICAL'
        then 'NON_CANONICAL_UPSTREAM'
      when ss.raw_id is null
        then 'NON_CANONICAL_UPSTREAM'
      else 'UNCLASSIFIED'
    end as audit_classification,
    case
      when ss.stage_classification = 'MATCHED'
        then ss.stage_classification_reason
      when ss.stage_classification in ('NEEDS_REVIEW', 'PROMOTION_CANDIDATE')
        then concat(ss.stage_classification, ':', ss.stage_classification_reason)
      when ss.stage_classification = 'NON_CANONICAL'
        then ss.stage_classification_reason
      when ss.raw_id is null
        then 'filtered_before_staging_by_ingestion_non_canonical_gate'
      else 'unclassified_surface'
    end as proof_reason,
    case
      when ss.stage_classification = 'MATCHED'
        and ss.staged_card_print_id is not null
        then 'yes'
      else 'no'
    end as safe_batch_remap
  from justtcg_current_raw_cards_v1 rc
  left join justtcg_active_mappings_v1 am
    on am.justtcg_external_id = rc.justtcg_external_id
  left join justtcg_staging_surface_v1 ss
    on ss.raw_id = rc.raw_id
  where am.justtcg_external_id is null
)
select *
from mapped_surface
union all
select *
from raw_unmapped_surface;

-- Phase 1: current mapping surface counts.
select count(*)::int as current_mapped_count
from public.external_mappings
where source = 'justtcg';

select count(*)::int as current_raw_card_count
from public.raw_imports
where source = 'justtcg'
  and payload->>'_kind' = 'card';

select count(*)::int as current_unmapped_count
from justtcg_current_raw_cards_v1 rc
where not exists (
  select 1
  from justtcg_active_mappings_v1 am
  where am.justtcg_external_id = rc.justtcg_external_id
);

-- Phase 2: validate existing mappings.
select
  subject_id as external_mapping_id,
  justtcg_external_id,
  current_card_print_id as mapped_card_print_id,
  current_gv_id as gv_id,
  current_name as name,
  mapped_number_plain as number_plain,
  current_set_code as set_code,
  audit_classification,
  proof_reason,
  candidate_card_print_id,
  candidate_gv_id
from justtcg_canonical_remap_audit_v1
where surface_type = 'MAPPED_ACTIVE'
order by subject_id::bigint;

-- Phase 3 and 4: unmapped current raw rows audited against canonical truth.
select
  raw_id,
  raw_name,
  raw_number,
  raw_set,
  candidate_card_print_id,
  candidate_gv_id,
  candidate_name,
  candidate_number_plain,
  candidate_set_code,
  stage_classification,
  stage_classification_reason,
  stage_matched_via,
  audit_classification,
  proof_reason
from justtcg_canonical_remap_audit_v1
where surface_type = 'RAW_UNMAPPED'
order by raw_id::bigint;

-- Phase 5: final classification counts across the full audited surface.
select
  audit_classification as classification,
  count(*)::int as row_count
from justtcg_canonical_remap_audit_v1
group by audit_classification
order by audit_classification;

-- Phase 6: safety analysis for rows that would require bridge change or insertion.
select
  audit_classification as classification,
  safe_batch_remap,
  count(*)::int as row_count
from justtcg_canonical_remap_audit_v1
where audit_classification in (
  'STALE_TARGET_REQUIRES_REMAP',
  'NEWLY_MATCHABLE_AFTER_IDENTITY_CLEANUP'
)
group by audit_classification, safe_batch_remap
order by audit_classification, safe_batch_remap;

-- Final summary.
select
  (select count(*)::int from justtcg_active_mappings_v1) as current_mapped_count,
  (select count(*)::int from justtcg_current_raw_cards_v1) as current_raw_card_count,
  (select count(*)::int from justtcg_current_raw_cards_v1 rc
    where not exists (
      select 1
      from justtcg_active_mappings_v1 am
      where am.justtcg_external_id = rc.justtcg_external_id
    )) as current_unmapped_count,
  count(*) filter (where audit_classification = 'STILL_CORRECT')::int as still_correct_count,
  count(*) filter (where audit_classification = 'STALE_TARGET_REQUIRES_REMAP')::int as stale_target_requires_remap_count,
  count(*) filter (where audit_classification = 'NEWLY_MATCHABLE_AFTER_IDENTITY_CLEANUP')::int as newly_matchable_count,
  count(*) filter (where audit_classification = 'REVIEW_REQUIRED')::int as review_required_count,
  count(*) filter (where audit_classification = 'NON_CANONICAL_UPSTREAM')::int as non_canonical_upstream_count,
  count(*) filter (where safe_batch_remap = 'yes')::int as safe_batch_remap_count,
  count(*) filter (where audit_classification = 'UNCLASSIFIED')::int as unclassified_count,
  'JUSTTCG_TCGPLAYER_BRIDGE_BACKFILL_APPLY_V1'::text as next_lawful_execution_unit,
  case
    when count(*) filter (where audit_classification = 'UNCLASSIFIED') = 0 then 'passed'
    else 'failed'
  end as audit_status
from justtcg_canonical_remap_audit_v1;

rollback;
