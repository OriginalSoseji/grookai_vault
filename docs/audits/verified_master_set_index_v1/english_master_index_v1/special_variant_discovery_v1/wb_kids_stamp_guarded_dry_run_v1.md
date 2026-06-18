# WB Kids Promo Stamp Guarded Dry Run V1

Rollback-only dry-run for source-ready WB Kids first-movie stamped promo lanes.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 9
- identity_inserts: 9
- child_inserts: 9
- deletes: 0
- merges: 0

## Targets

| set | number | name | variant | modifier | finish | base_parent_id |
| --- | --- | --- | --- | --- | --- | --- |
| basep | 2 | Electabuzz | inverted_wb_kids_stamp | recognized_error:inverted_wb_kids_stamp | normal | 3e106aae-c583-4893-9069-3f158b27bd22 |
| basep | 2 | Electabuzz | wb_kids_stamp | stamp:wb_kids_first_movie | normal | 3e106aae-c583-4893-9069-3f158b27bd22 |
| basep | 3 | Mewtwo | inverted_wb_kids_stamp | recognized_error:inverted_wb_kids_stamp | normal | 676b6e46-9457-4945-9c5a-4efadb7cef58 |
| basep | 3 | Mewtwo | wb_kids_stamp | stamp:wb_kids_first_movie | normal | 676b6e46-9457-4945-9c5a-4efadb7cef58 |
| basep | 4 | Pikachu | inverted_wb_kids_stamp | recognized_error:inverted_wb_kids_stamp | normal | 21a0ed1b-d86e-48f1-8dc6-adb17391bcc9 |
| basep | 4 | Pikachu | missing_wb_kids_stamp | recognized_error:missing_wb_kids_stamp | normal | 21a0ed1b-d86e-48f1-8dc6-adb17391bcc9 |
| basep | 4 | Pikachu | wb_kids_stamp | stamp:wb_kids_first_movie | normal | 21a0ed1b-d86e-48f1-8dc6-adb17391bcc9 |
| basep | 5 | Dragonite | inverted_wb_kids_stamp | recognized_error:inverted_wb_kids_stamp | normal | eb57fdeb-8bce-4ba1-b981-9da7b88d33b5 |
| basep | 5 | Dragonite | wb_kids_stamp | stamp:wb_kids_first_movie | normal | eb57fdeb-8bce-4ba1-b981-9da7b88d33b5 |

## Result

- dry_run_status: wb_kids_stamp_parent_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `d6793a662528ecd9fc7a2bec19244da24da7a06df8a820b4c35c50c1d56102fc`
- sql_hash_sha256: `cf6539d044a889f51db702da396cbdb813a9b7c9251c44a06b378b52b725752c`
- dry_run_proof_sha256: `1ea619a0eed2b267ab92ad780d270cbab5eaf2d6811a99f2cf13a06db7f9f17e`
- stop_findings: 0

## Approval Text

```text
Approve real SPECIAL-VAR-02-WB-KIDS-PROMO-STAMP-PARENT-INSERTS apply only. Fingerprint: d6793a662528ecd9fc7a2bec19244da24da7a06df8a820b4c35c50c1d56102fc. SQL hash: cf6539d044a889f51db702da396cbdb813a9b7c9251c44a06b378b52b725752c. Scope: 9 WB Kids promo special-case parent inserts, 9 active identity inserts, 9 normal child printing inserts; set basep/Wizards Black Star Promos; variants wb_kids_stamp=4, inverted_wb_kids_stamp=4, missing_wb_kids_stamp=1. Dry-run proof: 3334b32c58f50feb80baf86239009e387d56ee8634c52de235500ba17d3fe20c == 3334b32c58f50feb80baf86239009e387d56ee8634c52de235500ba17d3fe20c. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
