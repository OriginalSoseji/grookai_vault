# Physical Recovery Set Queue V1

This report keeps the recoverable physical TCG rows grouped by matched master set. It is a queue for source acquisition and exact comparison, not mutation.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- physical_candidate_sets: 26
- physical_candidate_card_prints: 807
- physical_candidate_printing_rows: 1685

## Sample Card Queue

| set_key | set_name | readiness_lane | card_print_id | card_name | finish_profile | source_aliases |
| --- | --- | --- | --- | --- | --- | --- |
| sv4pt5 | Paldean Fates | source_acquisition_required | 435c0599-12c2-4042-9401-8290af312bf6 | Annihilape | holo\|reverse | sv04.5 |
| sv4pt5 | Paldean Fates | source_acquisition_required | 5b3fb3aa-2b58-4997-841f-d6771ec3ebc6 | Armarouge | holo\|reverse | sv04.5 |
| sv4pt5 | Paldean Fates | source_acquisition_required | 8cf2db86-e98d-4d06-8882-39e8a6c68d30 | Ceruledge | holo\|reverse | sv04.5 |
| sv4pt5 | Paldean Fates | source_acquisition_required | 8a71b7c8-ef01-4c87-b5a6-4974984b14d6 | Charcadet | normal\|reverse | sv04.5 |
| sv4pt5 | Paldean Fates | source_acquisition_required | 3729104f-71b2-4242-801a-bec9dc31369b | Charmander | normal\|reverse | sv04.5 |
| sv4pt5 | Paldean Fates | source_acquisition_required | 39599b5f-9417-4d67-9d4f-630e413256a2 | Charmeleon | normal\|reverse | sv04.5 |
| sv4pt5 | Paldean Fates | source_acquisition_required | be8f9f47-28a4-4d25-abd5-527f3cf13549 | Clive | normal\|reverse | sv04.5 |
| sv4pt5 | Paldean Fates | source_acquisition_required | 3d5d4c62-83d0-4996-878b-e3a61872f4ac | Cyclizar | holo\|reverse | sv04.5 |
| sv6pt5 | Shrouded Fable | source_acquisition_required | 75dee3a0-eba6-4da0-91a2-67d806af9656 | Bewear | normal\|reverse | sv06.5 |
| sv6pt5 | Shrouded Fable | source_acquisition_required | 560786bd-0eab-4bae-871a-2292db4153c0 | Cassiopeia | normal\|reverse | sv06.5 |
| sv6pt5 | Shrouded Fable | source_acquisition_required | 62b9c8cd-4be6-483c-b5b8-6cd7bd1aeb5e | Colress's Tenacity | normal\|reverse | sv06.5 |
| sv6pt5 | Shrouded Fable | source_acquisition_required | 132bd56e-d03e-4d50-98e5-defab35ebff1 | Cresselia | holo\|reverse | sv06.5 |
| sv6pt5 | Shrouded Fable | source_acquisition_required | c51bea66-e243-4d68-a673-c33150bdecdb | Cufant | normal\|reverse | sv06.5 |
| sv6pt5 | Shrouded Fable | source_acquisition_required | c6afa971-a1cb-4f45-ab5e-bbc407fc5af1 | Dusclops | normal\|reverse | sv06.5 |
| sv6pt5 | Shrouded Fable | source_acquisition_required | adb529a0-8a7e-4339-a517-b21f1f0081b6 | Dusknoir | holo\|reverse | sv06.5 |
| sv6pt5 | Shrouded Fable | source_acquisition_required | 8684a96e-9a74-4e36-ae2b-18f85dc7a42a | Duskull | normal\|reverse | sv06.5 |
| sv8pt5 | Prismatic Evolutions | source_acquisition_required | 29357eff-81f7-4232-93ac-49f1226abfd2 | Amarys | holo\|normal\|reverse | sv08.5 |
| sv8pt5 | Prismatic Evolutions | source_acquisition_required | 6196ac6e-1301-451f-9bcf-1349cdafb4f8 | Applin | holo\|normal\|reverse | sv08.5 |
| sv8pt5 | Prismatic Evolutions | source_acquisition_required | c8f1da98-202e-46aa-9a85-8649ebf8d399 | Area Zero Underdepths | holo\|normal\|reverse | sv08.5 |
| sv8pt5 | Prismatic Evolutions | source_acquisition_required | 3c97af9d-aa95-49f6-90b0-706b88b76443 | Aromatisse | holo\|normal\|reverse | sv08.5 |
| sv8pt5 | Prismatic Evolutions | source_acquisition_required | 77851af6-8d91-43c5-beae-b9e23d5d3713 | Binding Mochi | holo\|normal\|reverse | sv08.5 |
| sv8pt5 | Prismatic Evolutions | source_acquisition_required | 3da65e78-0221-4651-9467-4d0e4f85b652 | Black Belt's Training | holo\|normal\|reverse | sv08.5 |
| sv8pt5 | Prismatic Evolutions | source_acquisition_required | 2f0e9e03-7ac5-45bd-9add-eac460ea6432 | Black Belt's Training | holo\|normal\|reverse | sv08.5 |
| sv8pt5 | Prismatic Evolutions | source_acquisition_required | 21d069c6-f6b7-41d6-8300-37f28e5ce9ae | Black Belt's Training | holo\|normal\|reverse | sv08.5 |
| swsh2 | Rebel Clash | source_acquisition_required | 9cf48b11-bf42-4aa3-861b-c2ca5543877e | Boss's Orders (Giovanni) | holo\|reverse | swsh2 |
| mcd21 | McDonald's Collection 2021 | source_acquisition_required | d34033e2-a8e8-4e72-b1e9-2033445e8f00 | Bulbasaur | holo\|normal | 2021swsh |
| mcd21 | McDonald's Collection 2021 | source_acquisition_required | 9421cd5e-2640-44c5-8044-47aaa7a7954a | Charmander | holo\|normal | 2021swsh |
| mcd21 | McDonald's Collection 2021 | source_acquisition_required | e95d8646-b98f-4c8c-a01d-2e499c02aa82 | Chespin | holo\|normal | 2021swsh |
| mcd21 | McDonald's Collection 2021 | source_acquisition_required | 987099f7-59e9-4c0a-9bbb-a0b8fa24a086 | Chikorita | holo\|normal | 2021swsh |
| mcd21 | McDonald's Collection 2021 | source_acquisition_required | cefedf7b-f1c0-42f7-af7d-e6e9279358f3 | Chimchar | holo\|normal | 2021swsh |
| mcd21 | McDonald's Collection 2021 | source_acquisition_required | ac9e8297-6e39-419f-8fa0-f58e90c80c01 | Cyndaquil | holo\|normal | 2021swsh |
| mcd21 | McDonald's Collection 2021 | source_acquisition_required | 0980ca25-d2fb-43a3-a74f-789e6a0f8f51 | Fennekin | holo\|normal | 2021swsh |
| mcd21 | McDonald's Collection 2021 | source_acquisition_required | 3f8c67ec-ac7c-4c02-b46d-a7ff9e9af0b2 | Froakie | holo\|normal | 2021swsh |
| pgo | Pokémon GO | source_acquisition_required | 0eafc514-6bba-4629-ba75-1a95493bc819 | Pikachu | holo\|normal\|reverse | swsh10.5 |
| pgo | Pokémon GO | source_acquisition_required | 6206fc08-7415-414f-9c22-c2cf57493c1e | Blanche | normal\|reverse | swsh10.5 |
| pgo | Pokémon GO | source_acquisition_required | fc394554-fa86-4510-8a81-79f48df255c6 | Candela | normal\|reverse | swsh10.5 |
| pgo | Pokémon GO | source_acquisition_required | d2f87992-4951-464e-9976-4e2caef7e497 | Egg Incubator | normal\|reverse | swsh10.5 |
| pgo | Pokémon GO | source_acquisition_required | b45c87d9-4eef-493b-8bc7-3dd19021a7c2 | Lure Module | normal\|reverse | swsh10.5 |
| pgo | Pokémon GO | source_acquisition_required | 067bbc12-ce47-4e7a-bfbb-a9d1ac21f0d4 | Pikachu | normal\|reverse | swsh10.5 |
| pgo | Pokémon GO | source_acquisition_required | e44d13e5-a6ac-4016-8b81-b6305ea3414b | Spark | normal\|reverse | swsh10.5 |
| pgo | Pokémon GO | source_acquisition_required | 4b809146-f6ac-4b99-81e1-f593b115a1aa | Alolan Exeggutor V | holo | swsh10.5 |
| ecard3 | Skyridge | source_acquisition_required | d0270c83-13c1-4d2b-ae50-19830be9d134 | Articuno | normal\|reverse | ecard3 |
| ecard3 | Skyridge | source_acquisition_required | 36a0af86-f863-4ff0-967c-285a67272dcb | Crobat | normal\|reverse | ecard3 |
| ecard3 | Skyridge | source_acquisition_required | 6406220f-4684-4f26-a52d-310db5eb5700 | Flareon | normal\|reverse | ecard3 |
| ecard3 | Skyridge | source_acquisition_required | 982bd726-548f-4e0c-9a93-c1301af1342f | Forretress | normal\|reverse | ecard3 |
| ecard3 | Skyridge | source_acquisition_required | d139fca7-558c-4dad-9a46-f94e4d45ab6b | Kabutops | holo | ecard3 |
| ecard3 | Skyridge | source_acquisition_required | 8c78b35f-6dd0-4b12-9709-8b4198ad3089 | Ledian | holo | ecard3 |
| ecard3 | Skyridge | source_acquisition_required | bb73d56c-c46f-4341-b4a1-825a10c2406b | Magcargo | holo | ecard3 |
| ecard3 | Skyridge | source_acquisition_required | 02a4156d-5f67-4969-8288-c440938a923c | Magcargo | holo | ecard3 |
| ecard2 | Aquapolis | source_acquisition_required | 5155d8da-c49b-43cf-8173-1e4ceca853d2 | Espeon | normal\|reverse | ecard2 |
| ecard2 | Aquapolis | source_acquisition_required | 49008b62-21be-48b8-a561-9dc0bea390e1 | Exeggutor | normal\|reverse | ecard2 |
| ecard2 | Aquapolis | source_acquisition_required | 0f752ca1-5458-4241-af37-4a7b48b85013 | Exeggutor | normal\|reverse | ecard2 |
| ecard2 | Aquapolis | source_acquisition_required | bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88 | Houndoom | normal\|reverse | ecard2 |
| ecard2 | Aquapolis | source_acquisition_required | d5e3ba78-7a85-49d2-8ab0-295521652f55 | Hypno | normal\|reverse | ecard2 |
| ecard2 | Aquapolis | source_acquisition_required | 11591d3d-6574-487e-9958-f0d94bba5af4 | Jumpluff | normal\|reverse | ecard2 |
| ecard2 | Aquapolis | source_acquisition_required | 72b1ec6b-fe84-4190-a0d3-d95155296261 | Jynx | normal\|reverse | ecard2 |
| ecard2 | Aquapolis | source_acquisition_required | b22dc290-dade-45f8-b488-5d3c921a79a1 | Kingdra | normal\|reverse | ecard2 |
| svp | Scarlet & Violet Black Star Promos | source_acquisition_required | 0c500907-b532-4c45-9b35-5cbe4059c21c | Alakazam ex | holo\|normal\|reverse | svp |
| svp | Scarlet & Violet Black Star Promos | source_acquisition_required | 1154a3c4-8965-4ac8-be8f-6963bdad7a35 | Arcanine | holo\|normal\|reverse | svp |
| svp | Scarlet & Violet Black Star Promos | source_acquisition_required | 6f7ddb77-58d2-4e0b-b761-4ce80881c739 | Arctibax | holo\|normal\|reverse | svp |
| svp | Scarlet & Violet Black Star Promos | source_acquisition_required | 817191d0-a89d-41f0-a61e-833ffb1f85d7 | Baxcalibur | holo\|normal\|reverse | svp |
| svp | Scarlet & Violet Black Star Promos | source_acquisition_required | e0e95ad4-64fb-4846-96b6-c1bc4bea89f6 | Bellibolt | holo\|normal\|reverse | svp |
| svp | Scarlet & Violet Black Star Promos | source_acquisition_required | 94056067-d943-4cf5-85a2-6b7bf9e20896 | Bulbasaur | holo\|normal\|reverse | svp |
| svp | Scarlet & Violet Black Star Promos | source_acquisition_required | b4d77eb7-0a23-42e4-8365-59ab89a98cf5 | Carvanha | holo\|normal\|reverse | svp |
| svp | Scarlet & Violet Black Star Promos | source_acquisition_required | 0658c806-e1be-48f4-9c4b-50b54bcd59da | Charizard ex | holo\|normal\|reverse | svp |
| me1 | Mega Evolution | source_acquisition_required | f7c0bdb9-b762-4c56-b698-4907376db02d | Cinderace | holo\|normal\|reverse | me01 |
| me1 | Mega Evolution | source_acquisition_required | 4faab1bd-e8ce-4fe8-8fda-cd2167875850 | Hariyama | holo\|normal\|reverse | me01 |
| me1 | Mega Evolution | source_acquisition_required | 4800e647-2f2b-4ebc-931e-ef4b672788e2 | Kirlia | holo\|normal\|reverse | me01 |
| me1 | Mega Evolution | source_acquisition_required | 711a2789-6c0b-4c7b-8e5a-15c865deb444 | Meganium | holo\|normal\|reverse | me01 |
| me1 | Mega Evolution | source_acquisition_required | 569f605f-b7e2-4e7d-9182-459287edda7a | Ralts | holo\|normal\|reverse | me01 |
| me1 | Mega Evolution | source_acquisition_required | 6a389901-dd1b-480a-88fc-ca3d1ee02128 | Riolu | holo\|normal\|reverse | me01 |
| me1 | Mega Evolution | source_acquisition_required | 6968d365-f435-4047-9c47-8c9f274f92e6 | Solrock | holo\|normal\|reverse | me01 |
| me1 | Mega Evolution | source_acquisition_required | e003f060-6249-47f6-b31b-e2cb4cac5611 | Xerneas | holo\|normal\|reverse | me01 |
| swsh45 | Shining Fates | source_acquisition_required | 5ee8ddf9-81b3-43e0-94b5-951ac0386eb8 | Boss's Orders (Lysandre) | normal\|reverse | swsh4.5 |
| swsh45 | Shining Fates | source_acquisition_required | 17cd3179-b844-47a8-a197-ae123ca4b583 | Professor's Research (Professor Juniper) | normal\|reverse | swsh4.5 |
| xy4 | Phantom Forces | source_acquisition_required | 6922b72a-f472-4bea-9c3b-e4320f11924e | Aegislash EX | holo\|normal\|reverse | xy4 |
| xy4 | Phantom Forces | source_acquisition_required | 21840232-9191-4566-8e3e-046f74841288 | Aegislash EX | holo\|normal\|reverse | xy4 |
| xy4 | Phantom Forces | source_acquisition_required | 29ab165f-342c-467e-993f-ea98d49ba788 | Dialga EX | holo\|normal\|reverse | xy4 |
| xy4 | Phantom Forces | source_acquisition_required | 77ebedc5-b9f3-4312-993b-bdf0d6cc9391 | Dialga EX | holo\|normal\|reverse | xy4 |
| xy4 | Phantom Forces | source_acquisition_required | 367a9aa6-3ec4-471f-a173-9e292e3a28d9 | Florges EX | holo\|normal\|reverse | xy4 |
| xy4 | Phantom Forces | source_acquisition_required | 4057e212-ac7d-4ecf-a3f0-40b396bbfe09 | Florges EX | holo\|normal\|reverse | xy4 |
| xy4 | Phantom Forces | source_acquisition_required | e7bc4b52-6e1b-412a-a121-d27b63c497f9 | Gengar EX | holo\|normal\|reverse | xy4 |
| xy4 | Phantom Forces | source_acquisition_required | 2257ea5d-92bf-483b-8f40-8aaddfd7259c | Gengar EX | holo\|normal\|reverse | xy4 |
| mep | MEP Black Star Promos | source_acquisition_required | aa9f207d-c9ea-4607-bbc5-448648bca47f | Alakazam | holo | mep |
| mep | MEP Black Star Promos | source_acquisition_required | a3624761-be25-4841-83e4-c5936ec434fe | Alakazam | holo | mep |
| mep | MEP Black Star Promos | source_acquisition_required | ac2b6cf7-6873-44e8-96b9-e03a179fae51 | Drifblim | holo | mep |
| mep | MEP Black Star Promos | source_acquisition_required | 04e533ae-dd17-478c-ab46-220859079b2c | Drifloon | holo | mep |
| mep | MEP Black Star Promos | source_acquisition_required | 47f874b2-ea20-4b89-af44-085905bb1f60 | Golduck | holo | mep |
| mep | MEP Black Star Promos | source_acquisition_required | b75d4730-3c1a-42ca-9d18-e8ca736ae41f | Inteleon | holo | mep |
| mep | MEP Black Star Promos | source_acquisition_required | bf523703-271c-49fe-b8aa-c31c57cb9b32 | Lunatone | holo | mep |
| mep | MEP Black Star Promos | source_acquisition_required | 6419894a-137f-4fc7-8db1-fa853872b190 | Meganium | holo | mep |
| ex10 | Unseen Forces | source_acquisition_required | 2fdd39c8-7afa-4031-be84-649ac28a7b72 | Entei Star | holo | ex10 |
| ex10 | Unseen Forces | source_acquisition_required | 043dbc47-0815-4ef4-b31d-2027f70f2338 | Raikou Star | holo | ex10 |
| ex10 | Unseen Forces | source_acquisition_required | 584c31ad-d7ac-4356-b9cc-4de3152511b2 | Suicune Star | holo | ex10 |
| xyp | XY Black Star Promos | source_acquisition_required | 880bf738-91f8-44f0-9026-5517058e9cbe | Absol EX | holo\|normal\|reverse | xyp |
| xyp | XY Black Star Promos | source_acquisition_required | 4f7b83ca-6291-4f21-bc09-add8bb57e266 | Aerodactyl EX | holo\|normal\|reverse | xyp |
| xyp | XY Black Star Promos | source_acquisition_required | 7193b9ae-ed5b-457e-b67f-efef355afb96 | Ash Greninja EX | holo\|normal\|reverse | xyp |
| xyp | XY Black Star Promos | source_acquisition_required | d159fd8a-4a12-4109-8200-36416c2a2ad2 | Aurorus EX | holo\|normal\|reverse | xyp |
| xyp | XY Black Star Promos | source_acquisition_required | ce148dc6-45fe-460e-b3c5-cf3483b494b5 | Beedrill EX | holo\|normal\|reverse | xyp |
| xyp | XY Black Star Promos | source_acquisition_required | e8e43d13-0ee1-4433-91ef-fbe866b48e57 | Blastoise EX | holo\|normal\|reverse | xyp |
| xyp | XY Black Star Promos | source_acquisition_required | f46d7286-3522-4a9c-9d02-bb1e2aac838d | Blastoise EX | holo\|normal\|reverse | xyp |
| xyp | XY Black Star Promos | source_acquisition_required | 199e8699-1e8d-42dd-93d3-ac67f7e247be | Blaziken EX | holo\|normal\|reverse | xyp |
| fut2020 | Pokémon Futsal 2020 | source_acquisition_required | 2f2942c8-6019-4446-806c-593dd351af98 | Eevee on the Ball | holo\|normal\|reverse | fut2020 |
| fut2020 | Pokémon Futsal 2020 | source_acquisition_required | 5029b53f-a1dd-4fe0-ae0c-b38021dd52c2 | Grookey on the Ball | holo\|normal\|reverse | fut2020 |
| fut2020 | Pokémon Futsal 2020 | source_acquisition_required | 53919228-7560-480c-9bdb-da99ad67250a | Scorbunny on the Ball | holo\|normal\|reverse | fut2020 |
| fut2020 | Pokémon Futsal 2020 | source_acquisition_required | 82ebefc5-51bc-4dbd-ba14-a9a60186aa61 | Sobble on the Ball | holo\|normal\|reverse | fut2020 |
| fut2020 | Pokémon Futsal 2020 | source_acquisition_required | a676888d-19e0-4064-89aa-e67019af5b95 | Pikachu on the Ball | holo | fut2020 |
| bw9 | Plasma Freeze | source_acquisition_required | 7df8528c-c8f8-4110-890d-0fb32bc0fbf3 | Nidoran♀ | holo\|normal\|reverse | bw9 |
| bw9 | Plasma Freeze | source_acquisition_required | c0b41c1b-2d6f-4c5f-bf85-ccae2c731d46 | Nidoran♂ | holo\|normal\|reverse | bw9 |
| dp7 | Stormfront | source_acquisition_required | 62f77935-5749-4d26-87e6-06bbca565b22 | Empoleon | holo\|reverse | dp7 |
| dp7 | Stormfront | source_acquisition_required | 665ee2b0-4a22-43d5-bf8e-8ff22a990384 | Infernape | holo\|reverse | dp7 |
| dp7 | Stormfront | source_acquisition_required | e8444009-0c47-48a6-af07-f5b450ac0082 | Drifloon | holo | dp7 |
| dp7 | Stormfront | source_acquisition_required | d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff | Dusknoir | holo | dp7 |
| dp7 | Stormfront | source_acquisition_required | 7c211bf2-ab9e-489d-842f-65c896270783 | Heatran | holo | dp7 |
| dp7 | Stormfront | source_acquisition_required | 6f49c231-0a53-4c0c-9db1-6d4c36aa460e | Machamp | holo | dp7 |
| dp7 | Stormfront | source_acquisition_required | 7a0dbe87-8ffb-4939-a5c0-371a0a21b302 | Raichu | holo | dp7 |
| dp7 | Stormfront | source_acquisition_required | 687811f7-e3d2-41bb-b37d-1e73882551d2 | Regigigas | holo | dp7 |
| xy9 | BREAKpoint | source_acquisition_required | a6d34131-d056-49ae-a8b7-21d808e351f6 | Delinquent | holo\|normal\|reverse | xy9 |
| pl1 | Platinum | source_acquisition_required | cfbaec4b-bc98-4f6f-8b06-a30dbe29af30 | Dialga | holo\|reverse | pl1 |
| pl1 | Platinum | source_acquisition_required | 9d20653b-49ea-4a30-8e18-629267d7397b | Dialga G | holo | pl1 |
| pl1 | Platinum | source_acquisition_required | 1cc5b95e-c5b7-477c-a3c1-1d4c26e10875 | Drapion | holo | pl1 |
| pl1 | Platinum | source_acquisition_required | 9deb3714-1f02-4eb2-a249-6b3b42a106cb | Giratina | holo | pl1 |
| pl1 | Platinum | source_acquisition_required | 74b9d351-aecc-4ff9-8ed2-958311074af7 | Lotad | reverse | pl1 |
| pl1 | Platinum | source_acquisition_required | 182aab06-7802-4dea-90cb-32dfc7cefaab | Palkia G | holo | pl1 |
| pl1 | Platinum | source_acquisition_required | 24bd8689-4031-40d0-8948-1d08e652ef34 | Shaymin | holo | pl1 |
| pl1 | Platinum | source_acquisition_required | 1f03518a-bed9-4c04-ad0c-3a5cf3008248 | Shaymin | holo | pl1 |
| cel25 | Celebrations | source_acquisition_required | aedd9f51-0d41-48de-a35d-2df67bb72046 | Claydol | holo | cel25 |
| cel25 | Celebrations | source_acquisition_required | 8e4958ab-1e4e-4636-87e1-4650ae938086 | Here Comes Team Rocket! | holo | cel25 |
| cel25 | Celebrations | source_acquisition_required | d7e84443-dae0-4d48-b32a-b2719ec4d670 | Rocket's Zapdos | holo | cel25 |
| cel25 | Celebrations | source_acquisition_required | 90685cb5-3cfd-4fd8-a4dd-2664e00c4eb0 | Venusaur | holo | cel25 |
| pl3 | Supreme Victors | source_acquisition_required | 8cd92a82-149d-43b4-a7d3-d65782536182 | Absol G | holo | pl3 |
| pl3 | Supreme Victors | source_acquisition_required | 79097350-eb58-44e8-bd39-3ec5f417f02b | Blaziken FB | holo | pl3 |
| pl3 | Supreme Victors | source_acquisition_required | 880dc8c7-6959-4fda-b79a-32e48c684267 | Charizard G | holo | pl3 |
| pl3 | Supreme Victors | source_acquisition_required | 29a4bca4-6264-45f6-bc24-1d5ded5520cd | Electivire FB | holo | pl3 |
| pl3 | Supreme Victors | source_acquisition_required | 2c1b3125-dd67-4522-b3e0-5621c05f7a9a | Garchomp C | holo | pl3 |
| pl3 | Supreme Victors | source_acquisition_required | 89f61622-12a4-4861-abb3-ef3dbcaf2a86 | Rayquaza C | holo | pl3 |
| pl3 | Supreme Victors | source_acquisition_required | 9089264b-fd13-4261-94ac-b252ab89f6c7 | Relicanth | reverse | pl3 |
| pl3 | Supreme Victors | source_acquisition_required | fa6310ae-be43-4309-af1d-a5033daff2f0 | Staraptor FB | holo | pl3 |
| pl4 | Arceus | source_acquisition_required | 3059259e-c28b-49d6-9f31-64e178e87f28 | Swalot | holo\|normal\|reverse | pl4 |
| pl4 | Arceus | source_acquisition_required | 227298d6-9bec-4197-98c6-7ede8ae05cf9 | Beedrill | normal\|reverse | pl4 |
| pl4 | Arceus | source_acquisition_required | a02f871c-fe3e-432b-944d-6decea0eecdf | Charizard | holo\|reverse | pl4 |
| pl4 | Arceus | source_acquisition_required | 71779a8b-ee22-4892-9425-8e3da51f179a | Mothim | holo\|reverse | pl4 |
| pl4 | Arceus | source_acquisition_required | 45ce6c25-7aba-4bf7-8cff-ce1dd9030fb3 | Porygon-Z | normal\|reverse | pl4 |
| pl4 | Arceus | source_acquisition_required | 8716f287-3497-49b2-a499-9c1e026a6a94 | Zapdos | holo\|reverse | pl4 |
| pl4 | Arceus | source_acquisition_required | cf859f9b-f1d6-41ec-9e38-c7fd27743777 | Arceus | holo | pl4 |
| pl4 | Arceus | source_acquisition_required | 8b2c91cf-bd7c-4564-84ca-5863e1414257 | Arceus | holo | pl4 |
| pl2 | Rising Rivals | source_acquisition_required | 1970689f-8f93-4148-96b2-0ed8ed149568 | Flygon | holo\|normal\|reverse | pl2 |
| pl2 | Rising Rivals | source_acquisition_required | ea5af9d8-3a57-4483-8fc2-5d13323bd144 | Alakazam 4 | normal\|reverse | pl2 |
| pl2 | Rising Rivals | source_acquisition_required | 2ebe059c-614e-4dd6-812f-ebf268459ce5 | Arcanine | holo\|reverse | pl2 |
| pl2 | Rising Rivals | source_acquisition_required | 6d87f138-46ab-49a4-8f84-5f3f7aee1cca | Bronzong 4 | normal\|reverse | pl2 |
| pl2 | Rising Rivals | source_acquisition_required | 9d6eb3c7-dc61-4543-b436-a67fd23ba16c | Darkrai G | holo\|reverse | pl2 |
| pl2 | Rising Rivals | source_acquisition_required | 333a3f96-f983-4ffb-8fc9-e439de00f466 | Drapion 4 | normal\|reverse | pl2 |
| pl2 | Rising Rivals | source_acquisition_required | c157b2e8-69e6-4d78-9d39-0e605e179991 | Espeon 4 | normal\|reverse | pl2 |
| pl2 | Rising Rivals | source_acquisition_required | d36e276b-06bb-46a3-8a72-4f6d544d9da3 | Flareon 4 | normal\|reverse | pl2 |
| bw11 | Legendary Treasures | source_acquisition_required | bef9f1a1-27d7-4e71-ab9e-64aab82e30bf | Charmander | holo\|normal\|reverse | bw11 |
| bw11 | Legendary Treasures | source_acquisition_required | 58b916a9-9516-4988-b05b-d91803b7a223 | Cinccino | holo\|normal\|reverse | bw11 |
| bw11 | Legendary Treasures | source_acquisition_required | d57d16ff-5e21-4e58-9cf2-791d3130d57e | Eevee | holo\|normal\|reverse | bw11 |
| bw11 | Legendary Treasures | source_acquisition_required | d56ed317-6505-4578-9aa5-40fd5fc84f69 | Elesa | holo\|normal\|reverse | bw11 |
| bw11 | Legendary Treasures | source_acquisition_required | 5fc644f5-26c9-4f5c-aecb-4dbb703010b4 | Emolga | holo\|normal\|reverse | bw11 |
| bw11 | Legendary Treasures | source_acquisition_required | a53e052b-7854-4044-91eb-a3b7695f5a7b | Gardevoir | holo\|normal\|reverse | bw11 |
