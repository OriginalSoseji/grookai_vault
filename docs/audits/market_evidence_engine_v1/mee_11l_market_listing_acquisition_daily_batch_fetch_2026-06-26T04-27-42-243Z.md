# MEE-11L Market Listing Acquisition Daily Batch Fetch

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1`
- Ready for local DB backfill plan: `false`
- Package fingerprint: `0ea9b5f361afc6898f0fd4d37278d191560d5a0327780ba64f5c6d6829002b57`
- Request results manifest hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Raw snapshot manifest hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Projected observation manifest hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Attempted requests: `0`
- Fetched items: `0`
- Projected observations: `0`
- Unique listings: `0`
- Raw singles: `0`
- Slabs: `0`

## Boundary

- Provider calls happened only for the approved daily batch.
- Local artifacts only.
- No database writes.
- No market listing warehouse writes.
- No public/app-visible pricing.

## Counts

```json
{
  "fetch_status_counts": {},
  "evidence_class_counts": {},
  "exclusion_flag_counts": {},
  "strategy_counts": {}
}
```

## Findings

- package_fingerprint_mismatch
- request_manifest_hash_mismatch
- source_dry_run_fingerprint_mismatch

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1 plan only. Package fingerprint: 0ea9b5f361afc6898f0fd4d37278d191560d5a0327780ba64f5c6d6829002b57. Request results manifest hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855. Raw snapshot manifest hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855. Projected observation manifest hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855. Scope: prepare DB backfill apply package from local MEE-11L daily batch fetch artifacts only, targeting market_listing_* warehouse tables only and preserving slab/raw-single classification metadata. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
