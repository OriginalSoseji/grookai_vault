# Stamped/Special Dependency Governance Packet V1

Generated: 2026-06-22T17:17:16.867Z

Audit-only dependency packet for stamped/special residual rows blocked by base parent, base finish, or product/display metadata modeling.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| dependency_rows | 15 |
| halloween_rows | 6 |
| base_parent_rows | 9 |
| write_ready_now | 0 |
| fingerprint | `c364821c0c2be5023d6d242045bc58c013100a14c5537a9bae8bbe8986e2b7d8` |

## Dependency Classes

| dependency_class | rows |
| --- | --- |
| w_promotional_base_identity_governance_required | 7 |
| halloween_base_parent_or_finish_blocked | 6 |
| battle_academy_display_metadata_base_finish_blocked | 2 |

## Script Findings

| source | finding |
| --- | --- |
| Halloween readiness | source candidates 4; write-ready 0; blocker base_parent_missing, base_parent_missing_target_child_finish |
| Base parent readiness | targets 9; dry-run candidates 0; blocked 9 |
| Base parent closure | ready 0; blocked 9 |

## Rows

| set | number | card | variant | dependency class | next action |
| --- | --- | --- | --- | --- | --- |
| sv05 | 77 | Scream Tail | Pikachu Jack-o'-Lantern Stamp | halloween_base_parent_or_finish_blocked | Resolve missing base parent/target child finish before considering Halloween stamped identity rows. |
| svp | 75 | Mimikyu | Pikachu Jack-o'-Lantern Stamp | halloween_base_parent_or_finish_blocked | Resolve missing base parent/target child finish before considering Halloween stamped identity rows. |
| swsh11 | 16 | Phantump | Pikachu Jack-o'-Lantern Stamp | halloween_base_parent_or_finish_blocked | Resolve missing base parent/target child finish before considering Halloween stamped identity rows. |
| swsh11 | 24 | Litwick | Pikachu Jack-o'-Lantern Stamp | halloween_base_parent_or_finish_blocked | Resolve missing base parent/target child finish before considering Halloween stamped identity rows. |
| swsh11 | 25 | Lampent | Pikachu Jack-o'-Lantern Stamp | halloween_base_parent_or_finish_blocked | Resolve missing base parent/target child finish before considering Halloween stamped identity rows. |
| swsh11 | 65 | Haunter | Pikachu Jack-o'-Lantern Stamp | halloween_base_parent_or_finish_blocked | Resolve missing base parent/target child finish before considering Halloween stamped identity rows. |
| sm7.5 | 3 | Charizard | Battle Academy Deck Mark | battle_academy_display_metadata_base_finish_blocked | Keep as display/deck metadata unless Battle Academy deck marks are governed as distinct physical identities. |
| sm7.5 | 55 | Kangaskhan | Battle Academy Deck Mark | battle_academy_display_metadata_base_finish_blocked | Keep as display/deck metadata unless Battle Academy deck marks are governed as distinct physical identities. |
| wp | WPR B2 63 | Wartortle |  | w_promotional_base_identity_governance_required | Create W Promotional identity governance before any parent/child package; current base parent cannot be resolved safely. |
| wp | WPR FO 50 | Kabuto |  | w_promotional_base_identity_governance_required | Create W Promotional identity governance before any parent/child package; current base parent cannot be resolved safely. |
| wp | WPR GC 37 | Brock's Vulpix |  | w_promotional_base_identity_governance_required | Create W Promotional identity governance before any parent/child package; current base parent cannot be resolved safely. |
| wp | WPR GH 54 | Misty's Psyduck |  | w_promotional_base_identity_governance_required | Create W Promotional identity governance before any parent/child package; current base parent cannot be resolved safely. |
| wp | WPR JU 60 | Pikachu |  | w_promotional_base_identity_governance_required | Create W Promotional identity governance before any parent/child package; current base parent cannot be resolved safely. |
| wp | WPR TR 19 | Dark Arbok |  | w_promotional_base_identity_governance_required | Create W Promotional identity governance before any parent/child package; current base parent cannot be resolved safely. |
| wp | WPR TR 32 | Dark Charmeleon |  | w_promotional_base_identity_governance_required | Create W Promotional identity governance before any parent/child package; current base parent cannot be resolved safely. |
