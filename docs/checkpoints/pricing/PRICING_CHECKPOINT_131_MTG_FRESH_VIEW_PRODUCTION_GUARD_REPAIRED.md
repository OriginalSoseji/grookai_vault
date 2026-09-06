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

- Compute a last-known Pokemon baseline and its currently fresh subset through
  the indexed active publication pointer, snapshots, decisions, and quarantine
  boundary. Do not aggregate through the broad client view.
- Compare the reconciled shadow's Pokemon count with that baseline even when
  the freshness-governed subset is empty or expired.
- Permit a decrease no larger than `0.1%` of the baseline, rounded down to a
  whole row.
- Permit restoration only after the workflow has already proven one
  exact-commit, reconciled, nonzero shadow containing eligible MTG and Pokemon
  pricing.
- Block missing MTG pricing, missing shadow Pokemon pricing, and any material
  Pokemon decrease above the tolerance.
- Bound the indexed baseline query with a 120-second statement timeout and a
  125-second client query timeout.
- Persist the complete policy result as
  `mtg-pricing-production-guard.json` in the immutable workflow artifact.

## Alternatives Rejected

- Compare with raw historical qualification rows: those rows remain useful
  evidence but do not by themselves prove active-publication membership,
  freshness, or truth-review visibility.
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
- An empty freshness-governed subset does not erase the `31,184` last-known
  baseline or permit a materially smaller replacement.
- A one-row Pokemon shadow is blocked against that expired baseline.
- The workflow still requires the exact expected SHA, a reconciled shadow, the
  frozen policy version, and the shadow-proven source sync before production.
- This repair performs no production publication, database write, migration,
  Storage operation, approval, or client deployment.

## Invariants

- Production cannot proceed without eligible MTG and Pokemon shadow rows.
- A material Pokemon count loss must fail closed and preserve its exact finding.
- The guard baseline must come from the active indexed publication path, never
  from unscoped historical decisions or a whole-view aggregation.
- The shadow run must remain reconciled and tied to the exact workflow commit.
- The production worker must remain pinned to the shadow-proven source sync.
- Pricing identity, catalog identity, Vault data, and anonymous visibility are
  unchanged by this policy repair.

## Verification

- Guard and worker syntax checks: passed.
- Targeted pricing contracts: passed (`56/56`).
- Boundary proof: 31-row decrease passes; 32-row decrease blocks.
- Offline replay: five cases passed with zero production access or writes.
- Exact indexed production query proof: passed read only in 35.7 seconds with
  `31,178` baseline and `31,178` fresh Pokemon rows under the 120-second bound.
- `git diff --check`: passed.
- Full repository shipcheck: passed in 269.5 seconds, including zero critical
  production drift failures, web typecheck/lint/strict build, Flutter analysis,
  and all `662/662` Flutter tests.

## Permanent Evidence

- `docs/audits/pricing/mtg_pricing_production_guard_v1/20260906/offline_replay.json`
- `docs/audits/pricing/mtg_pricing_production_guard_v1/20260906/artifact_hashes.json`
- `docs/audits/pricing/mtg_pricing_production_guard_v1/20260906/production_read_only_query_proof.json`
- The first post-merge workflow execution will preserve
  `mtg-pricing-production-guard.json` with live counts when production is next
  legitimately run.

## Exact Next Gate

Merge this workflow-only guard repair through protected checks. On the next
scheduled or operator-authorized exact-shadow publication cycle, verify the
guard artifact and production reconciliation. Do not rerun the already
completed build-312 release mutation.
