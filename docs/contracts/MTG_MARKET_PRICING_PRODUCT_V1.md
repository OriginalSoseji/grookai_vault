# MTG Market Pricing Product V1

## Status

Planning and readiness contract. No MTG publication is authorized by this document.

## Production V1 Scope

MTG Production V1 will support English raw singles with an exact canonical card identity, exact printing/treatment identity, exact Normal or Foil source lane, fresh positive USD TCGPlayer `marketPrice`, and complete provenance through the shared governed pricing read model.

Source catalog presence is not canonical identity. Name matching, collector-number matching without set identity, and single-child inference cannot publish an MTG price.

## Authority Chain

```text
TCGPlayer category/group/product/price evidence
  -> canonical MTG game
  -> canonical set
  -> canonical card print and artwork/treatment identity
  -> exact printing finish
  -> exact source product/subtype mapping
  -> qualification decision
  -> immutable publication snapshot
  -> shared governed pricing read model
  -> supported clients
```

## Required Identity Dimensions

- game
- set and release identity
- collector number, including nonnumeric forms
- card name as corroborating evidence, never sole identity
- language
- treatment or frame identity where it changes the source product
- finish (`normal` or `foil` for V1)
- promo and supplemental-set identity
- source product ID
- source subtype

MTG treatment and finish are separate dimensions. Borderless, showcase, retro frame, extended art, serialized, etched, surge foil, and similar source terms cannot be flattened into a single generic variant field. The canonical import gate must decide which terms define a parent print and which define a child finish before rows are written.

## V1 Exclusions

- sealed products
- slabs and graded products
- non-English printings
- ambiguous or name-only mappings
- products without authoritative set and collector-number evidence
- unsupported treatments or finish combinations
- inferred prices
- Grookai Value or modeled valuation

Excluded source rows remain preserved in the warehouse with an explicit reason. They are not deleted.

## Existing Reusable Infrastructure

- The full TCGCSV source warehouse already stores Magic category `1` groups, products, images, and daily price rows.
- TCGPlayer `productId + subtypeName` remains the source price-row identity.
- Qualification decisions, immutable publication sets, snapshots, provenance, rollback, health checks, and the shared read model are reusable after they become game-aware.

## Non-Reusable Pokémon Assumptions

- category `3`
- Pokémon-only finish vocabulary
- `normal`, `holo`, and `reverse` publication policy
- numeric-only collector normalization
- Pokémon set/source mapping rules
- Pokémon-specific special-variant quarantine language

These assumptions must be parameterized or isolated. They must not be silently broadened.

## Current Gate

Run `MTG_PRICING_READINESS_AUDIT_V1` against production in a read-only transaction. Publication remains blocked until the audit proves canonical MTG identities and exact source mappings exist.

## Exact Next Gate

Create and approve `MTG_CANONICAL_CATALOG_IMPORT_CONTRACT_V1` with:

- authoritative catalog source and license/provenance;
- stable game, set, card, treatment, and finish keys;
- language and promo policy;
- self-hosted image acquisition policy;
- collision and duplicate rules;
- source-to-canonical reconciliation metrics;
- dry-run payload fingerprints;
- zero-mutation preflight and bounded write approval.

No MTG database write or price publication is authorized before that gate.

