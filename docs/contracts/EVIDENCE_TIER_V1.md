# EVIDENCE_TIER_V1

Status: ACTIVE
Type: Evidence Governance Rule
Scope: Evidence-backed identity decisions that depend on external corroboration

## Purpose

Defines the minimum evidence ladder for backlog rows that cannot be promoted from
source-family membership alone. This rule keeps identity decisions tied to
verifiable sources instead of guesswork.

## Evidence Tiers

### TIER_1 — Official

Use when the row is directly corroborated by a first-party source, including:

- Play! Pokemon official gallery pages
- official card lists
- official checklist PDFs

This tier is sufficient to prove row existence when the underlying base route is
already unique.

### TIER_2 — Trusted Structured Aggregator

Use when the row is corroborated by a structured, card-level set list from a
trusted aggregator that publishes reusable checklist data with stable numbering.

Examples include:

- TCGdex
- PokemonAPI, when internally consistent
- JustInBasil-style structured set lists with card-level numbering

This tier may support canon readiness only when the rule gate also proves full
coverage over the relevant identity window.

### TIER_3 — Community Corroboration

Use when the row is supported by multiple secondary sources or a bounded
community audit, but not by an official or trusted structured checklist.

Examples include:

- multiple independent listings
- collector datasets
- bounded compare audits such as Bulbapedia cross-checks

This tier is useful for narrowing ambiguity, but it does not by itself make a
row ready for warehouse promotion.

### TIER_4 — Weak

Use when the row only has:

- a single weak source
- inconsistent naming
- no external checklist corroboration
- no visual confirmation

This tier is insufficient for identity confirmation.

## Decision Gate

The default gate is:

- IF the row has a unique base route
- AND the row appears in exactly one supported series window
- AND the strongest evidence tier is `TIER_1` or `TIER_2`
- AND coverage over the relevant series window is complete
- THEN the row may move to `READY_FOR_WAREHOUSE`

- IF the row appears in multiple series with no printed distinguishing feature
- THEN the row is `DO_NOT_CANON`

- ELSE the row remains `WAIT`

## Required Enrichment Fields

Evidence-backed backlog passes should attach, at minimum:

- `evidence_sources[]`
- `evidence_tier`
- `base_card_id`
- `appearance_in_series[]`
- `image_availability`
- `duplicate_occurrence_count`

## Anti-Guess Rule

Absence of evidence is not proof of uniqueness unless the audit also proves that
the relevant series window is fully covered.

## Result

Backlog evidence passes can separate true canonical candidates from duplicate
reprints and unresolved rows without guessing.
