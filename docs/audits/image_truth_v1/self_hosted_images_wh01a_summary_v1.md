# IMG-HOST-WH-01A-WAREHOUSE-IMAGE-STORAGE-AUDIT-DRY-RUN

- Generated: 2026-06-23T06:20:48.838Z
- Mode: read_only_dry_run_manifest
- Proof hash: `8d71a670e637398e9661d72ae44d21c25fac050084e5deda9f145e8e554499f1`
- Result JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh01a_results_v1.jsonl`
- DB writes performed: false
- Storage uploads performed: false
- Migrations created: false
- End reason: queue_exhausted

## Counts

- Queried image field rows: 40268
- Processed this run: 40268
- Total result rows: 40268
- Successful fetch rows: 27821
- Failed fetch rows: 12447
- Storage-ready external rows: 27139

## Source Lanes

| key | count |
| --- | ---: |
| external_other | 18 |
| external_pokemontcg | 6210 |
| external_tcgdex | 33358 |
| supabase_storage_path | 682 |

## Failure Reasons

| key | count |
| --- | ---: |
| http_404 | 114 |
| http_404,non_image_content_type,dimensions_unreadable,very_small_image_payload | 237 |
| non_image_content_type,dimensions_unreadable,very_small_image_payload | 12096 |

## Policy

- Read-only audit.
- No database writes.
- No storage uploads.
- No migrations.
- No exact image claims are changed.
- Proposed storage paths are manifest-only and require a separate approved apply.
