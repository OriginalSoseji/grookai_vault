# PRICING_CHECKPOINT_09_LIVE_SOURCE_CONSTRAINTS

## Severity

L2

## Date / Phase Context

Date context: `2026-03-20`

Phase context:

- the pricing observation layer had already been implemented
- offline classifier hardening had already passed
- card-detail trust and comps surfaces had already been built
- live validation had already been attempted across multiple UTC days
- queue policy had already been narrowed to demand-driven behavior because source pressure, not internal ambition, had become the dominant operational constraint

This checkpoint records the point where the live source constraint itself became a system-shaping fact that future work must treat explicitly.

## What Problem This Checkpoint Solves

This checkpoint solves a diagnostic and governance problem.

Without it, future maintainers could misread repeated failed live validation as:

- pricing logic failure
- classifier failure
- mapping failure
- queue policy failure

That would be wrong.

The repo needed a durable statement that the current live blocker is upstream source availability, not internal architectural collapse.

## What Live Validation Actually Proved

The current live validation history proved these things clearly:

- live validation did not prove live comps because the first real Browse call returned `429`
- internal Browse budget could still appear healthy while the upstream source rejected the request
- the runner failed closed safely
- no observations were written for the throttled run
- no accepted rows leaked through
- the card-detail trust surface stayed honest and continued to report no accepted live comps

Those are not side notes.

They define current source reality.

## Why This Was Not A Pricing Logic Failure

This was not:

- a mapping failure
- a classifier failure
- a comps/trust UI failure
- a pricing formula failure

The live validation audit already proved that the failure occurred before any useful listing work happened.

The first real Browse call was rejected upstream with `429`.

That means the current blocked state is a source-availability constraint, not a demonstrated defect in the pricing architecture that Grookai built underneath it.

## The Operational Reality We Locked

The operational reality now locked is:

- first-call `429` must be treated as `BLOCKED_BY_THROTTLE`, not generic product failure
- live proof remains pending source availability, not architectural redesign
- repeated brute-force validation is wasteful and misleading
- fail-closed behavior under throttle is a success condition, not a defect

This does not mean live pricing is “done.”

It means the correct unresolved category is:

- externally constrained live proof

not:

- broken internal pricing system

## Why This Decision Mattered

This decision mattered because Grookai needed to preserve a clean distinction between:

- system correctness
- source availability

If those two ideas collapse into each other, future work will chase the wrong problem.

That would risk:

- unnecessary redesign
- wasted quota
- bad incident language
- false conclusions about what parts of the system are actually failing

This checkpoint keeps that boundary explicit.

## Alternatives We Rejected

This checkpoint explicitly rejects:

- treating `429` as generic pricing failure
  - rejected because the evidence shows the system was blocked before pricing work could proceed

- burning calls trying to force proof in a bad window
  - rejected because repeated throttle windows do not become diagnostic truth just because more attempts are made

- redesigning architecture in response to upstream throttle alone
  - rejected because the source constraint does not, by itself, prove the underlying architecture is wrong

- pretending live pricing was proven when it was not
  - rejected because no accepted live observations were produced in the throttled run

## What Future Maintainers Must Preserve

Future maintainers must preserve:

- the distinction between upstream source unavailability and internal pricing logic failure
- the semantic classification `BLOCKED_BY_THROTTLE` for first-call Browse `429`
- the rule that fail-closed behavior is part of success under source throttle
- the rule that live truth cannot be claimed without actual persisted live observations
- the rule that repeated throttle alone is not evidence for architectural redesign

If future documentation or ops language collapses throttle into generic product failure, it will misstate the actual condition the system is operating under.
