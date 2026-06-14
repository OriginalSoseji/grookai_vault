# PKG-05A Missing Master-Verified Set Inserts Real Apply Checkpoint V1

Date: 2026-06-10

| Field | Value |
| --- | --- |
| apply_status | pkg05a_missing_master_verified_set_inserts_real_apply_committed |
| package_id | PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS |
| readiness_fingerprint_sha256 | `da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1` |
| artifact_fingerprint_sha256 | `df4c9dcae0a19731d4b96f9efd0322f5fde78722c0c08786e4d97a8a2d395dc9` |
| set_inserts | 4 |
| parent_inserts | 72 |
| child_printing_inserts | 80 |
| external_mapping_inserts | 72 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| deletes_performed | false |
| merges_performed | false |
| unsupported_cleanup_performed | false |
| stop_findings | 0 |

Real apply was scoped to four missing fully master-verified set inserts: 2023sv, 2024sv, mee, and mfb. No global apply, migrations, deletes, merges, unsupported cleanup, or quarantine were performed.
