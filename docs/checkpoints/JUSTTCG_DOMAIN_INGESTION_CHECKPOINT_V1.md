# JUSTTCG_DOMAIN_INGESTION_CHECKPOINT_V1

## Status

`ACTIVE / VERIFIED / COMPLETE FOR SOURCE DOMAIN BUILD`

## Date

`2026-03-21`

## Context

The JustTCG domain was introduced because Grookai needed a source-isolated way to ingest and retain structured third-party pricing data without contaminating the existing eBay truth lane.

Two architectural requirements made a separate domain necessary:

- source isolation had to remain strict so JustTCG data could not leak into existing pricing tables or views
- variant preservation had to remain intact because JustTCG pricing is structured at the variant level rather than the single-price-per-`card_print` shape used by the active eBay lane

This checkpoint records the completed source-domain build and ingestion milestone for that isolated JustTCG domain.

## Problem

JustTCG pricing did not fit the existing eBay / `card_print` pricing lanes.

The current Grookai pricing surfaces are built around existing eBay-derived pricing structures, while JustTCG provides condition-aware and printing-aware variant pricing. Flattening that upstream variant structure into the existing lanes would have created contamination, loss of dimensionality, and future reconciliation problems.

Because of that mismatch, JustTCG required its own source domain with its own snapshot and latest layers.

## Decision

Grookai locked the following decision path:

- build an isolated JustTCG source domain
- preserve the JustTCG variant structure as first-class data
- follow a snapshot -> latest derivation model
- defer any aggregation into Grookai Value until a later comparison / reconciliation phase

This kept the domain non-canonical, replayable, and structurally compatible with the broader multi-source architecture.

## System Changes

Concrete completed artifacts:

- schema tables:
  - `public.justtcg_variants`
  - `public.justtcg_variant_price_snapshots`
  - `public.justtcg_variant_prices_latest`
- worker files:
  - `backend/pricing/justtcg_domain_dry_run_worker_v1.mjs`
  - `backend/pricing/justtcg_domain_ingest_worker_v1.mjs`
  - `backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs`
- supporting batch/lookup contract:
  - `docs/contracts/JUSTTCG_BATCH_LOOKUP_CONTRACT_V1.md`
- domain and architecture docs:
  - `docs/contracts/MULTI_SOURCE_ARCHITECTURE_INVARIANTS_V1.md`
  - `docs/contracts/JUSTTCG_DOMAIN_CONTRACT_V1.md`
  - `docs/contracts/JUSTTCG_DOMAIN_IMPLEMENTATION_PLAN_V1.md`
  - `docs/contracts/JUSTTCG_DOMAIN_SCHEMA_SPEC_V1.md`
- completed milestone path:
  - L3 audits completed
  - domain contract created
  - implementation plan created
  - schema spec created
  - schema migration applied
  - dry-run worker built and validated
  - write worker built and validated
  - full ingestion completed successfully
  - latest builder built and validated

Verified production counts at this checkpoint:

- `justtcg_variants = 112113`
- `justtcg_variant_price_snapshots = 112919`
- `justtcg_variant_prices_latest = 112113`

## Current Truths

Current verified production truths:

- `justtcg_variants` row count = `112113`
- `justtcg_variant_price_snapshots` row count = `112919`
- `justtcg_variant_prices_latest` row count = `112113`
- duplicate latest rows = `0`
- orphan latest / `card_print` references = `0`
- `justtcg_variant_prices_latest` is derived from snapshots and is not directly ingested

Operational meaning:

- the isolated JustTCG source domain is built and populated
- the latest table is structurally consistent with the snapshot layer
- the domain is ready for controlled downstream comparison work

## Invariants

The following rules remain in force:

- JustTCG remains non-canonical
- source isolation is mandatory
- variants are first-class pricing units
- snapshots are append-only
- latest is derived from snapshots
- direct ingestion writes to `justtcg_variant_prices_latest` are not allowed
- Grookai Value integration remains deferred

## Why It Mattered

This milestone matters because it converts JustTCG from an external integration idea into a usable internal source domain with deterministic storage and replayable current-state reads.

That unlocks the next serious work:

- JustTCG vs eBay comparison
- future aggregation design
- vendor-range analysis
- confidence-system inputs
- broader multi-source pricing architecture work

Without this domain, those next steps would either be impossible or would require breaking the existing pricing architecture.

## Next Phase

The next phase is not more ingestion.

The next phase is comparison / reconciliation against existing pricing lanes.

That means:

- compare isolated JustTCG signals against existing eBay-backed pricing
- measure divergence and compatibility
- use that evidence to guide any later aggregation design

Aggregation into Grookai Value is still deferred at this checkpoint.

## Decision

The JustTCG source-domain build and ingestion milestone is complete.

Proceed next with comparison / reconciliation work against existing pricing lanes.

Keep the JustTCG domain isolated, variant-aware, and non-canonical while that comparison phase is developed.
