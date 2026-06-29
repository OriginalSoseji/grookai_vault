-- MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1 readback.
-- Read-only. No function invocation. No DB writes.

with gate_rows as (
  select
    disposition_id,
    card_print_id,
    gv_id,
    evidence_lane,
    review_lane,
    review_status,
    review_disposition,
    can_publish_price_directly,
    publishable,
    app_visible,
    market_truth
  from public.v_market_evidence_publication_gate_candidates_v1
  where gate_decision = 'defer_review_confirmation'
    and evidence_lane in ('raw_single', 'slab')
)
select
  count(*)::bigint as gate_rows,
  count(*) filter (where evidence_lane = 'raw_single')::bigint as raw_single_rows,
  count(*) filter (where evidence_lane = 'slab')::bigint as slab_rows,
  count(*) filter (where review_lane not in ('candidate_review', 'high_signal_review'))::bigint as transition_lane_hold_rows,
  count(*) filter (where review_status not in ('pending', 'in_review'))::bigint as transition_status_hold_rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from gate_rows;

with gate_rows as (
  select card_print_id, evidence_lane
  from public.v_market_evidence_publication_gate_candidates_v1
  where gate_decision = 'defer_review_confirmation'
    and evidence_lane in ('raw_single', 'slab')
)
select
  gate_rows.evidence_lane,
  count(distinct gate_rows.card_print_id)::bigint as card_prints,
  count(candidates.id)::bigint as candidate_rows,
  count(candidates.id) filter (where candidates.needs_review)::bigint as candidate_rows_needing_review,
  count(candidates.id) filter (
    where candidates.exclusion_flags is not null
      and candidates.exclusion_flags <> '{}'::jsonb
      and candidates.exclusion_flags <> '[]'::jsonb
  )::bigint as candidate_rows_with_exclusions,
  min(candidates.match_confidence)::numeric as min_match_confidence,
  avg(candidates.match_confidence)::numeric as avg_match_confidence
from gate_rows
left join public.market_listing_card_candidates candidates
  on candidates.card_print_id = gate_rows.card_print_id
group by gate_rows.evidence_lane
order by gate_rows.evidence_lane;

