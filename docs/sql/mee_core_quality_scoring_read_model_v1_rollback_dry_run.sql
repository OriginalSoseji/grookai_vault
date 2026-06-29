-- MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-CANDIDATE-V1 rollback-only dry run.
-- This proves rollback shape only. Do not execute as an actual rollback without explicit rollback approval.

begin;

drop view if exists public.v_market_evidence_candidate_quality_scores_v1;

select
  'MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-CANDIDATE-V1_ROLLBACK_DRY_RUN'::text as package_id,
  'public.v_market_evidence_candidate_quality_scores_v1'::text as rollback_target,
  true::boolean as rollback_only,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as market_truth;

rollback;
