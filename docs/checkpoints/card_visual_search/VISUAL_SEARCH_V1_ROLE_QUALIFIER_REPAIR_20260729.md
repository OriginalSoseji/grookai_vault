# Visual Search V1 Role Qualifier Repair

Status: COMPLETE; LOCAL LAB RELEVANCE GAP REPAIRED

Date: 2026-07-29

Branch: `agent/visual-search-lab-runtime-fix`

Parent commit: `c72a1f523083eb11e4ecbdd796723200c6f4ed3d`

## Context

The live local Visual Search Lab was functionally healthy over the locked
`9,532`-artwork projection, but a manual smoke test found that
`Pikachu plush`, `Pikachu pillow`, and `Pikachu statue` all collapsed to the
broad `character_representation` role. The same issue affected poster and
screen queries under `depicted_subject`.

## Problem

The parser removed the representation-form or depicted-surface phrase after
selecting a broad role. Ranking then allowed the requested identity to be
satisfied by any evidence row in the artwork group, including a different
subject role. This allowed a cartoon portrait to satisfy `Pikachu plush`.

The live corpus also contains one guarded source row whose scene identity is
`Pikachu (Tepig)`. Any repair that used prefix matching without conflict
handling would have reopened that identity error.

## Decision

Role-aware queries now preserve these independent constraints:

- canonical represented identity
- subject role
- character representation form
- depicted-subject surface

All requested dimensions must be supported by the same authoritative
`subject_role` evidence row. The bound-role check reads the structured subject
document directly because valid detailed role entries can exceed the concise
lexical-index length limit.

Descriptive identity suffixes such as `Pikachu with green headband` are
accepted. Parenthetical identity conflicts such as `Pikachu (Tepig)` are
rejected.

## Supported Qualifiers

Character representation forms:

- food shape
- ice cream
- plush
- pillow
- statue
- toy
- logo
- sticker
- pattern

Depicted-subject surfaces:

- card within card
- photograph
- poster
- screen
- painting
- sign
- book

## Verification

- Syntax check: passed
- Targeted lab contracts: `8/8` passed
- All visual-search contracts: `103/103` passed
- `git diff --check`: passed
- Release secret guard: passed
- Repository-wide pre-commit shipcheck: not completed because the external
  PostgreSQL endpoint timed out at TCP connection establishment
  (`ETIMEDOUT`, port `5432`). No database statement executed.
- Live health: `ready`
- Live artwork groups: `9,532`
- Live indexed entries: `321,937`

Live corpus outcomes:

- `Pikachu depicted`: `1` match, `Copycat`
- Bound evidence: `depicted subject: pikachu with green headband and smiling
  closed eyes: illustration: illustrated scene, left midground`
- `Pikachu plush`: strict zero
- `Pikachu pillow`: strict zero
- `Pikachu statue`: strict zero
- `Pikachu poster`: strict zero
- `Pikachu on a screen`: strict zero
- `trainers wearing gloves`: unchanged at `81` matches
- `cards with rain and buildings`: unchanged at `2` matches
- `three visible lightning bolts`: unchanged at `2` matches
- `stoner looking cards`: unchanged at `41` matches

The strict-zero results are correct for the current saved corpus because no
matching Pikachu role row records those exact forms or surfaces.

## Invariants

- No provider calls.
- No database connection or write.
- No approvals.
- No embeddings.
- No holdout execution.
- No query analytics persistence.
- No public activation.
- Raw projection artifacts were not modified.
- Search remains strict AND across supported constraints.

## Current Truth

The local Visual Search Lab is operational and now preserves form- and
surface-specific role semantics. This does not authorize production release.
PokeJavi's human calibration remains incomplete, and the sealed 50-query
holdout remains unopened.

## Exact Next Gate

Complete and validate the 200-query human calibration packet. Only after the
calibration thresholds and reviewer agreement requirements pass may the sealed
50-query holdout be opened once under the existing release contract.
