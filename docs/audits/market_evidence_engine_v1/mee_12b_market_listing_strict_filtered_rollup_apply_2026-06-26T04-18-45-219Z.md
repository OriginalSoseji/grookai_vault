# MEE-12B Strict Filtered Rollup Apply Readiness

- Applied by this invocation: `false`
- Ready for apply approval: `true`
- Package fingerprint: `0cdd00660257058a92b461191562367ff1fefcfdfbbfb758840a04759c3f144a`
- Row manifest hash: `2a6183ff79a70935a61a599e6b76d6175c899deb5ba171ae6b69652c2dcc9c3b`

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
Approve real MARKET-LISTING-STRICT-FILTERED-ROLLUP-APPLY-V1 apply only. Package fingerprint: 0cdd00660257058a92b461191562367ff1fefcfdfbbfb758840a04759c3f144a. Row manifest hash: 2a6183ff79a70935a61a599e6b76d6175c899deb5ba171ae6b69652c2dcc9c3b. Source plan fingerprint: 969085b81bd0397cc82c08c336720ef285aef04a4b32f9cbae16d37c351ff42f. Source strict title audit fingerprint: 7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec. Scope: insert 2243 strict-filtered internal-only market_listing_rollups rows using rollup versions MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_NIGHTLY_2026_06_26 and MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_NIGHTLY_2026_06_26 only. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No market_listing_card_candidates writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
