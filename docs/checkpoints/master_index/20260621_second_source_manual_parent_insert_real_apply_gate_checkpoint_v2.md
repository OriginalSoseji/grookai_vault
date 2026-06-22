# Second Source Manual Parent Insert Real Apply Gate Checkpoint V2

Generated: 2026-06-21

## Scope

This checkpoint records the current no-write real-apply gate for:

```text
SECOND-SOURCE-MANUAL-PARENT-INSERTS
```

This supersedes V1 because the Vaporeon / Dark Explorers Regional Championships Staff row was source-confirmed and added to the guarded package.

## Status

- real_apply_performed: false
- db_writes_performed: false
- migrations_created: false
- deletes_performed: false
- cleanup_performed: false
- quarantine_performed: false
- global_apply_performed: false

## Package Summary

- parent_insert_scope: 3
- active_identity_insert_scope: 3
- child_printing_insert_scope: 3
- finish_counts:
  - reverse: 3
- variant_counts:
  - europe_championships_staff_stamp: 1
  - regional_championships_staff_stamp: 2
- excluded_rows: 1
  - Honedge #083 / Regional Championships Staff Stamp / holo
  - reason: base_parent_missing_matching_finish_child

## Proof

- fingerprint_sha256: `1a6ab61b6803b788700cc123927c909f80e9de955eeb9fa4c44af9ee483c0cc2`
- dry_run_proof_sha256: `61afe4fc04739e1dd5ed182f264efa4451361c01800d6a54d3f869523306c572`
- rollback_hash_before: `eec317ccf69782572778f17996f26855c13c8ad4e3456644e8a5eccb822c9c1f`
- rollback_hash_after: `eec317ccf69782572778f17996f26855c13c8ad4e3456644e8a5eccb822c9c1f`
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
Approve real SECOND-SOURCE-MANUAL-PARENT-INSERTS apply only. Fingerprint: 1a6ab61b6803b788700cc123927c909f80e9de955eeb9fa4c44af9ee483c0cc2. Scope: 3 stamped parent inserts, 3 active identity inserts, 3 reverse child printing inserts; variants europe_championships_staff_stamp=1 and regional_championships_staff_stamp=2; excluded Honedge #083 remains blocked by base_parent_missing_matching_finish_child. Dry-run proof: 61afe4fc04739e1dd5ed182f264efa4451361c01800d6a54d3f869523306c572; rollback hash eec317ccf69782572778f17996f26855c13c8ad4e3456644e8a5eccb822c9c1f == eec317ccf69782572778f17996f26855c13c8ad4e3456644e8a5eccb822c9c1f. No global apply. No migrations. No deletes. No merges. No cleanup.
```

## Guardrails

Real apply remains blocked if any proof, fingerprint, or scope changes before approval.
