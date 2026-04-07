# ECARD3_IDENTITY_CONTRACT_V1

## Status

Active.

## Purpose

`ecard3` is not a plain numeric set namespace. English Skyridge uses two printed identity lanes:

- standard numbering such as `1`, `35`, `144`
- separate holo numbering such as `H1`, `H3`, `H32`

Bulbapedia documents that Skyridge has a separate collection number for Rare Holo cards and lists entries such as `H1/H32` through `H32/H32` alongside the standard set numbering ([Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/E-_SkyRidge_%28TCG%29)).

Without a dedicated contract, Grookai cannot safely decide whether `H3` is a separate printed identity or a malformed numeric surrogate. This contract makes the printed token authoritative.

## Core Principle

For `ecard3`, canonical identity is determined by:

```text
ecard3 family + exact printed collection number + proven printed identity qualifier
```

Not by:

- card name alone
- digit-only extraction
- external source ids alone
- heuristics that collapse `H3` into `3`

## Printed Identity Lanes

### Standard lane

Examples:

- `1`
- `35`
- `144`

### Holo lane

Examples:

- `H1`
- `H3`
- `H32`

These lanes are distinct printed identities.

```text
H3 != 3
H32 != 32
```

## Canonical Card Rule

One real Skyridge printed identity equals one canonical `card_prints` row.

Base canonical key:

```text
(ecard3, printed_number, identity_qualifier)
```

Where:

- `printed_number` preserves the exact lane token
- `identity_qualifier` is empty for ordinary Skyridge identity
- qualifier is only populated when a separate printed identity modifier is proven

## GV_ID Rule

Base public identity form:

```text
GV-PK-SK-<PRINTED_NUMBER>
```

Examples:

- `GV-PK-SK-1`
- `GV-PK-SK-35`
- `GV-PK-SK-H3`
- `GV-PK-SK-H32`

The `H` prefix is part of canonical identity and must be preserved.

## Matching Rule

Primary lawful matching key:

1. exact printed number token
2. normalized card name
3. proven identity qualifier, if any

Digit-only matching is forbidden as the primary identity rule.

Allowed:

- using extracted digits as a secondary audit aid

Forbidden:

- collapsing `H3` onto `3`
- treating holo-lane rows as finish-only children of numeric rows
- assuming same-name holo and standard rows should merge

## Collapse Rule

An unresolved `ecard3` row is collapse-safe only if all are true:

1. exact canonical `ecard3` target already exists
2. target owns the same printed number token
3. target matches the same normalized name
4. identity qualifier matches or is absent on both sides
5. zero multiple-match ambiguity exists
6. zero same-number different-name conflict exists

If all hold, the unresolved row may collapse onto the canonical target and no new `gv_id` is created.

## Promotion Rule

An unresolved `ecard3` row is promotion-safe only if all are true:

1. exact printed number token is present and valid
2. no canonical overlap already exists for that exact token
3. proposed `GV-PK-SK-<PRINTED_NUMBER>` is unique
4. no same-token different-name conflict exists
5. no qualifier or variant evidence blocks direct minting

## Lane Validation Rule

Accepted printed-number forms in V1:

- standard: `^[0-9]+$`
- holo: `^H[0-9]+$`

Any other token form is blocked pending explicit audit.

## Identity Qualifier Rule

If two `ecard3` cards share the same printed number token but differ by a separately proven printed identity modifier, the unsuffixed namespace remains with the base identity and the modifier is appended under `GV_ID_VARIANT_SUFFIX_CONTRACT_V2`.

Example only if separately proven:

- `GV-PK-SK-H3-STAFF-STAMP`

Do not assume such variants globally for `ecard3`.

## Blocker Types

Possible blocker outcomes:

- `BLOCKED_INVALID_PRINTED_NUMBER`
- `BLOCKED_CANONICAL_CONFLICT`
- `BLOCKED_UNSUPPORTED_TOKEN`
- `QUALIFIER_REVIEW`

## Builder Rule

`buildCardPrintGvIdV1` must treat `ecard3` as a dedicated mixed-lane namespace.

Required behavior:

1. detect `ecard3`
2. require exact printed number token
3. accept only numeric or `H#`
4. emit `GV-PK-SK-<PRINTED_NUMBER>`
5. preserve the `H` prefix exactly when present
6. reject missing or malformed printed numbers
7. apply qualifier only when separately proven

## Read Model Rule

UI and route surfaces should display and respect the exact printed number token:

- `GV-PK-SK-35`
- `GV-PK-SK-H3`

This preserves real collector identity and avoids lane ambiguity.

## Execution Guidance

Future `ecard3` execution order:

1. audit unresolved `ecard3` surface
2. classify rows into:
   - collapse-safe standard lane
   - collapse-safe holo lane
   - promotion-safe standard lane
   - promotion-safe holo lane
   - blocked conflict
   - qualifier review
3. only then apply

Do not batch-apply `ecard3` blindly until the subset structure is proven.

## Expected Next Phase

`ECARD3_RECLASSIFICATION_AUDIT_V1`

That audit should determine:

- how many unresolved `ecard3` rows already map to canonical `ecard3`
- how many are promotion-safe
- whether the `H#` lane already exists canonically
- whether any rows require qualifier handling

## Risks If Violated

If this contract is violated, Grookai risks:

- collapsing holo-lane cards into standard-lane cards incorrectly
- destroying printed identity fidelity
- creating namespace collisions
- unreadable or misleading public ids
- broken collector trust

## Decision

Grookai now treats `ecard3` as a dedicated mixed-numbering family where the exact printed token is canonical and must be preserved in public identity.

Base rules:

```text
GV-PK-SK-<NUMBER>
GV-PK-SK-H<NUMBER>
```

Qualifiers are allowed only when separately proven under the variant contract.
