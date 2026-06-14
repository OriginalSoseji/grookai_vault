# English Master Index PKG-02F Duplicate Dependency Transfer Real Apply V1

This report records the real `PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER` apply authorized by the operator.

## Status

| Field | Value |
| --- | --- |
| apply_status | pkg02f_duplicate_dependency_transfer_real_apply_committed_and_verified |
| package_id | PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER |
| package_fingerprint_sha256 | `21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a` |
| updated_external_mapping_rows | 21 |
| deleted_child_rows | 23 |
| deleted_parent_rows | 21 |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| stop_findings | 0 |

## Verification Summary

- before_hash_matches_dry_run_proof: true
- rollback_snapshot_captures_species_rows: true
- duplicate_parents_removed: true
- duplicate_children_removed: true
- survivor_rows_preserved: true
- number_key_rows_unchanged: true
- master_index_comparison_status: pkg02f_duplicate_dependency_transfer_committed_verified

## Rollback Snapshot Preview

```sql
-- restore duplicate parent 2fdd39c8-7afa-4031-be84-649ac28a7b72 for ex10 113 Entei ★
-- restore duplicate parent 043dbc47-0815-4ef4-b31d-2027f70f2338 for ex10 114 Raikou ★
-- restore duplicate parent 584c31ad-d7ac-4356-b9cc-4de3152511b2 for ex10 115 Suicune ★
-- restore duplicate parent 6419894a-137f-4fc7-8db1-fa853872b190 for mep 001 Meganium
-- restore duplicate parent b75d4730-3c1a-42ca-9d18-e8ca736ae41f for mep 002 Inteleon
-- restore duplicate parent aa9f207d-c9ea-4607-bbc5-448648bca47f for mep 003 Alakazam
-- restore duplicate parent bf523703-271c-49fe-b8aa-c31c57cb9b32 for mep 004 Lunatone
-- restore duplicate parent 04e533ae-dd17-478c-ab46-220859079b2c for mep 005 Drifloon
-- restore duplicate child 597aa8d8-7e4d-4f0a-b4ce-ebb96ed800e8 finish_key=holo for parent 2fdd39c8-7afa-4031-be84-649ac28a7b72
-- restore duplicate child 90eb803f-345c-46f0-b5f3-6fd62af386d5 finish_key=holo for parent 043dbc47-0815-4ef4-b31d-2027f70f2338
-- restore duplicate child 4d6df833-3363-46a8-ad80-12ad715d9aec finish_key=holo for parent 584c31ad-d7ac-4356-b9cc-4de3152511b2
-- restore duplicate child 2e4cadb9-44b8-490a-94af-3ea6f45f021f finish_key=holo for parent 6419894a-137f-4fc7-8db1-fa853872b190
-- restore duplicate child 1d168cec-7194-42e4-9e62-691e5f1f8698 finish_key=holo for parent b75d4730-3c1a-42ca-9d18-e8ca736ae41f
-- restore duplicate child 7357533d-7e4b-430c-b8ce-f73c6d08cb55 finish_key=holo for parent aa9f207d-c9ea-4607-bbc5-448648bca47f
-- restore duplicate child cab49274-d396-43b7-a09a-9e43bd310abf finish_key=holo for parent bf523703-271c-49fe-b8aa-c31c57cb9b32
-- restore duplicate child 52313084-cf51-490b-9b7d-ed4e00d30735 finish_key=holo for parent 04e533ae-dd17-478c-ab46-220859079b2c
```

The source JSON report contains the full pre-apply snapshot for duplicate parents, child printings, external mappings, identity rows, trait rows, and species rows captured immediately before apply.

## Stop Findings

- none

## Non-Authorizations

- No global apply was authorized or performed.
- The 58 number-key collision rows remain excluded and unchanged.
- No migrations were authorized or created.
- No cleanup or quarantine was authorized.
- No pricing, scanner, marketplace, provenance, or ownership rows were intentionally changed.
