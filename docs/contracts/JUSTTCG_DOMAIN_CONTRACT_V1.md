# JUSTTCG_DOMAIN_CONTRACT_V1

Status: LOCKED  
Type: L3 Domain Contract  
Scope: Defines the complete JustTCG integration domain within Grookai Vault  
Authority: Subordinate to MULTI_SOURCE_ARCHITECTURE_INVARIANTS_V1

---

# PURPOSE

Define a deterministic, source-isolated, legally compliant integration of JustTCG that:

- preserves Grookai canonical authority
- supports variant-level pricing
- enables bulk ingestion and analytics
- prevents architectural drift and source dependency

This contract MUST be satisfied before any schema, worker, or UI implementation.

---

# DOMAIN DEFINITION

The JustTCG Domain is:

A **variant-level, source-isolated, non-canonical market intelligence layer**  
attached to Grookai identity via explicit mappings.

---

# CORE PRINCIPLE

JustTCG provides structured pricing signals.

Grookai produces truth.

---

# SECTION 1 — ROLE OF JUSTTCG

## Responsibilities

JustTCG provides:

- condition-specific pricing  
- printing-specific pricing  
- variant-level pricing objects  
- optional price history and analytics  
- bulk lookup capabilities  

Evidence:
- variants include condition + printing filters :contentReference[oaicite:0]{index=0}  
- variantId uniquely identifies condition + printing combination :contentReference[oaicite:1]{index=1}  

---

## Non-Responsibilities

JustTCG does NOT provide:

- canonical identity
- authoritative catalog
- slab pricing
- final pricing truth

---

# SECTION 2 — CANONICAL BOUNDARY

## Hard Rule

JustTCG must NEVER modify or influence:

- card_prints
- canonical_set_code
- gv_id
- identity relationships

## Allowed Path

```
card_print
→ external_mappings
→ justtcg_domain
```

No other access path is permitted.

---

# SECTION 3 — DATA OWNERSHIP

## Grookai Owns

- identity layer
- mapping layer
- aggregation logic
- derived pricing outputs

## JustTCG Owns

- raw pricing data
- variant structure
- analytics fields

## Enforcement

- raw payload must be preserved
- source must always be attributable
- no transformation into canonical truth

---

# SECTION 4 — VARIANT MODEL (CRITICAL)

## Upstream Truth

JustTCG pricing exists at the VARIANT level:

```
variant = (card + condition + printing [+ language])
```

## Required Behavior

- variant dimension must be preserved
- condition must not be flattened
- printing must not be flattened

## Forbidden

```
variant → card_print collapse
```

---

# SECTION 5 — STORAGE MODEL

The domain MUST implement three layers:

## 1. Variant Identity Layer

- external variant_id
- linked card_print_id
- condition
- printing
- language (nullable)

## 2. Snapshot Layer (append-only)

- all ingested records
- timestamped
- raw payload stored
- no updates or deletes

## 3. Latest Layer (derived)

- resolved current state per variant
- rebuilt from snapshots
- idempotent

---

# SECTION 6 — SOURCE ISOLATION

## Rule

All JustTCG data must exist in isolated tables:

```
justtcg_*
```

## Forbidden

- inserting into ebay_* tables
- inserting into shared pricing tables
- modifying existing pricing schema

---

# SECTION 7 — INGESTION MODEL

## Requirements

- bulk ingestion via POST endpoints
- resolve using external_mappings
- idempotent writes
- replay-safe execution

## API Capability

- bulk card + variant lookup supported :contentReference[oaicite:2]{index=2}  

## Update Cadence

- aligned to ~6 hour refresh cycle
- no real-time dependency

---

# SECTION 8 — AGGREGATION BOUNDARY

## Rule

JustTCG MUST NOT:

- directly feed Grookai Value
- override eBay data
- replace pricing logic

## Role

JustTCG acts as:

```
input_signal → aggregation engine (future phase)
```

---

# SECTION 9 — FAILURE ISOLATION

If JustTCG is unavailable:

- system must continue operating
- no UI breakage
- fallback to existing pricing (eBay)

---

# SECTION 10 — FUTURE COMPATIBILITY

The domain MUST support:

- card_print_id (current)
- card_printing_id (future)
- condition-aware pricing
- slab derivation system (future)

---

# SECTION 11 — LEGAL COMPLIANCE

## Required

- no redistribution of raw JustTCG dataset
- no public API replication
- no exposure of full dataset externally

## Allowed

- internal use
- derived values
- aggregated insights

---

# SECTION 12 — UI GOVERNANCE

UI must NOT:

- present JustTCG as canonical truth
- expose raw source data as Grookai data

UI must:

- attribute source OR
- normalize via Grookai Value

---

# SECTION 13 — RATE LIMIT & COST CONTROL

## Requirements

- batch requests where possible
- avoid redundant ingestion
- respect API limits and quotas

JustTCG provides rate metadata for tracking usage :contentReference[oaicite:3]{index=3}  

---

# SECTION 14 — DISCOVERY & SEARCH SUPPORT (OPTIONAL)

JustTCG MAY be used for:

- fallback card lookup
- variant discovery
- search assistance

But MUST:

- resolve back to canonical identity
- never bypass Grookai resolver

---

# SECTION 15 — SUCCESS CRITERIA

This domain is valid only if:

- variant dimension is preserved
- source data is isolated
- identity remains Grookai-owned
- ingestion is replayable
- system operates without JustTCG

---

# SECTION 16 — FAILURE CONDITIONS

The system is considered broken if:

- JustTCG defines identity
- variant data is flattened
- sources are merged at ingestion
- pricing becomes non-attributable
- system depends on JustTCG to function

---

# FINAL VERDICT

```
JUSTTCG_DOMAIN_STATUS:

* Variant Layer: REQUIRED
* Source Isolation: REQUIRED
* Canonical Impact: NONE
* Aggregation: DEFERRED
* Legal Risk: CONTROLLED
* Safe to Proceed: YES
```

---

# LOCK

This is an L3 contract.

No schema, worker, or UI implementation may proceed without full compliance.

All violations require explicit checkpoint override.
