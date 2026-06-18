# Piplup Burger King Child Insert Guarded Dry Run V1

Rollback-only dry-run for the missing child printing on the existing Piplup Burger King Platinum-stamped parent.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Target

| set | number | name | variant_key | finish | parent_id | child_id |
| --- | --- | --- | --- | --- | --- | --- |
| dp5 | 71 | Piplup | platinum_stamped_burger_king_2009 | reverse | 2df55ec4-c010-4a01-b468-d1da7270e9d2 | 69df0f74-07d7-4faf-b5de-a1779a33fc4b |

## Evidence

| source | kind | url | label |
| --- | --- | --- | --- |
| bulbapedia_2009_burger_king_toys | human_readable_checklist | https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys | Burger King 2009 checklist includes Piplup 71/100 and states paired cards are reverse holofoil Platinum-stamped TCG cards. |
| pricecharting_stamped_product | marketplace_checklist | https://www.pricecharting.com/game/pokemon-majestic-dawn/piplup-stamped-71 | PriceCharting exact Piplup [Stamped] #71 product includes Burger King Platinum stamped reverse-holo sale labels. |
| pokumon_promo_database | collector_reference | https://pokumon.com/card/burger-king-piplup-71-100-burger-king-special-print/ | Pokumon lists Burger King Piplup 71/100 as Reverse Holo Platinum stamp, Burger King Collection 2009. |

## Result

- dry_run_status: piplup_burger_king_child_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `3be011d0358463d682aaecbc4f77ffa2586d047d40f870cbbcad6443dd59891e`
- dry_run_proof_sha256: `5c09c29526cdb3da564ea35db34ed00785271113bc97a7ef29f231ebd7e8156e`
- stop_findings: 0

## Approval Text

```text
Approve real RETAILER-STAMP-04-PIPLUP-BURGER-KING-CHILD-INSERT apply only. Fingerprint: 3be011d0358463d682aaecbc4f77ffa2586d047d40f870cbbcad6443dd59891e. Scope: 1 child-only card_printing insert for dp5/Majestic Dawn Piplup #71 Platinum Stamped Burger King 2009 parent; finish reverse=1. Dry-run proof: 81309c9d198d9739e029ee38aa55799824ae16a84f66673ec79d138c613f6356 == 81309c9d198d9739e029ee38aa55799824ae16a84f66673ec79d138c613f6356. No parent writes. No identity writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
