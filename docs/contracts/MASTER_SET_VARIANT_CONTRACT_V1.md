# MASTER_SET_VARIANT_CONTRACT_V1

Status: DRAFT  
Type: Product / Data Contract  
Scope: Defines how Grookai models, displays, and counts print finishes and variants for master-set correctness before broad Grookai Dex public enablement.

## Purpose

Grookai Dex revealed that many cards look duplicated when the UI only shows name, set, number, and rarity. In reality, many of those rows are different printed objects or child finish/parallel options:

- Reverse Holo
- Holo
- Poké Ball
- Master Ball
- stamped promos
- prerelease/staff stamps
- event stamps
- legacy edition or shadowless signals

This contract separates species progress from master-set completion and prevents master-set variants from being hidden inside captions or unmanaged `variant_key` strings.

No migration is created by this contract.

## Inputs

This contract builds on:

- `CHILD_PRINTING_CONTRACT_V1`
- `CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1`
- `GROOKAI_DEX_V1`
- read-only audit: `docs/audits/master_set_variant_contract_v1/master_set_variant_contract_v1_audit_20260518.md`

## Current Evidence

Read-only audit results:

- `card_prints`: 25404
- `card_prints.variant_key` populated: 2355
- `card_prints.printed_identity_modifier` populated: 194
- `card_prints.variants` populated: 662
- `finish_keys`: 5
- `card_printings`: 55742
- `premium_parallel_eligibility`: 167
- duplicate-looking `set_code + number + name` groups: 383
- affected duplicate-looking rows: 832

Current finish keys:

| Key | Label | Contract Class |
| --- | --- | --- |
| `normal` | Normal | stable child finish |
| `holo` | Holo | stable child finish |
| `reverse` | Reverse Holo | stable child finish |
| `pokeball` | Poké Ball | stable child premium parallel |
| `masterball` | Master Ball | stable child premium parallel |

## Core Terms

### Parent Print

A row in `card_prints`.

Parent prints represent canonical card objects and continue to own:

- `gv_id`
- public card route
- species mapping through `card_print_species`
- pricing and vault parent joins

### Child Printing

A row in `card_printings`.

Child printings represent finish or premium parallel options under one parent print, such as:

- Normal
- Holo
- Reverse Holo
- Poké Ball
- Master Ball

### Special Parent Variant

A separate `card_prints` row where the printed object is currently represented as canonical/special parent identity. Examples:

- prerelease stamp
- staff prerelease stamp
- event stamp
- Pokemon Together stamp
- Play Pokemon stamp
- delta species identity modifier

Special parent variants must not be collapsed into child finish rows unless a later canon review explicitly changes that authority.

## Counting Modes

### `counts_for_species_dex`

Species Dex answers:

```text
Which canonical card prints for this Pokemon do I own?
```

V1 rule:

- count active `card_print_species` rows where `counts_for_completion = true`
- count by parent `card_print_id`
- do not multiply by `card_printings`
- display child finishes as availability/context only

Rationale:

Species Dex should not suddenly multiply Pikachu denominators by every reverse/holo/masterball option. That would turn the species feature into master-set completion and make the feature less legible.

### `counts_for_master_set`

Master Set answers:

```text
Which required parent prints and child finish/parallel options do I own for this set?
```

V1 rule:

- count required parent prints
- count required child `card_printings` for each parent where the set contract requires finish completion
- include `normal`, `holo`, `reverse`, `pokeball`, and `masterball` according to set eligibility
- include special parent variants only when the set's master-set contract includes those parent rows
- do not infer required variants from UI captions

Master-set denominators must be derived from a read model, not from ad hoc tile rendering.

## Display Rules

Every card tile or row that participates in Dex or master-set progress must expose a display discriminator when `set + number + name` alone is insufficient.

Required display label precedence:

1. special parent variant label from governed parent identity:
   - `Pokemon Together Stamp`
   - `Prerelease Stamp`
   - `Staff Prerelease Stamp`
   - `Play Pokemon Stamp`
   - event/program stamp labels
2. child printing label from `finish_keys`:
   - `Normal`
   - `Holo`
   - `Reverse Holo`
   - `Poké Ball`
   - `Master Ball`
3. printed identity modifier label:
   - `Delta Species`
4. fallback label only for duplicate-looking groups with no stronger label:
   - `Standard Print`
   - `Variant`
   - `Unclassified Variant`

Hard rule:

If more than one row has the same `set_code + number + name`, the UI must show at least one differentiating label for every row.

## Known Finish Families

### Stable Child Finish

- `normal`
- `holo`
- `reverse`

### Stable Child Premium Parallel

- `pokeball`
- `masterball`

### Canon-Sensitive Parent/Special Variant

These remain parent/special variant until later explicit canon review:

- prerelease stamp
- staff prerelease stamp
- Play Pokemon stamp
- event stamp
- Pokemon Together stamp
- release-channel stamp
- deck-exclusive marked print
- cosmos holo, cracked ice, and other special holo styles unless already modeled as child finish by governed review

### Forbidden In Finish Identity

These must not be counted as master-set finishes:

- condition
- grade
- slab company
- price source
- owner
- seller wording
- factory error/misprint unless an explicit canon contract says otherwise

## High-Risk Sets

Priority set:

- `sv03.5 / 151`

Reason:

- 151 has Poké Ball and Master Ball parallel expectations.
- Audit found 153 child parallel rows, but almost no direct parent `variant_key`/rarity signals.
- Therefore any read model based only on `card_prints.variant_key` will be incomplete.

Other high-risk classes:

- modern Scarlet & Violet sets with large child-printing coverage
- sets with `premium_parallel_eligibility`
- prerelease/staff promo families
- BW/XY/SM promo stamp families
- sets with many same `set + number + name` rows

## Required Read Models

Future migration/design should provide app-facing read models equivalent to:

### `v_master_set_parent_prints_v1`

One row per parent `card_prints` row relevant to master-set display.

Required fields:

- `card_print_id`
- `gv_id`
- `set_code`
- `set_name`
- `name`
- `number`
- `rarity`
- `variant_key`
- `variant_label`
- `printed_identity_modifier`
- `printed_identity_modifier_label`
- `counts_for_species_dex`
- `counts_for_master_set_parent`
- `duplicate_caption_group_key`
- `display_discriminator_label`

### `v_master_set_printings_v1`

One row per master-set countable object.

Required fields:

- `master_set_object_id`
- `object_kind`: `parent_print` or `child_printing`
- `card_print_id`
- `card_printing_id`
- `gv_id`
- `set_code`
- `name`
- `number`
- `finish_key`
- `finish_label`
- `variant_key`
- `variant_label`
- `display_label`
- `counts_for_species_dex`
- `counts_for_master_set`
- `is_required_for_master_set`
- `is_provisional`
- `provenance_source`
- `provenance_ref`

### `v_master_set_progress_v1`

User-scoped server helper or RPC, not public unauthenticated ownership leakage.

Required outputs:

- total required master-set objects
- owned required master-set objects
- missing required master-set objects
- breakdown by parent print and child finish
- no private ownership data in anonymous responses

## Proposed Schema Direction

No schema is created here. Future migration should evaluate:

1. Keep `finish_keys`, `card_printings`, and `premium_parallel_eligibility` as the base.
2. Add explicit master-set eligibility if needed:
   - `master_set_requirements`
   - or additional governed columns on `card_printings`
3. Add display label helpers or materialized read model fields rather than recomputing labels ad hoc in multiple UI surfaces.
4. Add governed mapping from parent `variant_key` to display label and classification:
   - stable parent variant
   - canon-sensitive parent variant
   - forbidden/non-counting
5. Do not hide new identity dimensions inside `variant_key`.

## Required Audit Gates

Before broad Dex public enablement or master-set public enablement:

1. Duplicate-looking gate:
   - every `set_code + number + name` group with more than one row has visible display labels.
2. Finish coverage gate:
   - every set with `premium_parallel_eligibility` exposes Poké Ball/Master Ball where applicable.
3. 151 gate:
   - `sv03.5 / 151` shows normal/reverse/pokeball/masterball expectations correctly.
4. Ownership gate:
   - master-set ownership resolves parent and child printings without leaking private ownership publicly.
5. Source traceability gate:
   - every child printing used for master-set completion has provenance.
6. Species Dex compatibility gate:
   - species Dex denominators remain parent-print based unless explicitly switched to a master-set mode.

## Stop Conditions

Stop and refine this contract before migration if:

- a required finish class is not representable by current `finish_keys`
- 151 eligibility cannot be proven from current tables
- a distinction appears in both parent `card_prints` and child `card_printings` without a governed boundary
- public UI would expose private ownership
- master-set denominator requires source data that is not traceable
- migration would silently rewrite canon or collapse special parent variants

## Outcome

Grookai Dex remains viable as a species-progress feature, but master-set correctness must be built on a separate countable-object read model that includes child finishes and premium parallels.

This contract approves audit and design direction only.

It does not approve migration, DB writes, public production enablement, or canon promotion.
