# MEE Warehouse-First Acquisition V2 Canary Checkpoint

## Context

Warehouse V2 separates provider acquisition from canonical assignment and separates product kind from packaging state. The first live gate needed to prove official category routing and broad retention for raw, graded, and sealed inventory without writing to the database.

## Decision

Freeze the eBay US category tree at version `134` for this evidence package and use these reviewed routes:

- `183454`: raw and graded individual-card evidence;
- `183456`: sealed packs;
- `183457`: sealed decks and kits;
- `261044`: sealed boxes;
- `261045`: sealed cases.

Exact printing assignment remains downstream. Listings are retained first and assigned later.

## Live Proof

- Target: `me05` / Mega Evolution: Pitch Black
- Provider-run SHA: `c77831c6c4706edcf5ce67fc1a7ace44070e09a1`
- Offline-repair SHA: `22c4feba4e9e1c5cae3c3b228300350ee7b9abd9`
- Provider calls: `9/9` successful
- Unique listings: `630`
- Final product kinds: 182 raw, 1 graded, 382 sealed, 61 lots/bundles, 2 accessories, 2 unknown
- Database writes: `0`
- Canonical assignments: `0`
- Candidate and rollup rows: `0`
- Reconciliation mismatches: `0`

## Repair

The original payload underclassified provider-backed sealed forms. The repair was performed offline against the immutable raw snapshots. It added plural pack, blister, display-box, case, provider-condition, ad hoc lot, card-name, and promo-card protections. No provider calls were repeated.

## Current Truths

- Official sealed category routing is now proven and frozen.
- Broad individual-card acquisition retains raw singles and can retain slabs that appear on the shelf.
- The four graded suffix calls returned provider total `0` for this new set; graded/slab yield is not yet proven for scale.
- Sealed category yield is high and includes packs, decks/kits, boxes, and cases.
- Exact printing and sealed-product identity remain deferred.
- The final append-only backfill plan passes hash preflight but has not been applied.
- No existing warehouse history or app data changed.

## Invariants

- Raw, graded, sealed, lot/bundle, accessory, and unknown evidence remain distinguishable.
- Packaging state never substitutes for product kind.
- Unknown rows are retained without invented identity.
- Acquisition never creates canonical identity or publication eligibility.
- Provider raw payloads remain immutable and replayable.
- Sealed and graded evidence cannot enter raw-single pricing publication.

## What Must Never Be Broken

- Do not require exact printing assignment before warehousing evidence.
- Do not publish directly from provider acquisition.
- Do not merge ad hoc lots with official sealed-product pricing.
- Do not classify promo cards as sealed products merely because the title references ETB, tin, pack, or box packaging.
- Do not discard vague or unresolved rows.
- Do not rewrite prior warehouse history.

## Evidence

- [Live canary report](../../audits/market_listing_warehouse_v2/live_canary_me05_20260803.md)
- [Reconciliation](../../audits/market_listing_warehouse_v2/live_canary_me05_20260803_reconciliation.json)
- [Taxonomy discovery](../../audits/market_listing_warehouse_v2/taxonomy_2026-08-03T22-27-59-787Z/category_discovery.json)
- [Frozen category registry](../../audits/market_listing_warehouse_v2/provider_category_registry_2026-08-03T22-28-21-193Z.json)
- [Provider fetch](../../audits/market_listing_warehouse_v2/warehouse_fetch_2026-08-03T22-29-13-598Z/summary.json)
- [Offline replay](../../audits/market_listing_warehouse_v2/warehouse_classification_replay_2026-08-03T22-37-37-092Z/summary.json)
- [Final backfill plan](../../audits/market_listing_warehouse_v2/warehouse_backfill_plan_2026-08-03T22-37-43-599Z/summary.json)
- [Apply preflight](../../audits/market_listing_warehouse_v2/live_canary_me05_20260803_apply_preflight.json)

## Explicit Next Gate

Approve and execute one bounded append-only warehouse apply from the final replay-derived plan, then read back all table counts, hashes, assignment-null invariants, and publication boundaries. Stop before candidate generation, rollups, canonical assignment, or nightly integration.

After that readback passes, run a separate older-set no-write canary to prove graded/slab yield before scaling V2 acquisition.
