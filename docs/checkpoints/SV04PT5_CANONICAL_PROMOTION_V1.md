# SV04PT5_CANONICAL_PROMOTION_V1

## Context

`sv04.5` is a promotion candidate set, not a duplicate-collapse target.

Proven source lane:

- active `card_print_identity` rows with `set_code_identity = 'sv04.5'`
- parent `card_prints.gv_id is null`

Separate existing canonical lane:

- `card_prints.set_code = 'sv4pt5'`
- live public `gv_id` rows already exist there

This phase must preserve the distinction:

- `sv04.5` = missing canonical main lane candidate
- `sv4pt5` = separate existing shiny lane

`sv4pt5` is excluded from exact canonical-overlap logic.
It is **not** a collapse target in this phase.

## Problem

The `sv04.5` main lane is not publicly routable because all `245` identity-backed parent rows still have `gv_id = null`.

At the same time, the live public `gv_id` convention for this family is blocked by a separate existing `sv4pt5` public lane.

## Decision

Audit was completed.

Apply did **not** proceed.

Reason:

- `sv04.5` is promotion, not collapse
- but the current proven public `gv_id` token for `sv04.5` is `PAF`
- `sv4pt5` already occupies live `GV-PK-PAF-*` values
- therefore hard gate 5 fails on live `gv_id` uniqueness

## Proof

### Source lane proof

- candidate count = `245`
- all candidate parents have `gv_id is null`
- distinct printed numbers = `245`
- duplicate printed-number groups = `0`

### Canonical-overlap proof

Exact canonical overlap excluding `sv4pt5`:

- `0`

This confirms there is no existing canonical `sv04.5` main lane to collapse into.

### Set metadata proof

Stored set rows:

- `sv04.5`
  - name = `Paldean Fates`
  - printed_set_abbrev = `PAF`
  - printed_total = `91`
- `sv4pt5`
  - name = `Paldean Fates`
  - printed_set_abbrev = `PAF`
  - printed_total = `91`

### Collision audit proof

Using the live repository `gv_id` convention:

- candidate_count = `245`
- distinct_proposed_gvid_count = `245`
- internal_collision_count = `0`
- live_gvid_collision_count = `146`

Live collision breakdown:

- `sv4pt5` = `146`

Additional stored-evidence note:

- `sv04.5` vs `sv4pt5` same-number same-name rows = `146`

That is not full-population equivalence, so `sv4pt5` still cannot be treated as a collapse target.
But it does prove that the current public `GV-PK-PAF-*` namespace is already partially occupied.

## GV_ID Derivation Rule Used

Source of truth:

- [buildCardPrintGvIdV1.mjs](/C:/grookai_vault/backend/warehouse/buildCardPrintGvIdV1.mjs)

For numeric base rows, the live rule is:

- `GV-PK-{PRINTED_SET_ABBREV}-{PRINTED_NUMBER}`

Applied to `sv04.5`, with stored `printed_set_abbrev = PAF`, that yields examples such as:

- `GV-PK-PAF-001`
- `GV-PK-PAF-100`

Those values are already live on the separate `sv4pt5` shiny lane for `146` rows.

## Risks

- accidental public-key collision with `sv4pt5`
- accidental mixing of main-lane and shiny-lane identities
- treating separate set populations as interchangeable because they share `PAF`
- overwriting or shadowing existing canonical public routes

## Verification Plan

The phase required all of:

1. candidate count = `245`
2. printed-number uniqueness
3. zero exact canonical overlap excluding `sv4pt5`
4. stable printed set abbreviation proof
5. zero proposed `gv_id` collisions

Result:

- items `1` through `4` passed
- item `5` failed with `146` live collisions

## Post-Apply Truth

No apply occurred.

- promoted_total = `0`
- remaining null `gv_id` in `sv04.5` = `245`
- live collision count under current convention = `146`
- `sv4pt5` remained untouched

## Status

STOPPED LAWFULLY

Current blocker:

- the existing public `GV-PK-PAF-*` namespace is already occupied by the separate `sv4pt5` shiny lane

This phase cannot proceed safely without a new explicit decision on public token separation for `sv04.5` versus `sv4pt5`.
