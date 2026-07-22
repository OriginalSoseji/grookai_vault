# Card Visual Search Workstream Pause

Date: 2026-07-21
Status: PAUSED CLEANLY; PRODUCTION REVIEW PORTAL REMAINS LIVE

## Purpose

This checkpoint closes the current card visual extraction and search-calibration workstream so other product work can proceed without losing implementation, evidence, or restart context.

## Git And Release State

- Working branch: `feature/card-visual-search-review-portal`.
- Source state before this pause checkpoint: `b80f8ac16960c40ea0648c9fc23493c8d4b9d6bc`.
- Remote branch at the source state: `origin/feature/card-visual-search-review-portal`.
- Isolated production portal release: `f2e57e476e8d68aa241d2b6a3afbc8480e9d7100`.
- Production route: `https://grookaivault.com/review/visual-search`.
- The broad visual-agent branch was not merged into production `main`.

## Current System Truth

- Card Visual Fact Graph V2 is the governed extraction structure.
- Paid ingestion is stopped. No new OpenAI calls are authorized by this checkpoint.
- The reconciled source corpus contains `11,000` unique non-Energy card-print IDs.
- `10,376` rows have structurally valid Fact Graph candidates and `624` remain explicit source gaps.
- Search eligibility is locked at `9,702` printings grouped into `9,532` artwork identities.
- The current calibration packet contains `200` queries, `0` holdout queries, and `753/753` exact saved visual records with images.
- The production review portal is authenticated, reviewer-authorized, and read-only.
- Reviewer progress remains in browser `localStorage` until the reviewer exports JSONL.
- No portal action can approve descriptions or write database, storage, canonical, embedding, or search-index state.

## Local Evidence Preservation

- Generated audit evidence remains on this workstation under `docs/audits/card_visual_*`.
- The preserved untracked evidence inventory at pause time was approximately `11,265` files and `6,029.78 MB`.
- These local artifacts are preserved as evidence and excluded from normal local Git status; they are not source changes and were not bulk-committed.
- Reviewer guide: `docs/ops/GROOKAI_VISUAL_SEARCH_REVIEWER_GUIDE.pdf`.
- Reviewer guide SHA-256: `F04396ACBB0E0ABA20FF493545FC47576D79D2B06109AD58FC8EB4D005B76DC3`.

## Runtime Pause Proof

- The local Next.js review server on port `3017` was stopped.
- No card visual agent, visual-search portal dev server, or ingestion worker process remained after shutdown.
- No card-visual Windows scheduled task was found.
- Existing unrelated pricing and fallback-image scheduled tasks were observed and intentionally left unchanged.
- Stopping the local server does not affect the deployed production portal.

## Closeout Verification

- Release secret packaging guard: passed.
- Portal and judgment-packet contracts: `10/10` passed.
- Reviewer PDF validation: `3` pages; required portal, reviewer, evidence, read-only, and export instructions present.
- `git diff --check`: passed after declaring PDFs as binary repository content.
- Full repository shipcheck: attempted but stopped at preflight because this worktree does not provide `SUPABASE_DB_URL`; no database-dependent or full-suite pass is claimed.
- The documentation-only closeout commit may use the repository's established `--no-verify` convention after these targeted checks.

## What Must Not Be Broken

- Do not resume bulk extraction merely to improve sample coverage; the current corpus is sufficient for search calibration.
- Do not expose or execute the sealed holdout before calibration judgments and thresholds are frozen.
- Do not convert reviewer JSONL into trusted application state without founder review and deterministic validation.
- Do not add server-side judgment persistence to the portal without a separately approved security and data-write design.
- Do not merge broad visual-agent history into production as part of an unrelated release.
- Keep Energy cards excluded until a later project explicitly reopens that category.
- Preserve the distinction between raw observations, typed facts, canonical visual concepts, and canonical identity metadata.

## Exact Resume Gate

1. Have PokeJavi sign in at the production route with the existing Grookai account.
2. Complete a small browser review smoke and export JSONL.
3. Verify the export's reviewer identity, run key, query coverage, and schema without importing it.
4. Founder-review the work and adjudicate any disputed queries.
5. Run the calibration evaluator offline and freeze thresholds only if the review packet reconciles.
6. Keep the holdout sealed until that threshold-freeze decision.

No database apply, new ingestion batch, embeddings, production semantic-search integration, or holdout evaluation is authorized by this pause checkpoint.
