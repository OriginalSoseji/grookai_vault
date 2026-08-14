# Cross-TCG Sealed Catalog Readiness V1

- Audit: `CROSS_TCG_SEALED_CATALOG_READINESS_AUDIT_V1`
- Policy: `CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1`
- Producer commit: `44b51d9a604d9f15b6865e30c1b6eafc3f5de6d4`
- Branch: `agent/sealed-catalog-readiness-v1`
- Source transaction read-only: `on`
- Active products classified: `499872`
- Database mutations: `0`
- Canonical/publication authority: `false`

## Portfolio Summary

| Portfolio | Active products | Sealed candidates | Cards | Ambiguous | Excluded |
|---|---:|---:|---:|---:|---:|
| Magic: The Gathering | 117267 | 1875 | 113463 | 1587 | 342 |
| Pokemon | 32547 | 2089 | 28398 | 1768 | 292 |
| Pokemon Japan | 30360 | 218 | 30039 | 73 | 30 |
| One Piece Card Game | 7261 | 261 | 6857 | 142 | 1 |

## Entire Warehouse

- `sealed_candidate`: 9043
- `nonsealed_card`: 449338
- `ambiguous_review`: 29450
- `excluded_non_tcg_product`: 12041
- Presale source products: 1939
- Source categories represented: 82

## Package Forms

- `booster_box`: 1594
- `bundle`: 545
- `case`: 808
- `collection`: 405
- `deck`: 1371
- `deck_display`: 261
- `display`: 253
- `kit`: 223
- `pack`: 2194
- `promo_pack`: 358
- `sleeved_pack`: 240
- `tin`: 792

## Ambiguity

- Total review queue: 29450
- 18776: No positive individual-card or sealed-product evidence was found.
- 6092: Generic packaging language is insufficient without a precise form or contents evidence.
- 4580: Sealed or contents wording exists, but the package form is unresolved.
- 2: Custom, repack, lot, or retailer-bundle language requires human review.

An absent card number is not sealed evidence. Individual-card fields take precedence over package-like words, including One Piece DON!! cards and promotional card suffixes. Generic packaging words and retailer/custom groupings stay in review.

## Boundaries

- Source access used one explicit read-only transaction and closed before artifact output.
- No migration, canonical mapping, Storage operation, image change, price publication, app visibility, release action, or Vault action occurred.
- Sealed candidates remain separate from card-print identity.
- Samples are deterministic and bounded; the audit does not copy the full warehouse.

## Decision

This gate proves source classification readiness only. It does not authorize a canonical sealed-domain schema or publication.

Exact next gate: design a bounded canonical sealed-domain schema and migration plan, then review it before any canary apply.
