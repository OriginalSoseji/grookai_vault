# CEL25C_HERE_COMES_TEAM_ROCKET_CANONICAL_PROMOTION_V1

## Context

The prior Classic Collection audit reduced the final stale JustTCG bridge to one missing same-set card:

- `Here Comes Team Rocket!`
- set: `cel25c`
- current bridge target: non-canonical placeholder `c267755e-9f4a-4ed5-a6aa-190dd42ae977`

This artifact attempted the bounded single-row canonical promotion requested by the audit:

- `name = Here Comes Team Rocket!`
- `number = 15`
- `number_plain = 15`
- `variant_key = cc`
- `gv_id = GV-PK-CEL-15CC`

## Live Dry-Run Result

The requested promotion contract is not insert-safe live.

Hard-gate blocker:

- `BLOCKED_IDENTITY_KEY_COLLISION`
- `BLOCKED_GV_ID_COLLISION`

Collision target:

- `d62d4f5c-277b-4f32-b5aa-a393d990fbb3`
- `Venusaur`
- `set_code = cel25c`
- `number = 15`
- `number_plain = 15`
- `variant_key = cc`
- `gv_id = GV-PK-CEL-15CC`

That means the requested Classic Collection identity contract is already occupied by another canonical row in the same set.

## Why Apply Stopped

The earlier missing-card audit correctly proved that no same-set canonical `Here Comes Team Rocket!` row exists.

It did not prove the stronger condition required for insertion:

- the proposed same-set identity key must be free
- the proposed `gv_id` must be free

Both fail live under the requested bounded contract.

As a result, inserting `Here Comes Team Rocket!` with:

- `number_plain = 15`
- `variant_key = cc`
- `gv_id = GV-PK-CEL-15CC`

would create an invalid canonical collision rather than resolve the stale bridge lawfully.

## Invariants Preserved

- no canonical rows inserted
- no canonical rows updated
- no `gv_id` values changed
- no JustTCG mappings changed
- stale bridge remains blocked instead of being remapped unsafely

## Root Cause

`cel25c` currently models Classic Collection canon with:

- `variant_key = cc`
- `number_plain = original collector number`
- `gv_id = GV-PK-CEL-<number>CC`

That contract works only when the Classic Collection card is uniquely identified by its original collector number.

`Here Comes Team Rocket!` breaks that assumption because the requested `15CC` slot is already occupied by `Venusaur`.

This is a namespace and identity-contract gap inside the remaining unresolved `cel25c` placeholders, not a safe single-row insert.

## Next Step

Required next unit:

- `CEL25C_CLASSIC_COLLECTION_NUMBERING_CONTRACT_AUDIT_V1`

That contract audit must define the lawful same-set disambiguation strategy for unresolved Classic Collection placeholders before any further single-row promotion is attempted.

## Result

The requested bounded promotion was implemented as a fail-closed artifact.

Live status:

- `rows_inserted = 0`
- `canonical_count_delta = 0`
- `gv_id_created = null`
- `apply_status = blocked_hard_gate`

The final stale JustTCG row remains correctly blocked until the `cel25c` Classic Collection numbering contract is defined.
