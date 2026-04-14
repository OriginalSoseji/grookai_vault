# MIXED_EXECUTION_NEXT_TARGET_SELECTION_V1

Status: COMPLETE
Type: Read-Only Prioritization Audit
Scope: Remaining mixed-execution bucket after `cel25` closure
Date: 2026-04-08

## Context
`cel25` is closed and verified.

The remaining mixed-execution candidate sets are:
- `pl2`
- `ecard2`
- `g1`
- `xy7`
- `xy10`
- `xy9`
- `pl4`
- `xy6`
- `xy4`
- `xy3`

This audit exists to choose exactly one next lawful execution target from live data rather than assumption.

## Per-Set Metrics
| Set | Unresolved | Canonical | Exact | Same-Token Conflicts | Unmatched | Fan-In Groups | Normalization Candidates | Duplicate Candidates | Promotion Candidates | Blocked Conflicts | Classification |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `xy7` | 26 | 100 | 0 | 25 | 26 | 0 | 26 | 0 | 0 | 0 | `BASE_VARIANT_COLLAPSE` |
| `xy10` | 25 | 126 | 0 | 22 | 25 | 2 | 25 | 0 | 0 | 0 | `MIXED_EXECUTION` |
| `xy6` | 20 | 112 | 0 | 20 | 20 | 0 | 19 | 0 | 0 | 1 | `MIXED_EXECUTION` |
| `xy9` | 21 | 125 | 0 | 20 | 21 | 0 | 20 | 0 | 0 | 1 | `MIXED_EXECUTION` |
| `xy3` | 13 | 114 | 0 | 13 | 13 | 0 | 12 | 0 | 0 | 1 | `MIXED_EXECUTION` |
| `xy4` | 16 | 123 | 0 | 15 | 16 | 1 | 15 | 0 | 0 | 1 | `MIXED_EXECUTION` |
| `ecard2` | 34 | 160 | 0 | 0 | 34 | 0 | 0 | 0 | 21 | 9 | `MIXED_EXECUTION` |
| `g1` | 29 | 100 | 0 | 12 | 29 | 0 | 13 | 0 | 0 | 15 | `BLOCKED_CONFLICT_HEAVY` |
| `pl2` | 37 | 114 | 0 | 31 | 37 | 0 | 0 | 0 | 0 | 36 | `BLOCKED_CONFLICT_HEAVY` |
| `pl4` | 20 | 99 | 0 | 8 | 20 | 0 | 0 | 0 | 0 | 20 | `BLOCKED_CONFLICT_HEAVY` |

## Classification Summary
- `BASE_VARIANT_COLLAPSE`: `xy7`
- `MIXED_EXECUTION`: `xy10`, `xy6`, `xy9`, `xy3`, `xy4`, `ecard2`
- `BLOCKED_CONFLICT_HEAVY`: `g1`, `pl2`, `pl4`

No remaining set qualifies as a pure `DUPLICATE_COLLAPSE` surface.

## Ranking Logic
Sets were ranked by the required safety order:
1. lowest ambiguity
2. lowest `blocked_conflict_count`
3. lowest `fan_in_group_count`
4. no promotion or alias dependence
5. cleanest dominant execution class
6. deterministic tie-break by unresolved count then set code

This ranking produces a unique safe first target.

## Selected Next Target
Selected set:
- `xy7`

Expected execution class:
- `BASE_VARIANT_COLLAPSE`

Why `xy7` wins:
- `26 / 26` unresolved rows map into the normalization lane
- `0` blocked conflicts
- `0` fan-in groups
- `0` promotion candidates
- `0` alias candidates
- no schema or model-extension blocker is present

## Blocked / Deferred Sets
- `xy10` is normalization-clean but not first-safe because it has `2` fan-in groups and therefore requires multi-step execution
- `xy6`, `xy9`, `xy3`, and `xy4` are normalization-dominant but each still carries at least `1` blocked conflict
- `ecard2` is not safe next because it carries `21` promotion candidates plus `9` blocked conflicts
- `g1`, `pl2`, and `pl4` are conflict-heavy and should not be used as the next execution unit

## Result
The next lawful execution unit is:
- `xy7`
- class = `BASE_VARIANT_COLLAPSE`

This keeps the next codex single-surface, deterministic, and free of schema-level blockers.
