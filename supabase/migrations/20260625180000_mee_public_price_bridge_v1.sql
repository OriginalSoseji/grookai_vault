-- MEE_PUBLIC_PRICE_BRIDGE_V1.
-- Public/authenticated read bridge from approved internal MEE price signals to
-- the card pricing UI compatibility surface.
-- This does not write pricing_observations or ebay_active_prices_latest.

create or replace view public.v_market_evidence_public_price_bridge_v1
with (security_invoker = true)
as
select
  signal.card_print_id,
  signal.gv_id,
  signal.currency,
  signal.candidate_median as primary_price,
  signal.candidate_median as grookai_value,
  signal.candidate_low as min_price,
  signal.candidate_high as max_price,
  signal.minimum_active_ask,
  signal.maximum_active_ask,
  signal.evidence_count as active_listing_count,
  signal.seller_count,
  signal.signal_at,
  signal.price_review_event_created_at as reviewed_at,
  'ebay'::text as primary_source,
  'active_listing_market_estimate'::text as pricing_basis,
  'Market estimate from active listing evidence'::text as display_label,
  case
    when signal.evidence_count >= 50 and signal.seller_count >= 12 then 'high'
    when signal.evidence_count >= 20 and signal.seller_count >= 8 then 'medium'
    else 'low'
  end as confidence_label,
  case
    when signal.signal_at >= now() - interval '3 days' then 'fresh'
    when signal.signal_at >= now() - interval '14 days' then 'aging'
    else 'stale'
  end as freshness_label,
  true as app_visible,
  false as market_truth,
  false as sold_comp,
  true as active_listing_evidence,
  true as signed_in_only
from public.v_market_evidence_internal_approved_price_signals_v1 signal
where signal.source_type = 'active_listing'
  and signal.evidence_lane = 'raw_single'
  and signal.candidate_median is not null
  and signal.currency = 'USD'
  and signal.signal_at >= now() - interval '14 days'
  and signal.can_publish_price_directly = false
  and signal.publishable = false
  and signal.app_visible = false
  and signal.market_truth = false;

revoke all on public.v_market_evidence_public_price_bridge_v1 from public, anon, authenticated, service_role;
grant select on public.v_market_evidence_public_price_bridge_v1 to authenticated, service_role;

create or replace view public.v_card_pricing_ui_v1
with (security_invoker = true)
as
select
  bridge.card_print_id,
  bridge.primary_price::numeric(12,2) as primary_price,
  bridge.primary_source,
  bridge.grookai_value,
  bridge.min_price::numeric(12,2) as min_price,
  bridge.max_price::numeric(12,2) as max_price,
  1::bigint as variant_count,
  bridge.primary_price::numeric(12,2) as ebay_median_price,
  bridge.active_listing_count::integer as ebay_listing_count,
  bridge.currency,
  bridge.pricing_basis,
  bridge.display_label,
  bridge.confidence_label,
  bridge.freshness_label,
  bridge.signal_at,
  bridge.reviewed_at,
  bridge.market_truth,
  bridge.sold_comp,
  bridge.active_listing_evidence
from public.v_market_evidence_public_price_bridge_v1 bridge;

revoke all on public.v_card_pricing_ui_v1 from public, anon, authenticated, service_role;
grant select on public.v_card_pricing_ui_v1 to authenticated, service_role;
