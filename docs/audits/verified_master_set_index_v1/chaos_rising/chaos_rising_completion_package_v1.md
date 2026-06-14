# Chaos Rising Completion Package V1

Audit only. This package does not write to Grookai, create migrations, cleanup, quarantine, or execute an apply path.

Generated: 2026-06-09T21:18:22.238Z

## Conclusion

| field | value |
| --- | --- |
| master_index_complete | true |
| grookai_complete | true |
| live_matches_master_index | true |
| ready_for_write_package | false |
| reason | Chaos Rising live Grookai rows match the Verified Master Index counts for this set. |

## Safety

| field | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| apply_paths_executed | false |
| mutation_authority | false |
| write_ready_now | 0 |

## Summary

| metric | value |
| --- | --- |
| set_key | me04 |
| set_name | Chaos Rising |
| master_index_cards | 122 |
| master_index_printings | 247 |
| master_index_printings_by_finish | {"normal":113,"reverse":76,"holo":58} |
| master_index_printing_sources | {"tcgdex":113,"thepricedex_price_list":198,"reverseholo_set_checklist":122,"tcgcollector_card_variants":134,"cardtrader_blueprint_index":45,"bulbapedia_build_battle_product":4,"bulbapedia_set_list":4} |
| grookai_audit_status | {"missing_from_grookai":247} |
| live_set_rows | 1 |
| live_card_print_rows | 122 |
| live_card_printing_rows | 247 |
| tcgdex_raw_import_rows | 123 |
| required_finish_keys_present | true |
| write_ready_now | 0 |

## Live Master Index Comparison

| metric | value |
| --- | --- |
| verified_by_index | 247 |
| missing_from_grookai | 0 |
| unsupported_by_current_index | 0 |
| expected_printings | 247 |
| live_printings | 247 |

## Master Index Printings By Finish

| finish | count |
| --- | --- |
| normal | 113 |
| reverse | 76 |
| holo | 58 |

## Master Index Source Counts

| source | count |
| --- | --- |
| thepricedex_price_list | 198 |
| tcgcollector_card_variants | 134 |
| reverseholo_set_checklist | 122 |
| tcgdex | 113 |
| cardtrader_blueprint_index | 45 |
| bulbapedia_build_battle_product | 4 |
| bulbapedia_set_list | 4 |

## Blockers Before Any Write

No blockers.

## Standard Ingestion Path

1. TCGdex set import for me04/me4
2. TCGdex card import for me04/me4 with detail payloads
3. TCGdex normalize dry-run scoped to imported raw rows
4. Strict preflight and operator approval
5. Standard ingestion apply through maintenance boundary
6. Post-apply Master Index comparison for me04 must reach 247/247 verified_by_index

## Sample Planned Printings

| number | name | finish | source_count | sources |
| --- | --- | --- | --- | --- |
| 001 | Weedle | normal | 2 | tcgdex, thepricedex_price_list |
| 1 | Weedle | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 002 | Kakuna | normal | 2 | tcgdex, thepricedex_price_list |
| 2 | Kakuna | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 3 | Beedrill ex | holo | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 003 | Beedrill ex | normal | 2 | cardtrader_blueprint_index, tcgdex |
| 004 | Carnivine | normal | 2 | tcgdex, thepricedex_price_list |
| 4 | Carnivine | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 005 | Chespin | normal | 2 | tcgdex, thepricedex_price_list |
| 5 | Chespin | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 006 | Quilladin | normal | 2 | tcgdex, thepricedex_price_list |
| 6 | Quilladin | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 7 | Chesnaught | holo | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 7 | Chesnaught | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 008 | Vulpix | normal | 2 | tcgdex, thepricedex_price_list |
| 8 | Vulpix | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 009 | Ninetales | normal | 2 | tcgdex, thepricedex_price_list |
| 9 | Ninetales | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 10 | Ho-Oh | holo | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 10 | Ho-Oh | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 011 | Fennekin | normal | 2 | tcgdex, thepricedex_price_list |
| 11 | Fennekin | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 012 | Braixen | normal | 2 | tcgdex, thepricedex_price_list |
| 12 | Braixen | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 13 | Delphox | holo | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 013 | Delphox | normal | 2 | bulbapedia_build_battle_product, bulbapedia_set_list, tcgdex |
| 13 | Delphox | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 014 | Litleo | normal | 2 | tcgdex, thepricedex_price_list |
| 14 | Litleo | reverse | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |
| 15 | Mega Pyroar ex | holo | 3 | reverseholo_set_checklist, tcgcollector_card_variants, thepricedex_price_list |

## Post-Apply Verification Requirements

- Grookai comparison for me04 has 247 verified_by_index rows.
- Grookai comparison for me04 has 0 missing_from_grookai rows.
- Grookai comparison for me04 has 0 unsupported_by_current_index rows.
- Grookai comparison for me04 has 0 name_mismatch_needs_review rows.
- card_prints for set_code me04 or me4 resolve to 122 parent rows.
- card_printings joined through those parent rows resolve to 247 child printing rows.
