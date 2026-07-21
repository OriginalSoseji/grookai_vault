# Card Visual Search Indexed Calibration Gate

Status: COMPLETE - INDEXED BASELINE AND CALIBRATION WORKFLOW READY; HUMAN JUDGMENTS PENDING

Date: 2026-07-21

## Context

The source-derived bootstrap baseline proved safe zero-result behavior and evidence explanations but used a full `9,532`-artwork scan for every query. It also could not produce official relevance metrics without human artwork-first judgments.

## Problem

The brute-force baseline had approximately `4.1s` median query latency and took approximately `10.4 minutes` to execute `200` calibration queries. The system also lacked a practical way to label top results in batches without microapproving the entire fact corpus.

## Risk

Optimizing retrieval could silently change rankings or evidence. A review tool could expose the sealed holdout, preapprove source-derived expectations, lose reviewer provenance, or substitute missing images. Any of those failures would invalidate the evaluation gate.

## Decision

Add a read-only in-memory candidate index at producing commit:

`d628e416a71f3d715f40acbaf705bc46af913e57`

The index uses canonical-subject, set, subject-role, exact-term, and token postings to narrow candidate artwork groups. Indexed candidates still pass the original strict evidence matcher.

Add the local calibration judgment workflow at producing commit:

`c9fbbc752210999175372db4c87f6b9f438f065b`

The workflow shows top-10 unique artwork results, representative images, score components, evidence terms, source candidates outside the result window, review labels, failure classes, notes, and local JSONL export. It includes calibration only.

## Alternatives Rejected

- Keep brute-force retrieval for the product: measured latency is not viable.
- Change ranking while optimizing candidate generation: performance and relevance changes must remain separable.
- Use source-derived expectations as automatic gold: this would bias and invalidate relevance evaluation.
- Ask for card-by-card corpus approval: evaluation needs result judgments, not microapproval of `9,532` graphs.
- Read current database image state: this gate remains artifact-only and reproducible.

## Indexed Replay Result

- Artwork groups indexed: `9,532`
- Evidence entries indexed: `321,937`
- Exact normalized terms: `179,296`
- Search tokens: `9,230`
- Candidate-index build time: approximately `1,548 ms`
- Median candidate groups scanned: `15`
- p95 candidate groups scanned: `3,335`
- Maximum candidate groups scanned: `8,008`
- Median query latency: approximately `1.53 ms`
- p95 query latency: approximately `110.85 ms`
- p99 query latency: approximately `184.26 ms`
- Maximum query latency: approximately `197.40 ms`
- End-to-end run time: `19.1s`

The indexed replay preserved all `200/200` ranked-output semantics after removing only latency and candidate-scan telemetry. The candidate query suite and failure file remained byte-identical. Bootstrap relevance metrics therefore remain unchanged by the speedup.

## Calibration Packet Result

- Calibration queries: `200`
- Holdout queries exposed: `0`
- Top-result slots: `1,195`
- Unique representative images required: `752`
- Images resolved: `752`
- Missing inventory IDs: `0`
- Unreadable source artifacts: `0`
- Precompleted judgments: `0`
- Judgment-template query IDs: `200/200` unique
- Artifact hash mismatches: `0`
- Official gold status: `awaiting_human_judgments`

Warehouse image paths use Grookai `/api/canon/image`. Eleven legacy source rows with allowlisted TCGdex or Pokemon TCG image URLs use Grookai's own `/_next/image` proxy. Arbitrary remote hosts are rejected.

## Current Truths

- The corpus, eligibility policy, artwork grouping, and Projection V1.5 remain locked.
- Indexed candidate generation is semantically equivalent to the brute-force reference for the fixed calibration suite.
- Query execution latency is suitable for local product prototyping.
- Relevance quality is not locked: source self-retrieval remains `55.32%` at 10 and `62.23%` at 25.
- Official Precision@10, nDCG@10, unsupported-match rate, role-confusion rate, and alias-overreach rate still require human labels.
- The sealed `50`-query holdout remains unexecuted and absent from the review packet.

## Invariants

- Candidate indexing may narrow work but may not relax final evidence matching.
- Search results remain unique artwork groups before printing expansion.
- Every why-matched entry retains observation references.
- Source-derived candidates begin unjudged.
- Reviewer exports retain reviewer key, source commit, run key, query ID, result rank, decision, and notes.
- Browser review state never updates repository or database state.

## What Must Never Be Broken

- Never expose holdout expectations in calibration tooling.
- Never auto-label a source-derived candidate as relevant.
- Never count a missing expected result as a printing-group defect when expansion was not evaluated.
- Never merge performance optimization with ranking-weight tuning in one unmeasured change.
- Never create embeddings or public search before calibration judgments and thresholds are frozen.
- Never resume provider extraction to improve retrieval metrics.

## Boundaries Proven

No provider calls, database connections or writes, corpus approvals, embeddings, persistent index writes, holdout execution, or public search reads occurred.

## Artifacts

Indexed bootstrap replay:

`docs/audits/card_visual_search_evaluation_bootstrap_v1/2026-07-21T17-51-47-805Z_bootstrap_4548a65b9be3/`

Reconciled calibration packet:

`docs/audits/card_visual_search_judgment_packet_v1/2026-07-21T18-02-26-067Z_packet_f4d102548641/`

Review dashboard:

`docs/audits/card_visual_search_judgment_packet_v1/2026-07-21T18-02-26-067Z_packet_f4d102548641/CALIBRATION_REVIEW_DASHBOARD.html`

The earlier packet with `11` unresolved legacy URLs is retained as failed inspection evidence and is not the active review packet.

## Tests

- Corpus, eligibility, eligibility-audit, artwork-grouping, grouping-audit, projection, bootstrap, and judgment-packet contracts after the legacy image-source repair: `69/69` passed.
- Syntax/import checks: passed.
- Embedded dashboard script parse check: passed.
- `git diff --check`: passed.
- Full repository shipcheck was not run because `SUPABASE_DB_URL` is unavailable; no database-dependent result is claimed.

## Explicit Next Gate

Complete and export the `200` calibration query judgments from the local dashboard. Adjudicate difficult role, alias, count, representation, and printing cases; compute official calibration metrics by family; propose and freeze numeric release thresholds; then execute the sealed `50`-query holdout exactly once against a frozen ranking candidate. Do not create embeddings, database index tables, or public search before that gate.
