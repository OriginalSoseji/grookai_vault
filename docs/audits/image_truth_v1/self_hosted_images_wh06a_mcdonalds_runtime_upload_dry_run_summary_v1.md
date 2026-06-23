# IMG-HOST-WH-06A-MCDONALDS-RUNTIME-REPLACEMENT-UPLOAD-DRY-RUN

- Generated: 2026-06-23T19:59:32.410Z
- Mode: read_only_upload_manifest_dry_run
- Proof hash: `8772759ee28ec4e5ce1bcb7fbf5918aed259315ea8df6795ab6c3477e4263208`
- Manifest: `docs\audits\image_truth_v1\self_hosted_images_wh06a_mcdonalds_runtime_upload_manifest_v1.jsonl`
- McDonald's rows total: 191
- Missing image_path rows: 78
- Source-backed candidate rows: 48
- Upload manifest rows: 0
- Unresolved rows: 78
- Failed fetch rows: 48
- Ready for storage upload apply: false
- Stop findings: source_fetch_failures

## By Source Lane

_None._

## By Set

_None._

## Unresolved By Set

| key | count |
| --- | --- |
| 2023sv | 15 |
| 2024sv | 15 |
| mcd14 | 12 |
| mcd15 | 12 |
| mcd17 | 12 |
| mcd18 | 12 |

## Unresolved By Reason

| key | count |
| --- | --- |
| source_url_not_validated | 48 |
| missing_source_url | 30 |

## Policy

- Write scope: none.
- Storage scope: none.
- DB scope: none.
- Exact image claims: no exact-image claim changes.
- Future apply scope should upload manifest objects, then update card_prints image_source/image_path/image_status/image_note only.
- 2023/2024 McDonald rows are intentionally left unresolved until a verified image source is available.
