# CARD_VISUAL_SEARCH_ELIGIBILITY_V1

Status: Active - offline eligibility derivation only

Date: 2026-07-21

## Purpose

This contract defines the deterministic policy that converts the frozen Card Visual Corpus V1 source inventory into search eligibility tiers. It does not approve visual facts, mutate source graphs, assign artwork groups, write database rows, generate embeddings, or activate search.

## Core Boundary

These states remain independent:

- Structurally valid: the Fact Graph V2 payload and evidence references validate.
- Search eligible: this policy permits selected evidence to enter a future search projection.
- Human approved: a person has reviewed the image and graph.

Search eligibility never implies human approval or canonical truth.

## Decision Inputs

The policy may use only durable, versioned source evidence:

- source outcome class
- structural validity
- prompt branch and version
- schema and agent version
- source image type and quality score
- identity, description, and attribute confidence
- review status
- quality flags and exact flag details
- deterministic policy results
- module review status, omission risk, and evidence quality
- graph, generated-row, image, and source hashes

The policy must not inspect market value, collector ownership, popularity, price, taste, or future search demand.

## Tier A

Tier A is trusted retrieval material.

Requirements:

- structurally valid candidate
- `pending` review status
- no quality flags or review policy results
- no critical subject, role, branch, graph, or identity conflict
- no low or unknown evidence quality in a reviewed module
- no high or unknown omission risk
- no uncertain module review
- image quality at least `0.75`
- identity confidence at least `0.80`
- attribute confidence at least `0.80`
- exact or normal source image, not representative-variant evidence

Tier A receives `rank_adjustment_key = tier_a`.

## Tier B

Tier B is conservative retrieval material.

A structurally valid row becomes Tier B when it has known, noncritical review conditions that can be handled by deterministic projection guards, including:

- incomplete or low-evidence modules
- count inconsistency
- speculative setting, weather, or time language
- unsupported pose, action, expression, mood, or personality language
- anatomy overclaim without primary-subject conflict
- metadata leakage into visual terms
- material-appearance versus physical-surface confusion
- card UI leakage into artwork search terms
- low resolution, glare, crop, blur, or unreadable text
- shared-artwork print-marker uncertainty
- sanitized or missing semantic tags

Tier B receives `rank_adjustment_key = tier_b`. Final numeric ranking weights belong to the search evaluation contract, not this policy.

The eligibility decision must include:

- exact flags and policy results
- projection guard keys
- flagged fields and matched text
- module limitations
- decision reasons

Projection guards remove or suppress the affected claim class during deterministic document construction. They do not modify the source graph.

## Tier C

Tier C is excluded from active search.

Tier C includes:

- quarantine, image skip, or unprocessed source outcomes
- missing or invalid source graph/hash evidence
- Energy branch rows in Corpus V1
- unsupported review status
- primary-subject mismatch
- canonical-name visual conflict
- subject-kind or scene/depicted/representation role confusion
- unavailable-metadata prompt-branch mismatch
- identity confidence below `0.80`
- attribute confidence below `0.80`
- an unknown quality flag or policy rule that has no reviewed deterministic classification

Unknown failure classes fail closed to Tier C. A future policy version may reclassify them after tests and review.

## Projection Guard Keys

V1 recognizes these guard classes:

- `module_completeness`
- `counts`
- `environment_setting`
- `weather_time`
- `pose_action_state`
- `anatomy`
- `subject_semantics`
- `metadata_terms`
- `material_surface`
- `print_markers`
- `expression_personality_mood`
- `card_ui_terms`
- `image_or_text_visibility`
- `search_term_fallback`

The future projection builder must define the exact fields and fact classes blocked by each guard. Until that builder exists, Tier B decisions are eligibility evidence only and do not authorize indexing.

## Source Gap Rule

The `302` quarantines, `49` image skips, and `273` unprocessed rows remain separate source outcomes. They receive Tier C with their original outcome class as the reason. They must not be represented as visually empty cards.

## Determinism And Versioning

Each decision must include:

- policy version `CARD_VISUAL_SEARCH_ELIGIBILITY_V1`
- corpus inventory run key and source hashes
- card-print ID
- source outcome
- tier
- rank adjustment key
- projection types allowed
- guard keys
- reasons and evidence details
- decision hash

Identical source rows and policy version must produce identical decisions.

## Acceptance Criteria

- Every frozen source ID receives exactly one decision.
- Valid candidates and source gaps reconcile to the source inventory.
- No duplicate or missing IDs exist.
- Tier A contains no flags, policy results, or module/source limitations.
- Tier B contains only known noncritical classes.
- Tier C contains every source gap and critical/unknown class.
- Zero Energy rows become eligible.
- Zero approved rows are created or implied.
- Source graphs remain byte-for-byte unchanged.
- No provider, database, embedding, grouping, or index operation occurs.

## Next Gate

After eligibility reconciliation, run a stratified audit of Tier A, Tier B, and Tier C decisions. Then define fail-closed artwork grouping. Do not build search projections until both eligibility and artwork grouping are accepted.

## Related Contracts

- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`
- `docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md`

