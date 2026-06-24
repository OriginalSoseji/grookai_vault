# IMG-HOST-WH-10C-POKEMONTCG-RESIDUAL-PARENT-SOURCE-STORAGE-UPLOAD-APPLY

- Generated: 2026-06-24T01:23:23.857Z
- Mode: guarded_apply
- Source dry-run fingerprint: `2b96b0556d89602710e6a77818865200224c8cb71c143db448924300b255d861`
- Approval fingerprint: `2b96b0556d89602710e6a77818865200224c8cb71c143db448924300b255d861`
- Manifest rows: 151
- Unique upload objects: 151
- Target storage buckets: user-card-images
- Accepted non-2xx image body objects: 5
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
