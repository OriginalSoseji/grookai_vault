# Image Truth Apply Readiness V1

Generated: 2026-06-23T04:25:41.395Z

This is audit-only. It does not write to the database, create migrations, run cleanup, or quarantine rows.

## Readiness

- readiness_classification: pipeline_ready_source_assets_required
- safe_to_apply_now: false
- reason: No exact source image asset packet has been staged and dry-run proven for a target bucket.
- total_child_printings: 44137
- exact_child_image_required: 16973
- exact_required_missing_child_exact_image: 16870
- critical_or_high_risk_rows: 16870
- english_physical_display_covered_rows: 38096
- english_physical_missing_display_rows: 0
- english_physical_missing_variant_visual_rows: 14856
- child_image_storage_columns_present: true

## Existing Pipeline Checks

| check | status | file | missing markers |
| --- | --- | --- | --- |
| web_card_detail_reads_child_images | ready | apps/web/src/lib/getPublicCardByGvId.ts | - |
| web_public_sets_reads_child_images | ready | apps/web/src/lib/publicSets.ts | - |
| child_image_column_selector_exists | ready | apps/web/src/lib/cards/childPrintingImageStorage.ts | - |
| warehouse_write_plan_targets_child_images | ready | apps/web/src/lib/warehouse/buildPromotionWritePlanV1.ts | - |
| warehouse_stage_worker_freezes_child_asset | ready | backend/warehouse/promotion_stage_worker_v1.mjs | - |
| warehouse_executor_updates_child_only | ready | backend/warehouse/promotion_executor_v1.mjs | - |

## Bucket Summary

- risk_queue_rows: 1000
- detailed_rows_are_top_limited: true
- exact_required_rows_in_queue: 1000
- full_missing_exact_rows_count: 16870
- apply_addressable_rows_total: 14856
- identity_blocked_rows_total: 205
- non_physical_blocked_rows_total: 1809
- other_scope_rows_total: 0
- apply_addressable_rows_in_detailed_queue: 795
- identity_blocked_rows_in_detailed_queue: 205
- critical_missing_display_rows: 27
- finish_specific_fallback_rows: 973
- ownership_reference_rows: 3
- no_ownership_reference_rows: 997

## Confidence Counts

English physical:

| confidence | rows |
| --- | --- |
| exact | 22486 |
| missing_variant_visual | 14856 |
| representative | 754 |
| blocked | 5 |

English physical exact-required:

| confidence | rows |
| --- | --- |
| missing_variant_visual | 14856 |
| exact | 57 |
| representative | 46 |

## Recommended Sequence

- IMG-01A: Source asset acquisition for missing display images. Start with 10-25 critical exact-child-required rows that currently have no display image. Writes: false.
- IMG-01R: Representative confidence labeling for covered rows. Rows with a safe parent/base display image but missing exact finish, stamp, or parallel visual become missing_variant_visual, not exact. Writes: false.
- IMG-01B: Child-image dry-run promotion packet. Use only rows with exact source assets and resolved card_printing targets. Writes: false.
- IMG-01C: One-row real apply after approval. Apply one child image row only after dry-run proof and visual route verification. Writes: requires explicit user approval.
- IMG-02: Bulk child image buckets. Scale by finish family after IMG-01 proves the loop. Writes: requires explicit bucket approval.

## Hard Guardrails

- Never update card_prints.image_url for finish-specific child image repair.
- Only english_physical scoped rows may enter the first image correction packages.
- Digital-only or physical-pipeline-excluded sets must stay blocked from physical image repair.
- Only card_printings image fields may change for ENRICH_CARD_PRINTING_IMAGE.
- Require exact card_printing_id target, source URL or preserved asset reference, and normalized front asset.
- Do not promote marketplace/title-only evidence unless exact set, number, name, and finish are proven.
- Do not overwrite an existing distinct child image without a separate conflict review.
- Dry-run and post-apply proof must show parent image fields unchanged.
- No migrations for image correction packages.

## First Source Acquisition Bucket

These rows have exact-child-required finishes, resolved set/number identity, and no display image. They should receive source asset acquisition first, not immediate DB writes.

| set | scope | confidence | card | number | finish | coverage | risk | printing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Identity-Blocked Image Review Bucket

These rows are image-risky but do not have enough resolved set/number context for image apply work. They require identity/set resolution or exclusion before any image package.

| set | scope | confidence | card | number | finish | coverage | risk | printing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| unknown | unresolved_set | blocked | Alcremie | 87 | reverse | missing_display_image | critical | GV-TCGP-P-A-87-RH |
| unknown | unresolved_set | blocked | Audino | 89 | reverse | missing_display_image | critical | GV-TCGP-P-A-89-RH |
| unknown | unresolved_set | blocked | Blacephalon | 76 | reverse | missing_display_image | critical | GV-TCGP-P-A-76-RH |
| unknown | unresolved_set | blocked | Blissey ex | 98 | reverse | missing_display_image | critical | GV-TCGP-P-A-98-RH |
| unknown | unresolved_set | blocked | Chinchou | 95 | reverse | missing_display_image | critical | GV-TCGP-P-A-95-RH |
| unknown | unresolved_set | blocked | Cleffa | 93 | reverse | missing_display_image | critical | GV-TCGP-P-A-93-RH |
| unknown | unresolved_set | blocked | Dawn Wings Necrozma | 78 | reverse | missing_display_image | critical | GV-TCGP-P-A-78-RH |
| unknown | unresolved_set | blocked | Dragonair | 88 | reverse | missing_display_image | critical | GV-TCGP-P-A-88-RH |
| unknown | unresolved_set | blocked | Dusk Mane Necrozma | 79 | reverse | missing_display_image | critical | GV-TCGP-P-A-79-RH |
| unknown | unresolved_set | blocked | Eevee | 92 | reverse | missing_display_image | critical | GV-TCGP-P-A-92-RH |
| unknown | unresolved_set | blocked | Greedent | 91 | reverse | missing_display_image | critical | GV-TCGP-P-A-91-RH |
| unknown | unresolved_set | blocked | Horsea | 94 | reverse | missing_display_image | critical | GV-TCGP-P-A-94-RH |
| unknown | unresolved_set | blocked | Houndoom | 96 | reverse | missing_display_image | critical | GV-TCGP-P-A-96-RH |
| unknown | unresolved_set | blocked | Jolteon | 86 | reverse | missing_display_image | critical | GV-TCGP-P-A-86-RH |
| unknown | unresolved_set | blocked | Kangaskhan | 97 | reverse | missing_display_image | critical | GV-TCGP-P-A-97-RH |
| unknown | unresolved_set | blocked | Kartana | 75 | reverse | missing_display_image | critical | GV-TCGP-P-A-75-RH |
| unknown | unresolved_set | blocked | Marill | 99 | reverse | missing_display_image | critical | GV-TCGP-P-A-99-RH |
| unknown | unresolved_set | blocked | Poipole | 82 | reverse | missing_display_image | critical | GV-TCGP-P-A-82-RH |
| unknown | unresolved_set | blocked | Stakataka | 80 | reverse | missing_display_image | critical | GV-TCGP-P-A-80-RH |
| unknown | unresolved_set | blocked | Stufful | 83 | reverse | missing_display_image | critical | GV-TCGP-P-A-83-RH |
| unknown | unresolved_set | blocked | Tapu Koko ex | 84 | reverse | missing_display_image | critical | GV-TCGP-P-A-84-RH |
| unknown | unresolved_set | blocked | Togedemaru | 90 | reverse | missing_display_image | critical | GV-TCGP-P-A-90-RH |
| unknown | unresolved_set | blocked | Ultra Necrozma ex | 81 | reverse | missing_display_image | critical | GV-TCGP-P-A-81-RH |
| unknown | unresolved_set | blocked | Vanillite | 85 | reverse | missing_display_image | critical | GV-TCGP-P-A-85-RH |
| unknown | unresolved_set | blocked | Weavile | 100 | reverse | missing_display_image | critical | GV-TCGP-P-A-100-RH |

## First Child Image Promotion Bucket

These rows have exact-child-required finishes, resolved set/number identity, and currently rely on a parent image. They are candidates only after exact child source assets are staged and dry-run proven.

| set | scope | confidence | card | number | finish | coverage | risk | printing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base1 | english_physical | missing_variant_visual | Impostor Professor Oak | 73 | normal | using_parent_exact_image | high | GV-PK-BS-73-STD |
| base1 | english_physical | missing_variant_visual | Pikachu | 58 | normal | using_parent_representative_image | high | GV-PK-BASE1-58-FIRST-EDITION-RED-CHEEKS-NORMAL |
| base1 | english_physical | missing_variant_visual | Pikachu | 58 | normal | using_parent_representative_image | high | GV-PK-BASE1-58-FIRST-EDITION-YELLOW-CHEEKS-NORMAL |
| base1 | english_physical | missing_variant_visual | Pikachu | 58 | normal | using_parent_representative_image | high | GV-PK-BASE1-58-E3-STAMP-YELLOW-CHEEKS-NORMAL |
| base1 | english_physical | missing_variant_visual | Pikachu | 58 | normal | using_parent_representative_image | high | GV-PK-BASE1-58-GHOST-STAMP-SHADOWLESS-NORMAL |
| base1 | english_physical | missing_variant_visual | Pikachu | 58 | normal | using_parent_representative_image | high | GV-PK-BASE1-58-E3-STAMP-STD |
| base1 | english_physical | missing_variant_visual | Pikachu | 58 | normal | using_parent_representative_image | high | GV-PK-BASE1-58-E3-STAMP-RED-CHEEKS-NORMAL |
| base1 | english_physical | missing_variant_visual | Professor Oak | 88 | normal | using_parent_exact_image | high | GV-PK-BS-88-STD |
| base2 | english_physical | missing_variant_visual | Clefable | 1 | holo | using_parent_representative_image | high | GV-PK-BASE2-1-PRERELEASE-STAMP-HOLO |
| base2 | english_physical | missing_variant_visual | Pikachu | 60 | normal | using_parent_representative_image | high | GV-PK-BASE2-60-WOTC-STAMP-STD |
| base3 | english_physical | missing_variant_visual | Kabuto | 50 | normal | using_parent_representative_image | high | GV-PK-BASE3-50-WOTC-STAMP-STD |
| base3 | english_physical | missing_variant_visual | Zapdos | 15 | cosmos | using_parent_exact_image | high | GV-PK-FO-15-COSMOS |
| base4 | english_physical | missing_variant_visual | Imposter Professor Oak | 102 | normal | using_parent_exact_image | high | GV-PK-B2-102-STD |
| base4 | english_physical | missing_variant_visual | Professor Oak | 116 | normal | using_parent_exact_image | high | GV-PK-B2-116-STD |
| base5 | english_physical | missing_variant_visual | Dark Arbok | 19 | normal | using_parent_representative_image | high | GV-PK-BASE5-19-WOTC-STAMP-STD |
| base5 | english_physical | missing_variant_visual | Dark Charmeleon | 32 | normal | using_parent_representative_image | high | GV-PK-BASE5-32-WOTC-STAMP-STD |
| base5 | english_physical | missing_variant_visual | Dark Gyarados | 8 | holo | using_parent_representative_image | high | GV-PK-BASE5-8-PRERELEASE-STAMP-HOLO |
| base6 | english_physical | missing_variant_visual | Abra | 67 | reverse | using_parent_exact_image | high | GV-PK-LC-67-RH |
| base6 | english_physical | missing_variant_visual | Alakazam | 1 | reverse | using_parent_exact_image | high | GV-PK-LC-1-RH |
| base6 | english_physical | missing_variant_visual | Arcanine | 36 | reverse | using_parent_exact_image | high | GV-PK-LC-36-RH |
| base6 | english_physical | missing_variant_visual | Articuno | 2 | reverse | using_parent_exact_image | high | GV-PK-LC-2-RH |
| base6 | english_physical | missing_variant_visual | Beedrill | 20 | reverse | using_parent_exact_image | high | GV-PK-LC-20-RH |
| base6 | english_physical | missing_variant_visual | Bill | 108 | reverse | using_parent_exact_image | high | GV-PK-LC-108-RH |
| base6 | english_physical | missing_variant_visual | Bulbasaur | 68 | reverse | using_parent_exact_image | high | GV-PK-LC-68-RH |
| base6 | english_physical | missing_variant_visual | Butterfree | 21 | reverse | using_parent_exact_image | high | GV-PK-LC-21-RH |

## Explicit Non-Actions

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
