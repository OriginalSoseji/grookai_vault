# Visual Search V1 Productization Rebuild

Date: 2026-07-29

Status: COMPLETE; RECONCILED WITH DOCUMENTED RANKER HARDENING

## Context

The complete V1.1 corpus release was created so Visual Search V1 could be
rebuilt from authoritative generated-row payloads rather than operated only
from the previously projected index artifacts.

## Producing Boundary

- Branch: `feature/visual-search-v1-productization`
- Producing SHA:
  `bbf20d0f4a59e61c4d529f523de0a9721c964dd9`
- Release:
  `C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721`
- Rebuild root:
  `C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\productization_bbf20d0f`

## Rebuilt Stages

1. Eligibility V1.4
2. Artwork grouping V1.1
3. Search projection V1.5
4. Structured/lexical bootstrap evaluation

## Reconciled Counts

- Source IDs: `11,000`
- Tier A: `2,687`
- Tier B: `7,015`
- Tier C: `1,298`
- Search eligible: `9,702`
- Eligible Energy rows: `0`
- Artwork groups: `9,532`
- Memberships: `9,702`
- Grouping conflicts: `0`
- Projected artworks: `9,532`
- Projection documents: `28,596`
- Evidence entries: `357,413`
- Projection exclusions: `168,046`
- Projection failures: `0`
- Query suite: `250`
- Calibration queries executed: `200`
- Holdout queries sealed and unexecuted: `50`
- Candidate-index entries: `321,937`
- Bootstrap failure classifications: `142`

## Determinism Proof

Nine of ten compared semantic files are byte-identical:

- all eligibility decisions;
- all artwork groups and memberships;
- all projected artworks, documents, and evidence;
- the query suite;
- evaluation failure classifications;
- holdout seals.

`ranked_outputs.jsonl` differs for a governed reason. The locked bootstrap was
produced before source commit
`b6aa1b053192a83572e37e2d64d46d2aabeb3d45`
(`fix: reject negated visual search evidence`). Productization includes that
hardening.

The difference is bounded:

- Top-result changes: `0`
- Match expansions: `0`
- Match reductions: `8`
- Result-window changes: `3`
- Failure classifications changed: `0`

This is accepted as stricter false-positive rejection, not corpus drift.

## Audit

- Reconciliation payload SHA-256:
  `1360867082d0eb970020a0165872daf06d3aa30fa9b7c89d6534d3504eb87011`
- Reconciliation JSON SHA-256:
  `de59f4fe88238d40d8eea2d548935bdf98fc321c5bf528d43347e3f1d3ff34b8`
- Reconciliation Markdown SHA-256:
  `f09c38c001f4ce877765396d9a09ca17ea8022618a86e54c2a01506f180c43a4`

## Invariants

- No provider call occurred.
- No database connection or write occurred.
- No approval or reviewer judgment changed.
- No embedding was generated.
- No holdout query was executed.
- No public search was activated.
- No pricing file changed.

## Exact Next Gate

Run the read-only production database capability audit through governed CI.
Record PostgreSQL version, installed/available search extensions, current
visual-search tables, columns, indexes, RLS policies, functions, grants, and
aggregate row counts. Do not apply a migration.
