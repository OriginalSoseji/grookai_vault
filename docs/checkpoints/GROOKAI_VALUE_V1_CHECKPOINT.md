# GROOKAI_VALUE_V1_CHECKPOINT

## Status

`ACTIVE / VERIFIED / FIRST MULTI-SOURCE VALUE ENGINE`

## Date

`2026-03-21`

## Context

Multi-source pricing was needed because single-source pricing could not provide a durable pricing engine for Grookai.

The existing eBay lane remained necessary, but it was not sufficient on its own:

- a single source cannot explain disagreements in the market
- a single source cannot expose reconciliation quality
- a single source cannot support a trust-aware multi-source value engine

With the JustTCG domain fully ingested and isolated, Grookai reached the point where side-by-side comparison could be built safely without contaminating the canonical pricing lanes.

## Problem

The comparison phase exposed three classes of problems that had to be made explicit before any value engine could exist:

- JustTCG and eBay disagree on price
- identity mismatches reduce usable overlap
- condition mismatch can create false comparison signals if not constrained correctly

This meant Grookai could not trust either source alone and could not jump directly from ingestion to a final value output.

## Decision

Grookai took the following path for V1:

- build a comparison layer between isolated JustTCG latest pricing and the existing eBay lane
- classify comparison outcomes instead of flattening them
- validate the eBay side before deriving downstream value
- derive Grookai Value only from the cleaned comparison path

This established the first true multi-source pricing engine without altering existing truth lanes or collapsing source differences prematurely.

## System Changes

Completed source-domain foundation:

- `public.justtcg_variants`
- `public.justtcg_variant_price_snapshots`
- `public.justtcg_variant_prices_latest`

Completed comparison / validation / value views:

- `public.v_justtcg_vs_ebay_pricing_v1`
- `public.v_justtcg_vs_ebay_classified_v1`
- `public.v_justtcg_vs_ebay_valid_v1`
- `public.v_grookai_value_v1_clean`

Resulting pipeline:

`justtcg_variant_prices_latest`
`-> v_justtcg_vs_ebay_pricing_v1`
`-> v_justtcg_vs_ebay_classified_v1`
`-> v_justtcg_vs_ebay_valid_v1`
`-> v_grookai_value_v1_clean`

Verified production counts at this checkpoint:

- `justtcg_variants = 112113`
- `justtcg_variant_price_snapshots = 112919`
- `justtcg_variant_prices_latest = 112113`
- `rows_with_value = 1031`

## Current Truths

Current verified pricing-engine state:

- rows with value = `1031`
- valid = `983`
- invalid = `48`
- unknown = `13599`

Operational interpretation:

- Grookai Value V1 now exists as a real derived engine
- usable value rows are currently a constrained overlap subset, not full-catalog coverage
- invalid and unknown populations remain part of the active reconciliation backlog

## Invariants

The following rules remain in force:

- JustTCG is non-canonical
- eBay must be validated
- no source is trusted alone
- latest is derived
- identity must precede pricing

These invariants hold the engine in a safe multi-source form and prevent regression back into single-source assumptions.

## Why It Matters

This milestone matters because Grookai now has its first true pricing engine rather than a single-source pricing lane.

What now exists:

- multi-source reconciliation
- an explicit trust layer
- a controlled path from isolated source data to a derived Grookai value output

This is the foundation required for broader multi-source pricing architecture, confidence modeling, and future pricing explainability.

## Next Phase

The next phase is engine refinement, not another foundational rebuild.

Primary next-phase work:

- identity alignment improvements
- reduction of invalid rows
- expansion of overlap coverage
- introduction of confidence scoring

This checkpoint marks the first working Grookai Value engine, not the final coverage or confidence state.

## Decision

Grookai Value V1 is now established as the first verified multi-source pricing engine.

Proceed with reconciliation improvements, overlap expansion, and confidence-layer work while preserving the existing source-isolated architecture and validation rules.
