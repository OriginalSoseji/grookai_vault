# MEE-11K Market Listing Acquisition Daily Batch Plan

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-PLAN-V1`
- Ready for acquisition approval: `true`
- Package fingerprint: `3cf2760ba07840c27f96b6d26511aee8a8b3673334cc870a83171bd5532316d9`
- Request manifest hash: `28bf3a93e49a0732b843b32e7d73e27798f9334639cd9482407b145f7f404bb8`
- Source dry-run fingerprint: `4059ce0f8c2a20b767df2aee0474ffbd7704e6970d8fb876c81f7b87a52cacb6`
- Batch ordinal: `1`
- Start index: `0`
- Next start index: `4000`
- Batch request count: `4000`
- Remaining request count: `10589`
- Estimated max listing envelope: `800000`

## Boundary

- No provider calls.
- No source fetches.
- No database writes.
- No market listing warehouse writes.
- No public/app-visible pricing.

## Counts

```json
{
  "priority_counts": {
    "priority_base_print_run": 144,
    "priority_special_lane": 3856
  },
  "rarity_priority_counts": {
    "normal_or_collector_priority": 4000
  },
  "strategy_counts": {
    "name_number": 1333,
    "special_lane": 1334,
    "strict_identity": 1333
  }
}
```

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1 acquisition only. Package fingerprint: 3cf2760ba07840c27f96b6d26511aee8a8b3673334cc870a83171bd5532316d9. Request manifest hash: 28bf3a93e49a0732b843b32e7d73e27798f9334639cd9482407b145f7f404bb8. Source dry-run fingerprint: 4059ce0f8c2a20b767df2aee0474ffbd7704e6970d8fb876c81f7b87a52cacb6. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: fetch 4000 prioritized ebay_active Browse API request pages from the local MEE-11K daily batch plan only and write local acquisition artifacts only, including slab listings classified separately from raw singles. No DB writes. No market_listing_* writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
