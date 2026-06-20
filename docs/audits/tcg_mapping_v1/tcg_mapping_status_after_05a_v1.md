# TCG Mapping Status After TCGMAP-05A V1

Checkpoint report after applying TCGMAP-01A, TCGMAP-04A, and TCGMAP-05A. This is audit-only report generation; no mappings, pricing rows, card identity rows, images, migrations, or cleanup were changed by this status report.

## Current Coverage

- active_tcgplayer_parent_mappings: 19614
- missing_tcgplayer_parent_mappings: 4819
- child_printings_under_tcgplayer_parent: 34324
- child_printings_without_tcgplayer_parent: 3322

## Completed Mapping Packages

| package | rows | fingerprint |
| --- | --- | --- |
| TCGMAP-01A-TCGDEX-TCGPLAYER-MAPPING-INSERTS | 3066 | `30cfdb7d896b8c2eb969caf326468f37b7bd5e1badd35d85d7b5f9f3b855b7a6` |
| TCGMAP-04A-STAGING-TCGPLAYER-MAPPING-INSERTS | 728 | `cad93b765851870f1eaedb2f75c1c55a12ab7c5a0be8ff4a84d72e24520d7119` |
| TCGMAP-05A-CACHED-TCGCSV-TCGPLAYER-MAPPING-INSERTS | 153 | `88874689034c1e4807322b6d5d64347a01964a80b89a22f40894f566bcb6e0b5` |

## Exhausted Local Lanes

| lane | ready rows | blocked rows | reason |
| --- | --- | --- | --- |
| justtcg_preserved_tcgplayer_id | 0 | 2394 | JustTCG rows do not preserve TCGplayer product IDs. |
| resolved_external_discovery_candidates | 0 | 24 | Remaining staging candidates are collisions or multi-row ambiguous parents. |
| cached_tcgcsv_exact_identity | 0 | 266 | Remaining cached catalog matches collide with existing product IDs or duplicate product ownership. |

## Remaining Gaps By Lane

| lane | parents | children | sets |
| --- | --- | --- | --- |
| justtcg_only | 1349 | 1433 | 70 |
| tcgdex_only_no_tcgplayer_product | 1120 | 1558 | 110 |
| no_pricing_mapping | 801 | 331 | 117 |

## Top Remaining Sets

| set | name | lane | parents | children |
| --- | --- | --- | --- | --- |
| sv4pt5 | Paldean Fates | justtcg_only | 247 | 325 |
| sv8pt5 | Prismatic Evolutions | justtcg_only | 190 | 444 |
| sv6pt5 | Shrouded Fable | justtcg_only | 112 | 154 |
| smp | SM Black Star Promos | justtcg_only | 100 | 6 |
| sv06.5 | Shrouded Fable | tcgdex_only_no_tcgplayer_product | 99 | 154 |
| sv10.5b | Black Bolt | justtcg_only | 88 | 164 |
| swsh10.5 | Pokémon GO | tcgdex_only_no_tcgplayer_product | 88 | 146 |
| svp | Scarlet & Violet Black Star Promos | no_pricing_mapping | 53 | 53 |
| smp | SM Black Star Promos | tcgdex_only_no_tcgplayer_product | 49 | 49 |
| svp | Scarlet & Violet Black Star Promos | justtcg_only | 44 | 66 |
| svp | Scarlet & Violet Black Star Promos | tcgdex_only_no_tcgplayer_product | 35 | 68 |
| g1 | Generations | tcgdex_only_no_tcgplayer_product | 34 | 35 |
| mfb | My First Battle | tcgdex_only_no_tcgplayer_product | 34 | 34 |
| swsh10tg | Astral Radiance Trainer Gallery | tcgdex_only_no_tcgplayer_product | 30 | 30 |
| swsh11tg | Lost Origin Trainer Gallery | tcgdex_only_no_tcgplayer_product | 30 | 30 |
| swsh12tg | Silver Tempest Trainer Gallery | tcgdex_only_no_tcgplayer_product | 30 | 30 |
| swsh9tg | Brilliant Stars Trainer Gallery | tcgdex_only_no_tcgplayer_product | 30 | 30 |
| sv06 | Twilight Masquerade | justtcg_only | 29 | 7 |
| swsh10 | Astral Radiance | justtcg_only | 29 | 0 |
| swsh9 | Brilliant Stars | no_pricing_mapping | 29 | 0 |
| bwp | BW Black Star Promos | justtcg_only | 28 | 0 |
| me01 | Mega Evolution | justtcg_only | 28 | 0 |
| swsh7 | Evolving Skies | no_pricing_mapping | 28 | 0 |
| exu | Unseen Forces Unown Collection | justtcg_only | 27 | 27 |
| swsh10 | Astral Radiance | no_pricing_mapping | 27 | 0 |
| bw11 | Legendary Treasures | tcgdex_only_no_tcgplayer_product | 26 | 67 |
| swshp | SWSH Black Star Promos | tcgdex_only_no_tcgplayer_product | 26 | 26 |
| swshp | SWSH Black Star Promos | no_pricing_mapping | 26 | 26 |
| 2021swsh | Macdonald's Collection 2021 | tcgdex_only_no_tcgplayer_product | 25 | 50 |
| hsp | HGSS Black Star Promos | tcgdex_only_no_tcgplayer_product | 25 | 27 |
| mcd21 | McDonald's Collection 2021 | no_pricing_mapping | 25 | 25 |
| sv05 | Temporal Forces | justtcg_only | 25 | 0 |
| xyp | XY Black Star Promos | tcgdex_only_no_tcgplayer_product | 25 | 29 |
| sv02 | Paldea Evolved | justtcg_only | 24 | 32 |
| sv04 | Paradox Rift | justtcg_only | 24 | 0 |
| swsh11 | Lost Origin | no_pricing_mapping | 24 | 0 |
| swsh6 | Chilling Reign | no_pricing_mapping | 24 | 0 |
| swsh9 | Brilliant Stars | justtcg_only | 24 | 1 |
| smp | SM Black Star Promos | no_pricing_mapping | 22 | 22 |
| sv07 | Stellar Crown | justtcg_only | 22 | 10 |

## Recommended Next Step

No additional real-apply package is recommended from current local preserved sources. The next productive step is source acquisition: load a current TCGplayer/TCGCSV product catalog into `ingest.tcgplayer_products_stage` or another preserved source fixture, then run a new exact-match readiness pass.

## Guardrails

- db_writes_performed: false
- migrations_created: false
- pricing_writes_performed: false
- image_writes_performed: false
- cleanup_performed: false

