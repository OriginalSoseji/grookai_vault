# TCGMAP-08A TCGCSV Snapshot Readiness V1

Audit-only local snapshot/readiness pass. This fetched or reused TCGCSV product JSON into a local audit cache and classified exact identity matches. No DB writes, migrations, pricing writes, image writes, or canonical mapping inserts were performed.

## Summary

- fingerprint: `36880bc60c2a7c07dc6928ca6275554c4c08c1b4b073c84b66def28a67d737bb`
- generated_at: `2026-06-19T14:35:48.556Z`
- sets_attempted: 120
- groups_matched: 104
- products_loaded: 19363
- candidate_rows: 2446
- ready_rows: 71
- blocked_rows: 2375

## Classification Buckets

| classification | rows | parents | sets |
| --- | --- | --- | --- |
| blocked_existing_tcgplayer_external_id_collision | 1252 | 1252 | 87 |
| blocked_multi_products_for_parent | 925 | 415 | 15 |
| blocked_batch_duplicate_tcgplayer_id | 198 | 198 | 2 |
| ready_from_fresh_tcgcsv_exact_identity | 71 | 71 | 20 |

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
| me01 | Mega Evolution | 32 | ME01: Mega Evolution | 227 | 27 | candidate_rows_found |
| exu | Unseen Forces Unown Collection | 28 |  | 0 | 0 | source_group_not_found |
| sv06 | Twilight Masquerade | 28 | SV06: Twilight Masquerade | 262 | 28 | candidate_rows_found |
| bw11 | Legendary Treasures | 27 | Legendary Treasures | 119 | 2 | candidate_rows_found |
| sv02 | Paldea Evolved | 27 | SV02: Paldea Evolved | 315 | 19 | candidate_rows_found |
| 2021swsh | Macdonald's Collection 2021 | 25 |  | 0 | 0 | source_group_not_found |
| mcd21 | McDonald's Collection 2021 | 25 |  | 0 | 0 | source_group_not_found |
| sv04 | Paradox Rift | 24 | SV04: Paradox Rift | 307 | 24 | candidate_rows_found |
| basep | Wizards Black Star Promos | 23 | WoTC Promo | 71 | 16 | candidate_rows_found |
| swsh1 | Sword & Shield | 22 |  | 0 | 0 | source_group_not_found |
| sve | Scarlet & Violet Energies | 21 | SVE: Scarlet & Violet Energies | 40 | 32 | candidate_rows_found |
| sv07 | Stellar Crown | 21 | SV07: Stellar Crown | 211 | 18 | candidate_rows_found |
| np | Nintendo Black Star Promos | 20 | Nintendo Promos | 95 | 32 | candidate_rows_found |
| sv01 | Scarlet & Violet | 20 |  | 0 | 0 | source_group_not_found |
| swsh5 | Battle Styles | 20 | SWSH05: Battle Styles | 232 | 14 | candidate_rows_found |
| base2 | Jungle | 19 | Jungle | 70 | 17 | candidate_rows_found |
| sv08 | Surging Sparks | 19 | SV08: Surging Sparks | 288 | 19 | candidate_rows_found |
| sv09 | Journey Together | 19 | SV09: Journey Together | 226 | 12 | candidate_rows_found |
| sm5 | Ultra Prism | 17 | SM - Ultra Prism | 211 | 5 | candidate_rows_found |
| base1 | Base Set | 16 | SV01: Scarlet & Violet Base Set; SWSH01: Sword & Shield Base Set; SM Base Set; XY Base Set; Base Set | 1115 | 6 | candidate_rows_found |
| sm1 | Sun & Moon | 15 | SM Base Set; Base Set | 325 | 6 | candidate_rows_found |
| ecard2 | Aquapolis | 14 | Aquapolis | 187 | 4 | candidate_rows_found |
| sm8 | Lost Thunder | 14 | SM - Lost Thunder | 271 | 2 | candidate_rows_found |
| swsh3 | Darkness Ablaze | 14 | SWSH03: Darkness Ablaze | 243 | 10 | candidate_rows_found |
| pl2 | Rising Rivals | 13 | Rising Rivals | 122 | 8 | candidate_rows_found |
| sm6 | Forbidden Light | 13 | SM - Forbidden Light | 178 | 4 | candidate_rows_found |
| pl3 | Supreme Victors | 12 | Supreme Victors | 156 | 10 | candidate_rows_found |
| tk-ex-p | EX trainer Kit 2 (Plusle) | 12 |  | 0 | 0 | source_group_not_found |
| tk2b | EX Trainer Kit 2 Minun | 12 |  | 0 | 0 | source_group_not_found |
| ecard3 | Skyridge | 11 | Skyridge | 185 | 4 | candidate_rows_found |
| dp5 | Majestic Dawn | 11 | Majestic Dawn | 104 | 9 | candidate_rows_found |
| swsh12.5 | Crown Zenith | 11 | SWSH: Crown Zenith | 225 | 11 | candidate_rows_found |
| swsh2 | Rebel Clash | 11 | SWSH02: Rebel Clash | 254 | 8 | candidate_rows_found |
| bw1 | Black & White | 11 | Black and White | 133 | 9 | candidate_rows_found |
| tk-ex-latia | EX trainer Kit (Latias) | 10 |  | 0 | 0 | source_group_not_found |
| tk-ex-latio | EX trainer Kit (Latios) | 10 |  | 0 | 0 | source_group_not_found |
| xy2 | Flashfire | 9 | XY - Flashfire | 147 | 8 | candidate_rows_found |
| bw10 | Plasma Blast | 9 | Plasma Blast | 115 | 9 | candidate_rows_found |
| bw4 | Next Destinies | 9 | Next Destinies | 120 | 7 | candidate_rows_found |
| bw8 | Plasma Storm | 9 | Plasma Storm | 146 | 9 | candidate_rows_found |
| pl1 | Platinum | 9 | Platinum | 141 | 7 | candidate_rows_found |
| sv03 | Obsidian Flames | 9 | SV03: Obsidian Flames | 262 | 9 | candidate_rows_found |
| bp | Best of Game | 9 |  | 0 | 0 | source_group_not_found |
| hgss1 | HeartGold & SoulSilver | 9 |  | 0 | 0 | source_group_not_found |
| dp1 | Diamond & Pearl | 9 | Diamond and Pearl | 135 | 8 | candidate_rows_found |
| mee | Mega Evolution Energy | 8 |  | 0 | 0 | source_group_not_found |
| xy4 | Phantom Forces | 8 | XY - Phantom Forces | 156 | 1 | candidate_rows_found |
| hgss4 | HS—Triumphant | 8 | Triumphant | 106 | 6 | candidate_rows_found |
| xy11 | Steam Siege | 8 | XY - Steam Siege | 160 | 6 | candidate_rows_found |
| xy12 | Evolutions | 8 | SV: Prismatic Evolutions; XY - Evolutions | 575 | 7 | candidate_rows_found |
| xy9 | BREAKpoint | 8 | XY - BREAKpoint | 155 | 5 | candidate_rows_found |
| dpp | DP Black Star Promos | 8 | Diamond and Pearl Promos | 66 | 5 | candidate_rows_found |
| bog | Best of game | 8 |  | 0 | 0 | source_group_not_found |
| swsh4 | Vivid Voltage | 8 | SWSH04: Vivid Voltage | 247 | 8 | candidate_rows_found |
| ex3 | Dragon | 8 | Dragon | 103 | 6 | candidate_rows_found |
| col1 | Call of Legends | 7 | Call of Legends | 109 | 7 | candidate_rows_found |
| sm11 | Unified Minds | 7 | SM - Unified Minds | 298 | 7 | candidate_rows_found |
| ex13 | Holon Phantoms | 7 | Holon Phantoms | 115 | 1 | candidate_rows_found |
| bw7 | Boundaries Crossed | 7 | Boundaries Crossed | 160 | 7 | candidate_rows_found |
| bw5 | Dark Explorers | 7 | Dark Explorers | 117 | 6 | candidate_rows_found |
| bw3 | Noble Victories | 7 | Noble Victories | 119 | 5 | candidate_rows_found |
| ex1 | Ruby & Sapphire | 7 | Ruby and Sapphire | 112 | 6 | candidate_rows_found |
| sm10 | Unbroken Bonds | 6 | SM - Unbroken Bonds | 271 | 4 | candidate_rows_found |
| pl4 | Arceus | 6 | Arceus | 120 | 6 | candidate_rows_found |
| ex15 | Dragon Frontiers | 6 | Dragon Frontiers | 104 | 1 | candidate_rows_found |
| sm9 | Team Up | 6 | SM - Team Up | 246 | 0 | snapshot_loaded_no_exact_candidates |
| cel25c | Celebrations: Classic Collection | 6 | Celebrations: Classic Collection | 25 | 5 | candidate_rows_found |
| dp7 | Stormfront | 6 | Stormfront | 108 | 4 | candidate_rows_found |
| xya | Yello A Alternate | 6 |  | 0 | 0 | source_group_not_found |
| xy8 | BREAKthrough | 6 | XY - BREAKthrough | 227 | 4 | candidate_rows_found |
| sm7 | Celestial Storm | 6 | SM - Celestial Storm | 222 | 3 | candidate_rows_found |
| xy10 | Fates Collide | 6 | XY - Fates Collide | 167 | 5 | candidate_rows_found |
| sm4 | Crimson Invasion | 6 | SM - Crimson Invasion | 161 | 5 | candidate_rows_found |
| dp6 | Legends Awakened | 6 | Legends Awakened | 149 | 6 | candidate_rows_found |
| xy1 | XY | 6 |  | 0 | 0 | source_group_not_found |
| ex5.5 | Poké Card Creator Pack | 5 |  | 0 | 0 | source_group_not_found |
| fut20 | Pokémon Futsal Collection | 5 |  | 0 | 0 | source_group_not_found |
| fut2020 | Pokémon Futsal 2020 | 5 |  | 0 | 0 | source_group_not_found |
| tk-xy-n | XY trainer Kit (Noivern) | 5 |  | 0 | 0 | source_group_not_found |
| dp3 | Secret Wonders | 5 | Secret Wonders | 134 | 4 | candidate_rows_found |
| sv03.5 | 151 | 5 | SV: Scarlet & Violet 151 | 249 | 5 | candidate_rows_found |
| hgss2 | HS—Unleashed | 5 | Unleashed | 98 | 5 | candidate_rows_found |
| bw6 | Dragons Exalted | 4 | Dragons Exalted | 131 | 0 | snapshot_loaded_no_exact_candidates |
| cel25 | Celebrations | 4 | Celebrations | 74 | 4 | candidate_rows_found |
| tk-bw-e | BW trainer Kit (Excadrill) | 4 |  | 0 | 0 | source_group_not_found |
| tk-sm-l | SM trainer Kit (Lycanroc) | 4 |  | 0 | 0 | source_group_not_found |
| tk-xy-b | XY trainer Kit (Bisharp) | 4 |  | 0 | 0 | source_group_not_found |
| gym2 | Gym Challenge | 4 | Gym Challenge | 140 | 2 | candidate_rows_found |
| dp2 | Mysterious Treasures | 4 | Mysterious Treasures | 128 | 1 | candidate_rows_found |
| swsh3.5 | Champion's Path | 4 | Champion's Path | 110 | 4 | candidate_rows_found |
| base5 | Team Rocket | 4 | Team Rocket | 89 | 4 | candidate_rows_found |
| dp4 | Great Encounters | 4 | Great Encounters | 108 | 4 | candidate_rows_found |
| ex14 | Crystal Guardians | 4 | Crystal Guardians | 103 | 4 | candidate_rows_found |
| ex5 | Hidden Legends | 4 | Hidden Legends | 107 | 4 | candidate_rows_found |
| ex9 | Emerald | 4 | Emerald | 111 | 4 | candidate_rows_found |
| sm2 | Guardians Rising | 4 | SM - Guardians Rising | 242 | 4 | candidate_rows_found |
| sv10.5w | White Flare | 4 | SV: White Flare | 342 | 7 | candidate_rows_found |

## Ready By Set

| set | name | ready |
| --- | --- | --- |
| bw10 | Plasma Blast | 8 |
| bw8 | Plasma Storm | 8 |
| sm11 | Unified Minds | 7 |
| bw4 | Next Destinies | 6 |
| bw7 | Boundaries Crossed | 6 |
| xy2 | Flashfire | 6 |
| cel25c | Celebrations: Classic Collection | 5 |
| hgss4 | HS—Triumphant | 5 |
| sm10 | Unbroken Bonds | 4 |
| xy11 | Steam Siege | 3 |
| cel25 | Celebrations | 2 |
| pl1 | Platinum | 2 |
| xy12 | Evolutions | 2 |
| dpp | DP Black Star Promos | 1 |
| sv03 | Obsidian Flames | 1 |
| swsh3.5 | Champion's Path | 1 |
| swsh4 | Vivid Voltage | 1 |
| xy10 | Fates Collide | 1 |
| xy8 | BREAKthrough | 1 |
| xy9 | BREAKpoint | 1 |

## Ready Sample

| set | number | name | card_print_id | tcgplayer | source |
| --- | --- | --- | --- | --- | --- |
| bw10 | 11 | Genesect-EX | `b1f06e7e-92fe-4c4e-bf83-6e5c0156c456` | `85665` | https://www.tcgplayer.com/product/85665/pokemon-plasma-blast-genesect-ex-team-plasma |
| bw10 | 65 | Dialga-EX | `4c49ad35-c8cd-45b1-b62d-528552a43c1b` | `84808` | https://www.tcgplayer.com/product/84808/pokemon-plasma-blast-dialga-ex-team-plasma |
| bw10 | 66 | Palkia-EX | `4c5d95e5-8283-40cc-a5cc-2d1c0bf7e178` | `87915` | https://www.tcgplayer.com/product/87915/pokemon-plasma-blast-palkia-ex-team-plasma |
| bw10 | 96 | Virizion-EX | `5fbb6250-59a9-4b16-b562-5f30583a78d8` | `90394` | https://www.tcgplayer.com/product/90394/pokemon-plasma-blast-virizion-ex-full-art |
| bw10 | 97 | Genesect-EX | `7279e676-367e-404d-b2fe-a439da968dd1` | `85666` | https://www.tcgplayer.com/product/85666/pokemon-plasma-blast-genesect-ex-team-plasma-97-full-art |
| bw10 | 98 | Jirachi-EX | `ab147151-2e37-45f8-b4b2-e8bac96e10b6` | `86334` | https://www.tcgplayer.com/product/86334/pokemon-plasma-blast-jirachi-ex-98-full-art |
| bw10 | 99 | Dialga-EX | `bc029e15-32f3-4372-b463-e7981d8ca619` | `84809` | https://www.tcgplayer.com/product/84809/pokemon-plasma-blast-dialga-ex-team-plasma-99-full-art |
| bw10 | 100 | Palkia-EX | `75d15537-f15e-41a0-a2f3-34ce31df611d` | `87916` | https://www.tcgplayer.com/product/87916/pokemon-plasma-blast-palkia-ex-team-plasma-100-full-art |
| bw4 | 94 | Shaymin-EX | `6e6b045f-96c9-4be4-b483-70c94a1ec1a2` | `89112` | https://www.tcgplayer.com/product/89112/pokemon-next-destinies-shaymin-ex-94-full-art |
| bw4 | 95 | Reshiram-EX | `27b796c6-68ca-49df-9e0a-48ccf37aa532` | `88716` | https://www.tcgplayer.com/product/88716/pokemon-next-destinies-reshiram-ex-95-full-art |
| bw4 | 96 | Kyurem-EX | `2535521d-7064-4fa2-a210-d42852d2d96b` | `86570` | https://www.tcgplayer.com/product/86570/pokemon-next-destinies-kyurem-ex-96-full-art |
| bw4 | 97 | Zekrom-EX | `fdd6085d-61ff-4fb9-adb2-2f5093b6bf27` | `90743` | https://www.tcgplayer.com/product/90743/pokemon-next-destinies-zekrom-ex-97-full-art |
| bw4 | 98 | Mewtwo-EX | `215fcb26-dee4-49ac-a07b-d9bb37d57100` | `87432` | https://www.tcgplayer.com/product/87432/pokemon-next-destinies-mewtwo-ex-98-full-art |
| bw4 | 99 | Regigigas-EX | `a402b34f-2ad3-41d4-83d2-f94283241932` | `88667` | https://www.tcgplayer.com/product/88667/pokemon-next-destinies-regigigas-ex-99-full-art |
| bw7 | 141 | Celebi-EX | `eb963ca2-1c2e-4937-b736-bd5846711cf7` | `84153` | https://www.tcgplayer.com/product/84153/pokemon-boundaries-crossed-celebi-ex-141-full-art |
| bw7 | 142 | Keldeo-EX | `0f8c13a9-e5c8-448f-8b73-0f7ceeb85379` | `86439` | https://www.tcgplayer.com/product/86439/pokemon-boundaries-crossed-keldeo-ex-142-full-art |
| bw7 | 143 | Cresselia-EX | `67d283be-0f93-4227-93e9-000b341824e4` | `84471` | https://www.tcgplayer.com/product/84471/pokemon-boundaries-crossed-cresselia-ex-143-full-art |
| bw7 | 144 | Landorus-EX | `f5acbdf7-1d62-47cd-84ad-48932d8d277c` | `86596` | https://www.tcgplayer.com/product/86596/pokemon-boundaries-crossed-landorus-ex-144-full-art |
| bw7 | 145 | Black Kyurem-EX | `823c7066-a38f-4c13-816f-144f32ba98e0` | `83857` | https://www.tcgplayer.com/product/83857/pokemon-boundaries-crossed-black-kyurem-ex-145-full-art |
| bw7 | 146 | White Kyurem-EX | `a99d6813-ea66-4a40-88a7-9aab998e299f` | `90592` | https://www.tcgplayer.com/product/90592/pokemon-boundaries-crossed-white-kyurem-ex-146-full-art |
| bw8 | 14 | Moltres-EX | `92679c0c-6597-4dd8-b406-8c2d3fc16d29` | `87568` | https://www.tcgplayer.com/product/87568/pokemon-plasma-storm-moltres-ex-team-plasma |
| bw8 | 25 | Articuno-EX | `f3d5c187-f6e2-46be-89e6-34d5ce55f915` | `83656` | https://www.tcgplayer.com/product/83656/pokemon-plasma-storm-articuno-ex-team-plasma |
| bw8 | 48 | Zapdos-EX | `6a6a5a79-5727-4f3b-a9c8-fbde752e9cb6` | `90725` | https://www.tcgplayer.com/product/90725/pokemon-plasma-storm-zapdos-ex-team-plasma |
| bw8 | 108 | Lugia-EX | `31b7a41e-31ce-4fca-bbae-18969e9bf94e` | `86913` | https://www.tcgplayer.com/product/86913/pokemon-plasma-storm-lugia-ex-team-plasma |
| bw8 | 131 | Victini-EX | `061725ed-7d0d-4d10-9a78-53ffd8623636` | `90352` | https://www.tcgplayer.com/product/90352/pokemon-plasma-storm-victini-ex-131-full-art |
| bw8 | 132 | Articuno-EX | `8f116f50-7bbb-4068-8f72-ff6e1283707f` | `83657` | https://www.tcgplayer.com/product/83657/pokemon-plasma-storm-articuno-ex-team-plasma-132-full-art |
| bw8 | 133 | Cobalion-EX | `f08f447e-c63c-4100-ad82-019c7e9efbf7` | `84383` | https://www.tcgplayer.com/product/84383/pokemon-plasma-storm-cobalion-ex-133-full-art |
| bw8 | 134 | Lugia-EX | `cc260629-c185-4855-bf2b-25ed6fd8808b` | `86916` | https://www.tcgplayer.com/product/86916/pokemon-plasma-storm-lugia-ex-team-plasma-134-full-art |
| cel25 | 23 | Professor's Research (Professor Oak) | `4dbc91b7-4d5d-4c77-a3bc-3e722694a434` | `250318` | https://www.tcgplayer.com/product/250318/pokemon-celebrations-professors-research |
| cel25 | 24 | Professor's Research (Professor Oak) | `619bd407-bbc4-49be-906e-0593f4f78d10` | `250293` | https://www.tcgplayer.com/product/250293/pokemon-celebrations-professors-research-full-art |

## Recommended Next Package

Recommended next package: `TCGMAP-08B-FRESH-TCGCSV-TCGPLAYER-MAPPING-INSERTS` guarded rollback-only dry-run.

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

