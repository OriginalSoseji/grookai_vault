-- Exact reviewed TCGPlayer finish override projection for two Mega Evolution
-- Promo observations. This migration creates no assignment or price rows.
begin;

create or replace function public.pokemon_tcgplayer_reviewed_finish_override_valid_v1(
  assignment_id uuid,
  observation_id uuid
) returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.market_evidence_variant_assignments assignment
    join public.tcgcsv_source_price_daily_observations observation
      on observation.id = assignment.source_row_id
     and observation.id = pokemon_tcgplayer_reviewed_finish_override_valid_v1.observation_id
    join public.tcgcsv_source_products product
      on product.product_id = observation.product_id
    join public.tcgcsv_source_artifacts artifact
      on artifact.id = observation.source_artifact_id
    join public.external_mappings mapping
      on mapping.source = 'tcgplayer'
     and mapping.external_id = observation.product_id::text
     and mapping.active
     and mapping.card_print_id = assignment.card_print_id
    join public.card_prints card
      on card.id = assignment.card_print_id
    join public.card_print_identity identity
      on identity.card_print_id = card.id
     and identity.is_active
     and identity.identity_domain = 'pokemon_eng_standard'
    join public.card_printings printing
      on printing.id = assignment.card_printing_id
     and printing.card_print_id = card.id
     and printing.finish_key = 'holo'
     and printing.printing_gv_id = assignment.printing_gv_id
    where assignment.id = pokemon_tcgplayer_reviewed_finish_override_valid_v1.assignment_id
      and assignment.contract_version = 'MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1'
      and assignment.source_family = 'tcgcsv_market_close'
      and assignment.source_table = 'tcgcsv_source_price_daily_observations'
      and assignment.observation_id = observation.id
      and assignment.raw_snapshot_id = observation.source_artifact_id
      and assignment.source_finish_hint = observation.subtype_name
      and assignment.source_finish_hint = 'Normal'
      and assignment.normalized_finish_key = 'normal'
      and assignment.assigned_finish_key = 'holo'
      and assignment.variant_assignment_status = 'exact_child_finish'
      and assignment.variant_assignment_confidence = 1.0000
      and assignment.variant_assignment_version = 'MEE_TCGPLAYER_REVIEWED_FINISH_OVERRIDE_V1'
      and assignment.variant_assignment_flags = array['reviewed_source_finish_override']::text[]
      and assignment.needs_review = false
      and assignment.publishable = false
      and assignment.app_visible = false
      and assignment.market_truth = false
      and observation.category_id = 3
      and observation.group_id = 24451
      and observation.subtype_name_normalized = 'normal'
      and observation.last_seen_run_id =
        'e429784c-55f2-4922-94dc-0cc560acda8d'::uuid
      and observation.source_artifact_id =
        '2d2e6471-7b21-4748-b843-f6a70821039c'::uuid
      and observation.observed_on = '2026-10-12'::date
      and observation.last_seen_run_id::text =
        assignment.assignment_payload ->> 'source_sync_run_id'
      and observation.source_price_row_identity =
        assignment.assignment_payload ->> 'source_price_row_identity'
      and observation.payload_hash = assignment.assignment_payload ->> 'source_row_hash'
      and observation.observed_on::text = left(
        assignment.assignment_payload ->> 'source_observed_on', 10)
      and artifact.sha256 = assignment.assignment_payload ->> 'source_artifact_hash'
      and artifact.id::text = assignment.assignment_payload ->> 'source_artifact_id'
      and artifact.sha256 =
        '368ce87a576166ae265ddecaa1289ed4f0bd233523c3a717ae2a626721a62697'
      and product.payload_hash = assignment.assignment_payload ->> 'source_product_sha256'
      and assignment.assignment_payload ->> 'source_product_id' = observation.product_id::text
      and assignment.assignment_payload ->> 'reviewed_source_products_payload_sha256' =
        '0d15963655e06bddfba508af38ac21f64a0bfd0cec20011cb09e72d3d8ffb957'
      and assignment.assignment_payload ->> 'authority_plan_fingerprint' =
        'ced09a10c3194b404452b360a932e79b32e8e11c3c69d18989ca5f1f6d93e495'
      and (
        (
          observation.product_id = 654596
          and observation.id = '2664dc1d-4e03-43cb-8346-0ca5f10c4b19'::uuid
          and observation.source_price_row_identity = 'tcgplayer:654596:normal'
          and observation.payload_hash =
            '805ec6c5626b16379810d29c22f426f994c90f580e8b9f63997c9d15aa8140a0'
          and observation.market_price = 12.21
          and product.payload_hash =
            '65988cf3a595e676cc5ac8417d261f93330742ac1a612c4f155e3eec1d42457d'
          and assignment.assignment_payload ->> 'source_candidate_fingerprint' =
            'd1509f19057ae377d983ea6640fd02e47487deea1732278179aadcf248a54b59'
          and assignment.assignment_payload ->> 'mapping_gap_observation_id' =
            '9360612f-a90c-4236-a5b9-29de21a8b875'
          and card.id = '95dca2c2-c3e7-43b4-bc02-227fddc4910d'::uuid
          and card.gv_id = 'GV-PK-MEP-002'
          and printing.id = '42918a6d-7aeb-42fe-9163-9489ea3070c5'::uuid
          and printing.printing_gv_id = 'GV-PK-MEP-002-HOLO'
        ) or (
          observation.product_id = 654598
          and observation.id = 'e626cae7-60cf-4f41-a30f-531ccb3f3432'::uuid
          and observation.source_price_row_identity = 'tcgplayer:654598:normal'
          and observation.payload_hash =
            '7e71d9924a5d2fe4ad97f84430070b723270e487deb64af2861442ee72c98207'
          and observation.market_price = 18.20
          and product.payload_hash =
            'da3644e729758eb2cb8e978b83bd8e4b315823ed4791725a0d5ba772ac814f73'
          and assignment.assignment_payload ->> 'source_candidate_fingerprint' =
            '790628b1719919a066b06fca06b9d7e5b90f015843f1fca05914663ba535f2ce'
          and assignment.assignment_payload ->> 'mapping_gap_observation_id' =
            '47ff952e-ee35-445e-98bd-adb69949c42a'
          and card.id = 'cddc521f-ebbe-4460-85d5-d78278672f95'::uuid
          and card.gv_id = 'GV-PK-MEP-004'
          and printing.id = '6f650737-4528-4b75-9b85-3037ce800dc2'::uuid
          and printing.printing_gv_id = 'GV-PK-MEP-004-HOLO'
        )
      )
  );
$$;

revoke all on function public.pokemon_tcgplayer_reviewed_finish_override_valid_v1(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.pokemon_tcgplayer_reviewed_finish_override_valid_v1(uuid,uuid)
  to service_role;

create or replace view public.v_tcgplayer_market_qualification_candidates_v3
with (security_invoker = true) as
select adapted.*
from public.v_tcgplayer_market_qualification_candidates_v2 candidate
left join lateral (
  select assignment.*
  from public.market_evidence_variant_assignments assignment
  where assignment.source_family = 'tcgcsv_market_close'
    and assignment.source_table = 'tcgcsv_source_price_daily_observations'
    and assignment.source_row_id = candidate.source_observation_id
    and assignment.variant_assignment_version =
      'MEE_TCGPLAYER_REVIEWED_FINISH_OVERRIDE_V1'
    and public.pokemon_tcgplayer_reviewed_finish_override_valid_v1(
      assignment.id, candidate.source_observation_id)
  order by assignment.created_at desc, assignment.id desc
  limit 1
) reviewed_override on true
cross join lateral jsonb_populate_record(
  null::public.v_tcgplayer_market_qualification_candidates_v2,
  to_jsonb(candidate) || case when reviewed_override.id is not null then jsonb_build_object(
    'normalized_finish_key', reviewed_override.assigned_finish_key,
    'card_printing_mapping_count', 1,
    'card_printing_id', reviewed_override.card_printing_id,
    'printing_gv_id', reviewed_override.printing_gv_id,
    'finish_key', reviewed_override.assigned_finish_key,
    'variant_assignment_id', reviewed_override.id,
    'variant_assignment_status', reviewed_override.variant_assignment_status,
    'variant_assignment_version', reviewed_override.variant_assignment_version,
    'variant_assignment_confidence', reviewed_override.variant_assignment_confidence,
    'derived_variant_assignment_status', 'exact_child_finish',
    'mapping_method', 'reviewed_finish_override_v1',
    'cosmos_finish_authority', false
  ) else '{}'::jsonb end
) adapted;

revoke all on public.v_tcgplayer_market_qualification_candidates_v3
  from public, anon, authenticated;
grant select on public.v_tcgplayer_market_qualification_candidates_v3
  to service_role;

comment on view public.v_tcgplayer_market_qualification_candidates_v3 is
  'V2 candidate projection plus two exact evidence-bound MEP Normal-to-holo overrides; raw source subtype remains unchanged.';

notify pgrst, 'reload schema';
commit;
