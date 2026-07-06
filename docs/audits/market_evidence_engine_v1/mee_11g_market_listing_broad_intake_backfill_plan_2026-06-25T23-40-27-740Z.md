# MEE-11G Market Listing Broad Intake Backfill Plan

- Package: `MARKET-LISTING-BROAD-INTAKE-BACKFILL-PLAN-V1`
- Ready for apply approval: `true`
- Package fingerprint: `d9b5463efbdfc41ad22c2b846911b937203a5273000c20dfc3bbc303c61a812c`
- Row manifest hash: `6ab07f492e4e14091a8294eac94fb4c754cf4d13c825a1553c486ffaf07e6aeb`
- Source package fingerprint: `52388b720c74445b5ce6dfb48e712dbedddb15347a5497c73a68437e050a2f7a`
- Raw snapshot manifest hash: `eeeee0cdaeb616b54ed1c758196ad85d5f502542f85db9c632e026255cfbe455`
- Projected observation manifest hash: `60fa0344b78b753b77c7fb3ac7fd3d99eceee428cfba8fd89382bf6aa84ad51f`
- Smoke artifact: `docs/audits/market_evidence_engine_v1/mee_11f_market_listing_broad_intake_smoke_2026-06-25T23-02-59-744Z.json`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| `market_listing_acquisition_runs` | 1 |
| `market_listing_query_cache` | 5 |
| `market_listing_raw_snapshots` | 1000 |
| `market_listing_observations` | 1000 |
| `market_listing_seller_snapshots` | 412 |
| `market_listing_price_events` | 1000 |
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
Approve real MARKET-LISTING-BROAD-INTAKE-BACKFILL-APPLY-V1 apply only. Package fingerprint: d9b5463efbdfc41ad22c2b846911b937203a5273000c20dfc3bbc303c61a812c. Row manifest hash: 6ab07f492e4e14091a8294eac94fb4c754cf4d13c825a1553c486ffaf07e6aeb. Source package fingerprint: 52388b720c74445b5ce6dfb48e712dbedddb15347a5497c73a68437e050a2f7a. Raw snapshot manifest hash: eeeee0cdaeb616b54ed1c758196ad85d5f502542f85db9c632e026255cfbe455. Projected observation manifest hash: 60fa0344b78b753b77c7fb3ac7fd3d99eceee428cfba8fd89382bf6aa84ad51f. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: insert 1 market_listing_acquisition_runs row, 5 market_listing_query_cache rows, 1000 market_listing_raw_snapshots rows, 1000 market_listing_observations rows, 412 market_listing_seller_snapshots rows, and 1000 market_listing_price_events rows from local MEE-11F broad intake smoke artifacts only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
