# PKG-17I4 PriceCharting Stamp Label Readiness V1

Read-only readiness check for PriceCharting stamp-label candidates.

## Safety

- audit_only: true
- db_reads_performed: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

- candidate_source_rows: 42
- future_guarded_parent_identity_insert_candidates: 0
- label_candidate_only_active_finish_required: 39
- blocked_or_review_rows: 42
- fingerprint_sha256: `3bc3ff05940b3933b21c82a2b1bdaff252e4cc08ca5756d0c28c2f003b21a02a`

## Readiness Status

| status | rows |
| --- | --- |
| label_candidate_only_active_finish_required | 39 |
| blocked_base_parent_resolution_required | 3 |

## Blockers

| blocker | rows |
| --- | --- |
| active_finish_required | 39 |
| base_parent_missing | 3 |
| base_parent_missing_target_child_finish | 3 |
| identity_projection_unavailable | 3 |

## Future Candidate Rows

No future guarded parent identity insert candidates were found.

## Blocked/Review Rows

| set | number | card | stamp label | finish | status | blockers |
| --- | --- | --- | --- | --- | --- | --- |
| bog | 4 | Rocket's Scizor | Winner Stamp | normal | blocked_base_parent_resolution_required | base_parent_missing, base_parent_missing_target_child_finish, identity_projection_unavailable |
| bog | 5 | Rocket's Sneasel | Winner Stamp | normal | blocked_base_parent_resolution_required | base_parent_missing, base_parent_missing_target_child_finish, identity_projection_unavailable |
| bw10 | 14 | Squirtle | Build-A-Bear Workshop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| bw11 | 17 | Charmander | Build-A-Bear Workshop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| bw5 | 1 | Bulbasaur | Build-A-Bear Workshop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| bw5 | 60 | Umbreon | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| bwp | BW53 | Flygon | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| dp6 | 43 | Uxie | League Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| g1 | 22 | Magikarp | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| g1 | 26 | Pikachu | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| g1 | 32 | Slowpoke | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| g1 | 50 | Clefairy | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| g1 | 53 | Meowth | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| g1 | 8 | Tangela | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| pl1 | 91 | Riolu | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sm1 | 26 | Incineroar | League Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sm1 | 28 | Psyduck | Build-A-Bear Workshop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sm1 | 64 | Cosmog | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sm3 | 110 | Stufful | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sm4 | 71 | Jigglypuff | Build-A-Bear Workshop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sm4 | 84 | Regigigas | League Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv02 | 105 | Tinkaton | GameStop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv02 | 60 | Baxcalibur | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv05 | 121 | Miraidon | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv05 | 81 | Iron Crown ex | Prize Pack Stamp | holo | blocked_base_parent_resolution_required | base_parent_missing, base_parent_missing_target_child_finish, identity_projection_unavailable |
| sv07 | 119 | Bouffalant | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv09 | 116 | N's Reshiram | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv09 | 150 | Levincia | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv09 | 27 | N's Darmanitan | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv09 | 55 | Iono's Kilowattrel | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv09 | 67 | Lillie's Ribombee | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| sv10 | 20 | Team Rocket's Spidops | Prize Pack Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| svp | 153 | Magneton | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| svp | 91 | Koraidon | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| svp | 92 | Miraidon | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| swsh8 | 237 | Quick Ball | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| xy12 | 41 | Electabuzz | Toys R Us Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| xy2 | 80 | Snorlax | Build-A-Bear Workshop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| xy5 | 20 | Vulpix | Build-A-Bear Workshop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| xy6 | 67 | Meowth | Build-A-Bear Workshop Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| xyp | XY176 | Champions Festival | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |
| xyp | XY91 | Champions Festival | Staff Stamp |  | label_candidate_only_active_finish_required | active_finish_required |

## Rule

This report does not authorize a write. Candidate rows still require a separate rollback-only guarded dry-run artifact, fingerprint, post-apply verification plan, and explicit approval before any DB mutation.
