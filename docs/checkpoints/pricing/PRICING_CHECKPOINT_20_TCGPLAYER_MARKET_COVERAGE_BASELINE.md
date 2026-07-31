# Pricing Checkpoint 20: TCGPlayer Market Coverage Baseline

## Context

The exact 100-printing signed-in canary was running on the guarded production
schedule while the broader Production V1 readiness work continued.

The next product gate required a fixed, reproducible answer to a basic question:
how much of the ordinary English Pokemon singles catalog can currently receive
an exact TCGPlayer Market price without weakening identity, finish, freshness,
or provenance requirements?

## Problem

Raw pipeline counts were not a valid coverage measure. The latest reconciled
full shadow run selected `45,082` source product/subtype price rows, but that
population mixed:

- ordinary Production V1 single-card rows
- unsupported product objects
- special print and distribution variants reserved for V1.1
- unsupported source subtypes
- rows without a positive market price

Removing every unmapped row from the denominator would also have produced a
misleadingly high result. Missing canonical mapping is the coverage gap, not a
reason to make the row disappear.

## Risk

- publication coverage could be inflated by changing the denominator
- special variants could be treated as ordinary exact printings
- missing mappings could be hidden instead of repaired
- broad counts could obscure poor coverage of high-value cards
- future audits could produce incompatible percentages
- product rollout could proceed without knowing where visible pricing gaps
  remain

## Decision

Production V1 coverage is governed by
`TCGPLAYER_MARKET_COVERAGE_POLICY_V1`.

The denominator unit is one current source product/subtype price row that:

- belongs to Pokemon category `3`
- is active and current in the verified source catalog
- has a positive USD TCGPlayer Market price
- uses the ordinary V1 `normal`, `holo`, or `reverse` finish lane
- is not a deterministically excluded object or V1.1 special-print class

Missing canonical mapping, exact-printing evidence, or finish assignment remains
inside the denominator as a gap.

The numerator contains denominator rows whose qualification decision is
`publish` or freshness `delay`. The Production V1 threshold is fixed at `95%`.

## Alternatives Rejected

- dividing published rows by all raw source rows
- dividing published rows only by already mapped rows
- moving difficult modern sets or high-value rows outside V1
- treating every promotional or stamped lane as an ordinary printing
- counting unsupported source subtypes as covered
- publishing parent-card or approximate-finish prices to close gaps
- lowering the 95% threshold after measuring the result

## Read-Only Production Result

Source shadow run:

`TCGPLAYER-MARKET-SHADOW-FINAL-SHA-CYCLE3-20260728T0720Z-publication`

Source-producing commit:

`958b14eaff091919d344d39517890f7a1fcb57e4`

Result:

- selected source price rows: `45,082`
- fixed Production V1 denominator: `34,356`
- exact covered numerator: `31,165`
- remaining gap rows: `3,191`
- deterministic scope exclusions: `10,726`
- coverage: `90.712%`
- required coverage: `95%`
- additional exact rows needed: `1,474`
- unclassified gaps: `0`

The gate is failed. No denominator exception was added to conceal the shortfall.

## Gap Concentration

Primary gap reasons:

- missing active source mapping: `3,019`
- variant assignment not exact child finish: `157`
- missing mapping method: `15`

Coverage by era:

- vintage: `96.803%`
- middle: `96.983%`
- modern: `86.767%`

Coverage by finish:

- normal: `90.495%`
- holo: `84.889%`
- reverse: `94.709%`

Coverage by value band:

- low: `93.182%`
- medium: `92.559%`
- high: `78.803%`

The five largest source-set gaps contain `1,196` rows:

- SV: Black Bolt: `327`
- ME: Ascended Heroes: `302`
- ME05: Pitch Black: `206`
- SV: Prismatic Evolutions: `191`
- SV: Shrouded Fable: `170`

## Current Truths

- the coverage denominator is explicit and versioned
- missing mappings remain visible as failures
- every gap and exclusion has a deterministic reason
- the current catalog does not meet the Production V1 coverage gate
- vintage and middle-era coverage already exceed 95%
- modern, holo, and high-value coverage require focused repair
- no database, mapping, publication, or client state was changed by this audit
- the running 100-printing canary remains isolated and unchanged

## Invariants

1. Missing canonical mappings never disappear from the denominator.
2. Numerator rows must preserve exact card, printing, language, and finish
   qualification.
3. Special-print and object exclusions require a versioned deterministic
   reason.
4. Coverage remains reproducible by set, era, finish, and value band.
5. The threshold cannot be lowered merely because the measured result fails.
6. Coverage repairs must not change the frozen 72-hour canary scheduler code.
7. Read-only audits must not mutate mapping, publication, or customer state.

## What Must Never Be Broken

- source-to-canonical traceability
- exact printing and finish authority
- the ordinary V1 versus special-print V1.1 boundary
- deterministic denominator membership
- deterministic gap classification
- signed-in versus anonymous rollout separation
- preservation of the failed baseline

## Evidence

Permanent audit:

`docs/audits/pricing/mee_pricing_platform_production_v1/coverage_gate/2026-07-28T09-21-08-086Z`

It contains the run plan, summary, complete gap rows, complete exclusions,
human-readable report, and SHA-256 artifact hashes.

## Explicit Next Gate

Repair exact source mappings and child-finish assignments in the highest-yield
ordinary V1 sets without changing the denominator policy.

The immediate target is at least `1,474` additional exact covered rows. After
repair, run a new reconciled full shadow cycle and rerun this same policy.

Do not expand signed-in publication beyond the fixed canary until:

- the 72-hour canary observation gate passes
- fixed-denominator coverage reaches at least `95%`
- detail and representative batch read performance meets the Product V1 target
- all required source-to-client reconciliation checks remain clean
