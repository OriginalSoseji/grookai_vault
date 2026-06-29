# MEE-11P Market Listing Daily Batch Backfill Repair Plan

- Ready for apply approval: `true`
- Package fingerprint: `b0b65f427302042ba29889133a968551110cd277c7b5bfa2a68edd505b8ce79a`
- Row manifest hash: `d49476930339252c71ab15dd71e4a83a1ef207b627a5e4b5767d8afb04d9cb04`

## Counts

- Missing seller rows: `22856`
- Missing price event rows: `129665`
- Existing seller rows skipped: `1000`
- Existing price event rows skipped: `0`
- Negative feedback scores sanitized: `20`

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-REPAIR-APPLY-V1 apply only. Package fingerprint: b0b65f427302042ba29889133a968551110cd277c7b5bfa2a68edd505b8ce79a. Row manifest hash: d49476930339252c71ab15dd71e4a83a1ef207b627a5e4b5767d8afb04d9cb04. Source plan fingerprint: 2ebd59a1c8b56e8f613ebd7c5a616a82c655bb0b2eed9899b71d309ba2226c44. Source row manifest hash: 92b002b5831f77b75c4ede1445a5dd2993bbee7df1a41ae78f83b539b185704a. Scope: insert 22856 missing sanitized market_listing_seller_snapshots rows and 129665 market_listing_price_events rows from local MEE-11P repair artifacts only, completing the partial MEE-11N apply while preserving slab/raw-single classification metadata in event_payload. Negative seller feedback_score values are normalized to null to satisfy the existing warehouse constraint. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
