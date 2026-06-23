# IMG-HOST-WH-02A-VALID-EXTERNAL-UPLOAD-DRY-RUN

- Generated: 2026-06-23T12:21:01.776Z
- Mode: read_only_upload_manifest_dry_run
- Proof hash: `73e5b810353ca4e1c309b1ae2aabe17764506101469b962d5e9831f62a784b91`
- Source result JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh01a_results_v1.jsonl`
- Manifest JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh02a_valid_external_upload_manifest_v1.jsonl`
- DB writes performed: false
- Storage uploads performed: false
- Migrations created: false
- Ready for storage upload apply: true

## Counts

- Source rows total: 40268
- Upload candidate rows: 27139
- Unique upload objects: 27059
- Unique target storage paths: 27059
- Unique source hashes: 25068
- Duplicate target path reuse groups: 80
- Conflicting duplicate target path groups: 0
- Duplicate source row/field target groups: 0
- Duplicate source hash groups: 1824
- Stop findings: none

## Source Lanes

| key | count |
| --- | ---: |
| external_tcgdex | 21025 |
| external_pokemontcg | 6096 |
| external_other | 18 |

## Source Tables

| key | count |
| --- | ---: |
| card_prints | 27121 |
| card_printings | 18 |

## Fields

| key | count |
| --- | ---: |
| image_url | 22467 |
| image_alt_url | 3162 |
| representative_image_url | 1510 |

## Content Types

| key | count |
| --- | ---: |
| image/webp | 21025 |
| image/png | 6096 |
| image/jpeg | 18 |

## Top Sets

| key | count |
| --- | ---: |
| smp | 615 |
| sm12 | 544 |
| sm8 | 476 |
| swsh10 | 473 |
| sm10 | 468 |
| xyp | 437 |
| swsh9 | 423 |
| swsh8 | 405 |
| sv10 | 392 |
| sm7 | 370 |
| sm2 | 342 |
| swshp | 342 |
| B1 | 331 |
| sm11 | 316 |
| sv02 | 306 |
| swsh6 | 305 |
| sm6 | 301 |
| me02.5 | 295 |
| sv04 | 290 |
| A1 | 286 |
| sv01 | 278 |
| swsh7 | 278 |
| sv08 | 271 |
| swsh11 | 262 |
| sv05 | 256 |
| xy10 | 255 |
| sv06 | 254 |
| svp | 254 |
| swsh12 | 253 |
| sv4pt5 | 248 |

## Policy

- No storage upload was performed.
- No database write was performed.
- No exact image claim was changed.
- No identity, price, delete, merge, or migration operation was performed.
- This manifest is only an upload/readiness plan for currently validated external images.
