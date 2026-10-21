# Pricing Checkpoint 161: MTG Scryfall Gap Classification

## Status

`IMPLEMENTED - LIVE READ-ONLY CLASSIFICATION PASSED`

## Problem

After the exact Scryfall finish backfill inserted 818 mappings, the plan still
held 15,486 MTG products under one generic
`incomplete_or_ambiguous_product` reason. That label could not distinguish
missing provider authority, missing catalog rows, unsupported finish lanes, or
true canonical ambiguity, so the completion agent could measure the backlog but
could not route a high-volume repair.

## Classification Contract

The plan now records a deterministic reason and evidence counts for each held
finish lane. The classifier follows the same authority chain as the writer:
standard Scryfall TCGPlayer link, compatible Normal or Foil support, active
Scryfall canonical parent mapping, exact active finish child, request-visible
parent, non-provisional printing, one active MTG identity, and no hidden truth
review. Selection and write boundaries are unchanged.

## Live Result

The read-only plan against pricing run
`ba2a0693-30f3-493f-a769-51ef20180ba4` and Scryfall bulk SHA-256
`c93f1944df45acdec0b6ad4fcd117a3bad83cd786b0484390270549592ce85a1`
classified the held lanes as:

| Classification | Lanes |
|---|---:|
| Missing Scryfall product link | 14,296 |
| Etched-only Scryfall product link | 1,148 |
| Missing canonical Scryfall mapping | 762 |
| Ambiguous eligible finish children | 13 |
| Missing canonical finish child | 1 |

The plan found the already-applied 818 mappings exactly, selected zero new
writes, and found zero conflicts. It performed no database writes.

The 762 missing canonical Scryfall mapping lanes cover 597 products. The largest
groups are Commander: Foundations (316 lanes), Secret Lair Drop Series (298),
The List Reprints (64), Star Trek (55), and Special Guests (20). These rows
belong to canonical catalog admission or exact parent-mapping work before finish
mapping can continue.

Evidence is stored outside the repository at
`C:\grookai_vault_operator_artifacts\pokemon_pricing_repair_20261012\mtg_backlog_classifier_20261020\live_plan`.

## Next Repair Order

1. Reconcile the 597 linked products against current canonical MTG catalog
   admission and create only exact Scryfall parent mappings or missing catalog
   rows.
2. Rerun this classifier and the finish backfill to consume newly exact parents.
3. Separate the 1,148 etched-only lanes into an explicit etched pricing policy;
   do not reuse etched authority for ordinary Foil mappings.
4. Build a second provider crosswalk for the 14,296 products for which Scryfall
   supplies no TCGPlayer product identifier.
