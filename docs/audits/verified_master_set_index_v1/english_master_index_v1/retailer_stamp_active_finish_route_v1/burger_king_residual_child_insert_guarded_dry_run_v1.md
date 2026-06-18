# Burger King Residual Child Insert Guarded Dry Run V1

Rollback-only dry-run for residual Burger King Platinum-stamped parents that exist without a child printing.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- target_child_inserts: 5
- by_set: {"dp5":4,"dp6":1}
- by_finish: {"reverse":5}

| set | number | name | finish | parent_id | child_id |
| --- | --- | --- | --- | --- | --- |
| dp5 | 56 | Chimchar | reverse | 006b48c2-45af-486e-9059-ebf0c2a4f329 | 7b63ea82-e888-47be-9d23-96810c96e544 |
| dp5 | 62 | Eevee | reverse | 5d43f0d8-0fb3-4a0d-bcef-999fd40e67af | 6d4b7093-9427-4581-951d-d3204a5e60f7 |
| dp5 | 70 | Pikachu | reverse | 41c3c346-edf5-4306-9dd9-992823418994 | 210886b2-8058-465d-bf87-3fe1d93b3047 |
| dp5 | 77 | Turtwig | reverse | d47a7931-82b8-42ba-a6dc-4137642c2f78 | 82a0c5ab-c4e7-440b-9cee-320499342139 |
| dp6 | 106 | Meowth | reverse | ca2d8167-7a79-4069-b112-9268e2da6ac0 | 393c4b88-002f-4cc8-b43b-82edd2d871af |

## Result

- dry_run_status: burger_king_residual_child_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `34439459b7b56f6ad5f0cee5603b80b886106864187a5f840dcceff76f76bdf1`
- dry_run_proof_sha256: `d2fd572e023926f3e4c00c4b6d8fbc5ff8c7052915311a5ed2dad89c6011104b`
- stop_findings: 0

## Approval Text

```text
Approve real RETAILER-STAMP-06-BURGER-KING-RESIDUAL-CHILD-INSERTS apply only. Fingerprint: 34439459b7b56f6ad5f0cee5603b80b886106864187a5f840dcceff76f76bdf1. Scope: 5 child-only card_printing inserts for residual Burger King Platinum-stamped parents; finish reverse=5; sets dp5=4, dp6=1. Dry-run proof: 28cb6571e6076829efae74690499668bf609f4c987d216355d55a386b6c7cda5 == 28cb6571e6076829efae74690499668bf609f4c987d216355d55a386b6c7cda5. No parent writes. No identity writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
