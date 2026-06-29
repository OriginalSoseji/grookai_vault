-- MEE-BLOCKER-POLICY-CLOSEOUT-V1 readback.
-- Read-only. No DB writes. No public pricing.

select
  cleanup_state,
  cleanup_action,
  reason_code,
  evidence_lane,
  count(*)::bigint as rows,
  count(distinct card_print_id)::bigint as card_prints,
  count(*) filter (
    where can_publish_price_directly
       or publishable
       or app_visible
       or market_truth
       or can_publish_price_directly_at_action
  )::bigint as public_boundary_leak_rows
from public.v_market_listing_candidate_cleanup_current_v1
where action_payload->>'package_id' = 'MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1'
group by cleanup_state, cleanup_action, reason_code, evidence_lane
order by cleanup_state, evidence_lane;

with special as (
  select
    case
      when gv_id like 'GV-PK-WCD-%' then 'world_championship_deck'
      when gv_id like 'GV-PK-MCD-%' then 'mcdonalds'
      when gv_id like 'GV-PK-MEP-%' then 'mep_black_star_promos'
      when gv_id like 'GV-PK-TK-%' then 'trainer_kit'
      when gv_id like 'GV-PK-BASE1%' or gv_id like 'GV-PK-B1-SHADOWLESS%' or gv_id like 'GV-PK-B1-1ED%' or gv_id like 'GV-PK-B1-1999%' then 'base_print_run'
      when gv_id like '%-PR-%' or gv_id like '%-PROMO%' or gv_id ~* '^GV-PK-(BWP|SMP|SWSH|SVP|XY|DP|POP|NP|HGSS|BW)-' then 'promo_or_alt_distribution'
      else 'other_special_lane'
    end as family,
    evidence_lane,
    card_print_id,
    can_publish_price_directly,
    publishable,
    app_visible,
    market_truth,
    can_publish_price_directly_at_action
  from public.v_market_listing_candidate_cleanup_current_v1
  where cleanup_state = 'needs_special_lane_policy'
    and action_payload->>'package_id' = 'MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1'
)
select
  family,
  evidence_lane,
  count(*)::bigint as rows,
  count(distinct card_print_id)::bigint as card_prints,
  count(*) filter (
    where can_publish_price_directly
       or publishable
       or app_visible
       or market_truth
       or can_publish_price_directly_at_action
  )::bigint as public_boundary_leak_rows
from special
group by family, evidence_lane
order by family, evidence_lane;

select
  count(*)::bigint as rows,
  count(*) filter (where publication_gate_candidate)::bigint as publication_gate_candidate_rows,
  count(*) filter (
    where can_publish_price_directly
       or publishable
       or app_visible
       or market_truth
       or publication_gate_candidate
  )::bigint as public_boundary_leak_rows,
  'heavy_publication_gate_candidate_view_deferred_to_explicit_audit'::text as publication_gate_recheck_mode
from public.market_evidence_review_dispositions;
