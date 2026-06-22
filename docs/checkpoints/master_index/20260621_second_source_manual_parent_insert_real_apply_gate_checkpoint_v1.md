# Second Source Manual Parent Insert Real Apply Gate Checkpoint V1

> Superseded by `20260621_second_source_manual_parent_insert_real_apply_gate_checkpoint_v2.md` after Vaporeon was source-confirmed and the rollback-only package scope changed from 2 rows to 3 rows.

Generated: 2026-06-21

## Scope

This checkpoint records the no-write real-apply gate for:

```text
SECOND-SOURCE-MANUAL-PARENT-INSERTS
```

## Status

- real_apply_performed: false
- db_writes_performed: false
- migrations_created: false
- deletes_performed: false
- cleanup_performed: false
- quarantine_performed: false
- global_apply_performed: false

## Package Summary

- parent_insert_scope: 2
- active_identity_insert_scope: 2
- child_printing_insert_scope: 2
- finish_counts:
  - reverse: 2
- variant_counts:
  - europe_championships_staff_stamp: 1
  - regional_championships_staff_stamp: 1
- excluded_rows: 1
  - Honedge #083 / Regional Championships Staff Stamp / holo
  - reason: base_parent_missing_matching_finish_child

## Proof

- fingerprint_sha256: `bb8259fc998f9c70e762fde43350db361ed143772d6fcc7439e2794439045036`
- dry_run_proof_sha256: `9b3f249ea7785d89f5847cff53250ee77508d4200873f03eb607a3ea3080c394`
- rollback_hash_before: `2ed862fccd206330d95252603db08dcd04603ad12accd922e99922164feff757`
- rollback_hash_after: `2ed862fccd206330d95252603db08dcd04603ad12accd922e99922164feff757`
- rollback_verified: true

## Artifacts

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1.json
docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1.md
scripts/audits/english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1.mjs
```

## Required Approval Phrase

Do not run a real apply unless the operator provides this exact scoped approval:

```text
Approve real SECOND-SOURCE-MANUAL-PARENT-INSERTS apply only. Fingerprint: bb8259fc998f9c70e762fde43350db361ed143772d6fcc7439e2794439045036. Scope: 2 stamped parent inserts, 2 active identity inserts, 2 reverse child printing inserts; variants europe_championships_staff_stamp=1 and regional_championships_staff_stamp=1; excluded Honedge #083 remains blocked by base_parent_missing_matching_finish_child. Dry-run proof: 9b3f249ea7785d89f5847cff53250ee77508d4200873f03eb607a3ea3080c394; rollback hash 2ed862fccd206330d95252603db08dcd04603ad12accd922e99922164feff757 == 2ed862fccd206330d95252603db08dcd04603ad12accd922e99922164feff757. No global apply. No migrations. No deletes. No merges. No cleanup.
```

## Guardrails

Real apply remains blocked if any proof, fingerprint, or scope changes before approval.
