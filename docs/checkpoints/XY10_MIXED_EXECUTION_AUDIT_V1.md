# XY10_MIXED_EXECUTION_AUDIT_V1

Status: COMPLETE
Type: Mixed Execution Audit
Scope: `xy10`

## Context

`xy10` was selected from the mixed-execution bucket after `cel25` closure.
The selection audit already proved the set was not a pure single-lane surface:

- unresolved parent count = `25`
- canonical parent count = `126`
- fan-in group count = `2`
- blocked conflict count = `0`

This audit decomposes the unresolved surface into lawful execution lanes before any apply work begins.

## Audited Surfaces

- unresolved `xy10` parents where `gv_id is null`
- canonical `xy10` targets where `gv_id is not null`
- same-set normalized matches under `NAME_NORMALIZE_V3`
- token routing under `TOKEN_NORMALIZE_V1`
- many-to-one convergence groups that require active identity fan-in handling

## Classification Summary

- `BASE_VARIANT_COLLAPSE = 21`
- `ACTIVE_IDENTITY_FANIN = 4`
- `BLOCKED_CONFLICT = 0`
- `UNCLASSIFIED = 0`

The live audit therefore reduced `xy10` to one deterministic same-set normalization surface with two internal lanes:

1. `21` rows are straightforward one-to-one base-variant collapse.
2. `4` rows converge into `2` lawful normalization-only fan-in groups.

## Fan-In Groups

### Group 1

- target card print id: `b5b9f054-0c84-4e36-9c71-8427aed4e76f`
- target canonical surface: `Regirock-EX / 43a`
- incoming source rows:
  - `646c544c-44ac-44dc-a1cc-89400bb13eed / Regirock EX / 43`
  - `0eb4f292-c2d9-4a93-af1c-085a738216cd / Regirock EX / 43a`
- finding: normalization-only same-name convergence; no semantic divergence

### Group 2

- target card print id: `1c26e78c-bcb3-425b-ad7c-0ae4bfd85a18`
- target canonical surface: `Zygarde-EX / 54a`
- incoming source rows:
  - `2cd9568d-1566-46f9-85e1-8e20b292d197 / Zygarde EX / 54`
  - `fef737a9-d111-4e59-bf7d-3b2ee90dedf1 / Zygarde EX / 54a`
- finding: normalization-only same-name convergence; no semantic divergence

Both fan-in groups are lawful. Neither group introduces ambiguity, cross-set behavior, or blocked conflict.

## Proof Examples

### BASE_VARIANT_COLLAPSE

- `9b6f2460-e9fe-47f5-a4b8-b2e8ee8fac56 / Glaceon EX / 20 -> c68cecb9-c631-4896-ae52-224dbedf3f29 / GV-PK-FCO-20`
- `877090df-ae61-43d6-823e-23587760efee / Shauna / 111 -> 09cec9bf-60a8-4e4d-a239-3e65a37a451a / GV-PK-FCO-111A`
- `258ead4c-d2a6-4b64-bc9f-09cf29a374d1 / Genesect EX / 120 -> 46cab7e8-31d8-4a2b-9c6c-7750a201bfe7 / GV-PK-FCO-120`

### ACTIVE_IDENTITY_FANIN

- `646c544c-44ac-44dc-a1cc-89400bb13eed / Regirock EX / 43 -> shared canonical 43a target`
- `0eb4f292-c2d9-4a93-af1c-085a738216cd / Regirock EX / 43a -> shared canonical 43a target`
- `2cd9568d-1566-46f9-85e1-8e20b292d197 / Zygarde EX / 54 -> shared canonical 54a target`
- `fef737a9-d111-4e59-bf7d-3b2ee90dedf1 / Zygarde EX / 54a -> shared canonical 54a target`

### BLOCKED_CONFLICT

- none

### UNCLASSIFIED

- none

## Hard Findings

`xy10` is mixed only in the narrow sense that two normalization-only groups fan in to canonical suffix targets.
There is no blocked residue and no schema-level blocker.
Every unresolved row is same-set and deterministically explainable by the existing normalization model plus already-proven active identity fan-in handling.

## Next Execution Recommendation

Recommended next codex:

- `XY10_BASE_VARIANT_FANIN_COLLAPSE_V1`

Why this is the safest deterministic next step:

- all `25` unresolved rows are in the same normalization lane
- `21` rows are simple one-to-one base collapse
- `4` rows belong to `2` lawful fan-in groups
- there are `0` blocked conflicts
- there are `0` unclassified rows
- a split two-pass approach is unnecessary because the fan-in handling is already proven and bounded inside the same apply surface

## Closure Condition For This Audit

The audit passed because:

- every unresolved row was classified exactly once
- `UNCLASSIFIED = 0`
- all fan-in groups were proven normalization-only
- no ambiguity remained in target selection
- the next execution unit reduced cleanly to a single deterministic artifact
