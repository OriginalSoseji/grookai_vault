# MEE-12B Strict Filtered Rollup Apply Readiness

- Applied by this invocation: `true`
- Ready for apply approval: `false`
- Package fingerprint: `eae43b665456db9067a6fd83270fdbb4324708b8e0826ade40fa8ffbebac108d`
- Row manifest hash: `6563ca2148a44bcf4da1bf6a695f22d7e0a0481a49d1c379fdb4651a5dc0dbde`

## Proposed Rows

```json
{
  "market_listing_rollups": 1662
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
Approve real MARKET-LISTING-STRICT-FILTERED-ROLLUP-APPLY-V1 apply only. Package fingerprint: eae43b665456db9067a6fd83270fdbb4324708b8e0826ade40fa8ffbebac108d. Row manifest hash: 6563ca2148a44bcf4da1bf6a695f22d7e0a0481a49d1c379fdb4651a5dc0dbde. Source plan fingerprint: 142b5bb31fb0009395f2def38fd99b61e7ff09b3c6009ace5907d98b0f6aa60f. Source strict title audit fingerprint: 7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec. Scope: insert 1662 strict-filtered internal-only market_listing_rollups rows using rollup versions MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28 and MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_EBAY_GVID_HARDENED_2026_06_28 only. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No market_listing_card_candidates writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
