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
| total_rows | 567 |
| acquisition_or_adjudication_rows | 266 |
| source_needed_rows | 262 |
| no_write_or_governance_rows | 301 |
| manual_conflict_rows | 1 |
| conflict_resolved_future_dry_run_candidates | 3 |
| conflict_resolved_future_dry_run_candidate_identities | 2 |
| write_ready_now | 0 |
| fingerprint_sha256 | `c43cfaf7c13c030eeb0d3c1524e88433f02cb856f19346836f84e600c6a68f32` |

## Recommended Order

| order | action_bucket | count | recommended_action |
| --- | --- | --- | --- |
| 1 | conflict_resolved_future_dry_run_candidate | 3 | Build a separate guarded dry-run package using adjudicated finish cosmos. No real apply without approval. |
| 2 | manual_conflict_still_blocked | 1 | Do not prepare a write package. Sources disagree or use broad Crosshatch/Holo wording, and some comparable sources are State/Province rather than exact Regional staff. |
| 3 | prize_pack_second_source | 51 | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| 4 | league_finish_exact_source | 91 | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| 5 | event_staff_exact_source | 35 | Target event/staff stamped sources with exact stamp label and active finish. |
| 6 | prerelease_exact_finish_source | 12 | Target prerelease pages/products that prove exact stamped card and active finish. |
| 7 | professor_program_exact_finish_source | 12 | Target Professor Program checklist/product sources that prove exact active finish. |
| 8 | halloween_base_parent_or_finish_resolution | 6 | Resolve missing base parent/target child finish before using Halloween product evidence. |
| 9 | small_custom_stamp_exact_source | 37 | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| 10 | second_source_needed | 18 | Find one more independent exact source for rows already supported by a single source. |

## Action Buckets

| priority | action_bucket | count | write_ready_now | recommended_action |
| --- | --- | --- | --- | --- |
| 1 | conflict_resolved_future_dry_run_candidate | 3 | 0 | Build a separate guarded dry-run package using adjudicated finish cosmos. No real apply without approval. |
| 1 | manual_conflict_still_blocked | 1 | 0 | Do not prepare a write package. Sources disagree or use broad Crosshatch/Holo wording, and some comparable sources are State/Province rather than exact Regional staff. |
| 2 | prize_pack_second_source | 51 | 0 | Acquire a second independent exact Prize Pack finish source; existing PriceCharting rows remain review-only. |
| 3 | league_finish_exact_source | 91 | 0 | Target league/crosshatch exact checklist sources for set + number + card + reverse/active finish. |
| 4 | event_staff_exact_source | 35 | 0 | Target event/staff stamped sources with exact stamp label and active finish. |
| 5 | prerelease_exact_finish_source | 12 | 0 | Target prerelease pages/products that prove exact stamped card and active finish. |
| 6 | professor_program_exact_finish_source | 12 | 0 | Target Professor Program checklist/product sources that prove exact active finish. |
| 7 | halloween_base_parent_or_finish_resolution | 6 | 0 | Resolve missing base parent/target child finish before using Halloween product evidence. |
| 8 | small_custom_stamp_exact_source | 37 | 0 | Acquire exact source for the specific small stamp/variant family; do not generalize from stamped text. |
| 9 | second_source_needed | 18 | 0 | Find one more independent exact source for rows already supported by a single source. |
| 90 | closed_stale_no_write | 50 | 0 | Already closed or stale relative to current canonical rows; keep out of write planning. |
| 91 | base_parent_blocked_no_write | 9 | 0 | Base parent cannot be resolved safely; keep no-write until parent identity is governed. |
| 92 | display_metadata_no_write | 62 | 0 | Battle Academy marks are display metadata strategy, not printing inserts. |
| 93 | generic_stamped_suppressed_no_write | 180 | 0 | Generic stamped claims remain suppressed unless exact stamp label is discovered. |

## Top Remaining Variant Families

| variant_family | rows |
| --- | --- |
| generic_or_unknown | 199 |
| league | 92 |
| battle_academy | 67 |
| prize_pack | 63 |
| championship_or_staff | 53 |
| small_custom_stamp | 36 |
| professor_program | 20 |
| prerelease | 16 |
| halloween | 9 |
| wotc_legacy_stamp | 7 |
| player_rewards_crosshatch | 5 |

## Guardrail

This report does not authorize writes. Rows require exact source evidence for set, card number, card name, stamp/variant, finish when applicable, and source URL before any guarded dry-run package can be prepared.
