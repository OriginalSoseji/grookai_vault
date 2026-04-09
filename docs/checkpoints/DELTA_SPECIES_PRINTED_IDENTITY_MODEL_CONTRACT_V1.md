# DELTA_SPECIES_PRINTED_IDENTITY_MODEL_CONTRACT_V1

## Context

`cel25` is fully resolved except for one final identity-model-gap row:

- source row: `f7c22698-daa3-4412-84ef-436fb1fe130f / Gardevoir ex / 93A`
- same-set canonical candidate: `b4a42612-945d-419f-a4f4-c64ae5c26d6b / Gardevoir ex δ / GV-PK-CEL-93CC`

Existing execution classes are exhausted:

- not duplicate collapse
- not base-variant normalization
- not alias collapse
- not bounded star-symbol equivalence

The blocker is model-level:

- `δ` is identity-bearing
- collapsing `Gardevoir ex` into `Gardevoir ex δ` would destroy printed identity

This step is contract design only. No schema mutation or data mutation was performed.

## Blocked `cel25` Case

The residual `cel25` candidate already uses the current structured variant lane:

- `set_code = cel25`
- `number_plain = 93`
- `variant_key = cc`
- `gv_id = GV-PK-CEL-93CC`

That means the current canonical row already carries one identity delta:

- `cc` = Classic Collection canonical lane

But the same canonical row also carries a second printed-identity distinction:

- `δ` = Delta Species modifier

Current schema can represent the first dimension, but not the second one as an orthogonal canonical identity field.

## Semantic Proof

`δ` is not:

- punctuation
- typography cleanup
- finish
- advisory metadata

`δ` is:

- a printed identity modifier physically present on the card face
- distinct from the base printed identity
- not lawfully droppable during normalization

Repo-grounded evidence:

- canonical `δ` rows in live canon: `194`
- sets with canonical `δ` rows: `11`
- canonical `δ` rows with explicit delta-specific structured trait hits: `0`
- canonical `δ` rows with blank `variant_key`: `193`
- `cel25` is the only observed case where `δ` coexists with a nonblank `variant_key`

That last point is the decisive model gap:

- existing `variant_key` can already encode one canonical delta
- Delta Species needs a second canonical dimension when another delta is already present

## Model Limitation

Exact limitation:

- current canonical identity modeling is effectively one-dimensional beyond `(set_id, number_plain)`
- `variant_key` is already the primary canonical delta lane
- there is no orthogonal printed-identity modifier field for delta-species semantics

Therefore the remaining `cel25` row cannot be resolved safely because Grookai cannot currently express:

- `Classic Collection` identity delta
- and `Delta Species` identity delta

at the same time as separate structured components.

## Extension Design

Introduce a new bounded canonical field on `card_prints`:

```sql
printed_identity_modifier text null
```

Initial allowed values:

- `null`
- `'delta_species'`

This field is orthogonal to `variant_key`.

It does **not** replace `variant_key`.

## Identity Rule

Canonical identity must become:

```text
(set_id, number_plain, printed_identity_modifier, variant_key)
```

This preserves existing invariant behavior while allowing multiple structured identity deltas to coexist.

Examples:

- base `Gardevoir ex`
  - `printed_identity_modifier = null`
  - `variant_key = ''`

- `Gardevoir ex δ`
  - `printed_identity_modifier = 'delta_species'`
  - `variant_key = ''`

- `Gardevoir ex δ` in `cel25` Classic Collection
  - `printed_identity_modifier = 'delta_species'`
  - `variant_key = 'cc'`

These must all be distinct canonical identities when they are physically distinct printed cards.

## Extraction Rule

Delta-species detection must remain strict:

- detect explicit `δ`
- detect explicit printed `Delta Species` wording only when it is actually present on the source surface

Do not infer `delta_species` from:

- Pokémon typing
- set membership
- external API guesses
- card family knowledge

## Forbidden Behaviors

The following remain unlawful:

- `ex -> ex δ`
- `δ -> null`
- collapsing delta-species into base identity
- storing delta-species only in traits JSON
- treating delta-species as a finish
- overloading `variant_key` to represent delta-species when another variant delta already exists

## Invariants

1. Printed identity must preserve all identity-bearing symbols printed on the card face.
2. `printed_identity_modifier` and `variant_key` are separate dimensions.
3. Existing rows with no delta-species semantics default to `printed_identity_modifier = null`.
4. Existing `variant_key` behavior remains intact.
5. Resolver, routing, and future promotion logic must distinguish base rows from delta-species rows.
6. No normalization contract may erase `δ`.

## Future Migration Plan

Design-only migration requirements:

1. Add the new column:

```sql
alter table public.card_prints
add column printed_identity_modifier text;
```

2. Backfill existing rows:

- default all existing rows to `null`
- future delta-species backfill must be explicit and audited

3. Update canonical uniqueness from the current effective shape:

```text
(set_id, number_plain, variant_key)
```

to:

```text
(set_id, number_plain, printed_identity_modifier, variant_key)
```

4. Extend `gv_id` planning in a follow-up contract so delta-species canonical rows remain route-distinct without overloading the existing `variant_key` suffix rule.

## Decision

Contract status:

- `defined`

Migration required:

- `yes`

## Next Execution Unit

Exact next lawful execution unit:

- `DELTA_SPECIES_PRINTED_IDENTITY_SCHEMA_AND_GVID_PLAN_V1`

That unit should:

- plan the schema migration
- define the bounded `gv_id` impact
- keep resolver / ingestion / UI follow-up scoped to the new field

## Result

The identity boundary is now explicit:

- delta-species is a printed identity modifier
- it must not collapse into base identity
- it needs a dedicated structured dimension on `card_prints`
- `cel25` exposed the gap because it needs both `cc` and `delta_species` simultaneously
