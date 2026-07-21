# CARD_VISUAL_SEARCH_EVALUATION_V1

Status: Active - evaluation execution and release activation require separate gates

Date: 2026-07-21

## Purpose

This contract defines how Grookai will prove that visual search is relevant, evidence-backed, role-correct, printing-safe, and fast enough for collector use. It establishes a fixed, versioned 250-query suite, judgment format, failure taxonomy, metrics, baseline procedure, and threshold-locking process.

It does not authorize corpus apply, index creation, embeddings, or public release.

## Evaluation Principle

The evaluation must answer:

> Can collectors reliably find cards by what is visibly depicted in the artwork, and can Grookai prove why each result matched?

Passing schema validation is not a search-quality result. Human approval of every source graph is also not required. Search is evaluated at the retrieval trust boundary: eligible evidence, ranked artwork groups, correct printing expansion, and defensible explanations.

## Fixed Suite

Create exactly `250` versioned queries before ranking thresholds are locked.

Recommended split:

- `200` calibration queries visible to implementers
- `50` holdout queries frozen before weight tuning

The query text, intent annotation, expected judgments, and holdout membership must be checksummed. Holdout judgments remain unavailable to ranking implementers until a release candidate is evaluated.

After V1 is locked, changes to the suite create a new evaluation version. Queries must not be removed merely because they expose a failure.

## Coverage Matrix

The 250-query suite must include all of these families:

| Family | Minimum concerns covered |
| --- | --- |
| Canonical subject + visual fact | Named subject combined with pose, state, clothing, object, or environment |
| Visual-only discovery | No canonical card name; search by visible facts alone |
| Subject roles | Scene subject, depicted subject, character representation |
| Multi-subject scenes | Counts, interactions, foreground/background roles |
| Anatomy/features | Wings, horns, tails, claws, eyes, markings, flames, body structures |
| Human appearance | Hair, body-region visibility, factual clothing, accessories, gesture |
| Pose/action/state | Standing, sleeping, floating, leaping, holding, sitting, eating |
| Environment | Forest, buildings, indoor/outdoor, terrain, water, sky, supported weather/time cues |
| Objects/counts | Tools, food, furniture, mechanical parts, exact and ranged repeated elements |
| Color/light | Palette, glow, highlights, backlighting, shadow, contrast |
| Composition/style | Crop, angle, symmetry, diagonal flow, repeated shapes, motifs |
| Effects | Lightning, flames, smoke, vapor, sparks, wisps, reflections |
| Representation/cameo | Poster, screen, card-within-card, plush, statue, food shape, logo/pattern |
| Alias intent | Evidence-backed colloquial queries such as `stoner`, `Halloween`, or `ghostly` |
| Metadata + visual | Set/year/artist/printing filters combined with artwork facts |
| Printing expansion | Shared artwork, exact image, representative image, variant markers |
| Negative/zero result | Unsupported combinations and intentionally absent concepts |
| Duplicate control | Artwork shared across many printings |

The final suite manifest must report exact query counts per family and corpus branch.

## Query Record

Each evaluation query must contain:

```json
{
  "query_id": "vsq_0001",
  "query_text": "Pikachu sleeping in a forest",
  "split": "calibration",
  "intent": {
    "canonical_filters": {"subjects": ["Pikachu"]},
    "visual_concepts": ["sleeping", "forest"],
    "subject_roles": ["scene_subject"],
    "count_constraints": [],
    "printing_filters": []
  },
  "required_evidence_categories": ["subject", "pose_state", "environment"],
  "judgment_set_version": "CARD_VISUAL_SEARCH_JUDGMENTS_V1"
}
```

## Gold Judgments

Judgments are artwork-group-first and must distinguish:

- `highly_relevant`
- `relevant`
- `acceptable_alternate`
- `not_relevant`
- `must_exclude`
- `valid_zero_result`

Each positive judgment must identify:

- expected artwork group
- acceptable printing expansion
- required subject role
- required visual concepts
- source evidence references or reviewer evidence note
- whether partial matches are acceptable

Each exclusion should state the disqualifying reason, such as role mismatch, unsupported inference, count mismatch, or wrong printing expansion.

## Failure Taxonomy

Every evaluated failure must use one or more of these labels:

- `correct_result_missing`
- `incorrect_result_included`
- `correct_artwork_wrong_printing_expansion`
- `correct_cue_wrong_subject_role`
- `unsupported_inference`
- `alias_overreach`
- `count_mismatch`
- `representation_depicted_subject_confusion`
- `scene_subject_representation_confusion`
- `duplicate_artwork_crowding`
- `canonical_filter_violation`
- `evidence_explanation_mismatch`
- `valid_zero_result`
- `latency_budget_failure`
- `index_coverage_gap`

Failure labels must point to the likely repair lane:

- source fact graph or eligibility policy
- artwork grouping/printing mapping
- deterministic projection
- controlled vocabulary or alias map
- query parser
- structured filtering
- lexical retrieval
- vector retrieval
- ranking aggregation
- explanation generation

## Required Metrics

Report at least:

### Relevance

- Recall@10 and Recall@25
- Precision@10
- nDCG@10
- Mean Reciprocal Rank for queries with a primary expected result
- valid-zero-result accuracy

### Trust And Correctness

- unsupported-match rate
- subject-role confusion rate
- count-constraint violation rate
- canonical-filter violation rate
- wrong-printing-expansion rate
- explanation/evidence-reference validity rate

### Result Diversity

- duplicate-artwork rate in top 10
- unique artwork groups in top 10
- Tier A/Tier B distribution by rank

### Coverage And Operations

- eligible artwork/index coverage
- projection failure rate
- embedding failure/retry rate when embeddings are authorized
- query latency p50, p95, and p99
- zero-result rate by query family

Metrics must be reported globally and by query family. A strong aggregate score must not hide a subject-role, printing, alias, or zero-result failure class.

## Baseline Procedure

1. Freeze the approved corpus manifest and index versions.
2. Freeze the full query suite and hidden holdout split.
3. Build the first index without tuning against holdout judgments.
4. Run all 200 calibration queries and record complete ranked outputs and score components.
5. Establish the initial baseline and identify failure classes.
6. Propose acceptance thresholds from observed performance and product risk.
7. Lock thresholds before the holdout run.
8. Run the 50 holdout queries once against the frozen release candidate.
9. Preserve all outputs, metrics, failures, latency, versions, and hashes.

Thresholds must not be invented before the baseline reveals realistic corpus behavior.

## Threshold Locking

The first baseline report must propose numeric release thresholds for:

- relevance metrics
- unsupported-match rate
- role-confusion rate
- wrong-printing-expansion rate
- explanation validity
- duplicate crowding
- zero-result accuracy
- p95 latency

Once approved, thresholds are stored as a versioned appendix or follow-on active contract. They cannot be relaxed during a failing evaluation run. Any threshold change requires a rationale and a new evaluation version.

## Human Judgment Workflow

The suite evaluates retrieval results; it does not require microapproval of the full corpus.

Recommended review process:

- One trained reviewer labels straightforward queries.
- Two independent reviewers label difficult role, alias, count, and printing-expansion cases.
- Disagreements are adjudicated and preserved.
- Reviewers inspect the source image, fact evidence, and canonical printing identity.
- A model may assist formatting but cannot be the sole gold-judgment authority.

Judgment artifacts must record reviewer identity or stable reviewer key, timestamp, source index version, and decision notes.

## Evidence Explanation Evaluation

A why-matched explanation passes only when:

- every fact and observation reference exists in the indexed source
- the evidence supports the matched query concept
- the subject role is correct
- canonical and image-derived signals are labeled separately
- no new unsupported claim appears in explanation text
- an alias explanation describes visible cues rather than asserting a character state

Explanation validity should be checked deterministically for references and manually for a stratified sample of semantic support.

## Printing Expansion Evaluation

Tests must include:

- multiple printings sharing one artwork
- a printing with its own exact image
- a printing using representative/shared artwork
- an identity-significant artwork variant
- print-marker differences not present in the shared artwork graph

A result fails if the artwork is correct but expansion implies unsupported printing-specific evidence.

## Zero-Result Evaluation

Negative cases must include:

- plausible concepts absent from the current corpus
- impossible subject-role combinations
- unsupported exact counts
- contradictory canonical and visual filters
- alias queries lacking the required cue combination

The system passes a zero-result case by returning none or by visibly offering a relaxed query. It fails if it fabricates support or silently drops the restrictive term.

## Regression Policy

Every candidate release must run the same fixed suite and compare against the active baseline.

Required rules:

- no prompt, corpus, projection, vocabulary, parser, weight, or index change during a run
- no query removal or judgment change during a run
- preserve complete ranked outputs, score components, and why-matched evidence
- report improvements and regressions by family
- block activation on any locked hard-threshold failure
- require explicit review for statistically small but high-risk role/printing regressions

## Evaluation Artifacts

Each run must preserve:

- run plan and exact commit SHA
- corpus and index version tuple
- query-suite and judgment hashes
- all ranked outputs, not only top-line metrics
- decomposed scores
- why-matched evidence
- latency samples
- aggregate and stratified metrics
- failure classifications
- threshold decision
- reconciliation report
- artifact hash manifest

## Acceptance Before Public Release

Visual search is release-eligible only when:

- the index input and output reconcile exactly
- all locked hard thresholds pass
- no unresolved critical canonical-filter or printing-expansion defect remains
- why-matched reference validity is complete
- holdout results meet the locked standard
- rollback is proven
- targeted security/RLS/API tests pass
- canonical search remains unaffected

Passing evaluation authorizes neither Taste Engine nor Grookai Signature integration. Those remain separate projects.

## Related Contracts

- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md`
- `docs/contracts/CARD_VISUAL_CONTROLLED_VOCABULARY_V1.md`
- `docs/contracts/SEARCH_CONTRACT_V1.md`
- `docs/contracts/GROOKAI_SMART_SEARCH_V1.md`
