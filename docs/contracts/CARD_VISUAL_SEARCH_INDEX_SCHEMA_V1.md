# CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1

Status: Active - migration, embedding generation, and activation require separate gates

Date: 2026-07-21

## Purpose

This contract defines the proposed durable index model for evidence-backed visual search. It preserves artwork-level retrieval identity, printing expansion, deterministic document projections, structured concepts, lexical search, semantic vectors, evidence references, resumable builds, and atomic rollback.

This is a schema design contract. It is not a migration and does not authorize database changes or embedding generation.

## Design Principles

- Search identity is artwork-level; collector routing remains card-print-level.
- Source Fact Graph V2 rows remain immutable derived intelligence.
- Search projections are deterministic and rebuildable.
- Structured facts, lexical terms, and vectors remain separate signals.
- Every projected claim retains evidence references.
- Index builds are immutable, versioned, resumable, and atomically activated.
- Shared artwork may map to many printings without inheriting printing-specific evidence.
- Private source data is not exposed directly to app roles.

## Proposed Entities

Final names and DDL require a migration review. The logical entities are:

### `card_visual_search_index_runs`

One immutable index-build ledger.

Required fields:

- `id`
- `run_key`
- `status`: `planned`, `building`, `validated`, `active`, `failed`, `superseded`
- `corpus_version`
- `corpus_manifest_hash`
- `fact_schema_version`
- `validator_policy_version`
- `controlled_vocabulary_version`
- `eligibility_policy_version`
- `projection_version`
- `embedding_provider`
- `embedding_model`
- `embedding_dimensions`
- `embedding_cost_snapshot`
- `source_commit_sha`
- planned and completed counts
- checkpoint cursor
- reconciliation summary
- error summary
- `created_at`, `completed_at`, `activated_at`

Only one validated run may be active for a given visual-search surface. Activation must be an atomic pointer change, not an in-place rewrite of the previous run.

### `card_visual_search_artworks`

One row per artwork group per index run.

Required fields:

- `id`
- `index_run_id`
- `artwork_group_id`
- `artwork_group_hash`
- representative `card_print_id`
- source `description_id` or artifact identity
- source fact-graph hash
- source image identity and confidence
- eligibility tier
- review status
- included projection types
- critical and noncritical policy reasons
- branch/category
- active-source version metadata
- `created_at`

Uniqueness must prevent duplicate `(index_run_id, artwork_group_id)` rows.

### `card_visual_search_printings`

Maps one artwork group to canonical printings.

Required fields:

- `index_run_id`
- `artwork_search_id`
- `card_print_id`
- public `gv_id` snapshot
- artwork-fact source: `own_image` or `shared_parent_artwork`
- variant image status
- print-marker evidence status
- image confidence
- grouping authority and evidence
- canonical snapshot hash
- `created_at`

Uniqueness must prevent a card print from mapping to the same artwork more than once in one index run. Ambiguous mappings are excluded and reported, not guessed.

### `card_visual_search_documents`

One deterministic projection document per artwork and document type.

Required fields:

- `id`
- `index_run_id`
- `artwork_search_id`
- `document_type`
- `projection_version`
- `document_text`
- `document_hash`
- normalized lexical terms
- structured concept JSON
- subject-role keys
- observation IDs
- typed-fact IDs
- semantic-fact IDs
- evidence confidence summary
- eligibility tier snapshot
- lexical search vector
- projection status and error
- `created_at`

Allowed V1 document types:

- `subject`
- `scene`
- `style_composition`

Reserved:

- `representation_cameo`

Uniqueness must prevent duplicate `(index_run_id, artwork_search_id, document_type, projection_version)` documents.

### `card_visual_search_embeddings`

Embedding state is separated from projection text so documents can be re-embedded without changing evidence or lexical behavior.

Required fields:

- `id`
- `index_run_id`
- `search_document_id`
- `embedding_provider`
- `embedding_model`
- `embedding_dimensions`
- `embedding_config_hash`
- `document_hash`
- vector value
- status: `planned`, `complete`, `failed`, `skipped`
- token and cost telemetry where returned
- retry count
- error class
- `created_at`, `completed_at`

Uniqueness must prevent duplicate embeddings for the same document hash and embedding configuration.

### `card_visual_search_concept_evidence`

Provides normalized evidence rows for explainability and structured filtering.

Required fields:

- `index_run_id`
- `search_document_id`
- normalized concept
- concept category
- subject role when applicable
- normalized value and optional numeric/range values
- field path
- source observation IDs
- source typed-fact IDs
- source semantic-fact IDs
- confidence and evidence strength
- derivation rule/version
- `created_at`

This layer may be represented relationally, through validated JSON plus indexes, or as a hybrid. The implementation choice must preserve the same uniqueness, evidence, and query behavior.

## Deterministic Projection Rules

Projection must use only search-eligible, evidence-backed source facts.

Each document must be generated from stable field order and stable normalization rules. Identical source facts and versions must produce the same `document_text` and `document_hash`.

The projection layer must not:

- send the graph to a generative model
- embed raw graph JSON as one document
- use compatibility prose as source truth
- invent synonyms that are not in the controlled vocabulary
- merge subject roles
- copy card UI text into artwork documents
- include unsupported lore, story, personality, actual-material, or physical-surface claims

## Document Content

### Subject

May include:

- scene, depicted, and representation roles with explicit role labels
- canonical identity as a separately sourced field
- visible anatomy and physical features
- human appearance and clothing
- pose, orientation, action/state, facial evidence
- subject-specific colors, counts, and relationships

### Scene

May include:

- environment and setting concepts
- sky, ground, terrain, plants, architecture, and water
- visible weather and time cues
- objects, props, counts, relationships, and effects
- foreground, midground, and background placement

### Style And Composition

May include:

- palette and color relationships
- lighting, shadows, highlights, contrast
- camera angle, framing, crop, depth, composition
- motion cues, motifs, repeated shapes, and objective style cues

## Structured Indexes

The migration design should evaluate:

- relational/B-tree indexes for run, artwork group, card print, tier, branch, role, document type, and version keys
- GIN indexes for normalized concept arrays or validated JSONB structures
- generated or stored `tsvector` for lexical search
- a vector index appropriate to expected corpus size and chosen distance metric
- trigram or normalized lexical support only where it does not weaken canonical search rules

Index choices must be measured against the fixed evaluation and latency suite. This contract does not prescribe a vector extension or index algorithm before repository/database capability is verified.

## Canonical Metadata Boundary

Canonical metadata remains joined from canonical truth surfaces or preserved as a versioned snapshot for reconciliation. It must not be copied into image-derived evidence fields.

The system may use canonical identity to filter or rank a visual result, but the why-matched payload must identify whether a component came from:

- canonical metadata
- image-derived structured fact
- lexical projection
- semantic vector
- external cameo metadata

## Index Eligibility

Only Tier A and Tier B artwork groups may produce active documents.

- Tier A: normal weight
- Tier B: deterministic reduced confidence/weight
- Tier C: no active search document

Unsafe source facts may be excluded from a Tier B projection while remaining preserved in the source graph. The projection record must list excluded fact IDs and policy reasons.

## Version And Idempotency Contract

An index artifact is uniquely governed by:

```text
corpus manifest hash
+ artwork group hash
+ source fact graph hash
+ eligibility policy version
+ controlled vocabulary version
+ projection version
+ embedding configuration hash
```

Requirements:

- Replaying an identical build inserts no duplicate logical documents.
- Changed source or versions create new immutable rows under a new run.
- Failed documents may resume by exact run and document identity.
- A resume must not re-embed completed identical document hashes.
- Counts, hashes, retries, tokens, and cost reconcile before activation.

## Build Lifecycle

1. Create a frozen run plan from an approved corpus manifest.
2. Materialize artwork and printing mappings.
3. Build deterministic projection documents.
4. Validate document hashes and evidence references.
5. Build lexical indexes.
6. Generate embeddings under a separately approved cost ceiling.
7. Reconcile every planned document and embedding outcome.
8. Run the fixed evaluation suite.
9. Mark the build `validated` only when acceptance criteria pass.
10. Atomically activate the validated run.

No incomplete or failed run may become active.

## Rollback And Reindex

- Keep prior validated index runs immutable.
- Activation changes a single governed current-run pointer or equivalent view boundary.
- Rollback selects the prior validated run without rewriting source graphs.
- Reindex creates a new run; it does not mutate an active run in place.
- Deletion or archival follows a retention policy only after rollback proof and hash preservation.

## Public Read Boundary

Source fact-graph tables, internal index tables, raw model output, policy diagnostics, and embeddings remain private.

Public access must use a reviewed RPC or view that returns only:

- public card identity and route fields
- artwork grouping
- selected visual concepts
- decomposed scores appropriate for the product
- evidence-backed why-matched summaries
- image confidence
- matching-printing summaries

Before release, migration verification must prove:

- RLS state
- grants by role
- no direct `anon` or `authenticated` access to private source/index tables
- bounded RPC parameters and result counts
- canonical route integrity

## Reconciliation Requirements

The run ledger, corpus manifest, artwork rows, printing mappings, documents, embeddings, evaluation input, and final activation report must agree on:

- planned and completed artwork groups
- card-print membership
- projection counts by type
- excluded Tier C rows
- failed/skipped documents
- embedding counts
- retries, tokens, and cost
- source and output hashes

No count, identity, evidence-reference, or checksum mismatch is permitted.

## Migration Gate

No migration may be written or applied until:

1. This schema contract is approved.
2. The corpus and search behavior contracts are approved.
3. Exact corpus/artwork grouping requirements are proven against current data.
4. Existing extension and index capabilities are read back from the target database.
5. The migration includes rollback, RLS, grants, indexes, and smoke tests.
6. A small bounded index build and readback plan is approved.

## Related Contracts

- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`
- `docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md`
- `docs/contracts/CARD_VISUAL_CONTROLLED_VOCABULARY_V1.md`
- `docs/contracts/SEARCH_CONTRACT_V1.md`
- `docs/contracts/GROOKAI_SMART_SEARCH_V1.md`
