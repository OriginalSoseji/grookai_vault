# English Master Index Physical Recovery Apply Design V1

This is an audit-only apply design packet for PKG-01 physical missing-set recovery.

It is not executable, not approved, and does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Decision

- apply_design_status: apply_design_blocked_stop_findings_present
- approval_status: operator_approval_required_before_any_write
- conclusion: Stop findings must be resolved before this can be reviewed as an apply design.
- write_ready_now: 0
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

| Metric | Value |
| --- | ---: |
| package_count | 18 |
| candidate_card_prints | 422 |
| candidate_printing_rows | 643 |
| before_child_printing_rows | 643 |
| external_mappings_referencing_targets | 448 |
| identity_rows_referencing_targets | 422 |
| trait_rows_referencing_targets | 422 |
| vault_items_referencing_targets | 4 |
| stop_findings | 3 |
| write_ready_now | 0 |

## Changed Parent Fields

| Field | Rows |
| --- | ---: |
| name | 11 |
| number | 380 |
| set_code | 422 |

## Packages

| Set | Name | Parents | Printings | Changed Fields | Vault Items | Status |
| --- | --- | ---: | ---: | --- | ---: | --- |
| 2021swsh | McDonald's Collection 2021 | 25 | 50 | set_code:25 | 0 | approval_required_no_write |
| col1 | Call of Legends | 2 | 6 | number:2, set_code:2 | 0 | approval_required_no_write |
| dp7 | Stormfront | 8 | 10 | number:8, set_code:8 | 0 | approval_required_no_write |
| ecard2 | Aquapolis | 13 | 26 | set_code:13 | 0 | approval_required_no_write |
| ecard3 | Skyridge | 15 | 19 | number:11, set_code:15 | 0 | approval_required_no_write |
| ex10 | Unseen Forces | 3 | 3 | name:3, number:3, set_code:3 | 0 | approval_required_no_write |
| me01 | Mega Evolution | 77 | 151 | number:77, set_code:77 | 2 | approval_required_no_write |
| mep | MEP Black Star Promos | 10 | 10 | number:10, set_code:10 | 0 | approval_required_no_write |
| pl1 | Platinum | 9 | 10 | number:9, set_code:9 | 0 | approval_required_no_write |
| pl2 | Rising Rivals | 17 | 24 | name:2, number:17, set_code:17 | 0 | approval_required_no_write |
| pl3 | Supreme Victors | 9 | 9 | number:9, set_code:9 | 0 | approval_required_no_write |
| pl4 | Arceus | 18 | 23 | name:6, number:18, set_code:18 | 0 | approval_required_no_write |
| sv04.5 | Paldean Fates | 108 | 148 | number:108, set_code:108 | 1 | approval_required_no_write |
| sv06.5 | Shrouded Fable | 52 | 69 | number:52, set_code:52 | 1 | approval_required_no_write |
| sv08.5 | Prismatic Evolutions | 20 | 40 | number:20, set_code:20 | 0 | approval_required_no_write |
| swsh10.5 | Pokémon GO | 33 | 39 | number:33, set_code:33 | 0 | approval_required_no_write |
| swsh2 | Rebel Clash | 1 | 2 | number:1, set_code:1 | 0 | approval_required_no_write |
| swsh4.5 | Shining Fates | 2 | 4 | number:2, set_code:2 | 0 | approval_required_no_write |

## Mutation Design Matrix

| Set | Card Print ID | Before Set | After Set | Before Number | After Number | Before Name | After Name | Generated Readback | Children | Vault Items |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 2021swsh | d34033e2-a8e8-4e72-b1e9-2033445e8f00 |  | 2021swsh | 1 | 1 | Bulbasaur | Bulbasaur | number_plain=1 | 2 | 0 |
| 2021swsh | 987099f7-59e9-4c0a-9bbb-a0b8fa24a086 |  | 2021swsh | 2 | 2 | Chikorita | Chikorita | number_plain=2 | 2 | 0 |
| 2021swsh | ac2987ab-7972-4e0a-bd34-eecdc494b8b9 |  | 2021swsh | 3 | 3 | Treecko | Treecko | number_plain=3 | 2 | 0 |
| 2021swsh | 53ab14f5-7e43-4098-8eb6-77beb4450c99 |  | 2021swsh | 4 | 4 | Turtwig | Turtwig | number_plain=4 | 2 | 0 |
| 2021swsh | 99449877-8fd5-4651-bd39-2321b2bffff5 |  | 2021swsh | 5 | 5 | Snivy | Snivy | number_plain=5 | 2 | 0 |
| 2021swsh | e95d8646-b98f-4c8c-a01d-2e499c02aa82 |  | 2021swsh | 6 | 6 | Chespin | Chespin | number_plain=6 | 2 | 0 |
| 2021swsh | cb3e5ff6-ace4-44ca-99e0-91098dff5bba |  | 2021swsh | 7 | 7 | Rowlet | Rowlet | number_plain=7 | 2 | 0 |
| 2021swsh | 6613c2ff-8bad-465b-b186-78c6ac7b9c26 |  | 2021swsh | 8 | 8 | Grookey | Grookey | number_plain=8 | 2 | 0 |
| 2021swsh | 9421cd5e-2640-44c5-8044-47aaa7a7954a |  | 2021swsh | 9 | 9 | Charmander | Charmander | number_plain=9 | 2 | 0 |
| 2021swsh | ac9e8297-6e39-419f-8fa0-f58e90c80c01 |  | 2021swsh | 10 | 10 | Cyndaquil | Cyndaquil | number_plain=10 | 2 | 0 |
| 2021swsh | c13e4ceb-5988-4215-8462-fc378bbe5e46 |  | 2021swsh | 11 | 11 | Torchic | Torchic | number_plain=11 | 2 | 0 |
| 2021swsh | cefedf7b-f1c0-42f7-af7d-e6e9279358f3 |  | 2021swsh | 12 | 12 | Chimchar | Chimchar | number_plain=12 | 2 | 0 |
| 2021swsh | 43d5432d-7152-40de-9660-dd2893847b8a |  | 2021swsh | 13 | 13 | Tepig | Tepig | number_plain=13 | 2 | 0 |
| 2021swsh | 0980ca25-d2fb-43a3-a74f-789e6a0f8f51 |  | 2021swsh | 14 | 14 | Fennekin | Fennekin | number_plain=14 | 2 | 0 |
| 2021swsh | 229d3337-9150-428f-9259-36ee0a0636e2 |  | 2021swsh | 15 | 15 | Litten | Litten | number_plain=15 | 2 | 0 |
| 2021swsh | d74fe432-2990-49c2-b908-9c0fcec9eefa |  | 2021swsh | 16 | 16 | Scorbunny | Scorbunny | number_plain=16 | 2 | 0 |
| 2021swsh | 0bc143c0-b558-447e-864c-c71c02e3c2b2 |  | 2021swsh | 17 | 17 | Squirtle | Squirtle | number_plain=17 | 2 | 0 |
| 2021swsh | 12a7e22b-6d1a-4833-a2fd-c2f020ef0007 |  | 2021swsh | 18 | 18 | Totodile | Totodile | number_plain=18 | 2 | 0 |
| 2021swsh | 29d1fb6e-f0be-4ce1-a0b2-458845d33cad |  | 2021swsh | 19 | 19 | Mudkip | Mudkip | number_plain=19 | 2 | 0 |
| 2021swsh | f36b29e8-8e24-4e0b-810a-5945738a1df7 |  | 2021swsh | 20 | 20 | Piplup | Piplup | number_plain=20 | 2 | 0 |
| 2021swsh | c9dbc8fc-b83a-4edb-acbe-d50c05e8a4f1 |  | 2021swsh | 21 | 21 | Oshawott | Oshawott | number_plain=21 | 2 | 0 |
| 2021swsh | 3f8c67ec-ac7c-4c02-b46d-a7ff9e9af0b2 |  | 2021swsh | 22 | 22 | Froakie | Froakie | number_plain=22 | 2 | 0 |
| 2021swsh | dd92a89a-084a-424a-b073-d1564e113919 |  | 2021swsh | 23 | 23 | Popplio | Popplio | number_plain=23 | 2 | 0 |
| 2021swsh | 63ce9abe-eb16-4e0b-8a24-caa5cf820a82 |  | 2021swsh | 24 | 24 | Sobble | Sobble | number_plain=24 | 2 | 0 |
| 2021swsh | be9b1912-c62b-46d9-9081-acaefe8cf0c2 |  | 2021swsh | 25 | 25 | Pikachu | Pikachu | number_plain=25 | 2 | 0 |
| col1 | 2180d1db-0948-4cfc-9a98-da7629c2811a |  | col1 |  | 6 | Groudon | Groudon | number_plain=6 | 3 | 0 |
| col1 | 922f2b4f-eb6f-492c-89a7-8b4f313509e2 |  | col1 |  | 8 | Hitmontop | Hitmontop | number_plain=8 | 3 | 0 |
| dp7 | 62f77935-5749-4d26-87e6-06bbca565b22 |  | dp7 |  | 2 | Empoleon | Empoleon | number_plain=2 | 2 | 0 |
| dp7 | 665ee2b0-4a22-43d5-bf8e-8ff22a990384 |  | dp7 |  | 3 | Infernape | Infernape | number_plain=3 | 2 | 0 |
| dp7 | d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff |  | dp7 |  | 96 | Dusknoir | Dusknoir | number_plain=96 | 1 | 0 |
| dp7 | 7c211bf2-ab9e-489d-842f-65c896270783 |  | dp7 |  | 97 | Heatran | Heatran | number_plain=97 | 1 | 0 |
| dp7 | 6f49c231-0a53-4c0c-9db1-6d4c36aa460e |  | dp7 |  | 98 | Machamp | Machamp | number_plain=98 | 1 | 0 |
| dp7 | 7a0dbe87-8ffb-4939-a5c0-371a0a21b302 |  | dp7 |  | 99 | Raichu | Raichu | number_plain=99 | 1 | 0 |
| dp7 | 687811f7-e3d2-41bb-b37d-1e73882551d2 |  | dp7 |  | 100 | Regigigas | Regigigas | number_plain=100 | 1 | 0 |
| dp7 | e8444009-0c47-48a6-af07-f5b450ac0082 |  | dp7 |  | SH1 | Drifloon | Drifloon | number_plain=SH1 | 1 | 0 |
| ecard2 | 5155d8da-c49b-43cf-8173-1e4ceca853d2 |  | ecard2 | 11 | 11 | Espeon | Espeon | number_plain=11 | 2 | 0 |
| ecard2 | 49008b62-21be-48b8-a561-9dc0bea390e1 |  | ecard2 | 12 | 12 | Exeggutor | Exeggutor | number_plain=12 | 2 | 0 |
| ecard2 | 0f752ca1-5458-4241-af37-4a7b48b85013 |  | ecard2 | 13 | 13 | Exeggutor | Exeggutor | number_plain=13 | 2 | 0 |
| ecard2 | bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88 |  | ecard2 | 15 | 15 | Houndoom | Houndoom | number_plain=15 | 2 | 0 |
| ecard2 | d5e3ba78-7a85-49d2-8ab0-295521652f55 |  | ecard2 | 16 | 16 | Hypno | Hypno | number_plain=16 | 2 | 0 |
| ecard2 | 11591d3d-6574-487e-9958-f0d94bba5af4 |  | ecard2 | 17 | 17 | Jumpluff | Jumpluff | number_plain=17 | 2 | 0 |
| ecard2 | 72b1ec6b-fe84-4190-a0d3-d95155296261 |  | ecard2 | 18 | 18 | Jynx | Jynx | number_plain=18 | 2 | 0 |
| ecard2 | b22dc290-dade-45f8-b488-5d3c921a79a1 |  | ecard2 | 19 | 19 | Kingdra | Kingdra | number_plain=19 | 2 | 0 |
| ecard2 | 0e7d501c-b666-43df-9ee6-82443fcae8cb |  | ecard2 | 20 | 20 | Lanturn | Lanturn | number_plain=20 | 2 | 0 |
| ecard2 | a077e73a-275a-405e-85ac-24b28b6ffe3a |  | ecard2 | 25 | 25 | Ninetales | Ninetales | number_plain=25 | 2 | 0 |
| ecard2 | 898ad06e-aab1-4c1a-b91b-44fdd6069031 |  | ecard2 | 28 | 28 | Porygon2 | Porygon2 | number_plain=28 | 2 | 0 |
| ecard2 | 507f014e-d43d-4b24-b01f-c9635b6aba81 |  | ecard2 | 30 | 30 | Quagsire | Quagsire | number_plain=30 | 2 | 0 |
| ecard2 | 2233732b-ced1-4f51-b45b-603c1c15a65c |  | ecard2 | 32 | 32 | Scizor | Scizor | number_plain=32 | 2 | 0 |
| ecard3 | d0270c83-13c1-4d2b-ae50-19830be9d134 |  | ecard3 | 4 | 4 | Articuno | Articuno | number_plain=4 | 2 | 0 |
| ecard3 | 36a0af86-f863-4ff0-967c-285a67272dcb |  | ecard3 | 6 | 6 | Crobat | Crobat | number_plain=6 | 2 | 0 |
| ecard3 | 6406220f-4684-4f26-a52d-310db5eb5700 |  | ecard3 | 8 | 8 | Flareon | Flareon | number_plain=8 | 2 | 0 |
| ecard3 | 982bd726-548f-4e0c-9a93-c1301af1342f |  | ecard3 | 9 | 9 | Forretress | Forretress | number_plain=9 | 2 | 0 |
| ecard3 | d139fca7-558c-4dad-9a46-f94e4d45ab6b |  | ecard3 |  | H13 | Kabutops | Kabutops | number_plain=H13 | 1 | 0 |
| ecard3 | 8c78b35f-6dd0-4b12-9709-8b4198ad3089 |  | ecard3 |  | H14 | Ledian | Ledian | number_plain=H14 | 1 | 0 |
| ecard3 | 02a4156d-5f67-4969-8288-c440938a923c |  | ecard3 |  | H16 | Magcargo | Magcargo | number_plain=H16 | 1 | 0 |
| ecard3 | bb73d56c-c46f-4341-b4a1-825a10c2406b |  | ecard3 |  | H17 | Magcargo | Magcargo | number_plain=H17 | 1 | 0 |
| ecard3 | 28d7a9bb-fcff-4e93-861d-d200770984d6 |  | ecard3 |  | H18 | Magneton | Magneton | number_plain=H18 | 1 | 0 |
| ecard3 | 415065f4-68dd-44a9-a0f0-d6375e203275 |  | ecard3 |  | H22 | Piloswine | Piloswine | number_plain=H22 | 1 | 0 |
| ecard3 | b7c244c2-35bf-4dbd-836c-1341a777d65e |  | ecard3 |  | H23 | Politoed | Politoed | number_plain=H23 | 1 | 0 |
| ecard3 | e99d7d18-af64-4d34-b62c-8a795f6da2c3 |  | ecard3 |  | H24 | Poliwrath | Poliwrath | number_plain=H24 | 1 | 0 |
| ecard3 | 9a1cc452-e8b4-48bf-acc9-e592fe9cc521 |  | ecard3 |  | H27 | Rhydon | Rhydon | number_plain=H27 | 1 | 0 |
| ecard3 | abcf71f3-edd8-4130-aaa3-b7fecada39e2 |  | ecard3 |  | H30 | Umbreon | Umbreon | number_plain=H30 | 1 | 0 |
| ecard3 | 7cbee94f-9f6a-441d-98e1-6a50da7f72d7 |  | ecard3 |  | H31 | Vaporeon | Vaporeon | number_plain=H31 | 1 | 0 |
| ex10 | 2fdd39c8-7afa-4031-be84-649ac28a7b72 |  | ex10 |  | 113 | Entei Star | Entei ★ | number_plain=113 | 1 | 0 |
| ex10 | 043dbc47-0815-4ef4-b31d-2027f70f2338 |  | ex10 |  | 114 | Raikou Star | Raikou ★ | number_plain=114 | 1 | 0 |
| ex10 | 584c31ad-d7ac-4356-b9cc-4de3152511b2 |  | ex10 |  | 115 | Suicune Star | Suicune ★ | number_plain=115 | 1 | 0 |
| me01 | 35ec8ca0-6bc7-4b2a-9077-94bf42c4fecb |  | me01 |  | 001 | Bulbasaur | Bulbasaur | number_plain=001 | 2 | 0 |
| me01 | 9de52da6-5c3c-4621-8cec-b01a9db1e4d7 |  | me01 |  | 004 | Exeggcute | Exeggcute | number_plain=004 | 2 | 0 |
| me01 | 2314a826-39ad-4782-9c0a-465c25f8fe48 |  | me01 |  | 006 | Tangela | Tangela | number_plain=006 | 2 | 0 |
| me01 | 80a83fe5-ccc6-4f14-b060-af5ee3bd56c4 |  | me01 |  | 007 | Tangrowth | Tangrowth | number_plain=007 | 2 | 0 |
| me01 | 7d4af188-1b3c-4c6b-8a9b-cb426f11d87b |  | me01 |  | 008 | Chikorita | Chikorita | number_plain=008 | 2 | 0 |
| me01 | 493cbe02-e42b-4ca0-97cb-f9b75584c66f |  | me01 |  | 009 | Bayleef | Bayleef | number_plain=009 | 2 | 0 |
| me01 | 711a2789-6c0b-4c7b-8e5a-15c865deb444 |  | me01 |  | 010 | Meganium | Meganium | number_plain=010 | 3 | 0 |
| me01 | 2c818714-a5c7-426f-8a8f-9e5db12ba941 |  | me01 |  | 011 | Shuckle | Shuckle | number_plain=011 | 2 | 0 |
| me01 | a2aae959-98c0-453d-a3e5-196b774acf77 |  | me01 |  | 012 | Celebi | Celebi | number_plain=012 | 2 | 0 |
| me01 | 37f0dcda-5da9-41af-ba5e-6d92c01b2676 |  | me01 |  | 013 | Seedot | Seedot | number_plain=013 | 2 | 0 |
| me01 | ab5d40b5-ae91-40cd-a3b2-c085eb226c15 |  | me01 |  | 014 | Nuzleaf | Nuzleaf | number_plain=014 | 2 | 0 |
| me01 | 223177d5-5156-4bca-97ed-a55405d506bd |  | me01 |  | 015 | Shiftry | Shiftry | number_plain=015 | 2 | 0 |
| me01 | 5e8491ad-fbc4-4e97-b73f-03b6666ffff5 |  | me01 |  | 016 | Nincada | Nincada | number_plain=016 | 2 | 0 |
| me01 | 756b62e3-5bf9-4aa7-9204-5682cb5f312c |  | me01 |  | 017 | Ninjask | Ninjask | number_plain=017 | 2 | 0 |
| me01 | b01f0f86-df22-4b41-b8ad-e4d1053d6812 |  | me01 |  | 018 | Dhelmise | Dhelmise | number_plain=018 | 2 | 0 |
| me01 | 3a862499-6f17-4531-85d2-30dfc726d882 |  | me01 |  | 019 | Vulpix | Vulpix | number_plain=019 | 2 | 0 |
| me01 | 728642b0-10e0-47fe-902e-acc0cc0f7c6f |  | me01 |  | 020 | Ninetales | Ninetales | number_plain=020 | 2 | 0 |
| me01 | e4ccbd91-a03c-416d-969a-af1c8faa7d0f |  | me01 |  | 021 | Numel | Numel | number_plain=021 | 2 | 0 |
| me01 | d13cd05f-d7f8-47c1-92bf-76196414895f |  | me01 |  | 022 | Mega Camerupt ex | Mega Camerupt ex | number_plain=022 | 1 | 1 |
| me01 | 3a300a8d-7e5c-4744-9b3b-2961adcd57a2 |  | me01 |  | 023 | Litleo | Litleo | number_plain=023 | 2 | 0 |
| me01 | c906523d-dd38-4899-b343-9339ab6ee3f7 |  | me01 |  | 025 | Volcanion | Volcanion | number_plain=025 | 2 | 0 |
| me01 | f2a6ce1c-3b4b-4b21-a367-25c6c9a4e2fd |  | me01 |  | 026 | Scorbunny | Scorbunny | number_plain=026 | 2 | 0 |
| me01 | d7e33cc1-581b-4b4c-8497-be10892dbe0f |  | me01 |  | 027 | Raboot | Raboot | number_plain=027 | 2 | 0 |
| me01 | 3b3e22cf-5165-41ec-9b6e-b441e00528fe |  | me01 |  | 029 | Sizzlipede | Sizzlipede | number_plain=029 | 2 | 0 |
| me01 | 3bdab7d9-494e-429a-85c4-5bc4f60b56a5 |  | me01 |  | 030 | Centiskorch | Centiskorch | number_plain=030 | 2 | 0 |
| me01 | 9458269b-b01d-48a1-a299-ee775da3f6b8 |  | me01 |  | 031 | Chi-Yu | Chi-Yu | number_plain=031 | 2 | 0 |
| me01 | 46bb2c65-85ca-4e54-82c8-bd4dc9709d3d |  | me01 |  | 032 | Mantine | Mantine | number_plain=032 | 2 | 0 |
| me01 | d6783e4a-9296-4fec-a85a-98f170b8ecdb |  | me01 |  | 033 | Corphish | Corphish | number_plain=033 | 2 | 0 |
| me01 | 36d01240-1013-435a-8216-4b9b333a8281 |  | me01 |  | 034 | Kyogre | Kyogre | number_plain=034 | 2 | 0 |
| me01 | fb0d293a-e731-45d7-af05-85dfe35b6da8 |  | me01 |  | 035 | Snover | Snover | number_plain=035 | 2 | 0 |
| me01 | 6041ea6e-d598-45cd-82d5-43ff9af86265 |  | me01 |  | 036 | Mega Abomasnow ex | Mega Abomasnow ex | number_plain=036 | 1 | 0 |
| me01 | 03253b6e-c0ca-420e-9b5c-548142b39f81 |  | me01 |  | 037 | Clauncher | Clauncher | number_plain=037 | 2 | 0 |
| me01 | 994a32c6-4774-400e-ad94-ef39aaba0836 |  | me01 |  | 038 | Clawitzer | Clawitzer | number_plain=038 | 2 | 0 |
| me01 | e392d99c-0dbe-44b7-8d41-a2c8f6947c65 |  | me01 |  | 039 | Sobble | Sobble | number_plain=039 | 2 | 0 |
| me01 | cc6e8e9a-0505-49f6-917f-782f106de7f4 |  | me01 |  | 040 | Drizzile | Drizzile | number_plain=040 | 2 | 0 |
| me01 | b23ef0b8-9ab7-4333-9ec7-10555b8ae142 |  | me01 |  | 041 | Inteleon | Inteleon | number_plain=041 | 2 | 0 |
| me01 | 7a9e718f-f302-455c-a90a-4dd024d773b6 |  | me01 |  | 042 | Snom | Snom | number_plain=042 | 2 | 0 |
| me01 | 4b1ec036-6918-451c-b8d8-504347b96fa1 |  | me01 |  | 043 | Frosmoth | Frosmoth | number_plain=043 | 2 | 0 |
| me01 | 079a15ab-610e-4d7e-b8ba-f4dff5ac97c9 |  | me01 |  | 044 | Eiscue | Eiscue | number_plain=044 | 2 | 0 |
| me01 | c910f0c6-98f9-48c9-9a97-44a7d766a91c |  | me01 |  | 045 | Magnemite | Magnemite | number_plain=045 | 2 | 0 |
| me01 | 61df2e14-a9e4-4741-a957-4fef75468dee |  | me01 |  | 046 | Magneton | Magneton | number_plain=046 | 2 | 0 |
| me01 | a4240ebf-2820-4455-90a5-5e24c780758d |  | me01 |  | 047 | Magnezone | Magnezone | number_plain=047 | 2 | 0 |
| me01 | 4b121129-bf0a-4835-8af6-dbed0c23b962 |  | me01 |  | 049 | Electrike | Electrike | number_plain=049 | 2 | 0 |
| me01 | df1a84f9-7a7c-44a6-bce2-b6a21947ac8f |  | me01 |  | 050 | Mega Manectric ex | Mega Manectric ex | number_plain=050 | 1 | 0 |
| me01 | a3c9641f-5152-4bc9-aec6-f7f5f836a5b6 |  | me01 |  | 051 | Pachirisu | Pachirisu | number_plain=051 | 2 | 0 |
| me01 | 007c91d0-6e49-4654-b88e-da105cd4bac9 |  | me01 |  | 052 | Helioptile | Helioptile | number_plain=052 | 2 | 0 |
| me01 | 9b837cfd-0f7f-4bd1-ab75-c9b8c14ba027 |  | me01 |  | 056 | Alakazam | Alakazam | number_plain=056 | 2 | 0 |
| me01 | 91eba394-d9a1-4e7e-926f-381d2abd8a32 |  | me01 |  | 057 | Jynx | Jynx | number_plain=057 | 2 | 0 |
| me01 | addfd1d7-c1cc-42e4-a4c2-ffddbba89022 |  | me01 |  | 060 | Mega Gardevoir ex | Mega Gardevoir ex | number_plain=060 | 1 | 0 |
| me01 | 006ee906-bf8c-46dd-9e14-ac623ba3c596 |  | me01 |  | 061 | Shedinja | Shedinja | number_plain=061 | 2 | 0 |
| me01 | 99d7e313-27de-4da7-a10e-3d2bb898ebcd |  | me01 |  | 063 | Grumpig | Grumpig | number_plain=063 | 2 | 0 |
| me01 | e003f060-6249-47f6-b31b-e2cb4cac5611 |  | me01 |  | 064 | Xerneas | Xerneas | number_plain=064 | 3 | 0 |
| me01 | 33096065-fff0-42f9-9df2-52516e55cd04 |  | me01 |  | 065 | Greavard | Greavard | number_plain=065 | 2 | 0 |
| me01 | 56611277-9b14-49e5-b71a-4fc1c675f973 |  | me01 |  | 066 | Houndstone | Houndstone | number_plain=066 | 2 | 0 |
| me01 | 952acdf6-f707-4bac-a111-133a2d456207 |  | me01 |  | 067 | Gimmighoul | Gimmighoul | number_plain=067 | 2 | 0 |
| me01 | 29cd9592-1684-425b-9102-000c335f53b5 |  | me01 |  | 069 | Sandslash | Sandslash | number_plain=069 | 2 | 0 |
| me01 | b522fb51-1555-4d51-94a4-359988bbbe5f |  | me01 |  | 070 | Onix | Onix | number_plain=070 | 2 | 0 |
| me01 | 61a36b8f-49cd-4200-9e4b-49a2a042060c |  | me01 |  | 071 | Tyrogue | Tyrogue | number_plain=071 | 2 | 0 |
| me01 | 38d96ab4-73b8-4a03-9b2a-2d0439e3effc |  | me01 |  | 072 | Makuhita | Makuhita | number_plain=072 | 2 | 0 |
| me01 | 4faab1bd-e8ce-4fe8-8fda-cd2167875850 |  | me01 |  | 073 | Hariyama | Hariyama | number_plain=073 | 3 | 0 |
| me01 | f6c13207-e0b4-413d-a54d-f7eab7cdeadb |  | me01 |  | 077 | Mega Lucario ex | Mega Lucario ex | number_plain=077 | 1 | 1 |
| me01 | 564ce33e-8dce-40b9-abad-b71b85e50bb6 |  | me01 |  | 079 | Toxicroak | Toxicroak | number_plain=079 | 2 | 0 |
| me01 | 8fbc6c9f-5494-4a27-88ec-b47b75626670 |  | me01 |  | 081 | Stonjourner | Stonjourner | number_plain=081 | 2 | 0 |
| me01 | 1b68a134-7b27-448d-b27d-bd6c792e1cf1 |  | me01 |  | 082 | Nacli | Nacli | number_plain=082 | 2 | 0 |
| me01 | 4e4b3fa7-31fc-4740-a617-5be4d5ad453e |  | me01 |  | 083 | Naclstack | Naclstack | number_plain=083 | 2 | 0 |
| me01 | cea4de22-3921-46bf-a88a-41a60978a936 |  | me01 |  | 085 | Crawdaunt | Crawdaunt | number_plain=085 | 2 | 0 |
| me01 | 8be2f619-a4eb-4cb3-85f2-550e1bd332e7 |  | me01 |  | 087 | Spiritomb | Spiritomb | number_plain=087 | 2 | 0 |
| me01 | 69c0e94b-9641-410a-a9f3-62b5bd0b6a79 |  | me01 |  | 088 | Yveltal | Yveltal | number_plain=088 | 2 | 0 |
| me01 | c1d12a78-15fd-4101-92b1-d03e06aab576 |  | me01 |  | 089 | Nickit | Nickit | number_plain=089 | 2 | 0 |
| me01 | 1df8b92b-eff7-4f4d-a82f-1302c9885a80 |  | me01 |  | 090 | Thievul | Thievul | number_plain=090 | 2 | 0 |
| me01 | 0003593d-5fc1-4f51-a5fa-4211e946c257 |  | me01 |  | 091 | Shroodle | Shroodle | number_plain=091 | 2 | 0 |
| me01 | 2fbd7a5a-fb64-4dda-889d-ff2ba59aac7e |  | me01 |  | 092 | Grafaiai | Grafaiai | number_plain=092 | 2 | 0 |
| me01 | d05ad932-fbfe-40b6-b812-2097add0e93c |  | me01 |  | 094 | Mega Mawile ex | Mega Mawile ex | number_plain=094 | 1 | 0 |
| me01 | 36dea4d3-2ca5-4397-a359-cfbf98023aab |  | me01 |  | 096 | Tinkatink | Tinkatink | number_plain=096 | 2 | 0 |
| me01 | 0af77d06-ad91-4f6d-a5fb-c53f2a349628 |  | me01 |  | 097 | Tinkatuff | Tinkatuff | number_plain=097 | 2 | 0 |
| me01 | 90da4fea-bf5b-4335-a5f5-dcb7fab86958 |  | me01 |  | 098 | Tinkaton | Tinkaton | number_plain=098 | 2 | 0 |
| me01 | 20f18283-9337-47d2-a807-37f019221717 |  | me01 |  | 099 | Gholdengo | Gholdengo | number_plain=099 | 2 | 0 |
| mep | 6419894a-137f-4fc7-8db1-fa853872b190 |  | mep | 1 | 001 | Meganium | Meganium | number_plain=001 | 1 | 0 |
| mep | b75d4730-3c1a-42ca-9d18-e8ca736ae41f |  | mep | 2 | 002 | Inteleon | Inteleon | number_plain=002 | 1 | 0 |
| mep | aa9f207d-c9ea-4607-bbc5-448648bca47f |  | mep | 3 | 003 | Alakazam | Alakazam | number_plain=003 | 1 | 0 |
| mep | bf523703-271c-49fe-b8aa-c31c57cb9b32 |  | mep | 4 | 004 | Lunatone | Lunatone | number_plain=004 | 1 | 0 |
| mep | 04e533ae-dd17-478c-ab46-220859079b2c |  | mep | 5 | 005 | Drifloon | Drifloon | number_plain=005 | 1 | 0 |
| mep | ac2b6cf7-6873-44e8-96b9-e03a179fae51 |  | mep | 6 | 006 | Drifblim | Drifblim | number_plain=006 | 1 | 0 |
| mep | 870f45fe-0680-4a92-b77b-dd03a6018bd3 |  | mep | 7 | 007 | Psyduck | Psyduck | number_plain=007 | 1 | 0 |
| mep | 47f874b2-ea20-4b89-af44-085905bb1f60 |  | mep | 8 | 008 | Golduck | Golduck | number_plain=008 | 1 | 0 |
| mep | a3624761-be25-4841-83e4-c5936ec434fe |  | mep | 9 | 009 | Alakazam | Alakazam | number_plain=009 | 1 | 0 |
| mep | 242de512-f2fb-4994-9615-6c1e2c55ac02 |  | mep | 10 | 010 | Riolu | Riolu | number_plain=010 | 1 | 0 |
| pl1 | cfbaec4b-bc98-4f6f-8b06-a30dbe29af30 |  | pl1 |  | 6 | Dialga | Dialga | number_plain=6 | 2 | 0 |
| pl1 | 9d20653b-49ea-4a30-8e18-629267d7397b |  | pl1 |  | 122 | Dialga G | Dialga G | number_plain=122 | 1 | 0 |
| pl1 | 1cc5b95e-c5b7-477c-a3c1-1d4c26e10875 |  | pl1 |  | 123 | Drapion | Drapion | number_plain=123 | 1 | 0 |
| pl1 | 9deb3714-1f02-4eb2-a249-6b3b42a106cb |  | pl1 |  | 124 | Giratina | Giratina | number_plain=124 | 1 | 0 |
| pl1 | 182aab06-7802-4dea-90cb-32dfc7cefaab |  | pl1 |  | 125 | Palkia G | Palkia G | number_plain=125 | 1 | 0 |
| pl1 | 24bd8689-4031-40d0-8948-1d08e652ef34 |  | pl1 |  | 126 | Shaymin | Shaymin | number_plain=126 | 1 | 0 |
| pl1 | 1f03518a-bed9-4c04-ad0c-3a5cf3008248 |  | pl1 |  | 127 | Shaymin | Shaymin | number_plain=127 | 1 | 0 |
| pl1 | 74b9d351-aecc-4ff9-8ed2-958311074af7 |  | pl1 |  | SH4 | Lotad | Lotad | number_plain=SH4 | 1 | 0 |
| pl1 | e48e17b9-b693-4882-9e9f-d177dbce37c8 |  | pl1 |  | SH5 | Swablu | Swablu | number_plain=SH5 | 1 | 0 |
| pl2 | 2ebe059c-614e-4dd6-812f-ebf268459ce5 |  | pl2 |  | 1 | Arcanine | Arcanine | number_plain=1 | 2 | 0 |
| pl2 | 9d6eb3c7-dc61-4543-b436-a67fd23ba16c |  | pl2 |  | 3 | Darkrai G | Darkrai G | number_plain=3 | 2 | 0 |
| pl2 | 1970689f-8f93-4148-96b2-0ed8ed149568 |  | pl2 |  | 5 | Flygon | Flygon | number_plain=5 | 3 | 0 |
| pl2 | 8c817161-627f-4ff5-aa27-127757b88213 |  | pl2 |  | 71 | Nidoran♀ | Nidoran ♀ | number_plain=71 | 2 | 0 |
| pl2 | bc120b0e-4aad-47c1-989b-a733435a2000 |  | pl2 |  | 72 | Nidoran♂ | Nidoran ♂ | number_plain=72 | 2 | 0 |
| pl2 | f619ad6c-007c-4e4d-bea0-a4a517cffa50 |  | pl2 |  | 95 | Team Galactic's Invention G-107 Technical Machine | Team Galactic's Invention G-107 Technical Machine | number_plain=95 | 2 | 0 |
| pl2 | a1b66404-67e9-4586-8ac9-873c421da31e |  | pl2 |  | 103 | Alakazam 4 | Alakazam 4 | number_plain=103 | 1 | 0 |
| pl2 | 5fd2b141-a2af-4c2c-bb33-df2c2af58c02 |  | pl2 |  | 104 | Floatzel GL | Floatzel GL | number_plain=104 | 1 | 0 |
| pl2 | 7d47083d-43a4-4868-9bac-eb1deb237136 |  | pl2 |  | 105 | Flygon | Flygon | number_plain=105 | 1 | 0 |
| pl2 | 60789fd6-a0bb-49cd-848f-1ba462f4e965 |  | pl2 |  | 106 | Gallade 4 | Gallade 4 | number_plain=106 | 1 | 0 |
| pl2 | 2ef89f59-3bd7-430f-9e71-42fea8cdd8ae |  | pl2 |  | 107 | Hippowdon | Hippowdon | number_plain=107 | 1 | 0 |
| pl2 | a719dd63-f527-4edf-8c8e-e77bac65a715 |  | pl2 |  | 108 | Infernape 4 | Infernape 4 | number_plain=108 | 1 | 0 |
| pl2 | 26d6335d-9483-4de2-8b1b-771c43ab31cb |  | pl2 |  | 110 | Mismagius GL | Mismagius GL | number_plain=110 | 1 | 0 |
| pl2 | 25c91739-b09a-4360-94e5-9a8b1ed43755 |  | pl2 |  | 111 | Snorlax | Snorlax | number_plain=111 | 1 | 0 |
| pl2 | f5ada689-45c1-4b23-ac62-6a9f0bc11c97 |  | pl2 |  | RT2 | Frost Rotom | Frost Rotom | number_plain=RT2 | 1 | 0 |
| pl2 | 949f5c1d-6d29-41cd-91c9-0be81e5360c5 |  | pl2 |  | RT4 | Mow Rotom | Mow Rotom | number_plain=RT4 | 1 | 0 |
| pl2 | 0a14f347-5dd0-425a-9c9c-ffd134a9de4f |  | pl2 |  | RT6 | Charon's Choice | Charon's Choice | number_plain=RT6 | 1 | 0 |
| pl3 | 8cd92a82-149d-43b4-a7d3-d65782536182 |  | pl3 |  | 141 | Absol G | Absol G | number_plain=141 | 1 | 0 |
| pl3 | 79097350-eb58-44e8-bd39-3ec5f417f02b |  | pl3 |  | 142 | Blaziken FB | Blaziken FB | number_plain=142 | 1 | 0 |
| pl3 | 880dc8c7-6959-4fda-b79a-32e48c684267 |  | pl3 |  | 143 | Charizard G | Charizard G | number_plain=143 | 1 | 0 |
| pl3 | 29a4bca4-6264-45f6-bc24-1d5ded5520cd |  | pl3 |  | 144 | Electivire FB | Electivire FB | number_plain=144 | 1 | 0 |
| pl3 | 2c1b3125-dd67-4522-b3e0-5621c05f7a9a |  | pl3 |  | 145 | Garchomp C | Garchomp C | number_plain=145 | 1 | 0 |
| pl3 | 89f61622-12a4-4861-abb3-ef3dbcaf2a86 |  | pl3 |  | 146 | Rayquaza C | Rayquaza C | number_plain=146 | 1 | 0 |
| pl3 | fa6310ae-be43-4309-af1d-a5033daff2f0 |  | pl3 |  | 147 | Staraptor FB | Staraptor FB | number_plain=147 | 1 | 0 |
| pl3 | 9089264b-fd13-4261-94ac-b252ab89f6c7 |  | pl3 |  | SH8 | Relicanth | Relicanth | number_plain=SH8 | 1 | 0 |
| pl3 | e8a8c0b0-2213-4701-89a9-8926cc0d5669 |  | pl3 |  | SH9 | Yanma | Yanma | number_plain=SH9 | 1 | 0 |
| pl4 | a02f871c-fe3e-432b-944d-6decea0eecdf |  | pl4 |  | 1 | Charizard | Charizard | number_plain=1 | 2 | 0 |
| pl4 | 71779a8b-ee22-4892-9425-8e3da51f179a |  | pl4 |  | 6 | Mothim | Mothim | number_plain=6 | 2 | 0 |
| pl4 | 3059259e-c28b-49d6-9f31-64e178e87f28 |  | pl4 |  | 9 | Swalot | Swalot | number_plain=9 | 3 | 0 |
| pl4 | 8716f287-3497-49b2-a499-9c1e026a6a94 |  | pl4 |  | 12 | Zapdos | Zapdos | number_plain=12 | 2 | 0 |
| pl4 | 460e6437-4bc8-4a1c-90fc-546481f225e2 |  | pl4 |  | 94 | Arceus LV. X | Arceus LV.X | number_plain=94 | 1 | 0 |
| pl4 | c5125a59-32a9-4a0f-98af-4cf4ad5d6d64 |  | pl4 |  | 95 | Arceus LV. X | Arceus LV.X | number_plain=95 | 1 | 0 |
| pl4 | ad751d34-d43b-4644-ae2e-622725f781cd |  | pl4 |  | 96 | Arceus LV. X | Arceus LV.X | number_plain=96 | 1 | 0 |
| pl4 | 1352eb03-1519-4e31-b7ad-a2d4af24ef65 |  | pl4 |  | 97 | Gengar LV. X | Gengar LV.X | number_plain=97 | 1 | 0 |
| pl4 | 2fb3462d-4a19-4412-b8cd-848a669549a0 |  | pl4 |  | 98 | Salamence LV. X | Salamence LV.X | number_plain=98 | 1 | 0 |
| pl4 | b319332c-aea7-4f3c-ad4c-02f0874b2d60 |  | pl4 |  | 99 | Tangrowth LV. X | Tangrowth LV.X | number_plain=99 | 1 | 0 |
| pl4 | cf859f9b-f1d6-41ec-9e38-c7fd27743777 |  | pl4 |  | AR2 | Arceus | Arceus | number_plain=AR2 | 1 | 0 |
| pl4 | 8b2c91cf-bd7c-4564-84ca-5863e1414257 |  | pl4 |  | AR3 | Arceus | Arceus | number_plain=AR3 | 1 | 0 |
| pl4 | 61cd00a6-3418-4980-ade8-b26c8d0b4d5c |  | pl4 |  | AR4 | Arceus | Arceus | number_plain=AR4 | 1 | 0 |
| pl4 | 63a0a7b8-bdfa-4a08-ad30-680bcc45802e |  | pl4 |  | AR5 | Arceus | Arceus | number_plain=AR5 | 1 | 0 |
| pl4 | 67e47461-e03c-4da3-8557-d3df639dbb98 |  | pl4 |  | AR7 | Arceus | Arceus | number_plain=AR7 | 1 | 0 |
| pl4 | 0db1b355-bb14-4042-8597-4afd1d9a2b77 |  | pl4 |  | AR8 | Arceus | Arceus | number_plain=AR8 | 1 | 0 |
| pl4 | 502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda |  | pl4 |  | SH10 | Bagon | Bagon | number_plain=SH10 | 1 | 0 |
| pl4 | 22a0396f-a0fe-4680-8568-71246489db3c |  | pl4 |  | SH11 | Ponyta | Ponyta | number_plain=SH11 | 1 | 0 |
| sv04.5 | 5683e068-ffb7-4689-93ed-71df3f25d037 |  | sv04.5 |  | 001 | Pineco | Pineco | number_plain=001 | 2 | 0 |
| sv04.5 | eb2af5ec-a7fb-4792-a54c-30f8ef2e8a8b |  | sv04.5 |  | 002 | Forretress ex | Forretress ex | number_plain=002 | 1 | 0 |
| sv04.5 | 022c209e-c0ff-4e94-beeb-9d784af48afd |  | sv04.5 |  | 004 | Toedscool | Toedscool | number_plain=004 | 2 | 0 |
| sv04.5 | d71315e2-8ea6-40e1-86e2-cf44878ef696 |  | sv04.5 |  | 005 | Toedscruel ex | Toedscruel ex | number_plain=005 | 1 | 0 |
| sv04.5 | ea4af720-a5fc-4698-8cbf-2eb290e8e0d8 |  | sv04.5 |  | 006 | Espathra ex | Espathra ex | number_plain=006 | 1 | 0 |
| sv04.5 | 3729104f-71b2-4242-801a-bec9dc31369b |  | sv04.5 |  | 007 | Charmander | Charmander | number_plain=007 | 2 | 0 |
| sv04.5 | 39599b5f-9417-4d67-9d4f-630e413256a2 |  | sv04.5 |  | 008 | Charmeleon | Charmeleon | number_plain=008 | 2 | 0 |
| sv04.5 | 8a71b7c8-ef01-4c87-b5a6-4974984b14d6 |  | sv04.5 |  | 014 | Charcadet | Charcadet | number_plain=014 | 2 | 0 |
| sv04.5 | 5b3fb3aa-2b58-4997-841f-d6771ec3ebc6 |  | sv04.5 |  | 015 | Armarouge | Armarouge | number_plain=015 | 2 | 0 |
| sv04.5 | 47c5fb97-513b-498f-b486-9f8200c190eb |  | sv04.5 |  | 017 | Frigibax | Frigibax | number_plain=017 | 2 | 0 |
| sv04.5 | 2f06c6c9-7029-443d-ba68-4b6dfae249db |  | sv04.5 |  | 018 | Pikachu | Pikachu | number_plain=018 | 2 | 1 |
| sv04.5 | 6297f5c1-890d-4808-891a-9da9fd74e488 |  | sv04.5 |  | 019 | Raichu | Raichu | number_plain=019 | 2 | 0 |
| sv04.5 | 981463fa-b005-481c-9f58-bd2537c303f8 |  | sv04.5 |  | 022 | Kilowattrel | Kilowattrel | number_plain=022 | 2 | 0 |
| sv04.5 | d3e61e14-24de-4e3a-948a-d20f8c3b5ab1 |  | sv04.5 |  | 025 | Natu | Natu | number_plain=025 | 2 | 0 |
| sv04.5 | f43170ba-0ad7-4d6b-8be6-472ea917f334 |  | sv04.5 |  | 026 | Xatu | Xatu | number_plain=026 | 2 | 0 |
| sv04.5 | 63195337-0d2c-45aa-9b27-c6e81804887b |  | sv04.5 |  | 027 | Ralts | Ralts | number_plain=027 | 2 | 0 |
| sv04.5 | c751326c-70f6-4ef4-aea8-fe50fdee8c41 |  | sv04.5 |  | 028 | Kirlia | Kirlia | number_plain=028 | 2 | 0 |
| sv04.5 | caa0d1ef-8978-4a9d-9471-be026b81b7d6 |  | sv04.5 |  | 029 | Gardevoir ex | Gardevoir ex | number_plain=029 | 1 | 0 |
| sv04.5 | 95642256-f37a-4dfe-aa7f-d040edcfd913 |  | sv04.5 |  | 031 | Mime Jr. | Mime Jr. | number_plain=031 | 2 | 0 |
| sv04.5 | c9741bc3-a9ef-4d2a-936f-1cc9d0e1c7c9 |  | sv04.5 |  | 037 | Mimikyu | Mimikyu | number_plain=037 | 2 | 0 |
| sv04.5 | 21efc498-eb90-420f-8bca-cd36828e49ac |  | sv04.5 |  | 039 | Dachsbun | Dachsbun | number_plain=039 | 2 | 0 |
| sv04.5 | 8cf2db86-e98d-4d06-8882-39e8a6c68d30 |  | sv04.5 |  | 040 | Ceruledge | Ceruledge | number_plain=040 | 2 | 0 |
| sv04.5 | 1d9a2684-98e7-4e6d-92d9-2b2c3c0c4d6c |  | sv04.5 |  | 041 | Flittle | Flittle | number_plain=041 | 2 | 0 |
| sv04.5 | 9dea129c-3d64-4b6a-8550-2847c5b45f1f |  | sv04.5 |  | 043 | Houndstone | Houndstone | number_plain=043 | 2 | 0 |
| sv04.5 | e873f70d-770a-4cd6-b3dc-7d6d6e75874b |  | sv04.5 |  | 045 | Mankey | Mankey | number_plain=045 | 2 | 0 |
| sv04.5 | 781a7cb9-894a-4583-89d8-8c7b9aa180c1 |  | sv04.5 |  | 046 | Primeape | Primeape | number_plain=046 | 2 | 0 |
| sv04.5 | 435c0599-12c2-4042-9401-8290af312bf6 |  | sv04.5 |  | 047 | Annihilape | Annihilape | number_plain=047 | 2 | 0 |
| sv04.5 | 342fa217-9ddb-4b1e-acb7-d958bc7ced80 |  | sv04.5 |  | 054 | Charizard ex | Charizard ex | number_plain=054 | 1 | 0 |
| sv04.5 | f4bbb6a5-7efc-482c-ad91-ade33d3cb951 |  | sv04.5 |  | 058 | Paldean Wooper | Paldean Wooper | number_plain=058 | 2 | 0 |
| sv04.5 | 10bb5109-1801-49ed-8a2b-786fde2e9423 |  | sv04.5 |  | 059 | Paldean Clodsire ex | Paldean Clodsire ex | number_plain=059 | 1 | 0 |
| sv04.5 | b0971232-a14d-4039-9ca4-79ee006e3342 |  | sv04.5 |  | 063 | Mabosstiff | Mabosstiff | number_plain=063 | 2 | 0 |
| sv04.5 | 137e1fe1-8baa-4351-92dc-16fff7687713 |  | sv04.5 |  | 064 | Varoom | Varoom | number_plain=064 | 2 | 0 |
| sv04.5 | 62235f32-cda8-4423-b782-ca2c773a94ea |  | sv04.5 |  | 065 | Revavroom | Revavroom | number_plain=065 | 2 | 0 |
| sv04.5 | 669038cb-8856-471d-a392-ba1dbe019549 |  | sv04.5 |  | 068 | Noibat | Noibat | number_plain=068 | 2 | 0 |
| sv04.5 | 07bc9efc-7ff0-4070-9a85-309245b21919 |  | sv04.5 |  | 069 | Noivern ex | Noivern ex | number_plain=069 | 1 | 0 |
| sv04.5 | 3d5d4c62-83d0-4996-878b-e3a61872f4ac |  | sv04.5 |  | 070 | Cyclizar | Cyclizar | number_plain=070 | 2 | 0 |
| sv04.5 | 6bc0a20c-6763-480d-a23e-0ae313361f02 |  | sv04.5 |  | 071 | Lechonk | Lechonk | number_plain=071 | 2 | 0 |
| sv04.5 | 085a3cb5-d8c9-4750-b53b-968eb1c89f85 |  | sv04.5 |  | 072 | Oinkologne | Oinkologne | number_plain=072 | 2 | 0 |
| sv04.5 | 83300f8d-00bf-4b21-b4d9-55014bb1e051 |  | sv04.5 |  | 073 | Tandemaus | Tandemaus | number_plain=073 | 2 | 0 |
| sv04.5 | 74d9f934-5bb9-4d35-8e0e-924c13559cbc |  | sv04.5 |  | 074 | Maushold | Maushold | number_plain=074 | 2 | 0 |
| sv04.5 | c711d654-f865-4e01-bb83-51a37bc7bb5a |  | sv04.5 |  | 075 | Squawkabilly ex | Squawkabilly ex | number_plain=075 | 1 | 0 |
| sv04.5 | be8f9f47-28a4-4d25-abd5-527f3cf13549 |  | sv04.5 |  | 078 | Clive | Clive | number_plain=078 | 2 | 0 |
| sv04.5 | ac12c85c-33c2-4d09-aa59-65f037d3d8ba |  | sv04.5 |  | 080 | Iono | Iono | number_plain=080 | 2 | 0 |
| sv04.5 | e693095f-36a3-4275-ba98-fd19b3093989 |  | sv04.5 |  | 082 | Nemona | Nemona | number_plain=082 | 2 | 0 |
| sv04.5 | cf012088-486e-4fb5-8f36-e80c9a0f176f |  | sv04.5 |  | 085 | Paldean Student | Paldean Student | number_plain=085 | 2 | 0 |
| sv04.5 | 29e16368-8c5c-4f90-8881-c8294c0f0ae8 |  | sv04.5 |  | 086 | Paldean Student | Paldean Student | number_plain=086 | 2 | 0 |
| sv04.5 | 23361253-6606-47b7-9ad5-0debd1571dbf |  | sv04.5 |  | 087 | Professor's Research | Professor's Research | number_plain=087 | 2 | 0 |
| sv04.5 | 776e8594-2843-4f0a-b83a-92f6ba1421c1 |  | sv04.5 |  | 088 | Professor's Research | Professor's Research | number_plain=088 | 2 | 0 |
| sv04.5 | 10134134-181d-439e-9bc2-6209b2ce9479 |  | sv04.5 |  | 099 | Pineco | Pineco | number_plain=099 | 1 | 0 |
| sv04.5 | 572c0280-a485-4f9a-9aa8-dbe87c02aecc |  | sv04.5 |  | 105 | Toedscool | Toedscool | number_plain=105 | 1 | 0 |
| sv04.5 | 1396ccbe-30a9-4983-be09-ab15ae262b25 |  | sv04.5 |  | 109 | Charmander | Charmander | number_plain=109 | 1 | 0 |
| sv04.5 | ebc68786-487a-4dee-ac92-58ea6a098dea |  | sv04.5 |  | 110 | Charmeleon | Charmeleon | number_plain=110 | 1 | 0 |
| sv04.5 | 65098521-9846-48dc-a83b-1b19267228e4 |  | sv04.5 |  | 111 | Paldean Tauros | Paldean Tauros | number_plain=111 | 1 | 0 |
| sv04.5 | adff063a-78fa-4476-bcc6-4f0370569646 |  | sv04.5 |  | 114 | Charcadet | Charcadet | number_plain=114 | 1 | 0 |
| sv04.5 | 5908a919-1f88-43e3-abc1-818607c0312e |  | sv04.5 |  | 115 | Armarouge | Armarouge | number_plain=115 | 1 | 0 |
| sv04.5 | cc77534d-bd0f-4b56-9d93-72f32cd18e4c |  | sv04.5 |  | 120 | Paldean Tauros | Paldean Tauros | number_plain=120 | 1 | 0 |
| sv04.5 | aedac2dd-0b5e-48f2-a731-fec5f03d012f |  | sv04.5 |  | 122 | Wugtrio | Wugtrio | number_plain=122 | 1 | 0 |
| sv04.5 | 34362874-59c6-4192-a06c-340f6dd3837f |  | sv04.5 |  | 124 | Palafin | Palafin | number_plain=124 | 1 | 0 |
| sv04.5 | d9acc545-3cf3-4271-b9c5-10e4d8e49f4c |  | sv04.5 |  | 128 | Frigibax | Frigibax | number_plain=128 | 1 | 0 |
| sv04.5 | 12be1528-cdb7-49a1-b260-7b99e6bffb0f |  | sv04.5 |  | 131 | Pikachu | Pikachu | number_plain=131 | 1 | 0 |
| sv04.5 | 5f24e43e-de82-4936-aab3-f3adad23546b |  | sv04.5 |  | 132 | Raichu | Raichu | number_plain=132 | 1 | 0 |
| sv04.5 | 3a4a0b76-3090-4101-a7ea-c40c4c873e82 |  | sv04.5 |  | 142 | Pawmi | Pawmi | number_plain=142 | 1 | 0 |
| sv04.5 | c68ac5d8-dae5-470d-9bad-184122f9a7a7 |  | sv04.5 |  | 146 | Kilowattrel | Kilowattrel | number_plain=146 | 1 | 0 |
| sv04.5 | 62e3ae56-ccc5-426c-9deb-7396b90fa860 |  | sv04.5 |  | 151 | Natu | Natu | number_plain=151 | 1 | 0 |
| sv04.5 | 866611cf-097c-499e-b261-307d9042063b |  | sv04.5 |  | 152 | Xatu | Xatu | number_plain=152 | 1 | 0 |
| sv04.5 | c204419b-bb77-4c12-bbdd-af8cd67dc129 |  | sv04.5 |  | 153 | Ralts | Ralts | number_plain=153 | 1 | 0 |
| sv04.5 | 6e305d6f-42b2-40c4-b793-6572bb0b6eec |  | sv04.5 |  | 154 | Kirlia | Kirlia | number_plain=154 | 1 | 0 |
| sv04.5 | a3be1a30-846e-4472-bd9f-38869479c2da |  | sv04.5 |  | 157 | Mime Jr. | Mime Jr. | number_plain=157 | 1 | 0 |
| sv04.5 | c1d39927-17d2-4ec5-9e5d-cfd150499f99 |  | sv04.5 |  | 160 | Mimikyu | Mimikyu | number_plain=160 | 1 | 0 |
| sv04.5 | 15d9d0f2-4af5-4379-b3ce-c542aa79abca |  | sv04.5 |  | 161 | Dachsbun | Dachsbun | number_plain=161 | 1 | 0 |
| sv04.5 | 4c2ffe1e-99d7-4fdb-864f-f7de25f70820 |  | sv04.5 |  | 162 | Ceruledge | Ceruledge | number_plain=162 | 1 | 0 |
| sv04.5 | f97d3c2b-dd58-49d3-a3e5-fdba2cc0a978 |  | sv04.5 |  | 164 | Flittle | Flittle | number_plain=164 | 1 | 0 |
| sv04.5 | 48093308-7611-4e2f-b72c-e1e00998ce98 |  | sv04.5 |  | 168 | Houndstone | Houndstone | number_plain=168 | 1 | 0 |
| sv04.5 | f820412a-5350-4904-abf2-309a4cb8d9ad |  | sv04.5 |  | 169 | Mankey | Mankey | number_plain=169 | 1 | 0 |
| sv04.5 | 93a6bc64-fc79-40e9-b673-b9075cb586bd |  | sv04.5 |  | 170 | Primeape | Primeape | number_plain=170 | 1 | 0 |
| sv04.5 | a0d9a87f-322c-4196-9601-cc3d61d986a7 |  | sv04.5 |  | 171 | Annihilape | Annihilape | number_plain=171 | 1 | 0 |
| sv04.5 | e4ccd186-4008-44ce-9da1-17f906967b3b |  | sv04.5 |  | 172 | Paldean Tauros | Paldean Tauros | number_plain=172 | 1 | 0 |
| sv04.5 | 50c23912-0d9e-4aa3-a6ce-89690f4d723e |  | sv04.5 |  | 180 | Paldean Wooper | Paldean Wooper | number_plain=180 | 1 | 0 |
| sv04.5 | a1330e3c-958a-4f95-834c-4a71654ea3b7 |  | sv04.5 |  | 188 | Mabosstiff | Mabosstiff | number_plain=188 | 1 | 0 |
| sv04.5 | ac32974d-1162-4351-87ec-4a8b066347aa |  | sv04.5 |  | 192 | Varoom | Varoom | number_plain=192 | 1 | 0 |
| sv04.5 | 0d15fac8-1e01-4e61-b1ad-e6e63ba9585b |  | sv04.5 |  | 193 | Revavroom | Revavroom | number_plain=193 | 1 | 0 |
| sv04.5 | 761104bd-0dd3-40b3-8f42-f5c08ed3fa9f |  | sv04.5 |  | 194 | Noibat | Noibat | number_plain=194 | 1 | 0 |
| sv04.5 | 602350f3-fc08-4377-813a-c0ba8d14c3fc |  | sv04.5 |  | 195 | Cyclizar | Cyclizar | number_plain=195 | 1 | 0 |
| sv04.5 | e598e761-8e55-4dd9-bf8b-6d8ab7b338b0 |  | sv04.5 |  | 207 | Lechonk | Lechonk | number_plain=207 | 1 | 0 |
| sv04.5 | a5a618f7-0d2c-4b1a-b6f0-5cd290bb92b0 |  | sv04.5 |  | 208 | Oinkologne | Oinkologne | number_plain=208 | 1 | 0 |
| sv04.5 | ba4560be-f2f4-4215-a491-d5921c90741d |  | sv04.5 |  | 209 | Tandemaus | Tandemaus | number_plain=209 | 1 | 0 |
| sv04.5 | fe4e77cb-cb3c-430f-b1a8-546c571d60c2 |  | sv04.5 |  | 210 | Maushold | Maushold | number_plain=210 | 1 | 0 |
| sv04.5 | 11214a18-d9af-4749-866f-3ca53e52aea6 |  | sv04.5 |  | 212 | Forretress ex | Forretress ex | number_plain=212 | 1 | 0 |
| sv04.5 | 2a78f6c5-417c-4f8e-8d88-271cf636cf0d |  | sv04.5 |  | 213 | Toedscruel ex | Toedscruel ex | number_plain=213 | 1 | 0 |
| sv04.5 | 69b2c7b5-06cd-40e5-9b05-3f1d6ac0fdc1 |  | sv04.5 |  | 214 | Espathra ex | Espathra ex | number_plain=214 | 1 | 0 |
| sv04.5 | ed1b7841-409f-441e-8f0a-e93f053c2746 |  | sv04.5 |  | 216 | Mew ex | Mew ex | number_plain=216 | 1 | 0 |
| sv04.5 | 2868eb6f-4c58-4aa5-b534-bf24dde6ced5 |  | sv04.5 |  | 217 | Gardevoir ex | Gardevoir ex | number_plain=217 | 1 | 0 |
| sv04.5 | 849fc9b4-142f-4546-be4d-5b9f3bb22dbe |  | sv04.5 |  | 219 | Paldean Clodsire ex | Paldean Clodsire ex | number_plain=219 | 1 | 0 |
| sv04.5 | 723229b0-367f-4b4c-9d6b-b3d106a0c1bb |  | sv04.5 |  | 220 | Noivern ex | Noivern ex | number_plain=220 | 1 | 0 |
| sv04.5 | 848b0369-216e-4b13-b5a8-fd69d45d9241 |  | sv04.5 |  | 223 | Squawkabilly ex | Squawkabilly ex | number_plain=223 | 1 | 0 |
| sv04.5 | f6ad16dc-f640-4cd4-9910-807a197d3918 |  | sv04.5 |  | 224 | Wugtrio | Wugtrio | number_plain=224 | 1 | 0 |
| sv04.5 | 8b8c9c59-554f-4281-8251-66f8f5396317 |  | sv04.5 |  | 225 | Palafin | Palafin | number_plain=225 | 1 | 0 |
| sv04.5 | 3fec273e-8d1c-45c5-ac3f-aedae40bd96a |  | sv04.5 |  | 226 | Pawmi | Pawmi | number_plain=226 | 1 | 0 |
| sv04.5 | be95e142-8658-41ed-bf4a-d1df35c02327 |  | sv04.5 |  | 227 | Clive | Clive | number_plain=227 | 1 | 0 |
| sv04.5 | d9c7a5c5-7b01-4e16-a0af-ba3ff692a761 |  | sv04.5 |  | 229 | Nemona | Nemona | number_plain=229 | 1 | 0 |
| sv04.5 | 4891f891-4098-482e-9c9a-0855db8bbfef |  | sv04.5 |  | 230 | Paldean Student | Paldean Student | number_plain=230 | 1 | 0 |
| sv04.5 | b2ba73b5-e610-4294-9eae-3f19592885fa |  | sv04.5 |  | 231 | Paldean Student | Paldean Student | number_plain=231 | 1 | 0 |
| sv04.5 | d47f9441-d9b6-4713-8378-2bba2cb034c8 |  | sv04.5 |  | 232 | Mew ex | Mew ex | number_plain=232 | 1 | 0 |
| sv04.5 | f8f6f3b0-d748-4cfe-9a49-475a2e13fe6e |  | sv04.5 |  | 233 | Gardevoir ex | Gardevoir ex | number_plain=233 | 1 | 0 |
| sv04.5 | 6abed0fa-5f5a-4328-952c-9a92a86180bf |  | sv04.5 |  | 234 | Charizard ex | Charizard ex | number_plain=234 | 1 | 0 |
| sv04.5 | 6cb8c3c0-97b8-461b-9026-d5d970ab2e54 |  | sv04.5 |  | 236 | Clive | Clive | number_plain=236 | 1 | 0 |
| sv04.5 | e2b87581-98c3-4e6e-960d-baa22c117c3c |  | sv04.5 |  | 237 | Iono | Iono | number_plain=237 | 1 | 0 |
| sv04.5 | 0e6aca61-34c9-451a-b4fc-0c9a9c0c8513 |  | sv04.5 |  | 238 | Nemona | Nemona | number_plain=238 | 1 | 0 |
| sv06.5 | fea19e50-8295-4b9a-a653-07fe4b0e2b55 |  | sv06.5 |  | 006 | Tapu Bulu | Tapu Bulu | number_plain=006 | 2 | 0 |
| sv06.5 | 06f1e767-99e6-4853-bd86-a41a55cf3d9a |  | sv06.5 |  | 008 | Houndoom | Houndoom | number_plain=008 | 2 | 0 |
| sv06.5 | 2e7d63cb-3a11-44b8-ac08-6edcbf405ba3 |  | sv06.5 |  | 010 | Horsea | Horsea | number_plain=010 | 2 | 0 |
| sv06.5 | 29c98330-0a72-4f2e-8fba-7a0005b20dbf |  | sv06.5 |  | 012 | Kingdra ex | Kingdra ex | number_plain=012 | 1 | 0 |
| sv06.5 | 556e6391-212a-4da6-baf9-34b2d2f2efe7 |  | sv06.5 |  | 015 | Revavroom ex | Revavroom ex | number_plain=015 | 1 | 0 |
| sv06.5 | 8684a96e-9a74-4e36-ae2b-18f85dc7a42a |  | sv06.5 |  | 018 | Duskull | Duskull | number_plain=018 | 2 | 0 |
| sv06.5 | c6afa971-a1cb-4f45-ab5e-bbc407fc5af1 |  | sv06.5 |  | 019 | Dusclops | Dusclops | number_plain=019 | 2 | 0 |
| sv06.5 | adb529a0-8a7e-4339-a517-b21f1f0081b6 |  | sv06.5 |  | 020 | Dusknoir | Dusknoir | number_plain=020 | 2 | 0 |
| sv06.5 | 132bd56e-d03e-4d50-98e5-defab35ebff1 |  | sv06.5 |  | 021 | Cresselia | Cresselia | number_plain=021 | 2 | 0 |
| sv06.5 | 565e7a5d-7c00-4b53-8f9f-efc098c05544 |  | sv06.5 |  | 031 | Zorua | Zorua | number_plain=031 | 2 | 0 |
| sv06.5 | 3896915d-6fca-4e44-99c8-1df73b377ddf |  | sv06.5 |  | 036 | Okidogi ex | Okidogi ex | number_plain=036 | 1 | 0 |
| sv06.5 | 6a0fdd77-5d10-4802-ba6b-570fa6dcbbd1 |  | sv06.5 |  | 037 | Munkidori ex | Munkidori ex | number_plain=037 | 1 | 0 |
| sv06.5 | 47677f6c-0789-49e3-ac8a-b26ee0afb0a5 |  | sv06.5 |  | 038 | Fezandipiti ex | Fezandipiti ex | number_plain=038 | 1 | 1 |
| sv06.5 | 5db87385-245a-42a6-9bb1-74cc23ff2d65 |  | sv06.5 |  | 039 | Pecharunt ex | Pecharunt ex | number_plain=039 | 1 | 0 |
| sv06.5 | c51bea66-e243-4d68-a673-c33150bdecdb |  | sv06.5 |  | 041 | Cufant | Cufant | number_plain=041 | 2 | 0 |
| sv06.5 | f283aeaa-dcaf-4a70-b94d-13849be28317 |  | sv06.5 |  | 045 | Fraxure | Fraxure | number_plain=045 | 2 | 0 |
| sv06.5 | 23b677f5-9453-460f-a2eb-49c18b80d89d |  | sv06.5 |  | 049 | Persian | Persian | number_plain=049 | 2 | 0 |
| sv06.5 | 75dee3a0-eba6-4da0-91a2-67d806af9656 |  | sv06.5 |  | 053 | Bewear | Bewear | number_plain=053 | 2 | 0 |
| sv06.5 | 560786bd-0eab-4bae-871a-2292db4153c0 |  | sv06.5 |  | 056 | Cassiopeia | Cassiopeia | number_plain=056 | 2 | 0 |
| sv06.5 | 62b9c8cd-4be6-483c-b5b8-6cd7bd1aeb5e |  | sv06.5 |  | 057 | Colress's Tenacity | Colress's Tenacity | number_plain=057 | 2 | 0 |
| sv06.5 | 75b10dac-840f-4bde-829f-9dd1f7bf1c90 |  | sv06.5 |  | 059 | Janine's Secret Art | Janine's Secret Art | number_plain=059 | 2 | 0 |
| sv06.5 | 0d3cadd0-0beb-4be0-a696-d7fb884fa38e |  | sv06.5 |  | 063 | Powerglass | Powerglass | number_plain=063 | 2 | 0 |
| sv06.5 | b2b2b7f2-216b-4b3e-ad9e-9802b4fce8db |  | sv06.5 |  | 064 | Xerosic's Machinations | Xerosic's Machinations | number_plain=064 | 2 | 0 |
| sv06.5 | aa601988-db2e-4e7e-92c4-6c48cad26c37 |  | sv06.5 |  | 065 | Tapu Bulu | Tapu Bulu | number_plain=065 | 1 | 0 |
| sv06.5 | 687fd3a7-37cf-405c-bcd8-39d11ba849a6 |  | sv06.5 |  | 066 | Houndoom | Houndoom | number_plain=066 | 1 | 0 |
| sv06.5 | 0a08600f-78ba-4eec-aca6-a45691856c7b |  | sv06.5 |  | 067 | Horsea | Horsea | number_plain=067 | 1 | 0 |
| sv06.5 | c6656ef3-8b13-4def-a273-4cf38803a9e3 |  | sv06.5 |  | 068 | Duskull | Duskull | number_plain=068 | 1 | 0 |
| sv06.5 | 4f284e55-1b3d-4cdb-ae5b-33551d4053bf |  | sv06.5 |  | 069 | Dusclops | Dusclops | number_plain=069 | 1 | 0 |
| sv06.5 | 245aeaff-5dcd-48af-9884-0b58641b428d |  | sv06.5 |  | 070 | Dusknoir | Dusknoir | number_plain=070 | 1 | 0 |
| sv06.5 | 0e79aa75-02d3-4e8b-8b71-e12540fd62be |  | sv06.5 |  | 071 | Cresselia | Cresselia | number_plain=071 | 1 | 0 |
| sv06.5 | 1d859ab0-4750-4010-8a50-0b90de5cd9b6 |  | sv06.5 |  | 075 | Zorua | Zorua | number_plain=075 | 1 | 0 |
| sv06.5 | ed845dda-99a8-41fe-b8ad-d62b6622fe13 |  | sv06.5 |  | 076 | Cufant | Cufant | number_plain=076 | 1 | 0 |
| sv06.5 | 3ae3ffb3-34b9-4f9e-95cc-b9b1bfbd26c4 |  | sv06.5 |  | 077 | Fraxure | Fraxure | number_plain=077 | 1 | 0 |
| sv06.5 | 1a9b8edb-41a6-4b56-bb4b-509ed4ef435b |  | sv06.5 |  | 078 | Persian | Persian | number_plain=078 | 1 | 0 |
| sv06.5 | f3e89225-f20b-426c-827d-c6e11d95904f |  | sv06.5 |  | 079 | Bewear | Bewear | number_plain=079 | 1 | 0 |
| sv06.5 | 0e6039fc-0efe-44a3-9d31-3b6f0b2b3202 |  | sv06.5 |  | 080 | Kingdra ex | Kingdra ex | number_plain=080 | 1 | 0 |
| sv06.5 | e410436e-73d8-4f89-bfd2-25f620c3845a |  | sv06.5 |  | 081 | Revavroom ex | Revavroom ex | number_plain=081 | 1 | 0 |
| sv06.5 | 38a74314-79ed-4c28-9a84-630a2f8e2b67 |  | sv06.5 |  | 082 | Okidogi ex | Okidogi ex | number_plain=082 | 1 | 0 |
| sv06.5 | d56f7ee3-f6a0-4835-92ef-bc99e0c8d78a |  | sv06.5 |  | 083 | Munkidori ex | Munkidori ex | number_plain=083 | 1 | 0 |
| sv06.5 | a0aa9e24-a2b4-4a93-b4d4-2c61025b9861 |  | sv06.5 |  | 084 | Fezandipiti ex | Fezandipiti ex | number_plain=084 | 1 | 0 |
| sv06.5 | fd724a0d-2007-46ea-87be-c9c8f86a09ac |  | sv06.5 |  | 085 | Pecharunt ex | Pecharunt ex | number_plain=085 | 1 | 0 |
| sv06.5 | e9b33194-764e-46c6-af07-dc06fb1515ef |  | sv06.5 |  | 086 | Cassiopeia | Cassiopeia | number_plain=086 | 1 | 0 |
| sv06.5 | 66a5222f-fe66-43e7-b689-7ab9fadce939 |  | sv06.5 |  | 087 | Colress's Tenacity | Colress's Tenacity | number_plain=087 | 1 | 0 |
| sv06.5 | d6ccd9e1-a552-4530-824b-9e9437d0c288 |  | sv06.5 |  | 088 | Janine's Secret Art | Janine's Secret Art | number_plain=088 | 1 | 0 |
| sv06.5 | 544b207c-b467-4d3d-90a7-0e5494c8e35f |  | sv06.5 |  | 089 | Xerosic's Machinations | Xerosic's Machinations | number_plain=089 | 1 | 0 |
| sv06.5 | 96e29631-06fa-4351-bed8-20413122f559 |  | sv06.5 |  | 090 | Okidogi ex | Okidogi ex | number_plain=090 | 1 | 0 |
| sv06.5 | 9d5fe8c3-9c84-45d8-b6a8-afe570de55f2 |  | sv06.5 |  | 091 | Munkidori ex | Munkidori ex | number_plain=091 | 1 | 0 |
| sv06.5 | 0630ec15-6c35-418c-bb36-5a9b65004b9e |  | sv06.5 |  | 092 | Fezandipiti ex | Fezandipiti ex | number_plain=092 | 1 | 0 |
| sv06.5 | e1502def-cdd7-4165-87f2-d5a1b8d5fe3b |  | sv06.5 |  | 093 | Pecharunt ex | Pecharunt ex | number_plain=093 | 1 | 0 |
| sv06.5 | 71d309e3-2644-478b-bf34-5e027f05c6fc |  | sv06.5 |  | 094 | Cassiopeia | Cassiopeia | number_plain=094 | 1 | 0 |
| sv06.5 | 9c3ce1f9-9859-4b12-947d-25d813507b93 |  | sv06.5 |  | 095 | Pecharunt ex | Pecharunt ex | number_plain=095 | 1 | 0 |
| sv06.5 | c81315d5-0c05-48ca-8026-057e0e1eec40 |  | sv06.5 |  | 097 | Powerglass | Powerglass | number_plain=097 | 1 | 0 |
| sv08.5 | c11bc9b0-0fe8-488c-bdef-cf1b64f894ec |  | sv08.5 |  | 005 | Leafeon | Leafeon | number_plain=005 | 2 | 0 |
| sv08.5 | 0c9700c4-ca45-4e83-a865-e1a3dee48e80 |  | sv08.5 |  | 008 | Whimsicott | Whimsicott | number_plain=008 | 2 | 0 |
| sv08.5 | edc42048-89fc-4cff-8422-ebc9f233f386 |  | sv08.5 |  | 013 | Flareon | Flareon | number_plain=013 | 2 | 0 |
| sv08.5 | 9ed9e9aa-4019-42c5-8051-072fb56a7569 |  | sv08.5 |  | 022 | Vaporeon | Vaporeon | number_plain=022 | 2 | 0 |
| sv08.5 | fb911570-4f51-4c86-b030-832974bffcc4 |  | sv08.5 |  | 025 | Glaceon | Glaceon | number_plain=025 | 2 | 0 |
| sv08.5 | e22b6a0d-c544-463f-9654-ba9e7d6978fd |  | sv08.5 |  | 029 | Jolteon | Jolteon | number_plain=029 | 2 | 0 |
| sv08.5 | 6dfd7ee4-f9de-4d77-9373-0006bf86e1b1 |  | sv08.5 |  | 033 | Espeon | Espeon | number_plain=033 | 2 | 0 |
| sv08.5 | 32f0c83a-ba31-419f-81c8-aae5f35033d7 |  | sv08.5 |  | 037 | Dusknoir | Dusknoir | number_plain=037 | 2 | 0 |
| sv08.5 | ad2966e5-48b0-4f8e-b7ec-56cfb220de64 |  | sv08.5 |  | 043 | Flutter Mane | Flutter Mane | number_plain=043 | 2 | 0 |
| sv08.5 | 649e4751-83b0-49ea-83cf-75ef59f989ed |  | sv08.5 |  | 044 | Munkidori | Munkidori | number_plain=044 | 2 | 0 |
| sv08.5 | 96e8765b-984b-40ef-b000-75e72b8f47a4 |  | sv08.5 |  | 045 | Fezandipiti | Fezandipiti | number_plain=045 | 2 | 0 |
| sv08.5 | d9d6fe68-06ab-494b-9519-fc7d76393d09 |  | sv08.5 |  | 046 | Iron Boulder | Iron Boulder | number_plain=046 | 2 | 0 |
| sv08.5 | 1d4be26f-d405-491c-9ce8-fee06b35e702 |  | sv08.5 |  | 049 | Groudon | Groudon | number_plain=049 | 2 | 0 |
| sv08.5 | 6f45550b-ef5c-4767-ad57-77212d4d65c2 |  | sv08.5 |  | 054 | Bloodmoon Ursaluna | Bloodmoon Ursaluna | number_plain=054 | 2 | 0 |
| sv08.5 | 25f1cc8a-87f0-42d9-b440-d30ad27168d6 |  | sv08.5 |  | 057 | Okidogi | Okidogi | number_plain=057 | 2 | 0 |
| sv08.5 | ffb95ade-a643-4ec6-bcb7-6ff41e5e7eae |  | sv08.5 |  | 059 | Umbreon | Umbreon | number_plain=059 | 2 | 0 |
| sv08.5 | 0c1d028f-fc8c-4295-8c3a-2f845eb5baf8 |  | sv08.5 |  | 065 | Roaring Moon | Roaring Moon | number_plain=065 | 2 | 0 |
| sv08.5 | 8968eec8-46f8-4185-a679-ee1d5805cc78 |  | sv08.5 |  | 070 | Archaludon | Archaludon | number_plain=070 | 2 | 0 |
| sv08.5 | bafa6068-a489-4705-811b-8f864f4679d3 |  | sv08.5 |  | 078 | Noctowl | Noctowl | number_plain=078 | 2 | 0 |
| sv08.5 | 9030feb1-f99d-4e1e-8c6e-2c9f19b8b616 |  | sv08.5 |  | 080 | Dudunsparce | Dudunsparce | number_plain=080 | 2 | 0 |
| swsh10.5 | 0832c419-3fe4-439a-8490-41011fcd843b |  | swsh10.5 |  | 005 | Alolan Exeggutor V | Alolan Exeggutor V | number_plain=005 | 1 | 0 |
| swsh10.5 | 067bbc12-ce47-4e7a-bfbb-a9d1ac21f0d4 |  | swsh10.5 |  | 027 | Pikachu | Pikachu | number_plain=027 | 2 | 0 |
| swsh10.5 | 026c495e-d29a-4232-a319-88637d470cbd |  | swsh10.5 |  | 030 | Mewtwo V | Mewtwo V | number_plain=030 | 1 | 0 |
| swsh10.5 | 3d22fb24-8491-45f1-9b36-b8e609298dcd |  | swsh10.5 |  | 031 | Mewtwo VSTAR | Mewtwo VSTAR | number_plain=031 | 1 | 0 |
| swsh10.5 | 5819fec4-dd4b-4dd5-85c8-7d781aa35367 |  | swsh10.5 |  | 040 | Conkeldurr V | Conkeldurr V | number_plain=040 | 1 | 0 |
| swsh10.5 | c86e3319-f1df-49c9-b46d-ba0b1c641f92 |  | swsh10.5 |  | 047 | Melmetal V | Melmetal V | number_plain=047 | 1 | 0 |
| swsh10.5 | 032a7df8-4473-4f85-a2d0-cb7dac2fadb5 |  | swsh10.5 |  | 048 | Melmetal VMAX | Melmetal VMAX | number_plain=048 | 1 | 0 |
| swsh10.5 | 3705b603-9adc-4750-aff4-bd7183db87dc |  | swsh10.5 |  | 049 | Dragonite V | Dragonite V | number_plain=049 | 1 | 0 |
| swsh10.5 | 1c039535-5beb-4374-bcce-ce66645e4ad8 |  | swsh10.5 |  | 050 | Dragonite VSTAR | Dragonite VSTAR | number_plain=050 | 1 | 0 |
| swsh10.5 | d7b23d71-91c0-442d-9d6d-8ecc97f5c7a6 |  | swsh10.5 |  | 058 | Slaking V | Slaking V | number_plain=058 | 1 | 0 |
| swsh10.5 | 6206fc08-7415-414f-9c22-c2cf57493c1e |  | swsh10.5 |  | 064 | Blanche | Blanche | number_plain=064 | 2 | 0 |
| swsh10.5 | fc394554-fa86-4510-8a81-79f48df255c6 |  | swsh10.5 |  | 065 | Candela | Candela | number_plain=065 | 2 | 0 |
| swsh10.5 | d2f87992-4951-464e-9976-4e2caef7e497 |  | swsh10.5 |  | 066 | Egg Incubator | Egg Incubator | number_plain=066 | 2 | 0 |
| swsh10.5 | b45c87d9-4eef-493b-8bc7-3dd19021a7c2 |  | swsh10.5 |  | 067 | Lure Module | Lure Module | number_plain=067 | 2 | 0 |
| swsh10.5 | e44d13e5-a6ac-4016-8b81-b6305ea3414b |  | swsh10.5 |  | 070 | Spark | Spark | number_plain=070 | 2 | 0 |
| swsh10.5 | 4b809146-f6ac-4b99-81e1-f593b115a1aa |  | swsh10.5 |  | 071 | Alolan Exeggutor V | Alolan Exeggutor V | number_plain=071 | 1 | 0 |
| swsh10.5 | 3236c55c-fa46-407f-b45d-9ea9186c23bb |  | swsh10.5 |  | 072 | Mewtwo V | Mewtwo V | number_plain=072 | 1 | 0 |
| swsh10.5 | 90a71cb9-4a41-4b42-9aaf-74c521167c2d |  | swsh10.5 |  | 073 | Conkeldurr V | Conkeldurr V | number_plain=073 | 1 | 0 |
| swsh10.5 | 1d784874-229a-4fc9-a347-e2ebd2eb1a6b |  | swsh10.5 |  | 074 | Conkeldurr V | Conkeldurr V | number_plain=074 | 1 | 0 |
| swsh10.5 | c3d42060-46a2-48c1-826f-4979be9cf986 |  | swsh10.5 |  | 075 | Melmetal V | Melmetal V | number_plain=075 | 1 | 0 |
| swsh10.5 | e747c915-43a1-4bc7-8155-34d2734a2d14 |  | swsh10.5 |  | 076 | Dragonite V | Dragonite V | number_plain=076 | 1 | 0 |
| swsh10.5 | e655ae68-7398-4432-9fcd-3e4e3a1ff045 |  | swsh10.5 |  | 077 | Slaking V | Slaking V | number_plain=077 | 1 | 0 |
| swsh10.5 | 0ae65a15-2418-42ab-bf67-0142075286a6 |  | swsh10.5 |  | 078 | Professor's Research | Professor's Research | number_plain=078 | 1 | 0 |
| swsh10.5 | 5e7675a0-aebc-40de-84c7-998a4d5c0975 |  | swsh10.5 |  | 079 | Mewtwo VSTAR | Mewtwo VSTAR | number_plain=079 | 1 | 0 |
| swsh10.5 | 480390a4-b8d0-4ab9-90d2-e6f61c7defa9 |  | swsh10.5 |  | 080 | Melmetal VMAX | Melmetal VMAX | number_plain=080 | 1 | 0 |
| swsh10.5 | f21c012b-48cf-48df-b62e-442a783f0e0d |  | swsh10.5 |  | 081 | Dragonite VSTAR | Dragonite VSTAR | number_plain=081 | 1 | 0 |
| swsh10.5 | 259d6022-618e-4590-845b-989a6ed94bdc |  | swsh10.5 |  | 082 | Blanche | Blanche | number_plain=082 | 1 | 0 |
| swsh10.5 | 25b25cc7-9288-4b69-b5bf-9a65410ec6b2 |  | swsh10.5 |  | 083 | Candela | Candela | number_plain=083 | 1 | 0 |
| swsh10.5 | ece1af3f-11d0-4e6b-9b93-723a4def816c |  | swsh10.5 |  | 084 | Professor's Research | Professor's Research | number_plain=084 | 1 | 0 |
| swsh10.5 | da92a0e3-8059-48aa-8acf-39bda62dfbc3 |  | swsh10.5 |  | 085 | Spark | Spark | number_plain=085 | 1 | 0 |
| swsh10.5 | ab583991-a87c-423a-863d-2f8e0cbf62c3 |  | swsh10.5 |  | 086 | Mewtwo VSTAR | Mewtwo VSTAR | number_plain=086 | 1 | 0 |
| swsh10.5 | d99d7741-06ab-477b-b564-4529710a9ec3 |  | swsh10.5 |  | 087 | Egg Incubator | Egg Incubator | number_plain=087 | 1 | 0 |
| swsh10.5 | 122879ec-4d0f-4470-97af-cb82f2408119 |  | swsh10.5 |  | 088 | Lure Module | Lure Module | number_plain=088 | 1 | 0 |
| swsh2 | 9cf48b11-bf42-4aa3-861b-c2ca5543877e |  | swsh2 |  | 154 | Boss's Orders (Giovanni) | Boss's Orders (Giovanni) | number_plain=154 | 2 | 0 |
| swsh4.5 | 5ee8ddf9-81b3-43e0-94b5-951ac0386eb8 |  | swsh4.5 |  | 58 | Boss's Orders (Lysandre) | Boss's Orders (Lysandre) | number_plain=58 | 2 | 0 |
| swsh4.5 | 17cd3179-b844-47a8-a197-ae123ca4b583 |  | swsh4.5 |  | 60 | Professor's Research (Professor Juniper) | Professor's Research (Professor Juniper) | number_plain=60 | 2 | 0 |

## Rollback Design

Rollback must restore only the directly assigned parent fields for the exact `card_print_id` list from a fresh pre-write snapshot.

| Set | Card Print ID | Rollback Set | Rollback Number | Rollback Name |
| --- | --- | --- | --- | --- |
| 2021swsh | d34033e2-a8e8-4e72-b1e9-2033445e8f00 |  | 1 | Bulbasaur |
| 2021swsh | 987099f7-59e9-4c0a-9bbb-a0b8fa24a086 |  | 2 | Chikorita |
| 2021swsh | ac2987ab-7972-4e0a-bd34-eecdc494b8b9 |  | 3 | Treecko |
| 2021swsh | 53ab14f5-7e43-4098-8eb6-77beb4450c99 |  | 4 | Turtwig |
| 2021swsh | 99449877-8fd5-4651-bd39-2321b2bffff5 |  | 5 | Snivy |
| 2021swsh | e95d8646-b98f-4c8c-a01d-2e499c02aa82 |  | 6 | Chespin |
| 2021swsh | cb3e5ff6-ace4-44ca-99e0-91098dff5bba |  | 7 | Rowlet |
| 2021swsh | 6613c2ff-8bad-465b-b186-78c6ac7b9c26 |  | 8 | Grookey |
| 2021swsh | 9421cd5e-2640-44c5-8044-47aaa7a7954a |  | 9 | Charmander |
| 2021swsh | ac9e8297-6e39-419f-8fa0-f58e90c80c01 |  | 10 | Cyndaquil |
| 2021swsh | c13e4ceb-5988-4215-8462-fc378bbe5e46 |  | 11 | Torchic |
| 2021swsh | cefedf7b-f1c0-42f7-af7d-e6e9279358f3 |  | 12 | Chimchar |
| 2021swsh | 43d5432d-7152-40de-9660-dd2893847b8a |  | 13 | Tepig |
| 2021swsh | 0980ca25-d2fb-43a3-a74f-789e6a0f8f51 |  | 14 | Fennekin |
| 2021swsh | 229d3337-9150-428f-9259-36ee0a0636e2 |  | 15 | Litten |
| 2021swsh | d74fe432-2990-49c2-b908-9c0fcec9eefa |  | 16 | Scorbunny |
| 2021swsh | 0bc143c0-b558-447e-864c-c71c02e3c2b2 |  | 17 | Squirtle |
| 2021swsh | 12a7e22b-6d1a-4833-a2fd-c2f020ef0007 |  | 18 | Totodile |
| 2021swsh | 29d1fb6e-f0be-4ce1-a0b2-458845d33cad |  | 19 | Mudkip |
| 2021swsh | f36b29e8-8e24-4e0b-810a-5945738a1df7 |  | 20 | Piplup |
| 2021swsh | c9dbc8fc-b83a-4edb-acbe-d50c05e8a4f1 |  | 21 | Oshawott |
| 2021swsh | 3f8c67ec-ac7c-4c02-b46d-a7ff9e9af0b2 |  | 22 | Froakie |
| 2021swsh | dd92a89a-084a-424a-b073-d1564e113919 |  | 23 | Popplio |
| 2021swsh | 63ce9abe-eb16-4e0b-8a24-caa5cf820a82 |  | 24 | Sobble |
| 2021swsh | be9b1912-c62b-46d9-9081-acaefe8cf0c2 |  | 25 | Pikachu |
| col1 | 2180d1db-0948-4cfc-9a98-da7629c2811a |  |  | Groudon |
| col1 | 922f2b4f-eb6f-492c-89a7-8b4f313509e2 |  |  | Hitmontop |
| dp7 | 62f77935-5749-4d26-87e6-06bbca565b22 |  |  | Empoleon |
| dp7 | 665ee2b0-4a22-43d5-bf8e-8ff22a990384 |  |  | Infernape |
| dp7 | d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff |  |  | Dusknoir |
| dp7 | 7c211bf2-ab9e-489d-842f-65c896270783 |  |  | Heatran |
| dp7 | 6f49c231-0a53-4c0c-9db1-6d4c36aa460e |  |  | Machamp |
| dp7 | 7a0dbe87-8ffb-4939-a5c0-371a0a21b302 |  |  | Raichu |
| dp7 | 687811f7-e3d2-41bb-b37d-1e73882551d2 |  |  | Regigigas |
| dp7 | e8444009-0c47-48a6-af07-f5b450ac0082 |  |  | Drifloon |
| ecard2 | 5155d8da-c49b-43cf-8173-1e4ceca853d2 |  | 11 | Espeon |
| ecard2 | 49008b62-21be-48b8-a561-9dc0bea390e1 |  | 12 | Exeggutor |
| ecard2 | 0f752ca1-5458-4241-af37-4a7b48b85013 |  | 13 | Exeggutor |
| ecard2 | bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88 |  | 15 | Houndoom |
| ecard2 | d5e3ba78-7a85-49d2-8ab0-295521652f55 |  | 16 | Hypno |
| ecard2 | 11591d3d-6574-487e-9958-f0d94bba5af4 |  | 17 | Jumpluff |
| ecard2 | 72b1ec6b-fe84-4190-a0d3-d95155296261 |  | 18 | Jynx |
| ecard2 | b22dc290-dade-45f8-b488-5d3c921a79a1 |  | 19 | Kingdra |
| ecard2 | 0e7d501c-b666-43df-9ee6-82443fcae8cb |  | 20 | Lanturn |
| ecard2 | a077e73a-275a-405e-85ac-24b28b6ffe3a |  | 25 | Ninetales |
| ecard2 | 898ad06e-aab1-4c1a-b91b-44fdd6069031 |  | 28 | Porygon2 |
| ecard2 | 507f014e-d43d-4b24-b01f-c9635b6aba81 |  | 30 | Quagsire |
| ecard2 | 2233732b-ced1-4f51-b45b-603c1c15a65c |  | 32 | Scizor |
| ecard3 | d0270c83-13c1-4d2b-ae50-19830be9d134 |  | 4 | Articuno |
| ecard3 | 36a0af86-f863-4ff0-967c-285a67272dcb |  | 6 | Crobat |
| ecard3 | 6406220f-4684-4f26-a52d-310db5eb5700 |  | 8 | Flareon |
| ecard3 | 982bd726-548f-4e0c-9a93-c1301af1342f |  | 9 | Forretress |
| ecard3 | d139fca7-558c-4dad-9a46-f94e4d45ab6b |  |  | Kabutops |
| ecard3 | 8c78b35f-6dd0-4b12-9709-8b4198ad3089 |  |  | Ledian |
| ecard3 | 02a4156d-5f67-4969-8288-c440938a923c |  |  | Magcargo |
| ecard3 | bb73d56c-c46f-4341-b4a1-825a10c2406b |  |  | Magcargo |
| ecard3 | 28d7a9bb-fcff-4e93-861d-d200770984d6 |  |  | Magneton |
| ecard3 | 415065f4-68dd-44a9-a0f0-d6375e203275 |  |  | Piloswine |
| ecard3 | b7c244c2-35bf-4dbd-836c-1341a777d65e |  |  | Politoed |
| ecard3 | e99d7d18-af64-4d34-b62c-8a795f6da2c3 |  |  | Poliwrath |
| ecard3 | 9a1cc452-e8b4-48bf-acc9-e592fe9cc521 |  |  | Rhydon |
| ecard3 | abcf71f3-edd8-4130-aaa3-b7fecada39e2 |  |  | Umbreon |
| ecard3 | 7cbee94f-9f6a-441d-98e1-6a50da7f72d7 |  |  | Vaporeon |
| ex10 | 2fdd39c8-7afa-4031-be84-649ac28a7b72 |  |  | Entei Star |
| ex10 | 043dbc47-0815-4ef4-b31d-2027f70f2338 |  |  | Raikou Star |
| ex10 | 584c31ad-d7ac-4356-b9cc-4de3152511b2 |  |  | Suicune Star |
| me01 | 35ec8ca0-6bc7-4b2a-9077-94bf42c4fecb |  |  | Bulbasaur |
| me01 | 9de52da6-5c3c-4621-8cec-b01a9db1e4d7 |  |  | Exeggcute |
| me01 | 2314a826-39ad-4782-9c0a-465c25f8fe48 |  |  | Tangela |
| me01 | 80a83fe5-ccc6-4f14-b060-af5ee3bd56c4 |  |  | Tangrowth |
| me01 | 7d4af188-1b3c-4c6b-8a9b-cb426f11d87b |  |  | Chikorita |
| me01 | 493cbe02-e42b-4ca0-97cb-f9b75584c66f |  |  | Bayleef |
| me01 | 711a2789-6c0b-4c7b-8e5a-15c865deb444 |  |  | Meganium |
| me01 | 2c818714-a5c7-426f-8a8f-9e5db12ba941 |  |  | Shuckle |
| me01 | a2aae959-98c0-453d-a3e5-196b774acf77 |  |  | Celebi |
| me01 | 37f0dcda-5da9-41af-ba5e-6d92c01b2676 |  |  | Seedot |
| me01 | ab5d40b5-ae91-40cd-a3b2-c085eb226c15 |  |  | Nuzleaf |
| me01 | 223177d5-5156-4bca-97ed-a55405d506bd |  |  | Shiftry |
| me01 | 5e8491ad-fbc4-4e97-b73f-03b6666ffff5 |  |  | Nincada |
| me01 | 756b62e3-5bf9-4aa7-9204-5682cb5f312c |  |  | Ninjask |
| me01 | b01f0f86-df22-4b41-b8ad-e4d1053d6812 |  |  | Dhelmise |
| me01 | 3a862499-6f17-4531-85d2-30dfc726d882 |  |  | Vulpix |
| me01 | 728642b0-10e0-47fe-902e-acc0cc0f7c6f |  |  | Ninetales |
| me01 | e4ccbd91-a03c-416d-969a-af1c8faa7d0f |  |  | Numel |
| me01 | d13cd05f-d7f8-47c1-92bf-76196414895f |  |  | Mega Camerupt ex |
| me01 | 3a300a8d-7e5c-4744-9b3b-2961adcd57a2 |  |  | Litleo |
| me01 | c906523d-dd38-4899-b343-9339ab6ee3f7 |  |  | Volcanion |
| me01 | f2a6ce1c-3b4b-4b21-a367-25c6c9a4e2fd |  |  | Scorbunny |
| me01 | d7e33cc1-581b-4b4c-8497-be10892dbe0f |  |  | Raboot |
| me01 | 3b3e22cf-5165-41ec-9b6e-b441e00528fe |  |  | Sizzlipede |
| me01 | 3bdab7d9-494e-429a-85c4-5bc4f60b56a5 |  |  | Centiskorch |
| me01 | 9458269b-b01d-48a1-a299-ee775da3f6b8 |  |  | Chi-Yu |
| me01 | 46bb2c65-85ca-4e54-82c8-bd4dc9709d3d |  |  | Mantine |
| me01 | d6783e4a-9296-4fec-a85a-98f170b8ecdb |  |  | Corphish |
| me01 | 36d01240-1013-435a-8216-4b9b333a8281 |  |  | Kyogre |
| me01 | fb0d293a-e731-45d7-af05-85dfe35b6da8 |  |  | Snover |
| me01 | 6041ea6e-d598-45cd-82d5-43ff9af86265 |  |  | Mega Abomasnow ex |
| me01 | 03253b6e-c0ca-420e-9b5c-548142b39f81 |  |  | Clauncher |
| me01 | 994a32c6-4774-400e-ad94-ef39aaba0836 |  |  | Clawitzer |
| me01 | e392d99c-0dbe-44b7-8d41-a2c8f6947c65 |  |  | Sobble |
| me01 | cc6e8e9a-0505-49f6-917f-782f106de7f4 |  |  | Drizzile |
| me01 | b23ef0b8-9ab7-4333-9ec7-10555b8ae142 |  |  | Inteleon |
| me01 | 7a9e718f-f302-455c-a90a-4dd024d773b6 |  |  | Snom |
| me01 | 4b1ec036-6918-451c-b8d8-504347b96fa1 |  |  | Frosmoth |
| me01 | 079a15ab-610e-4d7e-b8ba-f4dff5ac97c9 |  |  | Eiscue |
| me01 | c910f0c6-98f9-48c9-9a97-44a7d766a91c |  |  | Magnemite |
| me01 | 61df2e14-a9e4-4741-a957-4fef75468dee |  |  | Magneton |
| me01 | a4240ebf-2820-4455-90a5-5e24c780758d |  |  | Magnezone |
| me01 | 4b121129-bf0a-4835-8af6-dbed0c23b962 |  |  | Electrike |
| me01 | df1a84f9-7a7c-44a6-bce2-b6a21947ac8f |  |  | Mega Manectric ex |
| me01 | a3c9641f-5152-4bc9-aec6-f7f5f836a5b6 |  |  | Pachirisu |
| me01 | 007c91d0-6e49-4654-b88e-da105cd4bac9 |  |  | Helioptile |
| me01 | 9b837cfd-0f7f-4bd1-ab75-c9b8c14ba027 |  |  | Alakazam |
| me01 | 91eba394-d9a1-4e7e-926f-381d2abd8a32 |  |  | Jynx |
| me01 | addfd1d7-c1cc-42e4-a4c2-ffddbba89022 |  |  | Mega Gardevoir ex |
| me01 | 006ee906-bf8c-46dd-9e14-ac623ba3c596 |  |  | Shedinja |
| me01 | 99d7e313-27de-4da7-a10e-3d2bb898ebcd |  |  | Grumpig |
| me01 | e003f060-6249-47f6-b31b-e2cb4cac5611 |  |  | Xerneas |
| me01 | 33096065-fff0-42f9-9df2-52516e55cd04 |  |  | Greavard |
| me01 | 56611277-9b14-49e5-b71a-4fc1c675f973 |  |  | Houndstone |
| me01 | 952acdf6-f707-4bac-a111-133a2d456207 |  |  | Gimmighoul |
| me01 | 29cd9592-1684-425b-9102-000c335f53b5 |  |  | Sandslash |
| me01 | b522fb51-1555-4d51-94a4-359988bbbe5f |  |  | Onix |
| me01 | 61a36b8f-49cd-4200-9e4b-49a2a042060c |  |  | Tyrogue |
| me01 | 38d96ab4-73b8-4a03-9b2a-2d0439e3effc |  |  | Makuhita |
| me01 | 4faab1bd-e8ce-4fe8-8fda-cd2167875850 |  |  | Hariyama |
| me01 | f6c13207-e0b4-413d-a54d-f7eab7cdeadb |  |  | Mega Lucario ex |
| me01 | 564ce33e-8dce-40b9-abad-b71b85e50bb6 |  |  | Toxicroak |
| me01 | 8fbc6c9f-5494-4a27-88ec-b47b75626670 |  |  | Stonjourner |
| me01 | 1b68a134-7b27-448d-b27d-bd6c792e1cf1 |  |  | Nacli |
| me01 | 4e4b3fa7-31fc-4740-a617-5be4d5ad453e |  |  | Naclstack |
| me01 | cea4de22-3921-46bf-a88a-41a60978a936 |  |  | Crawdaunt |
| me01 | 8be2f619-a4eb-4cb3-85f2-550e1bd332e7 |  |  | Spiritomb |
| me01 | 69c0e94b-9641-410a-a9f3-62b5bd0b6a79 |  |  | Yveltal |
| me01 | c1d12a78-15fd-4101-92b1-d03e06aab576 |  |  | Nickit |
| me01 | 1df8b92b-eff7-4f4d-a82f-1302c9885a80 |  |  | Thievul |
| me01 | 0003593d-5fc1-4f51-a5fa-4211e946c257 |  |  | Shroodle |
| me01 | 2fbd7a5a-fb64-4dda-889d-ff2ba59aac7e |  |  | Grafaiai |
| me01 | d05ad932-fbfe-40b6-b812-2097add0e93c |  |  | Mega Mawile ex |
| me01 | 36dea4d3-2ca5-4397-a359-cfbf98023aab |  |  | Tinkatink |
| me01 | 0af77d06-ad91-4f6d-a5fb-c53f2a349628 |  |  | Tinkatuff |
| me01 | 90da4fea-bf5b-4335-a5f5-dcb7fab86958 |  |  | Tinkaton |
| me01 | 20f18283-9337-47d2-a807-37f019221717 |  |  | Gholdengo |
| mep | 6419894a-137f-4fc7-8db1-fa853872b190 |  | 1 | Meganium |
| mep | b75d4730-3c1a-42ca-9d18-e8ca736ae41f |  | 2 | Inteleon |
| mep | aa9f207d-c9ea-4607-bbc5-448648bca47f |  | 3 | Alakazam |
| mep | bf523703-271c-49fe-b8aa-c31c57cb9b32 |  | 4 | Lunatone |
| mep | 04e533ae-dd17-478c-ab46-220859079b2c |  | 5 | Drifloon |
| mep | ac2b6cf7-6873-44e8-96b9-e03a179fae51 |  | 6 | Drifblim |
| mep | 870f45fe-0680-4a92-b77b-dd03a6018bd3 |  | 7 | Psyduck |
| mep | 47f874b2-ea20-4b89-af44-085905bb1f60 |  | 8 | Golduck |
| mep | a3624761-be25-4841-83e4-c5936ec434fe |  | 9 | Alakazam |
| mep | 242de512-f2fb-4994-9615-6c1e2c55ac02 |  | 10 | Riolu |
| pl1 | cfbaec4b-bc98-4f6f-8b06-a30dbe29af30 |  |  | Dialga |
| pl1 | 9d20653b-49ea-4a30-8e18-629267d7397b |  |  | Dialga G |
| pl1 | 1cc5b95e-c5b7-477c-a3c1-1d4c26e10875 |  |  | Drapion |
| pl1 | 9deb3714-1f02-4eb2-a249-6b3b42a106cb |  |  | Giratina |
| pl1 | 182aab06-7802-4dea-90cb-32dfc7cefaab |  |  | Palkia G |
| pl1 | 24bd8689-4031-40d0-8948-1d08e652ef34 |  |  | Shaymin |
| pl1 | 1f03518a-bed9-4c04-ad0c-3a5cf3008248 |  |  | Shaymin |
| pl1 | 74b9d351-aecc-4ff9-8ed2-958311074af7 |  |  | Lotad |
| pl1 | e48e17b9-b693-4882-9e9f-d177dbce37c8 |  |  | Swablu |
| pl2 | 2ebe059c-614e-4dd6-812f-ebf268459ce5 |  |  | Arcanine |
| pl2 | 9d6eb3c7-dc61-4543-b436-a67fd23ba16c |  |  | Darkrai G |
| pl2 | 1970689f-8f93-4148-96b2-0ed8ed149568 |  |  | Flygon |
| pl2 | 8c817161-627f-4ff5-aa27-127757b88213 |  |  | Nidoran♀ |
| pl2 | bc120b0e-4aad-47c1-989b-a733435a2000 |  |  | Nidoran♂ |
| pl2 | f619ad6c-007c-4e4d-bea0-a4a517cffa50 |  |  | Team Galactic's Invention G-107 Technical Machine |
| pl2 | a1b66404-67e9-4586-8ac9-873c421da31e |  |  | Alakazam 4 |
| pl2 | 5fd2b141-a2af-4c2c-bb33-df2c2af58c02 |  |  | Floatzel GL |
| pl2 | 7d47083d-43a4-4868-9bac-eb1deb237136 |  |  | Flygon |
| pl2 | 60789fd6-a0bb-49cd-848f-1ba462f4e965 |  |  | Gallade 4 |
| pl2 | 2ef89f59-3bd7-430f-9e71-42fea8cdd8ae |  |  | Hippowdon |
| pl2 | a719dd63-f527-4edf-8c8e-e77bac65a715 |  |  | Infernape 4 |
| pl2 | 26d6335d-9483-4de2-8b1b-771c43ab31cb |  |  | Mismagius GL |
| pl2 | 25c91739-b09a-4360-94e5-9a8b1ed43755 |  |  | Snorlax |
| pl2 | f5ada689-45c1-4b23-ac62-6a9f0bc11c97 |  |  | Frost Rotom |
| pl2 | 949f5c1d-6d29-41cd-91c9-0be81e5360c5 |  |  | Mow Rotom |
| pl2 | 0a14f347-5dd0-425a-9c9c-ffd134a9de4f |  |  | Charon's Choice |
| pl3 | 8cd92a82-149d-43b4-a7d3-d65782536182 |  |  | Absol G |
| pl3 | 79097350-eb58-44e8-bd39-3ec5f417f02b |  |  | Blaziken FB |
| pl3 | 880dc8c7-6959-4fda-b79a-32e48c684267 |  |  | Charizard G |
| pl3 | 29a4bca4-6264-45f6-bc24-1d5ded5520cd |  |  | Electivire FB |
| pl3 | 2c1b3125-dd67-4522-b3e0-5621c05f7a9a |  |  | Garchomp C |
| pl3 | 89f61622-12a4-4861-abb3-ef3dbcaf2a86 |  |  | Rayquaza C |
| pl3 | fa6310ae-be43-4309-af1d-a5033daff2f0 |  |  | Staraptor FB |
| pl3 | 9089264b-fd13-4261-94ac-b252ab89f6c7 |  |  | Relicanth |
| pl3 | e8a8c0b0-2213-4701-89a9-8926cc0d5669 |  |  | Yanma |
| pl4 | a02f871c-fe3e-432b-944d-6decea0eecdf |  |  | Charizard |
| pl4 | 71779a8b-ee22-4892-9425-8e3da51f179a |  |  | Mothim |
| pl4 | 3059259e-c28b-49d6-9f31-64e178e87f28 |  |  | Swalot |
| pl4 | 8716f287-3497-49b2-a499-9c1e026a6a94 |  |  | Zapdos |
| pl4 | 460e6437-4bc8-4a1c-90fc-546481f225e2 |  |  | Arceus LV. X |
| pl4 | c5125a59-32a9-4a0f-98af-4cf4ad5d6d64 |  |  | Arceus LV. X |
| pl4 | ad751d34-d43b-4644-ae2e-622725f781cd |  |  | Arceus LV. X |
| pl4 | 1352eb03-1519-4e31-b7ad-a2d4af24ef65 |  |  | Gengar LV. X |
| pl4 | 2fb3462d-4a19-4412-b8cd-848a669549a0 |  |  | Salamence LV. X |
| pl4 | b319332c-aea7-4f3c-ad4c-02f0874b2d60 |  |  | Tangrowth LV. X |
| pl4 | cf859f9b-f1d6-41ec-9e38-c7fd27743777 |  |  | Arceus |
| pl4 | 8b2c91cf-bd7c-4564-84ca-5863e1414257 |  |  | Arceus |
| pl4 | 61cd00a6-3418-4980-ade8-b26c8d0b4d5c |  |  | Arceus |
| pl4 | 63a0a7b8-bdfa-4a08-ad30-680bcc45802e |  |  | Arceus |
| pl4 | 67e47461-e03c-4da3-8557-d3df639dbb98 |  |  | Arceus |
| pl4 | 0db1b355-bb14-4042-8597-4afd1d9a2b77 |  |  | Arceus |
| pl4 | 502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda |  |  | Bagon |
| pl4 | 22a0396f-a0fe-4680-8568-71246489db3c |  |  | Ponyta |
| sv04.5 | 5683e068-ffb7-4689-93ed-71df3f25d037 |  |  | Pineco |
| sv04.5 | eb2af5ec-a7fb-4792-a54c-30f8ef2e8a8b |  |  | Forretress ex |
| sv04.5 | 022c209e-c0ff-4e94-beeb-9d784af48afd |  |  | Toedscool |
| sv04.5 | d71315e2-8ea6-40e1-86e2-cf44878ef696 |  |  | Toedscruel ex |
| sv04.5 | ea4af720-a5fc-4698-8cbf-2eb290e8e0d8 |  |  | Espathra ex |
| sv04.5 | 3729104f-71b2-4242-801a-bec9dc31369b |  |  | Charmander |
| sv04.5 | 39599b5f-9417-4d67-9d4f-630e413256a2 |  |  | Charmeleon |
| sv04.5 | 8a71b7c8-ef01-4c87-b5a6-4974984b14d6 |  |  | Charcadet |
| sv04.5 | 5b3fb3aa-2b58-4997-841f-d6771ec3ebc6 |  |  | Armarouge |
| sv04.5 | 47c5fb97-513b-498f-b486-9f8200c190eb |  |  | Frigibax |
| sv04.5 | 2f06c6c9-7029-443d-ba68-4b6dfae249db |  |  | Pikachu |
| sv04.5 | 6297f5c1-890d-4808-891a-9da9fd74e488 |  |  | Raichu |
| sv04.5 | 981463fa-b005-481c-9f58-bd2537c303f8 |  |  | Kilowattrel |
| sv04.5 | d3e61e14-24de-4e3a-948a-d20f8c3b5ab1 |  |  | Natu |
| sv04.5 | f43170ba-0ad7-4d6b-8be6-472ea917f334 |  |  | Xatu |
| sv04.5 | 63195337-0d2c-45aa-9b27-c6e81804887b |  |  | Ralts |
| sv04.5 | c751326c-70f6-4ef4-aea8-fe50fdee8c41 |  |  | Kirlia |
| sv04.5 | caa0d1ef-8978-4a9d-9471-be026b81b7d6 |  |  | Gardevoir ex |
| sv04.5 | 95642256-f37a-4dfe-aa7f-d040edcfd913 |  |  | Mime Jr. |
| sv04.5 | c9741bc3-a9ef-4d2a-936f-1cc9d0e1c7c9 |  |  | Mimikyu |
| sv04.5 | 21efc498-eb90-420f-8bca-cd36828e49ac |  |  | Dachsbun |
| sv04.5 | 8cf2db86-e98d-4d06-8882-39e8a6c68d30 |  |  | Ceruledge |
| sv04.5 | 1d9a2684-98e7-4e6d-92d9-2b2c3c0c4d6c |  |  | Flittle |
| sv04.5 | 9dea129c-3d64-4b6a-8550-2847c5b45f1f |  |  | Houndstone |
| sv04.5 | e873f70d-770a-4cd6-b3dc-7d6d6e75874b |  |  | Mankey |
| sv04.5 | 781a7cb9-894a-4583-89d8-8c7b9aa180c1 |  |  | Primeape |
| sv04.5 | 435c0599-12c2-4042-9401-8290af312bf6 |  |  | Annihilape |
| sv04.5 | 342fa217-9ddb-4b1e-acb7-d958bc7ced80 |  |  | Charizard ex |
| sv04.5 | f4bbb6a5-7efc-482c-ad91-ade33d3cb951 |  |  | Paldean Wooper |
| sv04.5 | 10bb5109-1801-49ed-8a2b-786fde2e9423 |  |  | Paldean Clodsire ex |
| sv04.5 | b0971232-a14d-4039-9ca4-79ee006e3342 |  |  | Mabosstiff |
| sv04.5 | 137e1fe1-8baa-4351-92dc-16fff7687713 |  |  | Varoom |
| sv04.5 | 62235f32-cda8-4423-b782-ca2c773a94ea |  |  | Revavroom |
| sv04.5 | 669038cb-8856-471d-a392-ba1dbe019549 |  |  | Noibat |
| sv04.5 | 07bc9efc-7ff0-4070-9a85-309245b21919 |  |  | Noivern ex |
| sv04.5 | 3d5d4c62-83d0-4996-878b-e3a61872f4ac |  |  | Cyclizar |
| sv04.5 | 6bc0a20c-6763-480d-a23e-0ae313361f02 |  |  | Lechonk |
| sv04.5 | 085a3cb5-d8c9-4750-b53b-968eb1c89f85 |  |  | Oinkologne |
| sv04.5 | 83300f8d-00bf-4b21-b4d9-55014bb1e051 |  |  | Tandemaus |
| sv04.5 | 74d9f934-5bb9-4d35-8e0e-924c13559cbc |  |  | Maushold |
| sv04.5 | c711d654-f865-4e01-bb83-51a37bc7bb5a |  |  | Squawkabilly ex |
| sv04.5 | be8f9f47-28a4-4d25-abd5-527f3cf13549 |  |  | Clive |
| sv04.5 | ac12c85c-33c2-4d09-aa59-65f037d3d8ba |  |  | Iono |
| sv04.5 | e693095f-36a3-4275-ba98-fd19b3093989 |  |  | Nemona |
| sv04.5 | cf012088-486e-4fb5-8f36-e80c9a0f176f |  |  | Paldean Student |
| sv04.5 | 29e16368-8c5c-4f90-8881-c8294c0f0ae8 |  |  | Paldean Student |
| sv04.5 | 23361253-6606-47b7-9ad5-0debd1571dbf |  |  | Professor's Research |
| sv04.5 | 776e8594-2843-4f0a-b83a-92f6ba1421c1 |  |  | Professor's Research |
| sv04.5 | 10134134-181d-439e-9bc2-6209b2ce9479 |  |  | Pineco |
| sv04.5 | 572c0280-a485-4f9a-9aa8-dbe87c02aecc |  |  | Toedscool |
| sv04.5 | 1396ccbe-30a9-4983-be09-ab15ae262b25 |  |  | Charmander |
| sv04.5 | ebc68786-487a-4dee-ac92-58ea6a098dea |  |  | Charmeleon |
| sv04.5 | 65098521-9846-48dc-a83b-1b19267228e4 |  |  | Paldean Tauros |
| sv04.5 | adff063a-78fa-4476-bcc6-4f0370569646 |  |  | Charcadet |
| sv04.5 | 5908a919-1f88-43e3-abc1-818607c0312e |  |  | Armarouge |
| sv04.5 | cc77534d-bd0f-4b56-9d93-72f32cd18e4c |  |  | Paldean Tauros |
| sv04.5 | aedac2dd-0b5e-48f2-a731-fec5f03d012f |  |  | Wugtrio |
| sv04.5 | 34362874-59c6-4192-a06c-340f6dd3837f |  |  | Palafin |
| sv04.5 | d9acc545-3cf3-4271-b9c5-10e4d8e49f4c |  |  | Frigibax |
| sv04.5 | 12be1528-cdb7-49a1-b260-7b99e6bffb0f |  |  | Pikachu |
| sv04.5 | 5f24e43e-de82-4936-aab3-f3adad23546b |  |  | Raichu |
| sv04.5 | 3a4a0b76-3090-4101-a7ea-c40c4c873e82 |  |  | Pawmi |
| sv04.5 | c68ac5d8-dae5-470d-9bad-184122f9a7a7 |  |  | Kilowattrel |
| sv04.5 | 62e3ae56-ccc5-426c-9deb-7396b90fa860 |  |  | Natu |
| sv04.5 | 866611cf-097c-499e-b261-307d9042063b |  |  | Xatu |
| sv04.5 | c204419b-bb77-4c12-bbdd-af8cd67dc129 |  |  | Ralts |
| sv04.5 | 6e305d6f-42b2-40c4-b793-6572bb0b6eec |  |  | Kirlia |
| sv04.5 | a3be1a30-846e-4472-bd9f-38869479c2da |  |  | Mime Jr. |
| sv04.5 | c1d39927-17d2-4ec5-9e5d-cfd150499f99 |  |  | Mimikyu |
| sv04.5 | 15d9d0f2-4af5-4379-b3ce-c542aa79abca |  |  | Dachsbun |
| sv04.5 | 4c2ffe1e-99d7-4fdb-864f-f7de25f70820 |  |  | Ceruledge |
| sv04.5 | f97d3c2b-dd58-49d3-a3e5-fdba2cc0a978 |  |  | Flittle |
| sv04.5 | 48093308-7611-4e2f-b72c-e1e00998ce98 |  |  | Houndstone |
| sv04.5 | f820412a-5350-4904-abf2-309a4cb8d9ad |  |  | Mankey |
| sv04.5 | 93a6bc64-fc79-40e9-b673-b9075cb586bd |  |  | Primeape |
| sv04.5 | a0d9a87f-322c-4196-9601-cc3d61d986a7 |  |  | Annihilape |
| sv04.5 | e4ccd186-4008-44ce-9da1-17f906967b3b |  |  | Paldean Tauros |
| sv04.5 | 50c23912-0d9e-4aa3-a6ce-89690f4d723e |  |  | Paldean Wooper |
| sv04.5 | a1330e3c-958a-4f95-834c-4a71654ea3b7 |  |  | Mabosstiff |
| sv04.5 | ac32974d-1162-4351-87ec-4a8b066347aa |  |  | Varoom |
| sv04.5 | 0d15fac8-1e01-4e61-b1ad-e6e63ba9585b |  |  | Revavroom |
| sv04.5 | 761104bd-0dd3-40b3-8f42-f5c08ed3fa9f |  |  | Noibat |
| sv04.5 | 602350f3-fc08-4377-813a-c0ba8d14c3fc |  |  | Cyclizar |
| sv04.5 | e598e761-8e55-4dd9-bf8b-6d8ab7b338b0 |  |  | Lechonk |
| sv04.5 | a5a618f7-0d2c-4b1a-b6f0-5cd290bb92b0 |  |  | Oinkologne |
| sv04.5 | ba4560be-f2f4-4215-a491-d5921c90741d |  |  | Tandemaus |
| sv04.5 | fe4e77cb-cb3c-430f-b1a8-546c571d60c2 |  |  | Maushold |
| sv04.5 | 11214a18-d9af-4749-866f-3ca53e52aea6 |  |  | Forretress ex |
| sv04.5 | 2a78f6c5-417c-4f8e-8d88-271cf636cf0d |  |  | Toedscruel ex |
| sv04.5 | 69b2c7b5-06cd-40e5-9b05-3f1d6ac0fdc1 |  |  | Espathra ex |
| sv04.5 | ed1b7841-409f-441e-8f0a-e93f053c2746 |  |  | Mew ex |
| sv04.5 | 2868eb6f-4c58-4aa5-b534-bf24dde6ced5 |  |  | Gardevoir ex |
| sv04.5 | 849fc9b4-142f-4546-be4d-5b9f3bb22dbe |  |  | Paldean Clodsire ex |
| sv04.5 | 723229b0-367f-4b4c-9d6b-b3d106a0c1bb |  |  | Noivern ex |
| sv04.5 | 848b0369-216e-4b13-b5a8-fd69d45d9241 |  |  | Squawkabilly ex |
| sv04.5 | f6ad16dc-f640-4cd4-9910-807a197d3918 |  |  | Wugtrio |
| sv04.5 | 8b8c9c59-554f-4281-8251-66f8f5396317 |  |  | Palafin |
| sv04.5 | 3fec273e-8d1c-45c5-ac3f-aedae40bd96a |  |  | Pawmi |
| sv04.5 | be95e142-8658-41ed-bf4a-d1df35c02327 |  |  | Clive |
| sv04.5 | d9c7a5c5-7b01-4e16-a0af-ba3ff692a761 |  |  | Nemona |
| sv04.5 | 4891f891-4098-482e-9c9a-0855db8bbfef |  |  | Paldean Student |
| sv04.5 | b2ba73b5-e610-4294-9eae-3f19592885fa |  |  | Paldean Student |
| sv04.5 | d47f9441-d9b6-4713-8378-2bba2cb034c8 |  |  | Mew ex |
| sv04.5 | f8f6f3b0-d748-4cfe-9a49-475a2e13fe6e |  |  | Gardevoir ex |
| sv04.5 | 6abed0fa-5f5a-4328-952c-9a92a86180bf |  |  | Charizard ex |
| sv04.5 | 6cb8c3c0-97b8-461b-9026-d5d970ab2e54 |  |  | Clive |
| sv04.5 | e2b87581-98c3-4e6e-960d-baa22c117c3c |  |  | Iono |
| sv04.5 | 0e6aca61-34c9-451a-b4fc-0c9a9c0c8513 |  |  | Nemona |
| sv06.5 | fea19e50-8295-4b9a-a653-07fe4b0e2b55 |  |  | Tapu Bulu |
| sv06.5 | 06f1e767-99e6-4853-bd86-a41a55cf3d9a |  |  | Houndoom |
| sv06.5 | 2e7d63cb-3a11-44b8-ac08-6edcbf405ba3 |  |  | Horsea |
| sv06.5 | 29c98330-0a72-4f2e-8fba-7a0005b20dbf |  |  | Kingdra ex |
| sv06.5 | 556e6391-212a-4da6-baf9-34b2d2f2efe7 |  |  | Revavroom ex |
| sv06.5 | 8684a96e-9a74-4e36-ae2b-18f85dc7a42a |  |  | Duskull |
| sv06.5 | c6afa971-a1cb-4f45-ab5e-bbc407fc5af1 |  |  | Dusclops |
| sv06.5 | adb529a0-8a7e-4339-a517-b21f1f0081b6 |  |  | Dusknoir |
| sv06.5 | 132bd56e-d03e-4d50-98e5-defab35ebff1 |  |  | Cresselia |
| sv06.5 | 565e7a5d-7c00-4b53-8f9f-efc098c05544 |  |  | Zorua |
| sv06.5 | 3896915d-6fca-4e44-99c8-1df73b377ddf |  |  | Okidogi ex |
| sv06.5 | 6a0fdd77-5d10-4802-ba6b-570fa6dcbbd1 |  |  | Munkidori ex |
| sv06.5 | 47677f6c-0789-49e3-ac8a-b26ee0afb0a5 |  |  | Fezandipiti ex |
| sv06.5 | 5db87385-245a-42a6-9bb1-74cc23ff2d65 |  |  | Pecharunt ex |
| sv06.5 | c51bea66-e243-4d68-a673-c33150bdecdb |  |  | Cufant |
| sv06.5 | f283aeaa-dcaf-4a70-b94d-13849be28317 |  |  | Fraxure |
| sv06.5 | 23b677f5-9453-460f-a2eb-49c18b80d89d |  |  | Persian |
| sv06.5 | 75dee3a0-eba6-4da0-91a2-67d806af9656 |  |  | Bewear |
| sv06.5 | 560786bd-0eab-4bae-871a-2292db4153c0 |  |  | Cassiopeia |
| sv06.5 | 62b9c8cd-4be6-483c-b5b8-6cd7bd1aeb5e |  |  | Colress's Tenacity |
| sv06.5 | 75b10dac-840f-4bde-829f-9dd1f7bf1c90 |  |  | Janine's Secret Art |
| sv06.5 | 0d3cadd0-0beb-4be0-a696-d7fb884fa38e |  |  | Powerglass |
| sv06.5 | b2b2b7f2-216b-4b3e-ad9e-9802b4fce8db |  |  | Xerosic's Machinations |
| sv06.5 | aa601988-db2e-4e7e-92c4-6c48cad26c37 |  |  | Tapu Bulu |
| sv06.5 | 687fd3a7-37cf-405c-bcd8-39d11ba849a6 |  |  | Houndoom |
| sv06.5 | 0a08600f-78ba-4eec-aca6-a45691856c7b |  |  | Horsea |
| sv06.5 | c6656ef3-8b13-4def-a273-4cf38803a9e3 |  |  | Duskull |
| sv06.5 | 4f284e55-1b3d-4cdb-ae5b-33551d4053bf |  |  | Dusclops |
| sv06.5 | 245aeaff-5dcd-48af-9884-0b58641b428d |  |  | Dusknoir |
| sv06.5 | 0e79aa75-02d3-4e8b-8b71-e12540fd62be |  |  | Cresselia |
| sv06.5 | 1d859ab0-4750-4010-8a50-0b90de5cd9b6 |  |  | Zorua |
| sv06.5 | ed845dda-99a8-41fe-b8ad-d62b6622fe13 |  |  | Cufant |
| sv06.5 | 3ae3ffb3-34b9-4f9e-95cc-b9b1bfbd26c4 |  |  | Fraxure |
| sv06.5 | 1a9b8edb-41a6-4b56-bb4b-509ed4ef435b |  |  | Persian |
| sv06.5 | f3e89225-f20b-426c-827d-c6e11d95904f |  |  | Bewear |
| sv06.5 | 0e6039fc-0efe-44a3-9d31-3b6f0b2b3202 |  |  | Kingdra ex |
| sv06.5 | e410436e-73d8-4f89-bfd2-25f620c3845a |  |  | Revavroom ex |
| sv06.5 | 38a74314-79ed-4c28-9a84-630a2f8e2b67 |  |  | Okidogi ex |
| sv06.5 | d56f7ee3-f6a0-4835-92ef-bc99e0c8d78a |  |  | Munkidori ex |
| sv06.5 | a0aa9e24-a2b4-4a93-b4d4-2c61025b9861 |  |  | Fezandipiti ex |
| sv06.5 | fd724a0d-2007-46ea-87be-c9c8f86a09ac |  |  | Pecharunt ex |
| sv06.5 | e9b33194-764e-46c6-af07-dc06fb1515ef |  |  | Cassiopeia |
| sv06.5 | 66a5222f-fe66-43e7-b689-7ab9fadce939 |  |  | Colress's Tenacity |
| sv06.5 | d6ccd9e1-a552-4530-824b-9e9437d0c288 |  |  | Janine's Secret Art |
| sv06.5 | 544b207c-b467-4d3d-90a7-0e5494c8e35f |  |  | Xerosic's Machinations |
| sv06.5 | 96e29631-06fa-4351-bed8-20413122f559 |  |  | Okidogi ex |
| sv06.5 | 9d5fe8c3-9c84-45d8-b6a8-afe570de55f2 |  |  | Munkidori ex |
| sv06.5 | 0630ec15-6c35-418c-bb36-5a9b65004b9e |  |  | Fezandipiti ex |
| sv06.5 | e1502def-cdd7-4165-87f2-d5a1b8d5fe3b |  |  | Pecharunt ex |
| sv06.5 | 71d309e3-2644-478b-bf34-5e027f05c6fc |  |  | Cassiopeia |
| sv06.5 | 9c3ce1f9-9859-4b12-947d-25d813507b93 |  |  | Pecharunt ex |
| sv06.5 | c81315d5-0c05-48ca-8026-057e0e1eec40 |  |  | Powerglass |
| sv08.5 | c11bc9b0-0fe8-488c-bdef-cf1b64f894ec |  |  | Leafeon |
| sv08.5 | 0c9700c4-ca45-4e83-a865-e1a3dee48e80 |  |  | Whimsicott |
| sv08.5 | edc42048-89fc-4cff-8422-ebc9f233f386 |  |  | Flareon |
| sv08.5 | 9ed9e9aa-4019-42c5-8051-072fb56a7569 |  |  | Vaporeon |
| sv08.5 | fb911570-4f51-4c86-b030-832974bffcc4 |  |  | Glaceon |
| sv08.5 | e22b6a0d-c544-463f-9654-ba9e7d6978fd |  |  | Jolteon |
| sv08.5 | 6dfd7ee4-f9de-4d77-9373-0006bf86e1b1 |  |  | Espeon |
| sv08.5 | 32f0c83a-ba31-419f-81c8-aae5f35033d7 |  |  | Dusknoir |
| sv08.5 | ad2966e5-48b0-4f8e-b7ec-56cfb220de64 |  |  | Flutter Mane |
| sv08.5 | 649e4751-83b0-49ea-83cf-75ef59f989ed |  |  | Munkidori |
| sv08.5 | 96e8765b-984b-40ef-b000-75e72b8f47a4 |  |  | Fezandipiti |
| sv08.5 | d9d6fe68-06ab-494b-9519-fc7d76393d09 |  |  | Iron Boulder |
| sv08.5 | 1d4be26f-d405-491c-9ce8-fee06b35e702 |  |  | Groudon |
| sv08.5 | 6f45550b-ef5c-4767-ad57-77212d4d65c2 |  |  | Bloodmoon Ursaluna |
| sv08.5 | 25f1cc8a-87f0-42d9-b440-d30ad27168d6 |  |  | Okidogi |
| sv08.5 | ffb95ade-a643-4ec6-bcb7-6ff41e5e7eae |  |  | Umbreon |
| sv08.5 | 0c1d028f-fc8c-4295-8c3a-2f845eb5baf8 |  |  | Roaring Moon |
| sv08.5 | 8968eec8-46f8-4185-a679-ee1d5805cc78 |  |  | Archaludon |
| sv08.5 | bafa6068-a489-4705-811b-8f864f4679d3 |  |  | Noctowl |
| sv08.5 | 9030feb1-f99d-4e1e-8c6e-2c9f19b8b616 |  |  | Dudunsparce |
| swsh10.5 | 0832c419-3fe4-439a-8490-41011fcd843b |  |  | Alolan Exeggutor V |
| swsh10.5 | 067bbc12-ce47-4e7a-bfbb-a9d1ac21f0d4 |  |  | Pikachu |
| swsh10.5 | 026c495e-d29a-4232-a319-88637d470cbd |  |  | Mewtwo V |
| swsh10.5 | 3d22fb24-8491-45f1-9b36-b8e609298dcd |  |  | Mewtwo VSTAR |
| swsh10.5 | 5819fec4-dd4b-4dd5-85c8-7d781aa35367 |  |  | Conkeldurr V |
| swsh10.5 | c86e3319-f1df-49c9-b46d-ba0b1c641f92 |  |  | Melmetal V |
| swsh10.5 | 032a7df8-4473-4f85-a2d0-cb7dac2fadb5 |  |  | Melmetal VMAX |
| swsh10.5 | 3705b603-9adc-4750-aff4-bd7183db87dc |  |  | Dragonite V |
| swsh10.5 | 1c039535-5beb-4374-bcce-ce66645e4ad8 |  |  | Dragonite VSTAR |
| swsh10.5 | d7b23d71-91c0-442d-9d6d-8ecc97f5c7a6 |  |  | Slaking V |
| swsh10.5 | 6206fc08-7415-414f-9c22-c2cf57493c1e |  |  | Blanche |
| swsh10.5 | fc394554-fa86-4510-8a81-79f48df255c6 |  |  | Candela |
| swsh10.5 | d2f87992-4951-464e-9976-4e2caef7e497 |  |  | Egg Incubator |
| swsh10.5 | b45c87d9-4eef-493b-8bc7-3dd19021a7c2 |  |  | Lure Module |
| swsh10.5 | e44d13e5-a6ac-4016-8b81-b6305ea3414b |  |  | Spark |
| swsh10.5 | 4b809146-f6ac-4b99-81e1-f593b115a1aa |  |  | Alolan Exeggutor V |
| swsh10.5 | 3236c55c-fa46-407f-b45d-9ea9186c23bb |  |  | Mewtwo V |
| swsh10.5 | 90a71cb9-4a41-4b42-9aaf-74c521167c2d |  |  | Conkeldurr V |
| swsh10.5 | 1d784874-229a-4fc9-a347-e2ebd2eb1a6b |  |  | Conkeldurr V |
| swsh10.5 | c3d42060-46a2-48c1-826f-4979be9cf986 |  |  | Melmetal V |
| swsh10.5 | e747c915-43a1-4bc7-8155-34d2734a2d14 |  |  | Dragonite V |
| swsh10.5 | e655ae68-7398-4432-9fcd-3e4e3a1ff045 |  |  | Slaking V |
| swsh10.5 | 0ae65a15-2418-42ab-bf67-0142075286a6 |  |  | Professor's Research |
| swsh10.5 | 5e7675a0-aebc-40de-84c7-998a4d5c0975 |  |  | Mewtwo VSTAR |
| swsh10.5 | 480390a4-b8d0-4ab9-90d2-e6f61c7defa9 |  |  | Melmetal VMAX |
| swsh10.5 | f21c012b-48cf-48df-b62e-442a783f0e0d |  |  | Dragonite VSTAR |
| swsh10.5 | 259d6022-618e-4590-845b-989a6ed94bdc |  |  | Blanche |
| swsh10.5 | 25b25cc7-9288-4b69-b5bf-9a65410ec6b2 |  |  | Candela |
| swsh10.5 | ece1af3f-11d0-4e6b-9b93-723a4def816c |  |  | Professor's Research |
| swsh10.5 | da92a0e3-8059-48aa-8acf-39bda62dfbc3 |  |  | Spark |
| swsh10.5 | ab583991-a87c-423a-863d-2f8e0cbf62c3 |  |  | Mewtwo VSTAR |
| swsh10.5 | d99d7741-06ab-477b-b564-4529710a9ec3 |  |  | Egg Incubator |
| swsh10.5 | 122879ec-4d0f-4470-97af-cb82f2408119 |  |  | Lure Module |
| swsh2 | 9cf48b11-bf42-4aa3-861b-c2ca5543877e |  |  | Boss's Orders (Giovanni) |
| swsh4.5 | 5ee8ddf9-81b3-43e0-94b5-951ac0386eb8 |  |  | Boss's Orders (Lysandre) |
| swsh4.5 | 17cd3179-b844-47a8-a197-ae123ca4b583 |  |  | Professor's Research (Professor Juniper) |

## Verification Plan

| Check | Expected |
| --- | ---: |
| all_target_parent_rows_resolved | 422 |
| all_target_child_printings_unchanged | 643 |
| vault_items_referencing_targets | 0 |
| unsupported_finishes_in_target_rows | 0 |

## Required Before Any Write

- Human review of every before_fields and target_parent_fields row.
- Explicit operator approval of exact card_print_id list.
- Fresh read-only before-state snapshot from production immediately before execution.
- Dedicated transactional execution script with dry-run default and apply flag blocked unless explicitly approved.
- Rollback matrix regenerated from the fresh snapshot.
- Post-apply verification checks run inside the same transaction before commit.

## Hard Rules

- This is not an executable apply package.
- This report must not be copied into a migration.
- No write may occur until a separate operator-approved execution artifact exists.
- Rollback values must be regenerated from a fresh DB snapshot immediately before any future write.
- Post-apply verification must pass before any transaction commit in a future execution path.
