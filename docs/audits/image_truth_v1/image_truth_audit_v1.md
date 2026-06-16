# Image Truth Audit V1

Generated: 2026-06-16T05:27:11.413Z

Status: audit only. No DB writes. No migrations.

## Summary

- total child printings: 47561
- child image storage columns present: true
- exact child image required: 17745
- finish visual review needed: 11992
- exact-required rows missing exact child image: 17653
- finish-review rows missing exact child image: 11802
- critical/high image risk rows: 17653
- image apply-addressable missing exact rows: 14501
- image identity-blocked missing exact rows: 1343
- image non-physical blocked missing exact rows: 1809
- image other-scope missing exact rows: 0
- english physical display-covered rows: 38111
- english physical missing-display rows: 0
- english physical missing-variant-visual rows: 14501
- db_writes_performed: false
- migrations_created: false

## Image Confidence Counts

All scopes:

| confidence | rows |
| --- | --- |
| exact | 23178 |
| missing_variant_visual | 14501 |
| blocked | 9450 |
| representative | 432 |

English physical only:

| confidence | rows |
| --- | --- |
| exact | 23178 |
| missing_variant_visual | 14501 |
| representative | 432 |

## Image Coverage Counts

| coverage | rows |
| --- | --- |
| using_parent_exact_image | 46745 |
| exact_child_image_present | 382 |
| using_parent_representative_image | 353 |
| missing_display_image | 81 |

## Risk Counts

| risk | rows |
| --- | --- |
| low | 29854 |
| high | 17626 |
| medium | 54 |
| critical | 27 |

## Risk By Finish

| finish | risk rows |
| --- | --- |
| reverse | 16649 |
| cosmos | 321 |
| pokeball | 230 |
| holo | 186 |
| cracked_ice | 122 |
| normal | 122 |
| masterball | 67 |
| rocket_reverse | 10 |

## Top Risk Sets

| set | risk rows |
| --- | --- |
| unknown | 1397 |
| B1 | 331 |
| me02.5 | 325 |
| A1 | 286 |
| sv8pt5 | 281 |
| A4 | 241 |
| A3 | 239 |
| swsh8 | 221 |
| A2 | 207 |
| me01 | 204 |
| sm11 | 203 |
| sm12 | 197 |
| sv03 | 193 |
| sv08.5 | 192 |
| sv01 | 191 |
| sv02 | 188 |
| sm8 | 186 |
| swsh1 | 181 |
| sm10 | 180 |
| sv10 | 176 |
| sv04 | 168 |
| ecard1 | 167 |
| sv08 | 166 |
| swsh3 | 160 |
| ecard2 | 158 |

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
| high | sv03.5 | 025 | Pikachu | reverse | using_parent_exact_image | visually_distinct_finish, non_normal_finish, child_printing_falls_back_to_parent_exact_image, owned_child_printing_reference |
| high | sv8pt5 | 002 | Exeggutor | masterball | using_parent_exact_image | visually_distinct_finish, non_normal_finish, child_printing_falls_back_to_parent_exact_image, owned_child_printing_reference |
| high | sv8pt5 | 002 | Exeggutor | pokeball | using_parent_exact_image | visually_distinct_finish, non_normal_finish, child_printing_falls_back_to_parent_exact_image, owned_child_printing_reference |

## Interpretation

This audit does not prove that a displayed image is visually wrong. It identifies where Grookai cannot honestly prove exact child-printing imagery and is likely falling back to parent/base imagery for visually distinct printings.

Holo-only rows are counted as finish visual review debt, but are not promoted into the primary exact-image queue unless another visible variant/stamp/modifier rule also applies.

The next safe DB phase should be a governed image truth sidecar or child image storage activation, not blind parent image updates.
