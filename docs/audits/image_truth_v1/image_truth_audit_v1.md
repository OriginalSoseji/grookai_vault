# Image Truth Audit V1

Generated: 2026-06-23T03:59:10.176Z

Status: audit only. No DB writes. No migrations.

## Summary

- total child printings: 44137
- child image storage columns present: true
- exact child image required: 16973
- finish visual review needed: 10851
- exact-required rows missing exact child image: 16874
- finish-review rows missing exact child image: 10628
- critical/high image risk rows: 16874
- image apply-addressable missing exact rows: 14860
- image identity-blocked missing exact rows: 205
- image non-physical blocked missing exact rows: 1809
- image other-scope missing exact rows: 0
- english physical display-covered rows: 38092
- english physical missing-display rows: 4
- english physical missing-variant-visual rows: 14856
- db_writes_performed: false
- migrations_created: false

## Image Confidence Counts

All scopes:

| confidence | rows |
| --- | --- |
| exact | 22484 |
| missing_variant_visual | 14856 |
| blocked | 6041 |
| representative | 752 |
| missing | 4 |

English physical only:

| confidence | rows |
| --- | --- |
| exact | 22484 |
| missing_variant_visual | 14856 |
| representative | 752 |
| blocked | 5 |
| missing | 4 |

## Image Coverage Counts

| coverage | rows |
| --- | --- |
| using_parent_exact_image | 42476 |
| using_parent_representative_image | 894 |
| exact_child_image_present | 682 |
| missing_display_image | 85 |

## Risk Counts

| risk | rows |
| --- | --- |
| low | 27209 |
| high | 16843 |
| medium | 54 |
| critical | 31 |

## Risk By Finish

| finish | risk rows |
| --- | --- |
| reverse | 15506 |
| holo | 337 |
| normal | 331 |
| cosmos | 325 |
| pokeball | 230 |
| cracked_ice | 122 |
| masterball | 67 |
| rocket_reverse | 10 |

## Top Risk Sets

| set | risk rows |
| --- | --- |
| B1 | 331 |
| me02.5 | 325 |
| A1 | 286 |
| sv8pt5 | 281 |
| unknown | 259 |
| A4 | 241 |
| A3 | 239 |
| swsh8 | 229 |
| A2 | 207 |
| sm11 | 203 |
| sm12 | 198 |
| swsh1 | 194 |
| sv02 | 193 |
| sv03 | 193 |
| sv01 | 192 |
| sv08.5 | 192 |
| sm8 | 190 |
| sv10 | 189 |
| sm10 | 180 |
| swsh3 | 170 |
| swsh2 | 169 |
| sv04 | 168 |
| ecard1 | 167 |
| sv08 | 166 |
| sv03.5 | 162 |

## Top Risk Rows

| risk | set | number | card | finish | coverage | reasons |
| --- | --- | --- | --- | --- | --- | --- |
| critical | unknown | 100 | Weavile | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 74 | Zeraora | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 75 | Kartana | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 76 | Blacephalon | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 77 | Xurkitree | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 78 | Dawn Wings Necrozma | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 79 | Dusk Mane Necrozma | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 80 | Stakataka | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 81 | Ultra Necrozma ex | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 82 | Poipole | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 83 | Stufful | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 84 | Tapu Koko ex | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 85 | Vanillite | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 86 | Jolteon | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 87 | Alcremie | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 88 | Dragonair | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 89 | Audino | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 90 | Togedemaru | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 91 | Greedent | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 92 | Eevee | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 93 | Cleffa | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 94 | Horsea | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 95 | Chinchou | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 96 | Houndoom | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 97 | Kangaskhan | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 98 | Blissey ex | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | unknown | 99 | Marill | reverse | missing_display_image | visually_distinct_finish, non_normal_finish, no_display_image_available |
| critical | mep | 064 | Serperior | holo | missing_display_image | holo_finish_review_debt, visual_identity_modifier_or_stamp, no_display_image_available |
| critical | mep | 065 | Barbaracle | holo | missing_display_image | holo_finish_review_debt, visual_identity_modifier_or_stamp, no_display_image_available |
| critical | mep | 066 | Tyrantrum | holo | missing_display_image | holo_finish_review_debt, visual_identity_modifier_or_stamp, no_display_image_available |

## Interpretation

This audit does not prove that a displayed image is visually wrong. It identifies where Grookai cannot honestly prove exact child-printing imagery and is likely falling back to parent/base imagery for visually distinct printings.

Holo-only rows are counted as finish visual review debt, but are not promoted into the primary exact-image queue unless another visible variant/stamp/modifier rule also applies.

The next safe DB phase should be a governed image truth sidecar or child image storage activation, not blind parent image updates.
