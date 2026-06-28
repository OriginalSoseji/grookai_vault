-- MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1 final readback SQL.
-- Read-only. This proves post-ingest remains internal-only.

with lifecycle_stages as (
  select
    to_state as lifecycle_state,
    count(*)::bigint as rows
  from public.market_evidence_lifecycle_events
  group by to_state
), cleanup_state as (
  select
    cleanup_state,
    count(*)::bigint as rows
  from public.v_market_listing_candidate_cleanup_current_v1
  group by cleanup_state
), review_boundary as (
  select
    count(*)::bigint as rows,
    count(*) filter (
      where publication_gate_candidate
         or can_publish_price_directly
         or publishable
         or app_visible
         or market_truth
    )::bigint as public_boundary_rows
  from public.market_evidence_review_dispositions
), public_boundary as (
  select
    (select public_boundary_rows from review_boundary)::bigint
      + (select count(*) from public.market_evidence_lifecycle_events where publishable or app_visible or market_truth)::bigint
      as public_boundary_rows
), lifecycle_rollup_summary as (
  select
    count(*)::bigint as summary_rows,
    max(refreshed_at) as refreshed_at,
    count(*) filter (where lifecycle_public_boundary_leaks > 0)::bigint as lifecycle_public_boundary_leak_cards
  from public.mv_market_evidence_lifecycle_rollup_summary_v1
)
select
  'MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1'::text as package_id,
  (select jsonb_agg(to_jsonb(lifecycle_stages) order by lifecycle_state) from lifecycle_stages) as lifecycle_current,
  (select jsonb_agg(to_jsonb(cleanup_state) order by cleanup_state) from cleanup_state) as cleanup_state,
  (select to_jsonb(review_boundary) from review_boundary) as review_boundary,
  (select to_jsonb(lifecycle_rollup_summary) from lifecycle_rollup_summary) as lifecycle_rollup_summary,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary,
  'materialized_lifecycle_rollup_summary'::text as publication_gate_recheck_mode;
