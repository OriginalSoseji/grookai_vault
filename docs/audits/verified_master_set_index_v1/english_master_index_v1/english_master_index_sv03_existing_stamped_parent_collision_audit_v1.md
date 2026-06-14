# English Master Index SV03 Existing Stamped Parent Collision Audit V1

Generated: 2026-06-12T19:56:03.891Z

Read-only audit of existing SV03 stamped parent rows that blocked insert readiness. No database writes, migrations, cleanup, quarantine, insertions, deletions, or apply SQL were performed.

## Summary

| metric | value |
| --- | --- |
| target_collision_rows | 3 |
| existing_parent_rows_found | 3 |
| existing_parent_missing_target_child_finish | 0 |
| existing_parent_has_target_child_finish | 3 |
| forbidden_stamped_child_finishes | 0 |
| write_ready_now | 0 |
| fingerprint_sha256 | `c828d6d1ce2439dc02bf47897e094a7bfffb122452a430551690a909192a54f5` |

## Status Counts

| status | rows |
| --- | --- |
| existing_parent_has_target_finish_but_blocked_by_evidence_or_identity | 2 |
| existing_parent_already_satisfies_target_finish | 1 |

## Rows

| number | card | variant | target_finish | existing_parent_id | existing_child_finishes | status | blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 196 | Town Store | play_pokemon_stamp | cosmos | 18fbf76a-a9c5-4247-9ea5-0d8d2207ad65 | cosmos | existing_parent_already_satisfies_target_finish |  |
| 22 | Toedscruel ex | play_pokemon_stamp | holo | 25d66424-5250-4d77-b9b3-d8e82bca20a4 | holo | existing_parent_has_target_finish_but_blocked_by_evidence_or_identity | product_family_only_requires_manual_adjudication_before_child_action |
| 66 | Tyranitar ex | play_pokemon_stamp | holo | 3bfdd7db-f5d8-4275-85b8-bb64130860e6 | holo | existing_parent_has_target_finish_but_blocked_by_evidence_or_identity | product_family_only_requires_manual_adjudication_before_child_action |

## Boundary

This audit does not authorize child inserts or parent cleanup. Existing stamped parents with product-family-only evidence remain blocked until adjudication. Existing parents with missing target child finishes require a separate guarded dry-run package if later approved.
