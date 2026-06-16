# Image Truth Source Exhaustion Decision V1

Generated: 2026-06-16T05:27:11.359Z

This is read-only. It does not upload images, update database rows, create migrations, clean up, quarantine, or change image confidence.

## Summary

- exact_variant_backlog_rows: 14501
- exact_promote_ready_rows_now: 0
- exact_asset_probe_candidate_rows: 6
- pricecharting_residual_probe_completed: true
- pricecharting_residual_exact_ready_rows: 0
- pricecharting_residual_blocked_rows: 6
- ebay_browse_evidence_probe_completed: true
- ebay_title_evidence_candidate_rows: 3
- ebay_no_title_evidence_rows: 3
- exact_photo_acquisition_plan_completed: false
- exact_photo_source_evidence_rows: null
- exact_photo_high_value_no_source_rows: null
- exact_photo_source_evidence_pilot_completed: true
- exact_photo_source_evidence_pilot_rows: 25
- exact_photo_source_evidence_pilot_ready_rows: 0
- representative_or_blocked_rows: 14495
- no_source_evidence_rows: 1654
- db_writes_performed: false
- migrations_created: false

## Decision

No remaining image lane is currently safe for direct exact-image promotion without a new proof package.

The safe product behavior is:

> Correct printing; representative image may not show exact finish, stamp, or parallel.

This keeps display coverage complete without pretending representative images are exact variant images.

## eBay Browse Evidence Probe

IMG-15A checked 6 residual rows. It found 3 title-only evidence candidates and 3 rows without exact listing-title evidence. Listing images remain excluded.

## Source Family Decisions

| source | rows | decision | lanes | finishes | next action |
| --- | --- | --- | --- | --- | --- |
| ReverseHolo | 12399 | representative_only_unless_rendered_overlay_captured | representative_only_unless_rendered_overlay_captured=12391, source_evidence_available_no_exact_asset_extractor=8 | reverse=12317, holo=64, cosmos=18 | Consider a separate rendered-overlay pipeline if Grookai wants synthetic representative reverse imagery, clearly labeled. |
| No Source Evidence | 1654 | blocked_until_new_source_found | no_source_evidence_available=1654 | reverse=1121, pokeball=230, holo=93, normal=81, masterball=67, cosmos=49, rocket_reverse=10, cracked_ice=3 | Acquire a new source family or leave these rows honestly representative. |
| TCGCollector | 339 | variant_evidence_not_exact_asset | source_evidence_available_no_exact_asset_extractor=335, representative_only_unless_rendered_overlay_captured=4 | cosmos=225, cracked_ice=105, reverse=7, normal=2 | Use as evidence source, not image asset source, until a variant-specific image extractor is proven. |
| TCGCSV / TCGplayer Catalog | 227 | manual_visual_review_only | representative_only_unless_rendered_overlay_captured=164, representative_only_unless_visual_manually_verified=62, source_evidence_available_no_exact_asset_extractor=1 | reverse=219, normal=8 | Keep the 56 rows in visual review; do not bulk promote exact from shared catalog imagery. |
| BinderBuilder | 30 | variant_evidence_not_exact_asset | source_evidence_available_no_exact_asset_extractor=30 | cracked_ice=14, cosmos=12, reverse=2, normal=2 | Treat as evidence only; add a future extractor only if variant-specific images are proven. |
| Bulbapedia | 20 | human_evidence_not_exact_asset | source_evidence_available_no_exact_asset_extractor=20 | cosmos=19, reverse=1 | Use for source agreement, not image upload, unless an externally reusable exact image asset is identified. |
| PriceCharting | 6 | residual_probe_exhausted | exact_asset_probe_candidate=6 | reverse=3, cosmos=1, holo=1, normal=1 | No PriceCharting residual row is exact-image ready after IMG-14A; move to eBay Browse evidence-only investigation or a new exact-photo source lane. |
| CardTrader | 3 | exact_when_frozen_metadata_proves_visual | source_evidence_available_no_exact_asset_extractor=3 | cosmos=3 | Search for additional CardTrader rows only through the frozen-plan workflow. |
| PokeScope | 2 | variant_evidence_not_exact_asset | source_evidence_available_no_exact_asset_extractor=2 | cosmos=1, reverse=1 | Keep the 2 rows blocked as evidence-only unless future page structure exposes variant-specific assets. |
| TCDB | 1 | checklist_evidence_not_exact_asset | source_evidence_available_no_exact_asset_extractor=1 | cosmos=1 | Use as source agreement only unless image rights and exact variant asset proof are established. |

## Remaining Readiness Lanes

| lane | rows |
| --- | --- |
| representative_only_unless_rendered_overlay_captured | 12391 |
| no_source_evidence_available | 1654 |
| source_evidence_available_no_exact_asset_extractor | 388 |
| representative_only_unless_visual_manually_verified | 62 |
| exact_asset_probe_candidate | 6 |

## Next Source Acquisition Order

1. Use eBay Browse only as volatile title-evidence context; do not use listing images as canonical assets.
2. Design a dedicated exact-photo acquisition lane for high-value cosmos/cracked_ice/stamped rows.
3. Consider rendered overlay display for reverse-heavy rows, clearly labeled representative rather than exact.
4. Keep no-source rows honest until new sources are found.

## Guardrail

Do not mark a child image exact unless the source asset itself proves the exact finish, stamp, parallel, or variant visual. Variant existence evidence is not image exactness evidence.
