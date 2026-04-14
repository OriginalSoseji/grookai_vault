# MIXED_EXECUTION_NEXT_TARGET_SELECTION_V4

Status: COMPLETE
Type: Read-Only Prioritization Audit
Scope: Remaining sets after `xy4` closure
Date: 2026-04-11

## Context
The following sets are now closed:
- duplicate bucket
- `cel25`
- `xy7`
- `xy10`
- `xy9`
- `xy6`
- `xy3`
- `xy4`

The remaining candidate sets are:
- `ecard2`
- `g1`
- `pl2`
- `pl4`

This audit exists to choose exactly one next lawful execution target from live data rather than assumption.

## Per-Set Metrics
| Set | Unresolved | Canonical | Same-Token Conflicts | Unmatched | Fan-In Groups | Normalization | Blocked Conflicts | Promotion Candidates | Classification |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `ecard2` | 34 | 160 | 0 | 21 | 0 | 4 | 9 | 21 | `PROMOTION_HEAVY` |
| `g1` | 29 | 100 | 12 | 0 | 0 | 14 | 15 | 0 | `BLOCKED_CONFLICT_HEAVY` |
| `pl4` | 20 | 99 | 8 | 0 | 0 | 0 | 20 | 0 | `BLOCKED_CONFLICT_HEAVY` |
| `pl2` | 37 | 114 | 31 | 0 | 0 | 1 | 36 | 0 | `BLOCKED_CONFLICT_HEAVY` |

All audited sets returned `unclassified_count = 0`.

## Classification Summary
- `PROMOTION_HEAVY`: `ecard2`
- `BLOCKED_CONFLICT_HEAVY`: `g1`, `pl4`, `pl2`

## Ranking Logic
Sets were ranked by the required safety order:
1. lowest `blocked_conflict_count`
2. lowest `promotion_candidate_count`
3. highest determinism potential

The live ranking is:
1. `ecard2`
2. `g1`
3. `pl4`
4. `pl2`

## Selected Next Target
Selected set:
- `ecard2`

Selected execution class:
- `PROMOTION_HEAVY`

Why `ecard2` wins:
- lowest `blocked_conflict_count` in the remaining bucket: `9`
- `unclassified_count = 0`
- deterministic unresolved surface split is still possible even though promotion dominates

Why the others do not win:
- `g1` has no promotion dependency but a larger blocker surface: `15`
- `pl4` is fully blocker-dominated: `20`
- `pl2` is the least safe remaining set: `36`

## Blocked Sets
- `g1`
- `pl4`
- `pl2`

These remain deferred because blocked conflicts dominate their unresolved surfaces.

## Next Lawful Direction
The next codex should stay audit-first and decompose `ecard2`'s promotion-heavy surface before any mutation artifact is created.

## Result
The next lawful execution target is:
- `ecard2`
- class = `PROMOTION_HEAVY`
