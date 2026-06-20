# Remaining Special Gap Source Acquisition V1

This is a read-only source acquisition and governance report. It does not write to the database, create migrations, insert printings, delete rows, merge parents, or promote candidates.

## Safety

| check | value |
| --- | --- |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| real_apply_performed | false |

## Summary

| metric | value |
| --- | --- |
| remaining_childless_special_parents | 725 |
| open_ready_missing_candidate_count | 0 |
| closed_high_signal_candidate_count | 4 |
| open_candidate_model_correction_count | 0 |
| open_set_lane_governance_ready_count | 0 |
| blocked_childless_rows | 725 |

## Missing Candidate Source Outcomes

| candidate | status | set | number | finish | next step |
| --- | --- | --- | --- | --- | --- |
| ancient_mew_movie_2000 | closed_present_with_expected_child_printing |  |  | cosmos | No further missing-promo insert package needed for this candidate. |
| jungle_meowth_gold_border | closed_present_with_expected_child_printing | base2 | 56 | normal | No further missing-promo insert package needed for this candidate. |
| expedition_hoppip_japanese_back | closed_present_with_expected_child_printing | ecard1 | 112 | normal | No further missing-promo insert package needed for this candidate. |
| expedition_pichu_japanese_back | closed_present_with_expected_child_printing | ecard1 | 58 | normal | No further missing-promo insert package needed for this candidate. |

## Remaining Childless Special Parents By Family

| family | count |
| --- | --- |
| other_stamp | 535 |
| prerelease_stamp | 129 |
| staff_stamp | 13 |
| battle_road_stamp | 12 |
| championship_stamp | 11 |
| winner_stamp | 9 |
| league_stamp | 7 |
| other_variant_or_modifier | 4 |
| worlds_stamp | 4 |
| wotc_stamp | 1 |

## Remaining Childless Special Parents By Set

| set | count |
| --- | --- |
| smp | 97 |
| swsh10 | 38 |
| swsh9 | 36 |
| swsh11 | 33 |
| sv05 | 32 |
| me01 | 29 |
| swsh8 | 29 |
| bwp | 28 |
| swsh12 | 28 |
| sv10 | 26 |
| sv04 | 24 |
| sv06 | 24 |
| sv02 | 22 |
| swsh6 | 20 |
| sv07 | 19 |
| swsh7 | 19 |
| sv01 | 18 |
| sv08 | 18 |
| swsh5 | 16 |
| sv8pt5 | 14 |
| mep | 13 |
| sv6pt5 | 13 |
| sv09 | 12 |
| np | 11 |
| sv10.5b | 8 |
| sv03 | 7 |
| swsh1 | 6 |
| swsh12.5 | 6 |
| swsh3 | 5 |
| bog | 4 |

## Acquisition Buckets

| bucket | count |
| --- | --- |
| needs_variant_family_identification | 410 |
| likely_finish_source_acquirable | 169 |
| has_identity_evidence_needs_exact_finish | 130 |
| needs_new_exact_finish_source | 16 |

## Source Acquisition Routes

| priority | route | description | acceptance |
| --- | --- | --- | --- |
| 1 | source_mapped_exact_finish_claims | Rows already carrying evidence URLs but no exact finish claim should be re-queried against the same source family for exact finish text. | source proves set + number + name + variant/stamp + active finish |
| 2 | marketplace_product_page_exact_title | Use marketplace product pages only when the product title/page explicitly identifies the exact stamp or special variant and finish. | not a listing-only guess; page/product identity is stable and exact |
| 3 | bulbapedia_card_release_information | Use card release pages for prerelease, staff, winner, WOTC, E3, and promo release context. | release information maps to exact Grookai parent identity and finish |
| 4 | collector_reference_special_print_archive | Use collector archives for rare special prints when they provide exact card identity and variant context. | paired with another independent source before becoming write-ready |

## Important Governance Notes

- Ancient Mew is source-supported, but it is not write-ready until Grookai has a governed English physical miscellaneous/movie-promo set lane.
- Meowth Gold Border has enough independent source support for a future guarded parent/child insert dry-run.
- Hoppip Japanese-back has enough independent source support for a future guarded parent/child insert dry-run.
- The current Pichu Japanese-back candidate should not be inserted as #22 holo. Source evidence points to #58 non-holo for the E3 Japanese-back lane.
- Live high-signal candidate closure is governed by the misc promo audit. Rows marked `present_with_expected_child_printing` are not re-opened by this source-acquisition report.
- The remaining childless special parent rows still need exact finish evidence. Identity evidence alone is not enough to create child printings.

## Output

Machine report: `docs/audits/verified_master_set_index_v1/english_master_index_v1/missing_promo_v1/remaining_special_gap_source_acquisition_v1.json`

