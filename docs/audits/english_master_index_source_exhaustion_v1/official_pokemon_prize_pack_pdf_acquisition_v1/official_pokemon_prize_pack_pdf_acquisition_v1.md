# Official Pokemon Prize Pack PDF Acquisition V1

Audit-only source acquisition from official Pokemon Prize Pack checklist PDFs.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| target_rows | 35 |
| official_entries_parsed | 486 |
| useful_second_source_matches | 0 |
| official_single_finish_may_resolve_prior_conflict | 0 |
| official_conflicting_normal_and_foil | 23 |
| no_official_exact_match | 4 |
| fixture_files_written | 0 |
| fingerprint_sha256 | `3920f087fcb106de63282cc4b7d6a6dfe6e2c1f7e01c08fd1dbc0ead860ebdd1` |

## Status Counts

| status | rows |
| --- | --- |
| official_conflicting_normal_and_foil | 23 |
| official_conflicts_with_prior_accepted_finish | 6 |
| no_official_exact_match | 4 |
| official_single_source_only | 2 |

## Useful Second-Source Matches

No useful second-source matches.

## Conflict/Review Rows

| set | number | card | prior_status | prior_finish_counts | official_finishes |
| --- | --- | --- | --- | --- | --- |
| swsh1 | 117 | Galarian Zigzagoon | blocked_second_independent_source_needed | {"cosmos":1} | normal |
| swsh1 | 156 | Air Balloon | blocked_conflicting_finish_evidence | {"cosmos":1,"normal":1} | cosmos, normal |
| swsh1 | 159 | Crushing Hammer | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh1 | 169 | Marnie | blocked_conflicting_finish_evidence | {"cosmos":1,"normal":1} | cosmos, normal |
| swsh1 | 170 | Metal Saucer | blocked_conflicting_finish_evidence | {"cosmos":1,"normal":1} | cosmos, normal |
| swsh1 | 171 | Ordinary Rod | blocked_conflicting_finish_evidence | {"cosmos":1,"normal":1} | cosmos, normal |
| swsh1 | 180 | Rare Candy | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh1 | 186 | Aurora Energy | blocked_conflicting_finish_evidence | {"cosmos":1,"normal":1} | cosmos, normal |
| swsh2 | 109 | Falinks | blocked_second_independent_source_needed | {"cosmos":1} | normal |
| swsh2 | 165 | Scoop Up Net | blocked_conflicting_finish_evidence | {"cosmos":1,"normal":1} | cosmos, normal |
| swsh2 | 171 | Capture Energy | blocked_conflicting_finish_evidence | {"cosmos":1,"normal":1} | cosmos, normal |
| swsh2 | 174 | Twin Energy | blocked_conflicting_finish_evidence | {"cosmos":1,"normal":1} | cosmos, normal |
| swsh3 | 159 | Bird Keeper | blocked_second_independent_source_needed | {"cosmos":1} | normal |
| swsh3 | 160 | Cape of Toughness | blocked_second_independent_source_needed | {"cosmos":1} | normal |
| swsh4 | 157 | Nessa | blocked_second_independent_source_needed | {"cosmos":1} | normal |
| swsh5 | 37 | Octillery | blocked_conflicting_finish_evidence | {"normal":2,"cosmos":1} | cosmos, normal |
| swsh5 | 96 | Houndoom | blocked_conflicting_finish_evidence | {"normal":2,"cosmos":1} | cosmos, normal |
| swsh5 | 123 | Cheryl | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh5 | 125 | Escape Rope | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh5 | 129 | Level Ball | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh5 | 140 | Rapid Strike Energy | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh5 | 141 | Single Strike Energy | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh6 | 70 | Malamar | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh6 | 140 | Fog Crystal | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |
| swsh6 | 148 | Path to the Peak | blocked_conflicting_finish_evidence | {"cosmos":2,"normal":2} | cosmos, normal |

## Guardrail

This report does not authorize inserts. Useful rows may only move to a separate guarded dry-run package if the official PDF evidence and prior independent source evidence agree on the exact active finish.
