# XY6_BLOCKED_CONFLICT_AUDIT_V1

Status: Passed
Set: `xy6`
Blocked row count: `1`

## Context
- `xy6` base-variant collapse is complete for the apply-safe surface.
- One unresolved row remains:
  - `dc8c3dce-bede-47d2-ac8a-095bb633a3ba / Shaymin EX / 77`
- This phase was audit-only and performed no mutation.

## Row Analysis
- Blocked row:
  - `old_parent_id = dc8c3dce-bede-47d2-ac8a-095bb633a3ba`
  - `name = Shaymin EX`
  - `normalized_name = shaymin ex`
  - `normalized_token = 77`
  - source printed token is unsuffixed: `77`
  - source external mapping is unsuffixed: `tcgdex = xy6-77`
- Canonical candidates:
  - `8ad97482-9c74-4ae2-b08f-ea15fa92077e / Shaymin-EX / 77 / GV-PK-ROS-77`
  - `420248aa-0279-4af7-889f-825602d0ae87 / Shaymin EX / 77a / GV-PK-ROS-77A`
- Candidate split:
  - `GV-PK-ROS-77` is the exact-token owner
  - `GV-PK-ROS-77A` is a suffix-expanded variant owner
- Both candidates share:
  - same set: `xy6`
  - same normalized name: `shaymin ex`
  - same base token: `77`

## Classification
- Final classification: `MULTI_CANONICAL_TARGET_CONFLICT`
- Root cause: the current base-variant matcher reaches both the exact-token canonical row and the suffix-owned variant row because both share the same normalized identity surface.

## Why Current System Cannot Resolve It
- `NAME_NORMALIZE_V3` lawfully reduces `Shaymin EX` and `Shaymin-EX` to the same normalized name.
- `TOKEN_NORMALIZE_V1` extracts base token `77`, which also reaches the suffixed canonical row `77a`.
- The generic `BASE_VARIANT_COLLAPSE` lane has no explicit exact-token precedence contract.
- Because of that, the runner fails closed once both canonical targets are visible from the normalized group.
- The row is blocked by pipeline design, not by missing candidates.

## Root Cause Category
- `EXACT_TOKEN_VS_SUFFIX_VARIANT_COLLISION_ON_SHARED_NORMALIZED_SURFACE`
- This is not:
  - a promotion case
  - a fan-in case
  - a model gap
  - a pure suffix-ownership conflict like `xy9`
- The distinguishing fact is that one lawful candidate preserves the unsuffixed printed token exactly.

## Deterministic Proof
- Source evidence:
  - source printed token: `77`
  - source external id: `xy6-77`
- Candidate evidence:
  - base candidate: printed token `77`
  - suffix candidate: printed token `77a`
- There is no source evidence for `77a`.
- The ambiguity is therefore created by the generic matching surface, not by the printed source itself.

## Next Execution Recommendation
- Exact next lawful execution unit: `XY6_EXACT_TOKEN_PRECEDENCE_COLLAPSE_V1`
- Required scope of that follow-up:
  - single row only
  - same set only
  - require one exact-token canonical target and one suffix-expanded alternative
  - require source evidence to remain unsuffixed
  - collapse only to the exact-token owner `GV-PK-ROS-77`
  - keep `GV-PK-ROS-77A` untouched

## Why That Next Unit Is Safe
- The candidate set is fully known and bounded to one row.
- The source token and source external evidence both point to unsuffixed `77`.
- The suffix candidate is a distinct canonical row, but it is not supported by the blocked source evidence.
- A narrow exact-token precedence rule can therefore resolve this row without broadening global normalization behavior.
