# Master Set Variant Display V1 Audit

Generated: 2026-05-18T16:46:34.752Z

Mode: read-only audit

## Duplicate-Looking Coverage

- duplicate-looking groups: 881
- affected rows: 2211
- unlabeled duplicate-looking rows after display discriminator: 0

Discriminator source breakdown:

- fallback: 1489
- parent_variant: 468
- child_finish: 254

## Finish Coverage

- normal: Normal (19920)
- reverse: Reverse Holo (18630)
- holo: Holo (16895)
- pokeball: Poké Ball (230)
- masterball: Master Ball (67)

## Required Sample Sets

- sv03.5: sampled 20 rows, Poké Ball rows=0, Master Ball rows=0
- sv8pt5: sampled 20 rows, Poké Ball rows=100, Master Ball rows=67
- smp: sampled 20 rows, Poké Ball rows=0, Master Ball rows=0
- base1: sampled 20 rows, Poké Ball rows=0, Master Ball rows=0
- ecard3: sampled 20 rows, Poké Ball rows=0, Master Ball rows=0

## Species Dex Denominator Check

- Charizard (charizard): 133 parent prints
- Pikachu (pikachu): 223 parent prints

Species Dex denominators remain parent-print based. This lane does not multiply species totals by child finishes.

## 151 / Premium Parallel Evidence

- Poké Ball labels resolve from `finish_keys` through `card_printings`.
- Master Ball labels resolve from `finish_keys` through `card_printings`.
- Parent duplicate labels such as Pokemon Together Stamp resolve from `card_prints.variant_key`.

## Result

PASS: every duplicate-looking row audited has a visible discriminator.

No migrations were created and no DB writes were performed.
