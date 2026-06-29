-- MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1 preflight.
-- Read-only. No function invocation. No DB writes.

select
  gate_decision,
  evidence_lane,
  review_lane,
  review_status,
  review_disposition,
  count(*)::bigint as rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.v_market_evidence_publication_gate_candidates_v1
where gate_decision = 'defer_review_confirmation'
  and evidence_lane in ('raw_single', 'slab')
group by gate_decision, evidence_lane, review_lane, review_status, review_disposition
order by evidence_lane, review_lane, review_status, review_disposition;

select
  evidence_lane,
  count(*)::bigint as rows,
  count(*) filter (where lower(gv_id) like '%wcd%' or lower(gv_id) like '%mcd%' or lower(gv_id) like '%mep%' or lower(gv_id) like '%tk%')::bigint as likely_special_lane_rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.v_market_evidence_publication_gate_candidates_v1
where gate_decision = 'defer_review_confirmation'
  and evidence_lane in ('raw_single', 'slab')
group by evidence_lane
order by evidence_lane;

