# Card Row Enrichment Status V1

Generated: 2026-06-16T23:07:07.005Z

Read-only audit. No database writes, migrations, cleanup, quarantine, or image promotion were performed.

## Summary

- parent card_print rows: 24803
- child card_printings rows: 43687
- English physical parent rows: 22791
- English physical child printing rows: 37651
- parent rows with one or more enrichment gaps: 7220
- child printing rows with one or more enrichment gaps: 16494
- English physical parent rows with one or more enrichment gaps: 5208
- English physical child printing rows with one or more enrichment gaps: 12999
- fingerprint: dadbc7ae108a993d82c0b90019394ae8ad1736dc6f02854dcb333f5968fabb9b

## Row Segments

| segment | parent rows | child printing rows |
| --- | --- | --- |
| english_physical | 22791 | 37651 |
| tcg_pocket_excluded | 2012 | 6036 |

## Parent Row Coverage

| field/group | present | missing | coverage |
| --- | --- | --- | --- |
| name | 24803 | 0 | 100% |
| set_id | 24803 | 0 | 100% |
| set_code | 24600 | 203 | 99.18% |
| number | 24803 | 0 | 100% |
| number_plain | 24803 | 0 | 100% |
| gv_id | 24803 | 0 | 100% |
| active_identity | 22791 | 2012 | 91.89% |
| child_printings | 23720 | 1083 | 95.63% |
| active_external_mapping | 24128 | 675 | 97.28% |
| rarity | 24649 | 154 | 99.38% |
| artist | 20847 | 3956 | 84.05% |
| regulation_mark | 5627 | 19176 | 22.69% |
| parent_or_representative_image | 24487 | 316 | 98.73% |
| any_child_image | 320 | 24483 | 1.29% |
| active_price | 24803 | 0 | 100% |
| traits | 22834 | 1969 | 92.06% |
| species_link | 20908 | 3895 | 84.3% |
| cameos | 846 | 23957 | 3.41% |

## Child Printing Coverage

| field/group | present | missing | coverage |
| --- | --- | --- | --- |
| finish_key | 43687 | 0 | 100% |
| active_finish_key | 43687 | 0 | 100% |
| printing_gv_id | 43687 | 0 | 100% |
| provenance | 27274 | 16413 | 62.43% |
| child_display_image | 384 | 43303 | 0.88% |
| child_or_parent_display_image | 43606 | 81 | 99.81% |
| image_source_when_child_image_present | 384 | 0 | 100% |
| image_status_when_child_image_present | 384 | 0 | 100% |
| non_provisional | 43687 | 0 | 100% |

## Parent Gap Counts

| gap | rows |
| --- | --- |
| species_link | 3895 |
| active_identity | 2012 |
| traits | 1969 |
| child_printings | 1083 |
| external_mapping | 675 |
| core_identity | 203 |
| catalog_metadata | 139 |
| display_image | 40 |

## Child Gap Counts

| gap | rows |
| --- | --- |
| provenance | 16413 |
| display_image | 81 |

## English Physical Parent Gap Counts

| gap | rows |
| --- | --- |
| species_link | 3740 |
| child_printings | 1083 |
| traits | 831 |
| external_mapping | 675 |
| catalog_metadata | 139 |
| display_image | 13 |

## English Physical Child Gap Counts

| gap | rows |
| --- | --- |
| provenance | 12999 |

## Top Parent Gap Sets

| set_code | rows |
| --- | --- |
| B1 | 331 |
| A1 | 286 |
| A4 | 241 |
| A3 | 239 |
| A2 | 207 |
| unknown | 203 |
| sv8pt5 | 194 |
| me03 | 126 |
| smp | 123 |
| sv6pt5 | 112 |
| A2b | 111 |
| sm115 | 111 |
| A3b | 107 |
| A4a | 105 |
| swsh10 | 105 |
| swsh6 | 99 |
| A2a | 96 |
| pgo | 90 |
| swsh9 | 88 |
| A1a | 86 |
| swsh11 | 85 |
| swsh7 | 80 |
| swsh12 | 75 |
| swsh8 | 75 |
| sv10 | 74 |
| sv05 | 71 |
| sv06 | 69 |
| me01 | 68 |
| sv01 | 68 |
| sv02 | 68 |

## Top Child Gap Sets

| set_code | rows |
| --- | --- |
| A4 | 723 |
| A3 | 642 |
| me02.5 | 603 |
| A2 | 558 |
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
| sv8pt5 | 280 |
| sm5 | 279 |
| bw8 | 273 |
| swsh12.5 | 272 |
| sm3 | 259 |
| sm2 | 255 |
| pl1 | 252 |
| bw9 | 243 |
| bw11 | 242 |
| xy4 | 237 |
| sm6 | 233 |
| A1a | 231 |
| sv04 | 230 |
| sv08 | 229 |
| sv10 | 219 |

## Top English Physical Parent Gap Sets

| set_code | rows |
| --- | --- |
| sv8pt5 | 194 |
| me03 | 126 |
| smp | 123 |
| sv6pt5 | 112 |
| sm115 | 111 |
| swsh10 | 105 |
| swsh6 | 99 |
| pgo | 90 |
| swsh9 | 88 |
| swsh11 | 85 |
| swsh7 | 80 |
| swsh12 | 75 |
| swsh8 | 75 |
| sv10 | 74 |
| sv05 | 71 |
| sv06 | 69 |
| me01 | 68 |
| sv01 | 68 |
| sv02 | 68 |
| sv04 | 67 |
| sv08 | 64 |
| swshp | 64 |
| sv08.5 | 57 |
| swsh1 | 57 |
| swsh5 | 57 |
| svp | 54 |
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
| sv8pt5 | 280 |
| sm5 | 279 |
| bw8 | 273 |
| swsh12.5 | 272 |
| sm3 | 259 |
| sm2 | 255 |
| pl1 | 252 |
| bw9 | 243 |
| bw11 | 242 |
| xy4 | 237 |
| sm6 | 233 |
| sv04 | 230 |
| sv08 | 229 |
| sv10 | 219 |
| pl2 | 213 |
| xyp | 211 |
| pl3 | 208 |
| sm4 | 205 |
| bw10 | 203 |
| xy3 | 203 |
| xy9 | 202 |
| dp7 | 201 |

## Notes

- `active_price`, `traits`, `species_link`, and `cameos` are enrichment surfaces, not necessarily canon blockers.
- `display_image` gaps mean no parent/representative image and no child image were found for the row in the audited fields.
- `child_or_parent_display_image` is the app-facing practical coverage measure for whether a child printing can display something honest.
- Row-level gap indexes were written to JSON for follow-up planning.

## Outputs

- Summary JSON: `docs\audits\card_row_enrichment_v1\card_row_enrichment_status_v1.json`
- Parent gap index: `docs\audits\card_row_enrichment_v1\card_parent_enrichment_gap_index_v1.json`
- Child printing gap index: `docs\audits\card_row_enrichment_v1\card_child_printing_enrichment_gap_index_v1.json`
