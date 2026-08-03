# MEE Warehouse-First Acquisition V2 Checkpoint

## Context

The running V1 acquisition plan hardcodes eBay category `183454` (`CCG Individual Cards`) and treats sealed language as an exclusion. Its exact-card query mix also spends provider calls before the warehouse has broadly captured available inventory.

Baseline branch and commit:

- Branch: `agent/market-listing-adaptive-yield-v1`
- Commit: `5932fd76827ec23c0060d78fec38c8a76c58e5aa`

Implementation branch:

- Branch: `agent/market-listing-warehouse-v2`

## Problem

The current flow conflates acquisition, product classification, and exact canonical assignment. That creates three defects:

- sealed products cannot be discovered correctly through an individual-card-only route;
- sealed promo singles are mistaken for booster/box inventory or discarded;
- exact-printing queries consume calls that could first warehouse broader market evidence.

## Decision

Adopt a warehouse-first V2 candidate with independent product-kind and packaging dimensions.

```text
raw provider evidence
  -> product kind + packaging state
  -> deferred canonical assignment
  -> downstream pricing qualification
```

Exact printing can be assigned later. It is not required to retain a listing.

## Alternatives Rejected

- Keep hardcoded category `183454`: cannot provide governed sealed-product coverage.
- Treat every title containing `sealed`, `box`, `pack`, or `tin` as a sealed product: false on sealed promo cards, `pack fresh`, ETB promos, and card names.
- Permanently reserve 90/10 call percentages: prevents capacity from following real product-family yield.
- Attach sealed products to card printings: corrupts identity boundaries.
- Add a migration before proving the flow: existing internal JSON evidence fields can carry the V2 candidate safely.

## Implementation

- Added a V2 product-kind classifier for raw, graded, sealed, lot/bundle, accessory, and unknown listings.
- Added independent `packaging_state` evidence so sealed promo singles remain card singles while preserving sealed packaging.
- Added an official eBay Taxonomy candidate-discovery flow.
- Added a reviewed, fingerprinted provider-category registry.
- Removed the fetch adapter's hardcoded category behavior; frozen request category IDs now drive Browse calls.
- Added a warehouse-first planner with no card-printing requests.
- Added coverage-first/adaptive-spillover fetching.
- Added local warehouse backfill planning that proposes no candidates, rollups, identity writes, or publication writes.
- Added one CLI entry point: `npm run mee:warehouse:v2 -- --mode=<taxonomy|registry|plan|fetch|backfill>`.

## Offline Proof

The preserved 1,000-row V1 broad-intake artifact was replayed with zero provider calls and zero database writes.

- Source rows: 1,000
- Raw singles: 760
- Graded singles: 18
- Lots/bundles: 186
- Accessories: 36
- Old rows with a generic sealed flag: 56
- Old sealed-flag rows correctly retained as raw/graded card evidence: 49
- Rows preserving independent sealed-packaging evidence: 43
- Confirmed sealed products: 0

The zero sealed-product count is expected and does not prove no sealed products exist. The replay source was acquired through the individual-card category, which is the coverage defect V2 corrects.

Evidence:

- [Offline replay](../../audits/market_listing_warehouse_v2/product_kind_replay_2026-08-03T21-55-14-213Z.md)

## Current Truths

- Existing production/nightly behavior remains V1 and unchanged.
- The V2 implementation has made no provider Browse calls and no database writes.
- Current TCGPlayer Product V1 remains English Pokemon raw singles only.
- Warehouse V2 may retain graded and sealed evidence, but it cannot publish either through the raw-single read model.
- Exact raw/graded card printing assignment is deferred.
- A canonical sealed-product identity model is still a downstream project.

## Invariants

- Provider category routing never creates canonical identity.
- Warehouse acceptance never creates market truth.
- Product kind and packaging state remain independent.
- Exact printing IDs remain null during broad acquisition.
- Sealed products never enter card candidate or raw-single publication flows.
- Every live category route is frozen with official taxonomy provenance.
- Raw provider payloads remain immutable and replayable.

## What Must Never Be Broken

- Do not discard listings merely because exact printing assignment is unresolved.
- Do not infer a sealed product from `pack fresh`, ETB promo wording, or a card name.
- Do not lose sealed-packaging evidence on individually packaged promo cards.
- Do not hardcode guessed provider category IDs.
- Do not mix raw, graded, and sealed pricing signals.
- Do not add app-visible pricing from acquisition artifacts.
- Do not destroy or rewrite existing warehouse history.

## Remaining Work

1. Run official eBay Taxonomy discovery in an isolated environment with existing credentials.
2. Review and freeze sealed category IDs from that artifact.
3. Generate a real V2 plan from the current set target corpus.
4. Run a bounded local-artifact-only canary across raw, graded, and sealed routes.
5. Reconcile product-kind precision, lane yield, duplicates, provider totals, and manifests.
6. Approve a separate append-only warehouse apply only after the canary passes.
7. Build downstream assignment resolvers:
   - raw single -> card printing;
   - graded single -> card printing + grade dimensions;
   - sealed product -> sealed-product identity.
8. Integrate V2 into nightly orchestration only after readback and rollback proof.

## Explicit Next Gate

Run official taxonomy discovery only. Freeze candidates in an audit artifact, review the sealed route, and stop before Browse acquisition or database apply.
