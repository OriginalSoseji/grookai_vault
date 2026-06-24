# IMG-HOST-WH-16B-EX55-TCGCOLLECTOR-STORAGE-UPLOAD-APPLY

- Generated: 2026-06-24T02:39:47.349Z
- Mode: guarded_apply
- Source dry-run fingerprint: `51a5ef7c93ba77699c39ad05923c77294b55837d479b6a3fc1ec60f80896c175`
- Approval fingerprint: `51a5ef7c93ba77699c39ad05923c77294b55837d479b6a3fc1ec60f80896c175`
- Manifest rows: 5
- Unique upload objects: 5
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
