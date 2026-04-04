# CHECKPOINT: COLLAPSE_DUPLICATE_LANE_V1

## Context

During the identity rollout, the legacy English null-`gv_id` parent lane remained parallel to the canonical `gv_id` lane. The active identity surface now makes the duplicate-lane problem measurable from live stored fields:

- `10613` active identity-backed null-`gv_id` parents
- `0` of those parents are routable by `/card/[gv_id]`
- collapse must preserve canonical `gv_id` rows and only move references from provably duplicate null-lane rows

## What was proven for Phase 1

Phase 1 was narrowed to strict, 1:1 exact duplicate proof only:

- old row: active identity-backed parent where `card_prints.gv_id is null`
- new row: canonical parent where `card_prints.gv_id is not null`
- exact match rule:
  - `set_code_identity`
  - `printed_number`
  - `normalized_printed_name`
- excluded set family:
  - `cel25`

Under that exact rule, the current live proof is:

- strict old-lane pool after `cel25` exclusion: `10566`
- strict ready collapse map: `7131`
- ambiguous old-side matches: `0`
- reused canonical targets: `0`
- digits-only near matches excluded from Phase 1: `31`
- still unmatched after strict Phase 1: `3405`

## Important correction

The previously proposed `7873` safe-duplicate count is not reproducible under the strict Phase 1 rule.

Current evidence supports:

- `7131` provable strict duplicates

It does **not** support promoting the larger number into execution without a broader matching contract.

## Decision

Phase 1 is frozen at the strict proven set only.

Implementation artifact:

- [collapse_duplicate_lane_phase1_dry_run_v1.sql](/C:/grookai_vault/docs/sql/collapse_duplicate_lane_phase1_dry_run_v1.sql)

That SQL:

- builds the exact `collapse_map` candidate surface with temp tables only
- exposes blocked buckets separately
- keeps `cel25` excluded
- does not repoint FKs
- does not delete rows

## Invariants

- `gv_id` never changes in Phase 1
- only 1:1 exact duplicate pairs are eligible
- any ambiguous or reused match blocks collapse
- digits-only number equivalence is not silently upgraded into exact equivalence

## Next Phase

Only after this strict map is accepted:

1. FK inventory on the `7131` proven pairs
2. collision audit per referencing surface
3. controlled repoint plan

## Status

READY FOR PHASE 1 DRY-RUN REVIEW
