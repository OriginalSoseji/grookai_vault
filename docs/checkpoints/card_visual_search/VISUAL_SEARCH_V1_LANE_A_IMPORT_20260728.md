# Visual Search V1 Lane A Import

Date: 2026-07-28

Status: COMPLETE; DETERMINISTIC CORE IMPORTED AND RECONCILED

## Purpose

This checkpoint records the exact transfer of the proven Visual Search V1
deterministic core from the governed experimental branch into the
production-based productization branch.

No source implementation was rewritten during transfer. Every destination file
matches its frozen source SHA-256.

## Git Provenance

- Productization branch: `feature/visual-search-v1-productization`
- Pre-import productization SHA:
  `a911c260a1b333c3528edfb78b879138023d820a`
- Governed source branch: `feature/card-visual-search-review-portal`
- Governed source SHA:
  `c5bbbba5dea998fcd51d0d8602601737356a1494`
- Manifest version: `CARD_VISUAL_SEARCH_SOURCE_IMPORT_MANIFEST_V1_1`
- Manifest payload SHA-256:
  `7bd6f0c7d1f2826c981dde5431d2b9850adea264d6a51d9e24232558fe17658f`
- Import version: `CARD_VISUAL_SEARCH_LANE_A_IMPORT_V1`

## Frozen Import Plan

- Planned files: `38`
- Plan payload SHA-256:
  `57412fafc3285c145fd7e5f4af42e1dd5154e445fde5d7c41175ba6c9b7b87f0`
- Plan artifact:
  `docs/audits/card_visual_search_lane_a_import/2026-07-28_lane_a_import_a911c260/import_plan.json`

The plan was written before the corrected 38-file transfer.

The plan preserved:

- exact source blobs only
- no manual edits during import
- no database writes
- no migration apply
- no provider calls
- no embeddings
- no public activation
- no Lane B import
- no pricing changes

## Import Reconciliation

- Planned files: `38`
- Written files: `38`
- Matching destination hashes: `38`
- Missing files: `0`
- Extra imported files: `0`
- Hash mismatches: `0`
- Status: `reconciled`
- Reconciliation payload SHA-256:
  `eab91b5bf6793a92827b3319ae481769ea6cd3a7f469f356c71134c64c259884`
- Reconciliation artifact:
  `docs/audits/card_visual_search_lane_a_import/2026-07-28_lane_a_import_a911c260/import_reconciliation.json`

Imported path counts:

| Top-Level Path | Files |
| --- | ---: |
| `backend` | 10 |
| `docs` | 12 |
| `scripts` | 7 |
| `tests` | 9 |

The backend count includes nine JavaScript modules and one local-lab HTML
development surface.

## Imported Components

### Governing Contracts

The active contracts now exist on the production-based branch for:

- Fact Graph V2 evidence
- controlled vocabulary
- immutable corpus
- visual search behavior
- index schema
- evaluation
- eligibility V1.4
- artwork grouping V1.1
- projection V1.5
- evaluation bootstrap
- local search lab
- judgment packet

Superseded contract revisions were not imported.

### Corpus Inventory

The branch now contains the deterministic inventory logic and contracts needed
to reconcile the 11,000-row non-Energy source population.

Bulk generated corpus evidence was not copied.

### Search Eligibility

The active eligibility implementation and audit preserve the locked Tier A,
guarded Tier B, and Tier C behavior.

### Artwork Grouping

The active grouping implementation and audit preserve artwork-first identity,
shared-image groups, printing membership, and conflict handling.

### Deterministic Projection

The active projection produces subject, scene, and style/composition documents
with evidence references and deterministic hashes.

### Query And Candidate Core

The imported core includes:

- deterministic query parser
- subject-role parsing
- count constraints
- controlled query aliases
- structured and lexical postings
- in-memory candidate index
- artwork-first ranking
- canonical printing expansion
- why-matched evidence
- strict unknown-term behavior
- local loopback search lab

### Judgment Packet Dependency

The local lab imports the judgment packet's governed image resolver. The
backend module, active contract, and focused test are therefore included in
Lane A.

The judgment-packet command wrapper remains Lane B.

## Initial Dependency Finding

The original manifest classified all judgment-packet files as Lane B.

The initial 35-file transfer:

- reconciled `35/35` hashes;
- passed `73/74` focused tests;
- failed the local-lab suite at module import because
  `card_visual_search_judgment_packet_v1.mjs` was absent.

This was a manifest dependency defect, not a source-code defect.

The repair:

1. preserved the failed test result;
2. changed the manifest version to V1.1;
3. moved the backend module, contract, and focused test to Lane A;
4. left the command wrapper in Lane B;
5. froze a new 38-file plan;
6. reapplied exact source blobs;
7. reconciled `38/38`;
8. reran the complete suite.

No imported source file was edited to work around the dependency.

## Verification

### Syntax

- Lane A JavaScript syntax checks: `25/25` passed

This count includes backend modules, command wrappers, and imported focused
tests.

### Backend Imports

- Backend module import checks: `9/9` passed

This proves the production-based branch contains every direct JavaScript module
dependency required by the imported backend core.

### Focused Contracts

- Tests: `89`
- Passed: `89`
- Failed: `0`
- Skipped: `0`

The suite covers:

- corpus inventory
- eligibility
- eligibility audit
- artwork grouping
- grouping audit
- projection
- evaluation bootstrap
- judgment packet
- local search lab
- selective source manifest
- import plan and reconciliation
- permanent artifact hashes

### Diff

- `git diff --check`: passed

The full repository shipcheck was not run because this fresh worktree does not
have the repository dependency installation required by preflight. No full
suite pass is claimed.

## What This Gate Proves

- The deterministic search core can be moved onto current production history
  without a broad source-branch merge.
- Source content remains byte-equivalent.
- Direct module dependencies are complete.
- The imported tests pass on the production-based branch.
- The core has no provider, database-write, embedding, holdout-execution, or
  persistent-index path.
- The pricing workstream remains isolated.

## What This Gate Does Not Prove

- The 6 GB local source corpus has not been transferred or released.
- The complete 9,532-artwork index has not been rebuilt in this worktree.
- PokeJavi calibration judgments have not been imported or scored.
- The 50-query holdout remains sealed.
- No target database capability readback has occurred.
- No search migration exists.
- No visual-search RPC exists.
- No embeddings exist.
- No collector-facing visual search exists.
- No public release is authorized.

## Current Truths

- The productization branch contains the exact deterministic Lane A core.
- The source manifest and import reconciliation are permanent artifacts.
- Lane B remains deferred.
- The existing production reviewer portal is unchanged.
- No database connection or mutation occurred.
- No provider call or model cost occurred.
- No embedding was generated.
- No holdout query was opened.
- No pricing file changed.

## What Must Not Be Broken

- Do not modify Lane A source content while claiming source equivalence.
- Production adaptations must be separate commits with focused regression
  tests.
- Do not merge the broad source branch.
- Do not commit bulk generated evidence.
- Do not expose the holdout.
- Do not turn the loopback lab into a production endpoint.
- Do not treat reviewer JSONL as trusted application state.
- Do not create embeddings or database structures without their separate
  gates.
- Do not change pricing.

## Exact Next Gate

Import the exact five Lane B calibration-tooling files from Manifest V1.1:

- calibration evaluator backend
- calibration evaluator command wrapper
- calibration evaluator focused test
- calibration evaluator active contract
- judgment-packet command wrapper

Required proof:

1. Freeze a five-file plan before transfer.
2. Verify source SHA-256 for every file.
3. Write only the five Lane B destinations.
4. Verify all five destination hashes.
5. Run Lane A plus Lane B focused contracts.
6. Confirm the evaluator can validate a fixture reviewer export without
   exposing the holdout.
7. Produce exact reconciliation and a new checkpoint.

Stop before corpus evidence transfer, official calibration scoring, database
capability readback, migration design, embeddings, or production search.
