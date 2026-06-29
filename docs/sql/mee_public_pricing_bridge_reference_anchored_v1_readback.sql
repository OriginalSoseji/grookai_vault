-- MEE-PUBLIC-PRICING-BRIDGE-REFERENCE-ANCHORED-V1 readback candidate.
--
-- Run only after the candidate view is applied in an approved environment.

with bridge as (
  select *
  from public.v_market_evidence_public_pricing_bridge_reference_anchored_v1
), mightyena as (
  select *
  from bridge
  where gv_id = 'GV-PK-HP-101'
), boundary as (
  select
    count(*) filter (where market_truth)::int as market_truth_rows,
    count(*) filter (where sold_comp)::int as sold_comp_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (
      where grookai_value_block_reason = 'blocked_no_valuation_anchor'
        and grookai_value_mid is not null
    )::int as active_only_grookai_value_leak_rows,
    count(*) filter (
      where grookai_value_mid = active_ask_mid
        and market_pressure_status in ('active_listings_above_reference', 'active_listings_below_reference')
    )::int as disagreement_active_ask_overwrite_rows
  from bridge
)
select
  'MEE-PUBLIC-PRICING-BRIDGE-REFERENCE-ANCHORED-V1'::text as package_id,
  (select count(*)::int from bridge) as bridge_rows,
  (select count(*)::int from bridge where grookai_value_mid is not null) as grookai_value_rows,
  (select count(*)::int from bridge where active_ask_mid is not null) as active_ask_rows,
  (select count(*)::int from bridge where grookai_value_block_reason is not null) as blocked_value_rows,
  (select to_jsonb(boundary) from boundary) as boundary,
  (select to_jsonb(mightyena) from mightyena limit 1) as mightyena_regression_row,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as uses_justtcg_public_pricing,
  false::boolean as sold_comp_truth,
  false::boolean as market_truth;

