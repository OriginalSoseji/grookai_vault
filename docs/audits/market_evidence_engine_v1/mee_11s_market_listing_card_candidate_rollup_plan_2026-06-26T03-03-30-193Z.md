# MEE-11S Market Listing Card Candidate Rollup Plan

- Ready for apply approval: `true`
- Package fingerprint: `11acb65e0800b50ba8e9dc969b8a60f28b10beb5daa12509d7bad06eb9eea61c`
- Row manifest hash: `1fda22fc638dee4d039628c47e5e49416ebbbea99af16131c6d6548365debf80`

## Proposed Rows

```json
{
  "market_listing_card_candidates": 111693,
  "market_listing_rollups": 1725
}
```

## Summary

```json
{
  "scanned_price_events": 130686,
  "skipped_non_candidate_events": 18993,
  "evidence_class_counts": {
    "excluded_or_ambiguous": 18754,
    "raw_single": 77560,
    "slab": 34133,
    "unknown": 239
  },
  "rollup_class_counts": {
    "raw_single": 925,
    "slab": 800
  }
}
```

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-CARD-CANDIDATE-ROLLUP-APPLY-V1 apply only. Package fingerprint: 11acb65e0800b50ba8e9dc969b8a60f28b10beb5daa12509d7bad06eb9eea61c. Row manifest hash: 1fda22fc638dee4d039628c47e5e49416ebbbea99af16131c6d6548365debf80. Source readback fingerprint: 3ecef7a22b6209c5a68fc591d58d6e63519dd97c0327259b74f39afe7b281d95. Scope: insert 111693 review-only market_listing_card_candidates rows and 1725 internal-only market_listing_rollups rows from local MEE-11S artifacts only, keeping raw_single and slab rollups separated and not app-visible. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
