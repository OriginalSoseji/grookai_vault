# PROMO_FAMILY_IDENTITY_RULE_V1

Status: ACTIVE
Type: Promo Family Printed Identity Contract
Scope: source-backed stamped promo-family rows in mixed promo/event families not fully covered by
the BW/SM promo-specific rules

## Purpose

Defines how Grookai selects the lawful identity space for mixed promo families such as:

- `diamond-and-pearl-promos-pokemon`
- `nintendo-promos-pokemon`
- promo-slot/event distributions carrying Worlds, E-League, staff, or placement overlays

The rule exists because these families mix more than one printed-identity shape:

- true promo-slot numbering
- numeric promo tokens
- slash-number reprints from underlying expansions

Stamped/event identity must be applied only after the correct base identity space is chosen.

## Relationship To Existing Contracts

- `STAMPED_IDENTITY_RULE_V1` remains the authority for stamped/event separation through
  deterministic `variant_key`.
- `PROMO_SLOT_IDENTITY_RULE_V1` remains the authority for `bwp` slash-number routing.
- `PROMO_PREFIX_IDENTITY_RULE_V1` remains the authority for promo-prefix GV-ID token generation.

This rule fills the family-selection gap for non-BW/non-SM mixed promo families and event rows.

## Core Principle

For mixed promo families, canonical identity must be selected from the printed-number shape before
the stamped/event modifier is applied.

The stamped or event overlay remains a `variant_key` concern.
It does not create a new synthetic `number`.

## Family Rules

### 1. DPP Promo Slot Identity

When all are true:

1. source family is `diamond-and-pearl-promos-pokemon`
2. printed number uses the `DP###` token shape

then the canonical base identity is the DPP promo-slot row itself:

- canonical `set_code` remains `dpp`
- canonical number authority remains the printed `DP###` token
- stamped/event identity separates through `variant_key`

The printed promo token is authoritative.
Do not collapse `DP05` onto an expansion-number row.

### 2. Nintendo Promo Slot Identity

When all are true:

1. source family is `nintendo-promos-pokemon`
2. printed number is a numeric promo token such as `036`

then the canonical base identity is the Nintendo promo-slot row itself:

- canonical `set_code` remains `np`
- the printed numeric promo token remains the canonical slot identity
- `number_plain` may be used as the join key, but printed promo numbering remains authoritative
- stamped/event identity separates through `variant_key`

### 3. Promo-Family Slash-Number Reprint Identity

When all are true:

1. source family is `diamond-and-pearl-promos-pokemon` or `nintendo-promos-pokemon`
2. printed identity uses slash numbering such as `48/123` or `19/97`
3. stamped/event identity is already resolved

then the row is not treated as a true promo-slot identity.

Instead:

- resolve the unique underlying base row by deterministic base proof
- canonical `set_code` becomes the matched underlying expansion set
- canonical number follows the matched underlying expansion base row
- stamped/event identity still separates through `variant_key`

For this rule family, the default deterministic proof is:

- normalized base `name`
- plus `number_plain`
- plus `variant_key = NULL`
- with exactly one lawful base-row match

If that proof is not unique, the row is not warehouse-ready.

### 4. Worlds / E-League / Placement Rule

Worlds, E-League, staff, winner, top-cut, and similar placement/event labels are
identity-bearing overlays.

They must be preserved in `variant_key`.

They do not create a new numeric identity space by themselves.

The event overlay rides on top of whichever base identity space is lawful:

- promo-slot base row for true promo-slot identities
- underlying expansion base row for slash-number reprint identities

## Deterministic Resolution Rule

Mixed promo-family rows are warehouse-ready only when one of the following is true:

1. exact promo-slot identity is uniquely determined by printed promo token
2. numeric promo-slot identity is uniquely determined within the promo family
3. slash-number reprint identity resolves to exactly one underlying expansion base row

If zero matches or multiple matches remain, the row must not be auto-promoted.

## Reprint Versus Unique Classification

This rule recognizes three lawful identity shapes:

- `UNIQUE_PROMO_SLOT_BASE`
  - true promo-slot identity in the promo family itself
- `UNDERLYING_EXPANSION_REPRINT`
  - promo-source row whose printed identity actually belongs to an underlying expansion base row
- `SAME_SET_BASE_OVERLAY`
  - same-set stamped overlay already governed by existing non-promo family rules

## Storage / Identity Boundary

This rule does not introduce a new schema field.

Canonical identity remains:

- base canonical row
- plus stamped/event `variant_key`

Do not invent composite canonical numbers such as `19/97-ELEAGUE`.
The event-bearing identity delta belongs in `variant_key`, not in a synthetic `number`.

## Examples

- `diamond-and-pearl-promos-pokemon / Tropical Wind / DP05 / worlds_07_stamp`
  - base identity space: `dpp` promo-slot row `DP05`
  - event overlay: `worlds_07_stamp`

- `diamond-and-pearl-promos-pokemon / Gabite / 48/123 / staff_prerelease_stamp`
  - base identity space: underlying expansion row `dp2 / 48`
  - stamped overlay: `staff_prerelease_stamp`

- `nintendo-promos-pokemon / Tropical Tidal Wave / 036 / 2006_world_championships_staff_stamp`
  - base identity space: `np / 036`
  - event overlay: `2006_world_championships_staff_stamp`

- `nintendo-promos-pokemon / Salamence / 19/97 / e_league_winner_stamp`
  - base identity space: underlying expansion row `ex3 / 19`
  - event overlay: `e_league_winner_stamp`

## Non-Goals

This contract does not:

- rerun warehouse batches by itself
- change the stamped identity rule
- change warehouse pipeline code
- redesign GV-ID generation globally
- authorize promotion without the normal warehouse path
