# PRINTED_IDENTITY_MODEL_V1

Status: ACTIVE  
Type: Canon Identity Contract  
Scope: Governs how Grookai models physically printed modifier deltas that change canonical card identity.

## 1. Purpose

Printed modifiers that are physically present on the card face can create canonical identity deltas.

This contract closes the remaining stamp-family ambiguity between warehouse review, interpreter output, and promotion write planning.

## 2. Hard Rule

Stamped cards are always new canonical rows.

Stamped cards are never:

- child printings
- finish variants
- purely advisory metadata

## 3. Identity Consequence

If a card matches an existing base identity but contains a printed stamp, Grookai treats it as a different canonical `card_prints` identity.

The stamped card must not collapse into the unstamped base row.

## 4. Canonical Modeling Rule

Grookai already has a lawful canonical identity field for this distinction: `card_prints.variant_key`.

Repo-grounded authority:

- `GV_SCHEMA_CONTRACT_V1` defines print identity as `(set_id, number_plain, variant_key)`
- `card_prints` uniqueness already includes `variant_key`

Therefore, stamped-card canonical identity in V1 must be represented through `variant_key`.

No new schema field is required.

## 5. Variant Key Rule

For stamp-backed canonical rows:

- `variant_key` must carry the printed identity delta
- the value must be deterministic
- the value must be stable across extraction, interpretation, planning, and promotion
- the value must use lower_snake_case

Examples:

- `pokemon_together_stamp`
- `staff_stamp`
- `prerelease_stamp`

If a structured stamp signal exists but no lawful `variant_key` can be derived deterministically, promotion must block explicitly.

## 6. Child Printing Exclusion

Child printings remain reserved for finish and bounded parallel relationships governed by existing child-printing contracts.

Stamped cards are excluded from that lane.

Stamps must not be mapped to:

- `card_printings`
- `finish_key`
- finish vocabularies

This contract closes the prior provisional stamp gate left open by `CHILD_PRINTING_CONTRACT_V1`.

## 7. Required Interpreter Behavior

When a structured printed modifier is READY and it is a stamp-backed identity delta:

- `decision = NEW_CANONICAL_REQUIRED`
- `reason_code = PRINTED_IDENTITY_DELTA_DETECTED`
- `proposed_action = CREATE_CARD_PRINT`

Interpreter output must explicitly state that the printed stamp creates a new canonical row under this contract.

The interpreter must not downgrade a lawfully detected stamp into generic `HOLD_FOR_REVIEW` solely because it is a stamp.

## 8. Required Write Plan Behavior

For a lawfully detected stamped card:

- `card_prints.action = CREATE`
- payload must carry the stamped `variant_key`
- `card_printings.action = NONE` unless another independent non-stamp rule applies

Write planning must block only when an actually required canonical field is missing.

It must not block merely because the modifier is a stamp.

## 9. Failure Mode

If a stamp is detected but the planner still lacks a lawful canonical write shape:

- block explicitly
- report the missing canonical requirement
- do not collapse into the existing base card
- do not reroute into child printings

## 10. Examples

### Pokemon Together stamp

- Base identity may resolve to the same set and collector number as the unstamped card
- printed stamp creates a new canonical row
- lawful modeled identity uses `variant_key = pokemon_together_stamp`

### Staff stamp

- staff marking is a printed identity delta
- lawful modeled identity uses a stamp-backed canonical `variant_key`
- it is not a child printing

### Prerelease stamp

- prerelease marking is a printed identity delta
- lawful modeled identity uses a stamp-backed canonical `variant_key`
- it is not a finish and not a child printing

Core principle:

The physical printed identity delta governs canonical modeling, not market naming convenience.

## 11. Invariants

1. Printed stamp deltas survive beyond advisory metadata.
2. Stamp-backed identity must reach canonical planning as `variant_key`.
3. Stamps never map to `finish_key`.
4. Stamps never map to child printings.
5. The unstamped base card and the stamped card cannot share the same canonical identity.
6. Promotion must remain deterministic and replay-safe.

## 12. Result

After adoption of this contract:

- warehouse metadata can surface stamped identity explicitly
- interpreter can classify stamped cards as new canonical rows
- write planning can produce lawful `card_prints` create payloads for stamped cards
- founder review can approve stamped canonical identity without collapsing it into the base row
