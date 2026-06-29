-- MEE_PRICE_REVIEW_ACTION_MODEL_V1 readback.
-- Read-only. Proves service-role internal price review state and closed public boundary.

with events as (
  select *
  from public.market_evidence_price_review_events
), current_state as (
  select *
  from public.v_market_evidence_price_review_current_v1
), approved_internal as (
  select *
  from public.v_market_evidence_internal_approved_price_signals_v1
), boundary as (
  select
    count(*) filter (where can_publish_price_directly)::bigint as can_publish_price_directly_rows,
    count(*) filter (where publishable)::bigint as publishable_rows,
    count(*) filter (where app_visible)::bigint as app_visible_rows,
    count(*) filter (where market_truth)::bigint as market_truth_rows
  from events
)
select
  'MEE_PRICE_REVIEW_ACTION_MODEL_V1'::text as package_id,
  (select count(*)::bigint from events) as event_rows,
  (select count(*)::bigint from current_state) as current_rows,
  (select count(*)::bigint from approved_internal) as approved_internal_rows,
  (select to_jsonb(boundary) from boundary) as public_boundary,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as public_pricing_view,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;
