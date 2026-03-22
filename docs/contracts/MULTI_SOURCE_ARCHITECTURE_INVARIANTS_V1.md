# MULTI_SOURCE_ARCHITECTURE_INVARIANTS_V1

Status: LOCKED  
Type: L3 Invariant Contract  
Scope: Governs all multi-source data integration within Grookai Vault

---

# PURPOSE

This contract ensures Grookai Vault remains:

- source-independent
- canonically authoritative
- resilient to upstream failure
- structurally extensible

It prevents architectural drift into single-source dependency.

---

# CORE PRINCIPLE

Grookai does not depend on any external data source.

Grookai integrates multiple imperfect sources and produces a superior, reconciled system.

---

# INVARIANT 1 — CANONICAL IDENTITY AUTHORITY

Grookai identity is the only source of truth.

Rules:

- `card_prints` defines identity
- external IDs must never define identity
- all sources attach via explicit mapping
- no implicit identity inference allowed

Violation = CRITICAL

---

# INVARIANT 2 — SOURCE ISOLATION

Each external source must exist in its own domain.

Rules:

- no mixing of source data at ingestion
- no shared tables across sources
- each source has:
  - its own snapshot tables
  - its own latest tables
  - its own metadata

Example:

- ebay_* tables
- justtcg_* tables

Violation = CRITICAL

---

# INVARIANT 3 — NO SOURCE COLLAPSE

Grookai must never collapse multiple sources into a single field prematurely.

Forbidden:

```
price = merged_value
```

Required:

```
price_by_source = {
ebay,
justtcg,
future_sources
}
```

Aggregation must be explicit and reversible.

Violation = CRITICAL

---

# INVARIANT 4 — EXTERNAL DATA IS NON-CANONICAL

External data is always treated as reference data.

Rules:

- external data must never overwrite canonical fields
- external data must be attributable to source
- raw payloads must be preserved where possible

From doctrine:
External APIs are references only.

Violation = CRITICAL

---

# INVARIANT 5 — APPEND-ONLY INGESTION

All ingestion pipelines must follow snapshot → latest pattern.

Rules:

- snapshots are append-only
- latest tables are derived
- no destructive writes to historical data
- all ingestion must be replayable

Violation = CRITICAL

---

# INVARIANT 6 — MULTI-SOURCE COMPATIBILITY

All systems must be designed to support additional sources.

Rules:

- schema must not assume a single source
- aggregation must accept N sources
- adding a new source must not require rewriting existing tables

Future sources include:

- TCGPlayer
- CardMarket
- internal Grookai market data

Violation = HIGH

---

# INVARIANT 7 — SOURCE-AWARE AGGREGATION

All derived values must be source-aware.

Rules:

- aggregation logic must track input sources
- disagreements between sources must be preserved, not hidden
- Grookai Value must be explainable

Example:

```
Grookai Value = function(
ebay_signal,
justtcg_signal,
confidence_weights
)
```

Violation = HIGH

---

# INVARIANT 8 — FAILURE ISOLATION

Failure of any external source must not break the system.

Rules:

- system must operate with partial data
- missing source data must degrade gracefully
- fallback strategies must exist

Violation = HIGH

---

# INVARIANT 9 — NO UI SOURCE LEAKAGE

Users must not confuse external data with Grookai truth.

Rules:

- source attribution must exist OR
- values must be normalized through Grookai Value

Grookai must remain the authority.

Violation = MEDIUM

---

# INVARIANT 10 — MAPPING EXPLICITNESS

All source connections must go through explicit mappings.

Rules:

- use `external_mappings`
- enforce uniqueness on (source, external_id)
- never rely on fuzzy joins for identity

Violation = CRITICAL

---

# INVARIANT 11 — FUTURE VARIANT COMPATIBILITY

System must support variant-level pricing.

Rules:

- condition and printing must be preserved where available
- schema must allow future `card_printing_id`
- no flattening of variant data into card_print

Violation = HIGH

---

# INVARIANT 12 — RATE & COST AWARENESS

External integrations must respect operational limits.

Rules:

- support batching where available
- minimize redundant calls
- design ingestion around rate limits

Violation = MEDIUM

---

# ARCHITECTURAL MODEL

```
Canonical Identity Layer (Grookai)
↓
External Mapping Layer
↓
Source Domains

* eBay
* JustTCG
* Future sources
  ↓
  Aggregation Engine (Grookai Value)
  ↓
  Application / UI
```

---

# SUCCESS CRITERIA

System is compliant if:

- identity is fully Grookai-owned
- each source is independently queryable
- aggregation is reversible and explainable
- system operates when any single source is removed

---

# FAILURE CONDITIONS

System is considered compromised if:

- any source becomes required for operation
- identity depends on external data
- sources are merged at ingestion
- pricing becomes non-attributable

---

# RESULT

Grookai Vault becomes:

- source-independent
- legally safe
- structurally scalable
- resistant to upstream failure
- capable of producing superior market intelligence

---

# LOCK

This contract is L3.

All future pricing, ingestion, and integration work must comply.

Any violation requires explicit justification and checkpoint override.
