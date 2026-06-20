# Meowth Gold Border Guarded Dry Run V1

Rollback-only dry-run for the source-backed Jungle Meowth Gold Border promo lane.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- deletes_performed: false
- merges_performed: false
- rollback_verified: true

## Scope

| field | value |
| --- | --- |
| package_id | MISSING-PROMO-04B-MEOWTH-GOLD-BORDER-PARENT-CHILD-INSERT |
| target | base2 Meowth #56 |
| variant_key | gold_border |
| printed_identity_modifier | gold_border |
| finish_key | normal |
| parent_inserts | 1 |
| identity_inserts | 1 |
| child_inserts | 1 |

## Evidence

| source | kind | url |
| --- | --- | --- |
| bulbapedia_meowth_jungle_56 | human_readable_checklist | https://bulbapedia.bulbagarden.net/wiki/Meowth_%28Jungle_56%29 |
| pricecharting_meowth_gold_border_56 | marketplace_checklist | https://www.pricecharting.com/game/pokemon-jungle/meowth-gold-border-56 |
| tcgplayer_meowth_gold_bordered_promo | marketplace_checklist | https://www.tcgplayer.com/product/126211/pokemon-miscellaneous-cards-and-products-meowth-56-64-gold-bordered-promo |
| pkmncards_meowth_jungle_56 | collector_reference | https://pkmncards.com/card/meowth-jungle-ju-56/ |

## Result

- dry_run_status: meowth_gold_border_parent_child_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `3a6cad8af88898376842fa81661236c570752cd15725d5c03b15b5afb6230986`
- sql_hash_sha256: `68abddb89308f90a68f2e16acf9a8740acd5bd3584bab899da169ef07c2b3ca6`
- dry_run_proof_sha256: `0a8f83c7e7c05868bd63c5d761a1b840bf4c3550a189d18c06a88758e0e5bd3c`
- stop_findings: 0

## Approval Text

```text
Approve real MISSING-PROMO-04B-MEOWTH-GOLD-BORDER-PARENT-CHILD-INSERT apply only. Fingerprint: 3a6cad8af88898376842fa81661236c570752cd15725d5c03b15b5afb6230986. SQL hash: 68abddb89308f90a68f2e16acf9a8740acd5bd3584bab899da169ef07c2b3ca6. Scope: 1 Jungle Meowth Gold Border parent insert, 1 active identity insert, 1 normal child printing insert; set base2/Jungle; variant_key=gold_border; printed_identity_modifier=gold_border. Dry-run proof: 72ee7c3aec09d453bc21bf31b880dbc40fcdd20d51a0e296098b94748c97525b == 72ee7c3aec09d453bc21bf31b880dbc40fcdd20d51a0e296098b94748c97525b. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No external mapping writes. No pricing writes. No image writes.
```
