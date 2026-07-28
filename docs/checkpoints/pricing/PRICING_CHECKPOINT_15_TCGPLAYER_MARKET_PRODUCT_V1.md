# Pricing Checkpoint 15: TCGPlayer Market Product V1

## Context

Grookai had substantial pricing ingestion, evidence, review, and projection
infrastructure but no single production definition of the price shown to a
collector. Existing clients could consume synthetic Grookai Value fields or
active-listing evidence through different paths.

## Problem

Ingestion counts did not prove that a source row became the correct displayed
price. App surfaces did not share one governed read model. The public product
therefore could not be considered finished or operationally traceable.

## Risk

- ambiguous parent or finish mappings could publish the wrong printing
- active asks could be mistaken for a market close
- stale source rows could remain visible
- web and Flutter could display different prices
- a displayed value could lack source-to-UI provenance

## Decision

Production V1 uses the exact TCGPlayer `marketPrice` for fresh, unambiguous,
ordinary English Pokemon printings. Grookai does not calculate the headline.

All supported clients consume the same signed-in read RPC. Qualification
decisions and publication snapshots are append-only. eBay active asks remain a
separate exact-printing availability lane.

## Alternatives Rejected

- continuing to tune a proprietary Grookai Value before source truth is proven
- using active ask as the headline
- defaulting ambiguous variants to Near Mint or a common finish
- exposing raw warehouse/publication tables to clients
- allowing each product surface to choose its own pricing source

## Current Truths

- Migration history through the currently applied remote ledger is restored on
  `pricing/mee-productization-v1`.
- The V1 migration, policy, publication worker, pipeline, health probe, shared
  read model, web consumers, and Flutter consumers are implemented locally.
- The publication worker is dry-run by default.
- The full repository ship gate passes, including `714/714` Node contract
  tests, web typecheck/lint/production build, Flutter analyze, and Flutter
  tests.
- Local PostgreSQL compilation and security readback prove raw ledgers are
  RLS-enabled and service-role-only, shared pricing reads are
  authenticated-only, and provenance trace is service-role-only.
- Full zero-state migration replay completed locally on 2026-07-27.
- Local integration smoke from commit `a8bba197` published and read back one
  exact `$12.34` TCGPlayer Market row, resumed without duplicate phases,
  created a second generation, rolled back to the first generation, rejected
  append-only mutation, returned one authenticated shared-read row, denied
  authenticated trace execution, and returned one service-role trace.
- The authoritative scheduling package is now defined at `08:15 UTC` with
  bounded same-run retries, operating-system and PostgreSQL overlap locks,
  durable attempt artifacts, guarded legacy-timer replacement, and required
  generic operations-webhook routing.
- The V1 migration has not been applied to production in this checkpoint.
- No production publication rows have been written by this work.

## Invariants

- `market_close` equals source `market_price`.
- Low, mid, high, direct-low, and active asks cannot alter it.
- Every published exact row has one parent, one finish, fresh evidence, and a
  closed provenance chain.
- Ambiguity produces quarantine, not fallback.
- Raw-only vault values may consume the market close; slabs remain unpriced by
  this V1 product.
- No canonical identity or vault mutation occurs in publication.

## What Must Never Be Broken

- source-to-UI traceability
- exact language and finish qualification
- append-only decisions and snapshots
- stale-data fail-closed behavior
- separation of market close and active ask
- one shared read contract across clients

## Explicit Next Gate

Commit and verify the scheduled operations package, then route and test every
supported web and Flutter surface through the shared read model. After those
local gates pass, reconcile the nonempty linked schema diff before any remote
migration apply, run three shadow cycles, and proceed to the bounded signed-in
canary without granting anonymous access.
