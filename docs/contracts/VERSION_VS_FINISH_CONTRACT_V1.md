# VERSION_VS_FINISH_CONTRACT_V1

## Status
ACTIVE

## Purpose

This contract defines the **interpretation layer** for Grookai Vault.

It determines how any observed distinction is classified BEFORE it reaches:

- canonical identity (`card_prints`)
- child printing layer (`card_printings`)

This contract is the sole authority for deciding:

- new canonical row vs child printing vs blocked

---

## Core Principle

The physical card is the source of truth.

All identity decisions must be derived from the real, printed card — not from external APIs, naming, or source structure.

---

## Canonical Version Rule

A new `card_prints` row MUST be created when the distinction represents a **different issued version of the card**.

A version difference exists when:

- the card represents a distinct release or print run
- the card has independent collector identity
- the distinction is not purely surface treatment

### Version includes:

- stamped cards (prerelease, staff, league, etc.)
- first edition vs unlimited
- print-run differences
- Japanese edition differences (no rarity vs rarity)
- promo vs set releases
- alternate art
- collector number differences (existing rule)
- variant_key distinctions (existing rule)

### Version invariant:

Even if artwork, number, or text are identical, a distinct issued version MUST be a new canonical row.

---

## Finish Rule

A `card_printings` row is allowed ONLY when:

- the canonical card identity remains unchanged
- the distinction is purely surface treatment
- the distinction is within the bounded finish vocabulary

### Allowed finishes:

- normal
- holo
- reverse
- pokeball
- masterball

### Finish invariant:

Finish MUST NOT change card identity.

---

## Explicit Non-Finish Rule

The following MUST NEVER be treated as finishes:

- stamps
- edition differences (first edition, unlimited)
- distribution-based variants
- print-run identifiers
- release versions

These MUST be treated as canonical version differences.

---

## Upstream Sibling Resolution Rule

External systems may expose multiple card objects representing the same printed card family.

Examples:
- JustTCG sibling card IDs
- suffix labels (e.g. "Poke Ball Pattern", "Master Ball Pattern")

These MUST be treated as:

- evidence
- discovery signals

They MUST NOT:

- create canonical rows automatically
- create child printings automatically
- override Grookai identity rules

Resolution MUST follow this contract.

---

## Decision Algorithm

For any distinction:

1. Evaluate the physical card reality (or strongest available evidence).
2. Determine:

   A. Is this a different issued version of the card?
   → YES → create new `card_prints` row

   B. Is this the same card with a different surface finish?
   → YES → create `card_printings` child

   C. Is this distinction not representable within finish_keys?
   → YES → BLOCKED

   D. Cannot determine
   → BLOCKED

---

## Block Rule

If classification cannot be proven:

- no canonical row is created
- no child printing is created
- no mapping is applied

Unresolved distinctions MUST remain blocked.

---

## Pattern Distinction Rule

Any distinction expressed only through:

- naming patterns
- suffix labels
- external categorization

MUST NOT:

- automatically create canonical rows
- automatically create child printings

If not representable within finish_keys:

→ BLOCKED pending explicit rule or promotion

---

## External Source Boundary

External systems:

- JustTCG
- TCGdex
- PokemonAPI

MUST NOT define:

- canonical identity
- version classification
- child classification

They are input signals only.

---

## Relationship To Existing Contracts

This contract sits between:

- GV_SCHEMA_CONTRACT_V1 (identity authority)
- CHILD_PRINTING_CONTRACT_V1 (child layer authority)

Flow:

GV_SCHEMA_CONTRACT_V1  
↓  
VERSION_VS_FINISH_CONTRACT_V1  
↓  
CHILD_PRINTING_CONTRACT_V1  
↓  
PRINTING_MODEL_V2  

This contract MUST be consulted BEFORE any child or canonical decision.

---

## Invariants

1. Physical card truth overrides all external representations.
2. Version differences always create new canonical rows.
3. Finish differences are the only valid child printings.
4. Stamps are version differences.
5. Edition differences are version differences.
6. External sibling IDs are evidence only.
7. Naming patterns are not authority.
8. Unclear cases remain blocked.
9. Child printings MUST NOT absorb version differences.
10. Canon MUST NOT drift due to source structure.

---

## Result

This contract establishes a deterministic interpretation layer.

It eliminates ambiguity between:

- canonical identity
- child printing
- unresolved distinctions

All future identity decisions MUST pass through this layer.
