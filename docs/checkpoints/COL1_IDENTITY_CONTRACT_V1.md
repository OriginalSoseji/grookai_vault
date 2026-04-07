# COL1_IDENTITY_CONTRACT_V1

## Status

Active.

## Purpose

`col1` is not a plain numeric set namespace. English Call of Legends uses two printed identity lanes:

- standard numbering such as `1`, `35`, `95`
- separate shiny-legend numbering such as `SL1`, `SL3`, `SL11`

Bulbapedia documents the main `1/95` through `95/95` set numbering plus a separate `Shiny Legendary cards` section numbered `SL1` through `SL11` ([Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Call_of_Legends_%28TCG%29)).

Without a dedicated contract, Grookai cannot safely decide whether `SL3` is a real printed identity or a malformed numeric surrogate. This contract makes the exact printed token authoritative.

## Core Principle

For `col1`, canonical identity is determined by:

```text
col1 family + exact printed collection number + proven printed identity qualifier
```

Not by:

- card name alone
- digit-only extraction
- external source ids alone
- heuristics that collapse `SL3` into `3`

## Printed Identity Lanes

### Standard lane

Examples:

- `1`
- `35`
- `95`

### Shiny legend lane

Examples:

- `SL1`
- `SL3`
- `SL11`

These lanes are distinct printed identities.

```text
SL3 != 3
SL11 != 11
```

## Canonical Card Rule

One real Call of Legends printed identity equals one canonical `card_prints` row.

Base canonical key:

```text
(col1, printed_number, identity_qualifier)
```

Where:

- `printed_number` preserves the exact lane token
- `identity_qualifier` is empty for ordinary Call of Legends identity
- qualifier is only populated when a separate printed identity modifier is proven

## GV_ID Rule

Base public identity form:

```text
GV-PK-COL-<PRINTED_NUMBER>
```

Examples:

- `GV-PK-COL-1`
- `GV-PK-COL-35`
- `GV-PK-COL-SL3`
- `GV-PK-COL-SL11`

The `SL` prefix is part of canonical identity and must be preserved.

## Matching Rule

Primary lawful matching key:

1. exact printed number token
2. normalized card name
3. proven identity qualifier, if any

Digit-only matching is forbidden as the primary identity rule.

Allowed:

- using extracted digits as a secondary audit aid

Forbidden:

- collapsing `SL3` onto `3`
- treating shiny-legend rows as finish-only children of numeric rows
- assuming same-name shiny-legend and standard rows should merge

## Collapse Rule

An unresolved `col1` row is collapse-safe only if all are true:

1. exact canonical `col1` target already exists
2. target owns the same printed number token
3. target matches the same normalized name
4. identity qualifier matches or is absent on both sides
5. zero multiple-match ambiguity exists
6. zero same-number different-name conflict exists

If all hold, the unresolved row may collapse onto the canonical target and no new `gv_id` is created.

## Promotion Rule

An unresolved `col1` row is promotion-safe only if all are true:

1. exact printed number token is present and valid
2. no canonical overlap already exists for that exact token
3. proposed `GV-PK-COL-<PRINTED_NUMBER>` is unique
4. no same-token different-name conflict exists
5. no qualifier or variant evidence blocks direct minting

## Lane Validation Rule

Accepted printed-number forms in V1:

- standard: `^[0-9]+$`
- shiny legend: `^SL[0-9]+$`

Any other token form is blocked pending explicit audit.

## Identity Qualifier Rule

If two `col1` cards share the same printed number token but differ by a separately proven printed identity modifier, the unsuffixed namespace remains with the base identity and the modifier is appended under `GV_ID_VARIANT_SUFFIX_CONTRACT_V2`.

Example only if separately proven:

- `GV-PK-COL-SL3-STAFF-STAMP`

Do not assume such variants globally for `col1`.

## Blocker Types

Possible blocker outcomes:

- `BLOCKED_INVALID_PRINTED_NUMBER`
- `BLOCKED_CANONICAL_CONFLICT`
- `BLOCKED_UNSUPPORTED_TOKEN`
- `QUALIFIER_REVIEW`

## Builder Rule

`buildCardPrintGvIdV1` now treats `col1` as a dedicated mixed-lane namespace.

Required behavior:

1. detect `col1`
2. require exact printed number token
3. accept only numeric or `SL#`
4. emit `GV-PK-COL-<PRINTED_NUMBER>`
5. preserve the `SL` prefix exactly when present
6. reject missing or malformed printed numbers
7. apply qualifier only when separately proven

Builder failures:

- missing token -> `gv_id_col1_printed_number_missing`
- malformed token -> `gv_id_col1_printed_number_invalid`

## Read Model Rule

UI and route surfaces should display and respect the exact printed number token:

- `GV-PK-COL-35`
- `GV-PK-COL-SL3`

This preserves real collector identity and avoids lane ambiguity.

## Execution Guidance

Future `col1` execution order:

1. audit unresolved `col1` surface
2. classify rows into:
   - collapse-safe standard lane
   - collapse-safe shiny-legend lane
   - promotion-safe standard lane
   - promotion-safe shiny-legend lane
   - blocked conflict
   - qualifier review
3. only then apply

Do not batch-apply `col1` blindly until the subset structure is proven.

## Expected Next Phase

`COL1_RECLASSIFICATION_AUDIT_V1`

That audit should determine:

- how many unresolved `col1` rows already map to canonical `col1`
- how many are promotion-safe
- whether the `SL#` lane already exists canonically
- whether any rows require qualifier handling

## Risks If Violated

If this contract is violated, Grookai risks:

- collapsing shiny-legend cards into standard-lane cards incorrectly
- destroying printed identity fidelity
- creating namespace collisions
- unreadable or misleading public ids
- broken collector trust

## Decision

Grookai now treats `col1` as a dedicated mixed-numbering family where the exact printed token is canonical and must be preserved in public identity.

Base rules:

```text
GV-PK-COL-<NUMBER>
GV-PK-COL-SL<NUMBER>
```

Qualifiers are allowed only when separately proven under the variant contract.
