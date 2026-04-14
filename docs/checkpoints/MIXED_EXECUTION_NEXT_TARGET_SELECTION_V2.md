# MIXED_EXECUTION_NEXT_TARGET_SELECTION_V2

Status: COMPLETE
Type: Read-Only Prioritization Audit
Scope: Remaining mixed-execution bucket after `xy10` closure
Date: 2026-04-09

## Context
`xy10` is closed and verified.

The remaining mixed-execution candidate sets are:
- `xy6`
- `xy9`
- `xy3`
- `xy4`
- `ecard2`
- `g1`
- `pl2`
- `pl4`

This audit exists to choose exactly one next lawful execution target from live data rather than assumption.

## Per-Set Metrics
| Set | Unresolved | Canonical | Exact | Same-Token Conflicts | Unmatched | Fan-In Groups | Normalization | Blocked Conflicts | Promotion Candidates | Classification |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `xy9` | 21 | 125 | 0 | 20 | 21 | 0 | 20 | 1 | 0 | `BASE_VARIANT_COLLAPSE` |
| `xy6` | 20 | 112 | 0 | 20 | 20 | 0 | 19 | 1 | 0 | `BASE_VARIANT_COLLAPSE` |
| `xy3` | 13 | 114 | 0 | 13 | 13 | 0 | 12 | 1 | 0 | `BASE_VARIANT_COLLAPSE` |
| `xy4` | 16 | 123 | 0 | 15 | 16 | 1 | 15 | 1 | 0 | `MIXED_EXECUTION` |
| `ecard2` | 34 | 160 | 0 | 0 | 34 | 0 | 0 | 0 | 34 | `PROMOTION_HEAVY` |
| `g1` | 29 | 100 | 0 | 12 | 29 | 0 | 8 | 0 | 21 | `PROMOTION_HEAVY` |
| `pl4` | 20 | 99 | 0 | 8 | 20 | 0 | 0 | 12 | 8 | `BLOCKED_CONFLICT_HEAVY` |
| `pl2` | 37 | 114 | 0 | 31 | 37 | 0 | 0 | 34 | 3 | `BLOCKED_CONFLICT_HEAVY` |

## Classification Summary
- `BASE_VARIANT_COLLAPSE`: `xy9`, `xy6`, `xy3`
- `MIXED_EXECUTION`: `xy4`
- `PROMOTION_HEAVY`: `ecard2`, `g1`
- `BLOCKED_CONFLICT_HEAVY`: `pl2`, `pl4`

The main live change versus the older snapshot is `g1`: it now reads as promotion-heavy rather than conflict-heavy because the unresolved surface is dominated by rows with no lawful in-set canonical target.

## Ranking Logic
Sets were ranked by the required safety order:
1. lowest `blocked_conflict_count`
2. no promotion dependency
3. minimal fan-in complexity
4. strongest dominant normalization pattern
5. deterministic tie-break by unresolved count then set code

This ranking produces a unique first target.

## Selected Next Target
Selected set:
- `xy9`

Expected execution class:
- `BASE_VARIANT_COLLAPSE`

Why `xy9` wins:
- only `1` blocker remains
- `0` promotion candidates
- `0` fan-in groups
- `20 / 21` unresolved rows already sit in the normalization lane
- its normalization ratio (`0.9524`) edges `xy6` (`0.9500`) and `xy3` (`0.9231`)

## Blocked / Deferred Sets
- `xy6` and `xy3` are close followers but lose to `xy9` on dominant normalization ratio
- `xy4` is deferred because it still mixes one blocker with one fan-in group
- `ecard2` and `g1` are deferred because promotion dependency dominates their unresolved surface
- `pl2` and `pl4` are deferred because blocked conflicts dominate their unresolved surface

## Result
The next lawful execution unit should start from:
- `xy9`
- class = `BASE_VARIANT_COLLAPSE`

This keeps the next codex on the narrowest no-promotion, no-fan-in path available in the live bucket.
