# IMG-HOST-WH-06C-MCDONALDS-DEXTCG-STORAGE-UPLOAD-APPLY

- Generated: 2026-06-23T20:19:05.480Z
- Mode: guarded_apply
- Fingerprint: `389bf9d798397beba886ce665867e9c2e5ee7dc0218c4124d7babf12475dfdcf`
- Plan hash: `626ccc9b832ac80a901b5a3836ecf83834ca20cc868739deaa754b87a6a0067f`
- Manifest JSONL: `docs\audits\image_truth_v1\self_hosted_images_wh06b_mcdonalds_dextcg_upload_manifest_v1.jsonl`
- Manifest rows: 78
- Unique upload objects: 78
- Target storage buckets: user-card-images
- Source lanes: external_dextcg
- Ready for apply: true
- Stop findings: none

## Policy

- Storage upload only when run with `--apply --fingerprint 389bf9d798397beba886ce665867e9c2e5ee7dc0218c4124d7babf12475dfdcf`.
- No database writes.
- No migrations.
- No exact image claim changes.
- No identity-table writes.
- No price writes.
- No deletes or merges.
- Source bytes are re-fetched and verified against expected SHA-256 and size before upload.
