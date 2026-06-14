# PKG-17D Stamped Base Parent Resolution Readiness V1

Generated: 2026-06-12T23:57:32.394Z

Read-only readiness view for stamped rows blocked because the unstamped base parent is missing or ambiguous. This report does not write to the database, create migrations, delete rows, merge rows, or alter canonical truth.

## Summary

| metric | value |
| --- | --- |
| target_rows | 59 |
| db_reads_performed | true |
| insert_dry_run_candidates | 0 |
| stale_or_return_to_stamped_readiness | 35 |
| blocked_rows | 24 |
| write_ready_now | 0 |
| fingerprint_sha256 | `9050f9ea7517879708cf8257daaf86c7593288a5c0f36beb0913accbb12df3aa` |

## Status Counts

| status | rows |
| --- | --- |
| stale_stamped_parent_now_exists | 20 |
| blocked_missing_or_inactive_base_finish | 19 |
| stale_unstamped_base_parent_now_exists | 15 |
| blocked_multiple_base_parent_candidates | 4 |
| blocked_same_number_different_name | 1 |

## Candidate Rows

| set | number | card | base_finish | target_parent_id | target_child_id |
| --- | --- | --- | --- | --- | --- |

## Blocked / Return Rows

| set | number | card | status | blockers | next_action |
| --- | --- | --- | --- | --- | --- |
| base1 | 58 | Pikachu | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| base2 | 1 | Clefable | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| base2 | 60 | Pikachu | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| base3 | 50 | Kabuto | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| base5 | 8 | Dark Gyarados | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| base5 | 19 | Dark Arbok | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| base5 | 32 | Dark Charmeleon | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| gym1 | 9 | Misty's Seadra | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| gym1 | 54 | Misty's Psyduck | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| gym2 | 37 | Brock's Vulpix | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| me01 | 87 | Spiritomb | blocked_multiple_base_parent_candidates | same_name_parent_count_2 | Resolve base parent identity collision before any stamped package. |
| sm7.5 | 3 | Charizard | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sm7.5 | 55 | Kangaskhan | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv02 | 172 | Boss's Orders (Ghetsis) | blocked_same_number_different_name | same_number_parent_count_1 | Adjudicate same-number identity conflict before inserting a base parent. |
| sv03.5 | 1 | Bulbasaur | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| sv03.5 | 4 | Charmander | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| sv03.5 | 7 | Squirtle | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| sv03.5 | 16 | Pidgey | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| sv03.5 | 100 | Voltorb | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| sv03.5 | 132 | Ditto | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| sv03.5 | 133 | Eevee | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| sv03.5 | 151 | Mew ex | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| sv06.5 | 2 | Galvantula | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| sv06.5 | 38 | Fezandipiti ex | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| sv06.5 | 61 | Night Stretcher | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| sv08.5 | 4 | Budew | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 40 | Sylveon | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 41 | Sylveon ex | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 74 | Eevee | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 109 | Friends in Paldea | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 116 | Max Rod | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 122 | Professor's Research | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 123 | Professor's Research | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 124 | Professor's Research | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| sv08.5 | 125 | Professor's Research | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| swsh11 | 17 | Trevenant | blocked_multiple_base_parent_candidates | same_name_parent_count_2 | Resolve base parent identity collision before any stamped package. |
| swsh11 | 26 | Chandelure | blocked_multiple_base_parent_candidates | same_name_parent_count_2 | Resolve base parent identity collision before any stamped package. |
| swsh11 | 64 | Gastly | blocked_multiple_base_parent_candidates | same_name_parent_count_2 | Resolve base parent identity collision before any stamped package. |
| swsh12.5 | 36 | Kyogre | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| swsh12.5 | 130 | Friends in Hisui | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| swsh12.5 | 131 | Friends in Sinnoh | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| swsh12.5 | 135 | Lost Vacuum | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| swsh12.5 | 143 | Sky Seal Stone | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| swsh12.5 | 145 | Trekking Shoes | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| swsh12.5 | 146 | Ultra Ball | stale_stamped_parent_now_exists | none | Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists. |
| swsh3.5 | 7 | Victini | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| swsh3.5 | 18 | Hatenna | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| swsh3.5 | 35 | Galarian Zigzagoon | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| swsh3.5 | 36 | Galarian Linoone | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| swsh4.5 | 58 | Boss's Orders | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| swsh4.5 | 59 | Gym Trainer | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| swsh4.5 | 60 | Professor's Research | stale_unstamped_base_parent_now_exists | none | Return this row to stamped parent identity readiness; the unstamped base parent now exists. |
| wp | WPR B2 63 | Wartortle | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| wp | WPR FO 50 | Kabuto | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| wp | WPR GC 37 | Brock's Vulpix | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| wp | WPR GH 54 | Misty's Psyduck | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| wp | WPR JU 60 | Pikachu | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| wp | WPR TR 19 | Dark Arbok | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |
| wp | WPR TR 32 | Dark Charmeleon | blocked_missing_or_inactive_base_finish | missing_target_finish | Acquire an exact active child finish for the unstamped base parent before any insert dry-run. |

## Guardrail

Candidate rows are not approval to write. A future package must prepare a rollback-only dry-run transaction artifact, prove target IDs and child finishes, and receive explicit approval before any apply.
