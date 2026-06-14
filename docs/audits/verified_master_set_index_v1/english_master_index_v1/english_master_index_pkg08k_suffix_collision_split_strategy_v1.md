# PKG-08K Suffix Collision Split Strategy V1

Read-only split strategy for suffix-number cards that are currently represented by a base-number live parent.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- source_rows: 3
- split_parent_required_rows: 3
- by_split_readiness: {"blocked_split_parent_required":3}

| set | base | suffix | card | readiness | base finishes | suffix finishes | live finishes | unsupported on merged |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| xy7 | 75 | 75a | Hex Maniac | blocked_split_parent_required | normal, reverse | normal | holo, normal, reverse | holo |
| g1 | 73 | 73a | Team Flare Grunt | blocked_split_parent_required | normal, reverse | normal | holo, normal, reverse | holo |
| sm4 | 63 | 63a | Guzzlord-GX | blocked_split_parent_required | holo, normal | normal | holo, normal, reverse | reverse |

## Conclusion

These rows must not be handled as a simple parent number update. The base card and suffix card are both master-verified identities.
Future repair requires a separate guarded split package that preserves the base parent, creates a suffix parent, transfers the suffix mapping, and handles child printings with cleanup deferred unless separately approved.
