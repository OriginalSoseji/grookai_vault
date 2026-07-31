# Visual Search V1 Complete Corpus Release

Date: 2026-07-29

Status: COMPLETE; FIRST-PRINCIPLES SOURCE RELEASE RECONCILED

## Context

The initial V1 release sealed the locked corpus, eligibility, grouping,
projection, and bootstrap artifacts. A productization replay showed that the
corpus inventory stores references to generated Fact Graph rows rather than
embedding those rows. The V1 package could operate and verify the existing
projection, but it could not regenerate eligibility and projection from first
principles.

## Decision

Keep the original V1 package immutable. Create a separate V1.1 complete-rebuild
release containing:

- all 41 files from the five locked pipeline stages; and
- all 9,377 unique authoritative generated-row artifacts referenced by the
  10,376 valid corpus candidates.

Add an explicit `--source-artifact-root` argument to eligibility and projection
so productization can consume the external immutable release without copying
bulk evidence into Git.

## Release

- Version: `CARD_VISUAL_SEARCH_CORPUS_RELEASE_V1_1`
- Release ID: `card_visual_search_corpus_release_v1_1_20260721`
- External root:
  `C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721`
- Governed source SHA:
  `c5bbbba5dea998fcd51d0d8602601737356a1494`
- Productization pre-release SHA:
  `6848df94cb189932a072794c7d85e52a77fac3a8`
- Planned and copied files: `9,418`
- Authoritative payload artifacts: `9,377`
- Total bytes: `1,152,590,499`
- Missing files: `0`
- Extra files: `0`
- Hash mismatches: `0`
- Release plan payload SHA-256:
  `5edc6566872e201a8c74f471d6ec17e77a26f3454bd5b46496510471674f13d5`
- Release manifest payload SHA-256:
  `7d96b0f580a89f4dcf1618664767d719ec0bbf27685083f1e62d87ccd1bf071b`
- Reconciliation payload SHA-256:
  `0703606d38ad73a104c71c3b0554598607fdce33e2a103443894dcc79a6f0cc6`

## Current Truths

- The complete source release covers all `11,000` corpus IDs.
- `10,376` IDs have valid Fact Graphs.
- `624` IDs remain explicit source gaps.
- All referenced source artifacts existed and were copied with matching hashes.
- Bulk evidence remains outside Git.
- The original V1 release was not modified.
- `--source-artifact-root` changes path resolution only; eligibility and
  projection policy semantics remain frozen.
- External-root and release contract tests pass `42/42`.

## Invariants

- No provider call occurred.
- No database connection or write occurred.
- No approval or reviewer judgment changed.
- No embedding was generated.
- No holdout query was executed.
- No public search was activated.
- No pricing file changed.

## Exact Next Gate

From a clean committed productization SHA, replay:

1. eligibility V1.4 from the external inventory and authoritative payload root;
2. artwork grouping V1.1 from rebuilt eligibility;
3. projection V1.5 from rebuilt grouping, eligibility, inventory, and payloads;
4. bootstrap structured/lexical evaluation from rebuilt projection.

Reconcile semantic counts and deterministic content against the locked release.
The sealed 50-query holdout must remain unexecuted.
