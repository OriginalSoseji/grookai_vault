-- MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1 readback.
-- Read-only. No function invocation. No DB writes.

with held_gate_rows as (
  select
    card_print_id,
    gv_id,
    evidence_lane,
    case
      when gv_id like 'GV-PK-WCD%' or gv_id like 'GV-PK-MCD%' or gv_id like 'GV-PK-MEP%' or gv_id like 'GV-PK-TK%' then true
      when gv_id like 'GV-PK-BASE1%' or gv_id like 'GV-PK-B1-SHADOWLESS%' or gv_id like 'GV-PK-B1-1ED%' or gv_id like 'GV-PK-B1-1999%' then true
      else false
    end as special_lane_hold
  from public.v_market_evidence_publication_gate_candidates_v1
  where gate_decision = 'defer_review_confirmation'
    and evidence_lane in ('raw_single', 'slab')
),
candidate_cleanup as (
  select
    candidates.id,
    gate.card_print_id,
    gate.evidence_lane,
    case
      when coalesce(cardinality(candidates.exclusion_flags), 0) > 0 then 'quarantine_candidate'
      when gate.special_lane_hold then 'require_special_lane_policy'
      when candidates.match_confidence < 0.90 then 'require_matcher_reclassify'
      when candidates.match_status = 'needs_review' then 'keep_review'
      else 'defer_until_more_evidence'
    end as cleanup_outcome,
    candidates.can_publish_price_directly
  from held_gate_rows gate
  join public.market_listing_card_candidates candidates
    on candidates.card_print_id = gate.card_print_id
)
select
  cleanup_outcome,
  evidence_lane,
  count(*)::bigint as candidate_rows,
  count(*) filter (where can_publish_price_directly)::bigint as public_boundary_candidate_rows
from candidate_cleanup
group by cleanup_outcome, evidence_lane
order by cleanup_outcome, evidence_lane;

