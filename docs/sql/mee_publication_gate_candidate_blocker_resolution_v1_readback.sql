-- MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1 readback.
-- Read-only. No function invocation. No DB writes.

with gate_rows as (
  select
    disposition_id,
    card_print_id,
    gv_id,
    evidence_lane,
    can_publish_price_directly,
    publishable,
    app_visible,
    market_truth
  from public.v_market_evidence_publication_gate_candidates_v1
  where gate_decision = 'defer_review_confirmation'
    and evidence_lane in ('raw_single', 'slab')
),
candidate_stats as (
  select
    gate_rows.disposition_id,
    gate_rows.evidence_lane,
    count(candidates.id)::bigint as candidate_rows,
    count(candidates.id) filter (where candidates.needs_review)::bigint as candidate_rows_needing_review,
    count(candidates.id) filter (
      where candidates.exclusion_flags is not null
        and candidates.exclusion_flags <> '{}'::jsonb
        and candidates.exclusion_flags <> '[]'::jsonb
    )::bigint as candidate_rows_with_exclusions,
    min(candidates.match_confidence)::numeric as min_match_confidence
  from gate_rows
  left join public.market_listing_card_candidates candidates
    on candidates.card_print_id = gate_rows.card_print_id
  group by gate_rows.disposition_id, gate_rows.evidence_lane
)
select
  evidence_lane,
  count(*)::bigint as rows,
  count(*) filter (where candidate_rows_needing_review > 0)::bigint as rows_with_candidate_review_blocker,
  count(*) filter (where coalesce(min_match_confidence, 0) < 0.90)::bigint as rows_with_confidence_blocker,
  count(*) filter (where candidate_rows_with_exclusions > 0)::bigint as rows_with_exclusion_blocker
from candidate_stats
group by evidence_lane
order by evidence_lane;

select
  count(*)::bigint as gate_rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.v_market_evidence_publication_gate_candidates_v1
where gate_decision = 'defer_review_confirmation'
  and evidence_lane in ('raw_single', 'slab');

