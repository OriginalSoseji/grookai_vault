-- MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1 readback SQL.
-- Read-only foundation status. No provider calls, no writes, no public pricing.

with disposition_status as (
  select
    review_lane,
    review_status,
    review_disposition,
    needs_review,
    publishable,
    app_visible,
    market_truth,
    count(*)::int as rows
  from public.market_evidence_review_dispositions
  group by 1,2,3,4,5,6,7
), public_boundary as (
  select
    count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from public.market_evidence_review_dispositions
), object_counts as (
  select
    (select count(*)::int from public.market_evidence_observations) as lifecycle_observation_rows,
    (select count(*)::int from public.market_evidence_lifecycle_events) as lifecycle_event_rows,
    (select count(*)::int from public.market_evidence_review_dispositions) as review_disposition_rows,
    (select count(*)::int from public.market_evidence_review_action_events) as review_action_event_rows,
    (select count(*)::int from public.pricing_observations) as pricing_observations_count,
    (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence%') as public_pricing_view_market_evidence_references
)
select
  'MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1'::text as package_id,
  (select jsonb_agg(to_jsonb(disposition_status) order by review_lane, review_status, review_disposition, needs_review) from disposition_status) as disposition_status,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary,
  (select to_jsonb(object_counts) from object_counts) as object_counts;
