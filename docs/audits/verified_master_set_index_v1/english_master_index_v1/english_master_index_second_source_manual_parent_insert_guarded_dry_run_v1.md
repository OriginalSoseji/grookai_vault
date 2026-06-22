# Second Source Manual Parent Insert Guarded Dry Run V1

Generated: 2026-06-21T20:35:52.047Z

This is a rollback-only dry-run artifact. It performs no durable writes.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false

## Summary

| metric | value |
| --- | --- |
| target_rows | 3 |
| write_ready_for_approval | true |
| rollback_verified | true |
| dry_run_proof_sha256 | 61afe4fc04739e1dd5ed182f264efa4451361c01800d6a54d3f869523306c572 |
| fingerprint_sha256 | `1a6ab61b6803b788700cc123927c909f80e9de955eeb9fa4c44af9ee483c0cc2` |

## Scope

| set | number | card | stamp | variant_key | finish |
| --- | --- | --- | --- | --- | --- |
| bw5 | 25 | Vaporeon | Regional Championships Staff Stamp | regional_championships_staff_stamp | reverse |
| sm1 | 135 | Ultra Ball | Europe Championships Staff Stamp | europe_championships_staff_stamp | reverse |
| xy1 | 085 | Aegislash | Regional Championships Staff Stamp | regional_championships_staff_stamp | reverse |

## Excluded Rows

| set | number | card | stamp | finish | reason |
| --- | --- | --- | --- | --- | --- |
| xy1 | 083 | Honedge | Regional Championships Staff Stamp | holo | base_parent_missing_matching_finish_child |

## Required Approval Boundary

Do not real-apply this package without explicit approval. If approved, the exact scope is 3 parent inserts, 3 active identity inserts, and 3 child printing inserts. No deletes, no merges, no migrations.
