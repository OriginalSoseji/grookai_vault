# Stamped/Special Current Unresolved Work Plan V1

Generated: 2026-06-22T17:15:08.674Z

This report starts from the corrected live residual queue, removes current no-write governance rows, and describes the remaining unresolved stamped/special work.

It is audit-only. It performs no DB writes, migrations, apply, cleanup, quarantine, inserts, updates, or deletes.

## Summary

| metric | value |
| --- | --- |
| queue_rows | 277 |
| no_write_closed_rows | 91 |
| unresolved_rows | 186 |
| source_acquisition_rows | 171 |
| dependency_governance_rows | 15 |
| write_ready_now | 0 |
| fingerprint | `065c815a62bcc5ec94afa2225507e51d18d05b64a08109ea5916e0d59d42e97d` |

## Lane Plan

| priority | lane | rows | group | write ready? | next action |
| --- | --- | --- | --- | --- | --- |
| 1 | league_exact_finish_source | 56 | source_acquisition | false | Find exact set + number + name + League Stamp + active finish evidence. Do not infer reverse from crosshatch wording. |
| 2 | prize_pack_finish_mapping | 35 | source_acquisition | false | Resolve Normal/Foil ambiguity with exact independent product/checklist evidence. Official PDFs alone are not enough when both finishes appear. |
| 3 | small_custom_stamp_exact_finish | 31 | source_acquisition | false | Target event/product pages or stable listings that prove exact custom stamp and active finish. |
| 4 | event_staff_exact_finish | 19 | source_acquisition | false | Acquire event/staff-specific evidence that names the stamp label and active finish for the exact card. |
| 5 | prerelease_exact_finish | 10 | source_acquisition | false | Find exact prerelease or staff-prerelease finish proof; do not rely on set-era assumptions. |
| 6 | professor_program_exact_finish | 10 | source_acquisition | false | Find exact Professor Program stamp and finish evidence; resolve deck/product stamp taxonomy separately. |
| 7 | second_source_needed | 10 | source_acquisition | false | Add one independent corroborating source for exact set + number + name + variant/stamp + finish. |
| 8 | base_parent_dependency | 9 | dependency_governance | false | Resolve base parent/base finish dependency before modeling the variant parent. |
| 9 | halloween_base_or_finish_resolution | 6 | dependency_governance | false | Separate Trick or Trade display/product metadata from true stamped physical identity and exact active finish. |

## Bucket Counts

| bucket | rows |
| --- | --- |
| league_finish_exact_source | 56 |
| prize_pack_second_source | 35 |
| small_custom_stamp_exact_source | 31 |
| event_staff_exact_source | 19 |
| prerelease_exact_finish_source | 10 |
| professor_program_exact_finish_source | 10 |
| second_source_needed | 10 |
| base_parent_blocked_no_write | 9 |
| halloween_base_parent_or_finish_resolution | 6 |

## Top Sets

| set | rows |
| --- | --- |
| swsh1 | 11 |
| swshp | 11 |
| swsh5 | 8 |
| sv10 | 7 |
| swsh3 | 7 |
| wp | 7 |
| bw5 | 5 |
| swsh11 | 5 |
| swsh2 | 5 |
| bw1 | 4 |
| dp1 | 4 |
| sm8 | 4 |
| swsh9 | 4 |
| bw3 | 3 |
| bw9 | 3 |
| bwp | 3 |
| ex9 | 3 |
| sm3 | 3 |
| sm7 | 3 |
| svp | 3 |

## Boundary

- No current unresolved row is write-ready.
- No source-exhausted row should be promoted by inference.
- No generic stamped label should become canonical truth without exact named stamp evidence.
- No display/deck/product metadata row should become a child printing without a distinct physical identity source.
