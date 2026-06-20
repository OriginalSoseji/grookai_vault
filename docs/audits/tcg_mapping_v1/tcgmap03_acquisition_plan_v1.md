# TCGMAP-03 Acquisition Plan V1

Read-only plan for reducing remaining no-TCGplayer mapping rows after TCGMAP-01A. No DB writes, no migrations, no cleanup.

## Summary

- fingerprint: `a6bd64ac39a4301ab4464c781e03ba4351e46369c0c73aa98f2cb678a5289e1d`
- generated_at: `2026-06-19T06:48:25.859Z`
- missing_tcgplayer_parent_rows: 4819
- justtcg_only_parent_rows: 2388
- tcgdex_only_parent_rows: 1594
- no_pricing_mapping_parent_rows: 837
- ready_from_justtcg_preserved_tcgplayer_id: 0

## JustTCG Preserved TCGplayer ID Classification

| classification | rows | parents | sets |
| --- | --- | --- | --- |
| justtcg_without_preserved_tcgplayer_id | 2394 | 2388 | 71 |

## Recommended Package

No insert package is recommended from this report.

## Ready Sample

_None._

## Remaining Gaps By Set

| set | name | missing parents | children | lane |
| --- | --- | --- | --- | --- |
| swshp | SWSH Black Star Promos | 324 | 326 | justtcg_remaining |
| sv02 | Paldea Evolved | 302 | 467 | justtcg_remaining |
| svp | Scarlet & Violet Black Star Promos | 272 | 421 | justtcg_remaining |
| sv4pt5 | Paldean Fates | 248 | 326 | justtcg_remaining |
| xyp | XY Black Star Promos | 231 | 235 | justtcg_remaining |
| sv8pt5 | Prismatic Evolutions | 194 | 456 | justtcg_remaining |
| sv10.5b | Black Bolt | 180 | 253 | justtcg_remaining |
| smp | SM Black Star Promos | 172 | 78 | justtcg_remaining |
| me03 | Perfect Order | 126 | 203 | justtcg_remaining |
| swsh45sv | Shining Fates Shiny Vault | 122 | 122 | tcgdex_only_remaining |
| sv6pt5 | Shrouded Fable | 112 | 154 | justtcg_remaining |
| sv06.5 | Shrouded Fable | 100 | 155 | tcgdex_only_remaining |
| sm115 | Hidden Fates | 95 | 96 | tcgdex_only_remaining |
| swsh10.5 | Pokémon GO | 88 | 146 | tcgdex_only_remaining |
| mep | MEP Black Star Promos | 75 | 60 | tcgdex_only_remaining |
| basep | Wizards Black Star Promos | 73 | 75 | tcgdex_only_remaining |
| swsh12pt5gg | Crown Zenith Galarian Gallery | 70 | 70 | tcgdex_only_remaining |
| bwp | BW Black Star Promos | 63 | 42 | tcgdex_only_remaining |
| swsh10 | Astral Radiance | 56 | 0 | justtcg_remaining |
| swsh9 | Brilliant Stars | 54 | 3 | no_mapping_remaining |
| ex13 | Holon Phantoms | 52 | 101 | justtcg_remaining |
| np | Nintendo Black Star Promos | 52 | 48 | tcgdex_only_remaining |
| swsh11 | Lost Origin | 45 | 0 | no_mapping_remaining |
| g1 | Generations | 42 | 42 | tcgdex_only_remaining |
| sv05 | Temporal Forces | 42 | 10 | justtcg_remaining |
| sv10 | Destined Rivals | 39 | 0 | no_mapping_remaining |
| swsh7 | Evolving Skies | 37 | 2 | no_mapping_remaining |
| swsh12 | Silver Tempest | 37 | 0 | no_mapping_remaining |
| swsh8 | Fusion Strike | 36 | 0 | justtcg_remaining |
| mfb | My First Battle | 34 | 34 | tcgdex_only_remaining |

## Guardrails

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- pricing_writes_performed: false
- image_writes_performed: false

