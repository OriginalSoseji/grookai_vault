# PKG-31B External ID Relocation Child Delete Guarded Dry-Run V1

Rollback-only proof for relocating external mappings to existing Master-verified target children, then deleting the unsupported source child rows.

No DB writes were committed. No migrations were created. No parent writes, merges, quarantine, unsupported cleanup outside this scoped package, or global apply were performed.

| metric | value |
| --- | --- |
| package_id | PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE |
| fingerprint | 3c7f3c848dae292c9fdd9fa0236b7455266bfa0e92a41038066377e08a93d911 |
| source_readiness_fingerprint | f60710e906d43ff3c2f0816f65e407f8b58e11ba4708f3a436e286d53213a3a5 |
| sql_hash | 3a65a8e5b08c61eb7ec23d815d7d2dd0be13aa028400a7ae20f3db076bfdb4a8 |
| target_rows | 40 |
| mapping_transfers_in_dry_run | 40 |
| source_child_deletes_in_dry_run | 40 |
| committed | false |
| notice | PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE dry-run passed: mappings transferred 40, source children deleted 40, fingerprint 3c7f3c848dae292c9fdd9fa0236b7455266bfa0e92a41038066377e08a93d911 |

## Scope By Target Rule

| target_rule | count |
| --- | --- |
| h_number_external_id | 20 |
| trainer_gallery_external_id | 20 |
