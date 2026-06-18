# Special Variant Blocked Evidence Review V1

Generated: 2026-06-17

This report documents the remaining special-variant candidates that were intentionally not promoted into Grookai canon after the source-ready special variant apply passes.

## Guardrails

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- production_apply_performed: false

## Result

The source-ready special-variant backlog is closed.

Current remaining blocked rows:

| set | number | card | variant | status | reason |
|---|---:|---|---|---|---|
| base1 | 58 | Pikachu | grey_first_edition_stamp | needs_second_source | Known collector concept, but current evidence does not prove an exact repeatable Base Set Pikachu #58 canonical lane beyond one collector taxonomy/source. |
| base6 | 75 | Exeggcute | reverse_holo_shift_error | needs_second_source | Current evidence is too broad around Legendary Collection holo/reverse misalignment. It does not prove an exact repeatable Exeggcute #75 canonical lane. |
| basep | 2 | Electabuzz | missing_wb_kids_stamp | needs_second_source | Bulbapedia names missing WB stamp promos #2-5, but the second collector source specifically confirms Mewtwo/Dragonite/Pikachu and notes Electabuzz has not been seen by that collector. |

## Sources Checked

| source | usage |
|---|---|
| Bulbapedia Error Cards | Baseline source for recognized error/card variant claims. |
| Elite Fourum WOTC Black Star Promos HD Image List | Strong collector checklist for WB promo variants; supports WB stamp/inverted WB and specific missing-stamp sightings. |
| Elite Fourum Base Pikachu Artwork Card Variations | Strong collector taxonomy for Base Set Pikachu color, print-run, and stamp variants. |
| PriceCharting | Exact product pages were used where exact card-number and variant titles existed. |
| PSA / CGC / marketplace search | Used as supporting discovery only; not enough by itself unless exact title and card identity were preserved. |

## Governance Decision

These rows remain excluded from real apply packages until at least one more exact source is found.

Required promotion standard:

- exact set
- exact card number
- exact card name
- exact variant label
- evidence that the variant is repeatable / recognized, not a one-off copy condition

## Why This Matters

These cards may be real, but Grookai should not create canonical parent rows from incomplete evidence. The correct current status is `needs_second_source`, not canonical truth.
