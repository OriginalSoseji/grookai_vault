# MEE-11L Market Listing Acquisition Daily Batch Fetch

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1`
- Ready for local DB backfill plan: `true`
- Package fingerprint: `efc3fb2642a541f1345f833b003e43be75e74f3ab271098b861b81fa2e16b92d`
- Request results manifest hash: `f2793cd7f245419d56fb9db3e246385417fc782d90913375985ff516cfaf05bd`
- Raw snapshot manifest hash: `c0c075f68d2d76adaff9ceef96de24ac0406adf42663ed294710375ee3bc62ad`
- Projected observation manifest hash: `f08a8eebbe8f1820955591b203b3e85d9ab5b43243dfa42d65c137c3adf430f9`
- Attempted requests: `3000`
- Fetched items: `128460`
- Projected observations: `128460`
- Unique listings: `73107`
- Raw singles: `77618`
- Slabs: `33826`

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
    "excluded_or_ambiguous": 17016,
    "raw_single": 77618,
    "slab": 33826
  },
  "exclusion_flag_counts": {
    "bulk": 67,
    "choose_your_card": 2412,
    "code_card": 20,
    "complete_set": 247,
    "custom_fake": 110,
    "foreign_language": 14664,
    "jumbo": 210,
    "lot": 3431,
    "menu_listing": 638,
    "minimum_order": 286,
    "proxy_custom": 17,
    "sealed": 3118,
    "sleeve_accessory": 173
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
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1 plan only. Package fingerprint: efc3fb2642a541f1345f833b003e43be75e74f3ab271098b861b81fa2e16b92d. Request results manifest hash: f2793cd7f245419d56fb9db3e246385417fc782d90913375985ff516cfaf05bd. Raw snapshot manifest hash: c0c075f68d2d76adaff9ceef96de24ac0406adf42663ed294710375ee3bc62ad. Projected observation manifest hash: f08a8eebbe8f1820955591b203b3e85d9ab5b43243dfa42d65c137c3adf430f9. Scope: prepare DB backfill apply package from local MEE-11L daily batch fetch artifacts only, targeting market_listing_* warehouse tables only and preserving slab/raw-single classification metadata. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```
