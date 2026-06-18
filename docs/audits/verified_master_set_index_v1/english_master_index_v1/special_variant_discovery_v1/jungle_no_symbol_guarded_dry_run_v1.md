# Jungle No Symbol Guarded Dry Run V1

Rollback-only dry-run for source-ready Jungle No Symbol holo recognized error parent lanes.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 16
- identity_inserts: 16
- child_inserts: 16
- deletes: 0
- merges: 0

## Targets

| set | number | name | variant | modifier | finish | base_parent_id |
| --- | --- | --- | --- | --- | --- | --- |
| base2 | 1 | Clefable | no_symbol_error | recognized_error:no_jungle_symbol | holo | 463f3a84-42a5-4d8f-85c8-7fc1aa14ec36 |
| base2 | 2 | Electrode | no_symbol_error | recognized_error:no_jungle_symbol | holo | 8eb4813c-0b90-4764-8709-16aa9d5a0d9e |
| base2 | 3 | Flareon | no_symbol_error | recognized_error:no_jungle_symbol | holo | a89425a0-6abc-4c95-872f-6a433087939f |
| base2 | 4 | Jolteon | no_symbol_error | recognized_error:no_jungle_symbol | holo | 44867e4d-aa59-4fef-a33c-4ede1be99495 |
| base2 | 5 | Kangaskhan | no_symbol_error | recognized_error:no_jungle_symbol | holo | 43c6f019-7fc4-4f5f-93e2-7f28ee798180 |
| base2 | 6 | Mr. Mime | no_symbol_error | recognized_error:no_jungle_symbol | holo | b35e8af0-bec3-4bb7-bbaf-d623553e4474 |
| base2 | 7 | Nidoqueen | no_symbol_error | recognized_error:no_jungle_symbol | holo | 8148c1b4-3104-4a36-962f-cab78bb67a89 |
| base2 | 8 | Pidgeot | no_symbol_error | recognized_error:no_jungle_symbol | holo | bb7ceaa7-dd12-45f1-848f-5091c83ee0f0 |
| base2 | 9 | Pinsir | no_symbol_error | recognized_error:no_jungle_symbol | holo | 49fa39dd-d4ff-41a7-80dc-03db65aeb4a7 |
| base2 | 10 | Scyther | no_symbol_error | recognized_error:no_jungle_symbol | holo | 77dcdb70-4912-4574-b790-17e613cecb98 |
| base2 | 11 | Snorlax | no_symbol_error | recognized_error:no_jungle_symbol | holo | 8b3cc33b-bb52-4b52-a731-70f3516345e7 |
| base2 | 12 | Vaporeon | no_symbol_error | recognized_error:no_jungle_symbol | holo | b575fc44-4d9e-460d-9977-8f19fc0a1b4b |
| base2 | 13 | Venomoth | no_symbol_error | recognized_error:no_jungle_symbol | holo | 59544cf4-177c-4c83-bd16-44b68733b06f |
| base2 | 14 | Victreebel | no_symbol_error | recognized_error:no_jungle_symbol | holo | 786ed86f-d6f0-43d7-92dc-22eadd69a620 |
| base2 | 15 | Vileplume | no_symbol_error | recognized_error:no_jungle_symbol | holo | 99f177ea-8920-43cb-9e8d-f6063054fc3d |
| base2 | 16 | Wigglytuff | no_symbol_error | recognized_error:no_jungle_symbol | holo | 8a9af34f-25c2-497b-a6e1-740f8821de4e |

## Result

- dry_run_status: jungle_no_symbol_parent_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `d5a01e1ae21d3ef6f007dae9efe4485a8a6b57c88e9d57da6fd99ae0b70993f6`
- sql_hash_sha256: `0d7bed6961ea56fa760bbda32133ebf0bdfc232820143bf586db24d2d2ce306a`
- dry_run_proof_sha256: `59ff65e4ef4f45afe1ef7425b2880b8e41f7e4ec9bf4053761854e46123965cc`
- stop_findings: 0

## Approval Text

```text
Approve real SPECIAL-VAR-01-JUNGLE-NO-SYMBOL-PARENT-INSERTS apply only. Fingerprint: d5a01e1ae21d3ef6f007dae9efe4485a8a6b57c88e9d57da6fd99ae0b70993f6. SQL hash: 0d7bed6961ea56fa760bbda32133ebf0bdfc232820143bf586db24d2d2ce306a. Scope: 16 Jungle No Symbol recognized-error parent inserts, 16 active identity inserts, 16 holo child printing inserts; set base2/Jungle; variant_key=no_symbol_error; printed_identity_modifier=recognized_error:no_jungle_symbol. Dry-run proof: 7f67f088b80af2058324230a7d0b1987fbdf3819e42ff658fdb56cb3852c9970 == 7f67f088b80af2058324230a7d0b1987fbdf3819e42ff658fdb56cb3852c9970. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
