# IMG-HOST-WH-04C-TCGDEX-REPLACEMENT-STORAGE-UPLOAD-APPLY

- Generated: 2026-06-23T17:56:27.930Z
- Mode: guarded_apply
- Fingerprint: `bc4fe59f62378f058c174f67bcafcf1735a5774f19aa693bae4cd856e27fc5a0`
- Manifest JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh04b_tcgdex_replacement_upload_manifest_v1.jsonl`
- Manifest rows: 11405
- Unique upload objects total: 11405
- Unique upload objects in scope: 11405
- Upload limit: none
- Target storage buckets: user-card-images
- Ready for apply: true
- Stop findings: none

## Policy

- Storage upload only when run with `--apply --fingerprint <fingerprint>`.
- No database writes.
- No migrations.
- No exact image claim changes.
- No identity-table writes.
- No price writes.
- No deletes or merges.
- Source bytes are re-fetched and verified against expected SHA-256 and size before upload.
