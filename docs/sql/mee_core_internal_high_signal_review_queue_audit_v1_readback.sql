-- MEE_CORE_INTERNAL_HIGH_SIGNAL_REVIEW_QUEUE_AUDIT_V1 readback SQL.
-- Read-only audit for pending high_signal_review rows.


with high_signal_rows as (
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
    d.publishable,
    d.app_visible,
    d.market_truth,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    d.evidence_summary,
    d.blocker_summary,
    d.source_mix,
    q.dashboard_queue,
    q.evidence_count,
    q.active_listing_evidence_count,
    q.reference_evidence_count,
    q.source_family_count,
    q.rollup_eligible_count,
    q.raw_single_count,
    q.slab_count,
    q.internal_rollup_candidate,
    s.quality_flag_count,
    s.exclusion_flag_count,
    s.model_eligible_count,
    s.publishable_count,
    s.app_visible_count,
    s.market_truth_count
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_review_dashboard_queue_v1 q on q.disposition_id = d.id
  left join public.v_market_evidence_card_signal_summary_v1 s on s.card_print_id = d.card_print_id
  left join public.card_prints cp on cp.id = d.card_print_id
  where d.review_lane = 'high_signal_review'
    and d.review_status = 'pending'
    and d.review_disposition = 'review_pending_high_signal'
)

select
  'MEE_CORE_INTERNAL_HIGH_SIGNAL_REVIEW_QUEUE_AUDIT_V1'::text as package_id,
  (select count(*)::int from high_signal_rows) as pending_high_signal_rows,
  (select count(*)::int from high_signal_rows where needs_review = true) as needs_review_rows,
  (select count(*)::int from high_signal_rows where internal_rollup_candidate = true) as internal_rollup_candidate_rows,
  (select count(*)::int from high_signal_rows where source_family_count >= 2) as source_family_ready_rows,
  (select count(*)::int from high_signal_rows where rollup_eligible_count >= 10) as rollup_threshold_ready_rows,
  (select count(*)::int from high_signal_rows where evidence_lane = 'raw_single') as raw_single_lane_rows,
  (select count(*)::int from high_signal_rows where evidence_lane = 'slab') as slab_lane_rows,
  (select count(*)::int from high_signal_rows where evidence_lane = 'mixed_raw_slab') as mixed_raw_slab_lane_rows,
  (select count(*)::int from high_signal_rows where evidence_lane = 'reference_metric') as reference_metric_lane_rows,
  (select count(*)::int from high_signal_rows where active_listing_evidence_count > 0) as active_listing_involved_rows,
  (select count(*)::int from high_signal_rows where reference_evidence_count > 0) as reference_involved_rows,
  (select count(*)::int from high_signal_rows where active_listing_evidence_count = 0 and reference_evidence_count > 0) as reference_only_rows,
  (select count(*)::int from high_signal_rows where raw_single_count > 0 and slab_count > 0) as mixed_raw_slab_count_rows,
  (select count(*)::int from high_signal_rows where exclusion_flag_count > 0) as exclusion_flagged_rows,
  (select count(*)::int from high_signal_rows where quality_flag_count > 0) as quality_flagged_rows,
  (select count(*)::int from high_signal_rows where publishable or app_visible or market_truth or publication_gate_candidate or can_publish_price_directly) as public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references;
