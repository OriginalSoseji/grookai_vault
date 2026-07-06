-- MEE-PRICE-CANDIDATE-REVIEW-DASHBOARD-V1 readback.
-- Read-only. Proves internal price candidate review queues and public-boundary flags.

with queue_summary as (
  select
    review_queue,
    source_type,
    evidence_lane,
    confidence_tier,
    candidate_status,
    count(*)::int as rows,
    count(*) filter (where reviewer_candidate)::int as reviewer_candidate_rows,
    min(candidate_median) as min_candidate_median,
    percentile_cont(0.5) within group (order by candidate_median) filter (where candidate_median is not null) as median_candidate_median,
    max(candidate_median) as max_candidate_median
  from public.v_market_evidence_price_candidate_review_queue_v1
  group by review_queue, source_type, evidence_lane, confidence_tier, candidate_status
), public_boundary as (
  select
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from public.v_market_evidence_price_candidate_review_queue_v1
), high_value as (
  select
    card_print_id,
    gv_id,
    review_queue,
    source_type,
    evidence_lane,
    confidence_tier,
    candidate_status,
    currency,
    candidate_median,
    candidate_low,
    candidate_high,
    evidence_count,
    seller_count,
    source_count,
    signal_at
  from public.v_market_evidence_price_candidate_high_value_review_v1
  order by candidate_median desc nulls last
  limit 30
), grant_readback as (
  select
    table_name,
    grantee,
    privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'v_market_evidence_price_candidate_review_queue_v1',
      'v_market_evidence_price_candidate_review_summary_v1',
      'v_market_evidence_price_candidate_high_value_review_v1'
    )
  order by table_name, grantee, privilege_type
)
select
  'MEE-PRICE-CANDIDATE-REVIEW-DASHBOARD-V1'::text as package_id,
  (select count(*)::int from public.v_market_evidence_price_candidate_review_queue_v1) as total_queue_rows,
  (select count(*)::int from public.v_market_evidence_price_candidate_review_queue_v1 where reviewer_candidate) as reviewer_candidate_rows,
  (select count(*)::int from public.v_market_evidence_price_candidate_high_value_review_v1) as high_value_review_rows,
  (select jsonb_agg(to_jsonb(queue_summary) order by review_queue, source_type, evidence_lane, confidence_tier, candidate_status) from queue_summary) as queue_summary,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary,
  (select jsonb_agg(to_jsonb(high_value) order by candidate_median desc nulls last) from high_value) as high_value_samples,
  (select jsonb_agg(to_jsonb(grant_readback) order by table_name, grantee, privilege_type) from grant_readback) as grants,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as public_pricing_view,
  false::boolean as app_visible_pricing,
  false::boolean as market_truth;
