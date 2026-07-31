# Visual Search V1 Lab Runtime Fix

Date: 2026-07-29

Status: COMPLETE - LOCAL SEARCH FUNCTIONAL; HUMAN CALIBRATION STILL REQUIRED

## Context

Visual Search V1 was already engineered through the human calibration
boundary on `feature/visual-search-v1-productization`. It contains:

- `10,376` valid Fact Graphs;
- `9,702` eligible non-Energy printings;
- `9,532` artwork groups;
- `28,596` search documents;
- `357,413` evidence entries;
- `321,937` candidate-index entries.

The immutable release remains outside Git at
`card_visual_search_corpus_release_v1_1_20260721`.

## Problem

The local lab could load the external projection and answer strict zero-result
queries, but ordinary result-bearing queries returned HTTP `500`.

The external corpus inventory stores `source_artifact_path` relative to the
immutable release root. The lab resolved those paths relative to the Git
checkout. Ranking completed, then image metadata hydration failed with a
missing source-artifact path.

This was a runtime adapter defect. It was not a parser, ranker, projection,
evidence, or corpus defect.

## Decision

Add an explicit `--artifact-root` boundary to the local lab:

- relative and absolute source-artifact paths must resolve beneath the selected
  root;
- path traversal and absolute paths outside that root fail closed;
- checkout-relative behavior remains available when no external root is
  supplied;
- the option controls image metadata hydration only.

No search-semantic file or immutable corpus artifact changed.

## Real-Corpus Proof

The repaired lab was started over the reconciled external release with:

- artwork groups: `9,532`;
- indexed entries: `321,937`;
- host: loopback only;
- provider calls: `0`;
- database connections and writes: `0`;
- embeddings: `0`;
- approvals: `0`;
- holdout executions: `0`.

Representative results:

| Query | HTTP | Total matches | Image hydration |
| --- | ---: | ---: | --- |
| `Pikachu sleeping in a forest` | 200 | 0 | not applicable |
| `trainers wearing gloves` | 200 | 81 | resolved |
| `cards with rain and buildings` | 200 | 2 | resolved |
| `red eyes with visible smoke` | 200 | 46 | resolved |
| `stoner looking cards` | 200 | 41 | resolved |

The zero-result Pikachu query remained strict. The repair did not weaken query
constraints to manufacture a match.

Desktop and `390 x 844` mobile browser checks confirmed that result cards,
self-hosted images, scores, canonical context, matching-printing counts,
evidence terms, and observation IDs render without overlap.

## Verification

- Lab contracts: `7 / 7` passed.
- Complete visual-search contract suite: `102 / 102` passed.
- Node syntax check: passed.
- `git diff --check`: passed before checkpoint finalization.
- Final local lab URL: `http://127.0.0.1:4178`.

## Current Invariants

- The sealed 50-query holdout remains unopened and unexecuted.
- PokeJavi's incomplete submission remains incomplete.
- No human judgment was inferred, defaulted, or replaced by model output.
- No numeric release threshold was invented.
- The persistence migration remains unapplied.
- No persistent projection or active release pointer exists.
- No public or authenticated product search endpoint was activated.
- Pricing code, data, and the active pricing canary were untouched.

## Exact Next Gate

The productization gate remains unchanged:

1. Export and hash PokeJavi's raw partial or complete submission unchanged.
2. Validate packet, reviewer, query, result, and artwork provenance.
3. Complete all `200` primary judgments.
4. Complete the required independent second-reviewer families.
5. Adjudicate every disagreement.
6. Run calibration metrics only after final judgments reconcile.
7. Freeze measured thresholds and the release candidate.
8. Execute the sealed holdout exactly once.

The runtime lab may be used for exploratory local searches, but those searches
must not tune the sealed holdout or substitute for calibration judgments.
