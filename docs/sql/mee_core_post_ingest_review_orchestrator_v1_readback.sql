-- MEE_CORE_POST_INGEST_REVIEW_ORCHESTRATOR_V1 readback SQL.
-- Read-only post-ingest review status. No provider calls, no writes, no public pricing.

with queue_rows as (
  select
    d.id as disposition_id,
    d.card_print_id,
    d.gv_id,
    cp.name,
    cp.set_code,
    cp.number,
    cp.rarity,
    cp.variant_key,
    d.review_lane,
    d.evidence_lane,
    d.review_status,
    d.review_disposition,
    d.needs_review,
    d.review_actor,
    d.updated_at,
    d.publishable,
    d.app_visible,
    d.market_truth,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    q.dashboard_queue,
    q.evidence_count,
    q.reference_evidence_count,
    q.active_listing_evidence_count,
    q.source_family_count,
    q.rollup_eligible_count,
    q.raw_single_count,
    q.slab_count,
    q.internal_rollup_candidate,
    q.publication_gate_handoff_candidate,
    s.quality_flag_count,
    s.exclusion_flag_count,
    s.model_eligible_count
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_review_dashboard_queue_v1 q
    on q.disposition_id = d.id
  left join public.v_market_evidence_card_signal_summary_v1 s
    on s.card_print_id = d.card_print_id
  left join public.card_prints cp
    on cp.id = d.card_print_id
), current_status as (
  select
    review_lane,
    evidence_lane,
    review_status,
    review_disposition,
    needs_review,
    count(*)::int as rows
  from queue_rows
  group by 1,2,3,4,5
), public_boundary as (
  select
    count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from queue_rows
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
  'MEE_CORE_POST_INGEST_REVIEW_ORCHESTRATOR_V1'::text as package_id,
  (select jsonb_agg(to_jsonb(current_status) order by review_lane, evidence_lane, review_status, review_disposition, needs_review) from current_status) as current_status,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary,
  (select to_jsonb(object_counts) from object_counts) as object_counts;
