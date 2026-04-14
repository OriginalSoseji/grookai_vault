-- CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1
-- Read-only audit for the bounded Trainer Kit deck-slot artifact surface.
--
-- Purpose:
-- 1. isolate the exact 19 false-promotion rows from staging
-- 2. prove the filter is bounded to the audited Trainer Kit energy-slot pattern
-- 3. show pending vs already-applied state without mutating canonical data
-- 4. provide the post-hardening count targets used by the worker

begin;

create temp view controlled_growth_non_canonical_filter_audit_v1 as
with staged as (
  select
    edc.id as staging_id,
    edc.raw_import_id::text as raw_id,
    edc.name_raw as raw_name,
    edc.number_raw as raw_number,
    edc.set_id as raw_set,
    edc.normalized_name,
    edc.normalized_number_left as normalized_number,
    edc.normalized_number_plain,
    edc.candidate_bucket,
    edc.match_status,
    edc.classifier_version,
    coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') as current_classification,
    coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '') as current_classification_reason,
    coalesce(edc.payload->'_grookai_ingestion_v1'->'candidate_set_mapping'->>0, '') as candidate_set_mapping,
    coalesce(
      jsonb_array_length(coalesce(edc.payload->'_grookai_ingestion_v1'->'candidate_card_print_ids', '[]'::jsonb)),
      0
    ) as candidate_card_print_id_count,
    coalesce(edc.payload->'_grookai_noncanonical_filter_v1'->>'worker_version', '') as hardening_worker_version,
    coalesce(edc.payload->'_grookai_noncanonical_filter_v1'->>'hardening_rule', '') as hardening_rule
  from public.external_discovery_candidates edc
  where edc.source = 'justtcg'
),
audited_surface as (
  select
    staged.*,
    (
      staged.raw_set = 'sm-trainer-kit-lycanroc-alolan-raichu-pokemon'
      and staged.candidate_set_mapping = 'tk-sm-l'
      and staged.candidate_bucket = 'CLEAN_CANON_CANDIDATE'
      and staged.match_status = 'UNMATCHED'
      and staged.raw_name like '%Energy (#%'
      and staged.candidate_card_print_id_count = 0
      and (
        (
          staged.current_classification in ('PROMOTION_CANDIDATE', 'NEEDS_REVIEW')
          and staged.current_classification_reason = 'no_same_set_canonical_match_on_clean_surface'
        )
        or (
          staged.current_classification = 'NON_CANONICAL'
          and staged.hardening_worker_version = 'CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1'
          and staged.hardening_rule = 'TRAINER_KIT_DECK_SLOT_DISAMBIGUATION'
        )
      )
    ) as matches_audited_filter_family,
    (
      staged.raw_set = 'sm-trainer-kit-lycanroc-alolan-raichu-pokemon'
      and staged.candidate_set_mapping = 'tk-sm-l'
      and staged.candidate_bucket = 'CLEAN_CANON_CANDIDATE'
      and staged.match_status = 'UNMATCHED'
      and staged.current_classification in ('PROMOTION_CANDIDATE', 'NEEDS_REVIEW')
      and staged.current_classification_reason = 'no_same_set_canonical_match_on_clean_surface'
      and staged.raw_name like '%Energy (#%'
      and staged.candidate_card_print_id_count = 0
    ) as pending_reclassification,
    (
      staged.current_classification = 'NON_CANONICAL'
      and staged.hardening_worker_version = 'CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1'
      and staged.hardening_rule = 'TRAINER_KIT_DECK_SLOT_DISAMBIGUATION'
    ) as already_reclassified
  from staged
)
select *
from audited_surface
where matches_audited_filter_family;

-- Phase 1: exact target rows isolated by the hardened Trainer Kit rule family.
select
  raw_id,
  raw_name,
  raw_number,
  raw_set,
  normalized_name,
  normalized_number,
  current_classification
from controlled_growth_non_canonical_filter_audit_v1
order by raw_id;

-- Phase 1 proof: pending vs already-applied state.
select
  count(*)::int as audited_filter_family_count,
  count(*) filter (where pending_reclassification)::int as pending_reclassification_count,
  count(*) filter (where already_reclassified)::int as already_reclassified_count
from controlled_growth_non_canonical_filter_audit_v1;

-- Phase 2 and 3 proof: exact filter criteria and expected lane.
select
  raw_id,
  raw_name,
  raw_number,
  candidate_set_mapping,
  candidate_bucket,
  match_status,
  candidate_card_print_id_count,
  current_classification,
  current_classification_reason,
  case
    when pending_reclassification then 'PENDING_NON_CANONICAL_RECLASSIFICATION'
    when already_reclassified then 'ALREADY_NON_CANONICAL'
    else 'OUT_OF_SCOPE'
  end as hardening_status,
  'NON_CANONICAL'::text as expected_classification,
  'TRAINER_KIT_DECK_SLOT_DISAMBIGUATION'::text as hardening_rule
from controlled_growth_non_canonical_filter_audit_v1
order by raw_id;

-- Phase 6 proof: promotion surface drops from 31 to 12 once the 19 deck-slot artifacts are suppressed.
select
  count(*)::int as promotion_candidate_count_current
from public.external_discovery_candidates edc
where edc.source = 'justtcg'
  and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'PROMOTION_CANDIDATE';

select
  count(*)::int as hardened_non_canonical_count_current
from public.external_discovery_candidates edc
where edc.source = 'justtcg'
  and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'NON_CANONICAL'
  and coalesce(edc.payload->'_grookai_noncanonical_filter_v1'->>'worker_version', '') =
    'CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1'
  and coalesce(edc.payload->'_grookai_noncanonical_filter_v1'->>'hardening_rule', '') =
    'TRAINER_KIT_DECK_SLOT_DISAMBIGUATION';

rollback;
