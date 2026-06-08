# English Master Index Physical Recovery Review Gate V1

This is an audit-only review gate for the generated physical recovery dry-run packages.

It does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Decision

- review_gate_status: dry_run_packages_complete_review_required_no_write
- conclusion: The physical recovery dry-run package set is complete and internally consistent, but it is still not an apply package and does not authorize DB writes.
- write_ready_now: 0
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

| Metric | Value |
| --- | ---: |
| package_count | 12 |
| candidate_card_prints | 106 |
| candidate_printing_rows | 143 |
| db_card_prints_found | 106 |
| db_card_printings_found | 143 |
| external_mappings_referencing_targets | 132 |
| identity_rows_referencing_targets | 106 |
| trait_rows_referencing_targets | 106 |
| vault_items_referencing_targets | 0 |
| package_stop_findings | 0 |
| duplicate_card_print_ids | 0 |

## Finish Coverage

| Finish | Rows |
| --- | ---: |
| holo | 77 |
| normal | 24 |
| reverse | 42 |

## Evidence Source Presence

| Source | Package Rows Referencing Source |
| --- | ---: |
| pokemontcg_api | 65 |
| reverseholo_set_checklist | 101 |
| tcgcsv_tcgplayer_catalog | 14 |
| tcgdex | 106 |
| tcgplayer_price_guide | 63 |
| thepricedex_price_list | 75 |

## Packages

| Set | Name | Parents | Printings | DB Parents | DB Printings | External Mappings | Identity Rows | Trait Rows | Vault Items | Stop Findings |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| col1 | Call of Legends | 2 | 6 | 2 | 6 | 2 | 2 | 2 | 0 | 0 |
| dp7 | Stormfront | 8 | 10 | 8 | 10 | 8 | 8 | 8 | 0 | 0 |
| ecard2 | Aquapolis | 13 | 26 | 13 | 26 | 39 | 13 | 13 | 0 | 0 |
| ecard3 | Skyridge | 15 | 19 | 15 | 19 | 15 | 15 | 15 | 0 | 0 |
| ex10 | Unseen Forces | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 0 | 0 |
| fut2020 | Pokémon Futsal 2020 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 0 |
| mep | MEP Black Star Promos | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 0 | 0 |
| pl1 | Platinum | 9 | 10 | 9 | 10 | 9 | 9 | 9 | 0 | 0 |
| pl2 | Rising Rivals | 17 | 24 | 17 | 24 | 17 | 17 | 17 | 0 | 0 |
| pl3 | Supreme Victors | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 0 | 0 |
| pl4 | Arceus | 18 | 23 | 18 | 23 | 18 | 18 | 18 | 0 | 0 |
| swsh2 | Rebel Clash | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 0 | 0 |

## Row Inventory

| Set | Number | Target Name | Current Grookai Name | Card Print ID | Finishes | Sources | Children | Vault Items |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
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
| fut2020 | 1 | Pikachu on the Ball | Pikachu on the Ball | a676888d-19e0-4064-89aa-e67019af5b95 | holo | reverseholo_set_checklist, tcgdex | 1 | 0 |
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
| swsh2 | 154 | Boss's Orders (Giovanni) | Boss's Orders (Giovanni) | 9cf48b11-bf42-4aa3-861b-c2ca5543877e | holo, reverse | tcgcsv_tcgplayer_catalog, tcgdex | 2 | 0 |

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
