# PROMOTION_CANDIDATE_AUDIT_V1

## Context

`CONTROLLED_GROWTH_INGESTION_PIPELINE_V1` staged `15239` JustTCG card rows and emitted `31` rows as `PROMOTION_CANDIDATE`.

Canonical expansion remains blocked under the current controlled-growth gate:

- canonical expansion under `40k` canonical rows is prohibited
- promotion candidates may be audited, but not promoted
- canonical tables remain protected

This checkpoint audits the staged 31-row promotion surface only.

## Candidate Breakdown

Live audit result:

- `candidate_count = 31`
- `TRUE_NEW_CANONICAL = 0`
- `MISSED_NORMALIZATION = 3`
- `NAMESPACE_COLLISION = 1`
- `PARTIAL_MATCH_REQUIRING_RULE = 8`
- `NON_CANONICAL = 19`

## Classification Summary

### `MISSED_NORMALIZATION` (`3`)

These rows already have deterministic same-set token matches in canonical space, but the current ingestion normalization path misses the name alias or symbol bridge:

- `Ghastly / 054/094` in `me02` maps to canonical `Gastly / 054`
- `Nidoran F / 029/165` in `sv03.5` maps to canonical `Nidoran♀ / 029`
- `Nidoran M / 032/165` in `sv03.5` maps to canonical `Nidoran♂ / 032`

These are not promotion-safe. They should be reclassified by a hardened staging rule.

### `NAMESPACE_COLLISION` (`1`)

One row attempts to occupy an already-owned same-set printed number:

- `Charcadet - 022` in `me02`

Canonical `me02` already owns `022` as `Dewgong`. This is a source-shape or namespace conflict, not a lawful new canonical print.

### `PARTIAL_MATCH_REQUIRING_RULE` (`8`)

These rows are real-card surfaces or promo-like surfaces, but they cannot be promoted under the current canonical contract without adding a new rule family:

- Nintendo promo staff/event rows (`6`)
  - examples: `Piloswine - 46/100 (Prerelease) [Staff]`, `Shellos East Sea - 106/132 (Origins Game Fair 2008) [Staff]`
- special locale/promo rows (`2`)
  - `Red's Pikachu (Japanese Exclusive)`
  - `Clefairy - 381/SM-P (Dream League)`

They require a dedicated promo/event/locale contract before any future expansion phase.

### `NON_CANONICAL` (`19`)

All 19 rows in `sm-trainer-kit-lycanroc-alolan-raichu-pokemon` are trainer-kit energy surfaces with source-added deck slot markers such as `(#10)` and repeated printed numbers.

Examples:

- `Fighting Energy (#10) / 10/30`
- `Lightning Energy (#10) / 10/30`
- `Psychic Energy (#24) / 24/30`

These are source disambiguation artifacts, not lawful canonical printed identities for expansion.

### `TRUE_NEW_CANONICAL` (`0`)

No row in the 31-candidate surface qualifies as a clean, collision-free new canonical card under the current rules.

## Risk Analysis

The audit found four concrete risk families:

- normalization risk: deterministic existing canonical rows can still leak into promotion staging when alias/symbol handling is incomplete
- namespace risk: same-set printed number ownership can already be occupied by a distinct canonical identity
- contract gap risk: staff/event and locale-specific promo surfaces need an explicit identity contract before expansion
- source-noise risk: trainer-kit deck-slot markers can masquerade as clean promotion candidates if staging is too permissive

## Promotion Gate Decision

Promotion remains blocked.

Decision:

- `promotion_allowed = no`

Reason:

- `TRUE_NEW_CANONICAL = 0`
- the controlled-growth gate still prohibits canonical expansion
- the 31-row surface is entirely explainable as normalization misses, namespace conflicts, rule-gap surfaces, or non-canonical noise

## Next Steps

Next lawful execution unit:

- `CONTROLLED_GROWTH_INGESTION_RULE_HARDENING_AUDIT_V1`

Objective of the next unit:

- harden staging classification so normalization misses route to `MATCHED` or `NEEDS_REVIEW`
- route trainer-kit deck-slot artifacts to `NON_CANONICAL`
- isolate promo/event/locale surfaces into review lanes instead of promotion
- prevent false-positive promotion candidates from re-entering the controlled-growth expansion queue
