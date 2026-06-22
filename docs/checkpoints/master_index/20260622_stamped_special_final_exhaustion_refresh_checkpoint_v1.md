# Stamped/Special Final Exhaustion Refresh Checkpoint V1

Date: 2026-06-22

## Purpose

Refresh the stamped/special final exhaustion rollup after current live residual, league, Prize Pack, small-custom, event/staff, prerelease, professor, and second-source passes.

This is an audit-only closeout checkpoint for the overnight source acquisition cycle.

## Outputs

- Final exhaustion JSON: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_final_evidence_exhaustion_v1.json`
- Final exhaustion Markdown: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_final_evidence_exhaustion_v1.md`
- Blocker handoff JSON: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.json`
- Blocker handoff Markdown: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_residual_blocker_handoff_v1.md`

## Summary

| Metric | Value |
| --- | ---: |
| open_rows_classified | 277 |
| write_ready_now | 0 |
| evidence_blocked | 171 |
| no_write_governance | 91 |
| dependency_blocked | 15 |
| manual_adjudication | 0 |
| final_exhaustion_fingerprint | `94a349c866ddbe28fb4e22d84735b888ef752885aea553f5e9ae1eaf483fdf7b` |

## Final Status Buckets

| Status | Rows |
| --- | ---: |
| display_metadata_only_no_printing_write | 57 |
| multi_source_variant_found_finish_unresolved | 51 |
| source_exhausted_prize_pack_finish_mapping_blocked | 35 |
| variant_found_finish_unresolved | 33 |
| closed_stale_no_write | 19 |
| source_exhausted_league_exact_finish_needed | 19 |
| generic_stamp_suppressed_no_write | 15 |
| source_exhausted_custom_stamp_exact_finish_needed | 11 |
| base_parent_or_base_finish_blocked | 9 |
| source_exhausted_prerelease_exact_finish_needed | 9 |
| source_exhausted_event_staff_exact_finish_needed | 7 |
| source_exhausted_halloween_base_parent_or_finish_blocked | 6 |
| source_exhausted_professor_program_exact_finish_needed | 6 |
| source_exhausted_second_source_still_needed | 3 |

## Meaning

The remaining stamped/special queue is not currently a write queue.

It is now mostly:

- rows where the variant/stamp exists but exact active finish is not proven,
- rows that should be handled as display/product metadata instead of canonical printings,
- rows blocked by base-parent or dependency modeling,
- stale/no-write rows.

Update: the 3 Dragon Vault Regional Championships rows were removed from the open residual queue after live residual matching was made aware of the governed `regional_championships_stamp` variant. Those rows are live-satisfied and are no longer manual adjudication blockers.

## Safety

- db_writes_performed: `false`
- migrations_created: `false`
- apply_performed: `false`
- cleanup_performed: `false`
- quarantine_performed: `false`
- write_ready_now: `0`

Next step: either begin manual adjudication/governance for unresolved finish rules, or pause stamped/special DB work because no current residual row is safe to write.
