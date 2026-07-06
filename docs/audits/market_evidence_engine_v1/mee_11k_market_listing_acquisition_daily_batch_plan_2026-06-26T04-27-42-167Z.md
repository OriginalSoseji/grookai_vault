# MEE-11K Market Listing Acquisition Daily Batch Plan

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-PLAN-V1`
- Ready for acquisition approval: `true`
- Package fingerprint: `1f9428050a4e364135d49494861d8b8b3ea0c269758026d514f631c27e0c6a58`
- Request manifest hash: `c2e3c357ec910c401044a662039accd7696955020e532a22deaa6cb74d83f3a5`
- Source dry-run fingerprint: `9b615a0066801f7ae37783ed9b71456275183a05519456cecc8c98120dfb0bac`
- Batch ordinal: `1`
- Start index: `0`
- Next start index: `3000`
- Batch request count: `3000`
- Remaining request count: `0`
- Estimated max listing envelope: `600000`

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
    "priority_special_lane": 3000
  },
  "rarity_priority_counts": {
    "normal_or_collector_priority": 3000
  },
  "strategy_counts": {
    "name_number": 1000,
    "special_lane": 1000,
    "strict_identity": 1000
  }
}
```

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1 acquisition only. Package fingerprint: 1f9428050a4e364135d49494861d8b8b3ea0c269758026d514f631c27e0c6a58. Request manifest hash: c2e3c357ec910c401044a662039accd7696955020e532a22deaa6cb74d83f3a5. Source dry-run fingerprint: 9b615a0066801f7ae37783ed9b71456275183a05519456cecc8c98120dfb0bac. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: fetch 3000 prioritized ebay_active Browse API request pages from the local MEE-11K daily batch plan only and write local acquisition artifacts only, including slab listings classified separately from raw singles. No DB writes. No market_listing_* writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
