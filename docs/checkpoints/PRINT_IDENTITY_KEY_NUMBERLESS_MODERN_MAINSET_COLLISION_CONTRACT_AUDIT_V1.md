# PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_COLLISION_CONTRACT_AUDIT_V1

## Context

The prior execution unit `PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_NUMBER_RECOVERY_APPLY_V1` failed closed in dry-run:

- `rows_updated = 0`
- `collision_count = 693`

This audit explains those collision cases directly.

Important correction:

- the full modern numberless family is `1125` rows
- only the `693` collision rows are proven shadow duplicates of existing canon
- the remaining `432` modern rows are not explained by this collision contract and must stay in a separate surface

## Failed Number Recovery Explanation

Authoritative `tcgdex` number recovery itself was valid:

- every modern family row had one active `tcgdex` mapping
- every mapped row had one matching `tcgdex` raw import
- recovered `tcgdex` number matched the canonical set lane and card name

The failure occurred because restored `number_plain` values collided with already-numbered canonical rows.

This means the blocked surface was misclassified:

- these 693 rows are not missing-number identities
- they are numberless duplicate shadow rows pointing at already-existing canon

## Identity Equivalence Proof

Live proof across the full 1125-row modern family:

- `modern_family_count = 1125`
- `collision_surface_count = 693`
- `non_collision_surface_count = 432`
- `exact_one_to_one_candidate_count = 693`
- `multi_target_count = 0`
- `normalized_name_match_count = 693`
- `normalized_name_mismatch_count = 0`

For every one of the 693 collision rows:

- set code matches the existing canonical target
- recovered `tcgdex` number matches the target `number_plain`
- normalized name matches the target normalized name
- exactly one canonical target exists

Therefore all 693 collision rows are:

- `IDENTITY_EQUIVALENT_SHADOW_ROWS`

Examples:

- `sv02 / Abomasnow / tcgdex 011` -> existing canonical `sv02 / Abomasnow / 11`
- `sv02 / Bramblin / tcgdex 022` -> existing canonical `sv02 / Bramblin / 22`
- `sv02 / Meowscarada ex / tcgdex 015` -> existing canonical `sv02 / Meowscarada ex / 15`

## Correct Classification

Correct reclassification:

- `693` rows -> `IDENTITY_EQUIVALENT_SHADOW_ROWS`
- `432` rows -> still unresolved modern non-collision rows outside this contract

So the earlier assumption was too broad:

- it is false that all `1125` rows are shadow rows
- it is true that the `693` collision subset is shadow-equivalent and should leave the blocker surface

## Root Cause

The modern numberless collision subset is an ingestion artifact.

Characteristics:

- canonical numbered row already exists
- shadow row exists without local number surface
- shadow row carries enough external evidence to resolve to the existing canonical row
- the row must not be treated as a new canonical identity

## System Rule

If all are true:

- same set
- same normalized name
- authoritative `tcgdex` number matches an existing canonical `number_plain`
- exactly one canonical target exists

Then:

- do not backfill the shadow row
- do not derive a new `print_identity_key` on the shadow row
- do not keep it as a blocker
- treat it as `IDENTITY_EQUIVALENT_SHADOW_ROWS`
- resolve by canonical reuse realignment

## Resolution Strategy

The correct future execution for this surface is:

- `REUSE_CANONICAL_REALIGNMENT`

Bounded future steps:

1. map each shadow row to its single canonical target
2. repoint dependent FK surfaces
3. verify zero remaining refs to the shadow row
4. delete the shadow row

## Impact

Blocked-surface impact after reclassification:

- original blocked surface = `1332`
- shadow rows removed from blocker surface = `693`
- remaining true blockers = `639`

Remaining true blockers break down as:

- `432` unresolved modern non-collision rows
- `207` blockers outside the modern family

## Next Execution Path

- `next_execution_unit = PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_SHADOW_ROW_REUSE_REALIGNMENT_V1`

Why this is the safest deterministic next step:

- the 693-row collision subset is exact and one-to-one
- there is no target ambiguity
- this step removes false blockers without relaxing the identity model
- the remaining 432 modern rows can be handled later as a separate bounded surface
