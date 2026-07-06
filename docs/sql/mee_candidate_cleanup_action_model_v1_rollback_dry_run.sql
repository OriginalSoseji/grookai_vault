-- MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1 rollback-only dry run.
-- Verifies the rollback shape without persisting any change.

begin;

drop view if exists public.v_market_listing_candidate_cleanup_card_summary_v1;
drop view if exists public.v_market_listing_candidate_cleanup_current_v1;
drop table if exists public.market_listing_candidate_cleanup_events;

select
  'MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1 rollback_only'::text as proof,
  false::boolean as persisted_change;

rollback;

