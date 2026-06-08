# English Master Index Source Delta Summary V1

Audit-only summary of existing source lanes tested against the current remaining Master Index gaps.

## Summary

| Metric | Value |
| --- | --- |
| sources_reviewed | 37 |
| candidate_records_loaded | 106525 |
| matched_gap_facts | 78 |
| useful_candidate_matches | 1 |
| already_in_current_index | 100738 |
| unmatched_candidate_records | 5709 |
| useful_unabsorbed_source_lanes | 1 |

## Conclusion

Review useful source lanes before any guarded rebuild.

## Source Lanes

| Source | Loaded | Matched Gaps | Useful | Already In Index | Unmatched | Status |
| --- | --- | --- | --- | --- | --- | --- |
| binderbuilder_set_variant | 188 | 0 | 0 | 184 | 4 | no_useful_unabsorbed_gap_evidence |
| bulbapedia_build_battle_product | 118 | 0 | 0 | 95 | 23 | no_useful_unabsorbed_gap_evidence |
| bulbapedia_card_page_release_info | 317 | 0 | 0 | 275 | 42 | no_useful_unabsorbed_gap_evidence |
| cardtrader_blueprint_index | 1297 | 1 | 0 | 1185 | 111 | no_useful_unabsorbed_gap_evidence |
| doubleholo_set_checklist | 52 | 0 | 0 | 52 | 0 | no_useful_unabsorbed_gap_evidence |
| elitefourum_alternate_checklist | 50 | 0 | 0 | 50 | 0 | no_useful_unabsorbed_gap_evidence |
| eyevo_identity | 169 | 0 | 0 | 169 | 0 | no_useful_unabsorbed_gap_evidence |
| manual_web_exact_finish_batch_20260608 | 23 | 0 | 0 | 23 | 0 | no_useful_unabsorbed_gap_evidence |
| manual_web_exact_finish_mixed_batch_20260608 | 23 | 0 | 0 | 23 | 0 | no_useful_unabsorbed_gap_evidence |
| manual_web_exact_finish_mixed_batch_2_20260608 | 31 | 0 | 0 | 31 | 0 | no_useful_unabsorbed_gap_evidence |
| manual_web_exact_finish_mixed_batch_3_20260608 | 40 | 0 | 0 | 40 | 0 | no_useful_unabsorbed_gap_evidence |
| manual_web_exact_finish_mixed_batch_4_20260608 | 49 | 0 | 0 | 49 | 0 | no_useful_unabsorbed_gap_evidence |
| official_pokemon_checklist_pdf | 97 | 0 | 0 | 97 | 0 | no_useful_unabsorbed_gap_evidence |
| official_pokemon_legacy_checklist | 20 | 18 | 0 | 0 | 2 | no_useful_unabsorbed_gap_evidence |
| pkmncards_identity_gap | 2 | 0 | 0 | 2 | 0 | no_useful_unabsorbed_gap_evidence |
| pkmncards_preservation | 19167 | 0 | 0 | 19167 | 0 | no_useful_unabsorbed_gap_evidence |
| pkmncollectors_futsal | 4 | 0 | 0 | 4 | 0 | no_useful_unabsorbed_gap_evidence |
| pkmncollectors_sm1_energy | 9 | 0 | 0 | 9 | 0 | no_useful_unabsorbed_gap_evidence |
| pkmncollectors_xya | 4 | 0 | 0 | 4 | 0 | no_useful_unabsorbed_gap_evidence |
| pokellector_set_checklist | 2 | 0 | 0 | 2 | 0 | no_useful_unabsorbed_gap_evidence |
| pokemoncard_io_price_breakdown | 17 | 0 | 0 | 2 | 15 | no_useful_unabsorbed_gap_evidence |
| pokescope_pl2_variant | 3 | 0 | 0 | 3 | 0 | no_useful_unabsorbed_gap_evidence |
| pokescope_variant | 0 | 0 | 0 | 0 | 0 | no_useful_unabsorbed_gap_evidence |
| pokex_set_checklist | 1 | 0 | 0 | 1 | 0 | no_useful_unabsorbed_gap_evidence |
| pricecharting_csv_base_product | 13 | 0 | 0 | 13 | 0 | no_useful_unabsorbed_gap_evidence |
| pricecharting_csv_product | 2 | 0 | 0 | 2 | 0 | no_useful_unabsorbed_gap_evidence |
| pricecharting_csv_product_stamp | 9 | 0 | 0 | 9 | 0 | no_useful_unabsorbed_gap_evidence |
| pricecharting_csv | 421 | 0 | 0 | 421 | 0 | no_useful_unabsorbed_gap_evidence |
| pricecharting | 18 | 0 | 0 | 17 | 1 | no_useful_unabsorbed_gap_evidence |
| reverseholo_set_checklist | 23765 | 0 | 0 | 18933 | 4832 | no_useful_unabsorbed_gap_evidence |
| tcdb_checklist | 4 | 0 | 0 | 2 | 2 | no_useful_unabsorbed_gap_evidence |
| tcgcollector_card_variants | 1493 | 1 | 1 | 1140 | 352 | candidate_review_needed |
| tcgcsv_prize_pack_catalog | 7 | 0 | 0 | 7 | 0 | no_useful_unabsorbed_gap_evidence |
| tcgcsv_tcgplayer_catalog_identity | 9 | 0 | 0 | 9 | 0 | no_useful_unabsorbed_gap_evidence |
| tcgcsv_tcgplayer_catalog | 1359 | 0 | 0 | 1034 | 325 | no_useful_unabsorbed_gap_evidence |
| tcgstats_mfb_price_guide | 33 | 0 | 0 | 33 | 0 | no_useful_unabsorbed_gap_evidence |
| thepricedex_price_list | 57709 | 58 | 0 | 57651 | 0 | no_useful_unabsorbed_gap_evidence |

## Safety Confirmation

```json
{
  "db_writes_performed": false,
  "migrations_created": false,
  "cleanup_performed": false,
  "quarantine_performed": false
}
```
