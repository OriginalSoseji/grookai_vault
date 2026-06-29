# MEE-11S Market Listing Card Candidate Rollup Plan

- Ready for apply approval: `true`
- Package fingerprint: `35cb5acf0fd4f6063ba992d52c0262c3a16915ca7c2c4c31f9f8ed820d3d04c7`
- Row manifest hash: `715e2afba6dff99979df4ed9b27bb413bcb616752bf6f21c27f4a0dbaf5b29cb`

## Proposed Rows

```json
{
  "market_listing_card_candidates": 98,
  "market_listing_rollups": 2
}
```

## Summary

```json
{
  "scanned_price_events": 102,
  "skipped_non_candidate_events": 4,
  "retarget_catalog_size": 27266,
  "title_retarget_counts": {
    "ambiguous_exact_title_target": 1,
    "title_confirmed_original_target": 101
  },
  "evidence_class_counts": {
    "excluded_or_ambiguous": 4,
    "raw_single": 61,
    "slab": 37
  },
  "rollup_class_counts": {
    "raw_single": 1,
    "slab": 1
  }
}
```

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-CARD-CANDIDATE-ROLLUP-APPLY-V1 apply only. Package fingerprint: 35cb5acf0fd4f6063ba992d52c0262c3a16915ca7c2c4c31f9f8ed820d3d04c7. Row manifest hash: 715e2afba6dff99979df4ed9b27bb413bcb616752bf6f21c27f4a0dbaf5b29cb. Source readback fingerprint: 3ecef7a22b6209c5a68fc591d58d6e63519dd97c0327259b74f39afe7b281d95. Scope: insert 98 review-only market_listing_card_candidates rows and 2 internal-only market_listing_rollups rows from local MEE-11S artifacts only, keeping raw_single and slab rollups separated and not app-visible. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
