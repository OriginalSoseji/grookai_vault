# Piplup Ultra Prism Retailer Stamp Parent Insert Guarded Dry Run V1

Rollback-only dry-run for missing Piplup Ultra Prism #32 Build-A-Bear Workshop and Toys R Us stamped parent identities.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 2
- identity_inserts: 2
- child_inserts: 2
- deletes: 0
- merges: 0

## Targets

| set | number | name | stamp_label | variant_key | finish | base_parent_id |
| --- | --- | --- | --- | --- | --- | --- |
| sm5 | 32 | Piplup | Build-A-Bear Workshop Stamp | build_a_bear_workshop_stamp | normal | 9d7ad936-c000-4401-9bc0-d1191b157af2 |
| sm5 | 32 | Piplup | Toys R Us Stamp | toys_r_us_stamp | cosmos | 9d7ad936-c000-4401-9bc0-d1191b157af2 |

## Evidence

| target | source | url | label |
| --- | --- | --- | --- |
| Build-A-Bear Workshop Stamp | tcgplayer_exact_product | https://www.tcgplayer.com/product/189762/pokemon-miscellaneous-cards-and-products-piplup-32-156-build-a-bear-workshop-exclusive | TCGplayer exact product identifies Piplup 32/156 Build-A-Bear Workshop Exclusive. |
| Build-A-Bear Workshop Stamp | pricecharting_exact_product | https://www.pricecharting.com/game/pokemon-ultra-prism/piplup-build-a-bear-32 | PriceCharting exact product identifies Piplup [Build-A-Bear] #32 in Pokemon Ultra Prism. |
| Build-A-Bear Workshop Stamp | bulbapedia_set_list | https://bulbapedia.bulbagarden.net/wiki/Ultra_Prism_(TCG) | Bulbapedia Ultra Prism additional cards list includes Piplup 32/156 Build-A-Bear Workshop stamp promo. |
| Toys R Us Stamp | bulbapedia_set_list | https://bulbapedia.bulbagarden.net/wiki/Ultra_Prism_(TCG) | Bulbapedia Ultra Prism additional cards list identifies Piplup 32/156 as Cosmos Holo Toys "R" Us stamp exclusive. |
| Toys R Us Stamp | bulbapedia_toys_r_us_promotional_cards | https://bulbapedia.bulbagarden.net/wiki/Toys_%22R%22_Us_Promotional_cards_(TCG) | Bulbapedia Toys "R" Us promotional checklist includes Piplup 32/156 for the February 2018 Ultra Prism promotion. |
| Toys R Us Stamp | pricecharting_exact_product | https://www.pricecharting.com/game/pokemon-ultra-prism/piplup-toysrus-32 | PriceCharting exact product identifies Piplup [ToysRUs] #32 with Toys "R" Us stamped promo sale labels. |

## Result

- dry_run_status: piplup_ultra_prism_retailer_stamp_parent_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `25eed1a9dfbf22dba7972dd6acd292884721eb5b95d9911fbf33b0097d04b518`
- dry_run_proof_sha256: `cad88e0272a752f2753091fe01f04d374adf9d7193887274b9f0a9e2adcf6e20`
- stop_findings: 0

## Approval Text

```text
Approve real RETAILER-STAMP-05-PIPLUP-UPR-PARENT-IDENTITY-INSERTS apply only. Fingerprint: 25eed1a9dfbf22dba7972dd6acd292884721eb5b95d9911fbf33b0097d04b518. Scope: 2 Piplup Ultra Prism retailer-stamped parent inserts, 2 identity inserts, 2 child printing inserts; finishes cosmos=1, normal=1; stamp labels Build-A-Bear Workshop Stamp=1, Toys R Us Stamp=1; sets sm5=2. Dry-run proof: a48a953c186e8fcab228ae831216a70b06013027fcebcd116d28ff4b97b03d48 == a48a953c186e8fcab228ae831216a70b06013027fcebcd116d28ff4b97b03d48. No parent overwrites. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
