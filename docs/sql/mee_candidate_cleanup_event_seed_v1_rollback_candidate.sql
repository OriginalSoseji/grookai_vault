-- MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1 rollback candidate for future approved cleanup-event seed only.
-- Do not run without explicit rollback approval.

begin;

delete from public.market_listing_candidate_cleanup_events
where action_payload->>'package_id' = 'MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1';

rollback;
