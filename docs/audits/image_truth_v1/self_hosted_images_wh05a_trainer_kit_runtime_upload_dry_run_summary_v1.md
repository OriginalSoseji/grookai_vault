# IMG-HOST-WH-05A-TRAINER-KIT-RUNTIME-REPLACEMENT-UPLOAD-DRY-RUN

- Generated: 2026-06-23T18:42:41.115Z
- Mode: read_only_upload_manifest_dry_run
- Proof hash: `9a8a981950ac1147d16d2da24239b1591712120011eab94496c99e6f1cb1b25a`
- Manifest: `docs\audits\image_truth_v1\self_hosted_images_wh05a_trainer_kit_runtime_upload_manifest_v1.jsonl`
- Trainer Kit rows: 406
- Missing image_path rows: 270
- Source-backed candidate rows: 270
- Upload manifest rows: 270
- Failed fetch rows: 0
- Ready for storage upload apply: true

## By Source Lane

| Source lane | Rows |
| --- | --- |
| external_malie | 247 |
| external_tcgcollector | 23 |

## By Set

| Set | Rows |
| --- | --- |
| tk-bw-e | 30 |
| tk-bw-z | 30 |
| tk-dp-l | 11 |
| tk-dp-m | 12 |
| tk-sm-l | 18 |
| tk-sm-r | 19 |
| tk-xy-b | 30 |
| tk-xy-n | 30 |
| tk-xy-p | 30 |
| tk-xy-sy | 30 |
| tk-xy-w | 30 |

## Policy

- Write scope: none.
- Storage scope: none.
- DB scope: none.
- Exact image claims: no exact-image claim changes; representative rows remain representative_shared.
- Future apply scope should upload manifest objects, then update card_prints image_source/image_path/image_status/image_note only.
