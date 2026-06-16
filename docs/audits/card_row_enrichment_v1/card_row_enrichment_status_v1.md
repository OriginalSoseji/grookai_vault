# Card Row Enrichment Status V1

Generated: 2026-06-16T03:37:57.685Z

Read-only audit. No database writes, migrations, cleanup, quarantine, or image promotion were performed.

## Summary

- parent card_print rows: 26228
- child card_printings rows: 47561
- English physical parent rows: 23078
- English physical child printing rows: 38111
- parent rows with one or more enrichment gaps: 8619
- child printing rows with one or more enrichment gaps: 23142
- English physical parent rows with one or more enrichment gaps: 5469
- English physical child printing rows with one or more enrichment gaps: 13692
- fingerprint: d0acda14bf8826a1bf800ce6d3ef46e51d754f414017bc9f94a23b8651ffb81f

## Row Segments

| segment | parent rows | child printing rows |
| --- | --- | --- |
| english_physical | 23078 | 38111 |
| tcg_pocket_excluded | 3150 | 9450 |

## Parent Row Coverage

| field/group | present | missing | coverage |
| --- | --- | --- | --- |
| name | 26228 | 0 | 100% |
| set_id | 26228 | 0 | 100% |
| set_code | 24887 | 1341 | 94.89% |
| number | 25090 | 1138 | 95.66% |
| number_plain | 25090 | 1138 | 95.66% |
| gv_id | 22953 | 3275 | 87.51% |
| active_identity | 23078 | 3150 | 87.99% |
| child_printings | 25141 | 1087 | 95.86% |
| active_external_mapping | 24385 | 1843 | 92.97% |
| rarity | 26074 | 154 | 99.41% |
| artist | 21094 | 5134 | 80.43% |
| regulation_mark | 5627 | 20601 | 21.45% |
| parent_or_representative_image | 25911 | 317 | 98.79% |
| any_child_image | 139 | 26089 | 0.53% |
| active_price | 26228 | 0 | 100% |
| traits | 24000 | 2228 | 91.51% |
| species_link | 22234 | 3994 | 84.77% |
| cameos | 846 | 25382 | 3.23% |

## Child Printing Coverage

| field/group | present | missing | coverage |
| --- | --- | --- | --- |
| finish_key | 47561 | 0 | 100% |
| active_finish_key | 47561 | 0 | 100% |
| printing_gv_id | 37982 | 9579 | 79.86% |
| provenance | 30719 | 16842 | 64.59% |
| child_display_image | 152 | 47409 | 0.32% |
| child_or_parent_display_image | 47251 | 310 | 99.35% |
| image_source_when_child_image_present | 152 | 0 | 100% |
| image_status_when_child_image_present | 152 | 0 | 100% |
| non_provisional | 47561 | 0 | 100% |

## Parent Gap Counts

| gap | rows |
| --- | --- |
| species_link | 3994 |
| gv_id | 3275 |
| active_identity | 3150 |
| traits | 2228 |
| external_mapping | 1843 |
| core_identity | 1341 |
| child_printings | 1087 |
| display_image | 218 |
| catalog_metadata | 139 |

## Child Gap Counts

| gap | rows |
| --- | --- |
| provenance | 16842 |
| printing_gv_id | 9579 |
| display_image | 310 |

## English Physical Parent Gap Counts

| gap | rows |
| --- | --- |
| species_link | 3752 |
| traits | 1090 |
| child_printings | 1087 |
| external_mapping | 706 |
| display_image | 191 |
| catalog_metadata | 139 |
| gv_id | 125 |

## English Physical Child Gap Counts

| gap | rows |
| --- | --- |
| provenance | 13428 |
| display_image | 229 |
| printing_gv_id | 129 |

## Top Parent Gap Sets

| set_code | rows |
| --- | --- |
| unknown | 1341 |
| B1 | 331 |
| A1 | 286 |
| A4 | 241 |
| A3 | 239 |
| A2 | 207 |
| sv8pt5 | 194 |
| me01 | 151 |
| me03 | 126 |
| svp | 124 |
| smp | 123 |
| sv6pt5 | 112 |
| A2b | 111 |
| sm115 | 111 |
| A3b | 107 |
| A4a | 105 |
| swsh10 | 105 |
| swsh6 | 99 |
| swsh11 | 97 |
| A2a | 96 |
| pgo | 90 |
| swsh9 | 88 |
| A1a | 86 |
| swsh7 | 80 |
| swsh12 | 75 |
| swsh8 | 75 |
| sv10 | 74 |
| sv05 | 71 |
| sv06 | 69 |
| sv01 | 68 |

## Top Child Gap Sets

| set_code | rows |
| --- | --- |
| unknown | 4023 |
| B1 | 993 |
| A1 | 858 |
| A4 | 723 |
| A3 | 717 |
| A2 | 621 |
| me02.5 | 603 |
| sm12 | 429 |
| sm8 | 386 |
| sm10 | 362 |
| A2b | 333 |
| sv4pt5 | 326 |
| A3b | 321 |
| A4a | 315 |
| swsh7 | 312 |
| sm7 | 295 |
| xy8 | 290 |
| A2a | 288 |
| bw11 | 282 |
| sv8pt5 | 280 |
| sm5 | 279 |
| bw8 | 273 |
| swsh12.5 | 272 |
| me01 | 270 |
| sm3 | 259 |
| A1a | 258 |
| pl1 | 258 |
| sm2 | 255 |
| bw9 | 243 |
| xy4 | 237 |

## Top English Physical Parent Gap Sets

| set_code | rows |
| --- | --- |
| sv8pt5 | 194 |
| me01 | 151 |
| me03 | 126 |
| svp | 124 |
| smp | 123 |
| sv6pt5 | 112 |
| sm115 | 111 |
| swsh10 | 105 |
| swsh6 | 99 |
| swsh11 | 97 |
| pgo | 90 |
| swsh9 | 88 |
| swsh7 | 80 |
| swsh12 | 75 |
| swsh8 | 75 |
| sv10 | 74 |
| sv05 | 71 |
| sv06 | 69 |
| sv01 | 68 |
| sv02 | 68 |
| sv04 | 67 |
| sv08 | 64 |
| swshp | 64 |
| sv08.5 | 57 |
| swsh1 | 57 |
| swsh5 | 57 |
| me02.5 | 52 |
| swsh12.5 | 48 |
| sm7 | 46 |
| sm8 | 46 |

## Top English Physical Child Gap Sets

| set_code | rows |
| --- | --- |
| me02.5 | 603 |
| sm12 | 429 |
| sm8 | 386 |
| sm10 | 362 |
| sv4pt5 | 326 |
| swsh7 | 312 |
| sm7 | 295 |
| xy8 | 290 |
| bw11 | 282 |
| sv8pt5 | 280 |
| sm5 | 279 |
| bw8 | 273 |
| swsh12.5 | 272 |
| me01 | 270 |
| sm3 | 259 |
| pl1 | 258 |
| sm2 | 255 |
| bw9 | 243 |
| xy4 | 237 |
| sm6 | 233 |
| sv04 | 230 |
| sv08 | 229 |
| pl2 | 223 |
| sv10 | 219 |
| pl3 | 215 |
| xyp | 211 |
| dp7 | 206 |
| sm4 | 206 |
| bw10 | 203 |
| xy3 | 203 |

## Notes

- `active_price`, `traits`, `species_link`, and `cameos` are enrichment surfaces, not necessarily canon blockers.
- `display_image` gaps mean no parent/representative image and no child image were found for the row in the audited fields.
- `child_or_parent_display_image` is the app-facing practical coverage measure for whether a child printing can display something honest.
- Row-level gap indexes were written to JSON for follow-up planning.

## Outputs

- Summary JSON: `docs\audits\card_row_enrichment_v1\card_row_enrichment_status_v1.json`
- Parent gap index: `docs\audits\card_row_enrichment_v1\card_parent_enrichment_gap_index_v1.json`
- Child printing gap index: `docs\audits\card_row_enrichment_v1\card_child_printing_enrichment_gap_index_v1.json`
