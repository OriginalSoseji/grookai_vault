# English Master Index Physical Recovery Apply Design V1

This is an audit-only apply design packet for PKG-01 physical missing-set recovery.

It is not executable, not approved, and does not authorize DB writes, migrations, cleanup, quarantine, or apply execution.

## Decision

- apply_design_status: apply_design_complete_approval_required_no_write
- approval_status: operator_approval_required_before_any_write
- conclusion: The PKG-01 physical recovery apply design is complete enough for human review, but it is not executable and does not authorize writes.
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
| before_child_printing_rows | 143 |
| external_mappings_referencing_targets | 132 |
| identity_rows_referencing_targets | 106 |
| trait_rows_referencing_targets | 106 |
| vault_items_referencing_targets | 0 |
| stop_findings | 0 |
| write_ready_now | 0 |

## Changed Parent Fields

| Field | Rows |
| --- | ---: |
| name | 11 |
| number | 88 |
| set_code | 106 |

## Packages

| Set | Name | Parents | Printings | Changed Fields | Vault Items | Status |
| --- | --- | ---: | ---: | --- | ---: | --- |
| col1 | Call of Legends | 2 | 6 | number:2, set_code:2 | 0 | approval_required_no_write |
| dp7 | Stormfront | 8 | 10 | number:8, set_code:8 | 0 | approval_required_no_write |
| ecard2 | Aquapolis | 13 | 26 | set_code:13 | 0 | approval_required_no_write |
| ecard3 | Skyridge | 15 | 19 | number:11, set_code:15 | 0 | approval_required_no_write |
| ex10 | Unseen Forces | 3 | 3 | name:3, number:3, set_code:3 | 0 | approval_required_no_write |
| fut2020 | Pokémon Futsal 2020 | 1 | 1 | set_code:1 | 0 | approval_required_no_write |
| mep | MEP Black Star Promos | 10 | 10 | number:10, set_code:10 | 0 | approval_required_no_write |
| pl1 | Platinum | 9 | 10 | number:9, set_code:9 | 0 | approval_required_no_write |
| pl2 | Rising Rivals | 17 | 24 | name:2, number:17, set_code:17 | 0 | approval_required_no_write |
| pl3 | Supreme Victors | 9 | 9 | number:9, set_code:9 | 0 | approval_required_no_write |
| pl4 | Arceus | 18 | 23 | name:6, number:18, set_code:18 | 0 | approval_required_no_write |
| swsh2 | Rebel Clash | 1 | 2 | number:1, set_code:1 | 0 | approval_required_no_write |

## Mutation Design Matrix

| Set | Card Print ID | Before Set | After Set | Before Number | After Number | Before Name | After Name | Generated Readback | Children | Vault Items |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
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
| fut2020 | a676888d-19e0-4064-89aa-e67019af5b95 |  | fut2020 | 1 | 1 | Pikachu on the Ball | Pikachu on the Ball | number_plain=1 | 1 | 0 |
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
| swsh2 | 9cf48b11-bf42-4aa3-861b-c2ca5543877e |  | swsh2 |  | 154 | Boss's Orders (Giovanni) | Boss's Orders (Giovanni) | number_plain=154 | 2 | 0 |

## Rollback Design

Rollback must restore only the directly assigned parent fields for the exact `card_print_id` list from a fresh pre-write snapshot.

| Set | Card Print ID | Rollback Set | Rollback Number | Rollback Name |
| --- | --- | --- | --- | --- |
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
| fut2020 | a676888d-19e0-4064-89aa-e67019af5b95 |  | 1 | Pikachu on the Ball |
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
| swsh2 | 9cf48b11-bf42-4aa3-861b-c2ca5543877e |  |  | Boss's Orders (Giovanni) |

## Verification Plan

| Check | Expected |
| --- | ---: |
| all_target_parent_rows_resolved | 106 |
| all_target_child_printings_unchanged | 143 |
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
