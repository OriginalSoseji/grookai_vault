# Pricing Checkpoint 162: MTG Partial Set Extension

## Status

`IMPLEMENTED - FOUNDATIONS COMMANDER ROLLBACK PROOF PASSED`

## Problem

The current Scryfall pricing-gap classifier found 316 TCGPlayer-linked cards in
Foundations Commander that lacked canonical Scryfall mappings. Grookai already
contained three exact cards in the same set, so the existing incremental MTG
worker stopped at `3/319` instead of treating the whole set as absent.

## Repair Contract

The incremental worker now supports an insert-only extension when every
existing parent is accounted for by the planned active Scryfall mapping. Before
selecting new rows it verifies the stable set identity and the retained parent,
identity, printing, parent-mapping, and finish-mapping cores. Any unexplained
parent, changed source owner, identity drift, or collision stops the batch.

The worker preserves the existing set row and its release date. It selects only
rows owned by missing Scryfall parents and still permits no updates, deletes,
image writes, pricing writes, publication writes, or Pokemon mutations.

## Live Rollback Proof

The production-shaped dry run for set `fdc` retained 3 exact parents and
inserted the following rows inside one serializable transaction:

| Row type | Inserted and read back |
|---|---:|
| Card parents | 316 |
| Active identities | 316 |
| Finish children | 316 |
| Scryfall parent mappings | 316 |
| TCGPlayer finish mappings | 316 |

All 1,580 rows matched exactly inside the transaction. The worker then rolled
back and independently proved zero residue for every selected table.

Evidence is stored outside the repository at
`C:\grookai_vault_operator_artifacts\pokemon_pricing_repair_20261012\mtg_catalog_current_delta_20261020\fdc_partial_dry_run`.

## Next Gate

Merge the worker contract, freeze the exact clean commit and payload
fingerprint, run the durable Foundations Commander extension, and rerun the
Scryfall finish classifier so those 316 new parents can feed pricing.
