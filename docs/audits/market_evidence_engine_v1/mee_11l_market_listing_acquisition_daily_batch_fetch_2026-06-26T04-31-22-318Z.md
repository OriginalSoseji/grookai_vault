# MEE-11L Market Listing Acquisition Daily Batch Fetch

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1`
- Ready for local DB backfill plan: `true`
- Package fingerprint: `13b6d732a3efeda0b479eb74e4092346ab640e0aaf7702271f628940928eefb1`
- Request results manifest hash: `7c7f6dee0e840a68bb2c3c9f212f856134c2bbf8dfc9d10339b1f147c1675dd0`
- Raw snapshot manifest hash: `abfaec2549feefbbbf1fc0dbe8e731b08267f1668feb1a707c7ef26ca29dd04c`
- Projected observation manifest hash: `eac6fdb2bbe3b2f0e058fb99e2a8a5121e74858327439924be9be16226cf0f9b`
- Attempted requests: `3000`
- Fetched items: `23597`
- Projected observations: `23597`
- Unique listings: `11365`
- Raw singles: `12781`
- Slabs: `8471`

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
    "fetched_error": 4,
    "fetched_success": 2996
  },
  "evidence_class_counts": {
    "excluded_or_ambiguous": 2345,
    "raw_single": 12781,
    "slab": 8471
  },
  "exclusion_flag_counts": {
    "bulk": 4,
    "choose_your_card": 270,
    "code_card": 3,
    "complete_set": 20,
    "custom_fake": 9,
    "foreign_language": 1228,
    "jumbo": 29,
    "lot": 1535,
    "menu_listing": 46,
    "minimum_order": 10,
    "proxy_custom": 1,
    "sealed": 141,
    "sleeve_accessory": 31
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
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1 plan only. Package fingerprint: 13b6d732a3efeda0b479eb74e4092346ab640e0aaf7702271f628940928eefb1. Request results manifest hash: 7c7f6dee0e840a68bb2c3c9f212f856134c2bbf8dfc9d10339b1f147c1675dd0. Raw snapshot manifest hash: abfaec2549feefbbbf1fc0dbe8e731b08267f1668feb1a707c7ef26ca29dd04c. Projected observation manifest hash: eac6fdb2bbe3b2f0e058fb99e2a8a5121e74858327439924be9be16226cf0f9b. Scope: prepare DB backfill apply package from local MEE-11L daily batch fetch artifacts only, targeting market_listing_* warehouse tables only and preserving slab/raw-single classification metadata. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
