# Visual Search V1 Reviewer Dependency Stop

Date: 2026-07-29

Status: ENGINEERING READY THROUGH THE HUMAN CALIBRATION BOUNDARY

## Why Work Stops Here

PokeJavi has not completed the calibration list. The remaining release decision
depends on human relevance judgments, not additional schema or prompt work.

No numeric quality threshold should be invented before those judgments exist.
The sealed holdout must not be executed before calibration thresholds and the
release candidate are frozen.

## Completed

### Productization

- Dedicated branch: `feature/visual-search-v1-productization`
- Deterministic search core imported and provenance-checked.
- Calibration evaluator and judgment tooling imported.
- Pricing work remains isolated.

### Immutable Evidence

- Complete external source release:
  `card_visual_search_corpus_release_v1_1_20260721`
- Files: `9,418`
- Bytes: `1,152,590,499`
- Missing files: `0`
- Hash mismatches: `0`

### Deterministic Rebuild

- Source IDs: `11,000`
- Valid Fact Graphs: `10,376`
- Explicit source gaps: `624`
- Search-eligible printings: `9,702`
- Artwork groups: `9,532`
- Search documents: `28,596`
- Evidence entries: `357,413`
- Candidate-index entries: `321,937`
- Projection failures: `0`
- Energy rows eligible: `0`
- Holdout queries: `50`, still sealed and unexecuted

Core semantic artifacts are byte-identical to the locked release. The imported
ranker includes the later negative-evidence hardening, producing eight bounded
match reductions, zero match expansions, zero top-result changes, and unchanged
failure classifications.

### Production Database Discovery

- PostgreSQL: `17.4`
- `pg_trgm 1.6`: installed
- `unaccent 1.1`: installed
- `vector 0.8.0`: installed but unused
- Existing visual descriptions: `1,078`
- Existing visual runs: `12`
- Existing persistent visual-search projection: none
- Existing visual-search RPC: none
- Capability readback transaction: read only

### Persistence Preparation

Prepared but did not apply:

- Migration:
  `supabase/migrations/20260729173000_card_visual_search_persistence_v1.sql`
- Persistence contract:
  `docs/contracts/CARD_VISUAL_SEARCH_PERSISTENCE_V1.md`
- No-write load plan:
  `docs/audits/card_visual_search_load_plan_v1/2026-07-29_projection_bbf20d0f/`

The migration defines private, release-scoped artwork, printing, document,
evidence, candidate-index, release-ledger, and active-pointer tables. It
enforces immutability after validation and grants no `anon` or `authenticated`
access. It inserts no data and creates no active pointer.

The planned load is:

- Releases: `1`
- Artworks: `9,532`
- Printings: `9,702`
- Documents: `28,596`
- Evidence: `357,413`
- Index entries: `321,937`
- Active release pointers: `0`

### Verification

- Final tested implementation SHA: `0a67b26ce888c2bd37dd103df175864fd1be1357`
- Visual-search contracts: `101/101` passing
- Syntax/import checks: passing
- `git diff --check`: passing
- Production capability workflow:
  [GitHub Actions run 30469205941](https://github.com/OriginalSoseji/grookai_vault/actions/runs/30469205941)
- Runtime Protection:
  [GitHub Actions run 30470361755](https://github.com/OriginalSoseji/grookai_vault/actions/runs/30470361755)

The local managed shipcheck could not connect to production PostgreSQL on port
5432. The governed CI drift gate and capability audit both succeeded using the
repository secret. Runtime Protection also passed from a shallow checkout after
the Lane A provenance test was corrected to use the immutable manifest and
reconciliation hashes instead of requiring historical Git objects. This is an
environment routing limitation, not a migration apply result.

## Current Invariants

- No provider call occurred during productization.
- No production database write occurred.
- The persistence migration is unapplied.
- The projection corpus is not loaded into production.
- No release pointer exists.
- No visual-search RPC is available to users.
- No generated description was approved.
- No embedding was generated.
- No holdout query was executed.
- No public search was activated.
- No pricing code or data changed.

## Human Dependency

The official calibration requires:

1. A primary reviewer completing all `200` calibration queries.
2. A second independent reviewer completing:
   - subject-role;
   - multi-subject;
   - object/count;
   - representation/cameo;
   - alias;
   - printing-expansion;
   - negative/zero-result families.
3. Explicit adjudication of every disagreement.
4. Exact packet/run/query/result/artwork provenance reconciliation.

PokeJavi's partial work must remain a partial submission. Missing judgments
must not be defaulted, inferred, or treated as negative labels.

## Exact Resume Sequence

1. Export PokeJavi's raw reviewer submission unchanged.
2. Hash and archive the raw submission.
3. Run the judgment validator against the exact packet provenance.
4. Report missing or invalid queries without filling them automatically.
5. Obtain the remaining primary judgments.
6. Obtain the required second-reviewer judgments.
7. Produce and complete the adjudication queue.
8. Run the calibration evaluator only after all `200` final judgments reconcile.
9. Review global and per-family Precision@10, Recall@10, Recall@25, nDCG@10,
   MRR, zero-result accuracy, unsupported-match rate, role confusion, count
   violations, canonical-filter violations, printing-expansion errors,
   explanation validity, duplicate-artwork rate, and Tier A/B distribution.
10. Propose numeric release thresholds from the observed calibration results.
11. Freeze the ranker, parser, projection, thresholds, and release commit.
12. Execute the sealed `50`-query holdout exactly once.
13. If holdout passes, authorize a separate migration-apply gate.
14. Apply the persistence migration and read back schema, grants, RLS, triggers,
    functions, and the absence of an active pointer.
15. Load one staged release in bounded chunks.
16. Reconcile every target count, foreign key, source hash, and duplicate count.
17. Validate service-only candidate and hydration RPCs while the active pointer
    remains absent; both must expose zero active search results.
18. Mark the release `validated`.
19. Authorize and execute a separate active-pointer canary.
20. Build the authenticated product API around the governed JavaScript
    parser/ranker and service-only RPCs.
21. Verify result explanations, printing expansion, latency, rollback, and
    observability before signed-in rollout.
22. Treat embeddings, public/anonymous access, Taste Engine, Grookai Signature,
    cameos as a product surface, and full-catalog ingestion as later gates.

## What Must Never Be Broken

- Canonical identity remains separate from derived visual intelligence.
- Raw observations remain the evidence backbone.
- Scene subjects, depicted subjects, and character representations remain
  distinct.
- A shared artwork graph never authorizes inherited print-marker evidence.
- Unsupported facts remain abstentions or review-routed.
- Human calibration cannot be replaced by source-derived candidate labels.
- Holdout results cannot tune the frozen candidate.
- Migration apply, corpus load, release validation, and release activation
  remain separate gates.
- Public access is never implied by table existence.
- Structured/lexical search remains functional without embeddings.
