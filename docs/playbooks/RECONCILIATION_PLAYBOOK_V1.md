# GROOKAI VAULT — RECONCILIATION PLAYBOOK V1

## 1. TITLE

GROOKAI VAULT — RECONCILIATION PLAYBOOK V1  
Status: ACTIVE  
Scope: Historical artifact reconciliation between `vault_items` (ownership episodes) and `vault_item_instances` (GVVI object identity)

## 2. PURPOSE

This playbook defines how Grookai handles **historical ambiguity** during the transition from:

```text
bucket ownership (vault_items)
```

to:

```text
object ownership (vault_item_instances / GVVI)
```

The goal is to:

- preserve historical meaning
- prevent false precision
- enable safe future migration
- maintain trust and auditability

This aligns with core migration best practices:

- preserve original data when uncertain
- document mapping decisions
- validate before transforming ambiguous data ([Datafold][1])

## 3. CORE PRINCIPLE (NON-NEGOTIABLE)

```text
NEVER INVENT PRECISION THAT DOES NOT EXIST
```

If a mapping between `vault_item_id` and `GVVI` cannot be proven:

```text
DO NOT GUESS
DO NOT ASSIGN
DO NOT DUPLICATE
```

Instead:

```text
PRESERVE AS HISTORICAL
```

## 4. IDENTITY MODEL

### 4.1 Canonical Object Identity

```text
GVVI → vault_item_instances.gv_vi_id
```

Represents:

- one real owned object
- current ownership truth
- future system anchor

### 4.2 Historical Episode Identity

```text
vault_items.id
```

Represents:

- ownership episode
- historical grouping
- legacy ingestion context

### 4.3 Rule

```text
GVVI = object truth
vault_item_id = historical context
```

Both are valid. They must not be conflated.

## 5. CLASSIFICATION FRAMEWORK

Every `vault_item_id` consumer MUST be classified into exactly one category:

### A. KEEP AS HISTORICAL EPISODE REFERENCE

Use when:

- data represents ownership episode
- meaning depends on the original grouped context
- mapping to object identity is not required

Examples:

- legacy ownership logs
- bulk import metadata
- historical notes

### B. MIGRATE LATER TO GVVI

Use when:

- data is conceptually object-level
- mapping can become deterministic in the future

Examples:

- fingerprint bindings
- object-level listings
- condition tracking (future)

### C. SPECIAL RECONCILIATION REQUIRED

Use when:

- mapping is ambiguous
- data could belong to multiple instances
- forcing mapping risks corruption

Examples:

- scans tied to multi-quantity buckets
- media uploads without object association
- partial condition data

### D. LEGACY / DEAD

Use when:

- consumer is unused
- no runtime dependency exists

## 6. DETERMINISTIC MAPPING RULE

A `vault_item_id → GVVI` mapping is allowed ONLY IF:

```text
1 vault_item row → 1 instance → 1 artifact
```

Otherwise:

```text
mapping = INVALID
```

## 7. AMBIGUITY HANDLING

When ambiguity exists:

### 7.1 Do NOT:

```text
randomly assign
duplicate artifacts
guess mapping
delete data
```

### 7.2 Do:

```text
mark as unassigned
preserve original reference
expose ambiguity explicitly
```

## 8. SYSTEM-SPECIFIC RULES

### 8.1 SCANS / CONDITION SNAPSHOTS

Nature: object-level

#### Rule:

```text
IF 1:1 → migrate to GVVI
ELSE → store as unassigned scan
```

### 8.2 FINGERPRINTS / PROVENANCE

Nature: object-level, high integrity

#### Rule:

```text
ONLY migrate when deterministic
ELSE → preserve as historical fingerprint
```

### 8.3 USER MEDIA / IMAGES

Nature: mixed

#### Rule:

```text
IF tied to specific object → migrate
ELSE → keep as historical media
```

### 8.4 CONDITION EDITS

Nature: often aggregate

#### Rule:

```text
freeze as historical condition
future edits must be GVVI-based
```

## 9. RECONCILIATION STRATEGIES

### Strategy 1 — Historical Preservation

```text
stay on vault_item_id permanently
```

Used for:

- audit
- provenance history
- legacy meaning

### Strategy 2 — Deterministic Migration

```text
move to GVVI only when provable
```

Used for:

- safe 1:1 mappings

### Strategy 3 — User-Assisted Mapping

```text
user selects correct object
```

Used for:

- ambiguous but valuable data

### Strategy 4 — Deferred Resolution

```text
leave unassigned until future logic exists
```

Used for:

- ambiguous multi-object artifacts

## 10. HIGH-RISK SYSTEMS

The following systems require strict adherence to this playbook:

- scans / condition snapshots
- fingerprint bindings
- provenance history
- user media
- listing systems
- condition editing flows

## 11. HARD RULES

1. `vault_item_instances` is the ONLY ownership truth
2. `vault_item_id` remains valid ONLY for historical context
3. No migration without deterministic proof
4. Ambiguity must be preserved
5. New systems MUST use GVVI
6. Historical systems MAY use `vault_item_id`

## 12. MIGRATION SAFETY RULES

- no silent reassignment
- no bulk reassignment
- no lossy transformation
- no forced normalization
- all mappings must be auditable

## 13. VALIDATION REQUIREMENT

All reconciliation must include:

```text
pre-check → mapping rule → post-check
```

Reconciliation must ensure:

```text
no data loss
no duplication
no semantic corruption
```

Data reconciliation ensures consistency and reduces migration risk by validating transformations across systems ([Quinnox][2])

## 14. OUTPUT EXPECTATIONS

For each system:

- classification
- mapping rule
- fallback behavior
- future migration plan

All decisions must be:

```text
documented
versioned
justified
```

## 15. RESULT

Grookai Vault will:

- preserve historical truth
- enforce object-level ownership
- avoid false precision
- enable safe future features

## 16. NEXT STEP

Select one **safe deterministic consumer (Category B)** and perform first controlled migration to GVVI.

[1]: https://www.datafold.com/data-quality-guide/data-quality-during-data-migrations?utm_source=chatgpt.com "Data quality during data migrations"
[2]: https://www.quinnox.com/blogs/data-reconciliation?utm_source=chatgpt.com "Data Reconciliation: Best Practices, Challenges & Use Cases"
