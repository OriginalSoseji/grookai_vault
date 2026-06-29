-- MEE_PRICE_REVIEW_CLEAN_CANDIDATE_SEED_V1 apply.
-- Inserts internal approved price-review events for the current clean ordinary
-- raw-single publication-policy candidates only.
-- No public pricing. No app-visible pricing.

begin;

with targets as (
  select *
  from public.v_market_evidence_price_publication_policy_v1
  where future_publication_review_candidate = true
), existing as (
  select count(*)::int as existing_rows
  from public.market_evidence_price_review_events e
  join targets t on t.card_print_id = e.card_print_id
), guard as (
  select
    (
      (select count(*) from targets) = 11
      and (select existing_rows from existing) = 0
      and not exists (
        select 1
        from targets
        where source_type <> 'active_listing'
           or evidence_lane <> 'raw_single'
           or price_policy_decision <> 'raw_single_policy_candidate'
           or can_publish_price_directly
           or publishable
           or app_visible
           or market_truth
      )
    ) as passed
)
insert into public.market_evidence_price_review_events (
  card_print_id,
  gv_id,
  source_type,
  evidence_lane,
  source_rollup_id,
  currency,
  candidate_median,
  candidate_low,
  candidate_high,
  minimum_active_ask,
  maximum_active_ask,
  evidence_count,
  seller_count,
  signal_at,
  action_name,
  review_state,
  reason_code,
  review_actor,
  review_note,
  action_payload,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth
)
select
  t.card_print_id,
  t.gv_id,
  t.source_type,
  t.evidence_lane,
  t.source_rollup_id::text,
  t.currency,
  t.candidate_median,
  t.candidate_low,
  t.candidate_high,
  t.minimum_active_ask,
  t.maximum_active_ask,
  t.evidence_count,
  t.seller_count,
  t.signal_at,
  'approve_internal_price_signal',
  'approved_internal',
  'clean_raw_single_policy_candidate',
  'system',
  'Seeded from MEE_PRICE_PUBLICATION_POLICY_V1 clean ordinary raw-single candidate gate.',
  jsonb_build_object(
    'seed_package', 'MEE_PRICE_REVIEW_CLEAN_CANDIDATE_SEED_V1',
    'price_policy_decision', t.price_policy_decision,
    'confidence_tier', t.confidence_tier,
    'candidate_status', t.candidate_status,
    'unresolved_review_rows', t.unresolved_review_rows
  ),
  false,
  false,
  false,
  false
from targets t
cross join guard
where guard.passed
order by t.gv_id;

commit;
