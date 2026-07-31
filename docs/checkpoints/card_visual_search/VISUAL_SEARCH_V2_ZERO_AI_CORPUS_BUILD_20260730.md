# Visual Search V2 Zero-AI Corpus Build Checkpoint

Date: 2026-07-30

Status: ZERO-AI BUILD COMPLETE THROUGH HUMAN CALIBRATION; MIGRATION UNAPPLIED

## Context

The existing 10k-plus paid Fact Graph corpus contained useful observations but
could not safely answer collector queries that combine canonical identity,
pose, environment, counts, depictions, cameos, and character-shaped objects.
The repair had to reuse those paid graphs without another Vision run.

## Problem

The earlier search layer could:

- treat intrinsic resemblance as a second character;
- mix depictions and character-shaped objects into scene-subject evidence;
- surface unconfirmed external candidates;
- collapse rich Fact Graphs into one visible term in the reviewer UI;
- accept false visual facts such as the Wingull shadow as sky;
- parse pose language such as `standing` as a subject;
- rank broad generic queries inconsistently.

Schema validity alone did not provide a trustworthy collector-search boundary.

## Risk

An unsupported character, role, count, setting, or object match can make a
plausible-looking result factually wrong. Re-running Vision would add cost
without proving that the authority and search layers were correct. Loading
unreviewed evidence into production would make rollback and provenance harder.

## Decision

Reuse every existing paid Fact Graph unchanged and build a deterministic,
versioned projection around it:

```text
immutable raw observations
-> typed modules
-> controlled vocabulary
-> deterministic TCG concepts
-> role-isolated search documents
-> evidence-authority filter
-> structured/lexical collector search
```

External sources may supply governed candidates or explicitly reviewed
assertions. They cannot mutate observations or become active merely because
their canonical card reconciliation is exact.

## Completed Build

- Unified Collector Search V2 intent, authority, and response contracts.
- Independent `scene_subject`, `depicted_subject`,
  `character_representation`, `curated_association_unresolved`, and
  `visual_resemblance_reference` roles.
- Four isolated document types: subject, scene, style/composition, and
  representation/cameo.
- Strict same-artwork Boolean subject matching.
- Role-bound object, surface, relationship, and count search.
- Deterministic TCG-centric concepts derived from existing observations.
- Controlled external-source registry and review-only candidate lane.
- Founder-confirmed evidence assertions and image-pinned suppressions.
- Signed-in web adapter, canonical fallback, strict-zero UX, image evidence
  viewer, and correction staging.
- Human calibration packet with the full saved Fact Graph and self-hosted image
  available from each evidence control.
- Private release migration and exact no-write load plan.

Future paid extraction remains governed by
`docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md`: if a character, depiction,
character-shaped object, body component, clothing item, prop, environment
element, countable detail, effect, or TCG-relevant motif is visible, it must be
recorded with evidence. That standard applies to future images; it does not
authorize recharging the existing corpus.

## Zero-AI Result

- Provider calls: `0`
- Additional AI cost: `$0`
- Embeddings: `0`
- Existing Fact Graph mutations: `0`
- Database connections: `0`
- Database writes: `0`
- Approvals: `0`
- Holdout executions: `0`
- Release activations: `0`

## Immutable Release

Release:

`C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\unified_collector_search_v2\2026-07-30T15-37-33-910Z_release_a88641e94742`

- Release key: `card_visual_search_v2_a88641e94742662e`
- Producing commit:
  `469bdb11d2c06f0185c0f1eaca973610420a0a8e`
- Source IDs accounted: `11,000`
- Artworks: `9,532`
- Searchable printings: `9,702`
- Coverage gaps: `1,298`
- Documents: `38,128`
- Source evidence: `392,050`
- Searchable evidence: `392,046`
- Evidence suppressions: `1`
- Deterministic TCG concepts: `34,622`
- Governed external sources: `6`
- External candidates: `2,329`
- Governed external assertions: `30`
- Index entries: `886,245`
- Energy coverage gaps retained: `72`
- Energy searchable rows: `0`
- Release artifact hash mismatches: `0`

All `12` permanent release artifacts passed independent SHA-256 verification.

## Evaluation

Calibration bootstrap:

`C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\unified_collector_search_v2\evaluation\2026-07-30T15-21-32-599Z_bootstrap_b732c530b51d`

- Query suite: `250`
- Calibration executed: `200`
- Holdout sealed and unexecuted: `50`
- Source-candidate checks: `128`
- Bootstrap Recall@10: `0.59375`
- Bootstrap Recall@25: `0.6640625`
- Bootstrap MRR: `0.41688097868160023`
- Applicable printing checks: `85`
- Printing-expansion accuracy: `1.0`
- Strict-zero accuracy: `1.0`
- Evidence-reference validity: `1.0`
- Remaining bootstrap failures: `43`

All 43 remaining failures are missing expected source candidates from the top
25 on broad generic queries. There are no unsupported inclusions, evidence
reference failures, or printing-expansion mismatches in that report. The
source-derived baseline is not human gold, and 53 collector-demand calibration
queries still require human judgment. Numeric release thresholds are not
locked.

## High-Risk Proof

Regression artifact:

`C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\unified_collector_search_v2\high_risk_regression\2026-07-30T15-20-51-285Z_high_risk_9e2a4f385d54`

All `12/12` high-risk real-corpus checks passed:

- Mimikyu and Pikachu independent-presence strict zero;
- Pikachu-shaped cookie returns Slurpuff ASC 094;
- Pikachu plush role;
- Pikachu poster role;
- unresolved Pikachu pin strict zero;
- Pokemon holding a Poke Ball;
- three-or-more-Pokemon count evidence;
- Wingull sky suppression;
- Wingull cloud evidence;
- Wingull tree evidence;
- Marowak standing subject boundary;
- Marowak ex standing.

## Reviewer Packet

Final reconciled packet:

`C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_rebuild\unified_collector_search_v2\reviewer_packet\2026-07-30T15-29-41-063Z_packet_03d35aae5757`

- Packet-builder commit:
  `9d2e6dd91fd567762aa4e1dddf9c5457d44dceb1`
- Calibration queries: `200`
- Holdout queries exposed: `0`
- Top-result slots: `933`
- Required saved records: `678`
- Resolved saved records: `678`
- Resolved images: `678`
- Missing records/images/inventory IDs: `0`
- Unreadable source artifacts: `0`
- Remote images fetched during build: `false`
- Artifact hashes verified: `5/5`
- Official status: `awaiting_human_judgments`

PokeJavi's existing partial packet remains unchanged. Carry forward only a
judgment whose query, artwork, image hash, result semantics, packet version,
and result identity remain identical.

## Persistence State

- Migration:
  `supabase/migrations/20260729173000_card_visual_search_persistence_v1.sql`
- SHA-256:
  `cf63fb40dffefd46b1e4da7fb72f83db457573561c07d9b09c38c7c56eafe6b1`
- Status: `UNAPPLIED`
- Release loaded: no
- Active pointer: absent
- App-facing release: none

The migration grants no direct table access to public, `anon`, or
`authenticated`. Candidate and hydration RPCs are service-only. The
authenticated correction RPC writes staging only. The migration inserts no
data and creates no active pointer.

## Verification

- Visual-search contract family: `158/158` passed.
- Packet-builder focused contracts: `7/7` passed.
- Backend syntax check: passed.
- Web TypeScript: passed.
- Web ESLint: passed with zero warnings.
- `git diff --check`: passed.
- Database migration/RLS smoke tests: not run locally because this isolated
  worktree has no `SUPABASE_DB_URL`.
- No Flutter suite was run; this build does not change Flutter.

## Prior Artifacts Preserved

- Aborted projection:
  `...\projection\2026-07-30T14-57-32-105Z_projection_f407659f4d99`
- Initial high-risk test-assertion failure:
  `...\high_risk_regression\2026-07-30T15-20-03-043Z_high_risk_ddeb8143b1e9`
- Initial reviewer packet with incorrect relative source resolution:
  `...\reviewer_packet\2026-07-30T15-25-46-549Z_packet_7446d354ffb5`
- Superseded valid release lacking a hash-pinned source-registry load payload:
  `...\2026-07-30T15-22-40-652Z_release_240c7f4885b2`

These are audit history, not release inputs.

## Current Truths

- Structured and lexical search is functional over the immutable local corpus.
- The release is not production-active.
- Human calibration, not more Vision work, is the current dependency.
- Broad-query ranking still needs human relevance decisions.
- External unresolved evidence remains reviewer-only.
- Canonical identity has not been mutated.
- Existing paid Fact Graphs have not been changed.
- Embeddings are optional and explicitly outside this build.

## Invariants

- Raw observations remain the evidence backbone.
- Canonical metadata may guide inspection but cannot create visual facts.
- Scene subjects, depicted subjects, and character representations remain
  distinct.
- Intrinsic resemblance never proves a second independently present character.
- A depiction or representation requires a separate host surface or object.
- Candidate evidence never reaches collector results.
- Every hard identity, role, count, relationship, and printing match remains
  deterministic and evidence-backed.
- Vectors cannot satisfy hard constraints.
- Source-derived labels cannot replace human gold.
- Holdout results cannot tune the frozen candidate.
- Migration, load, validation, and activation remain separate gates.
- No rerun of paid Vision is required or authorized for this 10k corpus.

## Explicit Next Gate

Complete the final reviewer packet, obtain independent difficult-family review,
adjudicate disagreements, freeze thresholds, and execute the sealed 50-query
holdout exactly once. Only a passing holdout can authorize the separate private
migration-apply gate described in
`docs/runbooks/CARD_VISUAL_SEARCH_PRIVATE_RELEASE_LOAD_V2.md`.
