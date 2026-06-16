# Image Truth MEP Cosmos Master Index Governance V1

Generated: 2026-06-14T16:57:25.291Z

Status: audit-only Master Index governance fixture and suppression projection. No DB writes. No image uploads. No migrations.

## Summary

| Field | Value |
| --- | --- |
| package_id | IMG-MASTER-01A-MEP-COSMOS-MASTER-INDEX-GOVERNANCE |
| fixture_rows | 8 |
| facts_supported_by_two_sources | 4 |
| suppression_rows | 4 |
| non_colliding_rollback_verified_rows | 4 |
| ready_for_master_index_probe | true |
| ready_for_real_db_apply | false |
| proof_hash | 332598a6964195eb3b9106ec5425f7841c7313d1e20a0021c14918da64841bf0 |

Real DB apply is not authorized by this report: This is a Master Index governance fixture/projection only. A separate fingerprinted DB real-apply gate is still required.

## Cosmos Evidence Added To Fixture

| set | number | card | finish | source | url |
| --- | --- | --- | --- | --- | --- |
| mep | 18 | Cottonee | cosmos | tcgcsv_tcgplayer_catalog_live | https://www.tcgplayer.com/product/664051/pokemon-me-mega-evolution-promo-cottonee-cosmos-holo |
| mep | 18 | Cottonee | cosmos | gamenerdz_product_page | https://www.gamenerdz.com/cottonee-cosmos-holo-18-me-mega-evolution-promo-holofoil |
| mep | 19 | Whimsicott | cosmos | tcgcsv_tcgplayer_catalog_live | https://www.tcgplayer.com/product/664054/pokemon-me-mega-evolution-promo-whimsicott-cosmos-holo |
| mep | 19 | Whimsicott | cosmos | full_grip_games_product_page | https://www.fullgripgames.com/catalog/pokemon_singles-pokemon_promos-mega_evolution_promos/whimsicott__mep019__mep_black_star_promos__cosmos_holo/639896 |
| mep | 20 | Sneasel | cosmos | tcgcsv_tcgplayer_catalog_live | https://www.tcgplayer.com/product/664055/pokemon-me-mega-evolution-promo-sneasel-cosmos-holo |
| mep | 20 | Sneasel | cosmos | tcgplayer_pro_catalog_page | https://jafcomics.tcgplayerpro.com/catalog/pokemon/me-mega-evolution-promo/sneasel-cosmos-holo/664055 |
| mep | 21 | Weavile | cosmos | tcgcsv_tcgplayer_catalog_live | https://www.tcgplayer.com/product/664063/pokemon-me-mega-evolution-promo-weavile-cosmos-holo |
| mep | 21 | Weavile | cosmos | noble_knight_product_page | https://www.nobleknight.com/P/2148382534/Weavile-Cosmos-Holo-HR-021-Holo |

## Stale Holo Suppression Projection

| set | number | card | suppress | replace with | status |
| --- | --- | --- | --- | --- | --- |
| mep | 18 | Cottonee | holo | cosmos | stale_holo_label_replaced_by_exact_cosmos_holo_evidence |
| mep | 19 | Whimsicott | holo | cosmos | stale_holo_label_replaced_by_exact_cosmos_holo_evidence |
| mep | 20 | Sneasel | holo | cosmos | stale_holo_label_replaced_by_exact_cosmos_holo_evidence |
| mep | 21 | Weavile | holo | cosmos | stale_holo_label_replaced_by_exact_cosmos_holo_evidence |

## Explicit Non-Actions

- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
