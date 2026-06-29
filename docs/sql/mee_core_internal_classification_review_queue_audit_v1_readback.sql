-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_QUEUE_AUDIT_V1 readback SQL.
-- Read-only audit for pending classification_review rows.

with classification_rows as (
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
    s.model_eligible_count
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_review_dashboard_queue_v1 q on q.disposition_id = d.id
  left join public.v_market_evidence_card_signal_summary_v1 s on s.card_print_id = d.card_print_id
  left join public.card_prints cp on cp.id = d.card_print_id
  where d.review_lane = 'classification_review'
    and d.review_status = 'pending'
    and d.review_disposition = 'review_pending_classification_fix'
)
select
  'MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_QUEUE_AUDIT_V1'::text as package_id,
  (select count(*)::int from classification_rows) as pending_classification_rows,
  (select count(*)::int from classification_rows where needs_review = true) as needs_review_rows,
  (select count(*)::int from classification_rows where evidence_lane = 'classification_blocked') as classification_blocked_rows,
  (select count(*)::int from classification_rows where active_listing_evidence_count > 0 and reference_evidence_count = 0) as active_only_rows,
  (select count(*)::int from classification_rows where rollup_eligible_count = 0) as no_rollup_eligible_rows,
  (select count(*)::int from classification_rows where raw_single_count = 0 and slab_count = 0) as no_raw_or_slab_classification_rows,
  (select count(*)::int from classification_rows where exclusion_flag_count > 0) as exclusion_flagged_rows,
  (select count(*)::int from classification_rows where publishable or app_visible or market_truth or publication_gate_candidate or can_publish_price_directly) as public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references;
