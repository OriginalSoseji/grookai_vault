# Single-Finish Web Review Candidates V1

Generated: 2026-06-22T17:35:15.345Z

Audit-only. No DB writes, no migrations, no apply.

This report isolates current stamped/special rows where web discovery found an exact variant/stamp label and only one active finish term on the reviewed source pages.

These rows are not automatically promotable. A page can list one finish term without proving that the stamp/variant itself is bound to that finish. They are manual review candidates only.

## Summary

| metric | value |
| --- | --- |
| source_rows_checked | 171 |
| variant_supported_rows | 81 |
| single_finish_review_candidates | 5 |
| single_finish_multi_variant_source_review | 1 |
| single_finish_single_variant_source_review | 4 |
| multi_finish_terms_not_safe | 76 |
| promotable_rows | 0 |
| fingerprint_sha256 | `ba7e7cd4991be7081f6e8e12ba2425fc09ca6e32b4faa47b3d937742e79f4b50` |

## Candidates

| set | number | card | stamp/variant | single finish term | variant sources | review status | sources |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bw1 | 105 | Grass Energy | Play! Pokemon Stamp | normal | 2 | single_finish_multi_variant_source_review | https://pokescope.app/card/bw1-105/ ; https://scrydex.com/pokemon/cards/black-and-white/bw1-105 |
| bwp | BW95 | Champions Festival | Quarter Finalist Stamp | normal | 1 | single_finish_single_variant_source_review | https://pokescope.app/card/bwp-BW95/ ; https://scrydex.com/pokemon/cards/bw-black-star-promos/bwp-BW95 |
| smp | SM231 | Champions Festival | Quarter Finalist Stamp | normal | 1 | single_finish_single_variant_source_review | https://pokescope.app/card/smp-SM231/ ; https://scrydex.com/pokemon/cards/sm-black-star-promos/smp-SM231 |
| svp | 225 | Pikachu | World Championships Stamp | normal | 1 | single_finish_single_variant_source_review | https://pokescope.app/card/svp-225/ ; https://scrydex.com/pokemon/cards/scarlet-and-violet-black-star-promos/svp-225 |
| xyp | XY27 | Champions Festival | Finalist Stamp | holo | 1 | single_finish_single_variant_source_review | https://pokescope.app/card/xyp-XY27/ ; https://scrydex.com/pokemon/cards/xy-black-star-promos/xyp-XY27 |

## Guardrail

Do not promote these rows unless a source proves exact set + card number + card name + stamp/variant + active finish. Page-level finish vocabulary alone is not sufficient.
