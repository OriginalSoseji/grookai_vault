# Cross-TCG Sealed Catalog Readiness V1

- Audit: `CROSS_TCG_SEALED_CATALOG_READINESS_AUDIT_V1`
- Policy: `CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1`
- Producer commit: `c2337c94b63f87700a4efc8e1b8e114653659609`
- Branch: `agent/sealed-catalog-readiness-v1`
- Source transaction read-only: `on`
- Active products classified: `499872`
- Database mutations: `0`
- Canonical/publication authority: `false`

## Portfolio Summary

| Portfolio | Active products | Sealed candidates | Cards | Ambiguous | Excluded |
|---|---:|---:|---:|---:|---:|
| Magic: The Gathering | 117267 | 2887 | 113463 | 900 | 17 |
| Pokemon | 32547 | 1902 | 29651 | 990 | 4 |
| Pokemon Japan | 30360 | 261 | 30039 | 60 | 0 |
| One Piece Card Game | 7261 | 338 | 6857 | 66 | 0 |

## Entire Warehouse

- `sealed_candidate`: 10007
- `nonsealed_card`: 427052
- `ambiguous_review`: 9836
- `excluded_non_tcg_product`: 52977
- Presale source products: 1939
- Source categories represented: 82

## Package Forms

- `booster_box`: 1582
- `bundle`: 252
- `case`: 1264
- `collection`: 1105
- `deck`: 1474
- `deck_display`: 429
- `display`: 194
- `kit`: 498
- `pack`: 2012
- `promo_pack`: 380
- `sleeved_pack`: 229
- `tin`: 604

## Ambiguity

- Total review queue: 9836
- 6273: No positive individual-card or sealed-product evidence was found.
- 2234: Sealed or contents wording exists, but the package form is unresolved.
- 1312: Generic packaging language is insufficient without a precise form or contents evidence.
- 15: A package-form phrase is combined with an accessory name but has no explicit TCG contents evidence.
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
