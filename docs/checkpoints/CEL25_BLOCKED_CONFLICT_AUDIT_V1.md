# CEL25_BLOCKED_CONFLICT_AUDIT_V1

## Context

`cel25` is almost complete:

- `DUPLICATE_COLLAPSE = 25` complete
- `BASE_VARIANT_COLLAPSE = 20` complete
- `BLOCKED_CONFLICT = 2` remaining

This audit is read-only. No mutation was performed.

## Detailed Row Analysis

### `c2bdbb6f-10de-4a93-abcf-ed3b8837908b / Umbreon Star / 17A`

- normalized name: `umbreon star`
- normalized token: `17`
- classification: `TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES`

Candidate targets in `cel25`:

- `46910a9f-597c-4e29-9fbb-3974d74a3e51 / Groudon / 17 / GV-PK-CEL-17 / variant_key='' / match_type=partial`
- `c9c1a789-a686-4541-99b7-ac7d4de7be30 / Umbreon ★ / 17 / GV-PK-CEL-17CC / variant_key='cc' / match_type=partial`

Why it is blocked:

- base token `17` maps to two different canonical `cel25` identities
- the source uses the word `Star`, while the likely classic-collection target uses the star symbol `★`
- current `NAME_NORMALIZE_V3` does not equate `Star` and `★`
- token stripping alone is therefore unsafe because it would collide with a different real card (`Groudon`)

### `f7c22698-daa3-4412-84ef-436fb1fe130f / Gardevoir ex / 93A`

- normalized name: `gardevoir ex`
- normalized token: `93`
- classification: `IDENTITY_MODEL_GAP`

Candidate target in `cel25`:

- `b4a42612-945d-419f-a4f4-c64ae5c26d6b / Gardevoir ex δ / 93 / GV-PK-CEL-93CC / variant_key='cc' / match_type=partial`

Why it is blocked:

- only one same-base canonical target exists
- the remaining distinction is the delta-species symbol `δ`
- current `NAME_NORMALIZE_V3` does not encode delta-species equivalence
- the source omits the modifier entirely, so there is no lawful proof that bare `Gardevoir ex` and `Gardevoir ex δ` are equivalent under the current model

## Classification Summary

- `blocked_row_count = 2`
- `TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES = 1`
- `IDENTITY_MODEL_GAP = 1`
- all other categories = `0`
- `UNCLASSIFIED = 0`

## Root Cause Category

`cel25` is blocked by symbol-bearing classic-collection identity semantics that fall outside the current stable normalization contract.

More precisely:

- one row is a shared-token collision that needs symbol-aware ownership proof
- one row is a direct identity-model gap because the decisive delta-species modifier is not represented in the current deterministic normalization contract

## Decision Boundary

No existing execution class applies safely:

- not `DUPLICATE_COLLAPSE`: neither row has an exact lawful target
- not standard `BASE_VARIANT_COLLAPSE`: current suffix routing cannot prove symbolic equivalence
- not `ALIAS_COLLAPSE`: no lawful cross-lane namespace owner is required
- not `PROMOTION_REQUIRED`: canonical `cel25` target evidence already exists

The remaining blocker is not missing data. It is missing symbol-aware identity policy.

## Next Execution Recommendation

Exact next lawful execution unit:

- `CEL25_SYMBOL_SEMANTICS_CONTRACT_AUDIT_V1`

That unit should:

- define whether `Star -> ★` is lawful normalization in classic-collection surfaces
- define whether bare `ex` may collapse to `ex δ` in `cel25`, or whether that requires a stronger identity rule than name normalization
- produce a symbol-aware contract before any apply runner is generated

## Result

The final `cel25` blocked surface is fully understood. The next step is a symbol-semantics contract audit, not another collapse apply.
