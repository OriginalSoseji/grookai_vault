-- MEE-PUBLICATION-GATE-FAST-PATH-INDEXES-V1
-- Purpose: keep internal publication-gate review queries scalable after large reference-source drains.
-- Boundary: internal read-model support only. No public pricing, no app-visible pricing, no evidence writes.

begin;

create index if not exists market_evidence_lifecycle_events_rollup_eligible_fast_idx
  on public.market_evidence_lifecycle_events (
    observation_id,
    source_type,
    evidence_class,
    occurred_at desc
  )
  where to_state = 'rollup_eligible'
    and rollup_eligible = true;

create index if not exists market_evidence_lifecycle_events_public_boundary_fast_idx
  on public.market_evidence_lifecycle_events (observation_id)
  where publishable
     or app_visible
     or market_truth;

select
  'MEE-PUBLICATION-GATE-FAST-PATH-INDEXES-V1'::text as package_id,
  2::int as proposed_index_count,
  false::boolean as evidence_backfill,
  false::boolean as provider_calls,
  false::boolean as pricing_observations_writes,
  false::boolean as ebay_active_prices_latest_writes,
  false::boolean as public_pricing_views,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollups,
  false::boolean as identity_writes,
  false::boolean as vault_writes,
  false::boolean as image_storage_writes;

commit;
