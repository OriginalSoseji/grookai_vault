-- MEE-PUBLICATION-GATE-REVIEW-ACTION-PLAN-V1 readback.
-- Read-only proof that this plan does not invoke actions and keeps publication closed.

select
  count(*)::bigint as gate_rows,
  count(*) filter (where would_be_publication_candidate)::bigint as would_be_publication_candidate_rows,
  count(*) filter (where can_publish_price_directly)::bigint as can_publish_price_directly_rows,
  count(*) filter (where publishable)::bigint as publishable_rows,
  count(*) filter (where app_visible)::bigint as app_visible_rows,
  count(*) filter (where market_truth)::bigint as market_truth_rows
from public.v_market_evidence_publication_gate_candidates_v1;

select
  'no_apply_candidate_generated'::text as apply_candidate_status,
  0::bigint as planned_function_invocations,
  false::boolean as public_pricing_enabled,
  false::boolean as app_visible_pricing_enabled;

