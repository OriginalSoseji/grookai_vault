# Visual Search V1 Productization Start

Date: 2026-07-28

Status: ACTIVE; MAIN-BASED PRODUCTIZATION BRANCH CREATED; NO DATABASE, EMBEDDING, OR PUBLIC SEARCH ACTIVATION

## Purpose

This checkpoint starts the productization phase for Grookai Visual Search V1.

The extraction experiment is no longer the project. Grookai already has enough
non-Energy card artwork evidence to build and evaluate a functional visual
search system. The work now is to convert that governed evidence into a
versioned, explainable, production read model without weakening canonical
identity, search, security, or pricing boundaries.

The product question is:

> Can a collector reliably find cards by directly visible artwork facts, and
> can Grookai prove why every result matched?

Examples include:

- Pikachu sleeping in a forest
- trainers wearing gloves
- cards with three visible lightning bolts
- purple-haired people with blue jewelry
- Pokemon floating above water
- a character shown on a poster
- a character-shaped pillow or food item
- dark artwork with strong backlighting
- ghostly or Halloween scenes supported by visible cues
- colloquial intent supported by objective evidence, such as smoke plus
  red-eye or drooping-eyelid cues

Visual Search V1 searches facts. It does not generate stories at query time.

## Git Provenance

- Productization branch: `feature/visual-search-v1-productization`
- Productization worktree: `C:\grookai_vault_visual_search_v1`
- Production baseline branch: `origin/main`
- Production baseline SHA: `3c862b815735a4eda93b65ac108fc583f1c62fc9`
- Governed source branch: `feature/card-visual-search-review-portal`
- Governed source branch SHA: `c5bbbba5dea998fcd51d0d8602601737356a1494`
- Isolated production review-portal release SHA:
  `f2e57e476e8d68aa241d2b6a3afbc8480e9d7100`
- Existing production review route:
  `https://grookaivault.com/review/visual-search`

The source branch is 143 commits ahead of and 57 commits behind the production
baseline at this checkpoint. It must not be merged wholesale into production.
Proven components will be imported selectively with their contracts, tests,
and source provenance.

## Pricing Isolation

Pricing Production V1 remains a separate release-management workstream.

- Pricing canary checkpoint commit:
  `59944925761f5cb936cf7a45c15e2b2ba564bca2`
- Pricing canary observation remains automated.
- The current pricing canary is expected to complete its 72-hour window around
  `2026-07-31T02:40:15-06:00`.

Visual Search work must not modify:

- pricing migrations
- pricing publication policy
- TCGPlayer ingestion or qualification
- pricing read models
- the pricing canary workflow
- Founder pricing visibility

The visual-search branch may progress while pricing observes, but pricing
release gates remain independently governed.

## Decision

Build Visual Search V1 from the existing governed corpus and proven offline
search components.

Do not resume bulk card-image ingestion merely to increase sample size.

Do not merge the broad experimental branch into `main`.

Do not require manual approval of every visual fact graph before search
calibration. Search quality is governed at the retrieval boundary:

```text
eligible evidence
-> artwork grouping
-> deterministic projection
-> structured, lexical, and semantic retrieval
-> decomposable ranking
-> evidence-backed explanation
-> canonical printing expansion
```

Human judgment is required to establish search relevance and release
thresholds, not to rewrite every source graph.

## Existing Proven Foundation

The following work is complete on the governed source branch and is input to
productization.

### Corpus

- `11,000` unique non-Energy card-print IDs are reconciled.
- `10,376` rows have structurally valid Fact Graph candidates.
- `624` rows are explicit source gaps:
  - `302` quarantined payloads
  - `49` image skips
  - `273` unprocessed IDs
- Energy cards remain excluded.
- Paid ingestion is stopped.
- No new OpenAI image-extraction run is authorized by this checkpoint.

### Search Eligibility

- `9,702` printings are eligible for visual search.
- Eligible printings are grouped into `9,532` artwork identities.
- The locked eligibility population includes:
  - `2,687` Tier A rows
  - `7,015` guarded Tier B rows
  - `1,298` Tier C exclusions
- Tier C rows do not produce active search documents.
- Tier B rows retain projection guards and reduced trust where required.

### Artwork Grouping

- `9,532` stable artwork groups exist.
- `9,372` groups are singletons.
- `160` groups contain shared exact-image artwork.
- Same-name cards with different images remain separate artwork identities.
- Printing expansion does not inherit unsupported printing-specific evidence.

### Deterministic Search Projection

- `28,596` deterministic search documents exist:
  - subject
  - scene
  - style and composition
- `357,413` evidence entries preserve observation and fact references.
- `168,046` unsafe or inapplicable entries are explicitly excluded.
- Projection replay was byte-identical under the locked version.
- Card UI and mechanics are excluded from artwork projections.
- Compatibility prose is not a search source.

### Evaluation And Review

- The candidate suite contains `250` queries:
  - `200` visible calibration queries
  - `50` sealed holdout queries
- The holdout has not been exposed.
- The review packet contains exact source images and full saved visual records.
- The latest packet reconciles `753/753` required saved visual records and
  images.
- The authenticated production review portal is read-only.
- Reviewer progress remains browser-local until JSONL export.
- PokeJavi is the intended external reviewer using the existing Grookai login.
- No reviewer action can approve descriptions or write database, storage,
  embedding, canonical, or search-index state.

### Offline Retrieval Proof

- A deterministic local search lab exists over all `9,532` artwork groups.
- The candidate index contains approximately `321,937` indexed entries.
- Indexed retrieval preserved the prior result semantics for all `200`
  calibration queries.
- Median candidate latency improved from approximately `4,116 ms` brute force
  to `1.53 ms`.
- Observed indexed p95 latency was approximately `110.85 ms`.
- Bootstrap Recall@25 was `62.23%`.
- Bootstrap valid-zero-result accuracy was `100%`.
- Bootstrap explanation-reference validity was `100%`.

These bootstrap metrics are diagnostic. They are not release thresholds and do
not authorize production activation.

## What Is Live Today

The following limited surface is live:

- authenticated route: `/review/visual-search`
- authorized reviewer access
- immutable private review bundle
- image and evidence inspection
- browser-local judgments
- JSONL export

The following are not live:

- collector-facing visual search
- a persistent production visual-search index
- embeddings
- a visual-search RPC
- app-facing result ranking
- Taste Engine use
- Grookai Signature use
- recommendation use
- automated reviewer-decision import
- public anonymous visual search

## Source-Of-Truth Boundaries

### Canonical Identity

Canonical card identity, printing, set, number, language, rarity, and artist
remain canonical database truth. Image-derived facts cannot overwrite them.

### Visual Intelligence

Fact Graph V2 is derived intelligence. It may support retrieval, ranking, and
explanation, but it is not canonical identity truth.

### Artwork And Printing

Retrieval occurs at artwork-group level. Results expand to legitimate card
printings only after artwork ranking.

Shared artwork facts may be reused across printings. Shared artwork does not
prove:

- stamp
- finish
- border
- error
- copyright line
- logo
- language
- printing-specific color difference

### Search

Visual search extends canonical search. It does not replace it.

Canonical name, set, number, artist, and printing filters remain deterministic.
A visual-search outage must not make canonical search unavailable.

### Query-Time AI

Normal search execution must not:

- call a generative model
- generate arbitrary SQL
- create new visual facts
- create story text
- mutate source graphs

Embeddings may support retrieval only after a separately frozen model, cost,
privacy, and index-build gate.

## Product Contract

Visual Search V1 must support combinations of:

- canonical subject and metadata filters
- scene subject, depicted subject, and character representation roles
- visible anatomy and physical features
- pose, orientation, action, and visible state
- facial evidence
- factual human appearance, clothing, and accessories
- objects, props, food, plants, structures, and visual effects
- relationships such as holding, beside, behind, standing on, printed on, or
  shaped like
- foreground, midground, and background placement
- environment, terrain, water, sky, weather cues, and time-of-day cues
- exact or ranged visible counts
- color, palette, lighting, shadow, highlights, and contrast
- composition, framing, angle, crop, depth, motifs, and repeated shapes
- evidence-backed colloquial aliases
- negative filters and valid zero-result behavior

All role-sensitive searches must preserve:

- `scene_subject`: physically present in the illustrated scene
- `depicted_subject`: shown inside another visible surface
- `character_representation`: an object representing a character

## Target Architecture

### 1. Immutable Corpus Release

Create a frozen corpus release containing:

- exact source card-print IDs
- exact artwork-group memberships
- source fact-graph hashes
- eligibility decisions
- projection guards
- canonical snapshot hashes
- representative image identities and confidence
- corpus manifest hash
- source commit SHA

The release is immutable. Corrections create a new version.

### 2. Deterministic Projection

Generate separate projection documents for:

- subject
- scene
- style and composition

Each document preserves:

- normalized concepts
- raw observation IDs
- typed-fact IDs
- semantic-fact IDs where authorized
- field paths
- confidence and evidence strength
- projection exclusions and reasons
- deterministic document hash

Identical inputs and versions must produce identical documents and hashes.

### 3. Structured Concept Index

Index common factual dimensions directly:

- subject identity and role
- pose and action
- anatomy
- clothing and accessories
- objects
- environment
- color and lighting
- counts
- relationships
- effects
- composition

Explicit structured constraints take precedence over semantic similarity.

### 4. Lexical Index

Index normalized controlled-vocabulary terms and supported aliases.

The lexical layer must preserve:

- exact term provenance
- subject role
- concept category
- count values
- evidence references
- normalized synonyms

Unrecognized query terms remain visible. They are not silently dropped.

### 5. Semantic Embeddings

Embeddings operate on deterministic subject, scene, and style documents.

They must not embed:

- raw graph JSON as one document
- compatibility prose as source truth
- card mechanics
- unsupported lore or story
- private reviewer notes
- query history

Before embedding generation:

- select and record the provider/model
- record dimensions and distance metric
- freeze the exact document population
- project token and monetary cost
- set a hard run-cost ceiling
- prove resumability and idempotency
- verify target database vector capability
- define retention and rollback

Embedding generation is not authorized by this checkpoint.

### 6. Query Compiler

Compile collector text into deterministic intent:

```text
canonical filters
+ visual concepts
+ subject roles
+ counts
+ relationships
+ negative filters
+ aliases
+ unrecognized terms
```

The compiler may normalize known vocabulary. It may not invent unsupported
facts or silently relax strict constraints.

### 7. Hybrid Retrieval

Build candidates from:

- canonical filters
- structured concept matches
- lexical matches
- semantic-vector similarity

Apply explicit filters before final ranking. A vector match cannot override a
contradictory canonical, role, count, color, or printing constraint.

### 8. Decomposable Ranking

Preserve separate score components for:

- canonical match
- structured visual match
- lexical match
- vector similarity
- evidence confidence
- eligibility tier
- subject role
- artwork duplication
- optional human-review signal

The final score must remain explainable. It cannot exist only as an opaque
vector score.

### 9. Why-Matched Evidence

Every visual result must expose:

- requested query concept
- matched normalized concept
- matched subject role
- fact IDs
- observation IDs
- field paths
- short deterministic evidence summary
- score component
- unmatched query terms

Explanations are built from stored evidence references. They do not call a
model.

### 10. Artwork-First Result Expansion

Return distinct artwork groups before printings.

For each result:

- show one representative printing
- retain public `gv_id` routing
- show legitimate matching printings
- disclose exact versus representative image confidence
- avoid duplicate artwork crowding
- never imply unobserved print markers

### 11. Governed Read Boundary

Private source graphs, raw model payloads, policy diagnostics, reviewer notes,
and vector values remain private.

The app uses one reviewed RPC or service contract returning only:

- public card identity
- artwork grouping
- selected visual concepts
- decomposed product-safe scores
- evidence-backed why-matched summaries
- image confidence
- matching-printing summaries

## Selective Integration Plan

The productization branch starts from current production `main`.

Do not merge all 143 source-branch commits.

Create an import manifest that identifies each source file, source commit,
destination path, content hash, contract, and required test. Import in bounded
lanes:

### Lane A: Contracts And Deterministic Core

- search behavior contract
- index schema contract
- evaluation contract
- eligibility policy
- artwork grouping
- deterministic projection
- controlled vocabulary
- query parser and candidate index
- evidence explanation logic

### Lane B: Evaluation Tooling

- query-suite bootstrap
- judgment packet builder
- calibration evaluator
- failure taxonomy
- reconciliation and artifact hashing

### Lane C: Review Portal

The existing isolated portal stays live while productization proceeds.

Only bring portal code into the main-based branch if it is required for ongoing
calibration or final release evidence. Do not make server-side review writes as
part of this import.

### Lane D: Production Index And API

This lane starts only after the database capability readback and migration
design gate.

Each lane must pass its focused contracts before the next lane begins.

## Implementation Gates

### Gate 0: Start Checkpoint

Complete when:

- the main-based branch exists
- source and production SHAs are recorded
- current corpus and search truths are preserved
- pricing isolation is explicit
- this checkpoint is committed and pushed

### Gate 1: Selective Source Manifest

Produce a deterministic manifest of the exact contracts, implementation files,
tests, and source commits to import.

Acceptance:

- no generated 6 GB evidence bulk-commit
- no broad branch merge
- no pricing file changes
- every imported module has an owner contract and focused tests

### Gate 2: Human Calibration Completion

1. PokeJavi signs in to the existing production review route.
2. Reviewer completes calibration judgments and exports JSONL.
3. Validate reviewer identity, run key, schema, query coverage, and hashes.
4. Do not import automatically.
5. Founder reviews and adjudicates disputes.
6. Run the calibration evaluator offline.

Acceptance:

- all `200` calibration queries have valid adjudicated decisions
- no holdout query has been exposed
- reviewer export reconciles exactly
- initial metric baseline and failure classes are documented

Technical integration may proceed in parallel, but no threshold freeze or
holdout run occurs before this gate.

### Gate 3: Database Capability Readback

Read current production capabilities without mutation:

- PostgreSQL version
- installed extensions
- available vector support
- existing search indexes
- relevant table sizes
- current visual-description schema and grants
- existing RPC naming and pagination conventions

Acceptance:

- capability artifact is complete
- no schema mutation occurred
- final index technology is chosen from evidence

### Gate 4: Migration And Security Design

Create, but do not apply, the exact migration package for:

- immutable index-run ledger
- artwork rows
- printing mappings
- projection documents
- concept evidence
- embedding state
- active-run pointer
- private grants and RLS
- bounded signed-in read RPC
- indexes and rollback

Acceptance:

- clean migration history
- deterministic rollback
- no direct app-role access to private tables
- targeted migration/RLS/RPC tests pass
- migration apply remains separately gated

### Gate 5: Local Immutable Index Build

Build the exact `9,532`-artwork corpus locally:

- materialize printing membership
- rebuild `28,596` deterministic documents
- validate every evidence reference
- build structured and lexical candidate indexes
- reconcile all counts and hashes
- replay to prove idempotency

Acceptance:

- zero duplicate artwork or printing mappings
- zero missing evidence references
- zero document-hash drift
- zero unresolved projection failures
- replay is byte-identical

### Gate 6: Structured And Lexical Baseline

Run the `200` adjudicated calibration queries without embeddings.

Report:

- Recall@10 and Recall@25
- Precision@10
- nDCG@10
- MRR
- valid-zero-result accuracy
- unsupported-match rate
- subject-role confusion
- count violations
- wrong-printing expansion
- explanation validity
- duplicate crowding
- p50, p95, and p99 latency

Acceptance:

- all outputs and score components are preserved
- failure classes map to a specific repair lane
- no weights or queries change during the run

### Gate 7: Embedding Canary

Freeze one embedding configuration and a bounded document sample.

Acceptance:

- exact cost ceiling and stop-before-next-call behavior
- token/cost reconciliation
- no duplicate embeddings
- resumable interruption proof
- no source graph mutation
- semantic improvement measured against the lexical baseline

Only then authorize the full eligible-document embedding build.

### Gate 8: Hybrid Calibration And Threshold Freeze

Evaluate structured, lexical, and vector retrieval together.

Tune only against the `200` calibration queries. Freeze:

- parser version
- corpus version
- index version
- embedding configuration
- ranking weights
- hard release thresholds

Acceptance:

- no unexplained score component
- no threshold is relaxed during a failing run
- high-risk role, printing, alias, and zero-result failures are explicit

### Gate 9: Single Holdout Run

Run the `50` sealed holdout queries once against the frozen candidate.

Acceptance:

- no code, corpus, parser, index, weights, or thresholds change during the run
- all hard thresholds pass
- no critical canonical-filter or printing-expansion defect remains
- complete artifact reconciliation

A failed holdout creates a new candidate version. It is not patched in place.

### Gate 10: Bounded Database Apply And Readback

Apply the reviewed migration package, then load a bounded index subset.

Verify:

- schema
- indexes
- grants
- RLS
- RPC input bounds
- exact source and output counts
- evidence-reference readback
- active-run pointer
- rollback to no active visual index

No app activation occurs until readback passes.

### Gate 11: Signed-In Product Canary

Expose Visual Search V1 to a bounded signed-in cohort.

Required surfaces:

- existing search entry point
- visual-result mode
- evidence-backed why-matched details
- representative artwork result
- matching-printings expansion
- zero-result and unsupported-term states
- deterministic fallback to canonical search

Observe:

- query latency
- parser failures
- zero-result rate
- result clicks
- evidence-detail use
- rollback behavior
- canonical-search regression

### Gate 12: Production Rollout

Public activation requires:

- locked evaluation thresholds passed
- signed-in canary passed
- security and privacy review passed
- query-log retention approved
- rollback proven
- canonical search unaffected
- production checkpoint complete

Taste Engine, Grookai Signature, recommendations, and Cameo Search integration
remain separate gates after Visual Search V1 is operational.

## Required Product States

The collector experience must handle:

- loading
- results
- partial match with unmatched terms
- strict zero result
- unsupported query terms
- visual-search degraded
- canonical-search-only fallback
- no eligible artwork
- representative image disclosure
- multiple matching printings
- evidence detail

The interface must not hide relaxed constraints or imply that semantic
similarity proves a fact.

## Observability

Every production query should be traceable through:

```text
raw query
-> parser version and typed intent
-> canonical filters
-> candidate sources
-> structured matches
-> lexical matches
-> vector matches
-> score components
-> artwork result
-> printing expansion
-> why-matched evidence
-> API response
-> rendered result
```

Required operational dimensions:

- corpus version
- active index run
- parser version
- projection version
- embedding configuration
- latency by stage
- candidate counts by source
- zero-result reason
- degraded/fallback status
- unmatched terms
- result and evidence-reference counts

Query logging must minimize personal data and must not feed private collector
queries into extraction or model training.

## Risks

### Broad-History Integration

The governed source branch contains extraction experiments, generated evidence,
and product review work across 143 commits. A wholesale merge risks unrelated
schema, audit, and application changes.

Mitigation: selective, manifest-driven import from current production `main`.

### Sparse Or Incorrect Source Facts

Structurally valid source graphs may omit visible details or include guarded
uncertainty.

Mitigation: eligibility tiers, projection exclusions, evidence confidence,
retrieval evaluation, and no-result behavior.

### Role Confusion

A physically present character, a character on a poster, and a
character-shaped object are different facts.

Mitigation: role-specific indexing, filters, ranking, explanations, and
evaluation thresholds.

### Duplicate Printing Crowding

Shared artwork can produce many nearly identical printings.

Mitigation: rank artwork groups first and expand to printings afterward.

### Semantic Overreach

Vector similarity may retrieve plausible but unsupported concepts.

Mitigation: explicit filters take precedence, why-matched evidence is required,
and unsupported-match rate is a hard release metric.

### Review Bias

One reviewer may miss visual details or interpret relevance differently.

Mitigation: founder adjudication and two-reviewer handling for difficult role,
alias, count, and printing cases before threshold freeze.

### Latency And Cost

Hybrid search may be too slow or expensive if implemented as brute-force
retrieval or query-time model use.

Mitigation: persistent structured/lexical/vector indexes, no query-time
generative calls, bounded result counts, and measured p95/p99 gates.

## What Must Never Be Broken

- Canonical identity remains authoritative.
- Visual facts remain derived intelligence.
- Search operates on visible evidence, not generated stories.
- Raw observations remain separate from normalized concepts.
- Subject roles remain separate.
- Artwork retrieval precedes printing expansion.
- Shared artwork does not prove printing-specific markers.
- Explicit structured constraints outrank semantic similarity.
- Every visual match remains explainable through existing evidence references.
- Canonical search remains usable if visual search is unavailable.
- Holdout queries remain sealed until thresholds are frozen.
- Energy cards remain excluded until a later governed project.
- Reviewer exports do not become trusted state automatically.
- No Taste Engine or Grookai Signature integration is implied.
- No pricing files or pricing release gates are changed by this project.

## Alternatives Rejected

### Resume Full-Catalog Extraction First

Rejected because the existing 10K+ valid corpus is sufficient to build and
measure the retrieval system. More extraction would delay the product while
leaving search quality unproven.

### Require Human Approval Of Every Graph

Rejected because it would turn product calibration into months of
microapproval. Human effort is better used to judge search outcomes and
high-risk evidence boundaries.

### Merge The Experimental Branch Wholesale

Rejected because it diverges materially from current production and includes
broad extraction history. Selective import provides better provenance and
smaller review units.

### Embed Compatibility Descriptions

Rejected because deterministic projections preserve roles, evidence, and field
boundaries more reliably than prose.

### Vector-Only Search

Rejected because it cannot enforce exact counts, roles, canonical filters,
printing boundaries, or evidence-backed explanations by itself.

### Generative Query-Time Search

Rejected because it increases latency, cost, privacy exposure, and
nondeterminism while weakening the ability to explain and reproduce results.

## Current Truths

- The productization branch is based on current production `main`.
- The pricing branch and canary are untouched.
- The existing visual corpus and search components remain on the governed
  source branch.
- The production review portal remains read-only.
- No new provider calls have been made.
- No database write or migration has been performed.
- No embedding has been generated.
- No visual-search result is exposed to collectors.
- No holdout query has been opened.

## Exact Next Gate

Create the selective source-import manifest.

The manifest must:

1. enumerate exact source commits and files needed for Visual Search V1;
2. map each file to its governing contract and focused tests;
3. separate deterministic core, evaluation tooling, portal support, and
   production-only work;
4. record source and destination hashes;
5. exclude generated bulk evidence and unrelated experimental history;
6. prove that no pricing files are included.

In parallel, PokeJavi may complete the existing read-only calibration packet.
No holdout, migration apply, embedding run, or collector-facing activation is
authorized until its corresponding gate above is satisfied.
