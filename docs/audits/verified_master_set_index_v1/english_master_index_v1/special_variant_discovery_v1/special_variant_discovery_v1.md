# Special Variant Discovery V1

Audit-only Master Index expansion pass for special print lanes, recognized error variants, correction variants, and high-value WOTC cases.

## Guardrails

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- production_apply_performed: false

## Summary

| metric | value |
| --- | --- |
| candidate_rows | 57 |
| by_classification | {"recognized_error_variant":36,"stamp_or_release_variant":6,"canonical_print_lane":5,"item_level_error_only":4,"recognized_correction_variant":4,"set_level_print_run_family":2} |
| by_governance_status | {"source_ready":48,"blocked_item_level_only":4,"needs_second_source":3,"family_rule_ready":2} |
| by_db_status | {"already_in_db":48,"item_level_not_db_lane":4,"missing_from_db":3,"family_rule_not_expanded":2} |
| master_index_ready_missing_from_db | 0 |
| needs_second_source_or_review | 9 |
| family_rule_rows | 2 |
| item_level_excluded_rows | 4 |

## Modeling Rules

- Shadowless is an identity / print-run modifier, not a finish.
- First Edition is an edition identity modifier, not a finish.
- Red Cheeks / Yellow Cheeks is an artwork-color identity lane.
- No Symbol Jungle is a recognized error variant lane on unlimited Jungle holo rares.
- Random one-off manufacturing errors remain copy-level attributes unless source-backed as repeatable named variants.

## Top Missing From DB

| set | number | name | variant | class | status |
| --- | --- | --- | --- | --- | --- |
| base1 | 58 | Pikachu | grey_first_edition_stamp | recognized_error_variant | missing_from_db |
| base1 | * | Base Set 1999-2000 UK print-run family | 1999_2000_uk_print_run_family | set_level_print_run_family | family_rule_not_expanded |
| base1 | * | Base Set shadowless print-run family | shadowless_print_run_family | set_level_print_run_family | family_rule_not_expanded |
| base6 | 75 | Exeggcute | reverse_holo_shift_error | recognized_error_variant | missing_from_db |
| basep | 2 | Electabuzz | missing_wb_kids_stamp | recognized_error_variant | missing_from_db |
| various | * | Crimped Edge cards | crimped-edge | item_level_error_only | item_level_not_db_lane |
| various | * | Filler / blank / color-bar cards | filler-cards | item_level_error_only | item_level_not_db_lane |
| various | * | General holo bleed cards | holo-bleed-general | item_level_error_only | item_level_not_db_lane |
| various | * | Mis-cut / off-center cards | miscut-offcenter | item_level_error_only | item_level_not_db_lane |

## Source Universe Used

| source | usage |
| --- | --- |
| Bulbapedia Error cards | broad WOTC and later recognized error discovery |
| Bulbapedia Wizards Black Star Promos | WB Kids first-movie stamp and promo release context |
| Bulbapedia Jungle set page | set-level proof for Jungle No Symbol holo family |
| Elite Fourum WOTC corrected-errors guide | collector checklist/source text for corrected errors and Base/Jungle errors |
| Elite Fourum Base Pikachu variants | deep Pikachu print-run/color/stamp taxonomy |
| Elite Fourum WOTC promo image list | regular/inverted/missing WB-stamp promo image taxonomy |
| Big Orbit Base Set edition guide | Shadowless and 1999-2000 UK Base Set family-rule evidence |
| PriceCharting exact product pages | marketplace checklist corroboration for named variants |
