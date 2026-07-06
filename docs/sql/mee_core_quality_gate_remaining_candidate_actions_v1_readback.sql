-- MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1 readback.

with targets(disposition_id, expected_updated_at, action_name, reason_code, quality_gate_policy) as (
  select
    null::uuid as disposition_id,
    null::timestamptz as expected_updated_at,
    null::text as action_name,
    null::text as reason_code,
    null::text as quality_gate_policy
  where false
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.disposition_id = e.disposition_id
  where e.action_payload ->> 'package_id' = 'MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1'
    and e.action_payload ->> 'row_manifest_sha256' = '01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b'
), target_dispositions as (
  select d.*, t.action_name, t.reason_code, t.quality_gate_policy
  from public.market_evidence_review_dispositions d
  join targets t on t.disposition_id = d.id
)
select
  'MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1_READBACK'::text as package_id,
  0::int as expected_target_rows,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_status in ('blocked', 'resolved')) as updated_target_rows,
  (select count(*)::int from package_events where action_name = 'confirm_internal_candidate') as forbidden_confirm_event_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as target_public_flag_rows,
  (select count(*)::int from public.market_evidence_review_dispositions where needs_review = true and review_status = 'pending' and evidence_lane in ('raw_single','slab')) as remaining_pending_candidate_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence%') as public_pricing_view_market_evidence_references;
