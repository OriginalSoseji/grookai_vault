-- MARKET_REFERENCE_TCGDEX_PRICING_SOURCE_CONSTRAINTS_V1 migration candidate.
-- Purpose: allow TCGdex TCGPlayer/Cardmarket reference pricing evidence in the internal
-- market_reference_* warehouse.
-- Boundary: no evidence backfill, no provider calls, no source fetches, no public/app-visible pricing.

begin;

alter table public.market_reference_candidates
  drop constraint if exists market_reference_candidates_source_check;

alter table public.market_reference_candidates
  add constraint market_reference_candidates_source_check check (
    source in (
      'tcgcsv_reference',
      'pokemontcg_io_reference',
      'ebay_active',
      'tcgdex_tcgplayer_reference',
      'tcgdex_cardmarket_reference'
    )
  );

alter table public.market_reference_candidates
  drop constraint if exists market_reference_candidates_source_type_check;

alter table public.market_reference_candidates
  add constraint market_reference_candidates_source_type_check check (
    (
      source in (
        'tcgcsv_reference',
        'pokemontcg_io_reference',
        'tcgdex_tcgplayer_reference',
        'tcgdex_cardmarket_reference'
      )
      and source_type = 'reference'
    )
    or (
      source = 'ebay_active'
      and source_type = 'active_listing'
    )
  );

alter table public.market_reference_normalized_evidence
  drop constraint if exists market_reference_normalized_evidence_source_check;

alter table public.market_reference_normalized_evidence
  add constraint market_reference_normalized_evidence_source_check check (
    source in (
      'tcgcsv_reference',
      'pokemontcg_io_reference',
      'ebay_active',
      'tcgdex_tcgplayer_reference',
      'tcgdex_cardmarket_reference'
    )
  );

alter table public.market_reference_normalized_evidence
  drop constraint if exists market_reference_normalized_evidence_disposition_check;

alter table public.market_reference_normalized_evidence
  add constraint market_reference_normalized_evidence_disposition_check check (
    (
      source in (
        'tcgcsv_reference',
        'pokemontcg_io_reference',
        'tcgdex_tcgplayer_reference',
        'tcgdex_cardmarket_reference'
      )
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
  'MARKET_REFERENCE_TCGDEX_PRICING_SOURCE_CONSTRAINTS_V1_MIGRATION_CANDIDATE'::text as package_id,
  0::int as proposed_table_count,
  0::int as proposed_index_count,
  0::int as proposed_new_policy_count,
  true::boolean as keeps_existing_service_role_only_policies,
  true::boolean as keeps_candidates_needs_review,
  true::boolean as keeps_candidates_no_direct_publish,
  false::boolean as writes_evidence_backfill,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as publishes_public_prices,
  false::boolean as creates_app_facing_pricing_view,
  false::boolean as creates_price_rollup;

commit;
