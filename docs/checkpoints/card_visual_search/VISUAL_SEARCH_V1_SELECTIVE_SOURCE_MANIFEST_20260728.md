# Visual Search V1 Selective Source Manifest

Date: 2026-07-28

Status: COMPLETE; SOURCE IMPORT FROZEN; NO SOURCE FILES IMPORTED YET

## Purpose

This checkpoint completes the first implementation gate defined by
`VISUAL_SEARCH_V1_PRODUCTIZATION_START_20260728.md`.

It identifies the exact governed visual-search files that may move from the
experimental source branch into the production-based productization branch.
The manifest prevents a wholesale 143-commit merge and preserves file-level
source provenance.

## Git Provenance

- Productization branch: `feature/visual-search-v1-productization`
- Production baseline SHA: `3c862b815735a4eda93b65ac108fc583f1c62fc9`
- Governed source branch: `feature/card-visual-search-review-portal`
- Governed source SHA: `c5bbbba5dea998fcd51d0d8602601737356a1494`
- Existing portal release SHA:
  `f2e57e476e8d68aa241d2b6a3afbc8480e9d7100`
- Manifest version: `CARD_VISUAL_SEARCH_SOURCE_IMPORT_MANIFEST_V1`
- Manifest payload SHA-256:
  `6f5faca2a88e12ab4c2a0ca375b5b8ecdd021a6171b5937821dd0974c26bc5dd`

## Permanent Artifacts

- Generator:
  `scripts/audits/card_visual_search_source_import_manifest_v1.mjs`
- Manifest:
  `docs/manifests/card_visual_search_v1_selective_source_import_manifest.json`
- Contract test:
  `tests/contracts/card_visual_search_source_import_manifest_v1.test.mjs`
- Checkpoint:
  `docs/checkpoints/card_visual_search/VISUAL_SEARCH_V1_SELECTIVE_SOURCE_MANIFEST_20260728.md`

## Manifest Result

- Components: `12`
- Selected source files: `61`
- Duplicate source paths: `0`
- Pricing source files: `0`
- Generated audit source files: `0`
- Planned production rebuilds: `5`

Decision counts:

| Decision | Files |
| --- | ---: |
| `import_now` | 35 |
| `import_later` | 8 |
| `reference_only` | 6 |
| `exclude_superseded` | 10 |
| `exclude_generated` | 2 |

## Lane A: Import Now

Exactly `35` files are authorized for the next import gate.

### Governing Contracts

The active evidence, vocabulary, corpus, search behavior, index-schema, and
evaluation contracts establish the boundaries before implementation moves.

### Corpus Inventory

The deterministic corpus inventory reconciles:

- exact source card-print IDs
- valid source graph population
- explicit gaps
- source hashes
- branch and Energy exclusions

### Search Eligibility

The active V1.4 eligibility policy preserves:

- Tier A normal search eligibility
- Tier B projection guards
- Tier C exclusion
- explicit policy reasons
- unknown-rule rejection

Historical eligibility V1 through V1.3 contracts are not active imports.

### Artwork Grouping

The active V1.1 grouping implementation preserves:

- artwork-first retrieval
- exact-image shared groups
- same-name/different-image separation
- canonical printing membership
- no print-marker inheritance

Artwork Grouping V1 remains historical and is excluded.

### Deterministic Projection

The active V1.5 projection implementation preserves:

- subject documents
- scene documents
- style and composition documents
- evidence references
- deterministic hashes
- projection exclusions
- card-UI and mechanics separation

Projection V1 through V1.4 contracts remain historical and are excluded.

### Query And Candidate Core

The proven local-lab and evaluation-bootstrap modules provide:

- deterministic query parsing
- normalized visual concepts
- subject-role parsing
- count constraints
- evidence-backed alias handling
- structured and lexical candidate postings
- decomposable offline ranking
- why-matched evidence
- strict unknown-term behavior

These components are imported as an offline deterministic core. Their existing
loopback server and HTML remain development tools, not production service or
collector UI authorization.

## Lane B: Import Later

Exactly `8` source files are deferred until Lane A is imported and validated.

### Calibration Evaluator

The evaluator validates reviewer exports, calculates global and per-family
metrics, preserves failure labels, and supports founder adjudication.

### Judgment Packet

The packet builder connects ranked results to exact images and full saved
visual records. It remains read-only and does not make reviewer output trusted
application state.

This lane can be imported before PokeJavi finishes reviewing, but official
calibration metrics cannot be finalized until the review export reconciles.

## Lane C: Reference Only

Exactly `6` files are preserved as provenance and implementation reference.

### Review Portal Source

The current authenticated review portal is already deployed through an
isolated production release. Its route, bundle builder, contract, and focused
test are references for ongoing calibration.

They are not automatically imported because:

- the deployed portal is already functional;
- it is not the collector-facing search interface;
- productization must not introduce server-side review writes;
- its generated private bundle belongs to the existing review release.

### Pause Checkpoint

The source workstream pause checkpoint preserves the exact 11K corpus,
9,532-artwork search layer, portal provenance, evidence preservation, and
restart conditions.

## Explicit Exclusions

### Superseded Contracts

Ten historical contracts are recorded and excluded:

- Search Eligibility V1 through V1.3
- Artwork Grouping V1
- Search Projection V1 through V1.4

They remain accessible on the governed source branch. They must not appear as
active productization contracts.

### Generated Portal Artifacts

The following are release artifacts, not product source:

- compressed calibration dashboard bundle
- private portal bundle manifest

They remain with the isolated review-portal release.

### Bulk Generated Evidence

No `docs/audits/card_visual_*` bulk evidence is part of source import.

The approximately 6 GB local evidence corpus requires a separate immutable
corpus-release and reconciliation process. It must not be bulk-committed.

### Extraction Runtime

The paid image-extraction worker is not imported. Ingestion remains stopped.

### Pricing

No pricing path appears in the selected source files. Pricing canary and
release management remain untouched.

## Production Components That Must Be Rebuilt

Five components are intentionally not copied from the experimental branch:

1. Production index migration
2. Governed visual-search RPC
3. Collector visual-search service
4. Collector search UI
5. Embedding build pipeline

Reasons:

- the local lab is not a production service boundary;
- the reviewer portal is not the collector product;
- the target database capability has not been read back;
- the final RLS/grant/RPC package does not exist;
- embedding provider, model, dimensions, cost, resume behavior, and target
  vector capability are not frozen.

## Per-File Provenance

Every selected source file records:

- source path
- destination path
- source Git blob OID
- source content SHA-256
- last source commit that modified the file
- component
- lane
- decision
- governing contracts
- focused tests

This permits exact source readback before and after each import lane.

## Validation

The focused contract proves:

- source and production SHAs are pinned;
- the manifest payload hash is reproducible;
- all 61 paths are unique;
- every file has a blob OID, SHA-256, and source commit;
- every component has governing contracts and focused tests;
- Lane A contains the complete deterministic search backbone;
- no `import_now` file is pricing, migration, generated-audit, or extraction
  runtime content;
- generated portal artifacts and superseded contracts are excluded;
- production persistence, service, UI, and embeddings remain rebuild gates;
- all no-write and no-activation boundaries remain false.

Result:

- Syntax check: passed
- Manifest generation: passed
- Manifest contracts: `8/8` passed

## Current Truths

- The productization branch still contains no imported source implementation.
- The frozen manifest is the only authority for the next import.
- No database connection or write occurred.
- No migration was created or applied.
- No provider call occurred.
- No embedding was generated.
- No production visual-search index was created.
- No collector-facing search was activated.
- No holdout query was exposed.
- No pricing file changed.
- The existing production review portal remains unchanged.

## What Must Not Be Broken

- Do not import any unlisted source file during Lane A.
- Do not alter imported content while claiming source-hash equivalence.
- If a production adaptation is necessary, import the exact source first and
  make the adaptation in a separately reviewable commit.
- Do not import generated bulk evidence through Git.
- Do not merge the source branch wholesale.
- Do not run the holdout.
- Do not create embeddings.
- Do not write the database.
- Do not add a collector-facing route in Lane A.
- Do not change pricing.

## Exact Next Gate

Import the exact `35` Lane A files from source SHA
`c5bbbba5dea998fcd51d0d8602601737356a1494`.

Required sequence:

1. Freeze an import plan from the manifest.
2. Read every source blob from the recorded source SHA.
3. Verify every source SHA-256 before writing.
4. Write only the 35 `import_now` destination paths.
5. Verify destination SHA-256 equals the manifest for every file.
6. Run all Lane A focused contract tests.
7. Run syntax/import checks for every imported module.
8. Run `git diff --check`.
9. Produce an import reconciliation artifact with zero missing, extra, or
   mismatched files.
10. Commit Lane A separately.

Stop after Lane A import and reconciliation. Do not import Lane B, write a
migration, generate embeddings, or activate search in the same gate.
