-- MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1 preflight.
-- Read-only. No function invocation. No DB writes.

with held_review_rows as (
  select card_print_id, gv_id, evidence_lane
  from public.market_evidence_review_dispositions
  where review_lane = 'candidate_review'
    and evidence_lane in ('raw_single', 'slab')
    and card_print_id is not null
)
select
  review_rows.evidence_lane,
  count(distinct review_rows.card_print_id)::bigint as held_card_prints,
  count(candidates.id)::bigint as candidate_rows,
  count(candidates.id) filter (where candidates.match_status = 'needs_review')::bigint as candidate_rows_needing_review,
  count(candidates.id) filter (where coalesce(cardinality(candidates.exclusion_flags), 0) > 0)::bigint as candidate_rows_with_exclusions,
  count(candidates.id) filter (where candidates.can_publish_price_directly)::bigint as candidate_can_publish_true,
  min(candidates.match_confidence)::numeric as min_match_confidence,
  avg(candidates.match_confidence)::numeric as avg_match_confidence
from held_review_rows review_rows
left join public.market_listing_card_candidates candidates
  on candidates.card_print_id = review_rows.card_print_id
group by review_rows.evidence_lane
order by review_rows.evidence_lane;
