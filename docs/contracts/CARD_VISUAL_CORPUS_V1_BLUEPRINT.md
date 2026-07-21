# CARD_VISUAL_CORPUS_V1_BLUEPRINT

Status: Active - provider extraction, database apply, and index activation require separate gates

Date: 2026-07-21

## Purpose

This blueprint defines the governed Card Visual Fact Graph corpus that may later feed visual search. It freezes the extraction phase, identifies the durable source material, separates structural validity from search eligibility and human approval, and defines the reconciliation work required before any new database apply or search-index build.

This document does not authorize provider calls, database writes, embeddings, public reads, or search implementation.

## Product Question

The next proof is not whether Grookai can extract more images. It is:

> Can collectors reliably find cards by what is visibly depicted in the artwork?

The current corpus is large enough to answer that question. Additional provider extraction is frozen until a separately approved contract changes this boundary.

## Current Corpus Inventory

The current candidate corpus is approximately `10,376` structurally valid Fact Graph V2 rows from two disjoint workstreams:

| Source | Storage state | Structurally valid rows | Review status | Provider extraction state |
| --- | --- | ---: | --- | --- |
| Prior high-value artifact apply | Private database | 1,000 | 246 `pending`, 754 `needs_review`, 0 `approved` | Complete |
| 10,000-card overnight harvest | Audit artifacts only | 9,376 | 2,526 `pending`, 6,850 `needs_review`, 0 `approved` | Stopped at governed budget/circuit breaker |

The overnight frozen selection also contains:

- `302` quarantined validation failures
- `49` image skips
- `273` unprocessed card-print IDs
- `0` Energy cards
- `0` database writes

`10,376` is a candidate row count, not yet a frozen count of distinct artworks. The final corpus process must reconcile card-print identity, shared artwork groups, duplicates, current visual versions, and source hashes before publishing a searchable artwork total.

## Extraction Freeze

The following are binding for the planning phase:

- Do not make new provider calls.
- Do not process the `273` unprocessed IDs.
- Do not retry the `49` image gaps through a model.
- Do not resume broad catalog ingestion.
- Do not include Energy cards. Energy extraction remains a future project.
- Preserve all original artifacts, raw payloads, failures, token telemetry, and hashes.

Offline deterministic repair of preserved payloads may be designed, but execution requires its own bounded plan and must not create new visual observations.

## Governing Versions

Every corpus release must record at least:

- extraction prompt version
- fact graph schema version
- validator/policy version
- controlled vocabulary version
- projection version
- source artifact or database row version
- producing commit SHA
- source image identity and confidence
- artifact or row checksum

The current source generation used:

- `CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2`
- `CARD_VISUAL_FACT_GRAPH_SCHEMA_V2`
- `CARD_VISUAL_CONTROLLED_VOCABULARY_V1`
- provider/model `openai` / `gpt-4.1-mini`
- image detail `high`

The overnight source commits were:

- initial producing commit `8e927a0ca78fda9bcb45640ce42b18b637a30fcc`
- adaptive retry repair commit `bd16d7465f36d9f5b2527f60e8a1c6b9d21abe81`

## Truth Boundaries

Three statuses must remain independent:

### Structurally Valid

The payload conforms to Fact Graph V2, observation references reconcile, required modules and reviews exist, and deterministic validation completed.

Structural validity does not mean every observation is correct, human approved, or search eligible.

### Search Eligible

The graph passes deterministic retrieval-safety policy for a specific corpus release. Eligibility is derived, versioned, reproducible, and may change when policy changes.

Search eligibility does not approve the row as canonical truth.

### Human Approved

A reviewer has compared the source image and graph under an explicit review workflow. No current corpus row is approved.

Approval is not required for all search use. It is a separate trust signal that may increase ranking confidence later.

## Search Eligibility Tiers

The corpus build must derive one of these tiers without manual row-by-row approval:

### Tier A - Trusted Retrieval Material

Requirements:

- structurally valid
- current source version
- source image and card-print identity reconcile
- no critical subject-role, evidence-reference, story/lore, physical-surface, or canonical-identity contradiction
- no unresolved critical validator flag
- all indexed claims retain evidence references

Tier A may receive normal retrieval weight.

### Tier B - Conservative Retrieval Material

Requirements:

- structurally valid
- no critical contradiction
- one or more noncritical uncertainty, completeness, or review flags
- only supported claims are projected into search documents

Tier B remains searchable with a deterministic confidence reduction. Its existence and ranking adjustment must be explainable.

### Tier C - Excluded From Search

Includes:

- structural validation failures
- missing or unreconciled observation references
- critical subject-role or canonical-identity conflict
- unsupported story, lore, physical-card, or actual-material claim retained as fact
- missing source image or unusable image
- unprocessed IDs
- duplicate or ambiguous corpus ownership
- source hash or identity mismatch

Tier C remains quarantined or recorded as a coverage gap. It must not silently disappear from corpus accounting.

## Eligibility Derivation

Eligibility must be produced by a deterministic, versioned policy. Each decision record must contain:

```json
{
  "card_print_id": "uuid",
  "artwork_group_id": "stable-derived-id",
  "description_id": "uuid-or-null",
  "eligibility_policy_version": "CARD_VISUAL_SEARCH_ELIGIBILITY_V1",
  "tier": "A",
  "included_projection_types": ["subject", "scene", "style_composition"],
  "excluded_fact_ids": [],
  "decision_reasons": [],
  "source_hash": "sha256",
  "decided_at": "timestamp"
}
```

Eligibility policy may omit unsafe claims from projection without mutating the source graph. It must not manufacture replacement observations.

## Artwork And Printing Boundary

The corpus must distinguish reusable artwork facts from printing-specific evidence:

```text
canonical artwork identity
-> reusable artwork fact graph

specific printing or variant
-> print-marker evidence from that printing's own image
```

Rules:

- Shared artwork may reuse one artwork fact graph across multiple printings.
- A printing without a unique image may reference the shared artwork graph.
- No unique image means `variant_image_status = not_available`; it does not prove the printing is visually identical.
- `not_observed` does not mean `not_present`.
- Stamps, logos, bottom text, copyright lines, borders, errors, color differences, finish, and other print markers must not be inherited unless canonical evidence proves they are shared.
- Identity-significant artwork variants, such as a changed character feature, require distinct artwork groups when evidence is available.

Required printing linkage metadata includes:

```json
{
  "artwork_fact_source": "own_image_or_shared_parent_artwork",
  "variant_image_status": "available_or_not_available",
  "print_marker_evidence_status": "observed_or_not_observed_or_unreadable",
  "identity_confidence_from_image": null
}
```

## Artwork Grouping

Before index implementation, a deterministic grouping pass must produce:

- one stable artwork group ID per supported shared artwork identity
- all member `card_print_id` values
- grouping authority and evidence
- image source used by the fact graph
- whether the image is exact or representative
- conflicts where members may not share artwork
- a group-level checksum

Artwork grouping must fail closed when printings cannot be safely related. It must not use visual similarity alone to merge canonical identities.

## Quarantine And Coverage Gaps

The corpus release must preserve these classes separately:

- `valid_tier_a`
- `valid_tier_b`
- `quarantined_validation_failure`
- `skipped_image_missing_or_unusable`
- `unprocessed`
- `identity_or_artwork_group_conflict`
- `superseded_visual_version`

The 302 overnight quarantines may be replayed offline only from preserved payloads. Repairs may normalize or remove unsupported claims, but may not add observations that were not returned by the provider.

Image skips and unprocessed rows are coverage gaps, not model failures and not evidence that the card lacks visual content.

## Corpus Release Manifest

Each corpus release must be immutable and include:

- corpus version and creation time
- exact source checkpoints and artifact directories
- exact source commits
- exact candidate card-print IDs
- exact artwork groups and member printings
- eligibility-policy version
- row counts by tier, branch, source, review status, and coverage-gap class
- input and output checksums
- duplicate, missing, and extra ID reconciliation
- current/superseded visual-version reconciliation
- zero-approval and zero-embedding assertions where applicable
- rollback pointer to the previous release

No count mismatch is permitted between the release manifest, source artifacts, database readback, and later index input.

## Search Corpus Version

A searchable release is identified by the tuple:

```text
fact schema version
+ validator/policy version
+ controlled vocabulary version
+ corpus manifest version
+ projection version
+ embedding version
```

Changing any member produces a new immutable index build. Existing source graphs are not rewritten in place merely to match a new search release.

## Required Pre-Implementation Proof

Before any new artifact apply or search-index migration:

1. Approve this blueprint and the three related visual-search contracts.
2. Reconcile the 1,000 database rows and 9,376 artifact rows into one exact candidate manifest.
3. Prove source sets are disjoint or identify controlled duplicates.
4. Freeze artwork grouping rules and report ambiguous groups.
5. Derive Tier A/B/C with a versioned policy.
6. Produce exact counts and checksums for every outcome class.
7. Confirm the proposed index schema can preserve source evidence and printing linkage.
8. Stop for a separate database apply authorization.

## End-To-End Completion Roadmap

The project proceeds through explicit gates. Work may run in parallel only after the four proposed contracts are approved.

### Gate 0 - Contract Lock

- Review and approve this corpus blueprint.
- Review and approve `CARD_VISUAL_SEARCH_CONTRACT_V1`.
- Review and approve `CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1`.
- Review and approve `CARD_VISUAL_SEARCH_EVALUATION_V1`.
- Change approved documents from `Proposed` to `Active` and record the contract-lock commit.

Stop if the contracts disagree about artwork identity, printing expansion, eligibility, evidence explanations, or evaluation authority.

### Lane A - Corpus Readiness

1. Build an exact read-only inventory of the 1,000 private database rows and 9,376 valid artifact rows.
2. Prove disjointness or classify every overlap by exact card-print ID, visual version, and graph hash.
3. Replay the 302 quarantined payloads once through approved offline deterministic repairs.
4. Keep unrecoverable payloads in Tier C; do not regenerate them.
5. Record the 49 image skips and 273 unprocessed IDs as separate coverage gaps.
6. Derive stable artwork groups without merging solely from visual similarity.
7. Derive Tier A/B/C eligibility and excluded fact IDs under a versioned policy.
8. Produce and hash the immutable Corpus V1 release manifest.
9. Run a stratified human audit of eligibility decisions rather than approving every graph.

Lane A is complete when every candidate row has exactly one reconciled corpus outcome and every searchable artwork has evidence-preserving printing mappings.

### Lane B - Search Infrastructure

1. Read back target database capabilities, extensions, current RLS, grants, and migration history.
2. Write the index migration from the approved schema contract.
3. Add deterministic subject, scene, and style/composition projection builders.
4. Add evidence-reference, hash, idempotency, resume, and reconciliation tests.
5. Apply eligible source artifacts to private storage through bounded, atomic, read-back-verified packages.
6. Build a small no-embedding lexical/structured index canary.
7. Generate a cost plan and bounded embedding canary only after lexical projection is proven.
8. Build the full Corpus V1 candidate index as a new immutable run.
9. Verify exact document, vector, token, cost, and hash reconciliation.
10. Prove atomic activation and rollback without changing canonical search.

Lane B must stop before public activation if any identity, evidence-reference, RLS, count, or checksum mismatch appears.

### Lane C - Product And Evaluation

1. Create and checksum the 250-query suite and 200/50 split.
2. Annotate expected artwork groups, acceptable alternates, exclusions, roles, and printing expansion.
3. Build an internal search review surface that shows image, grouped printings, score components, and why-matched evidence.
4. Run the structured/lexical baseline before adding vectors.
5. Run the hybrid baseline after the embedding canary is accepted.
6. Classify failures by source graph, eligibility, grouping, projection, parser, retrieval, ranking, explanation, or printing expansion.
7. Tune only on the 200 calibration queries.
8. Propose and lock numeric acceptance thresholds.
9. Run the 50 holdout queries once against the frozen release candidate.
10. Preserve a release evaluation packet with complete ranked outputs and hashes.

Lane C replaces card-by-card microapproval with fixed retrieval evaluation and focused adjudication of difficult cases.

### Gate 1 - Functional Internal Search

An internal search canary is ready when:

- Corpus V1 reconciles exactly.
- Tier A/B/C derivation is deterministic and audited.
- All three projections build idempotently.
- Structured, lexical, and vector scores remain decomposable.
- Why-matched evidence references validate.
- Artwork grouping prevents duplicate-printing crowding.
- Printing expansion does not inherit unsupported markers.
- The 200-query calibration baseline is complete.
- Rollback and private-access boundaries are proven.

### Gate 2 - Release Candidate

- Freeze corpus, parser, vocabulary, projection, embedding, ranking, and API versions.
- Lock numeric evaluation thresholds.
- Run the 50-query holdout once.
- Run targeted migration, RLS, API, latency, and canonical-search regression tests.
- Confirm a valid zero-result experience and visible query relaxation behavior.
- Complete privacy, logging-retention, monitoring, and cost controls.

No code or weight changes are allowed during the holdout run.

### Gate 3 - Bounded Public Canary

- Activate the validated immutable index behind a feature flag.
- Limit traffic and preserve canonical-search fallback.
- Monitor latency, zero-result rate, click-through, query relaxation, duplicate crowding, and explanation failures.
- Collect explicit result-quality feedback without treating clicks as visual truth.
- Roll back immediately on canonical routing, printing expansion, privacy, or evidence-explanation defects.

### Gate 4 - Production Operation

- Promote the canary only after the observation window passes.
- Schedule deterministic reindexing for approved corpus/version changes.
- Preserve immutable manifests and active-run rollback pointers.
- Create a review queue from real search failures, not broad card-by-card approval.
- Maintain regression queries for every repaired failure class.

## Deferred Backlog

The following are intentionally outside Corpus V1 launch:

- new provider extraction for the 273 unprocessed cards
- acquiring images for the 49 image gaps
- Energy-card extraction
- full-catalog completion
- automatic approval
- representation/cameo fourth-vector projection unless evaluation requires it
- Taste Engine and Grookai Signature personalization
- story or generative visual creation
- multilingual and cross-TCG expansion

These items should be prioritized from observed search demand and evaluation gaps rather than resumed as undirected ingestion.

## Non-Goals

- New image extraction
- Energy-card processing
- Human approval of all rows
- Canonical identity mutation
- Print-marker inheritance
- Embedding creation
- Public search exposure
- Taste Engine or Grookai Signature integration
- Story or prose generation

## Source Checkpoints

- `docs/checkpoints/card_visual_descriptions/CARD_VISUAL_FACT_GRAPH_V2_ARTIFACT_DRAIN_750_20260720.md`
- `docs/checkpoints/card_visual_descriptions/CARD_VISUAL_FACT_GRAPH_V2_100_WORKER_OVERNIGHT_100USD_20260721.md`

## Related Contracts

- `docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md`
- `docs/contracts/CARD_VISUAL_CONTROLLED_VOCABULARY_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`
