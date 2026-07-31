# Pricing Checkpoint 17: TCGPlayer Market Shadow Gate 1

## Context

TCGPlayer Market Product V1 had passed local implementation, migration,
security, read-model, and client-surface proofs. Production still needed to
prove that a fresh source run could become deterministic qualification
decisions and immutable publication snapshots without exposing prices.

## Problem

The first production attempts exposed three operational defects:

- the qualification candidate view performed a wide aggregate over the full
  warehouse
- assignment preparation repeated an expensive no-op insert
- current price observations did not retain their exact archived price artifact
  identifier

Until those were repaired, a successful local contract could not be treated as
a durable production pipeline.

## Risk

- a publication cycle could time out after source acquisition
- repeated cycles could spend most of their time rebuilding unchanged
  assignments
- a displayed value could lack a closed artifact-level provenance chain
- retry behavior could create apparently successful but irreconcilable runs
- shadow rows could accidentally become customer-visible

## Decision

Repair production execution without changing market-price semantics:

- replace the candidate-view aggregate with direct one-to-one joins guaranteed
  by existing uniqueness constraints
- make the database statement timeout operational and bounded
- persist the exact archived price artifact ID on current and historical
  observations
- repair the fresh Pokemon observation slice with guarded readback
- precheck missing variant assignments and skip the expensive preparation
  function only when the count is exactly zero
- run three consecutive shadow cycles from one frozen commit

## Alternatives Rejected

- increasing timeouts while leaving the candidate query unbounded
- deleting or rebuilding existing assignments on every run
- accepting archive paths without immutable artifact IDs and hashes
- activating the first successful publication immediately
- using different commits or source slices across the three shadow cycles
- treating staging snapshots as customer publication

## Migration Applied

Production now contains:

- `20260728010000_tcgplayer_market_publication_v1.sql`
- `20260728020000_tcgplayer_market_candidate_view_performance_v1.sql`
- `20260728030000_tcgplayer_market_assignment_prepare_idempotency_v1.sql`

The remote migration ledger, production schema, RLS, grants, functions, and
views were read back after apply.

## Shadow Proof

Frozen authority:

- Branch: `pricing/mee-productization-v1`
- Commit: `4f249cdb1f320cd46119a6af5302a59d0bae450b`
- Source run: `52068f31-2f07-4ad4-9000-83c4054d5b4a`

Each of the three cycles produced identical results:

- selected: `45,082`
- mapped: `33,394`
- eligible: `31,527`
- quarantined: `11,423`
- excluded: `2,132`
- snapshots: `31,527`
- required phases succeeded: `5/5`
- reconciliation mismatches: `0`
- incomplete snapshot lineage: `0`
- current-publication references: `0`

Combined:

- staged immutable snapshots: `94,581`
- complete provenance chains: `94,581`
- active customer rows: `0`

The permanent detailed audit is:

`docs/audits/pricing/TCGPLAYER_MARKET_SHADOW_GATE_1_20260728.md`

## Current Truths

- TCGPlayer `marketPrice` remains the only Production V1 headline.
- The production warehouse contains a complete fresh TCGCSV run.
- Exact artifact lineage is present for all `45,082` scoped Pokemon price
  observations.
- Qualification is deterministic across repeated runs at one commit.
- All publication sets from Gate 1 remain staged and unpublished.
- The shared product read model is implemented across supported web and Flutter
  pricing consumers.
- Anonymous pricing remains gated.
- Gate 1 passed; the 100-printing data/image verification gate has not.

## Invariants

1. TCGPlayer `marketPrice` is the Production V1 market close.
2. Grookai Value does not exist in the V1 product path.
3. Supporting source fields and eBay active asks cannot alter market close.
4. Exact printings never inherit sibling or parent prices.
5. Qualification decisions and publication snapshots remain immutable.
6. Every eligible snapshot resolves to one source row and immutable artifact.
7. Shadow publication never changes the current-publication pointer.
8. Product clients never query raw warehouse or policy tables.
9. Ordinary exact V1 rows do not require manual microapproval.
10. Failed or ambiguous mappings remain quarantined with deterministic reasons.

## What Must Never Be Broken

- exact card, printing, language, and finish qualification
- source-row and artifact provenance
- append-only decision and snapshot ledgers
- deterministic reconciliation
- stale-data fail-closed behavior
- one shared read contract for every product client
- explicit separation between staged, canary, and public activation

## Why This Mattered

This gate proves production can repeatedly transform a fresh provider artifact
into the same exact eligible publication set while preserving complete
provenance and exposing nothing prematurely. Pricing is now an operational
pipeline rather than a local feature implementation.

## Explicit Next Gate

Create a durable, stratified 100-printing canary from the frozen eligible set.
For every printing, verify canonical card, exact child printing, finish,
headline market price, source product, and full provenance chain against the
source image/data. Do not replace failed samples.

Only after all 100 pass may that exact allowlist be activated for authenticated
collectors for 72 hours. Anonymous pricing remains gated.
