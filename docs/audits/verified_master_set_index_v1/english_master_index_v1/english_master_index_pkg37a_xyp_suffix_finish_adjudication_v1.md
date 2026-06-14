# PKG-37A XYP Suffix Finish Adjudication V1

Read-only adjudication for the remaining XYP suffix promo rows.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

| metric | value |
| --- | --- |
| target_live_rows | 15 |
| target_card_identities | 5 |
| normal_rows_supported_by_tcgdex_only | 0 |
| holo_rows_blocked | 5 |
| reverse_rows_blocked | 5 |
| write_ready_now | 0 |
| fingerprint | 540b4aac8c335972a24cdf903e04cff9a514232e729a4322009577586b0dd87e |

## Findings

- The card identities `XY150a`, `XY177a`, `XY198a`, `XY200a`, and `XY67a` are already Master Index card identities.
- TCGdex finish variants conflict with the broader evidence lane by marking these suffix identities as `normal`.
- Independent human/marketplace sources explicitly identify the suffix identities as `holo`.
- Therefore this report does not authorize DB writes. It marks the next step as a Master Index finish-delta promotion, followed by a separate guarded cleanup package for normal/reverse only after the index delta is promoted.

## Rows

| number | card | live finish | status | tcgdex claim | pricecharting signal |
| --- | --- | --- | --- | --- | --- |
| XY150a | Yveltal-EX | holo | holo_master_index_delta_ready | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY150a | Yveltal-EX | normal | normal_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY150a | Yveltal-EX | reverse | reverse_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY177a | Karen | holo | holo_master_index_delta_ready | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY177a | Karen | normal | normal_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY177a | Karen | reverse | reverse_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY198a | M Camerupt-EX | holo | holo_master_index_delta_ready | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY198a | M Camerupt-EX | normal | normal_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY198a | M Camerupt-EX | reverse | reverse_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY200a | M Sharpedo-EX | holo | holo_master_index_delta_ready | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY200a | M Sharpedo-EX | normal | normal_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY200a | M Sharpedo-EX | reverse | reverse_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY67a | Jirachi | holo | holo_master_index_delta_ready | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY67a | Jirachi | normal | normal_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
| XY67a | Jirachi | reverse | reverse_overfinish_candidate_after_holo_delta | normal=true,holo=false,reverse=false | unqualified_promo_product |
