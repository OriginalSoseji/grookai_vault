# MTG Full Catalog Recovery V1

## Status

**source-day race repaired offline; durable resume not yet executed**

The previous hidden full-catalog ingestion remains safely stopped. It completed
132 authorized sets after the original DSK set and stopped before writing W17
when the source verifier observed zero rows on the warehouse's globally newest
price day.

No canonical data was deleted, replaced, or rolled back. Production currently
contains the exact durable prefix produced by that run.

## Current Production Truth

- release status: `hidden`;
- canonical MTG sets: `133`;
- parent `card_prints`: `12,380`;
- `card_print_identity` rows: `12,380`;
- `card_printings`: `20,040`;
- self-hosted parent images: `0`;
- anonymous MTG visibility: denied by the existing release boundary;
- authenticated MTG visibility: denied while status remains `hidden`.

The 133 sets equal the original DSK canary plus 132 durable sets from the
interrupted full-catalog run.

## Frozen Catalog Scope

The existing manifest remains authoritative:

- source sets: `953`;
- parent cards: `104,712`;
- finish-specific printings: `158,262`;
- exact TCGPlayer printing mappings: `144,462`;
- source-image coverage planned: `104,550` parent cards;
- exact image gaps: `162` parent cards;
- planned front/back face assets: `108,487`;
- proposed Storage path collisions: `0`.

The frozen scope also preserves `175` zero-map sets, `42` quarantined ambiguous
mapping lanes, and `13,800` unmapped printings rather than fabricating exact
ownership.

## Failure Analysis

The interrupted run stopped on:

```text
current source lanes: expected 30, got 0
```

The affected set was W17, Welcome Deck 2017. Its frozen payload contains 30
exact product/subtype lanes and 30 positive-market lanes.

Fresh read-only source evidence proves:

- all `30/30` exact lanes exist;
- all 30 latest-per-lane observations have positive market values;
- all 30 lanes existed on `2026-08-14`, the date of the interrupted run;
- all 30 lanes also exist on `2026-08-16`;
- no payload, identity, or mapping drift was found.

The failure was caused by comparing each set only with the category's globally
newest observation day. During a partially populated daily refresh, that day
can exist before every product group has arrived.

## Repair

`captureMtgSetPromotionCurrentSourceLanesV1` now selects the newest observation
day that contains every exact planned product/subtype lane for the current set.
The existing count and positive-price assertions remain unchanged.

This repair does not:

- infer or replace a mapping;
- accept a missing lane;
- use stale data when a newer complete day exists;
- authorize price publication;
- change the frozen manifest or payloads;
- expand database mutation authority.

## Verification

- writer and orchestrator syntax checks: passed;
- targeted repair contracts: `19/19` passed;
- complete MTG contract suite: `92/92` passed;
- W17 current source readback: `30/30` lanes, zero missing;
- `git diff --check`: passed;
- database writes during this recovery audit: `0`.

## Remaining Work To Reach One Piece Parity

1. Freeze the repaired producing commit and a new resume plan.
2. Reconcile the existing 133-set durable prefix.
3. Resume the remaining eligible sets under the existing hidden, insert-only
   envelope.
4. Reconcile the final 953-set, 104,712-parent, and 158,262-printing catalog.
5. Download, inspect, hash, upload, and read back the 108,487 planned exact face
   assets; attach only exact image pointers and preserve 162 gaps.
6. Add structured multi-face identity and image behavior, explicit English
   language, and string-safe MTG collector-number search.
7. Reuse the dynamic Search -> TCG -> sets -> cards hierarchy and optimized
   self-hosted image route established for One Piece.
8. Run database-aware shadow pricing qualification for the 144,462 exact
   mapped lanes. Preserve 15,607 publication-blocked gaps.
9. Prove signed-in web and Flutter behavior, then activate MTG through a
   separately frozen release-control gate.

## Exact Next Gate

Create the repaired producing commit, generate a new immutable full-catalog
apply plan from that commit, and run a read-only reconciliation of the existing
133-set prefix. Only after that reconciliation is exact may the hidden durable
ingestion resume at W17 without reprocessing or mutating completed sets.
