-- MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1 preflight SQL.
-- Read-only. No provider calls, no writes, no public pricing.

with lifecycle_counts as (
  select
    count(*)::bigint as observation_rows,
    0::bigint as public_boundary_rows
  from public.market_evidence_observations
), event_counts as (
  select
    count(*)::bigint as lifecycle_event_rows,
    count(*) filter (where publishable or app_visible or market_truth)::bigint as public_boundary_rows
  from public.market_evidence_lifecycle_events
), cleanup_counts as (
  select
    count(*)::bigint as cleanup_event_rows,
    count(distinct candidate_id)::bigint as cleanup_candidate_rows
  from public.market_listing_candidate_cleanup_events
), review_boundary_counts as (
  select
    count(*)::bigint as review_disposition_rows,
    count(*) filter (
      where publication_gate_candidate
         or can_publish_price_directly
         or publishable
         or app_visible
         or market_truth
    )::bigint as public_boundary_rows
  from public.market_evidence_review_dispositions
)
select
  'MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1'::text as package_id,
  (select to_jsonb(lifecycle_counts) from lifecycle_counts) as lifecycle_counts,
  (select to_jsonb(event_counts) from event_counts) as event_counts,
  (select to_jsonb(cleanup_counts) from cleanup_counts) as cleanup_counts,
  (select to_jsonb(review_boundary_counts) from review_boundary_counts) as review_boundary_counts,
  'heavy_publication_gate_candidate_view_deferred_to_explicit_audit'::text as publication_gate_recheck_mode;
