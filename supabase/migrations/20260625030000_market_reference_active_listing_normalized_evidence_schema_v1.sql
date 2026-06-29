-- MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZED_EVIDENCE_SCHEMA_V1 migration candidate.
-- Purpose: extend internal normalized evidence constraints for review-only active-listing evidence.
-- Boundary: no evidence backfill, no pricing_observations writes, no ebay_active_prices_latest writes,
-- no public pricing views, no price rollups, and no app-visible pricing.
-- This is a local migration candidate, not a remote-applied migration.

begin;

alter table public.market_reference_normalized_evidence
  drop constraint if exists market_reference_normalized_evidence_source_check;

alter table public.market_reference_normalized_evidence
  add constraint market_reference_normalized_evidence_source_check check (
    source in ('tcgcsv_reference', 'pokemontcg_io_reference', 'ebay_active')
  );

alter table public.market_reference_normalized_evidence
  drop constraint if exists market_reference_normalized_evidence_disposition_check;

alter table public.market_reference_normalized_evidence
  add constraint market_reference_normalized_evidence_disposition_check check (
    (
      source in ('tcgcsv_reference', 'pokemontcg_io_reference')
      and model_disposition in (
        'reference_model_candidate',
        'quarantined_metric',
        'quarantined_price_outlier',
        'blocked_candidate'
      )
    )
    or (
      source = 'ebay_active'
      and model_disposition in (
        'review_required_active_listing',
        'quarantined_active_listing_context',
        'blocked_candidate'
      )
    )
  );

alter table public.market_reference_normalized_evidence
  drop constraint if exists market_reference_normalized_evidence_active_listing_review_only_check;

alter table public.market_reference_normalized_evidence
  add constraint market_reference_normalized_evidence_active_listing_review_only_check check (
    source <> 'ebay_active'
    or model_eligible = false
  );

select
  'MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZED_EVIDENCE_SCHEMA_V1_MIGRATION_CANDIDATE'::text as package_id,
  0::int as proposed_table_count,
  0::int as proposed_index_count,
  0::int as proposed_new_policy_count,
  true::boolean as keeps_existing_service_role_only_policies,
  true::boolean as forces_active_listing_model_eligible_false,
  false::boolean as writes_evidence_backfill,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as publishes_public_prices,
  false::boolean as creates_app_facing_pricing_view,
  false::boolean as creates_price_rollup;

commit;
