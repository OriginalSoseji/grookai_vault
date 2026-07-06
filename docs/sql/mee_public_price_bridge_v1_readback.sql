-- MEE_PUBLIC_PRICE_BRIDGE_V1 readback.

with bridge as (
  select *
  from public.v_market_evidence_public_price_bridge_v1
), ui as (
  select *
  from public.v_card_pricing_ui_v1
), boundary as (
  select
    count(*) filter (where market_truth)::int as market_truth_rows,
    count(*) filter (where sold_comp)::int as sold_comp_rows,
    count(*) filter (where not active_listing_evidence)::int as non_active_listing_rows,
    count(*) filter (where primary_source <> 'ebay')::int as unexpected_source_rows,
    count(*) filter (where freshness_label = 'stale')::int as stale_rows
  from bridge
)
select
  'MEE_PUBLIC_PRICE_BRIDGE_V1'::text as package_id,
  (select count(*)::int from bridge) as bridge_rows,
  (select count(*)::int from ui) as ui_rows,
  (select to_jsonb(boundary) from boundary) as boundary,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  true::boolean as app_visible_pricing,
  false::boolean as sold_comp_truth,
  false::boolean as market_truth;
