# Stamped/Special Next Action Queue V1

Audit-only next-action consolidation for the remaining stamped/special queue.

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
| total_rows | 277 |
| acquisition_or_adjudication_rows | 177 |
| source_needed_rows | 177 |
| no_write_or_governance_rows | 100 |
| manual_conflict_rows | 0 |
| conflict_resolved_future_dry_run_candidates | 0 |
| conflict_resolved_future_dry_run_candidate_identities | 0 |
| regional_championship_future_dry_run_candidates | 0 |
| write_ready_now | 0 |
| fingerprint_sha256 | `31433cdd2823c0a49c3445fc70fd08bba2ce1bd1b9b0ecf9c25a8f78ee8672ad` |

## Recommended Order

| order | action_bucket | count | recommended_action |
| --- | --- | --- | --- |
| 1 | prize_pack_second_source | 35 | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| 2 | league_finish_exact_source | 56 | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| 3 | event_staff_exact_source | 19 | Target event/staff stamped sources with exact stamp label and active finish. |
| 4 | prerelease_exact_finish_source | 10 | Target prerelease pages/products that prove exact stamped card and active finish. |
| 5 | professor_program_exact_finish_source | 10 | Target Professor Program checklist/product sources that prove exact active finish. |
| 6 | halloween_base_parent_or_finish_resolution | 6 | Resolve missing base parent/target child finish before using Halloween product evidence. |
| 7 | small_custom_stamp_exact_source | 31 | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| 8 | second_source_needed | 10 | Find one more independent exact source for rows already supported by a single source. |

## Action Buckets

| priority | action_bucket | count | write_ready_now | recommended_action |
| --- | --- | --- | --- | --- |
| 2 | prize_pack_second_source | 35 | 0 | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| 3 | league_finish_exact_source | 56 | 0 | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| 4 | event_staff_exact_source | 19 | 0 | Target event/staff stamped sources with exact stamp label and active finish. |
| 5 | prerelease_exact_finish_source | 10 | 0 | Target prerelease pages/products that prove exact stamped card and active finish. |
| 6 | professor_program_exact_finish_source | 10 | 0 | Target Professor Program checklist/product sources that prove exact active finish. |
| 7 | halloween_base_parent_or_finish_resolution | 6 | 0 | Resolve missing base parent/target child finish before using Halloween product evidence. |
| 8 | small_custom_stamp_exact_source | 31 | 0 | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| 9 | second_source_needed | 10 | 0 | Find one more independent exact source for rows already supported by a single source. |
| 90 | closed_stale_no_write | 19 | 0 | Already closed or stale relative to current canonical rows; keep out of write planning. |
| 91 | base_parent_blocked_no_write | 9 | 0 | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| 92 | display_metadata_no_write | 57 | 0 | Battle Academy marks are display metadata strategy, not printing inserts. |
| 93 | generic_stamped_suppressed_no_write | 15 | 0 | Generic stamped claims remain suppressed unless exact stamp label is discovered. |

## Top Remaining Variant Families

| variant_family | rows |
| --- | --- |
| battle_academy | 62 |
| league | 57 |
| prize_pack | 40 |
| small_custom_stamp | 27 |
| championship_or_staff | 26 |
| generic_or_unknown | 23 |
| professor_program | 17 |
| prerelease | 11 |
| halloween | 9 |
| player_rewards_crosshatch | 5 |

## Guardrail

This report does not authorize writes. Rows require exact source evidence for set, card number, card name, stamp/variant, finish when applicable, and source URL before any guarded dry-run package can be prepared.
