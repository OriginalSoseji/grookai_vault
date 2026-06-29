-- MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1 readback query candidates.
-- Internal review workflow only. No writes, no public pricing, no app-visible pricing.

select
  review_lane,
  count(*)::int as card_count,
  sum(evidence_count)::int as evidence_count,
  sum(rollup_eligible_count)::int as rollup_eligible_count,
  sum(reference_evidence_count)::int as reference_evidence_count,
  sum(active_listing_evidence_count)::int as active_listing_evidence_count,
  sum(raw_single_count)::int as raw_single_count,
  sum(slab_count)::int as slab_count,
  count(*) filter (where internal_rollup_candidate)::int as internal_rollup_candidate_count,
  sum(publishable_count)::int as publishable_count,
  sum(app_visible_count)::int as app_visible_count,
  sum(market_truth_count)::int as market_truth_count
from public.v_market_evidence_card_review_queue_v1
group by review_lane
order by card_count desc, review_lane;

select
  count(*)::int as card_signal_rows,
  count(*) filter (where publishable_count > 0)::int as cards_with_publishable_flags,
  count(*) filter (where app_visible_count > 0)::int as cards_with_app_visible_flags,
  count(*) filter (where market_truth_count > 0)::int as cards_with_market_truth_flags,
  count(*) filter (where raw_single_count > 0 and slab_count > 0)::int as mixed_raw_slab_cards
from public.v_market_evidence_card_signal_summary_v1;
