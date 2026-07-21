# Card Visual Search Local Lab V1

Status: COMPLETE - LOCAL SANDBOX FUNCTIONAL; PUBLIC RELEASE NOT AUTHORIZED

Date: 2026-07-21

## Context

The project has a locked non-Energy visual corpus, deterministic artwork grouping, an evidence-preserving search projection, a fast in-memory candidate index, a fixed calibration suite, a 200-query human review dashboard, and a fail-closed judgment evaluator. Official relevance metrics remain blocked on human judgments.

## Problem

Search behavior needed to become directly testable as a collector-facing workflow without fabricating human gold labels, executing the sealed holdout, adding embeddings, or exposing an uncalibrated public API.

## Risk

An unconstrained prototype could silently drop unknown words, confuse scene subjects with depicted or represented subjects, return duplicate printings as separate artwork results, infer colloquial aliases without evidence, fetch arbitrary image URLs, or be mistaken for a production release.

## Decision

Implement `CARD_VISUAL_SEARCH_LAB_V1` at producing commit:

`647592ca8b6ccc39d7679f192ee9d72b6d19e0ba`

The lab is a loopback-only Node HTTP service over the locked V1.5 projection and existing read-only in-memory ranker. It adds deterministic arbitrary-query parsing, strict constraint handling, branch and exact-count filters, subject-role separation, evidence-gated aliases, artwork-first results, printing expansion, observation-backed explanations, and a responsive local UI.

## Search Behavior

- Raw unknown terms remain visible and force an honest strict-zero result.
- Canonical-name and image-derived subject matches remain separate alternatives.
- Explicit `scene_subject`, `depicted_subject`, and `character_representation` intent is enforced before ranking.
- Exact visible counts resolve only through count evidence that cites observations.
- `ghostly`, `Halloween`, and altered-state aliases require defined visible cue combinations.
- Alias labels remain query intent and are never stored or returned as character truth.
- Results are unique artwork groups with legitimate printings expanded beneath them.
- Every visual explanation retains document, source fact, and observation references.

## Runtime Proof

- Locked artwork groups loaded: `9,532`
- Deduplicated indexed evidence entries: `321,937`
- Exact visual term keys: `179,296`
- Candidate-index build latency: approximately `1,575 ms`
- Full locked projection load, hash verification, and index build: approximately `3.8 seconds`
- Real `trainers wearing gloves` result count: `81`
- Real exact `three visible lightning bolts` result count: `2`
- Real evidence-gated `Halloween cards` result count: `1`
- Real strict `Pikachu sleeping in a forest` result count: `0`

These are functional smoke results, not human relevance judgments.

## Image And Interface Proof

- Representative images resolve from the corpus inventory through Grookai-controlled image sources.
- A same-origin local proxy accepts only paths approved by `grookaiImageUrlV1`.
- PNG, JPEG, and WebP are allowed; empty, oversized, wrong-type, and arbitrary-host responses are rejected.
- Real proxy readback returned HTTP `200`, `image/png`, and `441,391` bytes.
- Desktop visual inspection passed with card images, parsed constraints, result counts, evidence, and printing expansion visible.
- Mobile inspection at `390 x 844` passed with no horizontal page overflow, no result-card overflow, stable controls, and readable card content.
- Browser console errors: `0`.

## Current Truths

- The 9,532-artwork corpus is usable through a functional local search experience.
- Structured lexical retrieval is fast enough for local interaction.
- Search quality is not officially measured until the calibration judgments reconcile.
- The sealed 50-query holdout remains unexposed and unexecuted.
- The UI is a product sandbox, not a public application surface.
- No embeddings are required to test the current structured evidence path.

## Invariants

- Visible evidence remains the source of visual truth.
- Canonical identity remains separate from image-derived facts.
- Search never generates new facts or prose.
- Strict AND constraints are not silently weakened.
- Scene, depicted, and represented subject roles remain distinct.
- Artwork is ranked before printings are expanded.
- Alias matches explain objective cues and do not claim intoxication, personality, lore, or condition.
- Canonical search must remain available independently of visual search in any future integration.

## Boundaries Proven

No provider calls, database connections or writes, approvals, embeddings, persistent index writes, holdout exposure or execution, query analytics retention, or public search release occurred.

## Files

- `backend/card_descriptions/card_visual_search_lab_v1.mjs`
- `backend/card_descriptions/card_visual_search_lab_v1.html`
- `backend/card_descriptions/card_visual_search_evaluation_bootstrap_v1.mjs`
- `docs/contracts/CARD_VISUAL_SEARCH_LAB_V1.md`
- `tests/contracts/card_visual_search_lab_v1.test.mjs`

## Command

```powershell
npm run card-visual:search-lab
```

Default URL:

`http://127.0.0.1:4177/`

## Tests

- Full relevant visual-search contract chain: `60/60` passed.
- Lab-specific contracts: `6/6` passed.
- Syntax checks: passed.
- `git diff --check`: passed.
- Real locked-projection load and query smoke: passed.
- Real Grookai image proxy readback: passed.
- Desktop and mobile visual inspection: passed.

The full repository shipcheck was not run because `SUPABASE_DB_URL` is unavailable; no database-dependent result is claimed.

## Explicit Next Gate

Complete the primary review of all `200` calibration queries and the independent review of the seven difficult families, run the existing evaluator, adjudicate disagreements, and lock official release thresholds. Only after calibration passes may the sealed `50`-query holdout be executed. A database-backed immutable index, API integration, and public UI remain later gates; no extraction restart is required for those steps.
