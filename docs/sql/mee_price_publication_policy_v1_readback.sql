-- MEE-PRICE-PUBLICATION-POLICY-V1 readback.
-- Read-only. Proves policy decisions and closed public boundary.

with policy as (
  select *
  from public.v_market_evidence_price_publication_policy_v1
), summary as (
  select
    price_policy_decision,
    source_type,
    evidence_lane,
    count(*)::int as rows,
    count(*) filter (where internal_price_policy_candidate)::int as internal_price_policy_candidate_rows,
    count(*) filter (where future_publication_review_candidate)::int as future_publication_review_candidate_rows,
    min(candidate_median) as min_candidate_median,
    percentile_cont(0.5) within group (order by candidate_median) filter (where candidate_median is not null) as median_candidate_median,
    max(candidate_median) as max_candidate_median
  from policy
  group by price_policy_decision, source_type, evidence_lane
), boundary as (
  select
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from policy
), samples as (
  select
    card_print_id,
    gv_id,
    source_type,
    evidence_lane,
    price_policy_decision,
    currency,
    candidate_median,
    candidate_low,
    candidate_high,
    evidence_count,
    seller_count,
    signal_at
  from policy
  where future_publication_review_candidate
  order by evidence_count desc, seller_count desc, candidate_median desc nulls last
  limit 50
)
select
  'MEE-PRICE-PUBLICATION-POLICY-V1'::text as package_id,
  (select count(*)::int from policy) as total_policy_rows,
  (select count(*)::int from policy where internal_price_policy_candidate) as internal_price_policy_candidate_rows,
  (select count(*)::int from policy where future_publication_review_candidate) as future_publication_review_candidate_rows,
  (select jsonb_agg(to_jsonb(summary) order by price_policy_decision, source_type, evidence_lane) from summary) as summary,
  (select to_jsonb(boundary) from boundary) as public_boundary,
  (select jsonb_agg(to_jsonb(samples) order by evidence_count desc, seller_count desc, candidate_median desc nulls last) from samples) as candidate_samples,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as public_pricing_view,
  false::boolean as app_visible_pricing,
  false::boolean as market_truth;
