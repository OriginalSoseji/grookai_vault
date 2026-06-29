# MEE-12B Strict Filtered Rollup Apply Readiness

- Applied by this invocation: `true`
- Ready for apply approval: `false`
- Package fingerprint: `7e910d31a2ae1995dbcd77a68b9600814fc86b004248e63ceeab6655532c3705`
- Row manifest hash: `1e48af530e6e73ee70227f884eab05d05b92459bb9677b72efb49e8d57dc7885`

## Proposed Rows

```json
{
  "market_listing_rollups": 2261
}
```

## Collision Check

```json
{
  "checked": true,
  "rollup_id_collision_count": 0,
  "rollup_key_collision_count": 0,
  "rollup_id_collision_samples": [],
  "rollup_key_collision_samples": []
}
```

## Findings

- none

## Approval Prompt

```text
Approve real MARKET-LISTING-STRICT-FILTERED-ROLLUP-APPLY-V1 apply only. Package fingerprint: 7e910d31a2ae1995dbcd77a68b9600814fc86b004248e63ceeab6655532c3705. Row manifest hash: 1e48af530e6e73ee70227f884eab05d05b92459bb9677b72efb49e8d57dc7885. Source plan fingerprint: 1329a9a5f33d6990d13044d22f75108f1c18c1b3a28f1c7f42ab5786527f0fd1. Source strict title audit fingerprint: 7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec. Scope: insert 2261 strict-filtered internal-only market_listing_rollups rows using rollup versions MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_DROPLET_2026_06_27_FINAL and MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_DROPLET_2026_06_27_FINAL only. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No market_listing_card_candidates writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
