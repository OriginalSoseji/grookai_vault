# IMG-HOST-WH-05B-TRAINER-KIT-RUNTIME-REPLACEMENT-STORAGE-UPLOAD-APPLY

- Generated: 2026-06-23T18:57:40.769Z
- Mode: guarded_apply
- Fingerprint: `0644f1a27224b9f38fb08447166f5e8f8631292499a6ddee904d0ac2deeac1c9`
- Source dry-run fingerprint: `9a8a981950ac1147d16d2da24239b1591712120011eab94496c99e6f1cb1b25a`
- Manifest JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh05a_trainer_kit_runtime_upload_manifest_v1.jsonl`
- Manifest rows: 270
- Unique upload objects total: 270
- Unique upload objects in scope: 270
- Target storage buckets: user-card-images
- Source lanes: external_malie, external_tcgcollector
- Proposed image statuses: representative_shared
- Ready for apply: true
- Stop findings: none

## Policy

- Storage upload only when run with `--apply --fingerprint <fingerprint> --dry-run-fingerprint 9a8a981950ac1147d16d2da24239b1591712120011eab94496c99e6f1cb1b25a`.
- No database writes.
- No migrations.
- No exact image claim changes.
- No identity-table writes.
- No price writes.
- No deletes or merges.
- Source bytes are re-fetched and verified against expected SHA-256 and size before upload.
