select
  bridge_state,
  count(*)::bigint as rows,
  count(*) filter (where internal_bridge_candidate)::bigint as internal_bridge_candidates,
  count(*) filter (where publishable or app_visible or market_truth or can_publish_price_directly)::bigint as public_boundary_leaks
from public.v_market_evidence_publication_bridge_candidates_v1
group by bridge_state
order by rows desc;

