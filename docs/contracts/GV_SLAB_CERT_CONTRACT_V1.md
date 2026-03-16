# GV Slab Cert Contract V1

Status: LOCKED CONTRACT (documentation only; no schema/code changes in this file)  
Scope: Canonical identity rules for graded slab certificate objects in Grookai Vault.  
Out of scope: provenance event schema, pricing, ingestion, marketplace behavior, fingerprint reuse, schema implementation.

## 1) Purpose
- Governs the canonical identity of a graded slab object.
- Defines how Grookai identifies a slab certificate independently from canonical card identity.
- Ensures slab identity is stable and does not drift with market, ownership, or listing changes.

## 2) Identity Principle
- A slab object is anchored to:
  - `grader`
  - `cert_number`
- Canonical card identity remains separate.
- `card_print_id` is a link from the slab object to the canonical card record. It is not the slab identity anchor.
- `grade` is an attribute of the slab object. It is not the slab identity anchor.
- Qualifiers, subgrades, label text, images, listing state, owner state, and market state are attributes or observations. They are never identity.

## 3) Grookai Public ID Format
- Public slab identity format is:
  - `GV-SLAB-{GRADER}-{CERT}`
- Examples:
  - `GV-SLAB-PSA-81234567`
  - `GV-SLAB-CGC-4029384012`
  - `GV-SLAB-BGS-0012345678`
- Invariants:
  - `GRADER` is part of identity.
  - `CERT` is only unique within a grader namespace.
  - The emitted public id must be deterministic for the same normalized `(grader, cert_number)`.

## 4) Required Normalization Rules
- `grader`
  - must be normalized to uppercase canonical tokens
  - must not preserve presentation-only casing
  - must not collapse distinct graders into one token
- `cert_number`
  - must be trimmed of surrounding whitespace
  - internal whitespace must be removed
  - formatting separators used only for display convenience must be removed
  - leading zeroes must be preserved
  - characters must not be guessed, inferred, or rewritten beyond deterministic normalization
- Ambiguous transformations are prohibited.
- If a source cert value cannot be normalized deterministically, it must fail closed rather than minting identity.

## 5) Minimum Data Model Shape
- Expected conceptual slab cert record:
  - internal slab cert object id
  - `gv_slab_id`
  - `grader`
  - `cert_number`
  - `card_print_id`
  - `grade`
  - optional qualifiers
  - optional subgrades
  - optional label metadata
  - `created_at`
  - `updated_at`
  - `first_seen_at`
  - `last_seen_at`
- `gv_slab_id` is the Grookai public-facing slab identity.
- `card_print_id` expresses canonical card linkage only.

## 6) Uniqueness Rules
- Primary uniqueness anchor:
  - `(grader, cert_number)`
- Secondary uniqueness:
  - `gv_slab_id` must be unique
- `card_print_id` must not participate in the slab identity uniqueness anchor.
- `grade` must not participate in the slab identity uniqueness anchor.

## 7) Non-Goals / Exclusions
- This contract does not define pricing logic.
- This contract does not define provenance event storage.
- This contract does not define ingestion pipelines.
- This contract does not define fingerprint matching or fingerprint bindings.
- This contract does not define marketplace or listing behavior.

## 8) Red Flags
- Using `grade` as slab identity.
- Collapsing cert numbers across graders.
- Using listing title, label OCR text, or marketplace metadata as identity.
- Tying slab identity to current owner, seller, or listing state.
- Reusing fingerprint keys, fingerprint bindings, or fingerprint event semantics for slab identity.

## 9) V1 Implementation Direction
- Slab cert identity must be implemented as a parallel identity lane.
- It must not reuse fingerprint tables or fingerprint RPCs directly.
- It must remain separate from canonical card identity while linking cleanly to `card_print_id`.
- Generalization across object domains may occur only after at least two real domains exist in production with proven contracts.
