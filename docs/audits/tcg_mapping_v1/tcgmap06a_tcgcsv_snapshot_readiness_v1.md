# TCGMAP-06A TCGCSV Snapshot Readiness V1

Audit-only local snapshot/readiness pass. This fetched or reused TCGCSV product JSON into a local audit cache and classified exact identity matches. No DB writes, migrations, pricing writes, image writes, or canonical mapping inserts were performed.

## Summary

- fingerprint: `8a0e4ab3ec98c1b984ed3e409a1f50ed888ddf8b5b805c427a865e238a6a25ac`
- generated_at: `2026-06-19T14:11:41.172Z`
- sets_attempted: 30
- groups_matched: 31
- products_loaded: 6418
- candidate_rows: 3382
- ready_rows: 1549
- blocked_rows: 1833

## Classification Buckets

| classification | rows | parents | sets |
| --- | --- | --- | --- |
| ready_from_fresh_tcgcsv_exact_identity | 1549 | 1549 | 18 |
| blocked_multi_products_for_parent | 885 | 395 | 12 |
| blocked_existing_tcgplayer_external_id_collision | 750 | 750 | 15 |
| blocked_batch_duplicate_tcgplayer_id | 198 | 198 | 2 |

## Set Outcomes

| set | name | missing parents | groups | products | candidates | status |
| --- | --- | --- | --- | --- | --- | --- |
| swshp | SWSH Black Star Promos | 324 | SWSH: Sword & Shield Promo Cards | 343 | 313 | candidate_rows_found |
| sv02 | Paldea Evolved | 302 | SV02: Paldea Evolved | 315 | 275 | candidate_rows_found |
| svp | Scarlet & Violet Black Star Promos | 272 | SV: Scarlet & Violet Promo Cards | 283 | 270 | candidate_rows_found |
| sv4pt5 | Paldean Fates | 248 | SV: Paldean Fates | 295 | 244 | candidate_rows_found |
| xyp | XY Black Star Promos | 231 | XY Promos | 269 | 244 | candidate_rows_found |
| sv8pt5 | Prismatic Evolutions | 194 | SV: Prismatic Evolutions | 399 | 340 | candidate_rows_found |
| sv10.5b | Black Bolt | 180 | SV: Black Bolt | 358 | 324 | candidate_rows_found |
| smp | SM Black Star Promos | 172 | SM Promos | 333 | 132 | candidate_rows_found |
| me03 | Perfect Order | 126 | ME03: Perfect Order | 154 | 124 | candidate_rows_found |
| swsh45sv | Shining Fates Shiny Vault | 122 | Shining Fates: Shiny Vault | 122 | 122 | candidate_rows_found |
| sv6pt5 | Shrouded Fable | 112 | SV: Shrouded Fable | 137 | 99 | candidate_rows_found |
| sv06.5 | Shrouded Fable | 100 | SV: Shrouded Fable | 137 | 99 | candidate_rows_found |
| sm115 | Hidden Fates | 95 | Hidden Fates; Hidden Fates: Shiny Vault | 190 | 95 | candidate_rows_found |
| swsh10.5 | Pokémon GO | 88 | Pokemon GO | 146 | 91 | candidate_rows_found |
| mep | MEP Black Star Promos | 75 | ME: Mega Evolution Promo | 95 | 76 | candidate_rows_found |
| basep | Wizards Black Star Promos | 73 | WoTC Promo | 71 | 56 | candidate_rows_found |
| swsh12pt5gg | Crown Zenith Galarian Gallery | 70 | SWSH: Crown Zenith: Galarian Gallery | 70 | 70 | candidate_rows_found |
| bwp | BW Black Star Promos | 63 | Black and White Promos | 148 | 68 | candidate_rows_found |
| swsh10 | Astral Radiance | 56 | SWSH10: Astral Radiance | 255 | 33 | candidate_rows_found |
| swsh9 | Brilliant Stars | 54 | SWSH09: Brilliant Stars | 234 | 34 | candidate_rows_found |
| ex13 | Holon Phantoms | 52 | Holon Phantoms | 115 | 45 | candidate_rows_found |
| np | Nintendo Black Star Promos | 52 | Nintendo Promos | 95 | 58 | candidate_rows_found |
| swsh11 | Lost Origin | 45 | SWSH11: Lost Origin | 274 | 30 | candidate_rows_found |
| g1 | Generations | 42 | Generations | 119 | 9 | candidate_rows_found |
| sv05 | Temporal Forces | 42 | SV05: Temporal Forces | 260 | 31 | candidate_rows_found |
| sv10 | Destined Rivals | 39 | SV10: Destined Rivals | 281 | 24 | candidate_rows_found |
| swsh7 | Evolving Skies | 37 | SWSH07: Evolving Skies | 288 | 30 | candidate_rows_found |
| swsh12 | Silver Tempest | 37 | SWSH12: Silver Tempest | 253 | 24 | candidate_rows_found |
| swsh8 | Fusion Strike | 36 | SWSH08: Fusion Strike | 329 | 22 | candidate_rows_found |
| mfb | My First Battle | 34 | My First Battle | 50 | 0 | snapshot_loaded_no_exact_candidates |

## Ready By Set

| set | name | ready |
| --- | --- | --- |
| sv02 | Paldea Evolved | 275 |
| swshp | SWSH Black Star Promos | 259 |
| xyp | XY Black Star Promos | 190 |
| svp | Scarlet & Violet Black Star Promos | 140 |
| me03 | Perfect Order | 124 |
| swsh45sv | Shining Fates Shiny Vault | 122 |
| sm115 | Hidden Fates | 95 |
| sv10.5b | Black Bolt | 92 |
| swsh12pt5gg | Crown Zenith Galarian Gallery | 70 |
| basep | Wizards Black Star Promos | 50 |
| ex13 | Holon Phantoms | 45 |
| mep | MEP Black Star Promos | 38 |
| np | Nintendo Black Star Promos | 32 |
| bwp | BW Black Star Promos | 10 |
| sv05 | Temporal Forces | 4 |
| smp | SM Black Star Promos | 1 |
| swsh7 | Evolving Skies | 1 |
| swsh9 | Brilliant Stars | 1 |

## Ready Sample

| set | number | name | card_print_id | tcgplayer | source |
| --- | --- | --- | --- | --- | --- |
| basep | 2 | Electabuzz | `71d197da-c12f-4f01-899f-1449b53dcf6c` | `85107` | https://www.tcgplayer.com/product/85107/pokemon-wotc-promo-electabuzz-movie-promo |
| basep | 3 | Mewtwo | `6abd5cee-cbe0-492c-9202-6ae41ba1bbcd` | `87414` | https://www.tcgplayer.com/product/87414/pokemon-wotc-promo-mewtwo-movie-promo |
| basep | 4 | Pikachu | `a10b92ea-ea18-4d3c-b046-8908fab97c4a` | `88066` | https://www.tcgplayer.com/product/88066/pokemon-wotc-promo-pikachu-movie-promo |
| basep | 5 | Dragonite | `eb57fdeb-8bce-4ba1-b981-9da7b88d33b5` | `84909` | https://www.tcgplayer.com/product/84909/pokemon-wotc-promo-dragonite-movie-promo |
| basep | 6 | Arcanine | `324dea51-3a4c-4a55-9d3a-0f9a732827ab` | `83578` | https://www.tcgplayer.com/product/83578/pokemon-wotc-promo-arcanine |
| basep | 7 | Jigglypuff | `a26fb216-7f32-4473-92fb-addd1b086985` | `86309` | https://www.tcgplayer.com/product/86309/pokemon-wotc-promo-jigglypuff |
| basep | 9 | Mew | `1fba378c-1c39-4486-bb21-8c08b145f101` | `87395` | https://www.tcgplayer.com/product/87395/pokemon-wotc-promo-mew-9 |
| basep | 10 | Meowth | `d480d646-d836-4469-81b1-abe4165757b6` | `87309` | https://www.tcgplayer.com/product/87309/pokemon-wotc-promo-meowth |
| basep | 12 | Mewtwo | `fe030266-a1e4-498b-819b-0988a658dafc` | `87416` | https://www.tcgplayer.com/product/87416/pokemon-wotc-promo-mewtwo-12 |
| basep | 13 | Venusaur | `079ae0a0-eba5-4620-9e72-801bd0a1714e` | `90311` | https://www.tcgplayer.com/product/90311/pokemon-wotc-promo-venusaur |
| basep | 14 | Mewtwo | `e325fcac-8041-4309-b237-8da4f397c86d` | `87417` | https://www.tcgplayer.com/product/87417/pokemon-wotc-promo-mewtwo-14 |
| basep | 15 | Cool Porygon | `5af74dbf-2b3d-4d92-b17a-a5cc3fecf13a` | `84422` | https://www.tcgplayer.com/product/84422/pokemon-wotc-promo-cool-porygon |
| basep | 16 | Computer Error | `f7ccf97a-08aa-447e-a324-a0eb59d72108` | `84414` | https://www.tcgplayer.com/product/84414/pokemon-wotc-promo-computer-error-rockets-secret-machine |
| basep | 17 | Dark Persian | `bae09811-d56e-41db-b093-94b4dc70b561` | `84638` | https://www.tcgplayer.com/product/84638/pokemon-wotc-promo-dark-persian |
| basep | 18 | Team Rocket's Meowth | `c9fc79b3-3130-4910-b4b7-1aad5d31d874` | `89851` | https://www.tcgplayer.com/product/89851/pokemon-wotc-promo-team-rockets-meowth |
| basep | 19 | Sabrina's Abra | `7f1ffa67-d4b1-42e7-b49a-bb87dbb1ee05` | `88862` | https://www.tcgplayer.com/product/88862/pokemon-wotc-promo-sabrinas-abra |
| basep | 20 | Psyduck | `664398de-c763-43c2-b5fb-e4ad50cfc5a4` | `88429` | https://www.tcgplayer.com/product/88429/pokemon-wotc-promo-psyduck |
| basep | 21 | Moltres | `429e14e5-13dc-4114-aeb7-4f6498c83f0c` | `87557` | https://www.tcgplayer.com/product/87557/pokemon-wotc-promo-moltres |
| basep | 22 | Articuno | `28116bdf-cec1-48d7-a977-baed0169e2c6` | `83647` | https://www.tcgplayer.com/product/83647/pokemon-wotc-promo-articuno-22 |
| basep | 23 | Zapdos | `8355d761-b16a-4a07-9a2d-d39dcb4bf809` | `90713` | https://www.tcgplayer.com/product/90713/pokemon-wotc-promo-zapdos |
| basep | 24 | _____'s Pikachu | `35d6d659-856e-4c70-9404-2c23137b1062` | `90784` | https://www.tcgplayer.com/product/90784/pokemon-wotc-promo-______s-pikachu |
| basep | 25 | Flying Pikachu | `cfacfd82-37d6-4ff1-bcd3-6a5fd84aaae4` | `85534` | https://www.tcgplayer.com/product/85534/pokemon-wotc-promo-flying-pikachu |
| basep | 26 | Pikachu | `d6c131a2-6370-46ad-a8e0-3eb847beb200` | `88068` | https://www.tcgplayer.com/product/88068/pokemon-wotc-promo-pikachu-snap-promo |
| basep | 27 | Pikachu | `82ad60c1-5e59-4947-8e16-327849baf274` | `88069` | https://www.tcgplayer.com/product/88069/pokemon-wotc-promo-pikachu-27 |
| basep | 28 | Surfing Pikachu | `3a3efe69-b028-4f14-a4c8-891479a980bb` | `89643` | https://www.tcgplayer.com/product/89643/pokemon-wotc-promo-surfing-pikachu |
| basep | 29 | Marill | `2fd986e9-20f3-485b-8ca7-07dabba06590` | `87211` | https://www.tcgplayer.com/product/87211/pokemon-wotc-promo-marill |
| basep | 30 | Togepi | `0aecccae-d769-4ea3-a0cb-c7f16b506f8d` | `89928` | https://www.tcgplayer.com/product/89928/pokemon-wotc-promo-togepi |
| basep | 31 | Cleffa | `1424d8ba-1620-40bd-8022-dceb48639468` | `84363` | https://www.tcgplayer.com/product/84363/pokemon-wotc-promo-cleffa |
| basep | 32 | Smeargle | `3a9863b6-48cb-4ebd-b4e6-caab64170c31` | `89353` | https://www.tcgplayer.com/product/89353/pokemon-wotc-promo-smeargle |
| basep | 33 | Scizor | `f92b127d-17a6-4c93-b638-c29434a6c031` | `88960` | https://www.tcgplayer.com/product/88960/pokemon-wotc-promo-scizor |

## Recommended Next Package

Recommended next package: `TCGMAP-06B-FRESH-TCGCSV-TCGPLAYER-MAPPING-INSERTS` guarded rollback-only dry-run.

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

