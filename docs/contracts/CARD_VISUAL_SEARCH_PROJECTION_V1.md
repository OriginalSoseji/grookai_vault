# CARD_VISUAL_SEARCH_PROJECTION_V1

Status: Active - offline projection construction only

Date: 2026-07-21

## Purpose

Define deterministic, evidence-preserving search documents for the locked Card Visual Corpus V1 and Artwork Grouping V1.1 manifest. Projection converts existing Fact Graph V2 evidence into subject, scene, and style/composition retrieval documents without a model, embedding, database write, or public search surface.

## Inputs

- Locked `CARD_VISUAL_ARTWORK_GROUPING_V1_1` groups and memberships.
- Locked `CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4` decisions.
- Reconciled `CARD_VISUAL_CORPUS_SOURCE_INVENTORY_V1` rows.
- Exact generated-row and fact-graph hashes from source artifacts.
- `CARD_VISUAL_CONTROLLED_VOCABULARY_V1` concepts already present in each graph.

Only Tier A and Tier B groups may produce documents. Tier C, Energy, conflicts, source gaps, and unreconciled inputs are excluded.

## Projection Version

`CARD_VISUAL_SEARCH_PROJECTION_V1`

## Source Selection

Each artwork group uses its locked `representative_card_print_id` source graph. The source generated-row hash and fact-graph hash must match the inventory and group membership before projection.

Shared artwork permits one artwork-level document set. It does not merge or rewrite source graphs and does not inherit print-marker evidence.

## Document Types

Every artwork group receives three deterministic records:

- `subject`
- `scene`
- `style_composition`

An empty document remains an explicit record with `projection_status = empty`; no content is invented to fill it.

### Subject

May contain observation-backed:

- scene, depicted, and character-representation roles;
- visible identity evidence with role labels;
- human appearance and clothing;
- creature anatomy and physical features;
- pose, orientation, action/state, and facial evidence;
- subject-specific colors and relationships.

Canonical card identity is recorded separately as `canonical_context`. It is not image-derived evidence.

### Scene

May contain observation-backed:

- environment, terrain, sky, plants, architecture, and water;
- objects and props;
- visible weather and time cues;
- counts and relationships;
- visual effects and scene-layer placement.

### Style And Composition

May contain observation-backed:

- palette and color relationships;
- lighting, shadows, highlights, and contrast;
- camera angle, framing, cropping, depth, and composition;
- motion cues, motifs, repeated shapes, and objective style cues.

## Evidence Entry

Every projected entry must retain:

- source type: observation, typed fact, semantic fact, canonical visual concept, or fact-grounded search term;
- source ID where one exists;
- normalized term and original value;
- module and field path where applicable;
- subject role where applicable;
- valid supporting observation IDs;
- confidence and evidence strength when available.

No projected claim may exist without at least one valid artwork observation ID. Card UI and print-marker observations do not count as artwork evidence.

## Deterministic Text

`document_text` is a mechanical rendering of sorted evidence entries. It is not generated prose. Stable input facts and versions must produce the same text and hash regardless of processing order or timestamp.

The document also records normalized lexical terms, structured concepts, subject roles, observation IDs, typed-fact IDs, semantic-fact IDs, exclusions, tier, and guards.

## Global Exclusions

Never project:

- compatibility prose;
- raw graph JSON as one text blob;
- card UI, rules, attacks, HP, rarity, set, copyright, illustrator, or mechanics;
- physical foil, finish, texture, border, stamp, logo, or print-marker claims;
- story, lore, purpose, personality, or unsupported mood;
- actual-material claims when only appearance is visible;
- query aliases such as `stoner`, `high`, or `under the influence` as facts;
- evidence with missing observation references.

## Tier B Guard Semantics

Guards never modify the source graph. They suppress affected projection entries and record exact exclusions.

### `module_completeness`

- Suppress entries from modules explicitly named in `module_limitations`.
- Do not invent fallback entries for incomplete modules.
- Preserve other evidence and apply the Tier B rank adjustment.

### `counts`

- Suppress count records, count typed facts, count semantic facts, and count search terms.

### `environment_setting`

- Suppress environment/setting and scene-type claims, including derived concepts and search terms supported only by environment observations.

### `weather_time`

- Suppress weather and time-of-day claims without suppressing unrelated environment evidence.

### `pose_action_state`

- Suppress pose, orientation, action, and state entries.

### `anatomy`

- Suppress creature-anatomy, physical-feature, and anatomy-derived entries.

### `subject_semantics`

- Suppress image-derived subject identity and role semantics.
- Preserve canonical identity only in separately labeled canonical context.

### `metadata_terms`

- Suppress flagged metadata phrases and metadata-bearing search/concept entries.
- Canonical context remains separate and is never recast as visual evidence.

### `material_surface`

- Suppress material, gloss, reflectivity, finish, texture, and surface claims from artwork facts.

### `print_markers`

- Suppress all print-marker and physical-card entries. V1 projects none even without this guard.

### `expression_personality_mood`

- Suppress interpreted expression, personality, and mood labels.
- Objective facial evidence may remain when it is not the flagged claim.

### `card_ui_terms`

- Suppress all card UI/mechanics terms. V1 projects none even without this guard.

### `image_or_text_visibility`

- Suppress visibility/readability/scan-quality statements and weak evidence affected by source visibility.
- Preserve unrelated strongly supported visual observations.

### `search_term_fallback`

- Suppress fact-grounded search-term entries while preserving independently supported observations and typed facts.

## Field Classification

Guard matching uses source type, module, field path, observation kind, semantic category, and exact flagged phrases together. A phrase alone is not sufficient when its field meaning differs.

When classification is ambiguous, exclude the entry and record `ambiguous_guard_classification`. Prefer omission over unsupported retrieval evidence.

## Group Guard Rule

The active guard set is the union of guards from every group member. This is intentionally conservative. Every exclusion records the guard, source entry, and supporting evidence.

## Reconciliation

The offline build must prove:

- one artwork record per locked group;
- one printing record per locked membership;
- three document records per artwork group;
- no Tier C, Energy, conflict, or duplicate row;
- every source hash matches;
- every projected observation reference exists;
- every exclusion references an existing source entry;
- deterministic document IDs and hashes;
- stable replay output excluding run timestamps;
- exact counts across run plan, artifacts, reconciliation, and hashes.

## Required Artifacts

- `run_plan.json`
- `visual_search_artworks.jsonl`
- `visual_search_printings.jsonl`
- `visual_search_documents.jsonl`
- `visual_search_concept_evidence.jsonl`
- `visual_search_projection_exclusions.jsonl`
- `visual_search_projection_failures.jsonl`
- `PROJECTION_RECONCILIATION.json`
- `PROJECTION_RECONCILIATION.md`
- `artifact_hashes.json`

## Acceptance Criteria

- All locked groups resolve to hash-matching source graphs.
- All three documents are deterministic for every group.
- All evidence and exclusions reconcile.
- Every V1.4 guard is recognized and applied.
- No card UI or print-marker evidence enters artwork documents.
- No compatibility prose is used.
- No provider, database, approval, embedding, index, or public-read activity occurs.

## Exact Next Gate

Run offline lexical and structured evaluation against the fixed `CARD_VISUAL_SEARCH_EVALUATION_V1` query suite. Inspect false positives, false negatives, role confusion, guard behavior, explanations, and zero-result safety. Do not generate embeddings or write a migration until the offline projection and evaluation gates pass.

## Related Contracts

- `docs/contracts/CARD_VISUAL_ARTWORK_GROUPING_V1_1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`
