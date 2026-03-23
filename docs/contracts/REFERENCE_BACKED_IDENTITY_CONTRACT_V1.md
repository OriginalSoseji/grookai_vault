# 🧱 GROOKAI VAULT — REFERENCE-BACKED IDENTITY CONTRACT V1

## Status
ACTIVE

## Type
System Contract

## Scope
Defines how Grookai constructs and owns canonical identity while using external sources (e.g., JustTCG) as reference/enrichment layers.

---

# PURPOSE

This contract resolves a critical architectural boundary:

Grookai must:
- build a canonical identity system
- support fingerprints, provenance, ownership, and condition

While:
- safely using third-party data (JustTCG)
- without becoming a competing data provider
- without depending on external systems for identity truth

---

# CORE PRINCIPLE

Grookai canonizes identity.  
External systems enrich identity.

---

# IDENTITY OWNERSHIP RULE

## Grookai owns identity objects

Grookai must define and own:

- Card
- Card Print
- Sealed Product
- Variant (internal representation if needed)
- Vault Item (ownership instance)

Each object must have:
- a Grookai ID
- stable structure independent of any external provider

---

## External sources do NOT define identity

External APIs (JustTCG, etc.):

- DO NOT define what a card or product is
- DO NOT define canonical naming
- DO NOT define identity relationships
- DO NOT define existence of objects in Grookai

They are strictly:
- reference layers
- enrichment layers

---

# SOURCE LAYER MODEL

Grookai must implement a strict separation:

## Layer 1 — Canonical Identity (Grookai)

Examples:

```text
card_print
sealed_product
vault_items
```

This layer must:

- exist independently
- be replayable from Grookai migrations
- not require external APIs to exist

---

## Layer 2 — External Source Bindings

Examples:

```text
external_mappings
sealed_product_sources
```

Fields:

```text
grookai_id
source (justtcg)
source_id
synced_at
```

Rules:

- multiple sources may attach to one Grookai object
- no source owns the object
- sources are replaceable

---

## Layer 3 — Market / Reference Data

Examples:

```text
justtcg_variant_prices_latest
price history
insights
```

Rules:

- always derived or referenced
- never canonical
- never treated as identity

---

# PROHIBITED PATTERNS

The following are forbidden:

## 1. External-as-canonical

Do NOT:

- treat JustTCG card IDs as Grookai identity
- create objects only because a vendor has them
- mirror vendor catalogs as your truth layer

---

## 2. Dataset replication

Do NOT:

- expose full vendor datasets
- create bulk browseable catalogs sourced entirely from one vendor
- allow exports that reconstruct vendor data

---

## 3. Identity dependence

Do NOT:

- require JustTCG for identity existence
- block core functionality if vendor data is missing

---

# REQUIRED BEHAVIOR

## 1. Identity-first creation

Grookai objects must be created from:

- printed identity
- internal normalization rules
- ingestion pipelines (verified)

External sources may assist but never define.

---

## 2. Reference-backed enrichment

External data must be attached as:

```text
reference_backed
```

Meaning:

- used for UI
- used for pricing
- used for insights
- not used as truth

---

## 3. Replaceability

The system must support:

- adding new sources
- removing existing sources
- merging multiple sources

Without:

- breaking identity
- breaking ownership
- breaking provenance

---

# FINGERPRINT + PROVENANCE COMPATIBILITY

This contract ensures:

Fingerprints attach to:

- Grookai card or card_print

NOT:

- external source rows

---

Provenance attaches to:

- Grookai vault_items (ownership episodes)

NOT:

- vendor data

---

Ownership timeline must remain valid even if:

- JustTCG disappears
- pricing disappears
- external mapping breaks

---

# SYSTEM INVARIANTS

1. Grookai identity must exist without external APIs
2. External data must never become identity truth
3. Every Grookai object may have 0..N external bindings
4. Removing a source must not delete identity
5. Fingerprints and provenance must attach to Grookai-owned objects only

---

# TERMINOLOGY

Use these consistently:

- Canonical Identity → Grookai-owned object model
- Reference Data → external data used for enrichment
- Source Binding → mapping between Grookai object and external ID
- Reference-backed → object enriched by external data but not defined by it

---

# RESULT

After applying this contract:

- Grookai owns the system
- external APIs support the system
- fingerprints and provenance remain stable
- the system is extensible and replaceable
- no vendor lock-in
- no accidental competition

---

# FINAL PRINCIPLE

Grookai defines what things are.
External sources help describe what they are worth.
