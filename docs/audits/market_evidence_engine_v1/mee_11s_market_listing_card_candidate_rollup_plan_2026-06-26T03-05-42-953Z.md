# MEE-11S Market Listing Card Candidate Rollup Plan

- Ready for apply approval: `true`
- Package fingerprint: `8d88939703699fca8745a36bb8dc957d29a0323798b666bbb6bb67418cf67786`
- Row manifest hash: `8fd35140b5e38b8f898fa6c55ee01767478abf8ffd454117991f3168692bc37e`

## Proposed Rows

```json
{
  "market_listing_card_candidates": 108600,
  "market_listing_rollups": 2275
}
```

## Summary

```json
{
  "scanned_price_events": 130686,
  "skipped_non_candidate_events": 22086,
  "evidence_class_counts": {
    "excluded_or_ambiguous": 21065,
    "raw_single": 75918,
    "slab": 32682,
    "unknown": 1021
  },
  "rollup_class_counts": {
    "raw_single": 1207,
    "slab": 1068
  }
}
```

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-CARD-CANDIDATE-ROLLUP-APPLY-V1 apply only. Package fingerprint: 8d88939703699fca8745a36bb8dc957d29a0323798b666bbb6bb67418cf67786. Row manifest hash: 8fd35140b5e38b8f898fa6c55ee01767478abf8ffd454117991f3168692bc37e. Source readback fingerprint: 3ecef7a22b6209c5a68fc591d58d6e63519dd97c0327259b74f39afe7b281d95. Scope: insert 108600 review-only market_listing_card_candidates rows and 2275 internal-only market_listing_rollups rows from local MEE-11S artifacts only, keeping raw_single and slab rollups separated and not app-visible. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
