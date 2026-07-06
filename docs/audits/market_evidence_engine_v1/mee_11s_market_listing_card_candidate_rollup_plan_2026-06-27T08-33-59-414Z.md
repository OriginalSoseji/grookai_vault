# MEE-11S Market Listing Card Candidate Rollup Plan

- Ready for apply approval: `true`
- Package fingerprint: `8b9f6eed357c4c6b7d8f9ad3b17035d7dc5a91c1d131ce21a396a0f363ed02d2`
- Row manifest hash: `3ff5d5519b8ff649594daba49d1c98945a40de338bb1bf47a62cf79d3bb19460`

## Proposed Rows

```json
{
  "market_listing_card_candidates": 183635,
  "market_listing_rollups": 2292
}
```

## Summary

```json
{
  "scanned_price_events": 217845,
  "skipped_non_candidate_events": 34210,
  "evidence_class_counts": {
    "excluded_or_ambiguous": 34210,
    "raw_single": 128341,
    "slab": 55294
  },
  "rollup_class_counts": {
    "raw_single": 1214,
    "slab": 1078
  }
}
```

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-CARD-CANDIDATE-ROLLUP-APPLY-V1 apply only. Package fingerprint: 8b9f6eed357c4c6b7d8f9ad3b17035d7dc5a91c1d131ce21a396a0f363ed02d2. Row manifest hash: 3ff5d5519b8ff649594daba49d1c98945a40de338bb1bf47a62cf79d3bb19460. Source readback fingerprint: 3ecef7a22b6209c5a68fc591d58d6e63519dd97c0327259b74f39afe7b281d95. Scope: insert 183635 review-only market_listing_card_candidates rows and 2292 internal-only market_listing_rollups rows from local MEE-11S artifacts only, keeping raw_single and slab rollups separated and not app-visible. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
