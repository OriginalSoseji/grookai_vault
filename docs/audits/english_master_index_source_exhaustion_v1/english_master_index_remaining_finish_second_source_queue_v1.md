# English Master Index Remaining Finish Second Source Queue V1

Generated: 2026-06-08T18:49:12.687Z

This is a report-only control sheet. It does not authorize database writes, cleanup, quarantine, insertion, deletion, or canonical mutation.

## Safety

| check | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| mutation_authority | false |

## Summary

| metric | value |
| --- | --- |
| remaining_finish_second_source_needed | 5 |
| sets | 5 |
| current_source_count | 2 |
| conflicts_created | 0 |
| candidate_promotions | 0 |

## By Finish

| finish | rows |
| --- | --- |
| normal | 3 |
| holo | 1 |
| stamped | 1 |

## By Work Type

| work_type | rows |
| --- | --- |
| manual_independence_review | 5 |

## Top Set Queues

| priority | set | name | rows | finishes | next_action |
| --- | --- | --- | --- | --- | --- |
| 85 | sm8 | Lost Thunder | 1 | stamped:1 | Review found evidence for independence and exact finish fit; promote only through guarded staging if exact. |
| 70 | bw8 | Plasma Storm | 1 | holo:1 | Review found evidence for independence and exact finish fit; promote only through guarded staging if exact. |
| 55 | ex9 | Emerald | 1 | normal:1 | Review found evidence for independence and exact finish fit; promote only through guarded staging if exact. |
| 55 | sv03.5 | 151 | 1 | normal:1 | Review found evidence for independence and exact finish fit; promote only through guarded staging if exact. |
| 55 | swsh3.5 | Champion's Path | 1 | normal:1 | Review found evidence for independence and exact finish fit; promote only through guarded staging if exact. |

## Source Attempt Signals

Sources listed here are not automatically accepted. They only tell the next reviewer where prior attempts found evidence-like records, no exact match, or blocked access.

### Evidence Found During Attempts

| source | rows |
| --- | --- |
| reverseholo_set_checklist | 5 |
| cardtrader_blueprint_index | 4 |
| binderbuilder_set_variant | 2 |
| tcgcsv_tcgplayer_catalog | 2 |

### No Exact Match

| source | rows |
| --- | --- |
| cardtrader_blueprint_index | 5 |
| bulbapedia_card_page_release_info | 4 |
| doubleholo_set_checklist | 4 |
| elitefourum_alternate_checklist | 4 |
| tcdb_checklist | 3 |
| tcgcollector_card_variants | 3 |
| pokemoncard_io_price_breakdown | 2 |
| pricecharting_csv_product_stamp | 2 |
| tcgcsv_prize_pack_catalog | 2 |
| binderbuilder_set_variant | 1 |
| bulbapedia_build_battle_product | 1 |
| official_pokemon_checklist_pdf | 1 |
| official_pokemon_legacy_checklist | 1 |

### Blocked Or Unavailable

| source | rows |
| --- | --- |
| tcgplayer_pricedex_link | 5 |
| bulbapedia_build_battle_product | 4 |
| official_pokemon_legacy_checklist | 4 |
| pokescope_variant | 3 |
| official_pokemon_checklist_pdf | 2 |
| pokemoncard_io_price_breakdown | 2 |
| tcgcollector_card_variants | 2 |
| bulbapedia_card_page_release_info | 1 |
| doubleholo_set_checklist | 1 |

## First 100 Row Queue

| set | name | number | card | finish | work_type | current_sources | evidence_found_attempts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bw8 | Plasma Storm | 94 | Druddigon | holo | manual_independence_review | thepricedex_price_list | reverseholo_set_checklist, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index |
| ex9 | Emerald | 107 | Farfetch'd | normal | manual_independence_review | cardtrader_blueprint_index | reverseholo_set_checklist, binderbuilder_set_variant, cardtrader_blueprint_index, tcgcsv_tcgplayer_catalog |
| sm8 | Lost Thunder | 187 | Net Ball | stamped | manual_independence_review | thepricedex_price_list | reverseholo_set_checklist, binderbuilder_set_variant, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index, cardtrader_blueprint_index |
| sv03.5 | 151 | 146 | Moltres | normal | manual_independence_review | thepricedex_price_list | reverseholo_set_checklist, cardtrader_blueprint_index, tcgcsv_tcgplayer_catalog |
| swsh3.5 | Champion's Path | 62 | Professor's Research (Professor Magnolia) | normal | manual_independence_review | thepricedex_price_list | reverseholo_set_checklist |

## Guardrail

A row may leave this queue only after an independent exact card-level finish source is captured with URL and evidence label, then accepted through the guarded staging path. This report does not write to the database.
