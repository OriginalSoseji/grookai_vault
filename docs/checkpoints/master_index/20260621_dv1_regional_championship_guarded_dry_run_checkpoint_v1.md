# DV1 Regional Championship Guarded Dry-Run Checkpoint V1

Date: 2026-06-21

## Purpose

Record the guarded rollback-only dry-run for the Dragon Vault Regional Championships stamped parent identity package.

This checkpoint does not authorize real apply.

## Package

- package_id: `DV1-REGIONAL-CHAMPIONSHIP-STAMP-PARENT-INSERTS`
- package_fingerprint_sha256: `a180ffd8639a2bbd6dddf99b7b93bff28f7a58ac514e7f25971a83d9aaf0b8d9`

## Scope

- 3 Regional Championships stamped parent inserts
- 3 active `card_print_identity` inserts
- 3 `holo` child `card_printing` inserts

Cards:

- `dv1` Bagon `#6`
- `dv1` Shelgon `#7`
- `dv1` Salamence `#8`

## Dry-Run Proof

- dry_run_status: `completed_rolled_back_no_durable_change`
- before_hash: `b5f238828714f8e316cafa073713c9ee68609a19741b3b4d91e875b8061a9893`
- after_hash: `b5f238828714f8e316cafa073713c9ee68609a19741b3b4d91e875b8061a9893`
- durable_state_unchanged: true
- dry_run_proof_sha256: `528940cd7593173f30eeea82bc443061e8a9780c9d413a3dde9b90d7566802a9`

Transient inserts inside rolled-back transaction:

- parent rows: 3
- identity rows: 3
- child rows: 3

## Artifacts

- `scripts/audits/english_master_index_dv1_regional_championship_guarded_dry_run_v1.mjs`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_dv1_regional_championship_guarded_dry_run_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_dv1_regional_championship_guarded_dry_run_v1.md`

## Safety

- real apply performed: false
- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- deletes_performed: false
- merges_performed: false
- unsupported_cleanup_performed: false
- global_apply_performed: false

Crosshatch remains evidence/display metadata and is not a canonical `finish_key`.

## Required Approval For Real Apply

```text
Approve real DV1-REGIONAL-CHAMPIONSHIP-STAMP-PARENT-INSERTS apply only. Fingerprint: a180ffd8639a2bbd6dddf99b7b93bff28f7a58ac514e7f25971a83d9aaf0b8d9. Scope: 3 Regional Championships stamped parent inserts, 3 active identity inserts, 3 holo child printing inserts for Dragon Vault Bagon #6, Shelgon #7, and Salamence #8. Dry-run proof: 528940cd7593173f30eeea82bc443061e8a9780c9d413a3dde9b90d7566802a9 == 528940cd7593173f30eeea82bc443061e8a9780c9d413a3dde9b90d7566802a9. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
