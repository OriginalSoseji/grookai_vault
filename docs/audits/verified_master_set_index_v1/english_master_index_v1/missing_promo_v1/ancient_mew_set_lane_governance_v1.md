# Ancient Mew Set Lane Governance V1

Read-only governance report. No database writes, migrations, cleanup, inserts, deletes, merges, pricing writes, image writes, or global apply were performed.

## Safety

| check | value |
| --- | --- |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| real_apply_performed | false |

## Decision

Ancient Mew is source-supported, but it needs a governed set lane before insertion. Recommended lane: `misc` / Miscellaneous Cards & Products.

| field | value |
| --- | --- |
| set_code | misc |
| set_name | Miscellaneous Cards & Products |
| printed_set_abbrev | MISC |
| identity_domain_default | pokemon_eng_standard |
| lane_type | english_physical_miscellaneous_promotional_cards |
| source_aliases | {"bulbapedia":"Miscellaneous Promotional cards","pkmncards":"Miscellaneous","tcgplayer":"Miscellaneous Cards & Products","pricecharting":"Pokemon Promo"} |
| governance_decision | Create a dedicated miscellaneous/movie-promo set lane instead of forcing Ancient Mew into basep/Wizards Black Star Promos. |

## Recommended Card Fact

| field | value |
| --- | --- |
| set_code | misc |
| set_name | Miscellaneous Cards & Products |
| name | Ancient Mew |
| number | 1 |
| number_governance | catalog_assigned_number_not_physical_printed_number |
| rarity | Promo |
| finish_key | cosmos |
| variant_key | - |
| printed_identity_modifier | - |
| language | English |
| physical_only | true |
| recommended_gv_id | GV-PK-MISC-001 |
| recommended_printing_gv_id | GV-PK-MISC-001-COSMOS |
| source_count | 5 |
| master_index_status | master_verified_pending_set_lane_insert |

## Source Evidence

| source | kind | label | url |
| --- | --- | --- | --- |
| bulbapedia_ancient_mew_power_of_one | human_readable_checklist | Ancient Mew The Power of One promo release information | https://bulbapedia.bulbagarden.net/wiki/Ancient_Mew_%28The_Power_of_One_promo%29 |
| pkmncards_ancient_mew_miscellaneous | collector_reference | PkmnCards Ancient Mew Miscellaneous card page | https://pkmncards.com/card/ancient-mew-miscellaneous/ |
| pkmncards_miscellaneous_set | collector_reference | PkmnCards Miscellaneous set lane | https://pkmncards.com/set/miscellaneous/ |
| tcgplayer_ancient_mew_misc_products | marketplace_checklist | TCGplayer Ancient Mew Miscellaneous Cards and Products product page | https://www.tcgplayer.com/product/108589/pokemon-miscellaneous-cards-and-products-ancient-mew |
| pricecharting_ancient_mew_pokemon_promo | marketplace_checklist | PriceCharting Ancient Mew Pokemon Promo market page | https://www.pricecharting.com/game/pokemon-promo/ancient-mew |

## Live DB Read-Only Checks

| check | count |
| --- | --- |
| recommended_set_exists | 0 |
| existing_ancient_mew_parent_rows | 0 |
| exact_recommended_parent_exists | 0 |
| active_cosmos_finish_rows | 1 |
| similar_set_candidate_rows | 13 |

## Existing Similar Set Rows

| code | name | identity_domain_default |
| --- | --- | --- |
| basep | Wizards Black Star Promos | pokemon_eng_standard |
| bwp | BW Black Star Promos | pokemon_eng_standard |
| dpp | DP Black Star Promos | pokemon_eng_standard |
| hgssp | HGSS Black Star Promos | pokemon_eng_standard |
| hsp | HGSS Black Star Promos | pokemon_eng_standard |
| mep | MEP Black Star Promos | pokemon_eng_standard |
| np | Nintendo Black Star Promos | pokemon_eng_standard |
| P-A | Promos-A | tcg_pocket_excluded |
| smp | SM Black Star Promos | pokemon_eng_standard |
| svp | Scarlet & Violet Black Star Promos | pokemon_eng_standard |
| swshp | SWSH Black Star Promos | pokemon_eng_standard |
| wp | W Promotional | pokemon_eng_standard |
| xyp | XY Black Star Promos | pokemon_eng_standard |

## Existing Ancient Mew Rows

No existing Ancient Mew parent rows found.

## Adjacent Variant Boundaries

| candidate | status | reason |
| --- | --- | --- |
| ancient_mew_japanese_exclusive_print | future_variant_governance_required | Do not merge this into the English movie-promo row. It needs separate language/variant governance. |
| ancient_mew_i_nintedo_error | future_variant_governance_required | Collector evidence identifies Japanese Nintedo/corrected and Ancient Mew I/II distinctions. These are not the current English physical row. |

## Recommended Next Package

- Build a guarded dry-run package for the `misc` set lane plus one Ancient Mew parent and one cosmos child printing.
- Keep Japanese Exclusive Print, Nintedo error, corrected Japanese, and Ancient Mew I/II variants out of that package until separate variant governance is complete.
- Do not create external mappings, pricing writes, or image writes in the first insert package.

