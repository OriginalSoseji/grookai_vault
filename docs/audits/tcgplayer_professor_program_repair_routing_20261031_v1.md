# TCGPlayer Professor Program Repair Routing V1

Fresh production routing for the eight source-backed Professor Program products. Existing stamped parents are reused; duplicate parents are forbidden.

## Safety

- audit_only: true
- db_reads_performed: true
- durable_db_writes_performed: false
- mapping_writes_performed: false
- pricing_writes_performed: false

## Summary

| route | rows |
| --- | --- |
| blocked_existing_parent_finish_conflict | 1 |
| ready_existing_parent_modifier_repair | 3 |
| ready_parent_identity_child_insert | 3 |
| ready_tcgplayer_mapping | 1 |

## Rows

| product | set | number | card | source finish | route | target parent | target printing | blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 176629 | ex6 | 98 | Prof. Oak's Research | normal | ready_parent_identity_child_insert | e402c8fc-563b-49e3-a198-6a5fe5f75cda | eb9b3f39-760f-4b77-a3b1-c486b4a4e4c3 |  |
| 176630 | ex9 | 82 | Professor Birch | holo | ready_existing_parent_modifier_repair | ed61ea12-90af-4250-b089-e2b31fc2fdce | 820ba0fb-cc4a-4460-ada6-66fdeb1185b9 |  |
| 176631 | dp3 | 122 | Professor Oak's Visit | normal | ready_parent_identity_child_insert | baa63e55-c8aa-4936-8c9a-63de29e75c16 | 235db02c-1431-42ba-a973-43cb6d89b38d |  |
| 176632 | bw5 | 98 | Professor Juniper | reverse | ready_existing_parent_modifier_repair | c98e4f39-59fc-4ec1-bfc5-c34f28a25f3c | 04cf4fa5-ea7a-434c-a558-7b53e95a4a93 |  |
| 176633 | bw1 | 101 | Professor Juniper | reverse | ready_existing_parent_modifier_repair | 12cad852-d079-44cc-9438-e806aede97ff | 8b0cf097-ef28-42aa-a3f2-f8665f863726 |  |
| 176638 | xy1 | 122 | Professor Sycamore | reverse | blocked_existing_parent_finish_conflict | 69183c91-e669-4697-b5ab-f3cef1a11a5c |  | source_finish_child_missing_on_professor_program_parent |
| 213516 | sm6 | 108 | Judge | reverse | ready_tcgplayer_mapping | ea08d28d-8267-4db9-859c-64ffd048792f | bfe26a71-5c95-4e97-8b12-ef6afa0b2dc6 |  |
| 499366 | swsh4.5 | 59 | Gym Trainer | reverse | ready_parent_identity_child_insert | 8f22c4ef-320d-45cd-8938-4aa84aca740e | 2f02ea00-6f1e-480d-8766-edb2a468d72f |  |

## Next Boundary

Prepare a rollback-only dry run for the three parent/identity/child inserts and three existing-parent modifier repairs. The already-correct Judge parent remains mapping-only. Professor Sycamore remains held because its existing Professor Program parent has a holo child while TCGPlayer declares Reverse Holofoil.
