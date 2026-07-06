# MEE-11G Market Listing Broad Intake Backfill Plan

- Package: `MARKET-LISTING-BROAD-INTAKE-BACKFILL-PLAN-V1`
- Ready for apply approval: `true`
- Package fingerprint: `36159efc9466172ab85d41234ac403237e8c443977f625101ce7a8111e908d0e`
- Row manifest hash: `7a4b430455774c98fe0f77bbf7d4ef371f67122559fb30985549a55a2a06665e`
- Source package fingerprint: `15707ae9fdce5423c7dc04133d102df96e3c8c0650309c91ec01cfd53677e1a1`
- Raw snapshot manifest hash: `0efb8cd015a1ba1a7a047ffe8de3621a9bd13457aa1779d8b925615e316d038c`
- Projected observation manifest hash: `7c66f33bf09e02879048cba91c44ea32de0c85fa6e05f745d2a774245c6fe80f`
- Smoke artifact: `docs/audits/market_evidence_engine_v1/mee_11f_market_listing_broad_intake_smoke_2026-06-25T22-38-27-426Z.json`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| `market_listing_acquisition_runs` | 1 |
| `market_listing_query_cache` | 5 |
| `market_listing_raw_snapshots` | 25 |
| `market_listing_observations` | 25 |
| `market_listing_seller_snapshots` | 23 |
| `market_listing_price_events` | 25 |
| `market_listing_card_candidates` | 0 |
| `market_listing_rollups` | 0 |

## Apply Order

- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_price_events`

## Boundary

- Plan only.
- No provider calls.
- No source fetches.
- No database writes.
- No public/app-visible pricing.
- No card candidate writes.
- No rollup writes.

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-BROAD-INTAKE-BACKFILL-APPLY-V1 apply only. Package fingerprint: 36159efc9466172ab85d41234ac403237e8c443977f625101ce7a8111e908d0e. Row manifest hash: 7a4b430455774c98fe0f77bbf7d4ef371f67122559fb30985549a55a2a06665e. Source package fingerprint: 15707ae9fdce5423c7dc04133d102df96e3c8c0650309c91ec01cfd53677e1a1. Raw snapshot manifest hash: 0efb8cd015a1ba1a7a047ffe8de3621a9bd13457aa1779d8b925615e316d038c. Projected observation manifest hash: 7c66f33bf09e02879048cba91c44ea32de0c85fa6e05f745d2a774245c6fe80f. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: insert 1 market_listing_acquisition_runs row, 5 market_listing_query_cache rows, 25 market_listing_raw_snapshots rows, 25 market_listing_observations rows, 23 market_listing_seller_snapshots rows, and 25 market_listing_price_events rows from local MEE-11F broad intake smoke artifacts only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
