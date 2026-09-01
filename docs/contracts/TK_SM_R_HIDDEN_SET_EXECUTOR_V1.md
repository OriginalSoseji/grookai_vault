# TK-SM-R Hidden Set Executor V1

## Purpose

Close the exact 11-parent identity gap in English Pokemon set `tk-sm-r`
without treating source discovery or a review-only phone decision as write
authority.

## Frozen Authority

- Canonical set: `SM Trainer Kit (Alolan Raichu)` (`tk-sm-r`).
- Expected full-set count: `30`.
- Existing canonical parent count at package construction: `19`.
- Exact proposed parent delta: `11`.
- TCGdex repository commit: `d88210d806d1b55d7832847beaed692c0bb7bfee`.
- Every packaged card identity is `master_verified` by at least two independent
  sources, including the scoped Bulbapedia half-deck checklist.
- Every source key is bound to its authority, kind, and URL in one aligned
  `source_evidence` tuple; parallel compatibility arrays must preserve that order.
- Scoped Master Index package SHA-256:
  `402d0155e76b27c0707fbb6a6d997cf12d39a44c2f1b0591d69d396b45b085a5`.
- Frozen source snapshot SHA-256:
  `e33dc444135e98cc7e45fcdd3e97ebdb7a7125028a5e3c0a81ef04fda2f249ec`.
- Complete package fingerprint SHA-256:
  `35d64d8f5fb24c6f8d8ffbba5c5ad56eb569a0709a94b20831333731283e4f32`.

## Write Boundary

The underlying writer is insert-only and may target only:

- `card_prints` parent rows;
- `card_print_identity` rows;
- `card_print_identity_source_evidence` rows;
- `card_print_family_review_queue` rows.

It may not write child printings, external mappings, Storage, image pointers,
pricing, publication, Vault data, or public visibility. It has no update,
delete, upsert, or truncation path.

## Current Gate

The checked-in GitHub workflow is manual and dry-run only. It inserts the exact
payload inside one transaction, reads it back, rolls the transaction back, and
requires zero matching rows afterward. It has no schedule and no apply input.

The prior Founder Operations decision for work item
`8fd61c41-d4d2-484a-a312-4891826d529e` is review-only. Its
`execution_enabled=false` policy cannot authorize this writer.

## Future Apply Gate

A durable apply requires all of the following at once:

1. A clean, exact commit SHA.
2. The exact dry-run payload fingerprint.
3. The exact scoped Master Index package fingerprint.
4. The exact frozen source snapshot fingerprint.
5. The exact generated approval sentence in
   `ENGLISH_POKEMON_INCREMENTAL_APPLY_APPROVAL`.
6. A separate bounded execution decision; the review-only phone decision is
   insufficient.
7. Durable readback reconciling every authorized row and zero boundary rows.

No apply workflow is connected in this gate.
