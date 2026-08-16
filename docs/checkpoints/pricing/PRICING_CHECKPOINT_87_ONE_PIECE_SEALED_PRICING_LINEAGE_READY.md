# Pricing Checkpoint 87: One Piece Sealed Pricing Lineage Ready

## Context

Checkpoint 86 durably applied 390 current English One Piece sealed variants
with exact TCGPlayer product mappings. The sealed pricing qualification,
release, release-member, and release-pointer tables remained empty.

## Problem

Canonical identity alone does not prove that a source product has a current,
usable TCGPlayer market price. The warehouse can contain missing observations,
null market prices, stale observations, unexpected subtypes, inactive products,
or non-USD evidence. None may be silently promoted or replaced by another
price field.

## Decision

Audit all 390 durable mappings in one production repeatable-read, read-only
transaction. TCGPlayer `market_price` is the only price authority. A variant is
`qualified_exact` only when its exact product has one latest `normal` subtype,
USD currency, a non-null market price, active current product metadata, and an
observation no more than seven days older than the latest completed current
warehouse sync.

Low, mid, high, and direct-low values do not substitute for a null market
price. No qualification, release, member, pointer, price, publication, or
visibility row is written by this gate.

## Producer And Evidence

- Read-only audit producer commit:
  `ad1050768f1ae28266e9f15b2419f583672610d8`
- Audit fingerprint:
  `a22c8ea9d2a84ab63ac9c90d558a5749cf0f402ae79f947aeb6ac752a20db5ae`
- Source sync:
  `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-15-warehouse`
- Source sync status: `completed`
- Source observed date: `2026-08-15`
- Warehouse products / price rows: 500,193 / 543,669
- Source artifact hash:
  `ae7141664b4a878fab9617dd86fbf2821e241bf73174af05412b09840262bded`

## Result

- Canonical variants audited: 390
- `qualified_exact`: 332
- `blocked_stale`: 4
- `blocked_missing_price`: 38
- `blocked_missing_observation`: 16
- Ambiguous subtype: 0
- Non-USD currency: 0
- Inactive source product: 0
- Canonical-to-current-product lineage drift: 0
- Validation findings: 0

The zero-write plan contains 374 observed-row qualification candidates:

- 332 `qualified_exact`
- 4 `blocked_stale`
- 38 `blocked_missing_price`

The remaining 16 products have no source price observation. The existing
qualification table requires a real `source_price_row_identity`, so these rows
remain explicit artifact-level holds. The system does not invent synthetic
source evidence to make them persistable.

## Safety Proof

- Transaction read-only: true
- Session default read-only: true
- Transaction closed before artifact writes: true
- Transaction write attribution rows: 0
- Protected baseline changes: 0
- Qualification rows before/after: 0 / 0
- Release rows before/after: 0 / 0
- Release-member rows before/after: 0 / 0
- Release-pointer rows before/after: 0 / 0
- Artifact hash mismatches: 0

The first live attempt failed safely before producing results because an
unnecessary global historical-price `count(*)` exceeded the query timeout.
That count was removed, a regression test was added, the repair was frozen at
the producer commit above, and the bounded audit completed in 19 seconds.

## Current Truths

- 332 sealed variants have current exact TCGPlayer market-price evidence.
- 58 sealed variants remain blocked and must not be published.
- All 390 canonical sealed identities remain intact and hidden.
- No sealed price is currently qualified, released, pointed, or visible.
- The existing schema can persist the 374 rows with source observations.
- The 16 missing-observation holds require no schema change for V1 if they
  remain outside the release; they must not receive fabricated row identities.

## Invariants

- Exact canonical variant and exact TCGPlayer product mapping are required.
- Only TCGPlayer `market_price` is authoritative for this lane.
- Freshness is evaluated against the latest completed warehouse sync date.
- Source subtype must be exactly one `normal` lane.
- Missing, null, stale, inactive, ambiguous, and non-USD evidence remains
  blocked.
- Qualification does not itself authorize publication.
- A release may contain only `qualified_exact` variants.
- One Piece remains hidden until a separate release-control gate.

## Tests

- Pricing-lineage targeted contracts: 5 / 5 passed.
- Combined targeted pricing and durable-writer contracts: 10 / 10 passed.
- Full commit-hook shipcheck passed for the initial audit producer.
- Full commit-hook shipcheck passed for the bounded-baseline repair.
- Flutter tests: 614 / 614 passed in both hooks.

## Permanent Artifacts

- `docs/audits/pricing/one_piece_sealed_pricing_lineage_v1/production_read_only_v1/`

## Exact Next Gate

Freeze a database-shaped, fingerprint-locked qualification apply plan for the
374 observed rows. Add a rollback-only insertion canary that covers
`qualified_exact`, `blocked_stale`, and `blocked_missing_price`. Keep all 16
missing-observation products outside the transaction as explicit holds. Do not
create a release, release members, a release pointer, publication rows, or app
visibility in that gate.
