# XY3_BLOCKED_CONFLICT_AUDIT_V1

Status: Passed
Set: `xy3`
Blocked row count: `1`

## Context
- `xy3` base-variant collapse is complete for the apply-safe surface.
- One unresolved row remains:
  - `696cf830-c004-4fcf-9284-00e4e39eaf25 / M Lucario EX / 55`
- This phase was audit-only and performed no mutation.

## Row Analysis
- Blocked row:
  - `old_parent_id = 696cf830-c004-4fcf-9284-00e4e39eaf25`
  - `name = M Lucario EX`
  - `normalized_name = m lucario ex`
  - `normalized_token = 55`
  - source printed token is unsuffixed: `55`
  - source external mapping is unsuffixed: `tcgdex = xy3-55`
  - source normal-print provenance is unsuffixed: `xy3-55`
- Canonical candidates:
  - `2bc6a250-d786-4719-8a7f-9063489e5d73 / M Lucario-EX / 55 / GV-PK-FFI-55`
  - `5862d23e-8526-4055-baf2-cc478ce02ea9 / M Lucario EX / 55a / GV-PK-FFI-55A`
- Candidate split:
  - `GV-PK-FFI-55` is the exact-token owner
  - `GV-PK-FFI-55A` is a suffix-expanded variant owner
- Both candidates share:
  - same set: `xy3`
  - same normalized name: `m lucario ex`
  - same base token: `55`

## Classification
- Final classification: `MULTI_CANONICAL_TARGET_CONFLICT`
- Root cause: `EXACT_TOKEN_VS_SUFFIX_VARIANT_COLLISION_ON_SHARED_NORMALIZED_SURFACE`

## Why Current System Cannot Resolve It
- `NAME_NORMALIZE_V3` lawfully reduces `M Lucario EX` and `M Lucario-EX` to the same normalized name.
- `TOKEN_NORMALIZE_V1` extracts base token `55`, which also reaches the suffixed canonical row `55a`.
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
  - source printed token: `55`
  - source external id: `xy3-55`
  - source provenance ref: `xy3-55`
- Candidate evidence:
  - base candidate: printed token `55`
  - suffix candidate: printed token `55a`
- There is no blocked-source evidence for `55a`.
- The ambiguity is therefore created by the generic matching surface, not by the printed source itself.

## Next Execution Recommendation
- Exact next lawful execution unit: `XY3_EXACT_TOKEN_PRECEDENCE_COLLAPSE_V1`
- Required scope of that follow-up:
  - single row only
  - same set only
  - require one exact-token canonical target and one suffix-expanded alternative
  - require source evidence to remain unsuffixed
  - collapse only to the exact-token owner `GV-PK-FFI-55`
  - keep `GV-PK-FFI-55A` untouched

## Why That Next Unit Is Safe
- The candidate set is fully known and bounded to one row.
- The source token and source provenance both point to unsuffixed `55`.
- The suffix candidate is a distinct canonical row, but it is not supported by the blocked source evidence.
- A narrow exact-token precedence rule can therefore resolve this row without broadening global normalization behavior.
