# English Master Index Host/Subset Duplicate Suppression V1

Read-only governance artifact for Master Index rows that are valid source evidence but should not create duplicate DB reconciliation obligations under a host set.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- suppressed_host_duplicate_rows: 390
- blocked_unmatched_host_rows: 0
- fingerprint: 83bda1ded8a309f1bdb2c9b9d99e9775a614065f891a93fb3fcb75b55c5125fd

| rule | rows |
| --- | --- |
| swsh4_5_shiny_vault_host_duplicate | 122 |
| swsh12_5_galarian_gallery_host_duplicate | 70 |
| swsh10_trainer_gallery_host_duplicate | 30 |
| swsh11_trainer_gallery_host_duplicate | 30 |
| swsh12_trainer_gallery_host_duplicate | 30 |
| swsh9_trainer_gallery_host_duplicate | 30 |
| ex10_unown_collection_host_duplicate | 28 |
| cel25_classic_collection_host_duplicate | 25 |
| swsh4_5_shiny_vault_host_duplicate_finish_conflict | 25 |

| host_set | rows |
| --- | --- |
| swsh4.5 | 147 |
| swsh12.5 | 70 |
| swsh10 | 30 |
| swsh11 | 30 |
| swsh12 | 30 |
| swsh9 | 30 |
| ex10 | 28 |
| cel25 | 25 |

## Sample Rows

| host_set | subset_set | number | name | finish | rule |
| --- | --- | --- | --- | --- | --- |
| cel25 | cel25c | 2 | Blastoise | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 4 | Charizard | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 8 | Dark Gyarados | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 9 | Team Magma's Groudon | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 15 | Venusaur | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 15 | Here Comes Team Rocket! | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 15 | Rocket's Zapdos | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 15 | Claydol | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 17 | Umbreon ☆ | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 20 | Cleffa | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 24 | _____'s Pikachu | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 54 | Mewtwo-EX | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 60 | Tapu Lele-GX | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 66 | Shining Magikarp | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 73 | Imposter Professor Oak | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 76 | M Rayquaza-EX | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 86 | Rocket's Admin. | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 88 | Mew ex | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 93 | Gardevoir ex δ | holo | cel25_classic_collection_host_duplicate |
| cel25 | cel25c | 97 | Xerneas-EX | holo | cel25_classic_collection_host_duplicate |

## Governance

- Suppression is reconciliation-only.
- Source evidence remains preserved in the Master Index.
- Suppressed host duplicates are not deletion candidates.
- Suppression requires a matching subset Master Index row with the same card number, card name, and finish.
- For explicitly governed host/subset families, host finish conflicts may also be suppressed when the subset has the same card number and name under a different finish. Those rows remain source evidence and require manual source governance before any DB write.
