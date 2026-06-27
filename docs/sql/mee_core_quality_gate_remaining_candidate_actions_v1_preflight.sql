-- MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1 preflight.

with targets(disposition_id, expected_updated_at, action_name, reason_code, quality_gate_policy) as (
  select
    null::uuid as disposition_id,
    null::timestamptz as expected_updated_at,
    null::text as action_name,
    null::text as reason_code,
    null::text as quality_gate_policy
  where false
)
select
  'MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1_PREFLIGHT'::text as package_id,
  0::int as expected_target_rows,
  count(*)::int as eligible_target_rows,
  count(*) filter (where d.publication_gate_candidate or d.can_publish_price_directly or d.publishable or d.app_visible or d.market_truth)::int as public_boundary_rows,
  count(*) filter (where t.action_name = 'confirm_internal_candidate')::int as forbidden_confirm_rows
from targets t
join public.market_evidence_review_dispositions d
  on d.id = t.disposition_id
 and d.updated_at is not distinct from t.expected_updated_at
where d.needs_review = true
  and d.review_status = 'pending'
  and d.evidence_lane in ('raw_single', 'slab')
  and d.review_lane in ('candidate_review', 'high_signal_review')
  and not exists (
    select 1
    from public.market_evidence_review_action_events e
    where e.disposition_id = d.id
      and e.action_payload ->> 'package_id' = 'MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1'
      and e.action_payload ->> 'row_manifest_sha256' = '01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b'
  );
