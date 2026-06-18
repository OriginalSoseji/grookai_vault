# Retailer Stamp Parent Insert Guarded Dry Run V1

Rollback-only dry-run for source-backed Build-A-Bear Workshop and Toys R Us stamped parent identity inserts.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 14
- identity_inserts: 14
- child_inserts: 14
- deletes: 0
- merges: 0

## Targets

| set | number | name | stamp_label | variant_key | finish | base_parent_id |
| --- | --- | --- | --- | --- | --- | --- |
| bw10 | 14 | Squirtle | Build-A-Bear Workshop Stamp | build_a_bear_workshop_stamp | normal | f90d929b-d8c8-417d-8aab-1f35ecad63d1 |
| bw11 | 17 | Charmander | Build-A-Bear Workshop Stamp | build_a_bear_workshop_stamp | normal | d24c5888-bb6a-4835-aa2e-37e2088d5ad8 |
| bw5 | 1 | Bulbasaur | Build-A-Bear Workshop Stamp | build_a_bear_workshop_stamp | normal | 63f698b5-2db3-41a5-a56c-ce4fa98f5f78 |
| g1 | 8 | Tangela | Toys R Us Stamp | toys_r_us_stamp | holo | 14d43149-7879-4527-b129-66a9b40d0e24 |
| g1 | 22 | Magikarp | Toys R Us Stamp | toys_r_us_stamp | holo | 35edb5a2-fa5d-4358-b1a8-7e3967f8ab2c |
| g1 | 26 | Pikachu | Toys R Us Stamp | toys_r_us_stamp | holo | c698cb45-7196-4fa6-b1de-b943436be4da |
| g1 | 32 | Slowpoke | Toys R Us Stamp | toys_r_us_stamp | holo | 3365d632-e982-4453-b230-65678c59d839 |
| g1 | 50 | Clefairy | Toys R Us Stamp | toys_r_us_stamp | holo | d4c94e77-ed35-4218-a910-4cfed68cc54f |
| g1 | 53 | Meowth | Toys R Us Stamp | toys_r_us_stamp | holo | b6cfae62-0d29-454b-91aa-1005460a5f36 |
| sm1 | 28 | Psyduck | Build-A-Bear Workshop Stamp | build_a_bear_workshop_stamp | normal | ce877140-a4b5-4b99-844a-8bb957d9d7f8 |
| sm1 | 64 | Cosmog | Toys R Us Stamp | toys_r_us_stamp | cosmos | 69c5c655-7d4f-4314-9c4b-4acea0f28e65 |
| sm1 | 90 | Snubbull | Build-A-Bear Workshop Stamp | build_a_bear_workshop_stamp | normal | 0fc0c811-b335-4dd7-8df7-c970e58338e9 |
| sm3 | 110 | Stufful | Toys R Us Stamp | toys_r_us_stamp | holo | bec32fb2-c9cd-4369-8433-6d70b3b8b3de |
| sm4 | 71 | Jigglypuff | Build-A-Bear Workshop Stamp | build_a_bear_workshop_stamp | normal | 9608bbff-c551-48ee-916e-ad932d756870 |

## Result

- dry_run_status: retailer_stamp_parent_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `758040a7745516be0d173b7bed581ffd78b7f0c23ef7c0c4537f3cbe3fd76156`
- dry_run_proof_sha256: `ce4c07f9f938f7c99bf589458b2c5123c324765b3c300796389d15c267c791c5`
- stop_findings: 0

## Deferred Rows

The five blocked XY-era rows from the route audit remain excluded because their base parent is not unique. They require a separate base-parent resolution package before any retailer-stamp insert package may touch them.

## Approval Text

```text
Approve real RETAILER-STAMP-02-PARENT-IDENTITY-INSERTS apply only. Fingerprint: 758040a7745516be0d173b7bed581ffd78b7f0c23ef7c0c4537f3cbe3fd76156. Scope: 14 retailer-stamped parent inserts, 14 identity inserts, 14 child printing inserts; finishes holo=7, normal=6, cosmos=1; stamp labels Toys R Us Stamp=8, Build-A-Bear Workshop Stamp=6; sets g1=6, sm1=3, bw10=1, bw11=1, bw5=1, sm3=1, sm4=1; source-unique active-finish rows: 8. Dry-run proof: c289be527678890672120c45d44cea3400ce2a1b6635cb41a29a30b740480b48 == c289be527678890672120c45d44cea3400ce2a1b6635cb41a29a30b740480b48. Excluded blocked base-parent rows: 5. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
