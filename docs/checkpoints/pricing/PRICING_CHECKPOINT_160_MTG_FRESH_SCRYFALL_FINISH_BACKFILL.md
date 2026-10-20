# Pricing Checkpoint 160: MTG Fresh Scryfall Finish Backfill

## Status

`IMPLEMENTED - PRODUCTION ROLLBACK REHEARSAL PASSED, RELEASE PENDING`

## Problem

The latest published pricing qualification run holds 16,254 in-scope MTG
products because they lack an active source mapping. The earlier parent bridge
cannot repair these rows: a TCGPlayer product may lawfully use different
Scryfall parents for Normal and Foil, and many products lack a printed-number
match in the source warehouse.

## Authority

The backfill uses Scryfall's current default-card bulk export updated at
`2026-10-20T09:06:24.827+00:00`, frozen by SHA-256
`c93f1944df45acdec0b6ad4fcd117a3bad83cd786b0484390270549592ce85a1`.
It links only standard `tcgplayer_id` values from English paper cards to
existing active Scryfall parent mappings and their exact Normal or Foil child.

A product is eligible only when every observed pricing lane is Normal or Foil
and each lane collapses to one child. The child must have exactly one active
`mtg_eng_paper_print` identity, must not be provisional, and must not have an
active hidden truth review. An existing `tcgplayer_market` mapping must be
identical or absent. Conflicts block the run, while partial and ambiguous
products remain review-only.

## Frozen Plan and Rehearsal

Pricing run `ba2a0693-30f3-493f-a769-51ef20180ba4` contains 17,039 held lanes
across 16,254 products. The deterministic plan found 768 fully exact products
and 818 missing `productId:finish` mappings, with zero existing conflicts. The
other 15,486 products remain held. The initial crosswalk audit also found 227
products through `tcgplayer_etched_id`; the governed plan excludes them because
etched authority cannot be reused for an ordinary Foil child.

The production-shaped rehearsal inserted all 818 rows inside one transaction,
read back all 818, and rolled back. Printing-mapping counts returned exactly
from 150,902 to 150,084, and MTG TCGPlayer printing-mapping counts returned from
146,166 to 145,348.

Evidence is stored outside the repository under
`C:\grookai_vault_operator_artifacts\pokemon_pricing_repair_20261012\mtg_fresh_scryfall_finish_backfill_20261020`.

## Release Gate

Merge an exact tested commit, regenerate the plan from that commit and the
frozen source hash, and repeat the rollback rehearsal. Apply only with the exact
plan-derived acknowledgement. The writer is insert-only and may touch only
`public.external_printing_mappings`; it must reconcile all inserted rows and
protected counts after commit. Then run a fresh full-scope pricing shadow and
activate customer publication only through the existing pricing release gate.
