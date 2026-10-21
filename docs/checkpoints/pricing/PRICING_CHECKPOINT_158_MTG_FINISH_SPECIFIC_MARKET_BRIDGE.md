# Pricing Checkpoint 158: MTG Finish-Specific Market Bridge

## Status

`IMPLEMENTED - PRODUCTION SCHEMA APPLIED, PUBLICATION PENDING`

## Problem

The current pricing backlog contains 1,184 active MTG TCGPlayer products whose
Normal and Foil mappings point to separate canonical Scryfall parents. These
products account for 2,368 current price observations. The existing publication
view requires one parent-level `external_mappings` row for each product, so it
rejects both finishes even though each `productId:finish` mapping is exact.

Product 2810 demonstrates the valid split: `2810:normal` resolves to collector
number `115`, while `2810:foil` resolves to the foil-only `115★` parent. Choosing
one parent for the product would falsify the other finish's lineage.

## Repair

Migration `20261018170000_mtg_tcgplayer_finish_publication_bridge_v1.sql`
adds a separate `mtg_printing_mapping_id` foreign-key lane across pipeline
candidates, qualification decisions, and publication snapshots. Candidate V5
uses an active exact `external_printing_mappings` row only for category 1 rows
that lack a parent mapping. It requires Normal or Foil, one active English paper
identity, a nonprovisional matching child, and no hidden truth review.

The policy waives parent and generic variant-assignment IDs only when this exact
printing-mapping FK and method are present. Database statement triggers
revalidate the source observation, current full sync, product, mapping, parent,
child, finish, price, and visibility at both decision and snapshot insertion.

Migration `20261018193000_mtg_finish_snapshot_lineage_guard_fix_v1.sql`
keeps the full incoming-snapshot validation and links it to the exact already
validated decision by decision, run, observation, printing, and mapping IDs. It
removes a redundant nested validator whose combined PostgreSQL predicate
rejected valid snapshot rows during the first full shadow.

## Verification

- Focused pricing contracts: 174 passed, 0 failed.
- Node syntax and repository diff checks passed.
- The schema migration is present in production and a live V5 readback returned
  both Normal and Foil candidates for split product 2810 with separate exact
  `mtg_printing_mapping_id` values. Neither row uses a parent mapping or generic
  variant assignment.
- No qualification decisions or customer-facing price snapshots were activated
  by the schema change.
- Live readback receipt:
  `C:\grookai_vault_operator_artifacts\pokemon_pricing_repair_20261012\mtg_finish_bridge_20261018\live_bridge_readback.json`.

## Release Gate

Merge the exact commit, reconcile migration history for only
`20261018170000`, and read back the view, columns, constraints, and triggers.
Run a full exact-commit shadow against the latest completed current source sync.
The shadow must preserve all existing published rows and recover only rows that
carry `mtg_printing_mapping_id` with zero broken traces. Activate production
only after the normal coverage and reconciliation guards pass.
