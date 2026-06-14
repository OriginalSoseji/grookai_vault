# PKG-22B Product/Promo Base Finish Overgeneration Child Delete Guarded Dry Run V1

Rollback-only dry run for product/promo child rows that are base identity, dependency-free, and finish-unsupported by the Master Index.

## Safety

- dry_run_only: true
- db_writes_performed: false
- durable_writes_performed: false
- migrations_created: false

## Scope

- target_child_deletes: 2064
- blocked_source_rows: 164

| finish | rows |
| --- | --- |
| reverse | 1028 |
| normal | 944 |
| holo | 92 |

| set | rows |
| --- | --- |
| smp | 486 |
| xyp | 416 |
| svp | 388 |
| swshp | 256 |
| bwp | 194 |
| sma | 94 |
| np | 72 |
| pop1 | 27 |
| 2016xy | 24 |
| pop2 | 14 |
| 2011bw | 12 |
| 2012bw | 12 |
| 2014xy | 12 |
| 2015xy | 12 |
| 2017sm | 12 |
| 2018sm | 12 |
| 2019sm | 12 |
| 2022swsh | 6 |
| basep | 3 |

## Proof

- before_hash: ffae17e402d8bbb23f17ec75bfb6916856457a649e513dd1f01e67653cd82087
- after_hash: ffae17e402d8bbb23f17ec75bfb6916856457a649e513dd1f01e67653cd82087
- rollback_proof_hash_match: true

## Recommended Real Apply Approval

```text
Approve real PKG-22B-PRODUCT-PROMO-BASE-FINISH-OVERGENERATION-CHILD-DELETE apply only. Fingerprint: 51fb478da9343d6ff89feb996d21f772d181e85bd32378dcf28ecdce7d3f0520. Scope: 2064 product/promo base finish-overgeneration child deletes; finishes reverse=1028, normal=944, holo=92; top sets smp=486, xyp=416, svp=388, swshp=256, bwp=194, sma=94, np=72, pop1=27. Dry-run proof: ffae17e402d8bbb23f17ec75bfb6916856457a649e513dd1f01e67653cd82087 == ffae17e402d8bbb23f17ec75bfb6916856457a649e513dd1f01e67653cd82087. No global apply. No migrations. No parent writes. No merges. No quarantine. Variant/modifier rows excluded.
```
