# MIXED_EXECUTION_NEXT_TARGET_SELECTION_V3

Status: COMPLETE
Type: Read-Only Prioritization Audit
Scope: Remaining mixed-execution bucket after `xy6` closure
Date: 2026-04-11

## Context
The following sets are now closed:
- duplicate bucket
- `cel25`
- `xy7`
- `xy10`
- `xy9`
- `xy6`

The remaining mixed-execution candidate sets are:
- `xy3`
- `xy4`
- `ecard2`
- `g1`
- `pl2`
- `pl4`

This audit exists to choose exactly one next lawful execution target from live data rather than assumption.

## Per-Set Metrics
| Set | Unresolved | Canonical | Same-Token Conflicts | Unmatched | Fan-In Groups | Normalization | Blocked Conflicts | Promotion Candidates | Classification |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `xy3` | 13 | 114 | 13 | 13 | 0 | 12 | 1 | 0 | `BASE_VARIANT_COLLAPSE` |
| `xy4` | 16 | 123 | 15 | 16 | 1 | 15 | 1 | 0 | `MIXED_EXECUTION` |
| `ecard2` | 34 | 160 | 0 | 34 | 0 | 0 | 9 | 21 | `PROMOTION_HEAVY` |
| `g1` | 29 | 100 | 12 | 29 | 0 | 13 | 15 | 0 | `BLOCKED_CONFLICT_HEAVY` |
| `pl4` | 20 | 99 | 8 | 20 | 0 | 0 | 20 | 0 | `BLOCKED_CONFLICT_HEAVY` |
| `pl2` | 37 | 114 | 31 | 37 | 0 | 0 | 36 | 0 | `BLOCKED_CONFLICT_HEAVY` |

All audited sets returned `unclassified_count = 0`.

## Classification Summary
- `BASE_VARIANT_COLLAPSE`: `xy3`
- `MIXED_EXECUTION`: `xy4`
- `PROMOTION_HEAVY`: `ecard2`
- `BLOCKED_CONFLICT_HEAVY`: `g1`, `pl4`, `pl2`

## Ranking Logic
Sets were ranked by the required safety order:
1. lowest `blocked_conflict_count`
2. no promotion dependency
3. minimal fan-in complexity
4. highest normalization ratio
5. deterministic tie-break by unresolved count then set code

This produces the following live ranking:
1. `xy3`
2. `xy4`
3. `ecard2`
4. `g1`
5. `pl4`
6. `pl2`

## Selected Next Target
Selected set:
- `xy3`

Expected execution class:
- `BASE_VARIANT_COLLAPSE`

Why `xy3` wins:
- lowest blocker surface tied at `1`
- `0` promotion candidates
- `0` fan-in groups
- dominant normalization lane: `12 / 13`
- no schema dependency indicated by the audit

Why `xy4` does not win despite a slightly higher normalization ratio:
- it ties `xy3` on blocker count
- it ties `xy3` on promotion dependency
- it loses on the earlier safety rule because it still has `1` fan-in group

## Blocked / Deferred Sets
- `xy4` is deferred because its remaining surface still requires mixed execution with fan-in handling
- `ecard2` is deferred because promotion dependency dominates the unresolved surface
- `g1`, `pl4`, and `pl2` are deferred because blocked conflicts dominate the unresolved surface

## Next Lawful Execution Unit
The next artifact should start from:
- `XY3_BASE_VARIANT_COLLAPSE_V1`

That keeps the next codex on the narrowest no-promotion, no-fan-in path available in the live bucket while isolating the single blocker row outside apply scope.

## Result
The next lawful execution surface is:
- `xy3`
- class = `BASE_VARIANT_COLLAPSE`
