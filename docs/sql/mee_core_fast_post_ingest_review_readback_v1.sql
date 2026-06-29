-- MEE_CORE_FAST_POST_INGEST_REVIEW_READBACK_V1
-- Fast daily review readback. Uses disposition/action tables only.
-- No provider calls, no writes, no public pricing, no heavy evidence summary joins.

with status_rows as (
  select
    review_lane,
    evidence_lane,
    review_status,
    review_disposition,
    needs_review,
    count(*)::int as rows
  from public.market_evidence_review_dispositions
  group by 1,2,3,4,5
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
    (
      select count(*)::int
      from pg_views
      where schemaname = 'public'
        and viewname = 'v_card_pricing_ui_v1'
        and definition ilike '%market_evidence%'
    ) as public_pricing_view_market_evidence_references
)
select
  'MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1'::text as package_id,
  (select jsonb_agg(to_jsonb(status_rows) order by review_lane, evidence_lane, review_status, review_disposition, needs_review) from status_rows) as current_status,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary,
  (select to_jsonb(object_counts) from object_counts) as object_counts;
