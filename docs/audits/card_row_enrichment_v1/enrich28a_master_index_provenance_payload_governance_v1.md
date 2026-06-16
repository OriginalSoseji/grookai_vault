# ENRICH-28A Master Index Provenance Payload Governance V1

## Result

- Audit only: true
- DB writes performed: false
- Migrations created: false
- Fingerprint: `af818bfe31113b269c6dfab6400fa68ed2fe0c75c87183687500f2cf32727cea`

## Decision

Do not convert verified_master_index_v1 payloads into external_mappings.

These payloads are multi-source evidence bundles and routing/proof metadata. They are not unique external catalog identifiers and cannot satisfy source/external_id uniqueness semantics.

## Totals

| metric | rows |
| --- | --- |
| payload_rows | 622 |
| usable_provenance_payload_rows | 592 |
| review_payload_rows | 30 |
| rows_missing_gv_id | 1 |
| rows_without_active_external_mapping | 622 |
| rows_with_child_printings | 143 |
| rows_with_active_identity | 622 |

## Classification

| classification | rows |
| --- | --- |
| provenance_payload_usable | 592 |
| provenance_payload_needs_review | 30 |

## Evidence Sources

| source | mentions |
| --- | --- |
| thepricedex_price_list | 585 |
| pricecharting_csv_product | 211 |
| bulbapedia_set_list | 115 |
| pokecardvalues_stamped_finish | 113 |
| bulbapedia_card_page_release_info | 95 |
| bulbapedia_prize_pack_normal | 77 |
| tcgcsv_prize_pack_catalog | 72 |
| binderbuilder_set_variant | 66 |
| tcgcollector_card_variants | 37 |
| elitefourum_alternate_checklist | 34 |
| tcgcsv_stamped_subtype | 24 |
| bulbapedia_build_battle_product | 20 |
| doubleholo_set_checklist | 17 |
| justinbasil_prize_pack_finish | 11 |
| cardtrader_blueprint_index | 10 |
| pokescope_variant_exact | 10 |
| pokumon_player_rewards_special_print | 8 |
| pricecharting_stamped_active_finish | 8 |
| pricecharting_csv_promo_exact | 6 |
| bulbapedia_2009_burger_king_toys | 5 |
| bulbapedia_player_rewards_release_info | 4 |
| magicmadhouse_swsh9_stamps | 4 |
| bulbapedia_battle_academy_product | 3 |
| pricecharting_csv_product_stamp | 3 |
| pricecharting_stamped_product | 3 |
| tcgplayer_burger_king_promos | 3 |
| bigorbit_league_promo_exact | 2 |
| bulbapedia_diamond_pearl_tcg | 2 |
| cardtrader_stamped_finish | 2 |
| pokecardvalues_same_finish_ambiguous_adjudication | 2 |
| pricecharting_reverse_product | 2 |
| bulbapedia_2008_burger_king_toys | 1 |
| bulbapedia_swsh11_trick_or_trade_stamps | 1 |
| pokescope_svp_variant | 1 |
| tcgplayer_price_guide | 1 |

## Allowed Use

- display provenance in internal/admin review surfaces
- support audit traceability for Master Index promoted rows
- support future evidence detail pages if surfaced as provenance, not source ownership

## Disallowed Use

- external_mappings inserts
- external_mappings ownership transfer
- identity resolution by payload presence alone
- finish truth promotion without Master Index guardrails

## Next

- If this evidence needs first-class querying, create a separate append-only provenance/evidence table rather than overloading external_mappings.
- Next package: `ENRICH-28B-MASTER-INDEX-PROVENANCE-SURFACE-PLAN` (needs_payload_shape_review_before_schema_design)
