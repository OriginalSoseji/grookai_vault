# PKG-33B Legacy Orphan Species Parent Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-33A legacy orphan species dependency readiness.

No DB writes were committed. No migrations, quarantine, merges, unsupported cleanup, or global apply are authorized by this artifact.

| metric | value |
| --- | --- |
| package_id | PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE |
| fingerprint | 2def6522202e4fab393ceaf63a18cfb55797da0328a01cd1091d65c32eb19b37 |
| source_readiness_fingerprint | 5106dd72315cea0a3a2aa30c44cd7887a792fd8f8c559e8ba7d3290bbf5ac2b3 |
| target_rows | 14 |
| species_mapping_deletes_in_dry_run | 14 |
| child_deletes_in_dry_run | 14 |
| parent_deletes_in_dry_run | 14 |
| sql_hash | e795e41a1d534007441b44f6f19266baeffcb0b4d9443987fcc62a45b266cf79 |
| dry_run_sql | docs\sql\english_master_index_pkg33b_legacy_orphan_species_parent_child_delete_guarded_dry_run_transaction_v1.sql |
| db_writes_committed | false |
| migrations_created | false |

## Rows

| number | name | parent | child | species_mapping |
| --- | --- | --- | --- | --- |
| 2 | Ivysaur | 16770d4c-32a3-4c4b-b722-2ed76ecabb09 | 131dd03f-aa60-4a14-94d7-43061155ca6a | 16c9bf98-71c7-4919-9c9f-d1aa3cc366a5 |
| 24 | Pyroar | 69a78c80-8c98-4afc-80a7-43cef4d06e3b | 7295ea87-d1e7-45e4-a85b-bbb4c517bee8 | f0902f8a-4bf5-46bb-908b-24e7c5a9aba7 |
| 3 | Mega Venusaur ex | eb09a5a2-e5ce-4d82-b29c-f012ae059746 | 52672e8a-fc71-479a-8c8d-cda941a57fc3 | be38ebdd-d5a8-4a7f-b892-1791d5f58a70 |
| 48 | Raikou | aafbe34a-372b-4372-973d-6e3f9a0724c0 | 14544219-bec4-45a0-8f7e-034ec4356ab8 | f32f40ac-511a-4013-a05d-23577a445b87 |
| 5 | Exeggutor | 7e602b13-dd87-496b-80fc-dfe247ad8f22 | 2091d696-2ff2-4915-aade-d7c5801c15a9 | e8920a88-d73d-4a95-9fe6-021a0ec033d6 |
| 53 | Heliolisk | ecdb1219-3c7a-4e02-a6c3-c70c09876945 | b2fe1f56-286f-49ff-807a-7af1a5713dcf | 80cb82bf-d54d-4c7b-8418-2ad82e094a3f |
| 54 | Abra | 7de06767-8a39-4816-8c7c-0069ea9aef56 | 39a64161-dfd4-46b8-9773-add4befb0510 | bb3cabd9-8c53-4288-8127-869494e47710 |
| 55 | Kadabra | 9244f260-31ab-4c2a-95a6-c6dd074b97f4 | fc263c88-24ae-442b-bc23-573abf5a6652 | 88681c91-6e71-4795-80da-584f2840ef4c |
| 62 | Spoink | 983adbc3-0e3b-4636-a62c-6fd852af2284 | ccb7e545-55b0-4fa9-ac32-420011b79604 | f43ec5a6-4b7c-4cdc-8b37-f28cfbf3b323 |
| 74 | Lunatone | cfef2ab1-d4e4-438c-9d12-dfd36b9c666c | d8c4ecc1-fd7a-4072-bee6-2954316fb603 | d67ebaa7-21b0-4038-a256-40cfeaf520ea |
| 78 | Croagunk | f097e73c-0a80-4b0e-8744-68167798b06c | 9227bce5-f22e-4153-bd04-23304a354cc1 | 121f3576-cbf2-4dff-a475-f2b3f1219839 |
| 80 | Marshadow | b69810c8-c77f-4398-8792-7591339d9159 | 89dbea3c-e76e-444a-858c-b78f09f0010b | 098323d0-684f-49a3-94ac-336dcf0bcc39 |
| 86 | Mega Absol ex | 4f15e2d0-db12-473c-a1d6-96135cfda9a5 | c418b27a-acab-40e3-aafa-729fbe9801c1 | 2009dde4-266b-4f6e-8cbd-27b4d22ff801 |
| 95 | Dialga | 3e7b74cd-876e-4344-a5a9-a9f4cf383cb6 | 72267b2f-85ed-4028-840b-a3b7dae7c094 | 6f0dbf62-4a26-4bbc-a539-5d8bcd48b0d7 |
