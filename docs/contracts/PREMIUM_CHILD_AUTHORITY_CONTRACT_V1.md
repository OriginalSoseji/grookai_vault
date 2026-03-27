# PREMIUM_CHILD_AUTHORITY_CONTRACT_V1

## Status
ACTIVE

## Purpose

This contract defines the lawful authority model for premium child finishes in Grookai Vault.

This phase governs ONLY the standard/global premium child lane for:

- `pokeball`
- `masterball`

It does NOT govern special-set finish families outside the locked global vocabulary.

---

## Scope

This contract applies only to premium child finishes that are already lawful under:

- `VERSION_VS_FINISH_CONTRACT_V1.md`
- `CHILD_PRINTING_CONTRACT_V1.md`

and are expressible through the currently allowed global finish vocabulary:

- `pokeball`
- `masterball`

This contract does not expand finish vocabulary.

---

## Explicit Exclusion

This contract explicitly excludes special-set finish families outside the current global vocabulary.

Examples excluded from this phase include:
- `Energy Symbol`
- `Rocket Finish`
- any other set-local or unsupported finish pattern

This contract also excludes any special handling for `me02.5` outside lawful `pokeball` / `masterball` scope.

These remain deferred and must not influence global premium authority.

---

## Core Authority Rule

A premium child row for `pokeball` or `masterball` may exist ONLY when premium eligibility is proven by a contract-backed authority artifact.

No premium child row may be treated as governed truth based only on:
- external naming
- source sibling structure
- existing legacy child rows
- source labels alone
- the raw shape of an old eligibility table

---

## Authority Artifact Rule

The lawful authority artifact for global premium child finishes must be row-level and deterministic.

It must be keyed by:

- `set_code`
- normalized collector number
- `finish_key`

The artifact must support only:

- `pokeball`
- `masterball`

for this phase.

---

## Required Authority Metadata

Each authority row must carry explicit metadata sufficient for audit and future reconciliation.

Required metadata:

- `authority_source`
- `authority_ref`
- `finish_key`
- `set_code`
- normalized collector number
- optional notes / exclusion field if needed

The authority artifact must not depend on padded text-number matching.

Normalized number comparison must be first-class.

---

## Relationship To Existing Legacy Data

Existing premium child rows do NOT define authority.

Legacy rows may be:
- retained
- reconciled
- or rejected

only after comparison against the authority artifact.

Legacy premium rows are evidence only until reconciled.

---

## Reconciliation Rule

A legacy premium child row may be considered lawful only if:

1. its parent canonical card already exists
2. its `finish_key` is within global scope:
   - `pokeball`
   - `masterball`
3. it matches an authority artifact row exactly on:
   - `set_code`
   - normalized collector number
   - `finish_key`

Rows outside that match remain ungoverned and must not be treated as lawful premium truth.

---

## Source Boundary

External systems may help discover or validate premium candidates, but they do not define premium authority by themselves.

Examples:
- JustTCG may provide candidate or validation signals
- TCGdex and PokemonAPI may contribute evidence if available

But none of these become premium authority without the contract-backed artifact.

---

## Global Vocabulary Rule

This phase does not modify the global finish vocabulary.

It assumes the current lawful global premium child finishes are only:

- `pokeball`
- `masterball`

No additional finish keys may be introduced through this contract.

---

## Special-Set Boundary

If a set contains finish treatments outside the global premium vocabulary, that set must be handled in a separate bounded phase.

Special-set finish treatments must not be generalized into global child law.

This is mandatory for database hygiene and drift prevention.

---

## Invariants

1. `pokeball` and `masterball` are the only premium child finishes governed by this phase.
2. Premium child authority must be row-level and deterministic.
3. Existing legacy premium rows are not authority.
4. Premium truth is not defined by external naming alone.
5. `me02.5` special finishes are excluded from this phase.
6. Global finish vocabulary must not be widened here.
7. Unmatched premium rows remain ungoverned until separately resolved.
8. Special-case finish families must not pollute the global database model.

---

## Result

This contract defines the lawful authority boundary for global premium child finishes.

It enables Grookai to:
- govern `pokeball` / `masterball`
- reconcile legacy premium rows safely
- keep special-set finish families isolated
- prevent special-case logic from polluting the global child model
