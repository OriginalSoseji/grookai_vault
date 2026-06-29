-- MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1 rollback-only dry-run proof.
-- This file intentionally rolls back and must not be used as an apply file.

begin;

drop table if exists public.market_evidence_review_action_events;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1_ROLLBACK_DRY_RUN'::text as package_id,
  true::boolean as rollback_only,
  false::boolean as persisted_change,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;

rollback;
