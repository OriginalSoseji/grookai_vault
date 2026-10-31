# TCGPlayer Professor Program Catalog Repair Guarded Dry Run V1

Rollback-only production rehearsal for the six safe catalog repairs. No mappings or prices are included.

## Safety

- rollback_only: true
- durable_db_writes_performed: false
- rollback_verified: true
- transient_change_verified: true
- mapping_writes_performed: false
- pricing_writes_performed: false

## Simulated Writes

| operation | rows |
| --- | --- |
| parent_inserts | 3 |
| identity_inserts | 3 |
| child_inserts | 3 |
| modifier_updates | 3 |
| mapping_writes | 0 |
| pricing_writes | 0 |
| deletes | 0 |
| merges | 0 |

## Targets

| product | operation | set | number | card | finish | base parent | target parent | target child |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 176629 | insert_parent_identity_child | ex6 | 98 | Prof. Oak's Research | normal | 453468cf-a458-4ff6-acde-6103b234bf87 | e402c8fc-563b-49e3-a198-6a5fe5f75cda | eb9b3f39-760f-4b77-a3b1-c486b4a4e4c3 |
| 176630 | repair_existing_parent_modifier | ex9 | 82 | Professor Birch | holo | a3ae0ede-d02f-4bbd-b148-a1de0aa268fb | ed61ea12-90af-4250-b089-e2b31fc2fdce | 820ba0fb-cc4a-4460-ada6-66fdeb1185b9 |
| 176631 | insert_parent_identity_child | dp3 | 122 | Professor Oak's Visit | normal | 20353cdf-bdef-4e82-acac-49cf30ee22b5 | baa63e55-c8aa-4936-8c9a-63de29e75c16 | 235db02c-1431-42ba-a973-43cb6d89b38d |
| 176632 | repair_existing_parent_modifier | bw5 | 98 | Professor Juniper | reverse | e2dadea2-f1a8-4cac-9496-31e8adfa5908 | c98e4f39-59fc-4ec1-bfc5-c34f28a25f3c | 04cf4fa5-ea7a-434c-a558-7b53e95a4a93 |
| 176633 | repair_existing_parent_modifier | bw1 | 101 | Professor Juniper | reverse | 98f0a49e-37ac-4e45-9813-f1ce4ff2dc45 | 12cad852-d079-44cc-9438-e806aede97ff | 8b0cf097-ef28-42aa-a3f2-f8665f863726 |
| 499366 | insert_parent_identity_child | swsh4.5 | 59 | Gym Trainer | reverse | d04a6b76-26f1-4a33-99ae-6920f7a501da | 8f22c4ef-320d-45cd-8938-4aa84aca740e | 2f02ea00-6f1e-480d-8766-edb2a468d72f |

## Approval Text

Approve real TCGPLAYER-PROFESSOR-PROGRAM-CATALOG-REPAIR-V1 apply only. Fingerprint: 1203f252f7856cff512d85ff7d76eb45a9cf18e528166b53b519fb34a7c78820. Scope: 3 Professor Program parent inserts, 3 active identity inserts, 3 child printing inserts, and 3 existing Professor Program printed_identity_modifier repairs. Dry-run rollback proof: aace12789875dc67ae402d6f34d4900e1b4c3b1f61b00857f3e67a6b86610ba6 == aace12789875dc67ae402d6f34d4900e1b4c3b1f61b00857f3e67a6b86610ba6. Excludes Professor Sycamore product 176638 and excludes Judge product 213516 mapping. No mapping writes. No pricing writes. No ordinary parent mutation. No deletes. No merges. No migrations.
