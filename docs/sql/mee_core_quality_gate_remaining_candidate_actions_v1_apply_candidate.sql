-- MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1 apply candidate.
-- Scope: apply one internal quality-gate action to all pending raw_single/slab candidate dispositions.
-- No public pricing, no market truth, no provider calls.

begin;

select
  'MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1_NOOP_APPLY'::text as package_id,
  0::int as expected_target_rows,
  true::boolean as noop;

commit;
