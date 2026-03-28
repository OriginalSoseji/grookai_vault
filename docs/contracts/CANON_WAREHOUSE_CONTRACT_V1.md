# CANON_WAREHOUSE_CONTRACT_V1

## Status

ACTIVE

## Purpose

This contract defines the Canon Warehouse system for Grookai Vault.

The warehouse is a staging system that allows:

* ingestion of missing cards
* ingestion of missing images
* ingestion of variant/finish evidence

without directly mutating canonical truth.

---

## Core Principle

The warehouse stores **evidence, not truth**.

All data in the warehouse must be:

* non-canonical
* non-authoritative
* subject to interpretation and promotion

---

## System Separation

Grookai operates three layers:

1. Warehouse Layer
2. Interpretation Layer
3. Canon Layer

Flow:

```text
Warehouse -> Interpreter -> Promotion -> Canon
```

Warehouse must never bypass this flow.

---

## Warehouse Objects

The warehouse may contain:

* candidate cards
* candidate images
* candidate variants
* scan evidence
* external source evidence

These must NOT directly map to canonical tables.

---

## State Model

Each warehouse item must exist in one of the following states:

* RAW
* NORMALIZED
* CLASSIFIED
* PROMOTABLE
* REJECTED
* PROMOTED

---

## Canon Boundary Rule

The warehouse MUST NOT:

* insert into `card_prints`
* insert into `card_printings`
* update canonical identity
* override canonical images

All canonical changes must occur only through promotion.

---

## Interpretation Requirement

Before promotion:

* all candidates MUST pass through the interpreter
* classification must result in:

  * ROW
  * CHILD
  * BLOCKED

Blocked items MUST NOT be promoted.

---

## Promotion Rules

Promotion is the ONLY path into canon.

Promotion must:

* be deterministic
* reference contracts
* include provenance
* be auditable

Promotion may:

* create new `card_prints` rows
* create new `card_printings` rows
* update canonical images (future)

---

## Image Rules

User images are:

* evidence only
* never canonical by default

Images must pass:

* normalization
* validation
* promotion

before becoming canonical or printing-level assets.

---

## External Source Rule

External APIs may populate warehouse data but:

* do not define identity
* do not define canon
* do not bypass interpreter

---

## Invariants

1. Warehouse never defines truth.
2. Canon is only modified through promotion.
3. Interpreter is mandatory before promotion.
4. User uploads are evidence only.
5. Warehouse and canon must remain fully separated.
6. No direct writes to canonical tables from warehouse.
7. All promotions must be auditable.

---

## Result

This contract enables safe expansion of the canonical database while preserving:

* identity integrity
* deterministic behavior
* system stability
