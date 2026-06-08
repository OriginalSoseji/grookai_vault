# English Master Index Operator Approval Record Template V1

This is a blank, fingerprinted approval record template for PKG-01.

It is not approval, not SQL, not a migration, and not an execution artifact.

## Status

| Field | Value |
| --- | --- |
| audit_only | true |
| approval_recorded | false |
| approval_status | blank_template_no_approval_recorded |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| pass | true |
| stop_findings | 0 |

## Package Fingerprint

| Metric | Value |
| --- | --- |
| package_id | PKG-01 |
| package_fingerprint_sha256 | `34cc9acbb81bfadbe2115528a1339cb82afa71fa01fd0d52b62b83834a990b79` |
| card_print rows requiring approval | 106 |
| child printing rows verified | 143 |
| affected sets | 12 |
| unique row fingerprints | 106 |

## Approval Record Rules

- This template is blank and records no approval.
- A future approval record must keep the same package_fingerprint_sha256 or explain why the package changed.
- Every approved row must be explicitly marked approved with operator initials and reviewed_at.
- Rejected or follow-up rows must not enter any future execution artifact.
- Approval still does not permit writes until a fresh snapshot and separate dry-run-default transactional execution artifact exist.

## Blank Approval Entries

| Approved | Rejected | Followup | Priority | Set | Card Print ID | Source ID | Fingerprint | Current | Proposed | Sources |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| false | false | false | standard | col1 | 2180d1db-0948-4cfc-9a98-da7629c2811a | col1-6 | `608ad0fdb308153b...` | //Groudon | col1/6/Groudon | pokemontcg_api, tcgdex, thepricedex_price_list |
| false | false | false | standard | col1 | 922f2b4f-eb6f-492c-89a7-8b4f313509e2 | col1-8 | `490beb722d9a82fe...` | //Hitmontop | col1/8/Hitmontop | pokemontcg_api, tcgdex, thepricedex_price_list |
| false | false | false | standard | dp7 | 62f77935-5749-4d26-87e6-06bbca565b22 | dp7-2 | `a9528b55f5fb1672...` | //Empoleon | dp7/2/Empoleon | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | dp7 | 665ee2b0-4a22-43d5-bf8e-8ff22a990384 | dp7-3 | `42521ea18796ffb9...` | //Infernape | dp7/3/Infernape | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | dp7 | d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff | dp7-96 | `1edb5b9bfda1ebd5...` | //Dusknoir | dp7/96/Dusknoir | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | dp7 | 7c211bf2-ab9e-489d-842f-65c896270783 | dp7-97 | `070c603a96afe75b...` | //Heatran | dp7/97/Heatran | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | dp7 | 6f49c231-0a53-4c0c-9db1-6d4c36aa460e | dp7-98 | `42d795170cc0b492...` | //Machamp | dp7/98/Machamp | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | dp7 | 7a0dbe87-8ffb-4939-a5c0-371a0a21b302 | dp7-99 | `bff7e82e9aa54602...` | //Raichu | dp7/99/Raichu | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | dp7 | 687811f7-e3d2-41bb-b37d-1e73882551d2 | dp7-100 | `ef5b3adc09e8add9...` | //Regigigas | dp7/100/Regigigas | reverseholo_set_checklist, tcgdex |
| false | false | false | medium | dp7 | e8444009-0c47-48a6-af07-f5b450ac0082 | dp7-SH1 | `86b4291ed99afea6...` | //Drifloon | dp7/SH1/Drifloon | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | ecard2 | 5155d8da-c49b-43cf-8173-1e4ceca853d2 | ecard2-11 | `79edbacfa7e3ce5d...` | /11/Espeon | ecard2/11/Espeon | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | 49008b62-21be-48b8-a561-9dc0bea390e1 | ecard2-12 | `5e55836d735f8479...` | /12/Exeggutor | ecard2/12/Exeggutor | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | 0f752ca1-5458-4241-af37-4a7b48b85013 | ecard2-13 | `dc82d0b04c94fec9...` | /13/Exeggutor | ecard2/13/Exeggutor | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88 | ecard2-15 | `f7504a690a175956...` | /15/Houndoom | ecard2/15/Houndoom | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | d5e3ba78-7a85-49d2-8ab0-295521652f55 | ecard2-16 | `f148bd08aa13ad8d...` | /16/Hypno | ecard2/16/Hypno | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | 11591d3d-6574-487e-9958-f0d94bba5af4 | ecard2-17 | `0ac19239a7c5d311...` | /17/Jumpluff | ecard2/17/Jumpluff | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | 72b1ec6b-fe84-4190-a0d3-d95155296261 | ecard2-18 | `053812e73e64eece...` | /18/Jynx | ecard2/18/Jynx | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | b22dc290-dade-45f8-b488-5d3c921a79a1 | ecard2-19 | `2c1286bfad6c3a93...` | /19/Kingdra | ecard2/19/Kingdra | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | 0e7d501c-b666-43df-9ee6-82443fcae8cb | ecard2-20 | `f6bc2480b6e505eb...` | /20/Lanturn | ecard2/20/Lanturn | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | a077e73a-275a-405e-85ac-24b28b6ffe3a | ecard2-25 | `cd3159736f442326...` | /25/Ninetales | ecard2/25/Ninetales | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | 898ad06e-aab1-4c1a-b91b-44fdd6069031 | ecard2-28 | `924041f303b5d1a7...` | /28/Porygon2 | ecard2/28/Porygon2 | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | 507f014e-d43d-4b24-b01f-c9635b6aba81 | ecard2-30 | `4e0879bc95874aa8...` | /30/Quagsire | ecard2/30/Quagsire | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard2 | 2233732b-ced1-4f51-b45b-603c1c15a65c | ecard2-32 | `ad3dd8745a6efea6...` | /32/Scizor | ecard2/32/Scizor | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard3 | d0270c83-13c1-4d2b-ae50-19830be9d134 | ecard3-4 | `571ebee6cfb09763...` | /4/Articuno | ecard3/4/Articuno | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard3 | 36a0af86-f863-4ff0-967c-285a67272dcb | ecard3-6 | `d56a145aeae30ed7...` | /6/Crobat | ecard3/6/Crobat | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard3 | 6406220f-4684-4f26-a52d-310db5eb5700 | ecard3-8 | `a05b2527098fded6...` | /8/Flareon | ecard3/8/Flareon | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | ecard3 | 982bd726-548f-4e0c-9a93-c1301af1342f | ecard3-9 | `0c41fbbca4871110...` | /9/Forretress | ecard3/9/Forretress | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | d139fca7-558c-4dad-9a46-f94e4d45ab6b | ecard3-H13 | `f60066a3886e12a3...` | //Kabutops | ecard3/H13/Kabutops | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | 8c78b35f-6dd0-4b12-9709-8b4198ad3089 | ecard3-H14 | `4d7670081f827ed0...` | //Ledian | ecard3/H14/Ledian | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | 02a4156d-5f67-4969-8288-c440938a923c | ecard3-H16 | `36edbddee39b3963...` | //Magcargo | ecard3/H16/Magcargo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | bb73d56c-c46f-4341-b4a1-825a10c2406b | ecard3-H17 | `c75c1ea53bad6e9e...` | //Magcargo | ecard3/H17/Magcargo | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | 28d7a9bb-fcff-4e93-861d-d200770984d6 | ecard3-H18 | `5a28693025d9cd03...` | //Magneton | ecard3/H18/Magneton | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | 415065f4-68dd-44a9-a0f0-d6375e203275 | ecard3-H22 | `4e9f5f1925a8d375...` | //Piloswine | ecard3/H22/Piloswine | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | b7c244c2-35bf-4dbd-836c-1341a777d65e | ecard3-H23 | `fdac16c34ff19174...` | //Politoed | ecard3/H23/Politoed | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | e99d7d18-af64-4d34-b62c-8a795f6da2c3 | ecard3-H24 | `b3502f99495b237b...` | //Poliwrath | ecard3/H24/Poliwrath | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | 9a1cc452-e8b4-48bf-acc9-e592fe9cc521 | ecard3-H27 | `db2a2ff74c3aff1c...` | //Rhydon | ecard3/H27/Rhydon | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | abcf71f3-edd8-4130-aaa3-b7fecada39e2 | ecard3-H30 | `533cda05d202c169...` | //Umbreon | ecard3/H30/Umbreon | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | ecard3 | 7cbee94f-9f6a-441d-98e1-6a50da7f72d7 | ecard3-H31 | `d98d080969246baa...` | //Vaporeon | ecard3/H31/Vaporeon | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | ex10 | 2fdd39c8-7afa-4031-be84-649ac28a7b72 | ex10-113 | `77c553d9216784a4...` | //Entei Star | ex10/113/Entei ★ | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | ex10 | 043dbc47-0815-4ef4-b31d-2027f70f2338 | ex10-114 | `cb94b7e9b18440cf...` | //Raikou Star | ex10/114/Raikou ★ | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | ex10 | 584c31ad-d7ac-4356-b9cc-4de3152511b2 | ex10-115 | `9ad141a712cdab5a...` | //Suicune Star | ex10/115/Suicune ★ | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | fut2020 | a676888d-19e0-4064-89aa-e67019af5b95 | fut2020-1 | `6772551718a6b259...` | /1/Pikachu on the Ball | fut2020/1/Pikachu on the Ball | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | mep | 6419894a-137f-4fc7-8db1-fa853872b190 | mep-001 | `8ec9f147519fba20...` | /1/Meganium | mep/001/Meganium | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | b75d4730-3c1a-42ca-9d18-e8ca736ae41f | mep-002 | `16d1901603c68616...` | /2/Inteleon | mep/002/Inteleon | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | aa9f207d-c9ea-4607-bbc5-448648bca47f | mep-003 | `833361c92d41a055...` | /3/Alakazam | mep/003/Alakazam | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | bf523703-271c-49fe-b8aa-c31c57cb9b32 | mep-004 | `fc27c42b1173b55d...` | /4/Lunatone | mep/004/Lunatone | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | 04e533ae-dd17-478c-ab46-220859079b2c | mep-005 | `4c09aaa1ffc72af8...` | /5/Drifloon | mep/005/Drifloon | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | ac2b6cf7-6873-44e8-96b9-e03a179fae51 | mep-006 | `9486ee14d054fd05...` | /6/Drifblim | mep/006/Drifblim | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | 870f45fe-0680-4a92-b77b-dd03a6018bd3 | mep-007 | `10b64dec2521d725...` | /7/Psyduck | mep/007/Psyduck | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | 47f874b2-ea20-4b89-af44-085905bb1f60 | mep-008 | `a4e615b61e6464e1...` | /8/Golduck | mep/008/Golduck | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | a3624761-be25-4841-83e4-c5936ec434fe | mep-009 | `ef35482ab99d7332...` | /9/Alakazam | mep/009/Alakazam | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | mep | 242de512-f2fb-4994-9615-6c1e2c55ac02 | mep-010 | `da3e08e47345733e...` | /10/Riolu | mep/010/Riolu | reverseholo_set_checklist, tcgdex, thepricedex_price_list |
| false | false | false | standard | pl1 | cfbaec4b-bc98-4f6f-8b06-a30dbe29af30 | pl1-6 | `dacfb97069e659f2...` | //Dialga | pl1/6/Dialga | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl1 | 9d20653b-49ea-4a30-8e18-629267d7397b | pl1-122 | `b1783f03eccd23c1...` | //Dialga G | pl1/122/Dialga G | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | pl1 | 1cc5b95e-c5b7-477c-a3c1-1d4c26e10875 | pl1-123 | `f1c0f3d471452ef2...` | //Drapion | pl1/123/Drapion | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | pl1 | 9deb3714-1f02-4eb2-a249-6b3b42a106cb | pl1-124 | `b23a4b12e3cc9249...` | //Giratina | pl1/124/Giratina | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | pl1 | 182aab06-7802-4dea-90cb-32dfc7cefaab | pl1-125 | `12b1eb35331d774f...` | //Palkia G | pl1/125/Palkia G | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | pl1 | 24bd8689-4031-40d0-8948-1d08e652ef34 | pl1-126 | `f738af5659f82ce9...` | //Shaymin | pl1/126/Shaymin | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | pl1 | 1f03518a-bed9-4c04-ad0c-3a5cf3008248 | pl1-127 | `86977fed6cfec64e...` | //Shaymin | pl1/127/Shaymin | reverseholo_set_checklist, tcgdex |
| false | false | false | medium | pl1 | 74b9d351-aecc-4ff9-8ed2-958311074af7 | pl1-SH4 | `3ddc72704cfbd59f...` | //Lotad | pl1/SH4/Lotad | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl1 | e48e17b9-b693-4882-9e9f-d177dbce37c8 | pl1-SH5 | `38c4511974b9d649...` | //Swablu | pl1/SH5/Swablu | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl2 | 2ebe059c-614e-4dd6-812f-ebf268459ce5 | pl2-1 | `f36df4f2964ca220...` | //Arcanine | pl2/1/Arcanine | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl2 | 9d6eb3c7-dc61-4543-b436-a67fd23ba16c | pl2-3 | `c5a750fefee040af...` | //Darkrai G | pl2/3/Darkrai G | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl2 | 1970689f-8f93-4148-96b2-0ed8ed149568 | pl2-5 | `a205850698289b8d...` | //Flygon | pl2/5/Flygon | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | pl2 | 8c817161-627f-4ff5-aa27-127757b88213 | pl2-71 | `7f1d481d17944546...` | //Nidoran♀ | pl2/71/Nidoran ♀ | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | pl2 | bc120b0e-4aad-47c1-989b-a733435a2000 | pl2-72 | `d0228073a6f089f0...` | //Nidoran♂ | pl2/72/Nidoran ♂ | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl2 | f619ad6c-007c-4e4d-bea0-a4a517cffa50 | pl2-95 | `79cdcff682e9e65e...` | //Team Galactic's Invention G-107 Technical Machine | pl2/95/Team Galactic's Invention G-107 Technical Machine | tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl2 | a1b66404-67e9-4586-8ac9-873c421da31e | pl2-103 | `e5b28df6e0b1f58a...` | //Alakazam 4 | pl2/103/Alakazam 4 | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | pl2 | 5fd2b141-a2af-4c2c-bb33-df2c2af58c02 | pl2-104 | `e66cb2de667c6807...` | //Floatzel GL | pl2/104/Floatzel GL | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl2 | 7d47083d-43a4-4868-9bac-eb1deb237136 | pl2-105 | `2d9b7ac2a7a10222...` | //Flygon | pl2/105/Flygon | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl2 | 60789fd6-a0bb-49cd-848f-1ba462f4e965 | pl2-106 | `82ddfa69f41bc211...` | //Gallade 4 | pl2/106/Gallade 4 | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | pl2 | 2ef89f59-3bd7-430f-9e71-42fea8cdd8ae | pl2-107 | `1ebe42be716fb61f...` | //Hippowdon | pl2/107/Hippowdon | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl2 | a719dd63-f527-4edf-8c8e-e77bac65a715 | pl2-108 | `66afe7e7c62a71d7...` | //Infernape 4 | pl2/108/Infernape 4 | reverseholo_set_checklist, tcgdex |
| false | false | false | standard | pl2 | 26d6335d-9483-4de2-8b1b-771c43ab31cb | pl2-110 | `a4b9b10adbbfab21...` | //Mismagius GL | pl2/110/Mismagius GL | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl2 | 25c91739-b09a-4360-94e5-9a8b1ed43755 | pl2-111 | `8212c8e484678b61...` | //Snorlax | pl2/111/Snorlax | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | medium | pl2 | f5ada689-45c1-4b23-ac62-6a9f0bc11c97 | pl2-RT2 | `9b4aabb03c9f876f...` | //Frost Rotom | pl2/RT2/Frost Rotom | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl2 | 949f5c1d-6d29-41cd-91c9-0be81e5360c5 | pl2-RT4 | `e5d829c7efd58889...` | //Mow Rotom | pl2/RT4/Mow Rotom | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl2 | 0a14f347-5dd0-425a-9c9c-ffd134a9de4f | pl2-RT6 | `cf238581b537a1a7...` | //Charon's Choice | pl2/RT6/Charon's Choice | pokemontcg_api, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl3 | 8cd92a82-149d-43b4-a7d3-d65782536182 | pl3-141 | `796ffb0e234cee2d...` | //Absol G | pl3/141/Absol G | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl3 | 79097350-eb58-44e8-bd39-3ec5f417f02b | pl3-142 | `7971cbd05d3e7459...` | //Blaziken FB | pl3/142/Blaziken FB | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl3 | 880dc8c7-6959-4fda-b79a-32e48c684267 | pl3-143 | `34042a45f3368272...` | //Charizard G | pl3/143/Charizard G | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl3 | 29a4bca4-6264-45f6-bc24-1d5ded5520cd | pl3-144 | `78eca7bdb78f683e...` | //Electivire FB | pl3/144/Electivire FB | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl3 | 2c1b3125-dd67-4522-b3e0-5621c05f7a9a | pl3-145 | `f634ae857203c476...` | //Garchomp C | pl3/145/Garchomp C | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl3 | 89f61622-12a4-4861-abb3-ef3dbcaf2a86 | pl3-146 | `40e8dd3335775e47...` | //Rayquaza C | pl3/146/Rayquaza C | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | standard | pl3 | fa6310ae-be43-4309-af1d-a5033daff2f0 | pl3-147 | `fe34769a187d2abd...` | //Staraptor FB | pl3/147/Staraptor FB | reverseholo_set_checklist, tcgcsv_tcgplayer_catalog, tcgdex |
| false | false | false | medium | pl3 | 9089264b-fd13-4261-94ac-b252ab89f6c7 | pl3-SH8 | `14ec4dfffafb9934...` | //Relicanth | pl3/SH8/Relicanth | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl3 | e8a8c0b0-2213-4701-89a9-8926cc0d5669 | pl3-SH9 | `75a76b453baede1a...` | //Yanma | pl3/SH9/Yanma | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl4 | a02f871c-fe3e-432b-944d-6decea0eecdf | pl4-1 | `ce17a59b335ef6d2...` | //Charizard | pl4/1/Charizard | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl4 | 71779a8b-ee22-4892-9425-8e3da51f179a | pl4-6 | `a6715a1a918e7975...` | //Mothim | pl4/6/Mothim | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl4 | 3059259e-c28b-49d6-9f31-64e178e87f28 | pl4-9 | `d47f344b7ca78b83...` | //Swalot | pl4/9/Swalot | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | pl4 | 8716f287-3497-49b2-a499-9c1e026a6a94 | pl4-12 | `76b7d722f72df637...` | //Zapdos | pl4/12/Zapdos | reverseholo_set_checklist, tcgdex |
| false | false | false | high | pl4 | 460e6437-4bc8-4a1c-90fc-546481f225e2 | pl4-94 | `41fce0e72695aaf4...` | //Arceus LV. X | pl4/94/Arceus LV.X | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | pl4 | c5125a59-32a9-4a0f-98af-4cf4ad5d6d64 | pl4-95 | `1dff70d93b0a9d23...` | //Arceus LV. X | pl4/95/Arceus LV.X | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | pl4 | ad751d34-d43b-4644-ae2e-622725f781cd | pl4-96 | `8637d346bb3b65b8...` | //Arceus LV. X | pl4/96/Arceus LV.X | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | pl4 | 1352eb03-1519-4e31-b7ad-a2d4af24ef65 | pl4-97 | `29ae8418bd8cda03...` | //Gengar LV. X | pl4/97/Gengar LV.X | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | pl4 | 2fb3462d-4a19-4412-b8cd-848a669549a0 | pl4-98 | `edb1be493ad949d7...` | //Salamence LV. X | pl4/98/Salamence LV.X | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | high | pl4 | b319332c-aea7-4f3c-ad4c-02f0874b2d60 | pl4-99 | `fed3be2e0b1e0de5...` | //Tangrowth LV. X | pl4/99/Tangrowth LV.X | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl4 | cf859f9b-f1d6-41ec-9e38-c7fd27743777 | pl4-AR2 | `1e49f624d7b4c21e...` | //Arceus | pl4/AR2/Arceus | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl4 | 8b2c91cf-bd7c-4564-84ca-5863e1414257 | pl4-AR3 | `d02fb7953167f59a...` | //Arceus | pl4/AR3/Arceus | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl4 | 61cd00a6-3418-4980-ade8-b26c8d0b4d5c | pl4-AR4 | `e2f71286f1afa0fa...` | //Arceus | pl4/AR4/Arceus | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl4 | 63a0a7b8-bdfa-4a08-ad30-680bcc45802e | pl4-AR5 | `039d49517f32f4a3...` | //Arceus | pl4/AR5/Arceus | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl4 | 67e47461-e03c-4da3-8557-d3df639dbb98 | pl4-AR7 | `f53b9639dd0a3cfc...` | //Arceus | pl4/AR7/Arceus | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl4 | 0db1b355-bb14-4042-8597-4afd1d9a2b77 | pl4-AR8 | `166ed4ecac695e9c...` | //Arceus | pl4/AR8/Arceus | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl4 | 502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda | pl4-SH10 | `5d3d4b06926f1645...` | //Bagon | pl4/SH10/Bagon | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | medium | pl4 | 22a0396f-a0fe-4680-8568-71246489db3c | pl4-SH11 | `c29396e2972a9a58...` | //Ponyta | pl4/SH11/Ponyta | pokemontcg_api, reverseholo_set_checklist, tcgdex, tcgplayer_price_guide, thepricedex_price_list |
| false | false | false | standard | swsh2 | 9cf48b11-bf42-4aa3-861b-c2ca5543877e | swsh2-154 | `66ef55ec0d72166c...` | //Boss's Orders (Giovanni) | swsh2/154/Boss's Orders (Giovanni) | tcgcsv_tcgplayer_catalog, tcgdex |

## Explicit Non-Authorizations

- This template is not approval.
- This template is not SQL.
- This template is not a migration.
- This template is not an execution artifact.
- This template does not allow DB writes, cleanup, quarantine, insertion, deletion, or hiding.

Source approval packet: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_operator_approval_packet_v1.json`
Source review digest: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_operator_review_digest_v1.json`
