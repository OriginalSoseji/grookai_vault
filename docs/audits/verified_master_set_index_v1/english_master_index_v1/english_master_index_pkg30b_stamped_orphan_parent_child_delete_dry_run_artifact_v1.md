# PKG-30B Stamped Orphan Parent Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-30A isolated stamped orphan parent cleanup candidates.

No DB writes were committed. No migrations, quarantine, merges, or global apply are authorized by this artifact.

| metric | value |
| --- | --- |
| package_id | PKG-30B-STAMPED-ORPHAN-PARENT-CHILD-DELETE |
| fingerprint | fed84a447d3b571213e3f3a2b600f56f4f2f60f37203a7c763d489cef1133d9f |
| source_readiness_fingerprint | db25d70e8bc515011e87b4f5028a4d713788bf84ccd3098ac211b3f3d60cd405 |
| target_rows | 62 |
| child_deletes_in_dry_run | 62 |
| parent_deletes_in_dry_run | 62 |
| sql_hash | 25aa20505da034121867cc5ffdc7a20143cce02361496702e75da230f0fc7738 |
| dry_run_sql | docs\sql\english_master_index_pkg30b_stamped_orphan_parent_child_delete_guarded_dry_run_transaction_v1.sql |
| db_writes_committed | false |
| migrations_created | false |

## Rows

| set | card | variant | parent | child |
| --- | --- | --- | --- | --- |
| dp1 | 112 Professor Rowan cosmos | professor_program_stamp | 9f8d951c-151d-4811-bf78-2281fd32385c | 73d6084f-6c0d-48f0-98ce-bf58ec5f6fc5 |
| me01 | 118 Iron Defender cosmos | prize_pack_stamp | 76a61722-62c6-47fc-951f-fae9f1c7ee39 | 0ad53585-160e-42a6-b495-b626c918be2e |
| me01 | 122 Mystery Garden cosmos | prize_pack_stamp | f4823132-e5a7-4abe-ace6-e510a6dec5e9 | 6b1e6f35-4930-4c96-b411-713a32feb85b |
| me01 | 124 Premium Power Pro cosmos | prize_pack_stamp | 16d3b4a8-b86f-4f0d-98e5-f8610fc541db | 84ed770c-26ef-481f-b8e2-b4ae974aa52f |
| sv02 | 171 Artazon cosmos | prize_pack_stamp | 11494a1a-8f94-4f25-80b7-f7c98e25d7b0 | 4a624ebf-0556-4a03-9270-66eac5bafa4b |
| sv02 | 177 Clavell cosmos | prize_pack_stamp | 2432f622-fe41-4f6c-869f-c6a6ae415ad1 | fd752964-3d7a-429d-86d4-235e059c6915 |
| sv02 | 188 Super Rod cosmos | prize_pack_stamp | 3e5da442-8158-4501-a278-c7ac3cd6b0e8 | ed6c7e71-f60f-4602-8f1c-a47a40b82c05 |
| sv02 | 189 Superior Energy Retrieval cosmos | prize_pack_stamp | 5a00abe9-af9f-42b7-930c-bc9b21830078 | 4873fa05-7329-4958-a99b-a23809df3c30 |
| sv02 | 190 Jet Energy cosmos | prize_pack_stamp | bedaee4b-a307-4d49-8e5b-1e94f7ad9188 | cfc857d7-0756-4b0b-a274-cdb2b7c750e5 |
| sv02 | 191 Luminous Energy cosmos | prize_pack_stamp | 21eb84c1-4a26-4cd0-9a16-1757d0257156 | d84d0324-87ad-41ee-96c1-371e4c0a0be8 |
| sv02 | 192 Reversal Energy cosmos | prize_pack_stamp | d18688e3-efa5-4020-a578-e865b68a040a | bd102830-5480-4cd0-a798-e705c20b01c9 |
| sv02 | 89 Spiritomb cosmos | prize_pack_stamp | c4873cb1-8437-490f-bd86-1bbe43007e31 | c1d2f081-d2e0-446e-a14b-01fbb39cd1fa |
| sv05 | 085 Drilbur cosmos | prize_pack_stamp | cac19f52-e201-4618-809d-5484fd9e02e4 | 5688dc81-dbc6-4411-bdd8-6ba986df5e5d |
| sv05 | 108 Farigiraf ex cosmos | prize_pack_stamp | 241b0735-6b4e-47f7-a8ce-3f0e08b78453 | 3486e3cf-84bc-4f8e-947e-2b68e3e7f11e |
| sv05 | 109 Roaring Moon cosmos | prize_pack_stamp | 2b34ba4a-1cde-4aac-86e2-9472a65d75cb | 5e947064-c3e1-485f-a61b-031cbdd3a496 |
| sv05 | 129 Dudunsparce cosmos | prize_pack_stamp | d0df2076-906b-424b-9202-e7329ac32b8c | 0acf86b9-1d32-454b-a789-405da36218fa |
| sv05 | 142 Bianca's Devotion cosmos | prize_pack_stamp | 8fcec6bf-2273-4b77-a6dd-db9133c6eb30 | 31699216-9819-4bd3-b4be-221b1037a6df |
| sv05 | 145 Ciphermaniac's Codebreaking cosmos | prize_pack_stamp | 1b4b29ae-cd00-4088-8cb2-aa1574cb53c0 | f4fd01b4-f35f-4b00-9221-1463efad05d6 |
| sv05 | 147 Explorer's Guidance cosmos | prize_pack_stamp | 3301a2e5-64da-4472-916b-6a72c3c8058f | 1992c9bd-f3ae-47bb-ab72-85e142e894b0 |
| sv05 | 148 Full Metal Lab cosmos | prize_pack_stamp | 5e6738d9-3ca3-47c8-b18c-4db8a9a82313 | 7288ad54-84d6-45a2-b0d2-97930ce770dc |
| sv05 | 156 Perilous Jungle cosmos | prize_pack_stamp | 3a8acfe6-d0d9-44b3-96e5-43fad5142636 | c9ee4e51-0b3e-4764-ba24-e806cb804482 |
| sv05 | 159 Rescue Board cosmos | prize_pack_stamp | c491dd51-8124-4cf4-ab39-21216d07185b | b32da362-e23c-4f6b-b769-2d28d56f4620 |
| sv05 | 161 Mist Energy cosmos | prize_pack_stamp | 55b68f7e-87c9-4bee-b635-2bae9ecd2773 | 93fcb4d5-6664-478c-8b84-699d664cc0bb |
| sv05 | 162 Neo Upper Energy cosmos | prize_pack_stamp | 3ed2c647-203a-47ca-aa08-ff0619e56fcf | a501a38c-e590-410d-bc28-4ddadfd68cb3 |
| sv07 | 132 Briar cosmos | prize_pack_stamp | 42269654-5767-471f-8725-e83097355a59 | 85b5a6eb-a6dd-4e35-aef1-7c5173179732 |
| sv07 | 50 Joltik cosmos | prize_pack_stamp | 5b268d3a-59dd-4e4c-b128-69bf1c2d88a2 | f22fbbf1-c4a5-430a-b255-b55dd58625d0 |
| sv07 | 71 Iron Boulder cosmos | prize_pack_stamp | c102ab03-daa9-4074-bb04-0546ab627ada | 96bbae2f-1380-4fa2-a662-b87c747178ef |
| sv09 | 151 Lillie's Pearl cosmos | prize_pack_stamp | 73b4a8be-3368-429b-9ca4-1ee18363df01 | e17cf977-6791-4cb8-879c-eb55fbb64961 |
| sv09 | 153 N's PP Up cosmos | prize_pack_stamp | a30a958c-216c-43c8-88d4-7ec11240328a | 3372a9b5-7793-45a8-8d4a-feebb6a22c14 |
| sv09 | 154 Postwick cosmos | prize_pack_stamp | 3cebd574-91f9-49e4-8a5b-b8328ef128d8 | d18e404b-4834-4623-9d51-e9df67101d0e |
| sv09 | 47 Iono's Voltorb cosmos | prize_pack_stamp | 600fe67f-d4eb-434a-80ac-b5d9cd057ce2 | a941ac25-4d20-4857-a8e4-bc67e10c0778 |
| sv10 | 165 Ethan's Adventure cosmos | prize_pack_stamp | 23a52d01-0ad9-4f53-a475-01601e7077f4 | 64c75c3a-a37f-4d3c-87ca-85514bf45712 |
| sv10 | 8 Cynthia's Roserade cosmos | prize_pack_stamp | 86948129-44a0-4c85-b986-816e4fe9e59b | 3d3ab89a-a400-4e83-92b9-00c1f26abbdf |
| sve | 1 Basic Grass Energy cosmos | prize_pack_stamp | 537a392a-0589-43a3-96ff-3f0fd9f72754 | 66e42ad2-f243-4111-bc0a-653a7f1d733f |
| sve | 10 Basic Fire Energy cosmos | prize_pack_stamp | 72ebbc3e-3d29-48a6-b651-026373ca773d | 4adb1262-27f6-43f9-b713-f6ee7834744d |
| sve | 11 Basic Water Energy cosmos | prize_pack_stamp | 5dca36fd-d2a9-4141-b8db-a42951764e45 | 6321db54-2741-4ac1-9e6c-c1c46e906a2a |
| sve | 12 Basic Lightning Energy cosmos | prize_pack_stamp | 99a85152-1bf6-4a4a-af99-b3b84c311b40 | bd7f2ffe-1ed8-4661-ae74-df8903a5a4e2 |
| sve | 14 Basic Fighting Energy cosmos | prize_pack_stamp | 1edf196d-2488-4a30-ab02-26afd150769a | 5ed988d8-d46f-44e3-8439-242082dd1410 |
| sve | 15 Basic Darkness Energy cosmos | prize_pack_stamp | 947c2de8-e507-4602-806b-3435fd5becbe | ba041f9e-a20d-4af7-a7a3-ad7316b15efe |
| sve | 16 Basic Metal Energy cosmos | prize_pack_stamp | 86a24288-810e-45bb-984c-17a862b10d0d | 77a9897e-a736-4ae3-945a-8580396c4f6d |
| sve | 2 Basic Fire Energy cosmos | prize_pack_stamp | 74c4d635-f979-44b5-93ac-56a97f4607b3 | fca4c3e2-09ca-4b4e-a528-341609c38548 |
| sve | 3 Basic Water Energy cosmos | prize_pack_stamp | 70971e86-01ff-41b1-aa8f-6967eca9dd41 | 484de5fb-6c6c-42b2-a780-6fd503c8188d |
| sve | 4 Basic Lightning Energy cosmos | prize_pack_stamp | b218fe69-d7c1-4a9a-a614-fd2daf9d481d | 1871698b-fcd3-407c-8a05-9cf20f574952 |
| sve | 5 Basic Psychic Energy cosmos | prize_pack_stamp | a70e76d6-9606-4339-9d3b-128d8db5da4e | a54bef2b-8511-4ac3-8b4b-386bc3efc3b9 |
| sve | 7 Basic Darkness Energy cosmos | prize_pack_stamp | 73f6247a-05e3-4301-be4f-729db37579e3 | 71565e5f-befb-445f-9200-993f048c7d61 |
| sve | 8 Basic Metal Energy cosmos | prize_pack_stamp | ddc2db15-6065-47a6-9dfe-841b4990cdb3 | 2714a467-a840-4c22-971a-07dd91305092 |
| sve | 9 Basic Grass Energy cosmos | prize_pack_stamp | 85162547-53ef-4458-8f19-856db51bcb89 | 19ea3371-78df-43bf-bfa5-cbc2dfa6a93c |
| swsh10 | 136 Canceling Cologne cosmos | prize_pack_stamp | 88353cb3-5aa9-4ec3-b5ef-f2e2a809b26d | fdcc9de2-f33f-42fb-aa6a-a6bba919d3fa |
| swsh10 | 141 Feather Ball cosmos | prize_pack_stamp | be59556c-24b7-4e64-b5b0-8c4cf2665e69 | bb873f16-4eba-4661-9135-e864f058f311 |
| swsh10 | 146 Hisuian Heavy Ball cosmos | prize_pack_stamp | 95b32fc7-c6ae-47be-8bbe-264f5a878242 | 58b06d4a-dd5d-4a5f-931e-3b49f2761787 |
| swsh10 | 154 Switch Cart cosmos | prize_pack_stamp | 0ac3a3a4-0408-41cf-a032-c80e398ddc93 | 62d416c5-c36a-4883-b7c7-484968a538e0 |
| swsh10 | 43 Hisuian Basculin cosmos | prize_pack_stamp | 390ed73e-e4ea-4110-88b9-947a0227da50 | 0e8e0427-86bb-4de8-b042-150a4ff2c303 |
| swsh11 | 050 Cramorant cosmos | prize_pack_stamp | bb65f5a1-f417-496b-b092-5d164cbca758 | da72efe8-6345-4b92-a15b-5957b31f6282 |
| swsh11 | 070 Sableye cosmos | prize_pack_stamp | 067a5b85-a3fb-4edb-8ea8-1e6fa1717ad3 | b5eb2c88-d953-4c72-bdf2-e3ab779635b7 |
| swsh11 | 156 Damage Pump cosmos | prize_pack_stamp | fc844484-ef64-49b8-a3e1-482006715228 | cb344c3f-ccda-4279-a1bb-6d2ea8658075 |
| swsh11 | 161 Lost City cosmos | prize_pack_stamp | b36c3070-db5a-4472-a8eb-cca5b72aa7e9 | 4cc7cfad-4447-4b2a-8fd5-662bdc06a7f5 |
| swsh11 | 163 Mirage Gate cosmos | prize_pack_stamp | 349b6bb2-3570-42a2-8506-015b9bca8646 | 151e1075-5610-43b2-a521-a74592dadcd6 |
| swsh12 | 167 Worker cosmos | prize_pack_stamp | 46c648b4-8fc8-40c6-97c9-a3e81a409c59 | cfe1790f-f517-48dc-a09f-1d59bb31c6ec |
| swsh12 | 38 Wailord cosmos | prize_pack_stamp | 8b207b0b-a11c-421d-b09d-beb3cedadf21 | 1270a8cb-d8bb-4933-8f00-4a9baee4c45b |
| swsh9 | 146 Pot Helmet cosmos | prize_pack_stamp | c62f6288-c299-42d7-9539-446600460310 | e9cb041d-d756-4c8b-8592-64b047406352 |
| swsh9 | 151 Double Turbo Energy cosmos | prize_pack_stamp | 7f9ddbbf-4b60-4812-8ec1-10737ad9b054 | 46a2bb1f-f70a-4d48-940d-6dd7661d4e78 |
| swsh9 | 7 Grotle cosmos | prize_pack_stamp | b4e0797c-5211-4e9f-96b3-8481658a6a45 | 884b5663-0e28-4fe1-b4e4-b0fb0da09371 |
