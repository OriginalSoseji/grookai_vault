# MEE-11L Market Listing Acquisition Daily Batch Fetch

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1`
- Ready for local DB backfill plan: `true`
- Package fingerprint: `58975dc5090431a83ca4b513fa3d8be97fc182c541580d796a63260a4808514a`
- Request results manifest hash: `69f37f83fad3afffd897c7b3fee45fd53d070ad16ac1c07408b83eaca47bad0c`
- Raw snapshot manifest hash: `27cf71b55eebc84ce5444871435bee61dfafdd7fd17fe1a6182a9628bfec131a`
- Projected observation manifest hash: `85abe190326dadf92ccbccd041ef4e76043a984868c468f337660b6630247a2a`
- Attempted requests: `4000`
- Fetched items: `168744`
- Projected observations: `168744`
- Unique listings: `100870`
- Raw singles: `99566`
- Slabs: `43882`

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
    "fetched_success": 3996
  },
  "evidence_class_counts": {
    "excluded_or_ambiguous": 25296,
    "raw_single": 99566,
    "slab": 43882
  },
  "exclusion_flag_counts": {
    "bulk": 89,
    "choose_your_card": 3827,
    "code_card": 26,
    "complete_set": 625,
    "custom_fake": 174,
    "foreign_language": 21165,
    "jumbo": 368,
    "lot": 6059,
    "menu_listing": 967,
    "minimum_order": 389,
    "proxy_custom": 30,
    "sealed": 3827,
    "sleeve_accessory": 291
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
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1 plan only. Package fingerprint: 58975dc5090431a83ca4b513fa3d8be97fc182c541580d796a63260a4808514a. Request results manifest hash: 69f37f83fad3afffd897c7b3fee45fd53d070ad16ac1c07408b83eaca47bad0c. Raw snapshot manifest hash: 27cf71b55eebc84ce5444871435bee61dfafdd7fd17fe1a6182a9628bfec131a. Projected observation manifest hash: 85abe190326dadf92ccbccd041ef4e76043a984868c468f337660b6630247a2a. Scope: prepare DB backfill apply package from local MEE-11L daily batch fetch artifacts only, targeting market_listing_* warehouse tables only and preserving slab/raw-single classification metadata. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
