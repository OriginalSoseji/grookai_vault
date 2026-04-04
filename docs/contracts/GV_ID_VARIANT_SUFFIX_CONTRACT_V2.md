# GV_ID_VARIANT_SUFFIX_CONTRACT_V2

Status: ACTIVE

Extends:

- `GV_ID_ASSIGNMENT_V1`

## 1. Purpose

Extend the canonical `gv_id` system to support both:

1. controlled suffix variants
2. explicit named identity extensions

This preserves deterministic, collision-free public identity when the same printed set abbreviation and printed number represent different physical printed cards.

## 2. Core Principle

`gv_id` represents printed physical identity.

Extensions are canonical identity qualifiers, not decorative labels.

They may be used only when all are true:

1. printed set abbreviation is the same
2. printed number is the same
3. the physical print identity is different
4. the difference is observable on the card

## 3. Base GV_ID Form

Default:

- `GV-PK-<PRINTED_SET_ABBREV>-<PRINTED_NUMBER>`

Example:

- `GV-PK-SVI-043`

This is used when identity is unique.

## 4. Extension Types

### 4A. Controlled Suffix Variant

Form:

- `GV-PK-<SET>-<NUMBER>-<SUFFIX>`

Use only for standardized parallel print families already governed by the registry below.

Approved suffix registry:

- `S` = shiny
- `RH` = reverse holo
- `PB` = Poke Ball
- `MB` = Master Ball

Rules:

- uppercase only
- fixed meanings only
- cannot be user-defined
- cannot be repurposed

### 4B. Named Identity Extension

Form:

- `GV-PK-<SET>-<NUMBER>-<IDENTITY_DESCRIPTOR>`

Examples:

- `GV-PK-MEW-025-POKEMON-TOGETHER-STAMP`
- `GV-PK-SET-123-STAFF-STAMP`
- `GV-PK-SET-045-PRERELEASE-STAMP`
- `GV-PK-SET-010-PLAY-PROMO`

Use for:

- stamps
- event prints
- promo overlays
- unique printed text identities
- other non-standard printed identity markings

Named identity rules:

1. must reflect actual printed identity
2. must be deterministic
3. must be normalized as:
   - uppercase
   - hyphen-separated
   - no spaces
   - no special characters except hyphen
4. must be stable across the system

## 5. Extension Selection Rule

When a base `gv_id` collides:

1. attempt the base `gv_id`
2. if collision exists:
   - use a controlled suffix only for approved standard parallel families
   - use a named identity descriptor only for proven named printed identities
3. if neither applies:
   - stop
   - require a new contract version or explicit manual classification

## 6. Main-Lane Preservation Rule

For the same set + number:

- the base version keeps `GV-PK-SET-NUMBER`
- variants receive the extension

Examples:

- `GV-PK-PAF-100`
- `GV-PK-PAF-100-S`

Or:

- `GV-PK-MEW-025`
- `GV-PK-MEW-025-POKEMON-TOGETHER-STAMP`

## 7. Collision Rule

Before assigning an extended `gv_id`, the system must verify:

1. the base collision exists
2. the extension type is contract-valid
3. the resulting `gv_id` is unique
4. the identity difference is proven

## 8. Forbidden

Do not:

- invent descriptors
- abbreviate named descriptors incorrectly
- mix suffix and descriptor selection randomly
- use both suffix and descriptor on the same `gv_id`
- silently rewrite existing non-null `gv_id` values

## 9. Stability Rule

Once assigned, `gv_id` is immutable.

Changing an existing `gv_id` requires an explicit contract + checkpointed migration path.

## 10. Compatibility Rule

This contract extends `GV_ID_ASSIGNMENT_V1`; it does not erase lawful existing compact legacy forms already preserved there.

Existing compact legacy forms such as:

- appended letter lanes
- `RC` number-prefix lanes
- `SH` number-prefix lanes

remain valid where already canonical under V1.

V2 governs the newer extension lane for:

- controlled suffix variants
- explicit named printed identity descriptors

## 11. Scope

This contract governs:

- `gv_id` generation
- public identity surface
- routing layer

This contract does not govern:

- child printing model
- finish classification rules
- ingestion normalization
- warehouse promotion policy by itself

## 12. Trigger Cases

Triggered by:

1. PAF main-lane vs shiny-lane collision pressure
2. stamped cards such as:
   - Pokemon Together Stamp
   - prerelease
   - staff

## 13. Result

Grookai Vault supports:

- clean base identity
- controlled suffix variants
- full-fidelity named identity extensions

without breaking deterministic public identity.
