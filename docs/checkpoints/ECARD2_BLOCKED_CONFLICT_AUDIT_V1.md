# ECARD2_BLOCKED_CONFLICT_AUDIT_V1

Status: COMPLETE
Type: Read-Only Audit
Scope: Remaining unresolved `ecard2` rows after promotion and namespace reuse
Date: 2026-04-11

## Context
`ecard2` completed:
- `COLLISION_FREE_PROMOTION -> COMPLETE (11)`
- `NAMESPACE_REUSE -> COMPLETE (13)`

The set then appeared to retain a `BLOCKED_CONFLICT = 10` surface. This audit re-checked that label against the live schema and current GV-ID namespace state.

## Hard Finding
The remaining 10 rows are not true blocked conflicts under the current live model.

All 10 rows are H-prefixed printed-number rows:
- `H10`
- `H14`
- `H21`
- `H22`
- `H23`
- `H24`
- `H26`
- `H27`
- `H29`
- `H31`

For every row:
- same-set exact candidate count = `0`
- same-set normalized exact-token candidate count = `0`
- same-set same-name suffix candidate count = `0`
- same-set numeric-base partial match count = `1`
- proposed `GV-PK-AQ-H*` collision count = `0`

That means the live system has no lawful same-set collapse target for any of these rows, and the exact-token promotion namespace is available.

## Classification Breakdown
Final row-level classification:
- `PROMOTION_REQUIRED = 10`
- `MULTI_CANONICAL_TARGET_CONFLICT = 0`
- `TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES = 0`
- `SUFFIX_OWNERSHIP_CONFLICT = 0`
- `IDENTITY_MODEL_GAP = 0`
- `OTHER = 0`

The previous blocked label came from a numeric-base heuristic, not from an actual live identity conflict.

## Grouped Root Causes
Two repeated patterns exist:

`H-prefix exact-token promotion surface with only in-set numeric-base partial collisions`
- count: `8`
- rows:
  - `Exeggutor / H10`
  - `Kingdra / H14`
  - `Scizor / H21`
  - `Slowking / H22`
  - `Sudowoodo / H24`
  - `Tentacruel / H26`
  - `Togetic / H27`
  - `Umbreon / H29`

`H-prefix exact-token promotion surface with in-set numeric-base partial collisions plus cross-set same-name coincidences`
- count: `2`
- rows:
  - `Steelix / H23`
  - `Vileplume / H31`

The extra cross-set same-name rows do not create lawful collapse targets. They are coincidences, not same-set alias proof.

## Why These Rows Are Promotion-Required
Representative examples:

`Exeggutor / H10`
- no same-set `H10` canonical target exists
- no same-set `number_plain = H10` exact-token target exists
- `GV-PK-AQ-H10` is unoccupied
- only partial same-set numeric-base candidate is `Entei / 10`

`Steelix / H23`
- no same-set `H23` exact-token target exists
- `GV-PK-AQ-H23` is unoccupied
- same-set numeric-base partial candidate is `Muk / 23`
- cross-set same-name coincidence `ex2 Steelix / 23` exists but does not lawfully resolve `ecard2`

`Vileplume / H31`
- no same-set `H31` exact-token target exists
- `GV-PK-AQ-H31` is unoccupied
- same-set numeric-base partial candidate is `Rapidash / 31`
- cross-set same-name coincidences exist in `base2` and `ecard1`, but they are not same-set alias proof

The exact printed token is identity-bearing here, and the current model can already represent it without schema change.

## Root Cause
The stale blocked label came from treating `H31 -> 31` as if numeric-base ownership were sufficient to block promotion.

Live audit disproves that rule for this remaining surface:
- exact printed token `H31` is different from `31`
- the system can generate and store `GV-PK-AQ-H31`
- no live GV-ID collision exists for any of the 10 rows

So the true root cause is not “blocked conflict.” It is an unexecuted exact-token promotion surface.

## Next Execution Recommendation
Exact next lawful execution unit:

`ECARD2_HOLO_PREFIX_EXACT_TOKEN_PROMOTION_V1`

Why:
- all 10 rows share one deterministic execution pattern
- no schema extension is required
- no namespace collision remains
- no collapse target needs to be reused
- no row requires persistence as blocked

This should be a single unified codex, not multiple follow-up contracts.

## Final State
The residual `ecard2` blocked surface has been decomposed.

Locked conclusion:
- `blocked_row_count = 10`
- all `10` rows reclassify to `PROMOTION_REQUIRED`
- grouped root cause pattern is unified
- next lawful execution unit is a bounded H-prefix exact-token promotion apply artifact
