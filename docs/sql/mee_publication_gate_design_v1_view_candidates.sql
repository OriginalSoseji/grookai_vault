-- MEE-PUBLICATION-GATE-DESIGN-V1 local SQL/view candidate.
-- Internal-only publication gate candidate evaluator.
-- Do not apply remotely without a separate targeted schema approval.
-- This view does not publish pricing and does not create market truth.

create or replace view public.v_market_evidence_publication_gate_candidates_v1
with (security_invoker = true)
as
with dashboard as (
  select
    id as disposition_id,
    card_print_id,
    gv_id,
    review_lane,
    evidence_lane,
    review_status,
    review_disposition,
    case
      when evidence_lane = 'mixed_raw_slab' then 'mixed_raw_slab_split_queue'
      when evidence_lane = 'classification_blocked' then 'classification_blocked_queue'
      when evidence_lane = 'reference_metric' then 'reference_only_queue'
      when evidence_lane = 'low_signal' then 'low_signal_monitor'
      when evidence_lane = 'unknown' then 'unknown_evidence_review'
      when review_lane = 'high_signal_review' then 'high_signal_candidate_queue'
      else 'standard_candidate_review'
    end as dashboard_queue,
    (
      review_status = 'resolved'
      and review_disposition = 'review_confirmed_internal_candidate'
      and evidence_lane in ('raw_single', 'slab')
      and publication_gate_candidate = false
      and can_publish_price_directly = false
      and publishable = false
      and app_visible = false
      and market_truth = false
    ) as publication_gate_handoff_candidate
  from public.market_evidence_review_dispositions
), assignment_blockers as (
  select
    card_print_id,
    count(*) filter (
      where assignment_queue_reason in ('missing_card_print_id', 'missing_gv_id', 'public_boundary_violation')
    )::int as identity_or_boundary_assignment_blockers
  from public.v_market_evidence_normalization_assignment_queue_v1
  where card_print_id is not null
  group by card_print_id
), quality_summary as (
  select
    card_print_id,
    evidence_lane,
    count(*)::int as quality_rows,
    count(*) filter (where quality_rollup_eligible)::int as quality_rollup_eligible_rows,
    count(*) filter (where hard_exclusion_flag or lane_mismatch_raw_vs_slab or manual_policy_flag or low_match_confidence)::int as quality_blocker_rows,
    count(*) filter (where publishable or app_visible or market_truth)::int as quality_public_boundary_leaks
  from public.v_market_evidence_candidate_quality_scores_v1
  group by card_print_id, evidence_lane
), evaluated as (
  select
    d.disposition_id,
    d.card_print_id,
    d.gv_id,
    d.review_lane,
    d.evidence_lane,
    d.review_status,
    d.review_disposition,
    d.dashboard_queue,
    d.publication_gate_handoff_candidate,
    coalesce(a.identity_or_boundary_assignment_blockers, 0) as identity_or_boundary_assignment_blockers,
    coalesce(l.lifecycle_public_boundary_leaks, 0) as lifecycle_public_boundary_leaks,
    coalesce(q.quality_public_boundary_leaks, 0) as quality_public_boundary_leaks,
    coalesce(q.quality_blocker_rows, 0) as quality_blocker_rows,
    coalesce(q.quality_rollup_eligible_rows, 0) as quality_rollup_eligible_rows,
    coalesce(l.rollup_raw_single_events, 0) as rollup_raw_single_events,
    coalesce(l.rollup_slab_events, 0) as rollup_slab_events,
    coalesce(l.rollup_reference_events, 0) as rollup_reference_events,
    l.latest_rollup_eligible_at,
    case
      when d.card_print_id is null or d.gv_id is null then 'blocked_identity'
      when coalesce(a.identity_or_boundary_assignment_blockers, 0) > 0 then 'blocked_identity'
      when coalesce(l.lifecycle_public_boundary_leaks, 0) > 0 or coalesce(q.quality_public_boundary_leaks, 0) > 0 then 'blocked_public_boundary'
      when d.evidence_lane = 'mixed_raw_slab' then 'blocked_lane_split_required'
      when d.evidence_lane = 'classification_blocked' then 'blocked_classification'
      when d.evidence_lane = 'reference_metric' then 'blocked_reference_only'
      when d.evidence_lane in ('low_signal', 'unknown') then 'blocked_low_signal'
      when coalesce(q.quality_blocker_rows, 0) > 0 then 'blocked_quality'
      when d.review_status <> 'resolved' or d.review_disposition <> 'review_confirmed_internal_candidate' then 'defer_review_confirmation'
      when d.evidence_lane = 'raw_single' and coalesce(l.rollup_raw_single_events, 0) < 5 then 'defer_more_evidence'
      when d.evidence_lane = 'slab' and coalesce(l.rollup_slab_events, 0) < 3 then 'defer_more_evidence'
      when l.latest_rollup_eligible_at is null then 'blocked_stale'
      when d.evidence_lane = 'raw_single' and l.latest_rollup_eligible_at < now() - interval '14 days' then 'blocked_stale'
      when d.evidence_lane = 'slab' and l.latest_rollup_eligible_at < now() - interval '30 days' then 'blocked_stale'
      when d.publication_gate_handoff_candidate then 'internal_publication_candidate'
      else 'defer_more_evidence'
    end as gate_decision
  from dashboard d
  left join assignment_blockers a on a.card_print_id = d.card_print_id
  left join public.mv_market_evidence_lifecycle_rollup_summary_v1 l on l.card_print_id = d.card_print_id
  left join quality_summary q
    on q.card_print_id = d.card_print_id
   and q.evidence_lane = d.evidence_lane
)
select
  *,
  gate_decision = 'internal_publication_candidate' as would_be_publication_candidate,
  true as internal_only,
  false as can_publish_price_directly,
  false as publishable,
  false as app_visible,
  false as market_truth
from evaluated;

revoke all on public.v_market_evidence_publication_gate_candidates_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_publication_gate_candidates_v1 to service_role;
