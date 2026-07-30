# Unified Collector Search V2 Checkpoint

## Status

IMPLEMENTED AND VERIFIED LOCALLY; MIGRATION, RELEASE LOAD, EMBEDDINGS, AND
SIGNED-IN ACTIVATION NOT AUTHORIZED.

## Producer

- Branch: `agent/visual-search-lab-runtime-fix`
- Base commit: `3c2ed7a21600f8c3ea401a574c8df08ff6529623`
- Implementation state: uncommitted working tree
- Date: `2026-07-30` America/Denver

## Context

The local visual-search lab could combine canonical identity, Fact Graph
evidence, and curated cameo associations. Two convincing false matches exposed
an authority defect:

- Cosmic Eclipse Mimikyu used an unconfirmed external candidate whose raw notes
  said `pins`;
- Team Rocket's Mimikyu used intrinsic Pikachu-like costume anatomy as proof
  that Pikachu was independently present.

Neither source can satisfy a query requiring Mimikyu and Pikachu as two
independently depicted characters.

## Decision

Unified Collector Search V2 preserves five independent appearance roles:

1. `scene_subject`
2. `depicted_subject`
3. `character_representation`
4. `curated_association_unresolved`
5. `visual_resemblance_reference`

Only scene and depicted subjects satisfy a multi-character query. Character
representations require explicit object language. Resemblance is searchable
only through an explicit resemblance query. Candidate or unresolved external
evidence remains review-only.

The collector response is versioned through:

- `UnifiedCollectorSearchIntentV2`
- `VisualEvidenceAuthorityV2`
- `UnifiedCollectorSearchResponseV2`

## Implementation

- Added a fourth isolated `representation_cameo` search document.
- Preserved intrinsic mimicry as `visual_resemblance_reference`.
- Removed arbitrary prose as a source of independent character identity.
- Added evidence authority and governance checks.
- Added strict same-artwork Boolean character matching.
- Added grouped collector results and natural-language match reasons.
- Added strict-zero explanations with explicit relaxation controls.
- Added a full-image evidence viewer with zoom, matched facts, roles, and
  provenance.
- Added signed-in correction staging for wrong identity, role, object, or
  missing-detail reports.
- Added a signed-in feature-gated web adapter with canonical fallback.
- Added fail-closed handling for hard query clauses the web adapter cannot yet
  bind.
- Amended the still-unapplied persistence migration with candidate, draft
  review, final assertion, immutable release, and correction boundaries.
- Added 75 source-backed collector-demand queries to the existing 250-query
  evaluation contract.
- Kept vectors outside hard identity, role, count, relationship, and printing
  decisions.

## Query Proof

The local `9,532`-artwork runtime returned:

- `Mimikyu and pika`: strict zero; Mimikyu coverage `13`, Pikachu coverage
  `71`, with no false partial card results.
- `Pika shaped cookie`: one Slurpuff artwork result, classified as
  `character_representation`.
- `Pikachu`: `77` grouped results with named cards separated from artwork
  appearances and representations.
- `Gengar and Haunter or Ghastly`: strict zero.
- `Pokemon holding a pokeball`: one bound Yamper result.
- `card with 3 or more Pokemon`: `34` count-qualified results.

The two screenshot Mimikyu cards do not satisfy `Mimikyu and pika`.

## Browser Proof

Headless Chrome verified:

- the strict-zero message and `Show Mimikyu` / `Show Pikachu` controls;
- no partial card grid for the failed conjunction;
- the Slurpuff result for `Pika shaped cookie`;
- an evidence modal containing the self-hosted full card image;
- visible character-representation and cookie evidence;
- image zoom controls.

## Tests

- Backend syntax checks: passed.
- Targeted V2 contracts: `58/58` passed.
- Entire `card_visual_search_*` contract family plus V2 web contract:
  `128/128` passed.
- Web TypeScript: passed.
- Web ESLint: passed with zero warnings.
- `git diff --check`: passed.

## Current Truths

- No OpenAI Vision rerun was performed.
- No embedding was generated.
- No database migration was applied.
- No search release was loaded or activated.
- No feature flag was enabled.
- No public or anonymous visual search was enabled.
- Existing Fact Graph payloads remain unchanged.
- Canonical search remains the runtime fallback.
- PokeJavi's partial review packet remains unchanged.

## Invariants

- Intrinsic species resemblance never proves a second character.
- A depiction or representation requires a separate host surface or object.
- External reconciliation is not visual confirmation.
- Candidate and unresolved evidence never reaches collector results.
- Vectors may rank optional themes but cannot satisfy hard facts.
- Visual intelligence remains derived and linked to canonical card-print and
  artwork identity.
- Corrections enter staging and never mutate an active release.
- Unsupported query clauses must fail closed, not be dropped.

## Remaining Work

1. Execute the 250-query calibration through the V2 collector parser.
2. Finish PokeJavi review and founder/admin adjudication.
3. Require zero high-risk identity, role, canonical-filter, and printing
   failures.
4. Reproject the existing Fact Graph corpus offline into four V2 documents.
5. Reconcile every document and authority reference; do not rerun Vision.
6. Run a bounded embedding canary for optional semantic ranking only.
7. Compare structured/lexical ranking against hybrid ranking.
8. Apply and smoke-test the amended private migration.
9. Load one immutable visual-search release without activating it.
10. Verify release counts, evidence references, RPC access, latency, and
    rollback.
11. Activate the signed-in feature flag for a bounded canary.
12. Monitor latency, zero-result rate, relaxation clicks, correction reports,
    role confusion, and canonical fallback.

## Explicit Next Gate

Run the complete 250-query deterministic calibration through
`UnifiedCollectorSearchIntentV2`, including the 75 source-backed collector
queries. Do not apply the migration, generate embeddings, load a release, or
enable the signed-in feature flag until calibration and adjudication meet the
frozen high-risk acceptance criteria.
