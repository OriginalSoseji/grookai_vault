# TCGMAP-06 Source Acquisition Plan V1

Read-only plan for the next TCGplayer mapping phase after TCGMAP-05A. This report does not stage products, insert mappings, write prices, write images, create migrations, or mutate card identity.

## Summary

- fingerprint: `b60634b6c1d94524da0679e22c3a81014df48049b9b2de2451e04295d305c613`
- generated_at: `2026-06-19T14:07:21.418Z`
- current_tcgplayer_parent_mappings: 18065
- missing_tcgplayer_parent_mappings: 4819
- child_printings_without_tcgplayer_parent: 5251
- stage_table_rows: 0
- stage_table_latest_batch: none

## Current Source State

| lane | ready rows | blocked rows | reason |
| --- | --- | --- | --- |
| justtcg_preserved_tcgplayer_id | 0 | 2394 | JustTCG rows do not preserve TCGplayer product IDs. |
| resolved_external_discovery_candidates | 0 | 24 | Remaining staging candidates are collisions or multi-row ambiguous parents. |
| cached_tcgcsv_exact_identity | 0 | 266 | Remaining cached catalog matches collide with existing product IDs or duplicate product ownership. |

## Remaining Work By Lane

| lane | parents | children | sets |
| --- | --- | --- | --- |
| justtcg_only | 2388 | 2842 | 71 |
| tcgdex_only_no_tcgplayer_product | 1594 | 2055 | 113 |
| no_pricing_mapping | 837 | 354 | 117 |

## Priority Sets For Fresh Source Acquisition

| set | name | lane | parents | children | priority |
| --- | --- | --- | --- | --- | --- |
| sv02 | Paldea Evolved | justtcg_only | 482 | 889 | first |
| sv8pt5 | Prismatic Evolutions | justtcg_only | 458 | 1488 | first |
| sv4pt5 | Paldean Fates | justtcg_only | 328 | 487 | first |
| svp | Scarlet & Violet Black Star Promos | justtcg_only | 267 | 575 | first |
| sv10.5b | Black Bolt | justtcg_only | 261 | 417 | first |
| swshp | SWSH Black Star Promos | justtcg_only | 237 | 243 | first |
| me03 | Perfect Order | justtcg_only | 203 | 361 | first |
| sv6pt5 | Shrouded Fable | justtcg_only | 167 | 264 | first |
| xyp | XY Black Star Promos | justtcg_only | 162 | 162 | first |
| sv06.5 | Shrouded Fable | tcgdex_only_no_tcgplayer_product | 154 | 264 | second |
| swsh10.5 | Pokémon GO | tcgdex_only_no_tcgplayer_product | 146 | 264 | second |
| swsh45sv | Shining Fates Shiny Vault | tcgdex_only_no_tcgplayer_product | 122 | 122 | second |
| svp | Scarlet & Violet Black Star Promos | tcgdex_only_no_tcgplayer_product | 103 | 251 | second |
| smp | SM Black Star Promos | justtcg_only | 103 | 12 | first |
| ex13 | Holon Phantoms | justtcg_only | 102 | 207 | first |
| sm115 | Hidden Fates | tcgdex_only_no_tcgplayer_product | 96 | 98 | second |
| swsh12pt5gg | Crown Zenith Galarian Gallery | tcgdex_only_no_tcgplayer_product | 70 | 70 | second |
| bw11 | Legendary Treasures | tcgdex_only_no_tcgplayer_product | 67 | 189 | second |
| xyp | XY Black Star Promos | tcgdex_only_no_tcgplayer_product | 57 | 69 | second |
| basep | Wizards Black Star Promos | tcgdex_only_no_tcgplayer_product | 55 | 59 | second |
| svp | Scarlet & Violet Black Star Promos | no_pricing_mapping | 55 | 57 | third |
| mep | MEP Black Star Promos | tcgdex_only_no_tcgplayer_product | 54 | 58 | second |
| sve | Scarlet & Violet Energies | justtcg_only | 52 | 148 | first |
| 2021swsh | Macdonald's Collection 2021 | tcgdex_only_no_tcgplayer_product | 50 | 100 | second |
| smp | SM Black Star Promos | tcgdex_only_no_tcgplayer_product | 50 | 50 | second |
| swshp | SWSH Black Star Promos | tcgdex_only_no_tcgplayer_product | 49 | 49 | second |
| np | Nintendo Black Star Promos | tcgdex_only_no_tcgplayer_product | 47 | 61 | second |
| swshp | SWSH Black Star Promos | no_pricing_mapping | 42 | 42 | third |
| bwp | BW Black Star Promos | tcgdex_only_no_tcgplayer_product | 37 | 57 | second |
| g1 | Generations | tcgdex_only_no_tcgplayer_product | 35 | 37 | second |

## Required Product Snapshot Shape

The next useful input is a current product catalog snapshot with these fields preserved per product:

- `tcgplayer_id` / product ID
- product URL or stable product identifier
- product line/category
- set name or exact set slug/group name
- card number, including suffixes and prefixes
- product/card name
- rarity when available
- variant/printing title text when available
- language
- raw payload

## Recommended Next Package

Recommended next package: `TCGMAP-06A-TCGPLAYER-PRODUCT-SNAPSHOT-STAGE-DRY-RUN`.

It should be staging/preservation only, not canonical mapping insertion. The package should:

1. Load a fresh TCGplayer/TCGCSV product snapshot into a preserved local fixture or `ingest.tcgplayer_products_stage` with a unique batch ID.
2. Record product count, batch fingerprint, source URL/API metadata, and retrieval time.
3. Run a new exact set+number+name matcher against the 4,819 missing parent rows.
4. Produce a guarded readiness report before any `external_mappings` insert package exists.

## Guardrails

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- pricing_writes_performed: false
- image_writes_performed: false
- card_identity_writes_performed: false
- child_printing_writes_performed: false
- canonical_mapping_writes_performed: false

## Stop Rules For The Next Package

- Stop if product rows lack stable product IDs.
- Stop if product rows lack enough set/card identity to match exact set + number + name.
- Stop if one product ID matches multiple candidate parents.
- Stop if one parent matches multiple unrelated product IDs.
- Stop if product title suggests a different stamp, variant, language, or set than the candidate parent.
- Stop before any canonical `external_mappings` insert until a dry-run proof exists.

