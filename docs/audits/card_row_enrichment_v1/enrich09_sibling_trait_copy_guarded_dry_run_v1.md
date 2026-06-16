# ENRICH-09 Sibling Trait Copy Guarded Dry Run V1

Package: `ENRICH-09-SIBLING-TRAIT-COPY`

## Result

- Pass: true
- Target parent rows: 1009
- Projected trait inserts: 1693
- Inserted inside transaction: 1693
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `733c303b5d398e430410935c0a11362063a9f726f3ce109032f92f7a9249522c`
- After rollback hash: `733c303b5d398e430410935c0a11362063a9f726f3ce109032f92f7a9249522c`
- Package fingerprint: `21a80f96bbe49558fff8f7c6a9416bf909b7cf2415a81685791771ee21647ac5`

## Safety

- Durable DB writes performed: false
- Migrations created: false
- Simulated writes were rolled back.
- No parent, child printing, identity, external mapping, species, delete, merge, or image writes were performed.

## By Set

| set_code | rows |
| --- | --- |
| smp | 119 |
| swsh11 | 45 |
| swsh10 | 44 |
| sv05 | 38 |
| swsh9 | 38 |
| swshp | 35 |
| sv10 | 34 |
| swsh12 | 33 |
| swsh8 | 33 |
| swsh7 | 31 |
| me01 | 30 |
| swsh6 | 28 |
| svp | 27 |
| sv02 | 21 |
| sv01 | 18 |
| sv04 | 18 |
| sv06 | 17 |
| sv09 | 16 |
| xyp | 16 |
| sv07 | 15 |
| swsh5 | 15 |
| swsh1 | 13 |
| pl3 | 12 |
| bw1 | 11 |
| dp5 | 11 |

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-09-SIBLING-TRAIT-COPY apply only. Fingerprint: 21a80f96bbe49558fff8f7c6a9416bf909b7cf2415a81685791771ee21647ac5. Scope: 1009 parent rows, 1693 card_print_traits inserts copied from unambiguous enriched same set/number/name siblings. Dry-run proof: 733c303b5d398e430410935c0a11362063a9f726f3ce109032f92f7a9249522c == 733c303b5d398e430410935c0a11362063a9f726f3ce109032f92f7a9249522c. No parent writes. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
