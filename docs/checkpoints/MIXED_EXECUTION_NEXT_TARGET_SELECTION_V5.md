# MIXED_EXECUTION_NEXT_TARGET_SELECTION_V5

Status: COMPLETE
Type: Read-Only Prioritization Audit
Scope: Remaining blocked-conflict-heavy sets after full `ecard2` closure
Date: 2026-04-12

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
- `ecard2`

The remaining candidate sets are:
- `g1`
- `pl2`
- `pl4`

This audit exists to choose exactly one next lawful contract-first target from live data rather than assumption.

## Per-Set Metrics
| Set | Unresolved | Canonical | Same-Token Conflicts | Unmatched | Fan-In Groups | Normalization | Blocked Conflicts | Classification |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `g1` | 29 | 100 | 12 | 0 | 0 | 14 | 15 | `BLOCKED_CONFLICT_HEAVY` |
| `pl4` | 20 | 99 | 8 | 0 | 0 | 0 | 20 | `BLOCKED_CONFLICT_HEAVY` |
| `pl2` | 37 | 114 | 31 | 0 | 0 | 1 | 36 | `BLOCKED_CONFLICT_HEAVY` |

All audited sets returned `unclassified_count = 0`.

## Root Cause Preview
Dominant blocked root-cause categories from live row previews:

- `g1`
  - dominant category: `token_collisions`
  - blocker count in category: `15`
  - representative rows:
    - `Gulpin / RC12`
    - `Jirachi / RC13`
    - `Espurr / RC14`

- `pl4`
  - dominant category: `token_collisions`
  - blocker count in category: `20`
  - representative rows:
    - `Porygon-Z / 26`
    - `Beedrill / 53`
    - `Arceus LV. X / 94`

- `pl2`
  - dominant category: `token_collisions`
  - blocker count in category: `35`
  - secondary category: `promotion_ambiguity`
  - representative rows:
    - `Alakazam 4 / 103`
    - `Floatzel GL / 104`
    - `Flygon / 105`

The remaining bucket does not show identity-model-gap dominance. It is primarily token ownership conflict work.

## Classification Summary
- `g1` -> `BLOCKED_CONFLICT_HEAVY`
- `pl4` -> `BLOCKED_CONFLICT_HEAVY`
- `pl2` -> `BLOCKED_CONFLICT_HEAVY`

## Ranking Logic
Sets were ranked by the required safety order:
1. lowest `blocked_conflict_count`
2. lowest ambiguity complexity, approximated by residual non-normalization surface
3. clearest single dominant root-cause pattern
4. least likelihood of schema change

This produces the following live ranking:
1. `g1`
2. `pl4`
3. `pl2`

Why:
- `g1` has the smallest blocked surface: `15`
- `g1` still retains `14` non-blocked normalization rows, which suggests the blocker surface is narrower and more isolatable than `pl4` or `pl2`
- `g1` is dominated by a single token-collision pattern, with no promotion dependency and no sign of schema pressure
- `pl4` is cleaner than `pl2` on size, but it is fully blocker-dominated with `20 / 20` blocked rows
- `pl2` is the least safe remaining surface because it combines the largest blocker count with one extra promotion-ambiguity row

## Selected Next Target
Selected set:
- `g1`

Selected execution class:
- `BLOCKED_CONFLICT_HEAVY`

Expected root cause category:
- `token_collisions`

Expected contract type:
- contract-first blocked conflict audit

Recommended next codex:
- `G1_BLOCKED_CONFLICT_AUDIT_V1`

Why this is the safest next step:
- it keeps the next unit audit-first
- it targets the smallest blocked surface remaining
- it attacks a dominant single failure pattern rather than a mixed surface
- it avoids premature schema or promotion design work

## Deferred Sets
- `pl4` remains deferred because every unresolved row is already inside the blocked surface
- `pl2` remains deferred because it has the largest blocker count and the only mixed root-cause preview in the remaining bucket

## Result
The next lawful execution surface is:
- `g1`
- class = `BLOCKED_CONFLICT_HEAVY`
- expected root cause = `token_collisions`
