# TCGMAP-07A TCGCSV Snapshot Readiness V1

Audit-only local snapshot/readiness pass. This fetched or reused TCGCSV product JSON into a local audit cache and classified exact identity matches. No DB writes, migrations, pricing writes, image writes, or canonical mapping inserts were performed.

## Summary

- fingerprint: `ad94f08cbd4de9332f3597e658e3c7b83f57b41f44b88d7ae9a0cd16ceeb6ec3`
- generated_at: `2026-06-19T14:29:53.750Z`
- sets_attempted: 80
- groups_matched: 78
- products_loaded: 13853
- candidate_rows: 2617
- ready_rows: 371
- blocked_rows: 2246

## Classification Buckets

| classification | rows | parents | sets |
| --- | --- | --- | --- |
| blocked_existing_tcgplayer_external_id_collision | 1120 | 1120 | 55 |
| blocked_multi_products_for_parent | 928 | 414 | 14 |
| ready_from_fresh_tcgcsv_exact_identity | 371 | 371 | 38 |
| blocked_batch_duplicate_tcgplayer_id | 198 | 198 | 2 |

## Set Outcomes

| set | name | missing parents | groups | products | candidates | status |
| --- | --- | --- | --- | --- | --- | --- |
| sv4pt5 | Paldean Fates | 248 | SV: Paldean Fates | 295 | 244 | candidate_rows_found |
| sv8pt5 | Prismatic Evolutions | 194 | SV: Prismatic Evolutions | 399 | 340 | candidate_rows_found |
| smp | SM Black Star Promos | 171 | SM Promos | 333 | 131 | candidate_rows_found |
| svp | Scarlet & Violet Black Star Promos | 132 | SV: Scarlet & Violet Promo Cards | 283 | 136 | candidate_rows_found |
| sv6pt5 | Shrouded Fable | 112 | SV: Shrouded Fable | 137 | 99 | candidate_rows_found |
| sv06.5 | Shrouded Fable | 100 | SV: Shrouded Fable | 137 | 99 | candidate_rows_found |
| sv10.5b | Black Bolt | 88 | SV: Black Bolt | 358 | 235 | candidate_rows_found |
| swsh10.5 | Pokémon GO | 88 | Pokemon GO | 146 | 91 | candidate_rows_found |
| swshp | SWSH Black Star Promos | 65 | SWSH: Sword & Shield Promo Cards | 343 | 66 | candidate_rows_found |
| swsh10 | Astral Radiance | 56 | SWSH10: Astral Radiance | 255 | 33 | candidate_rows_found |
| bwp | BW Black Star Promos | 53 | Black and White Promos | 148 | 58 | candidate_rows_found |
| swsh9 | Brilliant Stars | 53 | SWSH09: Brilliant Stars | 234 | 33 | candidate_rows_found |
| swsh11 | Lost Origin | 45 | SWSH11: Lost Origin | 274 | 30 | candidate_rows_found |
| g1 | Generations | 42 | Generations | 119 | 9 | candidate_rows_found |
| xyp | XY Black Star Promos | 41 | XY Promos | 269 | 54 | candidate_rows_found |
| sv10 | Destined Rivals | 39 | SV10: Destined Rivals | 281 | 24 | candidate_rows_found |
| sv05 | Temporal Forces | 38 | SV05: Temporal Forces | 260 | 27 | candidate_rows_found |
| mep | MEP Black Star Promos | 37 | ME: Mega Evolution Promo | 95 | 42 | candidate_rows_found |
| swsh12 | Silver Tempest | 37 | SWSH12: Silver Tempest | 253 | 24 | candidate_rows_found |
| swsh7 | Evolving Skies | 36 | SWSH07: Evolving Skies | 288 | 29 | candidate_rows_found |
| swsh8 | Fusion Strike | 36 | SWSH08: Fusion Strike | 329 | 22 | candidate_rows_found |
| mfb | My First Battle | 34 | My First Battle | 50 | 0 | snapshot_loaded_no_exact_candidates |
| swsh6 | Chilling Reign | 34 | SWSH06: Chilling Reign | 275 | 25 | candidate_rows_found |
| pl3 | Supreme Victors | 32 | Supreme Victors | 156 | 20 | candidate_rows_found |
| me01 | Mega Evolution | 32 | ME01: Mega Evolution | 227 | 27 | candidate_rows_found |
| swsh10tg | Astral Radiance Trainer Gallery | 30 | SWSH10: Astral Radiance Trainer Gallery | 30 | 30 | candidate_rows_found |
| swsh11tg | Lost Origin Trainer Gallery | 30 | SWSH11: Lost Origin Trainer Gallery | 30 | 30 | candidate_rows_found |
| swsh12tg | Silver Tempest Trainer Gallery | 30 | SWSH12: Silver Tempest Trainer Gallery | 30 | 30 | candidate_rows_found |
| swsh9tg | Brilliant Stars Trainer Gallery | 30 | SWSH09: Brilliant Stars Trainer Gallery | 30 | 30 | candidate_rows_found |
| sve | Scarlet & Violet Energies | 29 | SVE: Scarlet & Violet Energies | 40 | 40 | candidate_rows_found |
| sv06 | Twilight Masquerade | 29 | SV06: Twilight Masquerade | 262 | 29 | candidate_rows_found |
| bw11 | Legendary Treasures | 28 | Legendary Treasures | 119 | 3 | candidate_rows_found |
| exu | Unseen Forces Unown Collection | 28 |  | 0 | 0 | source_group_not_found |
| sv02 | Paldea Evolved | 27 | SV02: Paldea Evolved | 315 | 19 | candidate_rows_found |
| 2021swsh | Macdonald's Collection 2021 | 25 |  | 0 | 0 | source_group_not_found |
| hsp | HGSS Black Star Promos | 25 | HGSS Promos | 38 | 33 | candidate_rows_found |
| mcd21 | McDonald's Collection 2021 | 25 |  | 0 | 0 | source_group_not_found |
| sv07 | Stellar Crown | 25 | SV07: Stellar Crown | 211 | 20 | candidate_rows_found |
| sv04 | Paradox Rift | 24 | SV04: Paradox Rift | 307 | 24 | candidate_rows_found |
| basep | Wizards Black Star Promos | 23 | WoTC Promo | 71 | 16 | candidate_rows_found |
| swsh1 | Sword & Shield | 22 |  | 0 | 0 | source_group_not_found |
| sv08 | Surging Sparks | 21 | SV08: Surging Sparks | 288 | 20 | candidate_rows_found |
| np | Nintendo Black Star Promos | 20 | Nintendo Promos | 95 | 32 | candidate_rows_found |
| sv01 | Scarlet & Violet | 20 |  | 0 | 0 | source_group_not_found |
| sv09 | Journey Together | 20 | SV09: Journey Together | 226 | 13 | candidate_rows_found |
| swsh5 | Battle Styles | 20 | SWSH05: Battle Styles | 232 | 14 | candidate_rows_found |
| base2 | Jungle | 19 | Jungle | 70 | 17 | candidate_rows_found |
| pl4 | Arceus | 18 | Arceus | 120 | 18 | candidate_rows_found |
| sm5 | Ultra Prism | 18 | SM - Ultra Prism | 211 | 6 | candidate_rows_found |
| hgss2 | HS—Unleashed | 17 | Unleashed | 98 | 17 | candidate_rows_found |
| base1 | Base Set | 17 | SV01: Scarlet & Violet Base Set; SWSH01: Sword & Shield Base Set; SM Base Set; XY Base Set; Base Set | 1115 | 7 | candidate_rows_found |
| sm1 | Sun & Moon | 17 | SM Base Set; Base Set | 325 | 8 | candidate_rows_found |
| swsh3 | Darkness Ablaze | 17 | SWSH03: Darkness Ablaze | 243 | 13 | candidate_rows_found |
| ex14 | Crystal Guardians | 16 | Crystal Guardians | 103 | 16 | candidate_rows_found |
| ru1 | Pokémon Rumble | 16 | Rumble | 16 | 16 | candidate_rows_found |
| sm8 | Lost Thunder | 15 | SM - Lost Thunder | 271 | 3 | candidate_rows_found |
| 2023sv | McDonald's Collection 2023 | 15 | McDonald's Promos 2023 | 16 | 15 | candidate_rows_found |
| 2024sv | McDonald's Collection 2024 | 15 | McDonald's Promos 2024 | 16 | 15 | candidate_rows_found |
| mcd22 | McDonald's Collection 2022 | 15 | McDonald's Promos 2022 | 16 | 15 | candidate_rows_found |
| sm6 | Forbidden Light | 15 | SM - Forbidden Light | 178 | 6 | candidate_rows_found |
| swsh2 | Rebel Clash | 15 | SWSH02: Rebel Clash | 254 | 12 | candidate_rows_found |
| ex15 | Dragon Frontiers | 14 | Dragon Frontiers | 104 | 9 | candidate_rows_found |
| sm12 | Cosmic Eclipse | 14 | SM - Cosmic Eclipse | 301 | 14 | candidate_rows_found |
| ecard2 | Aquapolis | 14 | Aquapolis | 187 | 4 | candidate_rows_found |
| ecard3 | Skyridge | 14 | Skyridge | 185 | 7 | candidate_rows_found |
| bw5 | Dark Explorers | 14 | Dark Explorers | 117 | 13 | candidate_rows_found |
| col1 | Call of Legends | 13 | Call of Legends | 109 | 13 | candidate_rows_found |
| bw9 | Plasma Freeze | 13 | Plasma Freeze | 128 | 11 | candidate_rows_found |
| pl2 | Rising Rivals | 13 | Rising Rivals | 122 | 8 | candidate_rows_found |
| sm7 | Celestial Storm | 12 | SM - Celestial Storm | 222 | 9 | candidate_rows_found |
| tk-ex-p | EX trainer Kit 2 (Plusle) | 12 |  | 0 | 0 | source_group_not_found |
| tk2b | EX Trainer Kit 2 Minun | 12 |  | 0 | 0 | source_group_not_found |
| dp5 | Majestic Dawn | 11 | Majestic Dawn | 104 | 9 | candidate_rows_found |
| swsh12.5 | Crown Zenith | 11 | SWSH: Crown Zenith | 225 | 11 | candidate_rows_found |
| bw1 | Black & White | 11 | Black and White | 133 | 9 | candidate_rows_found |
| bw6 | Dragons Exalted | 10 | Dragons Exalted | 131 | 6 | candidate_rows_found |
| sm9 | Team Up | 10 | SM - Team Up | 246 | 4 | candidate_rows_found |
| dp7 | Stormfront | 10 | Stormfront | 108 | 8 | candidate_rows_found |
| pop5 | POP Series 5 | 10 | POP Series 5 | 18 | 7 | candidate_rows_found |
| hgss3 | HS—Undaunted | 10 | Undaunted | 93 | 10 | candidate_rows_found |

## Ready By Set

| set | name | ready |
| --- | --- | --- |
| swsh10tg | Astral Radiance Trainer Gallery | 30 |
| swsh11tg | Lost Origin Trainer Gallery | 30 |
| swsh12tg | Silver Tempest Trainer Gallery | 30 |
| swsh9tg | Brilliant Stars Trainer Gallery | 30 |
| hsp | HGSS Black Star Promos | 22 |
| pl3 | Supreme Victors | 20 |
| ru1 | Pokémon Rumble | 16 |
| 2023sv | McDonald's Collection 2023 | 15 |
| 2024sv | McDonald's Collection 2024 | 15 |
| mcd22 | McDonald's Collection 2022 | 15 |
| ex14 | Crystal Guardians | 12 |
| hgss2 | HS—Unleashed | 12 |
| pl4 | Arceus | 12 |
| sm12 | Cosmic Eclipse | 12 |
| bw9 | Plasma Freeze | 10 |
| ex15 | Dragon Frontiers | 8 |
| hgss3 | HS—Undaunted | 8 |
| sve | Scarlet & Violet Energies | 8 |
| bw5 | Dark Explorers | 7 |
| pop5 | POP Series 5 | 7 |
| bw6 | Dragons Exalted | 6 |
| col1 | Call of Legends | 6 |
| sm7 | Celestial Storm | 6 |
| dp7 | Stormfront | 4 |
| sm9 | Team Up | 4 |
| sv07 | Stellar Crown | 4 |
| swsh2 | Rebel Clash | 4 |
| ecard3 | Skyridge | 3 |
| swsh3 | Darkness Ablaze | 3 |
| sm1 | Sun & Moon | 2 |
| sm6 | Forbidden Light | 2 |
| sv08 | Surging Sparks | 2 |
| base1 | Base Set | 1 |
| bw11 | Legendary Treasures | 1 |
| sm5 | Ultra Prism | 1 |
| sm8 | Lost Thunder | 1 |
| sv06 | Twilight Masquerade | 1 |
| sv09 | Journey Together | 1 |

## Ready Sample

| set | number | name | card_print_id | tcgplayer | source |
| --- | --- | --- | --- | --- | --- |
| 2023sv | 1 | Sprigatito | `4091ae25-3624-4f56-a455-7bd3d4beb154` | `516512` | https://www.tcgplayer.com/product/516512/pokemon-mcdonalds-promos-2023-sprigatito |
| 2023sv | 2 | Fuecoco | `451748ac-012e-4d67-9912-d04534a05817` | `516513` | https://www.tcgplayer.com/product/516513/pokemon-mcdonalds-promos-2023-fuecoco |
| 2023sv | 3 | Quaxly | `3a769557-0102-4fd2-b79e-8eef05b52e60` | `516514` | https://www.tcgplayer.com/product/516514/pokemon-mcdonalds-promos-2023-quaxly |
| 2023sv | 4 | Cetoddle | `98500b36-36d3-470f-9d15-099865980b07` | `516515` | https://www.tcgplayer.com/product/516515/pokemon-mcdonalds-promos-2023-cetoddle |
| 2023sv | 5 | Cetitan | `e22e07fa-71e2-46aa-9951-829e339f8763` | `516516` | https://www.tcgplayer.com/product/516516/pokemon-mcdonalds-promos-2023-cetitan |
| 2023sv | 6 | Pikachu | `ee8c68fc-626c-42db-b7ef-fc869fe07ae8` | `516517` | https://www.tcgplayer.com/product/516517/pokemon-mcdonalds-promos-2023-pikachu |
| 2023sv | 7 | Pawmi | `1dc8d631-789a-4857-a1fd-d72efea4d614` | `516518` | https://www.tcgplayer.com/product/516518/pokemon-mcdonalds-promos-2023-pawmi |
| 2023sv | 8 | Kilowattrel | `31b28128-2bba-420a-acee-4962caf0514c` | `516519` | https://www.tcgplayer.com/product/516519/pokemon-mcdonalds-promos-2023-kilowattrel |
| 2023sv | 9 | Flittle | `c9372355-e4ff-46a7-8172-94fe7d8a28be` | `516520` | https://www.tcgplayer.com/product/516520/pokemon-mcdonalds-promos-2023-flittle |
| 2023sv | 10 | Sandaconda | `6e7a29e1-3b5b-4c27-86b3-1e63c99f576a` | `516521` | https://www.tcgplayer.com/product/516521/pokemon-mcdonalds-promos-2023-sandaconda |
| 2023sv | 11 | Klawf | `fae05233-f9c5-4860-aa86-49a942613ff5` | `516522` | https://www.tcgplayer.com/product/516522/pokemon-mcdonalds-promos-2023-klawf |
| 2023sv | 12 | Blissey | `3ed79a65-c672-451a-afd7-e47a68ae2c53` | `516523` | https://www.tcgplayer.com/product/516523/pokemon-mcdonalds-promos-2023-blissey |
| 2023sv | 13 | Tandemaus | `2dd83d5b-2476-4b63-9fbe-c849c2d56aa7` | `516524` | https://www.tcgplayer.com/product/516524/pokemon-mcdonalds-promos-2023-tandemaus |
| 2023sv | 14 | Cyclizar | `1df85310-35da-4070-a3bd-a01a96d39e1c` | `516525` | https://www.tcgplayer.com/product/516525/pokemon-mcdonalds-promos-2023-cyclizar |
| 2023sv | 15 | Kirlia | `fb3bc199-9149-402e-8342-265eceecf120` | `516526` | https://www.tcgplayer.com/product/516526/pokemon-mcdonalds-promos-2023-kirlia |
| 2024sv | 1 | Charizard | `43e51937-5821-449d-adf5-7cfc30d135b9` | `614370` | https://www.tcgplayer.com/product/614370/pokemon-mcdonalds-promos-2024-charizard |
| 2024sv | 2 | Pikachu | `2ff72f10-b4cd-4e26-998c-87b1ca181028` | `614371` | https://www.tcgplayer.com/product/614371/pokemon-mcdonalds-promos-2024-pikachu |
| 2024sv | 3 | Miraidon | `afa60d30-57c3-44ec-9964-fdf2a2bd7690` | `614372` | https://www.tcgplayer.com/product/614372/pokemon-mcdonalds-promos-2024-miraidon |
| 2024sv | 4 | Jigglypuff | `7fe87152-ff37-4a8b-8b56-1338ca39751b` | `614373` | https://www.tcgplayer.com/product/614373/pokemon-mcdonalds-promos-2024-jigglypuff |
| 2024sv | 5 | Hatenna | `9218afd1-f370-4698-902d-2e60140f127c` | `614374` | https://www.tcgplayer.com/product/614374/pokemon-mcdonalds-promos-2024-hatenna |
| 2024sv | 6 | Dragapult | `0a81032c-548d-438c-a091-5b2924557771` | `614375` | https://www.tcgplayer.com/product/614375/pokemon-mcdonalds-promos-2024-dragapult |
| 2024sv | 7 | Quagsire | `24b6d461-b043-4768-ae3a-1cf43442c7d6` | `614376` | https://www.tcgplayer.com/product/614376/pokemon-mcdonalds-promos-2024-quagsire |
| 2024sv | 8 | Koraidon | `2d9108f8-f23d-49f6-8557-19553332e9eb` | `614377` | https://www.tcgplayer.com/product/614377/pokemon-mcdonalds-promos-2024-koraidon |
| 2024sv | 9 | Umbreon | `5d51ef4f-5f17-4b8e-b9fc-2ae31f955022` | `614378` | https://www.tcgplayer.com/product/614378/pokemon-mcdonalds-promos-2024-umbreon |
| 2024sv | 10 | Hydreigon | `d3e549c3-b31d-4368-b7b4-e34b28b41c1d` | `614379` | https://www.tcgplayer.com/product/614379/pokemon-mcdonalds-promos-2024-hydreigon |
| 2024sv | 11 | Roaring Moon | `d2766899-2087-437d-81a4-8d769e4727a7` | `614380` | https://www.tcgplayer.com/product/614380/pokemon-mcdonalds-promos-2024-roaring-moon |
| 2024sv | 12 | Dragonite | `2a8e6db0-3a82-4196-8cd8-f0528e68b9ef` | `614381` | https://www.tcgplayer.com/product/614381/pokemon-mcdonalds-promos-2024-dragonite |
| 2024sv | 13 | Eevee | `3faee98e-12b5-4f6c-a711-073d024155eb` | `614382` | https://www.tcgplayer.com/product/614382/pokemon-mcdonalds-promos-2024-eevee |
| 2024sv | 14 | Rayquaza | `194dc27a-ce21-4a69-93de-d8c48000c128` | `614383` | https://www.tcgplayer.com/product/614383/pokemon-mcdonalds-promos-2024-rayquaza |
| 2024sv | 15 | Drampa | `2c2649a8-a3b7-44cd-87ba-0c5d03667e0f` | `614384` | https://www.tcgplayer.com/product/614384/pokemon-mcdonalds-promos-2024-drampa |

## Recommended Next Package

Recommended next package: `TCGMAP-07B-FRESH-TCGCSV-TCGPLAYER-MAPPING-INSERTS` guarded rollback-only dry-run.

The package should insert only rows classified as `ready_from_fresh_tcgcsv_exact_identity` from this fingerprint.

## Safety Confirmation

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- pricing_writes_performed: false
- image_writes_performed: false
- card_identity_writes_performed: false
- child_printing_writes_performed: false
- canonical_mapping_writes_performed: false

