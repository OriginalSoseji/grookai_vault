# Image Truth Apply Readiness V1

Generated: 2026-06-16T04:55:36.416Z

This is audit-only. It does not write to the database, create migrations, run cleanup, or quarantine rows.

## Readiness

- readiness_classification: pipeline_ready_source_assets_required
- safe_to_apply_now: false
- reason: No exact source image asset packet has been staged and dry-run proven for a target bucket.
- total_child_printings: 47561
- exact_child_image_required: 17745
- exact_required_missing_child_exact_image: 17654
- critical_or_high_risk_rows: 17654
- english_physical_display_covered_rows: 38105
- english_physical_missing_display_rows: 6
- english_physical_missing_variant_visual_rows: 14502
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
- full_missing_exact_rows_count: 17654
- apply_addressable_rows_total: 14502
- identity_blocked_rows_total: 1343
- non_physical_blocked_rows_total: 1809
- other_scope_rows_total: 0
- apply_addressable_rows_in_detailed_queue: 3
- identity_blocked_rows_in_detailed_queue: 997
- critical_missing_display_rows: 27
- finish_specific_fallback_rows: 973
- ownership_reference_rows: 3
- no_ownership_reference_rows: 997

## Confidence Counts

English physical:

| confidence | rows |
| --- | --- |
| exact | 23177 |
| missing_variant_visual | 14502 |
| representative | 426 |
| missing | 6 |

English physical exact-required:

| confidence | rows |
| --- | --- |
| missing_variant_visual | 14502 |
| exact | 54 |
| representative | 37 |

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
| unknown | unresolved_set | blocked | Alcremie | 87 | reverse | missing_display_image | critical | 8d631c41-0b92-4fc3-b6e1-716beaeb55b1 |
| unknown | unresolved_set | blocked | Audino | 89 | reverse | missing_display_image | critical | 2eb8bef7-66d9-40b5-8ed3-eda16382b1f0 |
| unknown | unresolved_set | blocked | Blacephalon | 76 | reverse | missing_display_image | critical | d1832447-c4df-4cfb-bef2-7032bd324680 |
| unknown | unresolved_set | blocked | Blissey ex | 98 | reverse | missing_display_image | critical | b8d6a5c5-142a-4c9c-86d6-26d6ac5bc4d5 |
| unknown | unresolved_set | blocked | Chinchou | 95 | reverse | missing_display_image | critical | db6499a8-bc58-4b2a-8483-41adf11952e8 |
| unknown | unresolved_set | blocked | Cleffa | 93 | reverse | missing_display_image | critical | d394daae-6bdb-458e-a4e9-d54e6046dcd5 |
| unknown | unresolved_set | blocked | Dawn Wings Necrozma | 78 | reverse | missing_display_image | critical | 461ee50d-1ea3-4988-961c-a4427224340f |
| unknown | unresolved_set | blocked | Dragonair | 88 | reverse | missing_display_image | critical | 5515e8ea-4abc-4d2a-ba36-7f94f436faa0 |
| unknown | unresolved_set | blocked | Dusk Mane Necrozma | 79 | reverse | missing_display_image | critical | dc65a601-65ea-4076-b701-d0c3fa39d11f |
| unknown | unresolved_set | blocked | Eevee | 92 | reverse | missing_display_image | critical | f492d466-9701-4468-b970-33c15bc8db2f |
| unknown | unresolved_set | blocked | Greedent | 91 | reverse | missing_display_image | critical | eeed405f-1ce1-415e-8f9d-2a71311f06e2 |
| unknown | unresolved_set | blocked | Horsea | 94 | reverse | missing_display_image | critical | a1005f01-8f4e-42fa-b388-fe80c17e8879 |
| unknown | unresolved_set | blocked | Houndoom | 96 | reverse | missing_display_image | critical | bcc59df9-141b-4671-ad33-45a5a3d316cc |
| unknown | unresolved_set | blocked | Jolteon | 86 | reverse | missing_display_image | critical | 23a29ee6-50cc-478e-b48c-f9b332ce113f |
| unknown | unresolved_set | blocked | Kangaskhan | 97 | reverse | missing_display_image | critical | 7bdbbcb8-7493-446c-8e60-a54f21afee6f |
| unknown | unresolved_set | blocked | Kartana | 75 | reverse | missing_display_image | critical | a77c6d24-ba8b-4fa2-a497-9ed194bd691a |
| unknown | unresolved_set | blocked | Marill | 99 | reverse | missing_display_image | critical | abf70dd3-14d1-4f2b-9287-026cffa1333a |
| unknown | unresolved_set | blocked | Poipole | 82 | reverse | missing_display_image | critical | c11a83a2-cf79-4fd5-9bd0-4bdd619fbc2d |
| unknown | unresolved_set | blocked | Stakataka | 80 | reverse | missing_display_image | critical | d6494e6c-57bf-45fc-9f51-fe2879b7679b |
| unknown | unresolved_set | blocked | Stufful | 83 | reverse | missing_display_image | critical | c96a6486-5d77-4829-90ed-18f186858e8a |
| unknown | unresolved_set | blocked | Tapu Koko ex | 84 | reverse | missing_display_image | critical | faeb4713-1f5d-4c23-8374-2131a86cea55 |
| unknown | unresolved_set | blocked | Togedemaru | 90 | reverse | missing_display_image | critical | 3ab2ae8a-c358-4a2d-a5f0-9c77d470aac2 |
| unknown | unresolved_set | blocked | Ultra Necrozma ex | 81 | reverse | missing_display_image | critical | 914f0671-c1c0-4daa-9ee6-f08e98d99fc4 |
| unknown | unresolved_set | blocked | Vanillite | 85 | reverse | missing_display_image | critical | 8deb04c4-8696-4289-83c4-89b81631abd5 |
| unknown | unresolved_set | blocked | Weavile | 100 | reverse | missing_display_image | critical | 152895d6-be43-45d0-83b5-558a986c250f |

## First Child Image Promotion Bucket

These rows have exact-child-required finishes, resolved set/number identity, and currently rely on a parent image. They are candidates only after exact child source assets are staged and dry-run proven.

| set | scope | confidence | card | number | finish | coverage | risk | printing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base1 | english_physical | missing_variant_visual | Impostor Professor Oak | 73 | normal | using_parent_exact_image | high | GV-PK-BS-73-STD |
| base1 | english_physical | missing_variant_visual | Professor Oak | 88 | normal | using_parent_exact_image | high | GV-PK-BS-88-STD |
| base3 | english_physical | missing_variant_visual | Zapdos | 15 | cosmos | using_parent_exact_image | high | GV-PK-FO-15-COSMOS |
| base4 | english_physical | missing_variant_visual | Imposter Professor Oak | 102 | normal | using_parent_exact_image | high | GV-PK-B2-102-STD |
| base4 | english_physical | missing_variant_visual | Professor Oak | 116 | normal | using_parent_exact_image | high | GV-PK-B2-116-STD |
| base6 | english_physical | missing_variant_visual | Abra | 67 | reverse | using_parent_exact_image | high | GV-PK-LC-67-RH |
| base6 | english_physical | missing_variant_visual | Alakazam | 1 | reverse | using_parent_exact_image | high | GV-PK-LC-1-RH |
| base6 | english_physical | missing_variant_visual | Arcanine | 36 | reverse | using_parent_exact_image | high | GV-PK-LC-36-RH |
| base6 | english_physical | missing_variant_visual | Articuno | 2 | reverse | using_parent_exact_image | high | GV-PK-LC-2-RH |
| base6 | english_physical | missing_variant_visual | Beedrill | 20 | reverse | using_parent_exact_image | high | GV-PK-LC-20-RH |
| base6 | english_physical | missing_variant_visual | Bill | 108 | reverse | using_parent_exact_image | high | GV-PK-LC-108-RH |
| base6 | english_physical | missing_variant_visual | Bulbasaur | 68 | reverse | using_parent_exact_image | high | GV-PK-LC-68-RH |
| base6 | english_physical | missing_variant_visual | Butterfree | 21 | reverse | using_parent_exact_image | high | GV-PK-LC-21-RH |
| base6 | english_physical | missing_variant_visual | Caterpie | 69 | reverse | using_parent_exact_image | high | GV-PK-LC-69-RH |
| base6 | english_physical | missing_variant_visual | Challenge! | 106 | reverse | using_parent_exact_image | high | GV-PK-LC-106-RH |
| base6 | english_physical | missing_variant_visual | Charizard | 3 | reverse | using_parent_exact_image | high | GV-PK-LC-3-RH |
| base6 | english_physical | missing_variant_visual | Charmander | 70 | reverse | using_parent_exact_image | high | GV-PK-LC-70-RH |
| base6 | english_physical | missing_variant_visual | Charmeleon | 37 | reverse | using_parent_exact_image | high | GV-PK-LC-37-RH |
| base6 | english_physical | missing_variant_visual | Dark Blastoise | 4 | reverse | using_parent_exact_image | high | GV-PK-LC-4-RH |
| base6 | english_physical | missing_variant_visual | Dark Dragonair | 38 | reverse | using_parent_exact_image | high | GV-PK-LC-38-RH |
| base6 | english_physical | missing_variant_visual | Dark Dragonite | 5 | reverse | using_parent_exact_image | high | GV-PK-LC-5-RH |
| base6 | english_physical | missing_variant_visual | Dark Persian | 6 | reverse | using_parent_exact_image | high | GV-PK-LC-6-RH |
| base6 | english_physical | missing_variant_visual | Dark Raichu | 7 | reverse | using_parent_exact_image | high | GV-PK-LC-7-RH |
| base6 | english_physical | missing_variant_visual | Dark Slowbro | 8 | reverse | using_parent_exact_image | high | GV-PK-LC-8-RH |
| base6 | english_physical | missing_variant_visual | Dark Vaporeon | 9 | reverse | using_parent_exact_image | high | GV-PK-LC-9-RH |

## Explicit Non-Actions

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
