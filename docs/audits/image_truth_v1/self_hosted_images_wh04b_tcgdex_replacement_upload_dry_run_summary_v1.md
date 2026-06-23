# IMG-HOST-WH-04B-TCGDEX-REPLACEMENT-UPLOAD-DRY-RUN

- Generated: 2026-06-23T17:45:19.020Z
- Mode: read_only_upload_manifest_dry_run
- Proof hash: `9f58062bb267648fc59ff00a847358a3ccb88a9b31e4ebef0dfa22b43bdf49d3`
- Source JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh04a_tcgdex_failed_replacement_source_audit_v1.jsonl`
- Manifest JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh04b_tcgdex_replacement_upload_manifest_v1.jsonl`
- Target storage bucket: `user-card-images`
- DB writes performed: false
- Storage uploads performed: false
- Migrations created: false
- Exact image claim changes performed: false

## Counts

- Source replacement rows: 12333
- Raw apply-ready replacement rows: 11527
- Deduped replacement rows: 122
- Apply-ready manifest rows: 11405
- Excluded TCG Pocket review rows: 671
- Duplicate target path groups: 0
- Conflicting target path groups: 0
- Duplicate target row groups: 0
- Ready for upload apply: true

## By Replacement Route

| key | count |
| --- | ---: |
| tcgdex_high_suffix_repair | 11303 |
| replacement_malie_trainer_kit | 90 |
| replacement_pokemontcg_trainer_kit | 10 |
| replacement_tcgcollector_trainer_kit | 2 |

## By Confidence

| key | count |
| --- | ---: |
| high_url_repair | 11303 |
| medium_representative_only | 92 |
| high | 10 |

## By Display Image Kind

| key | count |
| --- | ---: |
| exact | 11313 |
| representative | 92 |

## Top Sets

| key | count |
| --- | ---: |
| swshp | 285 |
| sv01 | 258 |
| sv04.5 | 245 |
| sv03 | 230 |
| sv05 | 218 |
| sv03.5 | 207 |
| swsh2 | 201 |
| sm11 | 200 |
| swsh1 | 200 |
| swsh3 | 200 |
| swsh4 | 200 |
| swsh6 | 200 |
| swsh8 | 199 |
| sm9 | 196 |
| svp | 192 |
| swsh5 | 183 |
| sv02 | 180 |
| sv08.5 | 180 |
| unknown | 176 |
| sv10.5w | 173 |
| sv10.5b | 172 |
| sm1 | 171 |
| ecard1 | 165 |
| xy5 | 164 |
| bw7 | 153 |
| dp6 | 146 |
| xy1 | 146 |
| ecard3 | 138 |
| ecard2 | 133 |
| dp3 | 132 |

## Representative-Only Sets

| key | count |
| --- | ---: |
| tk-xy-latia | 30 |
| tk-xy-latio | 30 |
| tk-xy-su | 30 |
| tk-hs-g | 1 |
| tk-hs-r | 1 |

## Policy

- Read-only upload manifest dry-run.
- No uploads, database writes, migrations, deletes, merges, identity writes, price writes, or exact-image claim changes.
- TCG Pocket candidates are explicitly excluded from this English physical replacement apply lane.
- Representative-only rows must remain representative in later DB updates; they cannot be promoted to exact image claims.