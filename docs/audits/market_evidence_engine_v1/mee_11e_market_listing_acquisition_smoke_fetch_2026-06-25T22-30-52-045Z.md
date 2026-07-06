# MEE-11E Market Listing Acquisition Smoke Fetch

- Package: `MARKET-LISTING-ACQUISITION-SMOKE-FETCH-V1`
- Ready for DB backfill plan: `true`
- Package fingerprint: `ba86928e143b45193f48ace1dc1464b6ae56253501e0cbc1c1292682eef9d736`
- Raw snapshot manifest hash: `cd2b774cc146aa636154a3bc3e3a7524ba5ca31910cddf4ce18ddc588569fead`
- Projected observation manifest hash: `5bebf0bda02b94083bec05d363a5ca4aee92602929f1191876e5e8f3f51e3bb8`
- Attempted requests: `5`
- Result limit: `5`
- Fetched items: `5`
- Unique listings: `5`
- Unique targets with results: `1`

## Boundary

- Provider calls happened only for the capped smoke batch.
- Local artifacts only.
- No database writes.
- No market listing warehouse writes.
- No public/app-visible pricing.

## Request Results

| GV ID | Strategy | Status | HTTP | Provider total | Items |
| --- | --- | --- | ---: | ---: | ---: |
| GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | special_lane | fetched_success | 200 | 0 | 0 |
| GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | strict_identity | fetched_success | 200 | 0 | 0 |
| GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | name_number | fetched_success | 200 | 502 | 5 |
| GV-PK-WCD-2004-BLAZIKEN_TECH-02-EX_TEAM_MAGMA_VS-89-BLAZIKEN_EX | special_lane | fetched_success | 200 | 0 | 0 |
| GV-PK-WCD-2004-BLAZIKEN_TECH-02-EX_TEAM_MAGMA_VS-89-BLAZIKEN_EX | strict_identity | fetched_success | 200 | 0 | 0 |

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-SMOKE-FETCH-DB-BACKFILL-PLAN-V1 plan only. Package fingerprint: ba86928e143b45193f48ace1dc1464b6ae56253501e0cbc1c1292682eef9d736. Raw snapshot manifest hash: cd2b774cc146aa636154a3bc3e3a7524ba5ca31910cddf4ce18ddc588569fead. Projected observation manifest hash: 5bebf0bda02b94083bec05d363a5ca4aee92602929f1191876e5e8f3f51e3bb8. Scope: prepare DB backfill apply package from the local MEE-11E smoke fetch artifacts only, targeting market_listing_* warehouse tables only. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
