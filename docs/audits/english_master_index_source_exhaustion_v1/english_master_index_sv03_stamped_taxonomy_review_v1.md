# English Master Index SV03 Stamped Taxonomy Review V1

Generated: 2026-06-12T13:03:35.277Z

Audit-only report. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Safety

| check | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| durable_db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| write_ready_now | 0 |

## Summary

| metric | value |
| --- | --- |
| target_set | sv03 / Obsidian Flames |
| target_finish | stamped |
| target_rows | 18 |
| promotion_safe_now | 0 |
| write_ready_now | 0 |
| rows_with_alternate_active_finish_observation | 2 |

## By Classification

| classification | rows |
| --- | --- |
| blocked_stamped_child_finish_taxonomy | 18 |

## Rows

| number | card | current_finish | classification | no_exact_sources | alternate_active_finish_observations |
| --- | --- | --- | --- | --- | --- |
| 22 | Toedscruel ex | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 40 | Larvesta | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 41 | Volcarona | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 42 | Eiscue ex | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 66 | Tyranitar ex | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 92 | Lunatone | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 95 | Claydol | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 125 | Charizard ex | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 131 | Houndour | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 133 | Houndoom | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 136 | Darkrai | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp | cosmos:tcgcollector_card_variants |
| 139 | Salandit | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 140 | Salazzle | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 141 | Scizor | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp | cosmos:tcgcollector_card_variants |
| 164 | Pidgeot ex | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 188 | Geeta | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 189 | Letter of Encouragement | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |
| 196 | Town Store | stamped | blocked_stamped_child_finish_taxonomy | cardtrader_blueprint_index, doubleholo_set_checklist, pokemoncard_io_price_breakdown, pricecharting_csv_product_stamp |  |

## Rule

Remaining Obsidian Flames stamped rows must not be promoted as child finish_key=stamped. Stamped is an identity/variant attribute that needs active finish routing before any DB reconciliation.

## Required Closure Shape

- Exact stamped identity source.
- Exact active finish source.
- Guarded staging conversion to parent identity plus active child finish.
- No child `finish_key=stamped` promotion.
