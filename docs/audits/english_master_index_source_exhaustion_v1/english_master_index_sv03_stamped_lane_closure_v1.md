# English Master Index SV03 Stamped Lane Closure V1

Generated: 2026-06-20T04:59:00.897Z

This closes the SV03 Play Pokemon stamped lane after the approved identity backfill and child-finish insert packages. This report performs no database writes; it only consolidates existing apply artifacts and the current post-apply collision audit.

## Summary

| metric | value |
| --- | --- |
| target_rows | 3 |
| closed_rows | 3 |
| open_rows | 0 |
| missing_target_child_finish | 0 |
| forbidden_stamped_child_finishes | 0 |
| identity_rows_backfilled | 3 |
| child_rows_inserted | 3 |
| write_ready_now | 0 |
| fingerprint_sha256 | `5749b6a9c8290c0ccfafb97cc4822a9e02067e216f6e5f8ff59051fedbe4c10f` |

## Safety

| check | value |
| --- | --- |
| audit_only | true |
| db_writes_performed_by_this_report | false |
| durable_db_writes_performed_by_this_report | false |
| prior_approved_apply_artifacts_consolidated | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| global_apply_performed | false |
| write_ready_now | 0 |

## Packages Consolidated

| package | status | fingerprint | writes | stop_findings |
| --- | --- | --- | --- | --- |
| SV03-EXISTING-STAMPED-PARENT-IDENTITY-BACKFILL | sv03_existing_stamped_parent_identity_backfill_real_apply_committed | `0481ed86bac219a6b2f8c150610c8bce59d8f4352b950874119f911148c7ab8f` | {"parent_rows_updated":3,"identity_rows_inserted":3,"child_rows_inserted":0,"delete_rows":0,"merge_rows":0} | 0 |
| SV03-TOWN-STORE-STAMPED-CHILD-INSERT | sv03_town_store_stamped_child_insert_real_apply_committed | `c28c54f0d0c73da9c7beb6f52a28b19a5e091d1e8e359ebce9e8bdaae32f006d` | {"child_rows_inserted":1,"parent_rows_written":0,"identity_rows_written":0,"delete_rows":0,"merge_rows":0} | 0 |
| SV03-PLAY-POKEMON-EX-HOLO-CHILD-INSERT | sv03_play_pokemon_ex_holo_child_insert_real_apply_committed | `b33838c9f31d9b693bf8be33940c814cfe31fb78335dd87b18ec67864b8a13db` | {"child_rows_inserted":2,"parent_rows_written":0,"identity_rows_written":0,"delete_rows":0,"merge_rows":0} | 0 |

## Rows

| number | card | variant | finish | closure_status | closure_reason | historical_blockers |
| --- | --- | --- | --- | --- | --- | --- |
| 196 | Town Store | play_pokemon_stamp | cosmos | closed_verified_in_db | multi_lane_source_backed_target_finish_already_satisfied | none |
| 22 | Toedscruel ex | play_pokemon_stamp | holo | closed_verified_in_db | accepted_exact_holo_play_pokemon_stamp_ready_for_child_insert_dry_run | product_family_only_requires_manual_adjudication_before_child_action |
| 66 | Tyranitar ex | play_pokemon_stamp | holo | closed_verified_in_db | accepted_exact_holo_play_pokemon_stamp_ready_for_child_insert_dry_run | product_family_only_requires_manual_adjudication_before_child_action |

## Interpretation

The older collision audit still carries historical blocker labels for product-family-only evidence. Those blockers are no longer actionable for Toedscruel ex and Tyranitar ex because the source adjudication report captured exact independent holo evidence before the approved child inserts. Current DB state shows all three target stamped parents have active identity rows and the required active child finish, with no child `finish_key=stamped`.
