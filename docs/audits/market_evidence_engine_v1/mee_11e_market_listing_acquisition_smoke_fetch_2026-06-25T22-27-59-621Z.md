# MEE-11E Market Listing Acquisition Smoke Fetch

- Package: `MARKET-LISTING-ACQUISITION-SMOKE-FETCH-V1`
- Ready for DB backfill plan: `false`
- Package fingerprint: `3b1cbc61210ee89c84f14b9581225f6998682e6b75411aebe2578f2f0974c8c8`
- Raw snapshot manifest hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- Projected observation manifest hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- Attempted requests: `5`
- Result limit: `5`
- Fetched items: `0`
- Unique listings: `0`
- Unique targets with results: `0`

## Boundary

- Provider calls happened only for the capped smoke batch.
- Local artifacts only.
- No database writes.
- No market listing warehouse writes.
- No public/app-visible pricing.

## Request Results

| GV ID | Strategy | Status | HTTP | Provider total | Items |
| --- | --- | --- | ---: | ---: | ---: |
| GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | special_lane | fetched_error |  | 0 | 0 |
| GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | strict_identity | fetched_error |  | 0 | 0 |
| GV-PK-WCD-2004-BLAZIKEN_TECH-01-EX_RUBY_AND_SAPP-3-BLAZIKEN | name_number | fetched_error |  | 0 | 0 |
| GV-PK-WCD-2004-BLAZIKEN_TECH-02-EX_TEAM_MAGMA_VS-89-BLAZIKEN_EX | special_lane | fetched_error |  | 0 | 0 |
| GV-PK-WCD-2004-BLAZIKEN_TECH-02-EX_TEAM_MAGMA_VS-89-BLAZIKEN_EX | strict_identity | fetched_error |  | 0 | 0 |

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-SMOKE-FETCH-DB-BACKFILL-PLAN-V1 plan only. Package fingerprint: 3b1cbc61210ee89c84f14b9581225f6998682e6b75411aebe2578f2f0974c8c8. Raw snapshot manifest hash: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. Projected observation manifest hash: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. Scope: prepare DB backfill apply package from the local MEE-11E smoke fetch artifacts only, targeting market_listing_* warehouse tables only. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
