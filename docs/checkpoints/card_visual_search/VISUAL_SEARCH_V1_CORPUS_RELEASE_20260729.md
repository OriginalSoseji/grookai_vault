# Visual Search V1 Immutable Corpus Release

Date: 2026-07-29

Status: COMPLETE; EXTERNAL RELEASE RECONCILED; BULK DATA NOT COMMITTED

## Purpose

Package the minimum authoritative artifacts required to reproduce Visual Search
V1 without copying the full 6 GB experimental workstream into Git.

## Release

- Version: `CARD_VISUAL_SEARCH_CORPUS_RELEASE_V1`
- Release ID: `card_visual_search_corpus_release_v1_20260721`
- External root:
  `C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_20260721`
- Governed source SHA:
  `c5bbbba5dea998fcd51d0d8602601737356a1494`
- Productization pre-release SHA:
  `e429d3b40e1b39ff567f07fe489184cdfe8bee3a`
- Files: `41`
- Bytes: `708,245,401`
- Release manifest payload SHA-256:
  `dd7956761bdb040958d3ca9b6e67fb9c272832091003043cd9db810f376b8cfa`
- Reconciliation payload SHA-256:
  `d22f0c3b30a9132c8f8c8d1948a25ed7aa64424b4a221a294d48410c9888f66a`

## Included Stages

1. Reconciled 11,000-row source corpus
2. Locked eligibility V1.4
3. Locked artwork grouping V1.1
4. Locked projection V1.5
5. Bootstrap structured/lexical evaluation

## Locked Counts

- Source rows: `11,000`
- Valid Fact Graphs: `10,376`
- Explicit source gaps: `624`
- Search-eligible printings: `9,702`
- Tier A: `2,687`
- Tier B: `7,015`
- Tier C: `1,298`
- Artwork groups: `9,532`
- Projection documents: `28,596`
- Concept evidence entries: `357,413`
- Projection exclusions: `168,046`
- Projection failures: `0`
- Candidate-index entries: `321,937`
- Calibration queries: `200`
- Sealed holdout queries: `50`
- Holdout executed: `false`

## Reconciliation

- Planned files: `41`
- Copied files: `41`
- Matching files: `41`
- Missing files: `0`
- Extra files: `0`
- Hash mismatches: `0`
- Copied bytes: `708,245,401`

Each file has an independently calculated SHA-256 in the committed release
manifest. The release root contains an identical manifest and reconciliation
record under `_release`.

## Boundaries

- No bulk evidence was committed to Git.
- No provider call occurred.
- No database connection or write occurred.
- No embedding was generated.
- No holdout query was executed.
- No public search was activated.
- No pricing file changed.

## Exact Next Gate

Adapt the imported offline tools to recognize the governed productization
branch, then replay eligibility, grouping, projection, and bootstrap evaluation
from the external release into a new external rebuild directory.

The adaptation must only change branch governance. Search semantics and locked
outputs must remain unchanged.
