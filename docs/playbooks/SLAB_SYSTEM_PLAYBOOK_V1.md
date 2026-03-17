# GROOKAI VAULT — SLAB SYSTEM PLAYBOOK V1

## Status
PLANNED — READY FOR EXECUTION

## Scope
Defines the complete approach for slabs in Grookai Vault:
- UI
- data model
- ingestion
- lifecycle
- future trust + marketplace alignment

This playbook is executed in phases.

------------------------------------------------------------------------

# CORE PRINCIPLE

Slabs are not a UI feature.

They are part of the **owned object system**.

All slab behavior must respect:

- canonical identity
- ownership truth
- object lifecycle
- condition + provenance systems

------------------------------------------------------------------------

# DEFINITIONS

## Slab

A graded card with:
- grading company (PSA, BGS, CGC, etc.)
- grade
- certification number
- slab casing (physical encapsulation)

## Raw Card

An ungraded owned object.

## Relationship

A slab is **not independent of the card**.

It represents:

```text
card_print + grading transformation
```

------------------------------------------------------------------------

# ARCHITECTURAL DECISION

## Slab Model

Slabs are modeled as:

```text
owned objects with slab attributes
```

Not:

- separate unrelated entities
- detached from card identity

Each slab must:

- reference canonical card identity
- optionally replace or link to a prior raw object
- participate in lifecycle + provenance

------------------------------------------------------------------------

# PHASE 1 — SLAB UI (SAFE START)

## Goal

Make slabs visible and first-class in the UI without introducing lifecycle complexity.

## Requirements

### 1. Slab Indicators

In all collector surfaces:

- vault
- card detail
- public wall (later)

Show:

- slab badge
- grader (PSA/BGS/etc.)
- grade (10, 9.5, etc.)

### 2. Raw vs Slab Distinction

Visually differentiate:

- raw cards
- slabbed cards

This must be obvious at a glance.

### 3. Slab Metadata Display

Display when available:

- grader
- grade
- cert number (optional for now)

### 4. Zero Lifecycle Changes

Do not:

- modify ownership flows
- modify archive flows
- introduce grading lifecycle

This phase is UI-only.

## Success Criteria

- slabs are visible
- slabs feel native to Grookai
- no system behavior is broken

------------------------------------------------------------------------

# PHASE 2 — DATA MODEL HARDENING

## Goal

Define and lock the slab data model.

## Required Decisions

### 1. Slab Attributes

Define fields:

- grader (enum)
- grade (numeric or string)
- cert_number (string)
- slab_label (optional display)

### 2. Identity Rules

Define:

- whether cert_number must be unique
- how duplicate certs are handled
- whether slab identity is tied to GVVI or separate ID

### 3. Raw ↔ Slab Relationship

Define:

- does slab replace raw object?
- or does slab coexist with raw?
- or does raw become archived?

Preferred direction:

```text
raw → graded → slab replaces or supersedes raw
```

But history must be preserved.

### 4. Storage Location

Decide whether slab fields live on:

- owned object (preferred)
- related table

Recommendation:

```text
store slab attributes on owned object
```

------------------------------------------------------------------------

# PHASE 3 — SLAB CREATION FLOWS

## Goal

Allow users to add slabs safely and deterministically.

## Flows

### 1. Manual Slab Add

User enters:

- card
- grader
- grade
- cert number

System:

- creates owned object
- attaches slab attributes

### 2. Raw → Slab Conversion

User upgrades an owned raw card.

System:

- archives raw object or links it
- creates slabbed object
- preserves provenance

### 3. Validation

- prevent duplicate cert misuse (later)
- allow flexibility early

------------------------------------------------------------------------

# PHASE 4 — SLAB LIFECYCLE

## Goal

Model real collector behavior.

## States

- raw
- sent for grading
- in grading
- graded (slab created)
- slab owned

## Requirements

- preserve history
- never lose ownership trace
- no destructive overwrite

------------------------------------------------------------------------

# PHASE 5 — TRUST + MARKET LAYER

## Goal

Leverage slabs for trust.

## Future Capabilities

- slab showcase
- slab-based listings
- cert-backed trust signals
- provenance tracking
- trade confidence

------------------------------------------------------------------------

# RULES

## Do Not

- treat slabs as detached entities
- break canonical identity
- bypass ownership truth
- fake lifecycle transitions

## Always

- anchor slabs to real objects
- preserve provenance
- keep system deterministic
- prefer correctness over speed

------------------------------------------------------------------------

# CURRENT SYSTEM ALIGNMENT

This playbook assumes:

- instance truth is established
- web + mobile are canonical-row-sourced
- compatibility anchors exist but are controlled

------------------------------------------------------------------------

# EXECUTION ORDER

1. Phase 1 — UI
2. Phase 2 — Model
3. Phase 3 — Creation
4. Phase 4 — Lifecycle
5. Phase 5 — Trust

------------------------------------------------------------------------

# RESUME INSTRUCTION

```text
Resume from SLAB_SYSTEM_PLAYBOOK_V1
Next phase: <phase name>
```

------------------------------------------------------------------------

# INTENT

This playbook ensures slabs are built:

- correctly
- consistently
- without architectural drift
- aligned with Grookai’s long-term system
