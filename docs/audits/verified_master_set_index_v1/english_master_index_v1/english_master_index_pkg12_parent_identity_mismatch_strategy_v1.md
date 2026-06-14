# PKG-12 Parent Identity Mismatch Strategy V1

Read-only strategy for the remaining same-number parent identity mismatches in the English Master Index reconciliation queue.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- source_rows: 0
- strategy_rows: 0
- fingerprint: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- live_parent_rows_read: 24988

| strategy_lane | rows | top_sets |
| --- | --- | --- |

## Status Detail

| strategy_status | rows | top_sets |
| --- | --- | --- |

## Recommended Next Packages

| package | scope | rows | guardrail |
| --- | --- | --- | --- |
| PKG-12A | prefix_collision_true_parent_insert_candidate | 0 | Guarded parent+child insert dry-run only; preserve prefix/subset parents. |
| PKG-12B | display_alias_child_finish_insert_candidate | 0 | Guarded child-only insert dry-run on equivalent display alias parents. |
| PKG-12C | identity alias suppression | 0 | Governed reconciliation suppression only; no DB write needed. |
| Blocked | manual/identity conflict | 0 | Do not apply until exact identity is proven. |

## Guardrails

- Prefix/subset parents must remain untouched when inserting unprefixed base checklist parents.
- Display aliases can only create child printings when the normalized parent identity is equivalent and the target finish is missing.
- Existing-finish alias rows should be suppressed from reconciliation, not written.
- PL4-style true-name conflicts remain blocked.
