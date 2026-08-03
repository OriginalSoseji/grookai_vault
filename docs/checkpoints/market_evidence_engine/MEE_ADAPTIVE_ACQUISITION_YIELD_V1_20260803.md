# MEE Adaptive Acquisition Yield V1 Checkpoint

## Context

The latest 4,000-call market-listing acquisition run returned 284,384 rows from a theoretical maximum of 800,000. The scheduler was static: empty, exhausted, and provider-repeated pages consumed call capacity that could not be reassigned to later candidates.

Baseline commit before this repair:

`8ff61b607a6027715feef473d61b37fa3140ed30`

Branch:

`agent/market-listing-adaptive-yield-v1`

## Problem

The old scheduler coupled candidate count to provider-call count. It also spent most calls on low-yield exact queries and retained shelf templates that were unsuitable for the eBay single-card category.

The provider can return its final page again for offsets beyond the reported total. Raw fetched-row counts therefore overstated useful evidence.

## Decision

Adopt `MEE_11V_MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_V1` as the next acquisition candidate, subject to a paid/live provider canary.

The governed policy is:

- freeze more candidates than can be called;
- cap actual provider calls separately;
- stop a query family from prior response evidence;
- replace skipped pages with later candidates;
- reserve 90% of calls for high-yield discovery and 10% for precision;
- remove language, sealed, and slab shelf templates from the single-card acquisition plan;
- keep skipped requests out of provider-response and backfill artifacts;
- judge efficiency by raw yield, unique yield, and evidence utility.

## Alternatives Rejected

- Counting repeated rows toward utilization: inflates evidence without adding market coverage.
- Removing precision acquisition entirely: maximizes row count but weakens exact-printing evidence.
- Continuing to plan exactly 4,000 pages: cannot replace exhausted pages.
- Treating every short page as exhausted despite a larger provider total: can suppress valid later pages.
- Activating the change directly in production without a bounded canary: insufficient live reconciliation proof.

## Current Truths

- Current run: 4,000 calls, 284,384 rows, 232,630 unique listings, 35.55% raw envelope fill.
- Offline MEE-11V projection: 714,081 rows and 89.26% raw envelope fill.
- Overlap-adjusted unique projection: 584,128 listings; this remains an estimate.
- Real-corpus candidate replay: 5,831 discovery plus 1,200 precision candidates behind a 4,000-call ceiling.
- Relevant local contracts: 66/66 passed after final scheduler guards.
- No provider calls or DB writes were made during implementation or replay.
- Production remains on its prior code and behavior.

## Invariants

- Provider calls never exceed the frozen call ceiling.
- Skips never masquerade as provider responses.
- Every provider response remains auditable.
- Repeated pages do not add projected observations.
- Discovery volume cannot erase the protected precision lane.
- Broad evidence remains internal and review-governed.
- No acquisition artifact can publish pricing directly.
- No identity, vault, public pricing, or app-facing table is mutated by planning/fetch phases.

## What Must Never Be Broken

- Exact canonical and finish evidence remains the authority for publication.
- Broad acquisition volume cannot be treated as market truth without downstream qualification.
- The theoretical 800,000-row envelope cannot be reported as guaranteed inventory or unique listings.
- A future optimization cannot weaken call ceilings, artifact reconciliation, or no-write boundaries.

## Evidence

- [MEE-11V adaptive yield audit](../../audits/market_evidence_engine_v1/MEE_11V_ADAPTIVE_YIELD_OFFLINE_REPLAY_2026_08_03.md)
- Ignored JSON replay SHA-256: `19fd4b52f28f4567f226a406001e43082286e3b3df790f4f9a9b908d44225e39`
- Ignored JSON candidate replay SHA-256: `bf2f9e97a7336081770d32f4199cba1806cd70587d73501f0e815d46859a2185`

## Explicit Next Gate

Freeze this implementation in a commit, then run one 200-call adaptive provider canary with local artifacts only and no database writes. Stop for reconciliation before deployment or any 4,000-call run.
