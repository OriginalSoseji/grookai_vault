# English Master Index Physical Recovery Review Gate V1

This is an audit-only review gate for the generated physical recovery dry-run packages.

It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Decision

- review_gate_status: stop_review_required_before_any_apply_design
- conclusion: One or more stop findings must be resolved before any apply-package design.
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
| db_card_prints_found | 422 |
| db_card_printings_found | 643 |
| external_mappings_referencing_targets | 448 |
| identity_rows_referencing_targets | 422 |
| trait_rows_referencing_targets | 422 |
| vault_items_referencing_targets | 4 |
| package_stop_findings | 3 |
| duplicate_card_print_ids | 0 |

## Finish Coverage

| Finish | Rows |
| --- | ---: |
| holo | 279 |
| normal | 166 |
| reverse | 198 |

## Evidence Source Presence

| Source | Package Rows Referencing Source |
| --- | ---: |
| pokemontcg_api | 379 |
| reverseholo_set_checklist | 405 |
| tcdb_checklist | 2 |
| tcgcsv_tcgplayer_catalog | 22 |
| tcgdex | 384 |
| tcgplayer_price_guide | 339 |
| thepricedex_price_list | 390 |

## Packages

| Set | Name | Parents | Printings | DB Parents | DB Printings | External Mappings | Identity Rows | Trait Rows | Vault Items | Stop Findings |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2021swsh | McDonald's Collection 2021 | 25 | 50 | 25 | 50 | 25 | 25 | 25 | 0 | 0 |
| col1 | Call of Legends | 2 | 6 | 2 | 6 | 2 | 2 | 2 | 0 | 0 |
| dp7 | Stormfront | 8 | 10 | 8 | 10 | 8 | 8 | 8 | 0 | 0 |
| ecard2 | Aquapolis | 13 | 26 | 13 | 26 | 39 | 13 | 13 | 0 | 0 |
| ecard3 | Skyridge | 15 | 19 | 15 | 19 | 15 | 15 | 15 | 0 | 0 |
| ex10 | Unseen Forces | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 0 | 0 |
| me01 | Mega Evolution | 77 | 151 | 77 | 151 | 77 | 77 | 77 | 2 | 1 |
| mep | MEP Black Star Promos | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 0 | 0 |
| pl1 | Platinum | 9 | 10 | 9 | 10 | 9 | 9 | 9 | 0 | 0 |
| pl2 | Rising Rivals | 17 | 24 | 17 | 24 | 17 | 17 | 17 | 0 | 0 |
| pl3 | Supreme Victors | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 0 | 0 |
| pl4 | Arceus | 18 | 23 | 18 | 23 | 18 | 18 | 18 | 0 | 0 |
| sv04.5 | Paldean Fates | 108 | 148 | 108 | 148 | 108 | 108 | 108 | 1 | 1 |
| sv06.5 | Shrouded Fable | 52 | 69 | 52 | 69 | 52 | 52 | 52 | 1 | 1 |
| sv08.5 | Prismatic Evolutions | 20 | 40 | 20 | 40 | 20 | 20 | 20 | 0 | 0 |
| swsh10.5 | Pokémon GO | 33 | 39 | 33 | 39 | 33 | 33 | 33 | 0 | 0 |
| swsh2 | Rebel Clash | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 0 | 0 |
| swsh4.5 | Shining Fates | 2 | 4 | 2 | 4 | 2 | 2 | 2 | 0 | 0 |

## Row Inventory

| Set | Number | Target Name | Current Grookai Name | Card Print ID | Finishes | Sources | Children | Vault Items |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 2021swsh | 1 | Bulbasaur | Bulbasaur | d34033e2-a8e8-4e72-b1e9-2033445e8f00 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 2 | Chikorita | Chikorita | 987099f7-59e9-4c0a-9bbb-a0b8fa24a086 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 3 | Treecko | Treecko | ac2987ab-7972-4e0a-bd34-eecdc494b8b9 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 4 | Turtwig | Turtwig | 53ab14f5-7e43-4098-8eb6-77beb4450c99 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 5 | Snivy | Snivy | 99449877-8fd5-4651-bd39-2321b2bffff5 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 6 | Chespin | Chespin | e95d8646-b98f-4c8c-a01d-2e499c02aa82 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 7 | Rowlet | Rowlet | cb3e5ff6-ace4-44ca-99e0-91098dff5bba | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 8 | Grookey | Grookey | 6613c2ff-8bad-465b-b186-78c6ac7b9c26 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 9 | Charmander | Charmander | 9421cd5e-2640-44c5-8044-47aaa7a7954a | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 10 | Cyndaquil | Cyndaquil | ac9e8297-6e39-419f-8fa0-f58e90c80c01 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 11 | Torchic | Torchic | c13e4ceb-5988-4215-8462-fc378bbe5e46 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 12 | Chimchar | Chimchar | cefedf7b-f1c0-42f7-af7d-e6e9279358f3 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 13 | Tepig | Tepig | 43d5432d-7152-40de-9660-dd2893847b8a | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 14 | Fennekin | Fennekin | 0980ca25-d2fb-43a3-a74f-789e6a0f8f51 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 15 | Litten | Litten | 229d3337-9150-428f-9259-36ee0a0636e2 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 16 | Scorbunny | Scorbunny | d74fe432-2990-49c2-b908-9c0fcec9eefa | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 17 | Squirtle | Squirtle | 0bc143c0-b558-447e-864c-c71c02e3c2b2 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 18 | Totodile | Totodile | 12a7e22b-6d1a-4833-a2fd-c2f020ef0007 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 19 | Mudkip | Mudkip | 29d1fb6e-f0be-4ce1-a0b2-458845d33cad | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 20 | Piplup | Piplup | f36b29e8-8e24-4e0b-810a-5945738a1df7 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 21 | Oshawott | Oshawott | c9dbc8fc-b83a-4edb-acbe-d50c05e8a4f1 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 22 | Froakie | Froakie | 3f8c67ec-ac7c-4c02-b46d-a7ff9e9af0b2 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 23 | Popplio | Popplio | dd92a89a-084a-424a-b073-d1564e113919 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 24 | Sobble | Sobble | 63ce9abe-eb16-4e0b-8a24-caa5cf820a82 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| 2021swsh | 25 | Pikachu | Pikachu | be9b1912-c62b-46d9-9081-acaefe8cf0c2 | holo, normal | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| col1 | 6 | Groudon | Groudon | 2180d1db-0948-4cfc-9a98-da7629c2811a | holo, normal, reverse | pokemontcg_api, tcgdex, thepricedex_price_list | 3 | 0 |
| col1 | 8 | Hitmontop | Hitmontop | 922f2b4f-eb6f-492c-89a7-8b4f313509e2 | holo, normal, reverse | pokemontcg_api, tcgdex, thepricedex_price_list | 3 | 0 |
| dp7 | 2 | Empoleon | Empoleon | 62f77935-5749-4d26-87e6-06bbca565b22 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| dp7 | 3 | Infernape | Infernape | 665ee2b0-4a22-43d5-bf8e-8ff22a990384 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| dp7 | 96 | Dusknoir | Dusknoir | d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| dp7 | 97 | Heatran | Heatran | 7c211bf2-ab9e-489d-842f-65c896270783 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| dp7 | 98 | Machamp | Machamp | 6f49c231-0a53-4c0c-9db1-6d4c36aa460e | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| dp7 | 99 | Raichu | Raichu | 7a0dbe87-8ffb-4939-a5c0-371a0a21b302 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| dp7 | 100 | Regigigas | Regigigas | 687811f7-e3d2-41bb-b37d-1e73882551d2 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| dp7 | SH1 | Drifloon | Drifloon | e8444009-0c47-48a6-af07-f5b450ac0082 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| ecard2 | 11 | Espeon | Espeon | 5155d8da-c49b-43cf-8173-1e4ceca853d2 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 12 | Exeggutor | Exeggutor | 49008b62-21be-48b8-a561-9dc0bea390e1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 13 | Exeggutor | Exeggutor | 0f752ca1-5458-4241-af37-4a7b48b85013 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 15 | Houndoom | Houndoom | bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 16 | Hypno | Hypno | d5e3ba78-7a85-49d2-8ab0-295521652f55 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 17 | Jumpluff | Jumpluff | 11591d3d-6574-487e-9958-f0d94bba5af4 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 18 | Jynx | Jynx | 72b1ec6b-fe84-4190-a0d3-d95155296261 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 19 | Kingdra | Kingdra | b22dc290-dade-45f8-b488-5d3c921a79a1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 20 | Lanturn | Lanturn | 0e7d501c-b666-43df-9ee6-82443fcae8cb | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 25 | Ninetales | Ninetales | a077e73a-275a-405e-85ac-24b28b6ffe3a | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 28 | Porygon2 | Porygon2 | 898ad06e-aab1-4c1a-b91b-44fdd6069031 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 30 | Quagsire | Quagsire | 507f014e-d43d-4b24-b01f-c9635b6aba81 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard2 | 32 | Scizor | Scizor | 2233732b-ced1-4f51-b45b-603c1c15a65c | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard3 | 4 | Articuno | Articuno | d0270c83-13c1-4d2b-ae50-19830be9d134 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard3 | 6 | Crobat | Crobat | 36a0af86-f863-4ff0-967c-285a67272dcb | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard3 | 8 | Flareon | Flareon | 6406220f-4684-4f26-a52d-310db5eb5700 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard3 | 9 | Forretress | Forretress | 982bd726-548f-4e0c-9a93-c1301af1342f | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| ecard3 | H13 | Kabutops | Kabutops | d139fca7-558c-4dad-9a46-f94e4d45ab6b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H14 | Ledian | Ledian | 8c78b35f-6dd0-4b12-9709-8b4198ad3089 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H16 | Magcargo | Magcargo | 02a4156d-5f67-4969-8288-c440938a923c | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H17 | Magcargo | Magcargo | bb73d56c-c46f-4341-b4a1-825a10c2406b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H18 | Magneton | Magneton | 28d7a9bb-fcff-4e93-861d-d200770984d6 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H22 | Piloswine | Piloswine | 415065f4-68dd-44a9-a0f0-d6375e203275 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H23 | Politoed | Politoed | b7c244c2-35bf-4dbd-836c-1341a777d65e | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H24 | Poliwrath | Poliwrath | e99d7d18-af64-4d34-b62c-8a795f6da2c3 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H27 | Rhydon | Rhydon | 9a1cc452-e8b4-48bf-acc9-e592fe9cc521 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H30 | Umbreon | Umbreon | abcf71f3-edd8-4130-aaa3-b7fecada39e2 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ecard3 | H31 | Vaporeon | Vaporeon | 7cbee94f-9f6a-441d-98e1-6a50da7f72d7 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ex10 | 113 | Entei ★ | Entei Star | 2fdd39c8-7afa-4031-be84-649ac28a7b72 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ex10 | 114 | Raikou ★ | Raikou Star | 043dbc47-0815-4ef4-b31d-2027f70f2338 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| ex10 | 115 | Suicune ★ | Suicune Star | 584c31ad-d7ac-4356-b9cc-4de3152511b2 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| me01 | 001 | Bulbasaur | Bulbasaur | 35ec8ca0-6bc7-4b2a-9077-94bf42c4fecb | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 004 | Exeggcute | Exeggcute | 9de52da6-5c3c-4621-8cec-b01a9db1e4d7 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 006 | Tangela | Tangela | 2314a826-39ad-4782-9c0a-465c25f8fe48 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 007 | Tangrowth | Tangrowth | 80a83fe5-ccc6-4f14-b060-af5ee3bd56c4 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 008 | Chikorita | Chikorita | 7d4af188-1b3c-4c6b-8a9b-cb426f11d87b | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 009 | Bayleef | Bayleef | 493cbe02-e42b-4ca0-97cb-f9b75584c66f | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 010 | Meganium | Meganium | 711a2789-6c0b-4c7b-8e5a-15c865deb444 | holo, normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 3 | 0 |
| me01 | 011 | Shuckle | Shuckle | 2c818714-a5c7-426f-8a8f-9e5db12ba941 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 012 | Celebi | Celebi | a2aae959-98c0-453d-a3e5-196b774acf77 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 013 | Seedot | Seedot | 37f0dcda-5da9-41af-ba5e-6d92c01b2676 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 014 | Nuzleaf | Nuzleaf | ab5d40b5-ae91-40cd-a3b2-c085eb226c15 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 015 | Shiftry | Shiftry | 223177d5-5156-4bca-97ed-a55405d506bd | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 016 | Nincada | Nincada | 5e8491ad-fbc4-4e97-b73f-03b6666ffff5 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 017 | Ninjask | Ninjask | 756b62e3-5bf9-4aa7-9204-5682cb5f312c | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 018 | Dhelmise | Dhelmise | b01f0f86-df22-4b41-b8ad-e4d1053d6812 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 019 | Vulpix | Vulpix | 3a862499-6f17-4531-85d2-30dfc726d882 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 020 | Ninetales | Ninetales | 728642b0-10e0-47fe-902e-acc0cc0f7c6f | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 021 | Numel | Numel | e4ccbd91-a03c-416d-969a-af1c8faa7d0f | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 022 | Mega Camerupt ex | Mega Camerupt ex | d13cd05f-d7f8-47c1-92bf-76196414895f | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 1 |
| me01 | 023 | Litleo | Litleo | 3a300a8d-7e5c-4744-9b3b-2961adcd57a2 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 025 | Volcanion | Volcanion | c906523d-dd38-4899-b343-9339ab6ee3f7 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 026 | Scorbunny | Scorbunny | f2a6ce1c-3b4b-4b21-a367-25c6c9a4e2fd | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 027 | Raboot | Raboot | d7e33cc1-581b-4b4c-8497-be10892dbe0f | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 029 | Sizzlipede | Sizzlipede | 3b3e22cf-5165-41ec-9b6e-b441e00528fe | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 030 | Centiskorch | Centiskorch | 3bdab7d9-494e-429a-85c4-5bc4f60b56a5 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 031 | Chi-Yu | Chi-Yu | 9458269b-b01d-48a1-a299-ee775da3f6b8 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 032 | Mantine | Mantine | 46bb2c65-85ca-4e54-82c8-bd4dc9709d3d | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 033 | Corphish | Corphish | d6783e4a-9296-4fec-a85a-98f170b8ecdb | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 034 | Kyogre | Kyogre | 36d01240-1013-435a-8216-4b9b333a8281 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 035 | Snover | Snover | fb0d293a-e731-45d7-af05-85dfe35b6da8 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 036 | Mega Abomasnow ex | Mega Abomasnow ex | 6041ea6e-d598-45cd-82d5-43ff9af86265 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| me01 | 037 | Clauncher | Clauncher | 03253b6e-c0ca-420e-9b5c-548142b39f81 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 038 | Clawitzer | Clawitzer | 994a32c6-4774-400e-ad94-ef39aaba0836 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 039 | Sobble | Sobble | e392d99c-0dbe-44b7-8d41-a2c8f6947c65 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 040 | Drizzile | Drizzile | cc6e8e9a-0505-49f6-917f-782f106de7f4 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 041 | Inteleon | Inteleon | b23ef0b8-9ab7-4333-9ec7-10555b8ae142 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 042 | Snom | Snom | 7a9e718f-f302-455c-a90a-4dd024d773b6 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 043 | Frosmoth | Frosmoth | 4b1ec036-6918-451c-b8d8-504347b96fa1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 044 | Eiscue | Eiscue | 079a15ab-610e-4d7e-b8ba-f4dff5ac97c9 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 045 | Magnemite | Magnemite | c910f0c6-98f9-48c9-9a97-44a7d766a91c | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 046 | Magneton | Magneton | 61df2e14-a9e4-4741-a957-4fef75468dee | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 047 | Magnezone | Magnezone | a4240ebf-2820-4455-90a5-5e24c780758d | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 049 | Electrike | Electrike | 4b121129-bf0a-4835-8af6-dbed0c23b962 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 050 | Mega Manectric ex | Mega Manectric ex | df1a84f9-7a7c-44a6-bce2-b6a21947ac8f | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| me01 | 051 | Pachirisu | Pachirisu | a3c9641f-5152-4bc9-aec6-f7f5f836a5b6 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 052 | Helioptile | Helioptile | 007c91d0-6e49-4654-b88e-da105cd4bac9 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 056 | Alakazam | Alakazam | 9b837cfd-0f7f-4bd1-ab75-c9b8c14ba027 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 057 | Jynx | Jynx | 91eba394-d9a1-4e7e-926f-381d2abd8a32 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 060 | Mega Gardevoir ex | Mega Gardevoir ex | addfd1d7-c1cc-42e4-a4c2-ffddbba89022 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| me01 | 061 | Shedinja | Shedinja | 006ee906-bf8c-46dd-9e14-ac623ba3c596 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 063 | Grumpig | Grumpig | 99d7e313-27de-4da7-a10e-3d2bb898ebcd | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 064 | Xerneas | Xerneas | e003f060-6249-47f6-b31b-e2cb4cac5611 | holo, normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 3 | 0 |
| me01 | 065 | Greavard | Greavard | 33096065-fff0-42f9-9df2-52516e55cd04 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 066 | Houndstone | Houndstone | 56611277-9b14-49e5-b71a-4fc1c675f973 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 067 | Gimmighoul | Gimmighoul | 952acdf6-f707-4bac-a111-133a2d456207 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 069 | Sandslash | Sandslash | 29cd9592-1684-425b-9102-000c335f53b5 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 070 | Onix | Onix | b522fb51-1555-4d51-94a4-359988bbbe5f | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 071 | Tyrogue | Tyrogue | 61a36b8f-49cd-4200-9e4b-49a2a042060c | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 072 | Makuhita | Makuhita | 38d96ab4-73b8-4a03-9b2a-2d0439e3effc | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 073 | Hariyama | Hariyama | 4faab1bd-e8ce-4fe8-8fda-cd2167875850 | holo, normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 3 | 0 |
| me01 | 077 | Mega Lucario ex | Mega Lucario ex | f6c13207-e0b4-413d-a54d-f7eab7cdeadb | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 1 |
| me01 | 079 | Toxicroak | Toxicroak | 564ce33e-8dce-40b9-abad-b71b85e50bb6 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 081 | Stonjourner | Stonjourner | 8fbc6c9f-5494-4a27-88ec-b47b75626670 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 082 | Nacli | Nacli | 1b68a134-7b27-448d-b27d-bd6c792e1cf1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 083 | Naclstack | Naclstack | 4e4b3fa7-31fc-4740-a617-5be4d5ad453e | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 085 | Crawdaunt | Crawdaunt | cea4de22-3921-46bf-a88a-41a60978a936 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 087 | Spiritomb | Spiritomb | 8be2f619-a4eb-4cb3-85f2-550e1bd332e7 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 088 | Yveltal | Yveltal | 69c0e94b-9641-410a-a9f3-62b5bd0b6a79 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 089 | Nickit | Nickit | c1d12a78-15fd-4101-92b1-d03e06aab576 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 090 | Thievul | Thievul | 1df8b92b-eff7-4f4d-a82f-1302c9885a80 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 091 | Shroodle | Shroodle | 0003593d-5fc1-4f51-a5fa-4211e946c257 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 092 | Grafaiai | Grafaiai | 2fbd7a5a-fb64-4dda-889d-ff2ba59aac7e | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 094 | Mega Mawile ex | Mega Mawile ex | d05ad932-fbfe-40b6-b812-2097add0e93c | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| me01 | 096 | Tinkatink | Tinkatink | 36dea4d3-2ca5-4397-a359-cfbf98023aab | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 097 | Tinkatuff | Tinkatuff | 0af77d06-ad91-4f6d-a5fb-c53f2a349628 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 098 | Tinkaton | Tinkaton | 90da4fea-bf5b-4335-a5f5-dcb7fab86958 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| me01 | 099 | Gholdengo | Gholdengo | 20f18283-9337-47d2-a807-37f019221717 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| mep | 001 | Meganium | Meganium | 6419894a-137f-4fc7-8db1-fa853872b190 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 002 | Inteleon | Inteleon | b75d4730-3c1a-42ca-9d18-e8ca736ae41f | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 003 | Alakazam | Alakazam | aa9f207d-c9ea-4607-bbc5-448648bca47f | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 004 | Lunatone | Lunatone | bf523703-271c-49fe-b8aa-c31c57cb9b32 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 005 | Drifloon | Drifloon | 04e533ae-dd17-478c-ab46-220859079b2c | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 006 | Drifblim | Drifblim | ac2b6cf7-6873-44e8-96b9-e03a179fae51 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 007 | Psyduck | Psyduck | 870f45fe-0680-4a92-b77b-dd03a6018bd3 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 008 | Golduck | Golduck | 47f874b2-ea20-4b89-af44-085905bb1f60 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 009 | Alakazam | Alakazam | a3624761-be25-4841-83e4-c5936ec434fe | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| mep | 010 | Riolu | Riolu | 242de512-f2fb-4994-9615-6c1e2c55ac02 | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| pl1 | 6 | Dialga | Dialga | cfbaec4b-bc98-4f6f-8b06-a30dbe29af30 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| pl1 | 122 | Dialga G | Dialga G | 9d20653b-49ea-4a30-8e18-629267d7397b | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl1 | 123 | Drapion | Drapion | 1cc5b95e-c5b7-477c-a3c1-1d4c26e10875 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl1 | 124 | Giratina | Giratina | 9deb3714-1f02-4eb2-a249-6b3b42a106cb | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl1 | 125 | Palkia G | Palkia G | 182aab06-7802-4dea-90cb-32dfc7cefaab | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl1 | 126 | Shaymin | Shaymin | 24bd8689-4031-40d0-8948-1d08e652ef34 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl1 | 127 | Shaymin | Shaymin | 1f03518a-bed9-4c04-ad0c-3a5cf3008248 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl1 | SH4 | Lotad | Lotad | 74b9d351-aecc-4ff9-8ed2-958311074af7 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl1 | SH5 | Swablu | Swablu | e48e17b9-b693-4882-9e9f-d177dbce37c8 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl2 | 1 | Arcanine | Arcanine | 2ebe059c-614e-4dd6-812f-ebf268459ce5 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| pl2 | 3 | Darkrai G | Darkrai G | 9d6eb3c7-dc61-4543-b436-a67fd23ba16c | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| pl2 | 5 | Flygon | Flygon | 1970689f-8f93-4148-96b2-0ed8ed149568 | holo, normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 3 | 0 |
| pl2 | 71 | Nidoran ♀ | Nidoran♀ | 8c817161-627f-4ff5-aa27-127757b88213 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| pl2 | 72 | Nidoran ♂ | Nidoran♂ | bc120b0e-4aad-47c1-989b-a733435a2000 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| pl2 | 95 | Team Galactic's Invention G-107 Technical Machine | Team Galactic's Invention G-107 Technical Machine | f619ad6c-007c-4e4d-bea0-a4a517cffa50 | normal, reverse | tcgcsv_tcgplayer_catalog, tcgdex | 2 | 0 |
| pl2 | 103 | Alakazam 4 | Alakazam 4 | a1b66404-67e9-4586-8ac9-873c421da31e | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl2 | 104 | Floatzel GL | Floatzel GL | 5fd2b141-a2af-4c2c-bb33-df2c2af58c02 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl2 | 105 | Flygon | Flygon | 7d47083d-43a4-4868-9bac-eb1deb237136 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl2 | 106 | Gallade 4 | Gallade 4 | 60789fd6-a0bb-49cd-848f-1ba462f4e965 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl2 | 107 | Hippowdon | Hippowdon | 2ef89f59-3bd7-430f-9e71-42fea8cdd8ae | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl2 | 108 | Infernape 4 | Infernape 4 | a719dd63-f527-4edf-8c8e-e77bac65a715 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
| pl2 | 110 | Mismagius GL | Mismagius GL | 26d6335d-9483-4de2-8b1b-771c43ab31cb | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl2 | 111 | Snorlax | Snorlax | 25c91739-b09a-4360-94e5-9a8b1ed43755 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl2 | RT2 | Frost Rotom | Frost Rotom | f5ada689-45c1-4b23-ac62-6a9f0bc11c97 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl2 | RT4 | Mow Rotom | Mow Rotom | 949f5c1d-6d29-41cd-91c9-0be81e5360c5 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl2 | RT6 | Charon's Choice | Charon's Choice | 0a14f347-5dd0-425a-9c9c-ffd134a9de4f | reverse | pokemontcg_api, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl3 | 141 | Absol G | Absol G | 8cd92a82-149d-43b4-a7d3-d65782536182 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl3 | 142 | Blaziken FB | Blaziken FB | 79097350-eb58-44e8-bd39-3ec5f417f02b | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl3 | 143 | Charizard G | Charizard G | 880dc8c7-6959-4fda-b79a-32e48c684267 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl3 | 144 | Electivire FB | Electivire FB | 29a4bca4-6264-45f6-bc24-1d5ded5520cd | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl3 | 145 | Garchomp C | Garchomp C | 2c1b3125-dd67-4522-b3e0-5621c05f7a9a | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl3 | 146 | Rayquaza C | Rayquaza C | 89f61622-12a4-4861-abb3-ef3dbcaf2a86 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl3 | 147 | Staraptor FB | Staraptor FB | fa6310ae-be43-4309-af1d-a5033daff2f0 | holo | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 1 | 0 |
| pl3 | SH8 | Relicanth | Relicanth | 9089264b-fd13-4261-94ac-b252ab89f6c7 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl3 | SH9 | Yanma | Yanma | e8a8c0b0-2213-4701-89a9-8926cc0d5669 | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | 1 | Charizard | Charizard | a02f871c-fe3e-432b-944d-6decea0eecdf | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| pl4 | 6 | Mothim | Mothim | 71779a8b-ee22-4892-9425-8e3da51f179a | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| pl4 | 9 | Swalot | Swalot | 3059259e-c28b-49d6-9f31-64e178e87f28 | holo, normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 3 | 0 |
| pl4 | 12 | Zapdos | Zapdos | 8716f287-3497-49b2-a499-9c1e026a6a94 | holo, reverse | reverseholo_set_checklist, tcgdex | 2 | 0 |
| pl4 | 94 | Arceus LV.X | Arceus LV. X | 460e6437-4bc8-4a1c-90fc-546481f225e2 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | 95 | Arceus LV.X | Arceus LV. X | c5125a59-32a9-4a0f-98af-4cf4ad5d6d64 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | 96 | Arceus LV.X | Arceus LV. X | ad751d34-d43b-4644-ae2e-622725f781cd | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | 97 | Gengar LV.X | Gengar LV. X | 1352eb03-1519-4e31-b7ad-a2d4af24ef65 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | 98 | Salamence LV.X | Salamence LV. X | 2fb3462d-4a19-4412-b8cd-848a669549a0 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | 99 | Tangrowth LV.X | Tangrowth LV. X | b319332c-aea7-4f3c-ad4c-02f0874b2d60 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | AR2 | Arceus | Arceus | cf859f9b-f1d6-41ec-9e38-c7fd27743777 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | AR3 | Arceus | Arceus | 8b2c91cf-bd7c-4564-84ca-5863e1414257 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | AR4 | Arceus | Arceus | 61cd00a6-3418-4980-ade8-b26c8d0b4d5c | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | AR5 | Arceus | Arceus | 63a0a7b8-bdfa-4a08-ad30-680bcc45802e | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | AR7 | Arceus | Arceus | 67e47461-e03c-4da3-8557-d3df639dbb98 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | AR8 | Arceus | Arceus | 0db1b355-bb14-4042-8597-4afd1d9a2b77 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | SH10 | Bagon | Bagon | 502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| pl4 | SH11 | Ponyta | Ponyta | 22a0396f-a0fe-4680-8568-71246489db3c | reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 001 | Pineco | Pineco | 5683e068-ffb7-4689-93ed-71df3f25d037 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 002 | Forretress ex | Forretress ex | eb2af5ec-a7fb-4792-a54c-30f8ef2e8a8b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 004 | Toedscool | Toedscool | 022c209e-c0ff-4e94-beeb-9d784af48afd | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 005 | Toedscruel ex | Toedscruel ex | d71315e2-8ea6-40e1-86e2-cf44878ef696 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 006 | Espathra ex | Espathra ex | ea4af720-a5fc-4698-8cbf-2eb290e8e0d8 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 007 | Charmander | Charmander | 3729104f-71b2-4242-801a-bec9dc31369b | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 008 | Charmeleon | Charmeleon | 39599b5f-9417-4d67-9d4f-630e413256a2 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 014 | Charcadet | Charcadet | 8a71b7c8-ef01-4c87-b5a6-4974984b14d6 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 015 | Armarouge | Armarouge | 5b3fb3aa-2b58-4997-841f-d6771ec3ebc6 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 017 | Frigibax | Frigibax | 47c5fb97-513b-498f-b486-9f8200c190eb | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 018 | Pikachu | Pikachu | 2f06c6c9-7029-443d-ba68-4b6dfae249db | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 1 |
| sv04.5 | 019 | Raichu | Raichu | 6297f5c1-890d-4808-891a-9da9fd74e488 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 022 | Kilowattrel | Kilowattrel | 981463fa-b005-481c-9f58-bd2537c303f8 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 025 | Natu | Natu | d3e61e14-24de-4e3a-948a-d20f8c3b5ab1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 026 | Xatu | Xatu | f43170ba-0ad7-4d6b-8be6-472ea917f334 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 027 | Ralts | Ralts | 63195337-0d2c-45aa-9b27-c6e81804887b | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 028 | Kirlia | Kirlia | c751326c-70f6-4ef4-aea8-fe50fdee8c41 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 029 | Gardevoir ex | Gardevoir ex | caa0d1ef-8978-4a9d-9471-be026b81b7d6 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 031 | Mime Jr. | Mime Jr. | 95642256-f37a-4dfe-aa7f-d040edcfd913 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 037 | Mimikyu | Mimikyu | c9741bc3-a9ef-4d2a-936f-1cc9d0e1c7c9 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 039 | Dachsbun | Dachsbun | 21efc498-eb90-420f-8bca-cd36828e49ac | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 040 | Ceruledge | Ceruledge | 8cf2db86-e98d-4d06-8882-39e8a6c68d30 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 041 | Flittle | Flittle | 1d9a2684-98e7-4e6d-92d9-2b2c3c0c4d6c | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 043 | Houndstone | Houndstone | 9dea129c-3d64-4b6a-8550-2847c5b45f1f | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 045 | Mankey | Mankey | e873f70d-770a-4cd6-b3dc-7d6d6e75874b | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 046 | Primeape | Primeape | 781a7cb9-894a-4583-89d8-8c7b9aa180c1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 047 | Annihilape | Annihilape | 435c0599-12c2-4042-9401-8290af312bf6 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 054 | Charizard ex | Charizard ex | 342fa217-9ddb-4b1e-acb7-d958bc7ced80 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 058 | Paldean Wooper | Paldean Wooper | f4bbb6a5-7efc-482c-ad91-ade33d3cb951 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 059 | Paldean Clodsire ex | Paldean Clodsire ex | 10bb5109-1801-49ed-8a2b-786fde2e9423 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 063 | Mabosstiff | Mabosstiff | b0971232-a14d-4039-9ca4-79ee006e3342 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 064 | Varoom | Varoom | 137e1fe1-8baa-4351-92dc-16fff7687713 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 065 | Revavroom | Revavroom | 62235f32-cda8-4423-b782-ca2c773a94ea | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 068 | Noibat | Noibat | 669038cb-8856-471d-a392-ba1dbe019549 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 069 | Noivern ex | Noivern ex | 07bc9efc-7ff0-4070-9a85-309245b21919 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 070 | Cyclizar | Cyclizar | 3d5d4c62-83d0-4996-878b-e3a61872f4ac | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 071 | Lechonk | Lechonk | 6bc0a20c-6763-480d-a23e-0ae313361f02 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 072 | Oinkologne | Oinkologne | 085a3cb5-d8c9-4750-b53b-968eb1c89f85 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 073 | Tandemaus | Tandemaus | 83300f8d-00bf-4b21-b4d9-55014bb1e051 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 074 | Maushold | Maushold | 74d9f934-5bb9-4d35-8e0e-924c13559cbc | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 075 | Squawkabilly ex | Squawkabilly ex | c711d654-f865-4e01-bb83-51a37bc7bb5a | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 078 | Clive | Clive | be8f9f47-28a4-4d25-abd5-527f3cf13549 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 080 | Iono | Iono | ac12c85c-33c2-4d09-aa59-65f037d3d8ba | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 082 | Nemona | Nemona | e693095f-36a3-4275-ba98-fd19b3093989 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 085 | Paldean Student | Paldean Student | cf012088-486e-4fb5-8f36-e80c9a0f176f | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 086 | Paldean Student | Paldean Student | 29e16368-8c5c-4f90-8881-c8294c0f0ae8 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 087 | Professor's Research | Professor's Research | 23361253-6606-47b7-9ad5-0debd1571dbf | holo, reverse | pokemontcg_api, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 088 | Professor's Research | Professor's Research | 776e8594-2843-4f0a-b83a-92f6ba1421c1 | holo, reverse | pokemontcg_api, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv04.5 | 099 | Pineco | Pineco | 10134134-181d-439e-9bc2-6209b2ce9479 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 105 | Toedscool | Toedscool | 572c0280-a485-4f9a-9aa8-dbe87c02aecc | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 109 | Charmander | Charmander | 1396ccbe-30a9-4983-be09-ab15ae262b25 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 110 | Charmeleon | Charmeleon | ebc68786-487a-4dee-ac92-58ea6a098dea | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 111 | Paldean Tauros | Paldean Tauros | 65098521-9846-48dc-a83b-1b19267228e4 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 114 | Charcadet | Charcadet | adff063a-78fa-4476-bcc6-4f0370569646 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 115 | Armarouge | Armarouge | 5908a919-1f88-43e3-abc1-818607c0312e | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 120 | Paldean Tauros | Paldean Tauros | cc77534d-bd0f-4b56-9d93-72f32cd18e4c | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 122 | Wugtrio | Wugtrio | aedac2dd-0b5e-48f2-a731-fec5f03d012f | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 124 | Palafin | Palafin | 34362874-59c6-4192-a06c-340f6dd3837f | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 128 | Frigibax | Frigibax | d9acc545-3cf3-4271-b9c5-10e4d8e49f4c | holo | reverseholo_set_checklist, tcgdex, thepricedex_price_list | 1 | 0 |
| sv04.5 | 131 | Pikachu | Pikachu | 12be1528-cdb7-49a1-b260-7b99e6bffb0f | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 132 | Raichu | Raichu | 5f24e43e-de82-4936-aab3-f3adad23546b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 142 | Pawmi | Pawmi | 3a4a0b76-3090-4101-a7ea-c40c4c873e82 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 146 | Kilowattrel | Kilowattrel | c68ac5d8-dae5-470d-9bad-184122f9a7a7 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 151 | Natu | Natu | 62e3ae56-ccc5-426c-9deb-7396b90fa860 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 152 | Xatu | Xatu | 866611cf-097c-499e-b261-307d9042063b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 153 | Ralts | Ralts | c204419b-bb77-4c12-bbdd-af8cd67dc129 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 154 | Kirlia | Kirlia | 6e305d6f-42b2-40c4-b793-6572bb0b6eec | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 157 | Mime Jr. | Mime Jr. | a3be1a30-846e-4472-bd9f-38869479c2da | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 160 | Mimikyu | Mimikyu | c1d39927-17d2-4ec5-9e5d-cfd150499f99 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 161 | Dachsbun | Dachsbun | 15d9d0f2-4af5-4379-b3ce-c542aa79abca | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 162 | Ceruledge | Ceruledge | 4c2ffe1e-99d7-4fdb-864f-f7de25f70820 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 164 | Flittle | Flittle | f97d3c2b-dd58-49d3-a3e5-fdba2cc0a978 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 168 | Houndstone | Houndstone | 48093308-7611-4e2f-b72c-e1e00998ce98 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 169 | Mankey | Mankey | f820412a-5350-4904-abf2-309a4cb8d9ad | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 170 | Primeape | Primeape | 93a6bc64-fc79-40e9-b673-b9075cb586bd | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 171 | Annihilape | Annihilape | a0d9a87f-322c-4196-9601-cc3d61d986a7 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 172 | Paldean Tauros | Paldean Tauros | e4ccd186-4008-44ce-9da1-17f906967b3b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 180 | Paldean Wooper | Paldean Wooper | 50c23912-0d9e-4aa3-a6ce-89690f4d723e | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 188 | Mabosstiff | Mabosstiff | a1330e3c-958a-4f95-834c-4a71654ea3b7 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 192 | Varoom | Varoom | ac32974d-1162-4351-87ec-4a8b066347aa | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 193 | Revavroom | Revavroom | 0d15fac8-1e01-4e61-b1ad-e6e63ba9585b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 194 | Noibat | Noibat | 761104bd-0dd3-40b3-8f42-f5c08ed3fa9f | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 195 | Cyclizar | Cyclizar | 602350f3-fc08-4377-813a-c0ba8d14c3fc | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 207 | Lechonk | Lechonk | e598e761-8e55-4dd9-bf8b-6d8ab7b338b0 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 208 | Oinkologne | Oinkologne | a5a618f7-0d2c-4b1a-b6f0-5cd290bb92b0 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 209 | Tandemaus | Tandemaus | ba4560be-f2f4-4215-a491-d5921c90741d | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 210 | Maushold | Maushold | fe4e77cb-cb3c-430f-b1a8-546c571d60c2 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 212 | Forretress ex | Forretress ex | 11214a18-d9af-4749-866f-3ca53e52aea6 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 213 | Toedscruel ex | Toedscruel ex | 2a78f6c5-417c-4f8e-8d88-271cf636cf0d | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 214 | Espathra ex | Espathra ex | 69b2c7b5-06cd-40e5-9b05-3f1d6ac0fdc1 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 216 | Mew ex | Mew ex | ed1b7841-409f-441e-8f0a-e93f053c2746 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 217 | Gardevoir ex | Gardevoir ex | 2868eb6f-4c58-4aa5-b534-bf24dde6ced5 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 219 | Paldean Clodsire ex | Paldean Clodsire ex | 849fc9b4-142f-4546-be4d-5b9f3bb22dbe | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 220 | Noivern ex | Noivern ex | 723229b0-367f-4b4c-9d6b-b3d106a0c1bb | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 223 | Squawkabilly ex | Squawkabilly ex | 848b0369-216e-4b13-b5a8-fd69d45d9241 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 224 | Wugtrio | Wugtrio | f6ad16dc-f640-4cd4-9910-807a197d3918 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 225 | Palafin | Palafin | 8b8c9c59-554f-4281-8251-66f8f5396317 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 226 | Pawmi | Pawmi | 3fec273e-8d1c-45c5-ac3f-aedae40bd96a | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 227 | Clive | Clive | be95e142-8658-41ed-bf4a-d1df35c02327 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 229 | Nemona | Nemona | d9c7a5c5-7b01-4e16-a0af-ba3ff692a761 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 230 | Paldean Student | Paldean Student | 4891f891-4098-482e-9c9a-0855db8bbfef | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 231 | Paldean Student | Paldean Student | b2ba73b5-e610-4294-9eae-3f19592885fa | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 232 | Mew ex | Mew ex | d47f9441-d9b6-4713-8378-2bba2cb034c8 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 233 | Gardevoir ex | Gardevoir ex | f8f6f3b0-d748-4cfe-9a49-475a2e13fe6e | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 234 | Charizard ex | Charizard ex | 6abed0fa-5f5a-4328-952c-9a92a86180bf | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 236 | Clive | Clive | 6cb8c3c0-97b8-461b-9026-d5d970ab2e54 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 237 | Iono | Iono | e2b87581-98c3-4e6e-960d-baa22c117c3c | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv04.5 | 238 | Nemona | Nemona | 0e6aca61-34c9-451a-b4fc-0c9a9c0c8513 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| sv06.5 | 006 | Tapu Bulu | Tapu Bulu | fea19e50-8295-4b9a-a653-07fe4b0e2b55 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 2 | 0 |
| sv06.5 | 008 | Houndoom | Houndoom | 06f1e767-99e6-4853-bd86-a41a55cf3d9a | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 010 | Horsea | Horsea | 2e7d63cb-3a11-44b8-ac08-6edcbf405ba3 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 012 | Kingdra ex | Kingdra ex | 29c98330-0a72-4f2e-8fba-7a0005b20dbf | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 015 | Revavroom ex | Revavroom ex | 556e6391-212a-4da6-baf9-34b2d2f2efe7 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 018 | Duskull | Duskull | 8684a96e-9a74-4e36-ae2b-18f85dc7a42a | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 019 | Dusclops | Dusclops | c6afa971-a1cb-4f45-ab5e-bbc407fc5af1 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 020 | Dusknoir | Dusknoir | adb529a0-8a7e-4339-a517-b21f1f0081b6 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 2 | 0 |
| sv06.5 | 021 | Cresselia | Cresselia | 132bd56e-d03e-4d50-98e5-defab35ebff1 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 2 | 0 |
| sv06.5 | 031 | Zorua | Zorua | 565e7a5d-7c00-4b53-8f9f-efc098c05544 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 036 | Okidogi ex | Okidogi ex | 3896915d-6fca-4e44-99c8-1df73b377ddf | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 037 | Munkidori ex | Munkidori ex | 6a0fdd77-5d10-4802-ba6b-570fa6dcbbd1 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 038 | Fezandipiti ex | Fezandipiti ex | 47677f6c-0789-49e3-ac8a-b26ee0afb0a5 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 1 |
| sv06.5 | 039 | Pecharunt ex | Pecharunt ex | 5db87385-245a-42a6-9bb1-74cc23ff2d65 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 041 | Cufant | Cufant | c51bea66-e243-4d68-a673-c33150bdecdb | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 045 | Fraxure | Fraxure | f283aeaa-dcaf-4a70-b94d-13849be28317 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 049 | Persian | Persian | 23b677f5-9453-460f-a2eb-49c18b80d89d | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 053 | Bewear | Bewear | 75dee3a0-eba6-4da0-91a2-67d806af9656 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 056 | Cassiopeia | Cassiopeia | 560786bd-0eab-4bae-871a-2292db4153c0 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 057 | Colress's Tenacity | Colress's Tenacity | 62b9c8cd-4be6-483c-b5b8-6cd7bd1aeb5e | normal, reverse | pokemontcg_api, tcgcsv_tcgplayer_catalog, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 059 | Janine's Secret Art | Janine's Secret Art | 75b10dac-840f-4bde-829f-9dd1f7bf1c90 | normal, reverse | pokemontcg_api, tcgcsv_tcgplayer_catalog, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 063 | Powerglass | Powerglass | 0d3cadd0-0beb-4be0-a696-d7fb884fa38e | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 064 | Xerosic's Machinations | Xerosic's Machinations | b2b2b7f2-216b-4b3e-ad9e-9802b4fce8db | normal, reverse | pokemontcg_api, tcgcsv_tcgplayer_catalog, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv06.5 | 065 | Tapu Bulu | Tapu Bulu | aa601988-db2e-4e7e-92c4-6c48cad26c37 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 066 | Houndoom | Houndoom | 687fd3a7-37cf-405c-bcd8-39d11ba849a6 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 067 | Horsea | Horsea | 0a08600f-78ba-4eec-aca6-a45691856c7b | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 068 | Duskull | Duskull | c6656ef3-8b13-4def-a273-4cf38803a9e3 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 069 | Dusclops | Dusclops | 4f284e55-1b3d-4cdb-ae5b-33551d4053bf | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 070 | Dusknoir | Dusknoir | 245aeaff-5dcd-48af-9884-0b58641b428d | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 071 | Cresselia | Cresselia | 0e79aa75-02d3-4e8b-8b71-e12540fd62be | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 075 | Zorua | Zorua | 1d859ab0-4750-4010-8a50-0b90de5cd9b6 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 076 | Cufant | Cufant | ed845dda-99a8-41fe-b8ad-d62b6622fe13 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 077 | Fraxure | Fraxure | 3ae3ffb3-34b9-4f9e-95cc-b9b1bfbd26c4 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 078 | Persian | Persian | 1a9b8edb-41a6-4b56-bb4b-509ed4ef435b | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 079 | Bewear | Bewear | f3e89225-f20b-426c-827d-c6e11d95904f | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 080 | Kingdra ex | Kingdra ex | 0e6039fc-0efe-44a3-9d31-3b6f0b2b3202 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 081 | Revavroom ex | Revavroom ex | e410436e-73d8-4f89-bfd2-25f620c3845a | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 082 | Okidogi ex | Okidogi ex | 38a74314-79ed-4c28-9a84-630a2f8e2b67 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 083 | Munkidori ex | Munkidori ex | d56f7ee3-f6a0-4835-92ef-bc99e0c8d78a | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 084 | Fezandipiti ex | Fezandipiti ex | a0aa9e24-a2b4-4a93-b4d4-2c61025b9861 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 085 | Pecharunt ex | Pecharunt ex | fd724a0d-2007-46ea-87be-c9c8f86a09ac | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 086 | Cassiopeia | Cassiopeia | e9b33194-764e-46c6-af07-dc06fb1515ef | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 087 | Colress's Tenacity | Colress's Tenacity | 66a5222f-fe66-43e7-b689-7ab9fadce939 | holo | pokemontcg_api, tcgcsv_tcgplayer_catalog, thepricedex_price_list | 1 | 0 |
| sv06.5 | 088 | Janine's Secret Art | Janine's Secret Art | d6ccd9e1-a552-4530-824b-9e9437d0c288 | holo | pokemontcg_api, tcgcsv_tcgplayer_catalog, thepricedex_price_list | 1 | 0 |
| sv06.5 | 089 | Xerosic's Machinations | Xerosic's Machinations | 544b207c-b467-4d3d-90a7-0e5494c8e35f | holo | pokemontcg_api, tcgcsv_tcgplayer_catalog, thepricedex_price_list | 1 | 0 |
| sv06.5 | 090 | Okidogi ex | Okidogi ex | 96e29631-06fa-4351-bed8-20413122f559 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 091 | Munkidori ex | Munkidori ex | 9d5fe8c3-9c84-45d8-b6a8-afe570de55f2 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 092 | Fezandipiti ex | Fezandipiti ex | 0630ec15-6c35-418c-bb36-5a9b65004b9e | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 093 | Pecharunt ex | Pecharunt ex | e1502def-cdd7-4165-87f2-d5a1b8d5fe3b | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 094 | Cassiopeia | Cassiopeia | 71d309e3-2644-478b-bf34-5e027f05c6fc | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 095 | Pecharunt ex | Pecharunt ex | 9c3ce1f9-9859-4b12-947d-25d813507b93 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv06.5 | 097 | Powerglass | Powerglass | c81315d5-0c05-48ca-8026-057e0e1eec40 | holo | pokemontcg_api, reverseholo_set_checklist, thepricedex_price_list | 1 | 0 |
| sv08.5 | 005 | Leafeon | Leafeon | c11bc9b0-0fe8-488c-bdef-cf1b64f894ec | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 008 | Whimsicott | Whimsicott | 0c9700c4-ca45-4e83-a865-e1a3dee48e80 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 013 | Flareon | Flareon | edc42048-89fc-4cff-8422-ebc9f233f386 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 022 | Vaporeon | Vaporeon | 9ed9e9aa-4019-42c5-8051-072fb56a7569 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 025 | Glaceon | Glaceon | fb911570-4f51-4c86-b030-832974bffcc4 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 029 | Jolteon | Jolteon | e22b6a0d-c544-463f-9654-ba9e7d6978fd | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 033 | Espeon | Espeon | 6dfd7ee4-f9de-4d77-9373-0006bf86e1b1 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 037 | Dusknoir | Dusknoir | 32f0c83a-ba31-419f-81c8-aae5f35033d7 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 043 | Flutter Mane | Flutter Mane | ad2966e5-48b0-4f8e-b7ec-56cfb220de64 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 044 | Munkidori | Munkidori | 649e4751-83b0-49ea-83cf-75ef59f989ed | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 045 | Fezandipiti | Fezandipiti | 96e8765b-984b-40ef-b000-75e72b8f47a4 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 046 | Iron Boulder | Iron Boulder | d9d6fe68-06ab-494b-9519-fc7d76393d09 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 049 | Groudon | Groudon | 1d4be26f-d405-491c-9ce8-fee06b35e702 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 054 | Bloodmoon Ursaluna | Bloodmoon Ursaluna | 6f45550b-ef5c-4767-ad57-77212d4d65c2 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 057 | Okidogi | Okidogi | 25f1cc8a-87f0-42d9-b440-d30ad27168d6 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 059 | Umbreon | Umbreon | ffb95ade-a643-4ec6-bcb7-6ff41e5e7eae | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 065 | Roaring Moon | Roaring Moon | 0c1d028f-fc8c-4295-8c3a-2f845eb5baf8 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 070 | Archaludon | Archaludon | 8968eec8-46f8-4185-a679-ee1d5805cc78 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 078 | Noctowl | Noctowl | bafa6068-a489-4705-811b-8f864f4679d3 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| sv08.5 | 080 | Dudunsparce | Dudunsparce | 9030feb1-f99d-4e1e-8c6e-2c9f19b8b616 | holo, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| swsh10.5 | 005 | Alolan Exeggutor V | Alolan Exeggutor V | 0832c419-3fe4-439a-8490-41011fcd843b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 027 | Pikachu | Pikachu | 067bbc12-ce47-4e7a-bfbb-a9d1ac21f0d4 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| swsh10.5 | 030 | Mewtwo V | Mewtwo V | 026c495e-d29a-4232-a319-88637d470cbd | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 031 | Mewtwo VSTAR | Mewtwo VSTAR | 3d22fb24-8491-45f1-9b36-b8e609298dcd | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 040 | Conkeldurr V | Conkeldurr V | 5819fec4-dd4b-4dd5-85c8-7d781aa35367 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 047 | Melmetal V | Melmetal V | c86e3319-f1df-49c9-b46d-ba0b1c641f92 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 048 | Melmetal VMAX | Melmetal VMAX | 032a7df8-4473-4f85-a2d0-cb7dac2fadb5 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 049 | Dragonite V | Dragonite V | 3705b603-9adc-4750-aff4-bd7183db87dc | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 050 | Dragonite VSTAR | Dragonite VSTAR | 1c039535-5beb-4374-bcce-ce66645e4ad8 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 058 | Slaking V | Slaking V | d7b23d71-91c0-442d-9d6d-8ecc97f5c7a6 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 064 | Blanche | Blanche | 6206fc08-7415-414f-9c22-c2cf57493c1e | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| swsh10.5 | 065 | Candela | Candela | fc394554-fa86-4510-8a81-79f48df255c6 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| swsh10.5 | 066 | Egg Incubator | Egg Incubator | d2f87992-4951-464e-9976-4e2caef7e497 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| swsh10.5 | 067 | Lure Module | Lure Module | b45c87d9-4eef-493b-8bc7-3dd19021a7c2 | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| swsh10.5 | 070 | Spark | Spark | e44d13e5-a6ac-4016-8b81-b6305ea3414b | normal, reverse | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 2 | 0 |
| swsh10.5 | 071 | Alolan Exeggutor V | Alolan Exeggutor V | 4b809146-f6ac-4b99-81e1-f593b115a1aa | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 072 | Mewtwo V | Mewtwo V | 3236c55c-fa46-407f-b45d-9ea9186c23bb | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 073 | Conkeldurr V | Conkeldurr V | 90a71cb9-4a41-4b42-9aaf-74c521167c2d | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 074 | Conkeldurr V | Conkeldurr V | 1d784874-229a-4fc9-a347-e2ebd2eb1a6b | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 075 | Melmetal V | Melmetal V | c3d42060-46a2-48c1-826f-4979be9cf986 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 076 | Dragonite V | Dragonite V | e747c915-43a1-4bc7-8155-34d2734a2d14 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 077 | Slaking V | Slaking V | e655ae68-7398-4432-9fcd-3e4e3a1ff045 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 078 | Professor's Research | Professor's Research | 0ae65a15-2418-42ab-bf67-0142075286a6 | holo | pokemontcg_api, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 079 | Mewtwo VSTAR | Mewtwo VSTAR | 5e7675a0-aebc-40de-84c7-998a4d5c0975 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 080 | Melmetal VMAX | Melmetal VMAX | 480390a4-b8d0-4ab9-90d2-e6f61c7defa9 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 081 | Dragonite VSTAR | Dragonite VSTAR | f21c012b-48cf-48df-b62e-442a783f0e0d | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 082 | Blanche | Blanche | 259d6022-618e-4590-845b-989a6ed94bdc | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 083 | Candela | Candela | 25b25cc7-9288-4b69-b5bf-9a65410ec6b2 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 084 | Professor's Research | Professor's Research | ece1af3f-11d0-4e6b-9b93-723a4def816c | holo | pokemontcg_api, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 085 | Spark | Spark | da92a0e3-8059-48aa-8acf-39bda62dfbc3 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 086 | Mewtwo VSTAR | Mewtwo VSTAR | ab583991-a87c-423a-863d-2f8e0cbf62c3 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 087 | Egg Incubator | Egg Incubator | d99d7741-06ab-477b-b564-4529710a9ec3 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh10.5 | 088 | Lure Module | Lure Module | 122879ec-4d0f-4470-97af-cb82f2408119 | holo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list | 1 | 0 |
| swsh2 | 154 | Boss's Orders (Giovanni) | Boss's Orders (Giovanni) | 9cf48b11-bf42-4aa3-861b-c2ca5543877e | holo, reverse | tcgcsv_tcgplayer_catalog, tcgdex | 2 | 0 |
| swsh4.5 | 58 | Boss's Orders (Lysandre) | Boss's Orders (Lysandre) | 5ee8ddf9-81b3-43e0-94b5-951ac0386eb8 | normal, reverse | tcdb_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 2 | 0 |
| swsh4.5 | 60 | Professor's Research (Professor Juniper) | Professor's Research (Professor Juniper) | 17cd3179-b844-47a8-a197-ae123ca4b583 | normal, reverse | tcdb_checklist, tcgcsv_tcgplayer_catalog, tcgdex | 2 | 0 |

## Required Before Any Write

- Human review of every package row and source URL.
- Separate approved apply package with exact row IDs and intended mutations.
- Rollback artifact generated from current before-state snapshots.
- Post-apply verification queries reviewed and accepted.
- Operator approval of the exact package contents.

## Hard Rules

- Dry-run package completion is not write authorization.
- write_ready_now must remain 0 until a separate approved apply package exists.
- No package may include unsupported finishes, blocked rows, or vault-owned rows.
- No migration, cleanup, quarantine, or apply path is part of this report.
