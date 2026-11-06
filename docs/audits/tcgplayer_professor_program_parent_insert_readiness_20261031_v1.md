# TCGPlayer Professor Program Parent Insert Readiness V1

Read-only production readiness audit for the eight Professor Program products that have exact set, card, finish, and stamped-identity evidence but no distinct live Professor Program parent.

## Safety

- audit_only: true
- db_reads_performed: true
- db_writes_performed: false
- pricing_writes_performed: false
- mapping_writes_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| target_rows | 8 |
| ready_for_guarded_dry_run_parent_child_insert | 3 |
| blocked_before_guarded_dry_run | 5 |
| expected_parent_inserts | 3 |
| expected_identity_inserts | 3 |
| expected_child_inserts | 3 |
| expected_deletes | 0 |
| expected_merges | 0 |
| package_fingerprint_sha256 | 126b5c9000fbc58b0f4ea9a7254e632a710becf066d2060710abddca50b303d0 |

## Targets

| product | set | number | card | finish | base parent | selection authority | matching base rows | status | blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 176629 | ex6 | 98 | Prof. Oak's Research | normal | 453468cf-a458-4ff6-acde-6103b234bf87 | bulbapedia_additional_cards_exact_base_reference | 1 | ready_for_guarded_dry_run_parent_child_insert |  |
| 176630 | ex9 | 82 | Professor Birch | holo | a3ae0ede-d02f-4bbd-b148-a1de0aa268fb | bulbapedia_additional_cards_exact_base_reference | 1 | blocked_before_guarded_dry_run | professor_program_parent_already_exists, identity_hash_collision |
| 176631 | dp3 | 122 | Professor Oak's Visit | normal | 20353cdf-bdef-4e82-acac-49cf30ee22b5 | bulbapedia_additional_cards_exact_base_reference | 1 | ready_for_guarded_dry_run_parent_child_insert |  |
| 176632 | bw5 | 98 | Professor Juniper | reverse | e2dadea2-f1a8-4cac-9496-31e8adfa5908 | bulbapedia_additional_cards_exact_base_reference | 1 | blocked_before_guarded_dry_run | professor_program_parent_already_exists, identity_hash_collision |
| 176633 | bw1 | 101 | Professor Juniper | reverse | 98f0a49e-37ac-4e45-9813-f1ce4ff2dc45 | bulbapedia_additional_cards_exact_base_reference | 1 | blocked_before_guarded_dry_run | professor_program_parent_already_exists, identity_hash_collision |
| 176638 | xy1 | 122 | Professor Sycamore | reverse | 4cec1b2e-358c-4e24-a295-efb955acc303 | bulbapedia_additional_cards_exact_base_reference | 1 | blocked_before_guarded_dry_run | professor_program_parent_already_exists, identity_hash_collision |
| 213516 | sm6 | 108 | Judge | reverse | a51c9d34-02ab-48d5-932f-ca2e78b81bd0 | bulbapedia_additional_cards_exact_base_reference | 1 | blocked_before_guarded_dry_run | professor_program_parent_already_exists, identity_hash_collision |
| 499366 | swsh4.5 | 59 | Gym Trainer | reverse | d04a6b76-26f1-4a33-99ae-6920f7a501da | unique_live_exact_finish_parent_from_review | 1 | ready_for_guarded_dry_run_parent_child_insert |  |

## Next Boundary

If every row is ready, the next artifact is a rollback-only guarded dry run for TCGPLAYER-PROFESSOR-PROGRAM-PARENT-INSERTS-V1. It may simulate exactly eight parent inserts, eight active identity inserts, and eight child printing inserts. It must not write mappings or prices, mutate ordinary parents, delete, merge, quarantine, or create migrations.
