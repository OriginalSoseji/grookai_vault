# Pricing Checkpoint 131: MTG Fresh-View Production Guard Repaired

## Context

Build 312 restored current governed MTG and Pokemon pricing from an exact,
reconciled shadow run. The GitHub production attempt stopped before writes
because its preflight compared fresh source decisions with historical raw
decisions behind the publication pointer.

## Problem

The fresh source contained `31,178` eligible Pokemon rows while the raw prior
publication decisions contained `31,184`. The six-row reduction was legitimate:
11 obsolete Holo/Reverse rows disappeared, five current rows appeared, and
seven affected TCGPlayer products now expose only Normal. The old guard treated
every decrease as data loss, even when the public freshness-governed view had
already expired and needed restoration.

## Risk

Keeping the old comparison would repeatedly block valid production restoration
as source variants change. Removing the comparison entirely would permit a
material Pokemon publication loss while publishing MTG prices. A hardcoded
exception for six rows would encode one incident instead of governing future
source movement.

## Decision

- Compare the reconciled shadow's Pokemon count with
  `public.v_market_price_current_v1`, the freshness-governed current read model.
- Permit a decrease no larger than `0.1%` of the available current Pokemon view,
  rounded down to a whole row.
- Permit restoration when that governed current view is empty or expired, but
  only after the workflow has already proven one exact-commit, reconciled,
  nonzero shadow containing eligible MTG and Pokemon pricing.
- Block missing MTG pricing, missing shadow Pokemon pricing, and any material
  Pokemon decrease above the tolerance.
- Persist the complete policy result as
  `mtg-pricing-production-guard.json` in the immutable workflow artifact.

## Alternatives Rejected

- Compare with raw historical qualification rows: those rows remain useful
  evidence but are not the current freshness boundary.
- Require exact count equality: valid source additions and removals make exact
  equality operationally brittle.
- Accept any nonzero count: this would not protect against material loss.
- Hardcode the observed six-row exception: it would not generalize or explain
  the governing risk.

## Current Truths

- The pure policy is implemented in
  `backend/pricing/mtg_pricing_production_guard_v1.mjs`.
- The maximum accepted Pokemon decrease is `0.001` (`0.1%`).
- At `31,184` current rows, 31 rows are allowed; 32 rows block.
- The observed `31,184` to `31,178` transition is allowed.
- An empty freshness-governed current view does not by itself block restoration.
- The workflow still requires the exact expected SHA, a reconciled shadow, the
  frozen policy version, and the shadow-proven source sync before production.
- This repair performs no production publication, database write, migration,
  Storage operation, approval, or client deployment.

## Invariants

- Production cannot proceed without eligible MTG and Pokemon shadow rows.
- A material Pokemon count loss must fail closed and preserve its exact finding.
- The guard must read the governed current view, never infer freshness from raw
  historical decisions.
- The shadow run must remain reconciled and tied to the exact workflow commit.
- The production worker must remain pinned to the shadow-proven source sync.
- Pricing identity, catalog identity, Vault data, and anonymous visibility are
  unchanged by this policy repair.

## Verification

- Guard and worker syntax checks: passed.
- Targeted pricing contracts: passed (`55/55`).
- Boundary proof: 31-row decrease passes; 32-row decrease blocks.
- Offline replay: four cases passed with zero production access or writes.
- `git diff --check`: passed.
- Full repository shipcheck: passed in 269.5 seconds, including zero critical
  production drift failures, web typecheck/lint/strict build, Flutter analysis,
  and all `662/662` Flutter tests.

## Permanent Evidence

- `docs/audits/pricing/mtg_pricing_production_guard_v1/20260906/offline_replay.json`
- `docs/audits/pricing/mtg_pricing_production_guard_v1/20260906/artifact_hashes.json`
- The first post-merge workflow execution will preserve
  `mtg-pricing-production-guard.json` with live counts when production is next
  legitimately run.

## Exact Next Gate

Merge this workflow-only guard repair through protected checks. On the next
scheduled or operator-authorized exact-shadow publication cycle, verify the
guard artifact and production reconciliation. Do not rerun the already
completed build-312 release mutation.
