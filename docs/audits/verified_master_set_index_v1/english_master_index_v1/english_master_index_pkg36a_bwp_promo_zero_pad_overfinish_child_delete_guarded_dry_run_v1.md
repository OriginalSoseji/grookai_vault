# PKG-36A BWP Promo Zero-Pad Overfinish Child Delete Guarded Dry Run V1

Rollback-only dry run for BWP promo child rows exposed after BW promo zero-padding reconciliation.

## Safety

- dry_run_only: true
- db_writes_performed: false
- durable_writes_performed: false
- migrations_created: false

## Scope

- target_child_deletes: 4
- blocked_source_rows: 24

| finish | rows |
| --- | --- |
| normal | 2 |
| reverse | 2 |

| set | rows |
| --- | --- |
| bwp | 4 |

## Proof

- before_hash: e10f5afafdd114b89316ecf7e878874e2d2eb66c3b1e7641d04d91bfea31d531
- after_hash: e10f5afafdd114b89316ecf7e878874e2d2eb66c3b1e7641d04d91bfea31d531
- rollback_proof_hash_match: true

## Recommended Real Apply Approval

```text
Approve real PKG-36A-BWP-PROMO-ZERO-PAD-OVERFINISH-CHILD-DELETE apply only. Fingerprint: 91e3dfcd8108f73c626609a9481b8db1c1bd8fb4267240ec88222c5e735b06ac. Scope: 4 BWP promo zero-pad overfinish child deletes; finishes normal=2, reverse=2; target rows Reshiram BW04 normal/reverse and Zekrom BW05 normal/reverse. Dry-run proof: e10f5afafdd114b89316ecf7e878874e2d2eb66c3b1e7641d04d91bfea31d531 == e10f5afafdd114b89316ecf7e878874e2d2eb66c3b1e7641d04d91bfea31d531. No global apply. No migrations. No parent writes. No merges. No quarantine. Holo rows preserved.
```
