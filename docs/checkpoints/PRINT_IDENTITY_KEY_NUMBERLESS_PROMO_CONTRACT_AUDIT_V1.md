# PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_CONTRACT_AUDIT_V1

## Context

- Remaining blocked `print_identity_key` surface after shadow-row realignment:
  - `blocked_count = 639`
- This artifact covers only the next bounded family:
  - `FAMILY_2_NUMBERLESS_PROMO_BATCH = 181`
- Live family breakdown:
  - `me01 = 83`
  - `svp = 73`
  - `2021swsh = 25`

The important correction from live data is that this family is not truly
numberless upstream. The local canonical rows have no populated `number` or
`number_plain`, but every in-scope row has an authoritative promo identifier via
active TCGdex mapping.

## Promo Identity Behavior

Observed live behavior:

- all 181 rows have active `tcgdex` mappings
- all 181 rows expose a stable upstream promo identifier through
  `raw_imports.payload.card.localId`
- local `raw_number` is null across the batch, so the authoritative promo number
  source is `localId`, not `number`
- `printed_identity_modifier` is blank for all 181 rows

Examples:

- `svp / Alakazam ex / tcgdex = svp-050 / localId = 050`
- `me01 / Bulbasaur / tcgdex = me01-001 / localId = 001`
- `2021swsh / Pikachu / tcgdex = 2021swsh-25 / localId = 25`

Implication:

- the batch needs a promo-number contract, not a fallback name-only contract
- the modifier-based fallback branch is defined for future promo rows but is not
  exercised by this live surface

## Contract Rules

Selected strategy:

- `selected_contract_strategy = PROMO_IDENTITY_LANE`

Rejected options:

- `OPTION A: FORCE NUMBER REQUIREMENT`
  - invalid for local state because the canonical rows do not store promo
    numbers yet
- `OPTION B: NAME + SET ONLY`
  - unsafe; live simulation produced `7` collision groups affecting `14` rows

Adopted rule:

If authoritative promo number exists:

```text
print_identity_key =
lower(concat_ws(':',
  set_code,
  promo_number,
  normalized_name
))
```

If a future promo row lacks promo number but has a lawful printed modifier:

```text
print_identity_key =
lower(concat_ws(':',
  set_code,
  normalized_name,
  printed_identity_modifier
))
```

Current live batch outcome:

- `promo_number_present_count = 181`
- `promo_number_absent_count = 0`
- `event_identifier_present_count = 0`
- `stamp_variant_count = 0`

## Collision Analysis

Option comparison:

- `set_code + normalized_name` only
  - `option_b_collision_group_count = 7`
  - `option_b_collision_row_count = 14`
- `set_code + promo_number + normalized_name`
  - `collision_count = 0`
  - `ambiguity_count = 0`

The 7 live same-name promo families are all inside `svp` and prove that
name-only derivation would collapse lawful distinct promo identities.

Examples:

- `Charizard ex`
  - promo numbers `056` and `074`
- `Cleffa`
  - promo numbers `037` and `095`
- `Koraidon`
  - promo numbers `014` and `091`

## Classification

Final classification counts:

- `PROMO_CANONICAL = 167`
- `PROMO_VARIANT = 14`
- `NON_CANONICAL = 0`

Classification rule used:

- `PROMO_CANONICAL`
  - unique `(set_code, promo_number, normalized_name)` and no same-name sibling
    inside the same promo set
- `PROMO_VARIANT`
  - same normalized name appears multiple times inside the same promo set, but
    each row has a distinct promo number and remains lawful under the promo lane
- `NON_CANONICAL`
  - missing promo number or duplicate exact promo identity

Interpretation:

- the 14 variant rows are still lawful canon
- they simply prove that promo numbering, not name alone, owns identity

## Risks

- treating promo rows as standard mainset rows would force invalid `number_plain`
  assumptions into a lane that already has authoritative upstream promo numbers
- using `set + name` without promo number would collapse 14 lawful rows
- future promo rows without `localId` or without a lawful printed modifier must
  be audited separately before apply

## Final Decision

- `promo_row_count = 181`
- `collision_count = 0`
- `selected_contract_strategy = PROMO_IDENTITY_LANE`
- `safe_to_derive_promos = yes`
- `next_execution_unit = PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V1`
- `audit_status = passed`

The safe next step is a bounded backfill apply for this 181-row batch using the
authoritative promo number recovered from TCGdex `localId`. The modifier
fallback branch stays defined but excluded unless a future promo surface
actually needs it.
