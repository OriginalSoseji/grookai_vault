# Market Evidence Engine Core V1 Package

Status: candidate

Date: 2026-06-26

## Purpose

This package resets the Market Evidence Engine around a provider-agnostic lifecycle.

It does not optimize eBay coverage, build public pricing, write app-visible prices, or promote any evidence to market truth.

## Package Contents

- Architecture audit: `docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md`
- Lifecycle contract: `docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md`
- State transition rules: `docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md`
- Table/view gap analysis: `docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md`
- Implementation plan: `docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md`
- Verification plan: `docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md`
- Checkpoint: `docs/checkpoints/market_evidence_engine/MARKET_EVIDENCE_ENGINE_CORE_V1.md`

## Audit Findings

Verified remote schema objects:

- `market_reference_acquisition_runs`
- `market_reference_raw_snapshots`
- `market_reference_candidates`
- `market_reference_normalized_evidence`
- `market_reference_coverage_reports`
- `market_reference_signal_rollups`
- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_card_candidates`
- `market_listing_price_events`
- `market_listing_rollups`
- `pricing_observations`
- `ebay_active_prices_latest`
- `v_card_pricing_ui_v1`

Verified safety state:

- `market_reference_*` and `market_listing_*` tables are service-role-only.
- New reference and listing candidates are review-only.
- New reference and listing rollups are internal-only.
- `pricing_observations` is empty.
- `v_card_pricing_ui_v1` reads legacy `ebay_active_prices_latest`, not the new market warehouses.

Verified counts:

| Object | Count |
| --- | ---: |
| `market_reference_acquisition_runs` | 5 |
| `market_reference_raw_snapshots` | 10,788 |
| `market_reference_candidates` | 21,760 |
| `market_reference_normalized_evidence` | 21,745 |
| `market_reference_signal_rollups` | 1,986 |
| `market_listing_acquisition_runs` | 3 |
| `market_listing_raw_snapshots` | 130,686 |
| `market_listing_observations` | 130,686 |
| `market_listing_card_candidates` | 108,600 |
| `market_listing_rollups` | 4,518 |
| `pricing_observations` | 0 |
| `ebay_active_prices_latest` | 1,690 |

## Lifecycle Reset

The lifecycle is:

`acquired -> raw_stored -> normalized -> matched -> classified -> quality_gated -> rollup_eligible -> rolled_up_internal -> publishable -> app_visible`

Every provider is an evidence adapter into this lifecycle.

## Current Gaps

- No single lifecycle state table or view.
- No central state transition history.
- Reference and listing normalized shapes differ.
- Listing observations lack a first-class normalized evidence table.
- Matching and classification semantics are not shared across providers.
- Publication gates are defensive flags, not yet a complete promotion workflow.
- Audit/replay exists in artifacts, but not one provider-agnostic lifecycle readback.

## Implementation Path

1. Build a read-only lifecycle projection over existing warehouses.
2. Design append-only lifecycle event storage.
3. Define provider adapter output contracts.
4. Define normalized observation schema candidate.
5. Define publication gate contract separately.
6. Add tests proving providers cannot publish or skip lifecycle stages.

## Boundary

This package performs no DB writes, no migrations, no public pricing work, no coverage planning, and no provider acquisition.

