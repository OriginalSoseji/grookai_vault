# MEE-09Q Remaining Single-Source Exact Source Fetch

- Package: `MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-FETCH-V1`
- Ready for review backfill plan: `true`
- Candidate evidence manifest hash: `18a642c2731441f83dfcd2908e375af0ad3fd62211eb6ca6e8088cc7c4e4e168`
- Source package fingerprint: `aa015df3496947b1bc31c028c5c0fca848fccf85c129b94ddc80ef39c84aa077`
- Source package artifact: `docs/audits/market_evidence_engine_v1/mee_09p_remaining_single_source_exact_source_acquisition_plan_2026-06-25T20-20-35-027Z.json`
- Requests: `54`
- Candidate evidence rows: `15`
- Targets with candidates: `9`

## Boundary

- Approved provider fetch into local artifacts only.
- No database writes.
- No pricing observations writes.
- No eBay latest price writes.
- No public/app-visible pricing.
- No price rollups.

## Fetch Status Counts

| Status | Requests |
| --- | ---: |
| fetched_error | 1 |
| fetched_success | 17 |
| not_fetched_no_approved_sold_access_path | 18 |
| seeded_no_provider_fetch | 18 |

## Candidate Source Counts

| Source | Candidates |
| --- | ---: |
| ebay_active | 15 |

## Request Results

| GV ID | Source | Status | Candidates | Reason |
| --- | --- | --- | ---: | --- |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | ebay_active | fetched_success | 0 |  |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | ebay_active | fetched_success | 0 |  |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | ebay_active | fetched_success | 0 |  |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | ebay_active | fetched_success | 0 |  |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-COL-SL6 | ebay_active | fetched_success | 2 |  |
| GV-PK-COL-SL6 | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-COL-SL6 | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-COL-SL5 | ebay_active | fetched_success | 3 |  |
| GV-PK-COL-SL5 | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-COL-SL5 | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-COL-SL1 | ebay_active | fetched_success | 1 |  |
| GV-PK-COL-SL1 | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-COL-SL1 | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-COL-SL8 | ebay_active | fetched_success | 3 |  |
| GV-PK-COL-SL8 | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-COL-SL8 | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | ebay_active | fetched_success | 0 |  |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | ebay_active | fetched_success | 1 |  |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | ebay_active | fetched_success | 0 |  |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | ebay_active | fetched_success | 1 |  |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | ebay_active | fetched_success | 0 |  |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | ebay_active | fetched_error | 0 | [remaining-single-source-fetch] PowerShell HTTPS fallback returned invalid JSON: Expected ',' or '}' after property value in JSON at position 2941 (line 1 column 2942) |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | ebay_active | fetched_success | 1 |  |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | ebay_active | fetched_success | 1 |  |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-BW05 | ebay_active | fetched_success | 0 |  |
| GV-PK-PR-BLW-BW05 | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-BW05 | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |
| GV-PK-PR-BLW-BW04 | ebay_active | fetched_success | 2 |  |
| GV-PK-PR-BLW-BW04 | ebay_sold_candidate | not_fetched_no_approved_sold_access_path | 0 | sold/completed eBay access path is not implemented in this package |
| GV-PK-PR-BLW-BW04 | manual_review_candidate | seeded_no_provider_fetch | 0 | manual review route is a local review seed |

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-BACKFILL-PLAN-V1 plan only. Candidate evidence manifest hash: 18a642c2731441f83dfcd2908e375af0ad3fd62211eb6ca6e8088cc7c4e4e168. Source package fingerprint: aa015df3496947b1bc31c028c5c0fca848fccf85c129b94ddc80ef39c84aa077. Scope: prepare DB backfill package for 15 local fetched candidate evidence rows from MEE-09Q only. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
