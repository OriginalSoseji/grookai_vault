# CANON_PIPELINE_V1_COMPLETE

## Date

`2026-03-30`

## Status

`LOCKED`

---

## Summary

Grookai Vault now has a fully operational, deterministic, end-to-end canonical pipeline that converts real-world card submissions into canon-safe database entries with validated identity, structured metadata, normalized assets, and controlled execution.

## Pipeline Overview

```text
Submission
→ Metadata Extraction
→ Printed Modifier Detection
→ Interpreter
→ Write Plan
→ Image Normalization
→ Staging (frozen payload)
→ Promotion Executor
→ Canon Row Created
→ Image Resolution (identity source)
→ Public Rendering (GV-ID)
```

## Key Capabilities

### 1. Reality -> Canon Conversion

Real-world image -> canonical database row

No dependency on external catalogs for canonical creation.

### 2. Printed Identity Modeling

Stamps create new canonical rows.

Stamps are never child printings.

Identity is encoded via `variant_key`.

### 3. Deterministic Write System

Write plan is fully defined before execution.

No hidden mutations occur during apply.

### 4. Staging-Gated Execution

`RAW -> NORMALIZED -> CLASSIFIED -> REVIEW_READY -> APPROVED_BY_FOUNDER -> STAGED_FOR_PROMOTION -> PROMOTED` is enforced.

DB triggers and execution invariants are verified.

### 5. Image System

Raw evidence remains immutable.

Normalized images are stored as derived assets.

Canon identity images are resolved from storage path -> signed URL at read time.

### 6. GV-ID System

GV IDs are deterministic, human-readable, and stable.

Canonical identity variants diverge by explicit suffix rule.

## Verified Case

### Pikachu Pokemon Together Stamp

Input:

- raw warehouse image

Output:

- canon row created

Identity:

- `name = Pikachu`
- `number = 025/165`
- `set = sv03.5`
- `variant = pokemon_together_stamp`

GV-ID:

- `GV-PK-MEW-025-POKEMON-TOGETHER-STAMP`

Image:

- normalized
- perspective-corrected
- stamp preserved

Execution:

- staging row created
- executor applied
- canon row inserted
- no duplicates
- idempotency verified

## System Properties

- deterministic
- idempotent
- replay-safe
- contract-driven
- auditable
- composable

## Known Non-Blocking Issues

- `.next/types` drift affects repo-wide typecheck only
- set extraction still returns `PARTIAL` for weak evidence, which is the correct fail-safe behavior
- back image normalization is optional in V1

## Next Phase

### Immediate

- GV-ID routing improvements
- UX polish

### Strategic

- pricing system integration
- ingestion scaling
- reputation / trust layer

## Final Statement

Grookai Vault is now a system that converts real-world trading cards into canonical, trustworthy, structured data with safe execution guarantees.

## Lock Rule

This checkpoint is immutable.

All future changes must reference this state and evolve forward.

No backward contract drift is allowed.
