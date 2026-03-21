# PRICING_CHECKPOINT_06_QUEUE_MODEL_V1

## Severity

L2

## Date / Phase Context

Date context: `2026-03-20`

Phase context:

- the pricing observation layer, offline certification path, comps trust surface, and trust summary were already in place
- live proof remained blocked by repeated first-call eBay Browse `429` throttling rather than by a known pricing-logic defect
- the existing queue still reflected an earlier scale assumption:
  - broad scheduler refresh
  - broad backfill capacity
  - retry semantics that were too coarse for current source reality

This checkpoint records the decision to move the queue model from broad refresh pressure to demand-driven, cooldown-controlled pricing work.

## What Problem This Checkpoint Solves

Before this checkpoint, the queue model still assumed that broad refresh and background catch-up were reasonable default behaviors.

That no longer matched source reality.

At this phase, the dominant operational constraint was not missing pricing code. It was limited, externally throttled Browse capacity.

That made the old queue posture too expensive and too noisy:

- broad scheduler work could spend quota on low-value cards
- retry semantics were not explicit enough about throttle-blocked runs versus meaningful attempts
- the queue could keep pressure on cards that had produced no value because the source blocked the first call
- vault demand and direct user value were not clearly protected as the top queue driver

The checkpoint exists to lock a safer operational truth:

- demand first
- vault first
- cooldown-based re-eligibility
- no immediate retry churn
- fail closed when the source blocks the run

## Why Broad Backfill Was The Wrong Model For This Phase

Broad backfill was the wrong default model for this phase because it assumed source availability that the system does not currently have.

The repeated live validation attempts showed that Grookai can have internal Browse budget available while still being blocked immediately by upstream eBay throttling.

Under those conditions, broad backfill is not a growth strategy. It is quota pressure without collector value.

When the source is externally constrained, the correct question is not “how do we keep the queue full?” The correct question is “which cards deserve the next safe attempt?”

At this phase, the answer is demand-driven cards, especially cards already linked to collector ownership.

## Why Demand-Driven Pricing Became The Correct Choice

Demand-driven pricing became the correct choice because it aligns scarce source capacity with actual user value.

The queue model now treats pricing as a collector-serving lane, not a broad catalog sweep.

That means:

- cards in vaults are highest-value demand
- direct user-triggered pricing remains valid demand
- non-vault and legacy background work may exist, but they are not allowed to dominate the active queue by default

This choice does not claim the source constraint is solved. It only ensures the system spends its limited attempts in the places most likely to matter.

## The Queue Rules We Locked

The queue model now locks these rules:

- no broad backfill by default
  - scheduler-driven broad refresh is disabled unless explicitly re-enabled
  - manual backfill remains possible only through explicit opt-in, not as ambient default behavior

- vault-first demand priority
  - vault-linked jobs outrank general user jobs
  - broad legacy priorities sit below demand-driven priorities

- non-vault retry cooldown = 4 days
  - non-vault meaningful attempts must wait four days before re-eligibility

- vault retry cooldown = 24 hours
  - vault meaningful attempts must wait twenty-four hours before re-eligibility

- no immediate retries
  - failed or blocked jobs do not retry inline in the same queue pass
  - cooldown and eligibility fields determine when the job can be claimed again

- first-call `429` = throttle-blocked, not meaningful attempt
  - if the first external Browse call is blocked and no useful pricing evidence is produced, that run is operationally real but not a meaningful pricing attempt
  - it increments total attempts for observability, but it does not reset the meaningful-attempt clock

- failed jobs return to the back of the line
  - queue eligibility now uses explicit `next_eligible_at`
  - failed or blocked work becomes eligible again only after policy allows it
  - it does not hold the front of the queue and churn inline

## Why This Decision Mattered

This decision mattered because it turned the queue from a throughput-first system into a trust-preserving system under constrained source conditions.

Without this change, Grookai risked spending quota and queue attention on the wrong cards at the wrong time while learning little from upstream throttling.

With this change, the queue now expresses a more truthful operational stance:

- source access is constrained
- attempts are expensive
- not all failures are equal
- collector demand should outrank background refresh

That is a materially safer model for the current phase of pricing.

## Alternatives We Rejected

This checkpoint explicitly rejects:

- continuing global backfill now
  - rejected because broad catalog pressure is misaligned with current source constraints

- retry loops after throttle
  - rejected because a first-call `429` that produced no evidence should not keep cycling inline

- treating all failures as the same
  - rejected because throttle-blocked, budget-blocked, transient preflight failures, and meaningful attempted failures have different operational meaning

- using quota on low-value non-user-driven cards first
  - rejected because the queue should prioritize collector demand while source access remains externally constrained

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- the rule that broad scheduler/backfill behavior is not default-safe under current source conditions
- the rule that vault-linked demand outranks general demand
- the rule that meaningful-attempt cooldowns are:
  - `24 hours` for vault jobs
  - `4 days` for non-vault jobs
- the distinction between:
  - total attempts
  - meaningful attempts
  - throttle-blocked runs
- explicit `next_eligible_at` queue control instead of implicit inline retry behavior
- the semantic truth that first-call Browse `429` is `throttle_blocked`, not generic product failure

If a future change reintroduces broad default refresh, collapses all failures into one class, or lets blocked jobs churn at the front of the queue, it will undo the operational safety this checkpoint exists to lock.
