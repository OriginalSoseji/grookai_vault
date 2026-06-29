-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1 rollback-only dry-run proof.
-- This file intentionally rolls back and must not be used as an apply file.

begin;

drop function if exists public.apply_market_evidence_review_action_v1(
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  jsonb
);

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_ROLLBACK_DRY_RUN'::text as package_id,
  true::boolean as rollback_only,
  false::boolean as persisted_change,
  false::boolean as disposition_updates,
  false::boolean as action_event_inserts,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;

rollback;
