# MEE-11L Market Listing Acquisition Daily Batch Fetch

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1`
- Ready for local DB backfill plan: `true`
- Package fingerprint: `73719b843d31ec09bebd4bdbfb42393971c369dbae92596a8bba45e6301f2e50`
- Request results manifest hash: `f6118dc396d52954550dd843420fa2b70592a15c69fe000e5c073b94c937ae34`
- Raw snapshot manifest hash: `8b6751bff04cd2ed7030d0603b16d9e62d318c6f290fd6fb495700e5b8ecc788`
- Projected observation manifest hash: `84c59dd0af4a0b0bc2cb7705474f5359f10d91e2d44d7e980a3142b279b06e8a`
- Attempted requests: `1`
- Fetched items: `102`
- Projected observations: `102`
- Unique listings: `102`
- Raw singles: `61`
- Slabs: `37`

## Boundary

- Provider calls happened only for the approved daily batch.
- Local artifacts only.
- No database writes.
- No market listing warehouse writes.
- No public/app-visible pricing.

## Counts

```json
{
  "fetch_status_counts": {
    "fetched_success": 1
  },
  "evidence_class_counts": {
    "excluded_or_ambiguous": 4,
    "raw_single": 61,
    "slab": 37
  },
  "exclusion_flag_counts": {
    "foreign_language": 1,
    "sealed": 2,
    "sleeve_accessory": 1
  },
  "strategy_counts": {
    "direct_exact_identity_regression_repair": 1
  }
}
```

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1 plan only. Package fingerprint: 73719b843d31ec09bebd4bdbfb42393971c369dbae92596a8bba45e6301f2e50. Request results manifest hash: f6118dc396d52954550dd843420fa2b70592a15c69fe000e5c073b94c937ae34. Raw snapshot manifest hash: 8b6751bff04cd2ed7030d0603b16d9e62d318c6f290fd6fb495700e5b8ecc788. Projected observation manifest hash: 84c59dd0af4a0b0bc2cb7705474f5359f10d91e2d44d7e980a3142b279b06e8a. Scope: prepare DB backfill apply package from local MEE-11L daily batch fetch artifacts only, targeting market_listing_* warehouse tables only and preserving slab/raw-single classification metadata. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
