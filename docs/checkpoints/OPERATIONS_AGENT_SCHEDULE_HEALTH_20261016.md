# Operations Agent Schedule Health — October 16, 2026

## Problem

Founder Operations applied periodic heartbeat staleness to every registered
agent. The event-triggered `TK-SM-R Hidden Set Apply` agent was therefore shown
as stale while correctly idle, leaving a false open incident in the control
plane.

## Repair

Migration `20261016150000_operations_agent_schedule_health_v1.sql` limits
heartbeat staleness to `cron`, `timer`, and `continuous` schedules. Event and
manual agents remain healthy while idle, while their latest running or failed
run still determines health. The maintenance pass also recovers legacy stale
incidents for event and manual agents.

## Verification

- Contract tests passed: 24 of 24.
- `git diff --check` passed.
- The linked migration ledger contained 454 applied migrations and exactly one
  expected local migration, `20261016150000`.
- Linked schema replay stopped in the already-applied
  `20261012010000_card_print_identity_aliases_v1.sql` migration because its
  zero-state replay lacks the 647 required catalog pairs. The new migration was
  not reached by that replay.
- A transaction-scoped rehearsal against the disposable local Supabase
  operations schema compiled both replacement functions and verified four
  cases: idle event and manual agents were healthy, a stale cron agent remained
  stale, and a failed event run remained failed.
- The same rehearsal ran maintenance and recovered the legacy event incident
  while retaining the valid cron incident. The transaction then rolled back.
- The exact `OperationsAgentScheduleHealthV1` audit passed against production:
  454 applied migrations ending at `20261016140000`, the candidate still
  absent, exact pre-change function fingerprints and grants, and zero production
  writes. The hash-bound candidate then passed the same four behavior cases in
  the isolated local schema and rolled back both functions and the local ledger.
- Durable audit evidence is retained outside the repository under
  `operations_agent_schedule_health_20261016/audit-linked-b74f30c45-v2`.

## Production gate

The ordinary zero-state replay remains blocked by the historical October 12
data prerequisite. The governing migration contract now contains a narrow,
reviewable exception for only this candidate; it does not change the ordinary
gate. Production activation remains pending on committed `PrePush`, review,
exact CLI dry-run, the separate production-apply decision, and independent
ledger/function/incident readback.
