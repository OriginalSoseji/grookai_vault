-- MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_PLAN_V1 readback SQL.
-- Intended for use only after a separately approved seed apply.

select
  'MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1'::text as package_id,
  count(*)::int as disposition_rows,
  count(*) filter (where review_actor = 'system_seed_plan')::int as seed_plan_rows,
  count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
  count(*) filter (where can_publish_price_directly)::int as direct_publish_rows,
  count(*) filter (where publishable)::int as publishable_rows,
  count(*) filter (where app_visible)::int as app_visible_rows,
  count(*) filter (where market_truth)::int as market_truth_rows
from public.market_evidence_review_dispositions;

select
  'MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1'::text as package_id,
  review_lane,
  review_disposition,
  evidence_lane,
  count(*)::int as row_count
from public.market_evidence_review_dispositions
where review_actor = 'system_seed_plan'
group by review_lane, review_disposition, evidence_lane
order by row_count desc, review_lane, evidence_lane;
