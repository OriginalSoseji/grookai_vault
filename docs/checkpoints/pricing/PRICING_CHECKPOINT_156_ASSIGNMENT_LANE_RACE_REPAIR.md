# Pricing Checkpoint 156: Assignment-Lane Race Repair

## Status

`SOURCE REPAIR VERIFIED - FRESH SHADOW REQUIRED`

## Incident

Shadow run `a989f4c5-21b1-4b5e-8b0b-b00a3347bd7b` qualified 166,087 market
observations but failed while building publication snapshots. Exactly two
eligible decisions violated `market_price_snapshot_assignment_lane_v1`:
TCGPlayer product `642533`, Normal and Reverse Holofoil.

The run began at `2026-10-17T04:43:20Z`. Product `642533` was mapped at
`2026-10-17T05:08:44Z`, after the run's variant-assignment preparation phase.
Candidate staging later observed the new mapping and exact child finishes, but
the two rows had no `variant_assignment_id`. Qualification admitted them based
on status text, and the database correctly rejected their snapshot insert.

The remaining 166,085 eligible decisions satisfied the assignment-lane
constraint. No production publication was activated by the failed shadow.

## Repair

Ordinary candidates now require a nonblank `variant_assignment_id` in addition
to `exact_child_finish`. A concurrent mapping therefore stays quarantined with
`missing_variant_assignment_identity` for that run. The following run prepares
its immutable assignment ledger row before staging and may qualify it normally.
Jungle and Gym Challenge edition assignments continue through their separate
foreign-key lanes.

The publication worker version is `TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_15`.
No schema migration or production catalog write is part of this source repair.

## Verification

- Focused cross-lane pricing contracts: 114 passed.
- Corrected publication fixture contracts: 97 passed.
- Full contract suite: 7,944 passed, 0 failed, 10 skipped.
- Read-only production diagnosis: 166,087 eligible, 166,085 valid lanes,
  2 missing ordinary assignment IDs, both from product `642533`.

## Next Gate

Merge the exact source commit, then run a fresh full shadow with a new run key.
The fresh preparation phase must create assignments for both product `642533`
observations and the shadow must reconcile every eligible snapshot before any
production activation.
