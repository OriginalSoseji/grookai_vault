-- MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1 rollback candidate.
-- Do not execute without explicit rollback approval.

begin;

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
), deleted_events as (
  delete from public.market_evidence_review_action_events e
  using package_events pe
  where e.id = pe.id
  returning e.disposition_id
)
update public.market_evidence_review_dispositions d
set
  review_status = 'pending',
  review_disposition = case
    when d.review_lane = 'high_signal_review' then 'review_pending_high_signal'
    else 'review_pending_candidate'
  end,
  review_actor = 'system_seed_plan',
  reviewed_at = null,
  needs_review = true,
  publication_gate_candidate = false,
  can_publish_price_directly = false,
  publishable = false,
  app_visible = false,
  market_truth = false,
  updated_at = targets.expected_updated_at
from targets
where d.id = targets.disposition_id
  and exists (select 1 from deleted_events de where de.disposition_id = d.id);

commit;
