# MEE-04B Multi-Source Query Plan V1

Generated: 2026-06-25T17:12:15.791Z

## Boundary

- Local query plan only.
- No provider calls.
- No web scraping.
- No database writes.
- No pricing rollups.
- No migration apply.
- Search URLs are templates for later approved acquisition, not fetched evidence.

## Summary

- targets: 100
- sources_per_target: 10
- planned_queries: 1000
- json: docs/audits/market_evidence_engine_v1/mee_04b_multi_source_query_plan_2026-06-25T17-12-15-791Z.json

## Sources

- ebay_active: active_listing, market_evidence, approved_api, direct_publish=false
- ebay_sold_candidate: sold_comp_candidate, market_evidence, approved_path_required, direct_publish=false
- pricecharting_reference: reference_price, reference, licensed_export_optional, direct_publish=false
- pokemontcg_io_reference: reference_price, reference, free_api_reference, direct_publish=false
- ebay_user_export: user_uploaded_export, market_evidence, operator_uploaded_export, direct_publish=false
- tcgplayer_reference_candidate: marketplace_product_candidate, reference, approved_path_required, direct_publish=false
- tcgcsv_reference: reference_price, reference, public_snapshot_api, direct_publish=false
- tcgplayer_user_export: user_uploaded_export, reference, operator_uploaded_export, direct_publish=false
- justtcg_reference: reference_price, reference, existing_reference_lane, direct_publish=false
- manual_review_candidate: manual_review_candidate, review, operator_curated, direct_publish=false

## Top Planned Targets

| # | Score | Card | ID | Sources |
| ---: | ---: | --- | --- | --- |
| 1 | 110 | Alakazam (base1 #1) | GV-PK-BS-1 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 2 | 110 | Mewtwo (base1 #10) | GV-PK-BS-10 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 3 | 110 | Nidoking (base1 #11) | GV-PK-BS-11 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 4 | 110 | Ninetales (base1 #12) | GV-PK-BS-12 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 5 | 110 | Poliwrath (base1 #13) | GV-PK-BS-13 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 6 | 110 | Venusaur (base1 #15) | GV-PK-BS-15 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 7 | 110 | Zapdos (base1 #16) | GV-PK-BS-16 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 8 | 110 | Beedrill (base1 #17) | GV-PK-BS-17 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 9 | 110 | Dragonair (base1 #18) | GV-PK-BS-18 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 10 | 110 | Dugtrio (base1 #19) | GV-PK-BS-19 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 11 | 110 | Blastoise (base1 #2) | GV-PK-BS-2 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 12 | 110 | Electabuzz (base1 #20) | GV-PK-BS-20 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 13 | 110 | Electrode (base1 #21) | GV-PK-BS-21 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 14 | 110 | Pidgeotto (base1 #22) | GV-PK-BS-22 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 15 | 110 | Chansey (base1 #3) | GV-PK-BS-3 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 16 | 110 | Clefairy (base1 #5) | GV-PK-BS-5 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 17 | 110 | Gyarados (base1 #6) | GV-PK-BS-6 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 18 | 110 | Clefairy Doll (base1 #70) | GV-PK-BS-70 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 19 | 110 | Computer Search (base1 #71) | GV-PK-BS-71 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 20 | 110 | Devolution Spray (base1 #72) | GV-PK-BS-72 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 21 | 110 | Item Finder (base1 #74) | GV-PK-BS-74 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 22 | 110 | Lass (base1 #75) | GV-PK-BS-75 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 23 | 110 | Pokémon Breeder (base1 #76) | GV-PK-BS-76 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 24 | 110 | Pokémon Trader (base1 #77) | GV-PK-BS-77 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 25 | 110 | Scoop Up (base1 #78) | GV-PK-BS-78 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 26 | 110 | Super Energy Removal (base1 #79) | GV-PK-BS-79 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 27 | 110 | Magneton (base1 #9) | GV-PK-BS-9 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 28 | 110 | Clefable (base2 #1) | GV-PK-JU-1 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 29 | 110 | Scyther (base2 #10) | GV-PK-JU-10 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 30 | 110 | Snorlax (base2 #11) | GV-PK-JU-11 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 31 | 110 | Vaporeon (base2 #12) | GV-PK-JU-12 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 32 | 110 | Venomoth (base2 #13) | GV-PK-JU-13 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 33 | 110 | Victreebel (base2 #14) | GV-PK-JU-14 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 34 | 110 | Vileplume (base2 #15) | GV-PK-JU-15 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 35 | 110 | Wigglytuff (base2 #16) | GV-PK-JU-16 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 36 | 110 | Clefable (base2 #17) | GV-PK-JU-17 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 37 | 110 | Electrode (base2 #18) | GV-PK-JU-18 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 38 | 110 | Flareon (base2 #19) | GV-PK-JU-19 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 39 | 110 | Electrode (base2 #2) | GV-PK-JU-2 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 40 | 110 | Jolteon (base2 #20) | GV-PK-JU-20 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 41 | 110 | Kangaskhan (base2 #21) | GV-PK-JU-21 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 42 | 110 | Mr. Mime (base2 #22) | GV-PK-JU-22 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 43 | 110 | Nidoqueen (base2 #23) | GV-PK-JU-23 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 44 | 110 | Pinsir (base2 #25) | GV-PK-JU-25 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 45 | 110 | Snorlax (base2 #27) | GV-PK-JU-27 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 46 | 110 | Vaporeon (base2 #28) | GV-PK-JU-28 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 47 | 110 | Venomoth (base2 #29) | GV-PK-JU-29 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 48 | 110 | Flareon (base2 #3) | GV-PK-JU-3 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 49 | 110 | Victreebel (base2 #30) | GV-PK-JU-30 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |
| 50 | 110 | Vileplume (base2 #31) | GV-PK-JU-31 | ebay_active, ebay_sold_candidate, ebay_user_export, pokemontcg_io_reference, pricecharting_reference, tcgcsv_reference, tcgplayer_reference_candidate, tcgplayer_user_export, justtcg_reference, manual_review_candidate |

## Next Step

Proceed to MEE-04C only after approving which planned source lanes are allowed to fetch. MEE-04C should start with a tiny acquisition batch and raw evidence storage only.
