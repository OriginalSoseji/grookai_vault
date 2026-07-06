-- MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1 action policy candidate.
-- Plan only. This file intentionally contains no DDL and no DML.
-- A later approved package should implement these rules as a service-role-only RPC plus append-only action log.

with allowed_actions(action_name, from_statuses, to_status, to_disposition, requires_reason_code, handoff_candidate_after_action) as (
  values
    ('start_review'::text, array['pending']::text[], 'in_review'::text, 'unchanged'::text, false::boolean, false::boolean),
    ('confirm_internal_candidate'::text, array['pending', 'in_review']::text[], 'resolved'::text, 'review_confirmed_internal_candidate'::text, true::boolean, true::boolean),
    ('require_split'::text, array['pending', 'in_review']::text[], 'blocked'::text, 'review_split_required'::text, true::boolean, false::boolean),
    ('block_evidence'::text, array['pending', 'in_review']::text[], 'blocked'::text, 'review_blocked'::text, true::boolean, false::boolean),
    ('block_classification'::text, array['pending', 'in_review']::text[], 'blocked'::text, 'review_blocked_classification'::text, true::boolean, false::boolean),
    ('request_reclassification'::text, array['pending', 'in_review']::text[], 'blocked'::text, 'review_reclassify'::text, true::boolean, false::boolean),
    ('defer_more_evidence'::text, array['pending', 'in_review']::text[], 'resolved'::text, 'review_defer_more_evidence'::text, true::boolean, false::boolean),
    ('reference_crosscheck'::text, array['pending', 'in_review']::text[], 'resolved'::text, 'review_reference_crosscheck'::text, true::boolean, false::boolean),
    ('defer_active_market_evidence'::text, array['pending', 'in_review']::text[], 'resolved'::text, 'review_defer_active_market_evidence'::text, true::boolean, false::boolean),
    ('confirm_monitor_only'::text, array['pending', 'in_review', 'resolved']::text[], 'resolved'::text, 'monitor_only'::text, false::boolean, false::boolean)
)
select *
from allowed_actions
order by action_name;
