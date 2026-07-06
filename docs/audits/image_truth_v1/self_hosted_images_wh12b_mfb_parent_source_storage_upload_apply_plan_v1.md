# IMG-HOST-WH-12B-MFB-PARENT-SOURCE-STORAGE-UPLOAD-APPLY

- Generated: 2026-06-24T02:05:41.754Z
- Mode: guarded_apply
- Source dry-run fingerprint: `629a99fde9802cfa1563412bc472775f752f4ba880f6098b3e42c029dda689b3`
- Approval fingerprint: `629a99fde9802cfa1563412bc472775f752f4ba880f6098b3e42c029dda689b3`
- Manifest rows: 34
- Unique upload objects: 34
- Target storage buckets: user-card-images
- Ready for apply: true
- Stop findings: none

## Policy

- Storage uploads only when run with `--apply --fingerprint <fingerprint>`.
- No database writes.
- No migrations.
- No parent overwrites.
- No exact image claim changes.
- No identity-table writes.
- No price writes.
- No deletes or merges.
