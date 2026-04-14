# G1_RC_PREFIX_PROMOTION_LANE_AUDIT_V1

## Context

- `g1` base-variant collapse is complete.
- `16` unresolved rows remain.
- All `16` remaining rows sit on the RC-prefix printed-token surface and require promotion, not collapse.

## RC Identity Lane Definition

- RC-prefixed printed tokens in `g1` are a first-class printed identity lane.
- They are not suffixes.
- They are not normalization artifacts.
- They are not fan-in cases.
- Live canonical RC rows already establish the contract:
  - `number = RC##`
  - `number_plain = <numeric part>`
  - `variant_key = rc`
  - `gv_id = GV-PK-GEN-RC##`

## Collision Proof

- `promotion_candidate_count = 16`
- `identity_collision_count = 0`
- `gv_id_collision_count = 0`
- `collision_count = 0`
- `unclassified_count = 0`

## Important Live Nuance

- Raw numeric overlap with base-set rows exists for all `16` candidates.
- This is not an identity collision.
- The lawful separator is `variant_key = rc` plus the RC-prefixed printed token and RC-prefixed `gv_id`.

## GV-ID Proof

- Proposed format: `GV-PK-GEN-RC##`
- Existing canonical RC rows already use this exact namespace.
- The missing RC numbers in the unresolved set have no live `gv_id` collisions.
- The promotion namespace is therefore deterministic and readable.

## Promotion Readiness

- All `16` rows classify as `PROMOTION_READY_COLLISION_FREE`.
- No namespace audit split is required.
- No schema change is required.
- The next lawful unit is `G1_RC_PREFIX_EXACT_TOKEN_PROMOTION_V1`.

## Proof Examples

- `Gulpin / RC12 -> number_plain 12, variant_key rc, gv_id GV-PK-GEN-RC12`
- `Charmander / RC3 -> number_plain 3, variant_key rc, gv_id GV-PK-GEN-RC3`
- `Gardevoir EX / RC30 -> number_plain 30, variant_key rc, gv_id GV-PK-GEN-RC30`
