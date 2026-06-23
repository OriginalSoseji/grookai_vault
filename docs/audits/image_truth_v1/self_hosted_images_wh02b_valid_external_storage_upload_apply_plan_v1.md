# IMG-HOST-WH-02B-VALID-EXTERNAL-STORAGE-UPLOAD-APPLY

- Generated: 2026-06-23T15:01:54.800Z
- Mode: guarded_apply
- Fingerprint: `d1c7bdead3e3c1f0b75954e9b9535298172f8619cec52fb08f43942481c1d855`
- Manifest JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh02a_valid_external_upload_manifest_v1.jsonl`
- Manifest rows: 27139
- Unique upload objects total: 27059
- Unique upload objects in scope: 27059
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
- The manifest preserves original source URLs and expected SHA-256 metadata.
