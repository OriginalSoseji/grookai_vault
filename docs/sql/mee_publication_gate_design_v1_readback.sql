-- MEE-PUBLICATION-GATE-DESIGN-V1 readback candidates.
-- Read-only verification SQL for the proposed internal publication gate candidate view.

select
  count(*)::bigint as candidate_rows,
  count(*) filter (where would_be_publication_candidate)::bigint as internal_publication_candidates,
  count(*) filter (where publishable or app_visible or market_truth or can_publish_price_directly)::bigint as public_boundary_leak_rows
from public.v_market_evidence_publication_gate_candidates_v1;

select
  gate_decision,
  evidence_lane,
  count(*)::bigint as rows
from public.v_market_evidence_publication_gate_candidates_v1
group by gate_decision, evidence_lane
order by gate_decision, evidence_lane;

select
  has_table_privilege('public', 'public.v_market_evidence_publication_gate_candidates_v1', 'select') as public_select,
  has_table_privilege('anon', 'public.v_market_evidence_publication_gate_candidates_v1', 'select') as anon_select,
  has_table_privilege('authenticated', 'public.v_market_evidence_publication_gate_candidates_v1', 'select') as authenticated_select,
  has_table_privilege('service_role', 'public.v_market_evidence_publication_gate_candidates_v1', 'select') as service_role_select;

