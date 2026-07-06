# MEE-12B Strict Filtered Rollup Apply Readiness

- Applied by this invocation: `false`
- Ready for apply approval: `true`
- Package fingerprint: `4b08d48ec8bc7aa8ca3041a149e3b525793f22729f7e7193613cb65925c40a05`
- Row manifest hash: `d255e014aa67c17144c98a1fcb8a26aba7cc6510e7ca33c7a80d791a2c8f93cf`

## Proposed Rows

```json
{
  "market_listing_rollups": 2243
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

- apply_flag_missing

## Approval Prompt

```text
Approve real MARKET-LISTING-STRICT-FILTERED-ROLLUP-APPLY-V1 apply only. Package fingerprint: 4b08d48ec8bc7aa8ca3041a149e3b525793f22729f7e7193613cb65925c40a05. Row manifest hash: d255e014aa67c17144c98a1fcb8a26aba7cc6510e7ca33c7a80d791a2c8f93cf. Source plan fingerprint: 969085b81bd0397cc82c08c336720ef285aef04a4b32f9cbae16d37c351ff42f. Source strict title audit fingerprint: 7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec. Scope: insert 2243 strict-filtered internal-only market_listing_rollups rows using rollup versions MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1 and MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1 only. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No market_listing_card_candidates writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
