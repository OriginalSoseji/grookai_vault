-- MEE-PUBLICATION-GATE-REVIEW-ACTION-PLAN-V1 preflight.
-- Read-only. No function invocation. No DB writes.

select
  gate_decision,
  evidence_lane,
  review_lane,
  review_status,
  review_disposition,
  count(*)::bigint as rows,
  count(*) filter (where would_be_publication_candidate)::bigint as would_be_publication_candidate_rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.v_market_evidence_publication_gate_candidates_v1
group by gate_decision, evidence_lane, review_lane, review_status, review_disposition
order by gate_decision, evidence_lane, review_lane, review_status, review_disposition;

select
  count(*)::bigint as review_confirmation_required_rows,
  count(*) filter (where evidence_lane = 'raw_single')::bigint as raw_single_rows,
  count(*) filter (where evidence_lane = 'slab')::bigint as slab_rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.v_market_evidence_publication_gate_candidates_v1
where gate_decision = 'defer_review_confirmation'
  and evidence_lane in ('raw_single', 'slab');

