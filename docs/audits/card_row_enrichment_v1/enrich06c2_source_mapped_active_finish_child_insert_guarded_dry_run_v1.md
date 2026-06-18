# ENRICH-06C Source-Mapped Child Printing Insert Guarded Dry Run V1

Package: `ENRICH-06C2-SOURCE-MAPPED-ACTIVE-FINISH-CHILD-PRINTING-INSERT`

## Result

- Pass: true
- Target parent rows: 10
- Target child inserts: 13
- Dry-run status: completed_rolled_back_no_durable_change
- Inserted inside transaction: 13
- Before hash: `26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43`
- After rollback hash: `26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43`
- Package fingerprint: `6e32357534841a49f65bfd3f10e23f04cd982a6795b5c2e47b2fd50829bec8e7`

## Guard

| metric | value |
| --- | --- |
| target_printing_count | 13 |
| target_parent_count | 10 |
| distinct_target_printing_count | 13 |
| missing_parent_count | 0 |
| inactive_finish_key_count | 0 |
| existing_child_finish_count | 0 |
| existing_child_any_count | 0 |
| missing_active_mapping_parent_count | 0 |

## By Finish

| finish | rows |
| --- | --- |
| holo | 7 |
| normal | 3 |
| reverse | 3 |

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-06C2-SOURCE-MAPPED-ACTIVE-FINISH-CHILD-PRINTING-INSERT apply only. Fingerprint: 6e32357534841a49f65bfd3f10e23f04cd982a6795b5c2e47b2fd50829bec8e7. Scope: 13 child card_printing inserts across 10 source-mapped childless parents using Master Index finish keys. Finishes: holo=7, normal=3, reverse=3. Dry-run proof: 26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43 == 26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43. No parent writes. No identity writes. No mapping writes. No deletes. No merges. No migrations. No image writes. No global apply.`
