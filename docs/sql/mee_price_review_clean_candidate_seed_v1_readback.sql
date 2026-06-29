-- MEE_PRICE_REVIEW_CLEAN_CANDIDATE_SEED_V1 readback.

with approved as (
  select *
  from public.v_market_evidence_internal_approved_price_signals_v1
), boundary as (
  select
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from approved
)
select
  'MEE_PRICE_REVIEW_CLEAN_CANDIDATE_SEED_V1'::text as package_id,
  (select count(*)::int from public.market_evidence_price_review_events) as price_review_event_rows,
  (select count(*)::int from approved) as approved_internal_rows,
  (select to_jsonb(boundary) from boundary) as public_boundary,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as public_pricing_view,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;
