# DV1 Regional Championship Guarded Dry-Run V1

Rollback-only dry-run execution for Dragon Vault Regional Championships stamped parent identities.

## Summary

| metric | value |
| --- | --- |
| package_id | `DV1-REGIONAL-CHAMPIONSHIP-STAMP-PARENT-INSERTS` |
| package_fingerprint_sha256 | `a180ffd8639a2bbd6dddf99b7b93bff28f7a58ac514e7f25971a83d9aaf0b8d9` |
| dry_run_status | completed_rolled_back_no_durable_change |
| target_rows | 3 |
| inserted_parent_rows_transient | 3 |
| inserted_identity_rows_transient | 3 |
| inserted_child_rows_transient | 3 |
| before_hash | `b5f238828714f8e316cafa073713c9ee68609a19741b3b4d91e875b8061a9893` |
| after_hash | `b5f238828714f8e316cafa073713c9ee68609a19741b3b4d91e875b8061a9893` |
| durable_state_unchanged | true |
| dry_run_proof_sha256 | `528940cd7593173f30eeea82bc443061e8a9780c9d413a3dde9b90d7566802a9` |
| db_writes_performed | false |
| migrations_created | false |

## Scope

| set | number | card | stamp | variant | finish | target parent | target child |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dv1 | 6 | Bagon | Regional Championships Stamp | regional_championships_stamp | holo | a70613b9-f22e-4aad-92af-a28779d4482f | bd03fbf3-d42d-47ff-8580-c6cce45484aa |
| dv1 | 7 | Shelgon | Regional Championships Stamp | regional_championships_stamp | holo | 3440063f-bb51-4493-9132-f8d3ff7a3c27 | 27190575-52e8-429f-8903-49a4f264b218 |
| dv1 | 8 | Salamence | Regional Championships Stamp | regional_championships_stamp | holo | 0e96b302-b65a-4649-952b-ab6af07b725e | 62b69a80-c2f8-4c11-b651-c2ae6c463a5a |

## Required Approval For Real Apply

```text
Approve real DV1-REGIONAL-CHAMPIONSHIP-STAMP-PARENT-INSERTS apply only. Fingerprint: a180ffd8639a2bbd6dddf99b7b93bff28f7a58ac514e7f25971a83d9aaf0b8d9. Scope: 3 Regional Championships stamped parent inserts, 3 active identity inserts, 3 holo child printing inserts for Dragon Vault Bagon #6, Shelgon #7, and Salamence #8. Dry-run proof: 528940cd7593173f30eeea82bc443061e8a9780c9d413a3dde9b90d7566802a9 == 528940cd7593173f30eeea82bc443061e8a9780c9d413a3dde9b90d7566802a9. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```

## Safety

- Transaction was rolled back.
- Durable before/after hash matched.
- No real apply.
- No migrations.
- No deletes.
- No merges.
- No unsupported cleanup.
- Crosshatch is evidence/display metadata, not a canonical finish key.
