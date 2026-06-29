-- MEE-PRICE-PUBLICATION-POLICY-V1 local SQL/view candidate.
-- Internal-only price publication policy evaluator.
-- Plan-only: do not apply remotely without a separate targeted schema approval.
-- This view does not publish pricing and does not create market truth.

create or replace view public.v_market_evidence_price_publication_policy_v1
with (security_invoker = true)
as
with review_dispositions as (
  select
    card_print_id,
    count(*) filter (where review_status in ('pending', 'in_review', 'blocked'))::int as unresolved_review_rows,
    count(*) filter (where review_disposition = 'review_confirmed_internal_candidate')::int as confirmed_internal_candidate_rows,
    coalesce(
      jsonb_agg(
        distinct jsonb_build_object(
          'review_lane', review_lane,
          'evidence_lane', evidence_lane,
          'review_status', review_status,
          'review_disposition', review_disposition
        )
      ) filter (where review_status in ('pending', 'in_review', 'blocked')),
      '[]'::jsonb
    ) as unresolved_review_summary
  from public.market_evidence_review_dispositions
  group by card_print_id
), evaluated as (
  select
    q.card_print_id,
    q.gv_id,
    q.source,
    q.source_type,
    q.evidence_lane,
    q.rollup_version,
    q.source_rollup_id,
    q.currency,
    q.candidate_median,
    q.candidate_low,
    q.candidate_high,
    q.minimum_active_ask,
    q.maximum_active_ask,
    q.evidence_count,
    q.seller_count,
    q.source_count,
    q.signal_at,
    q.confidence_tier,
    q.candidate_status,
    q.review_queue,
    q.reviewer_candidate,
    q.candidate_payload,
    coalesce(rd.unresolved_review_rows, 0) as unresolved_review_rows,
    coalesce(rd.confirmed_internal_candidate_rows, 0) as confirmed_internal_candidate_rows,
    coalesce(rd.unresolved_review_summary, '[]'::jsonb) as unresolved_review_summary,
    case
      when q.can_publish_price_directly or q.publishable or q.app_visible or q.market_truth
        then 'blocked_public_boundary'
      when q.source_type = 'reference'
        then 'hold_reference_context_only'
      when q.source_type <> 'active_listing'
        then 'blocked_unknown_source_type'
      when q.confidence_tier <> 'high_confidence'
        then 'defer_more_evidence'
      when q.candidate_status <> 'internal_candidate'
        then 'defer_review'
      when q.evidence_lane not in ('raw_single', 'slab')
        then 'blocked_lane_unknown'
      when q.gv_id like '%-WCD-%'
        or q.gv_id like '%-MCD-%'
        or q.gv_id like '%-TK-%'
        or q.gv_id like '%-MEP-%'
        or q.gv_id like '%-PR-%'
        or q.gv_id like '%FIRST-EDITION%'
        or q.gv_id like '%SHADOWLESS%'
        or q.gv_id like '%1999-2000%'
        then 'hold_special_lane_policy'
      when q.evidence_lane = 'slab'
        then 'hold_slab_grade_policy'
      when q.evidence_lane = 'raw_single' and q.candidate_median >= 250
        then 'hold_high_value_manual_review'
      when q.candidate_low is not null
       and q.candidate_high is not null
       and q.candidate_low > 0
       and q.candidate_high / q.candidate_low >= 20
        then 'hold_outlier_review'
      when q.evidence_lane = 'raw_single' and q.evidence_count >= 20 and q.seller_count >= 8
        then 'raw_single_policy_candidate'
      when q.evidence_lane = 'raw_single' and q.evidence_count >= 8 and q.seller_count >= 4
        then 'raw_single_review_candidate'
      else 'defer_more_evidence'
    end as price_policy_decision
  from public.v_market_evidence_price_candidate_review_queue_v1 q
  left join review_dispositions rd
    on rd.card_print_id = q.card_print_id
)
select
  card_print_id,
  gv_id,
  source,
  source_type,
  evidence_lane,
  rollup_version,
  source_rollup_id,
  currency,
  candidate_median,
  candidate_low,
  candidate_high,
  minimum_active_ask,
  maximum_active_ask,
  evidence_count,
  seller_count,
  source_count,
  signal_at,
  confidence_tier,
  candidate_status,
  review_queue,
  reviewer_candidate,
  candidate_payload,
  price_policy_decision,
  price_policy_decision in ('raw_single_policy_candidate', 'raw_single_review_candidate') as internal_price_policy_candidate,
  (
    price_policy_decision = 'raw_single_policy_candidate'
    and unresolved_review_rows = 0
    and evidence_lane = 'raw_single'
    and candidate_median < 100
    and (
      candidate_low is null
      or candidate_high is null
      or candidate_low <= 0
      or candidate_high / candidate_low < 10
    )
  ) as future_publication_review_candidate,
  true as internal_only,
  false as can_publish_price_directly,
  false as publishable,
  false as app_visible,
  false as market_truth,
  unresolved_review_rows,
  confirmed_internal_candidate_rows,
  unresolved_review_summary
from evaluated;

revoke all on public.v_market_evidence_price_publication_policy_v1 from public, anon, authenticated, service_role;
grant select on public.v_market_evidence_price_publication_policy_v1 to service_role;
