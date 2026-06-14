# English Master Index PKG-02B Full Beta Collision Audit V1

This is a read-only explanation of why the approved PKG-02B guarded dry-run transaction stopped.

No real apply, migration, cleanup, quarantine, merge, delete, or durable DB write was performed.

## Result

- Status: `pkg02b_full_beta_collision_audit_complete_split_required`
- Package: `PKG-02B-FULL-BETA`
- Fingerprint: `932c4fe9c332c1896aecaeac08bd1faf1e005fd1eb9f07f3a50bf8ad2a83c7b8`
- Unique index: `uq_card_prints_identity_v2_standard_sets`
- Total package rows: 422
- Non-colliding rows: 343
- Blocked collision rows: 79
- Non-colliding child printings: 542
- Blocked collision child printings: 101
- Collision groups: 79
- DB writes performed: false
- Migrations created: false

## Unique Index

```sql
CREATE UNIQUE INDEX uq_card_prints_identity_v2_standard_sets ON public.card_prints USING btree (set_id, number_plain, COALESCE(printed_identity_modifier, ''::text), COALESCE(variant_key, ''::text)) WHERE ((set_id IS NOT NULL) AND (number_plain IS NOT NULL) AND (set_identity_model = 'standard'::text))
```

## Set Summary

| Set | Rows | Non-colliding | Blocked | Non-colliding child printings | Blocked child printings | Vault refs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2021swsh | 25 | 25 | 0 | 50 | 0 | 0 |
| col1 | 2 | 0 | 2 | 0 | 6 | 0 |
| dp7 | 8 | 0 | 8 | 0 | 10 | 0 |
| ecard2 | 13 | 13 | 0 | 26 | 0 | 0 |
| ecard3 | 15 | 15 | 0 | 19 | 0 | 0 |
| ex10 | 3 | 0 | 3 | 0 | 3 | 0 |
| me01 | 77 | 77 | 0 | 151 | 0 | 2 |
| mep | 10 | 0 | 10 | 0 | 10 | 0 |
| pl1 | 9 | 0 | 9 | 0 | 10 | 0 |
| pl2 | 17 | 0 | 17 | 0 | 24 | 0 |
| pl3 | 9 | 0 | 9 | 0 | 9 | 0 |
| pl4 | 18 | 0 | 18 | 0 | 23 | 0 |
| sv04.5 | 108 | 108 | 0 | 148 | 0 | 1 |
| sv06.5 | 52 | 52 | 0 | 69 | 0 | 1 |
| sv08.5 | 20 | 20 | 0 | 40 | 0 | 0 |
| swsh10.5 | 33 | 33 | 0 | 39 | 0 | 0 |
| swsh2 | 1 | 0 | 1 | 0 | 2 | 0 |
| swsh4.5 | 2 | 0 | 2 | 0 | 4 | 0 |

## Blocked Collision Rows

| Set | Card | Target number | Target name | Conflicting row count |
| --- | --- | ---: | --- | ---: |
| col1 | `2180d1db-0948-4cfc-9a98-da7629c2811a` | 6 | Groudon | 1 |
| col1 | `922f2b4f-eb6f-492c-89a7-8b4f313509e2` | 8 | Hitmontop | 1 |
| dp7 | `62f77935-5749-4d26-87e6-06bbca565b22` | 2 | Empoleon | 1 |
| dp7 | `665ee2b0-4a22-43d5-bf8e-8ff22a990384` | 3 | Infernape | 1 |
| dp7 | `d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff` | 96 | Dusknoir | 1 |
| dp7 | `7c211bf2-ab9e-489d-842f-65c896270783` | 97 | Heatran | 1 |
| dp7 | `6f49c231-0a53-4c0c-9db1-6d4c36aa460e` | 98 | Machamp | 1 |
| dp7 | `7a0dbe87-8ffb-4939-a5c0-371a0a21b302` | 99 | Raichu | 1 |
| dp7 | `687811f7-e3d2-41bb-b37d-1e73882551d2` | 100 | Regigigas | 1 |
| dp7 | `e8444009-0c47-48a6-af07-f5b450ac0082` | SH1 | Drifloon | 1 |
| ex10 | `2fdd39c8-7afa-4031-be84-649ac28a7b72` | 113 | Entei ★ | 1 |
| ex10 | `043dbc47-0815-4ef4-b31d-2027f70f2338` | 114 | Raikou ★ | 1 |
| ex10 | `584c31ad-d7ac-4356-b9cc-4de3152511b2` | 115 | Suicune ★ | 1 |
| mep | `6419894a-137f-4fc7-8db1-fa853872b190` | 001 | Meganium | 1 |
| mep | `b75d4730-3c1a-42ca-9d18-e8ca736ae41f` | 002 | Inteleon | 1 |
| mep | `aa9f207d-c9ea-4607-bbc5-448648bca47f` | 003 | Alakazam | 1 |
| mep | `bf523703-271c-49fe-b8aa-c31c57cb9b32` | 004 | Lunatone | 1 |
| mep | `04e533ae-dd17-478c-ab46-220859079b2c` | 005 | Drifloon | 1 |
| mep | `ac2b6cf7-6873-44e8-96b9-e03a179fae51` | 006 | Drifblim | 1 |
| mep | `870f45fe-0680-4a92-b77b-dd03a6018bd3` | 007 | Psyduck | 1 |
| mep | `47f874b2-ea20-4b89-af44-085905bb1f60` | 008 | Golduck | 1 |
| mep | `a3624761-be25-4841-83e4-c5936ec434fe` | 009 | Alakazam | 1 |
| mep | `242de512-f2fb-4994-9615-6c1e2c55ac02` | 010 | Riolu | 1 |
| pl1 | `cfbaec4b-bc98-4f6f-8b06-a30dbe29af30` | 6 | Dialga | 1 |
| pl1 | `9d20653b-49ea-4a30-8e18-629267d7397b` | 122 | Dialga G | 1 |
| pl1 | `1cc5b95e-c5b7-477c-a3c1-1d4c26e10875` | 123 | Drapion | 1 |
| pl1 | `9deb3714-1f02-4eb2-a249-6b3b42a106cb` | 124 | Giratina | 1 |
| pl1 | `182aab06-7802-4dea-90cb-32dfc7cefaab` | 125 | Palkia G | 1 |
| pl1 | `24bd8689-4031-40d0-8948-1d08e652ef34` | 126 | Shaymin | 1 |
| pl1 | `1f03518a-bed9-4c04-ad0c-3a5cf3008248` | 127 | Shaymin | 1 |
| pl1 | `74b9d351-aecc-4ff9-8ed2-958311074af7` | SH4 | Lotad | 1 |
| pl1 | `e48e17b9-b693-4882-9e9f-d177dbce37c8` | SH5 | Swablu | 1 |
| pl2 | `2ebe059c-614e-4dd6-812f-ebf268459ce5` | 1 | Arcanine | 1 |
| pl2 | `9d6eb3c7-dc61-4543-b436-a67fd23ba16c` | 3 | Darkrai G | 1 |
| pl2 | `1970689f-8f93-4148-96b2-0ed8ed149568` | 5 | Flygon | 1 |
| pl2 | `8c817161-627f-4ff5-aa27-127757b88213` | 71 | Nidoran ♀ | 1 |
| pl2 | `bc120b0e-4aad-47c1-989b-a733435a2000` | 72 | Nidoran ♂ | 1 |
| pl2 | `f619ad6c-007c-4e4d-bea0-a4a517cffa50` | 95 | Team Galactic's Invention G-107 Technical Machine | 1 |
| pl2 | `a1b66404-67e9-4586-8ac9-873c421da31e` | 103 | Alakazam 4 | 1 |
| pl2 | `5fd2b141-a2af-4c2c-bb33-df2c2af58c02` | 104 | Floatzel GL | 1 |
| pl2 | `7d47083d-43a4-4868-9bac-eb1deb237136` | 105 | Flygon | 1 |
| pl2 | `60789fd6-a0bb-49cd-848f-1ba462f4e965` | 106 | Gallade 4 | 1 |
| pl2 | `2ef89f59-3bd7-430f-9e71-42fea8cdd8ae` | 107 | Hippowdon | 1 |
| pl2 | `a719dd63-f527-4edf-8c8e-e77bac65a715` | 108 | Infernape 4 | 1 |
| pl2 | `26d6335d-9483-4de2-8b1b-771c43ab31cb` | 110 | Mismagius GL | 1 |
| pl2 | `25c91739-b09a-4360-94e5-9a8b1ed43755` | 111 | Snorlax | 1 |
| pl2 | `f5ada689-45c1-4b23-ac62-6a9f0bc11c97` | RT2 | Frost Rotom | 1 |
| pl2 | `949f5c1d-6d29-41cd-91c9-0be81e5360c5` | RT4 | Mow Rotom | 1 |
| pl2 | `0a14f347-5dd0-425a-9c9c-ffd134a9de4f` | RT6 | Charon's Choice | 1 |
| pl3 | `8cd92a82-149d-43b4-a7d3-d65782536182` | 141 | Absol G | 1 |
| pl3 | `79097350-eb58-44e8-bd39-3ec5f417f02b` | 142 | Blaziken FB | 1 |
| pl3 | `880dc8c7-6959-4fda-b79a-32e48c684267` | 143 | Charizard G | 1 |
| pl3 | `29a4bca4-6264-45f6-bc24-1d5ded5520cd` | 144 | Electivire FB | 1 |
| pl3 | `2c1b3125-dd67-4522-b3e0-5621c05f7a9a` | 145 | Garchomp C | 1 |
| pl3 | `89f61622-12a4-4861-abb3-ef3dbcaf2a86` | 146 | Rayquaza C | 1 |
| pl3 | `fa6310ae-be43-4309-af1d-a5033daff2f0` | 147 | Staraptor FB | 1 |
| pl3 | `9089264b-fd13-4261-94ac-b252ab89f6c7` | SH8 | Relicanth | 1 |
| pl3 | `e8a8c0b0-2213-4701-89a9-8926cc0d5669` | SH9 | Yanma | 1 |
| pl4 | `a02f871c-fe3e-432b-944d-6decea0eecdf` | 1 | Charizard | 1 |
| pl4 | `71779a8b-ee22-4892-9425-8e3da51f179a` | 6 | Mothim | 1 |
| pl4 | `3059259e-c28b-49d6-9f31-64e178e87f28` | 9 | Swalot | 1 |
| pl4 | `8716f287-3497-49b2-a499-9c1e026a6a94` | 12 | Zapdos | 1 |
| pl4 | `460e6437-4bc8-4a1c-90fc-546481f225e2` | 94 | Arceus LV.X | 1 |
| pl4 | `c5125a59-32a9-4a0f-98af-4cf4ad5d6d64` | 95 | Arceus LV.X | 1 |
| pl4 | `ad751d34-d43b-4644-ae2e-622725f781cd` | 96 | Arceus LV.X | 1 |
| pl4 | `1352eb03-1519-4e31-b7ad-a2d4af24ef65` | 97 | Gengar LV.X | 1 |
| pl4 | `2fb3462d-4a19-4412-b8cd-848a669549a0` | 98 | Salamence LV.X | 1 |
| pl4 | `b319332c-aea7-4f3c-ad4c-02f0874b2d60` | 99 | Tangrowth LV.X | 1 |
| pl4 | `cf859f9b-f1d6-41ec-9e38-c7fd27743777` | AR2 | Arceus | 1 |
| pl4 | `8b2c91cf-bd7c-4564-84ca-5863e1414257` | AR3 | Arceus | 1 |
| pl4 | `61cd00a6-3418-4980-ade8-b26c8d0b4d5c` | AR4 | Arceus | 1 |
| pl4 | `63a0a7b8-bdfa-4a08-ad30-680bcc45802e` | AR5 | Arceus | 1 |
| pl4 | `67e47461-e03c-4da3-8557-d3df639dbb98` | AR7 | Arceus | 1 |
| pl4 | `0db1b355-bb14-4042-8597-4afd1d9a2b77` | AR8 | Arceus | 1 |
| pl4 | `502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda` | SH10 | Bagon | 1 |
| pl4 | `22a0396f-a0fe-4680-8568-71246489db3c` | SH11 | Ponyta | 1 |
| swsh2 | `9cf48b11-bf42-4aa3-861b-c2ca5543877e` | 154 | Boss's Orders (Giovanni) | 1 |
| swsh4.5 | `5ee8ddf9-81b3-43e0-94b5-951ac0386eb8` | 58 | Boss's Orders (Lysandre) | 1 |
| swsh4.5 | `17cd3179-b844-47a8-a197-ae123ca4b583` | 60 | Professor's Research (Professor Juniper) | 1 |

## Next Safe Split

The non-colliding rows can be prepared as a new guarded dry-run package. Collision rows require merge/dedupe adjudication and must stay blocked from apply.

## Safety

- No DB writes were performed.
- No migrations were created.
- No cleanup, quarantine, merge, or delete was performed.
- Collision rows are blocked from apply and require separate adjudication.
- Non-colliding rows are not approved for real apply by this report.
