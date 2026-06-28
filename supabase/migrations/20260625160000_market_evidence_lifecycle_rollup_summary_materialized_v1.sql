-- MEE-LIFECYCLE-ROLLUP-SUMMARY-MATERIALIZED-V1
-- Purpose: internal materialized read model for publication-gate review.
-- Boundary: derived internal read model only. No public pricing, no app-visible pricing, no provider calls.

begin;

create materialized view if not exists public.mv_market_evidence_lifecycle_rollup_summary_v1 as
select
  o.card_print_id,
  count(*) filter (
    where e.to_state = 'rollup_eligible'
      and e.rollup_eligible = true
      and e.source_type = 'active_listing'
      and e.evidence_class = 'raw_single'
  )::int as rollup_raw_single_events,
  count(*) filter (
    where e.to_state = 'rollup_eligible'
      and e.rollup_eligible = true
      and e.source_type = 'active_listing'
      and e.evidence_class = 'slab'
  )::int as rollup_slab_events,
  count(*) filter (
    where e.to_state = 'rollup_eligible'
      and e.rollup_eligible = true
      and e.source_type = 'reference'
      and e.evidence_class = 'reference_metric'
  )::int as rollup_reference_events,
  max(e.occurred_at) filter (
    where e.to_state = 'rollup_eligible'
      and e.rollup_eligible = true
  )::timestamptz as latest_rollup_eligible_at,
  count(*) filter (
    where e.publishable
       or e.app_visible
       or e.market_truth
  )::int as lifecycle_public_boundary_leaks,
  now()::timestamptz as refreshed_at
from public.market_evidence_lifecycle_events e
join public.market_evidence_observations o on o.id = e.observation_id
where o.card_print_id is not null
  and (
    (e.to_state = 'rollup_eligible' and e.rollup_eligible = true)
    or e.publishable
    or e.app_visible
    or e.market_truth
  )
group by o.card_print_id;

create unique index if not exists mv_market_evidence_lifecycle_rollup_summary_v1_card_idx
  on public.mv_market_evidence_lifecycle_rollup_summary_v1 (card_print_id);

revoke all on public.mv_market_evidence_lifecycle_rollup_summary_v1 from public, anon, authenticated;
grant select on public.mv_market_evidence_lifecycle_rollup_summary_v1 to service_role;

select
  'MEE-LIFECYCLE-ROLLUP-SUMMARY-MATERIALIZED-V1'::text as package_id,
  'public.mv_market_evidence_lifecycle_rollup_summary_v1'::text as proposed_object,
  false::boolean as provider_calls,
  false::boolean as source_fetches,
  false::boolean as pricing_observations_writes,
  false::boolean as ebay_active_prices_latest_writes,
  false::boolean as public_pricing_views,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollups,
  false::boolean as identity_writes,
  false::boolean as vault_writes,
  false::boolean as image_storage_writes;

commit;
