-- MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1 local SQL/view candidates.
-- Plan only. Do not apply remotely without a separate targeted approval.
-- Internal-only review dashboard read models. No public pricing views, no app-visible pricing,
-- no price rollups, no pricing_observations writes, no identity/vault/image writes.

create or replace view public.v_market_evidence_review_dashboard_queue_v1
with (security_invoker = true)
as
select
  d.id as disposition_id,
  d.card_print_id,
  d.gv_id,
  d.review_lane,
  d.evidence_lane,
  d.review_status,
  d.review_disposition,
  d.review_actor,
  d.reviewed_at,
  d.needs_review,
  q.evidence_count,
  q.reference_evidence_count,
  q.active_listing_evidence_count,
  q.source_family_count,
  q.rollup_eligible_count,
  q.raw_single_count,
  q.slab_count,
  q.internal_rollup_candidate,
  s.publishable_count,
  s.app_visible_count,
  s.market_truth_count,
  case
    when d.evidence_lane = 'mixed_raw_slab' then 'mixed_raw_slab_split_queue'
    when d.evidence_lane = 'classification_blocked' then 'classification_blocked_queue'
    when d.evidence_lane = 'reference_metric' then 'reference_only_queue'
    when d.evidence_lane = 'low_signal' then 'low_signal_monitor'
    when d.evidence_lane = 'unknown' then 'unknown_evidence_review'
    when d.review_lane = 'high_signal_review' then 'high_signal_candidate_queue'
    else 'standard_candidate_review'
  end as dashboard_queue,
  case
    when d.review_status = 'resolved'
     and d.review_disposition = 'review_confirmed_internal_candidate'
     and d.evidence_lane in ('raw_single', 'slab')
     and d.publication_gate_candidate = false
     and d.can_publish_price_directly = false
     and d.publishable = false
     and d.app_visible = false
     and d.market_truth = false
     and coalesce(s.publishable_count, 0) = 0
     and coalesce(s.app_visible_count, 0) = 0
     and coalesce(s.market_truth_count, 0) = 0
    then true
    else false
  end as publication_gate_handoff_candidate,
  true as internal_only,
  false as publishable,
  false as app_visible,
  false as market_truth
from public.market_evidence_review_dispositions d
left join public.v_market_evidence_card_review_queue_v1 q
  on q.card_print_id = d.card_print_id
 and q.review_lane = d.review_lane
left join public.v_market_evidence_card_signal_summary_v1 s
  on s.card_print_id = d.card_print_id;

create or replace view public.v_market_evidence_review_dashboard_status_summary_v1
with (security_invoker = true)
as
select
  dashboard_queue,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  count(*)::int as card_count,
  count(*) filter (where publication_gate_handoff_candidate)::int as handoff_candidate_count,
  false as publishable,
  false as app_visible,
  false as market_truth
from public.v_market_evidence_review_dashboard_queue_v1
group by dashboard_queue, review_lane, evidence_lane, review_status, review_disposition;

create or replace view public.v_market_evidence_review_dashboard_blocker_queue_v1
with (security_invoker = true)
as
select *
from public.v_market_evidence_review_dashboard_queue_v1
where dashboard_queue in (
  'mixed_raw_slab_split_queue',
  'classification_blocked_queue',
  'reference_only_queue',
  'unknown_evidence_review'
);

revoke all on public.v_market_evidence_review_dashboard_queue_v1 from public, anon, authenticated;
revoke all on public.v_market_evidence_review_dashboard_status_summary_v1 from public, anon, authenticated;
revoke all on public.v_market_evidence_review_dashboard_blocker_queue_v1 from public, anon, authenticated;

grant select on public.v_market_evidence_review_dashboard_queue_v1 to service_role;
grant select on public.v_market_evidence_review_dashboard_status_summary_v1 to service_role;
grant select on public.v_market_evidence_review_dashboard_blocker_queue_v1 to service_role;
