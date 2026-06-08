# English Master Index Operator Approval Packet V1

This is a no-write human review packet for the future PKG-01 physical recovery candidate.

It is not approval, not SQL, not a migration, and not an execution artifact.

## Status

| Field | Value |
| --- | --- |
| audit_only | true |
| approval_recorded | false |
| approval_status | operator_approval_not_recorded |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| pass | true |
| stop_findings | 0 |

## Package Scope

| Metric | Value |
| --- | ---: |
| card_print rows requiring approval | 106 |
| child printing rows verified | 143 |
| affected sets | 12 |

Direct fields under review: `set_code`, `number`, `name`.

`number_plain` is generated/readback-only and is not directly assigned by this design.

## Required Signoff Checklist

| Required | Checked | ID | Description |
| --- | --- | --- | --- |
| true | false | row_list_reviewed | Every card_print_id in this packet has been reviewed against the before and proposed fields. |
| true | false | source_evidence_reviewed | Source URLs/evidence sources have been reviewed for every proposed row. |
| true | false | fresh_snapshot_required | A fresh production before-state snapshot will be captured immediately before any future execution. |
| true | false | rollback_required | Rollback values will be regenerated from the fresh snapshot, not copied from this packet. |
| true | false | transactional_execution_artifact_required | A separate dry-run-default transactional execution artifact must exist before any write. |
| true | false | post_apply_verification_required | Post-apply verification must run inside the future transaction before commit. |

## Affected Sets

| Set | Name | Rows | Child Printings | Changed Fields | Vault Refs | Status |
| --- | --- | ---: | ---: | --- | ---: | --- |
| col1 | Call of Legends | 2 | 6 | number:2, set_code:2 | 0 | operator_review_required |
| dp7 | Stormfront | 8 | 10 | number:8, set_code:8 | 0 | operator_review_required |
| ecard2 | Aquapolis | 13 | 26 | set_code:13 | 0 | operator_review_required |
| ecard3 | Skyridge | 15 | 19 | number:11, set_code:15 | 0 | operator_review_required |
| ex10 | Unseen Forces | 3 | 3 | name:3, number:3, set_code:3 | 0 | operator_review_required |
| fut2020 | Pokémon Futsal 2020 | 1 | 1 | set_code:1 | 0 | operator_review_required |
| mep | MEP Black Star Promos | 10 | 10 | number:10, set_code:10 | 0 | operator_review_required |
| pl1 | Platinum | 9 | 10 | number:9, set_code:9 | 0 | operator_review_required |
| pl2 | Rising Rivals | 17 | 24 | name:2, number:17, set_code:17 | 0 | operator_review_required |
| pl3 | Supreme Victors | 9 | 9 | number:9, set_code:9 | 0 | operator_review_required |
| pl4 | Arceus | 18 | 23 | name:6, number:18, set_code:18 | 0 | operator_review_required |
| swsh2 | Rebel Clash | 1 | 2 | number:1, set_code:1 | 0 | operator_review_required |

## Row Approval Matrix

| Approved | Set | Card Print ID | Source ID | Current Set | Proposed Set | Current Number | Proposed Number | Current Name | Proposed Name | Child Printings | Vault Refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| false | col1 | 2180d1db-0948-4cfc-9a98-da7629c2811a | col1-6 |  | col1 |  | 6 | Groudon | Groudon | 3 | 0 |
| false | col1 | 922f2b4f-eb6f-492c-89a7-8b4f313509e2 | col1-8 |  | col1 |  | 8 | Hitmontop | Hitmontop | 3 | 0 |
| false | dp7 | 62f77935-5749-4d26-87e6-06bbca565b22 | dp7-2 |  | dp7 |  | 2 | Empoleon | Empoleon | 2 | 0 |
| false | dp7 | 665ee2b0-4a22-43d5-bf8e-8ff22a990384 | dp7-3 |  | dp7 |  | 3 | Infernape | Infernape | 2 | 0 |
| false | dp7 | d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff | dp7-96 |  | dp7 |  | 96 | Dusknoir | Dusknoir | 1 | 0 |
| false | dp7 | 7c211bf2-ab9e-489d-842f-65c896270783 | dp7-97 |  | dp7 |  | 97 | Heatran | Heatran | 1 | 0 |
| false | dp7 | 6f49c231-0a53-4c0c-9db1-6d4c36aa460e | dp7-98 |  | dp7 |  | 98 | Machamp | Machamp | 1 | 0 |
| false | dp7 | 7a0dbe87-8ffb-4939-a5c0-371a0a21b302 | dp7-99 |  | dp7 |  | 99 | Raichu | Raichu | 1 | 0 |
| false | dp7 | 687811f7-e3d2-41bb-b37d-1e73882551d2 | dp7-100 |  | dp7 |  | 100 | Regigigas | Regigigas | 1 | 0 |
| false | dp7 | e8444009-0c47-48a6-af07-f5b450ac0082 | dp7-SH1 |  | dp7 |  | SH1 | Drifloon | Drifloon | 1 | 0 |
| false | ecard2 | 5155d8da-c49b-43cf-8173-1e4ceca853d2 | ecard2-11 |  | ecard2 | 11 | 11 | Espeon | Espeon | 2 | 0 |
| false | ecard2 | 49008b62-21be-48b8-a561-9dc0bea390e1 | ecard2-12 |  | ecard2 | 12 | 12 | Exeggutor | Exeggutor | 2 | 0 |
| false | ecard2 | 0f752ca1-5458-4241-af37-4a7b48b85013 | ecard2-13 |  | ecard2 | 13 | 13 | Exeggutor | Exeggutor | 2 | 0 |
| false | ecard2 | bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88 | ecard2-15 |  | ecard2 | 15 | 15 | Houndoom | Houndoom | 2 | 0 |
| false | ecard2 | d5e3ba78-7a85-49d2-8ab0-295521652f55 | ecard2-16 |  | ecard2 | 16 | 16 | Hypno | Hypno | 2 | 0 |
| false | ecard2 | 11591d3d-6574-487e-9958-f0d94bba5af4 | ecard2-17 |  | ecard2 | 17 | 17 | Jumpluff | Jumpluff | 2 | 0 |
| false | ecard2 | 72b1ec6b-fe84-4190-a0d3-d95155296261 | ecard2-18 |  | ecard2 | 18 | 18 | Jynx | Jynx | 2 | 0 |
| false | ecard2 | b22dc290-dade-45f8-b488-5d3c921a79a1 | ecard2-19 |  | ecard2 | 19 | 19 | Kingdra | Kingdra | 2 | 0 |
| false | ecard2 | 0e7d501c-b666-43df-9ee6-82443fcae8cb | ecard2-20 |  | ecard2 | 20 | 20 | Lanturn | Lanturn | 2 | 0 |
| false | ecard2 | a077e73a-275a-405e-85ac-24b28b6ffe3a | ecard2-25 |  | ecard2 | 25 | 25 | Ninetales | Ninetales | 2 | 0 |
| false | ecard2 | 898ad06e-aab1-4c1a-b91b-44fdd6069031 | ecard2-28 |  | ecard2 | 28 | 28 | Porygon2 | Porygon2 | 2 | 0 |
| false | ecard2 | 507f014e-d43d-4b24-b01f-c9635b6aba81 | ecard2-30 |  | ecard2 | 30 | 30 | Quagsire | Quagsire | 2 | 0 |
| false | ecard2 | 2233732b-ced1-4f51-b45b-603c1c15a65c | ecard2-32 |  | ecard2 | 32 | 32 | Scizor | Scizor | 2 | 0 |
| false | ecard3 | d0270c83-13c1-4d2b-ae50-19830be9d134 | ecard3-4 |  | ecard3 | 4 | 4 | Articuno | Articuno | 2 | 0 |
| false | ecard3 | 36a0af86-f863-4ff0-967c-285a67272dcb | ecard3-6 |  | ecard3 | 6 | 6 | Crobat | Crobat | 2 | 0 |
| false | ecard3 | 6406220f-4684-4f26-a52d-310db5eb5700 | ecard3-8 |  | ecard3 | 8 | 8 | Flareon | Flareon | 2 | 0 |
| false | ecard3 | 982bd726-548f-4e0c-9a93-c1301af1342f | ecard3-9 |  | ecard3 | 9 | 9 | Forretress | Forretress | 2 | 0 |
| false | ecard3 | d139fca7-558c-4dad-9a46-f94e4d45ab6b | ecard3-H13 |  | ecard3 |  | H13 | Kabutops | Kabutops | 1 | 0 |
| false | ecard3 | 8c78b35f-6dd0-4b12-9709-8b4198ad3089 | ecard3-H14 |  | ecard3 |  | H14 | Ledian | Ledian | 1 | 0 |
| false | ecard3 | 02a4156d-5f67-4969-8288-c440938a923c | ecard3-H16 |  | ecard3 |  | H16 | Magcargo | Magcargo | 1 | 0 |
| false | ecard3 | bb73d56c-c46f-4341-b4a1-825a10c2406b | ecard3-H17 |  | ecard3 |  | H17 | Magcargo | Magcargo | 1 | 0 |
| false | ecard3 | 28d7a9bb-fcff-4e93-861d-d200770984d6 | ecard3-H18 |  | ecard3 |  | H18 | Magneton | Magneton | 1 | 0 |
| false | ecard3 | 415065f4-68dd-44a9-a0f0-d6375e203275 | ecard3-H22 |  | ecard3 |  | H22 | Piloswine | Piloswine | 1 | 0 |
| false | ecard3 | b7c244c2-35bf-4dbd-836c-1341a777d65e | ecard3-H23 |  | ecard3 |  | H23 | Politoed | Politoed | 1 | 0 |
| false | ecard3 | e99d7d18-af64-4d34-b62c-8a795f6da2c3 | ecard3-H24 |  | ecard3 |  | H24 | Poliwrath | Poliwrath | 1 | 0 |
| false | ecard3 | 9a1cc452-e8b4-48bf-acc9-e592fe9cc521 | ecard3-H27 |  | ecard3 |  | H27 | Rhydon | Rhydon | 1 | 0 |
| false | ecard3 | abcf71f3-edd8-4130-aaa3-b7fecada39e2 | ecard3-H30 |  | ecard3 |  | H30 | Umbreon | Umbreon | 1 | 0 |
| false | ecard3 | 7cbee94f-9f6a-441d-98e1-6a50da7f72d7 | ecard3-H31 |  | ecard3 |  | H31 | Vaporeon | Vaporeon | 1 | 0 |
| false | ex10 | 2fdd39c8-7afa-4031-be84-649ac28a7b72 | ex10-113 |  | ex10 |  | 113 | Entei Star | Entei ★ | 1 | 0 |
| false | ex10 | 043dbc47-0815-4ef4-b31d-2027f70f2338 | ex10-114 |  | ex10 |  | 114 | Raikou Star | Raikou ★ | 1 | 0 |
| false | ex10 | 584c31ad-d7ac-4356-b9cc-4de3152511b2 | ex10-115 |  | ex10 |  | 115 | Suicune Star | Suicune ★ | 1 | 0 |
| false | fut2020 | a676888d-19e0-4064-89aa-e67019af5b95 | fut2020-1 |  | fut2020 | 1 | 1 | Pikachu on the Ball | Pikachu on the Ball | 1 | 0 |
| false | mep | 6419894a-137f-4fc7-8db1-fa853872b190 | mep-001 |  | mep | 1 | 001 | Meganium | Meganium | 1 | 0 |
| false | mep | b75d4730-3c1a-42ca-9d18-e8ca736ae41f | mep-002 |  | mep | 2 | 002 | Inteleon | Inteleon | 1 | 0 |
| false | mep | aa9f207d-c9ea-4607-bbc5-448648bca47f | mep-003 |  | mep | 3 | 003 | Alakazam | Alakazam | 1 | 0 |
| false | mep | bf523703-271c-49fe-b8aa-c31c57cb9b32 | mep-004 |  | mep | 4 | 004 | Lunatone | Lunatone | 1 | 0 |
| false | mep | 04e533ae-dd17-478c-ab46-220859079b2c | mep-005 |  | mep | 5 | 005 | Drifloon | Drifloon | 1 | 0 |
| false | mep | ac2b6cf7-6873-44e8-96b9-e03a179fae51 | mep-006 |  | mep | 6 | 006 | Drifblim | Drifblim | 1 | 0 |
| false | mep | 870f45fe-0680-4a92-b77b-dd03a6018bd3 | mep-007 |  | mep | 7 | 007 | Psyduck | Psyduck | 1 | 0 |
| false | mep | 47f874b2-ea20-4b89-af44-085905bb1f60 | mep-008 |  | mep | 8 | 008 | Golduck | Golduck | 1 | 0 |
| false | mep | a3624761-be25-4841-83e4-c5936ec434fe | mep-009 |  | mep | 9 | 009 | Alakazam | Alakazam | 1 | 0 |
| false | mep | 242de512-f2fb-4994-9615-6c1e2c55ac02 | mep-010 |  | mep | 10 | 010 | Riolu | Riolu | 1 | 0 |
| false | pl1 | cfbaec4b-bc98-4f6f-8b06-a30dbe29af30 | pl1-6 |  | pl1 |  | 6 | Dialga | Dialga | 2 | 0 |
| false | pl1 | 9d20653b-49ea-4a30-8e18-629267d7397b | pl1-122 |  | pl1 |  | 122 | Dialga G | Dialga G | 1 | 0 |
| false | pl1 | 1cc5b95e-c5b7-477c-a3c1-1d4c26e10875 | pl1-123 |  | pl1 |  | 123 | Drapion | Drapion | 1 | 0 |
| false | pl1 | 9deb3714-1f02-4eb2-a249-6b3b42a106cb | pl1-124 |  | pl1 |  | 124 | Giratina | Giratina | 1 | 0 |
| false | pl1 | 182aab06-7802-4dea-90cb-32dfc7cefaab | pl1-125 |  | pl1 |  | 125 | Palkia G | Palkia G | 1 | 0 |
| false | pl1 | 24bd8689-4031-40d0-8948-1d08e652ef34 | pl1-126 |  | pl1 |  | 126 | Shaymin | Shaymin | 1 | 0 |
| false | pl1 | 1f03518a-bed9-4c04-ad0c-3a5cf3008248 | pl1-127 |  | pl1 |  | 127 | Shaymin | Shaymin | 1 | 0 |
| false | pl1 | 74b9d351-aecc-4ff9-8ed2-958311074af7 | pl1-SH4 |  | pl1 |  | SH4 | Lotad | Lotad | 1 | 0 |
| false | pl1 | e48e17b9-b693-4882-9e9f-d177dbce37c8 | pl1-SH5 |  | pl1 |  | SH5 | Swablu | Swablu | 1 | 0 |
| false | pl2 | 2ebe059c-614e-4dd6-812f-ebf268459ce5 | pl2-1 |  | pl2 |  | 1 | Arcanine | Arcanine | 2 | 0 |
| false | pl2 | 9d6eb3c7-dc61-4543-b436-a67fd23ba16c | pl2-3 |  | pl2 |  | 3 | Darkrai G | Darkrai G | 2 | 0 |
| false | pl2 | 1970689f-8f93-4148-96b2-0ed8ed149568 | pl2-5 |  | pl2 |  | 5 | Flygon | Flygon | 3 | 0 |
| false | pl2 | 8c817161-627f-4ff5-aa27-127757b88213 | pl2-71 |  | pl2 |  | 71 | Nidoran♀ | Nidoran ♀ | 2 | 0 |
| false | pl2 | bc120b0e-4aad-47c1-989b-a733435a2000 | pl2-72 |  | pl2 |  | 72 | Nidoran♂ | Nidoran ♂ | 2 | 0 |
| false | pl2 | f619ad6c-007c-4e4d-bea0-a4a517cffa50 | pl2-95 |  | pl2 |  | 95 | Team Galactic's Invention G-107 Technical Machine | Team Galactic's Invention G-107 Technical Machine | 2 | 0 |
| false | pl2 | a1b66404-67e9-4586-8ac9-873c421da31e | pl2-103 |  | pl2 |  | 103 | Alakazam 4 | Alakazam 4 | 1 | 0 |
| false | pl2 | 5fd2b141-a2af-4c2c-bb33-df2c2af58c02 | pl2-104 |  | pl2 |  | 104 | Floatzel GL | Floatzel GL | 1 | 0 |
| false | pl2 | 7d47083d-43a4-4868-9bac-eb1deb237136 | pl2-105 |  | pl2 |  | 105 | Flygon | Flygon | 1 | 0 |
| false | pl2 | 60789fd6-a0bb-49cd-848f-1ba462f4e965 | pl2-106 |  | pl2 |  | 106 | Gallade 4 | Gallade 4 | 1 | 0 |
| false | pl2 | 2ef89f59-3bd7-430f-9e71-42fea8cdd8ae | pl2-107 |  | pl2 |  | 107 | Hippowdon | Hippowdon | 1 | 0 |
| false | pl2 | a719dd63-f527-4edf-8c8e-e77bac65a715 | pl2-108 |  | pl2 |  | 108 | Infernape 4 | Infernape 4 | 1 | 0 |
| false | pl2 | 26d6335d-9483-4de2-8b1b-771c43ab31cb | pl2-110 |  | pl2 |  | 110 | Mismagius GL | Mismagius GL | 1 | 0 |
| false | pl2 | 25c91739-b09a-4360-94e5-9a8b1ed43755 | pl2-111 |  | pl2 |  | 111 | Snorlax | Snorlax | 1 | 0 |
| false | pl2 | f5ada689-45c1-4b23-ac62-6a9f0bc11c97 | pl2-RT2 |  | pl2 |  | RT2 | Frost Rotom | Frost Rotom | 1 | 0 |
| false | pl2 | 949f5c1d-6d29-41cd-91c9-0be81e5360c5 | pl2-RT4 |  | pl2 |  | RT4 | Mow Rotom | Mow Rotom | 1 | 0 |
| false | pl2 | 0a14f347-5dd0-425a-9c9c-ffd134a9de4f | pl2-RT6 |  | pl2 |  | RT6 | Charon's Choice | Charon's Choice | 1 | 0 |
| false | pl3 | 8cd92a82-149d-43b4-a7d3-d65782536182 | pl3-141 |  | pl3 |  | 141 | Absol G | Absol G | 1 | 0 |
| false | pl3 | 79097350-eb58-44e8-bd39-3ec5f417f02b | pl3-142 |  | pl3 |  | 142 | Blaziken FB | Blaziken FB | 1 | 0 |
| false | pl3 | 880dc8c7-6959-4fda-b79a-32e48c684267 | pl3-143 |  | pl3 |  | 143 | Charizard G | Charizard G | 1 | 0 |
| false | pl3 | 29a4bca4-6264-45f6-bc24-1d5ded5520cd | pl3-144 |  | pl3 |  | 144 | Electivire FB | Electivire FB | 1 | 0 |
| false | pl3 | 2c1b3125-dd67-4522-b3e0-5621c05f7a9a | pl3-145 |  | pl3 |  | 145 | Garchomp C | Garchomp C | 1 | 0 |
| false | pl3 | 89f61622-12a4-4861-abb3-ef3dbcaf2a86 | pl3-146 |  | pl3 |  | 146 | Rayquaza C | Rayquaza C | 1 | 0 |
| false | pl3 | fa6310ae-be43-4309-af1d-a5033daff2f0 | pl3-147 |  | pl3 |  | 147 | Staraptor FB | Staraptor FB | 1 | 0 |
| false | pl3 | 9089264b-fd13-4261-94ac-b252ab89f6c7 | pl3-SH8 |  | pl3 |  | SH8 | Relicanth | Relicanth | 1 | 0 |
| false | pl3 | e8a8c0b0-2213-4701-89a9-8926cc0d5669 | pl3-SH9 |  | pl3 |  | SH9 | Yanma | Yanma | 1 | 0 |
| false | pl4 | a02f871c-fe3e-432b-944d-6decea0eecdf | pl4-1 |  | pl4 |  | 1 | Charizard | Charizard | 2 | 0 |
| false | pl4 | 71779a8b-ee22-4892-9425-8e3da51f179a | pl4-6 |  | pl4 |  | 6 | Mothim | Mothim | 2 | 0 |
| false | pl4 | 3059259e-c28b-49d6-9f31-64e178e87f28 | pl4-9 |  | pl4 |  | 9 | Swalot | Swalot | 3 | 0 |
| false | pl4 | 8716f287-3497-49b2-a499-9c1e026a6a94 | pl4-12 |  | pl4 |  | 12 | Zapdos | Zapdos | 2 | 0 |
| false | pl4 | 460e6437-4bc8-4a1c-90fc-546481f225e2 | pl4-94 |  | pl4 |  | 94 | Arceus LV. X | Arceus LV.X | 1 | 0 |
| false | pl4 | c5125a59-32a9-4a0f-98af-4cf4ad5d6d64 | pl4-95 |  | pl4 |  | 95 | Arceus LV. X | Arceus LV.X | 1 | 0 |
| false | pl4 | ad751d34-d43b-4644-ae2e-622725f781cd | pl4-96 |  | pl4 |  | 96 | Arceus LV. X | Arceus LV.X | 1 | 0 |
| false | pl4 | 1352eb03-1519-4e31-b7ad-a2d4af24ef65 | pl4-97 |  | pl4 |  | 97 | Gengar LV. X | Gengar LV.X | 1 | 0 |
| false | pl4 | 2fb3462d-4a19-4412-b8cd-848a669549a0 | pl4-98 |  | pl4 |  | 98 | Salamence LV. X | Salamence LV.X | 1 | 0 |
| false | pl4 | b319332c-aea7-4f3c-ad4c-02f0874b2d60 | pl4-99 |  | pl4 |  | 99 | Tangrowth LV. X | Tangrowth LV.X | 1 | 0 |
| false | pl4 | cf859f9b-f1d6-41ec-9e38-c7fd27743777 | pl4-AR2 |  | pl4 |  | AR2 | Arceus | Arceus | 1 | 0 |
| false | pl4 | 8b2c91cf-bd7c-4564-84ca-5863e1414257 | pl4-AR3 |  | pl4 |  | AR3 | Arceus | Arceus | 1 | 0 |
| false | pl4 | 61cd00a6-3418-4980-ade8-b26c8d0b4d5c | pl4-AR4 |  | pl4 |  | AR4 | Arceus | Arceus | 1 | 0 |
| false | pl4 | 63a0a7b8-bdfa-4a08-ad30-680bcc45802e | pl4-AR5 |  | pl4 |  | AR5 | Arceus | Arceus | 1 | 0 |
| false | pl4 | 67e47461-e03c-4da3-8557-d3df639dbb98 | pl4-AR7 |  | pl4 |  | AR7 | Arceus | Arceus | 1 | 0 |
| false | pl4 | 0db1b355-bb14-4042-8597-4afd1d9a2b77 | pl4-AR8 |  | pl4 |  | AR8 | Arceus | Arceus | 1 | 0 |
| false | pl4 | 502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda | pl4-SH10 |  | pl4 |  | SH10 | Bagon | Bagon | 1 | 0 |
| false | pl4 | 22a0396f-a0fe-4680-8568-71246489db3c | pl4-SH11 |  | pl4 |  | SH11 | Ponyta | Ponyta | 1 | 0 |
| false | swsh2 | 9cf48b11-bf42-4aa3-861b-c2ca5543877e | swsh2-154 |  | swsh2 |  | 154 | Boss's Orders (Giovanni) | Boss's Orders (Giovanni) | 2 | 0 |

## Explicit Non-Authorizations

- This packet is not operator approval.
- This packet is not an execution artifact.
- This packet is not SQL.
- This packet must not be copied into a migration.
- This packet does not allow DB writes.
- This packet does not allow cleanup, quarantine, hiding, insertion, or deletion.

## Source Artifacts

- DB impact translation: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_db_impact_translation_v1.json`
- Apply design: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_physical_recovery_apply_design_v1.json`
