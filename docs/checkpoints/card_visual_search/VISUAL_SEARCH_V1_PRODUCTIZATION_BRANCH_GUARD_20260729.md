# Visual Search V1 Productization Branch Guard

Date: 2026-07-29

Status: COMPLETE; REPLAY TOOLING AUTHORIZED ON DEDICATED PRODUCTIZATION BRANCH

## Decision

The imported offline tools originally allowed only
`feature/card-visual-description-agent`. Productization now runs on the clean,
main-based `feature/visual-search-v1-productization` branch.

A shared fail-closed branch guard now allows exactly:

- `feature/card-visual-description-agent`
- `feature/visual-search-v1-productization`

All other branches, including `main`, remain rejected.

## Scope

Only branch governance changed in:

- corpus inventory
- eligibility
- artwork grouping
- projection
- bootstrap evaluation

No eligibility, grouping, projection, parsing, ranking, evidence, query-suite,
or holdout behavior changed.

## Validation

- Focused contracts: `58/58` passed
- Explicit productization-branch acceptance: passed
- Explicit `main` rejection: passed
- No provider, database, embedding, holdout, public-read, or pricing activity

## Exact Next Gate

Commit the branch guard, then replay eligibility, grouping, projection, and
bootstrap evaluation from the immutable external corpus release.
