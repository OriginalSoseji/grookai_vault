# Card Visual Search Evaluation Bootstrap V1

Status: COMPLETE - BOOTSTRAP BASELINE RECORDED; OFFICIAL SEARCH EVALUATION NOT LOCKED

Date: 2026-07-21

## Context

Projection V1.5 provides three clean, deterministic, evidence-backed search documents for each of `9,532` non-Energy artwork groups. The next question is whether those documents can support useful artwork-first retrieval before any database index, embeddings, API, or public search surface is built.

## Problem

The governing `CARD_VISUAL_SEARCH_EVALUATION_V1` contract requires human artwork-first relevance judgments. Source-derived expectations can prove that known evidence survives query parsing, filtering, ranking, explanations, and printing expansion, but they cannot establish precision, unsupported-match rate, or product relevance.

## Risk

Treating source self-retrieval as human gold would overstate search quality. Executing the sealed holdout before judgments and thresholds are frozen would also leak holdout evidence into tuning. A brute-force ranker can reconcile correctly while remaining too slow for a functional search service.

## Decision

Implement and execute `CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_V1` from producing commit:

`c7b39f27d89234ffa4bc89727009ae470dbb7cb3`

The bootstrap freezes exactly `250` candidate queries, assigns `200` calibration queries and `50` sealed holdout queries deterministically, executes only calibration, and labels every expected positive as source-derived candidate evidence rather than human gold.

## Alternatives Rejected

- Call source-derived expectations gold judgments: this cannot measure whether other returned artworks are relevant.
- Execute the holdout immediately: thresholds and judgments are not frozen.
- Add embeddings before measuring the structured baseline: this would obscure projection and ranking defects.
- Continue extraction: the existing corpus is already sufficient to expose search behavior.
- Write an index or database migration during evaluation: this gate is local and read-only.

## Bootstrap Result

- Candidate queries: `250`
- Calibration queries executed: `200`
- Holdout queries executed: `0`
- Positive calibration candidates: `188`
- Valid-zero calibration queries: `12`
- Bootstrap Recall@10: `0.553191489361702`
- Bootstrap Recall@25: `0.622340425531915`
- Bootstrap MRR: `0.396110027130793`
- Valid-zero result accuracy: `1.0`
- Explanation reference validity: `1.0`
- Printing expansion accuracy at the returned expected artwork: `0.622340425531915`
- Recorded failure entries: `142`
- Affected positive queries: `71`
- Reconciliation findings: `0`

The `142` failure entries are two symptoms on each of the same `71` queries:

- `71` `correct_result_missing` entries because the expected source artwork ranked below the top-25 result window.
- `71` `correct_artwork_wrong_printing_expansion` entries because printing expansion could not be checked when that artwork was absent from the returned top 25. This is not evidence of an artwork-group membership defect.

No positive calibration query had zero corpus matches. The weak baseline is primarily a ranking/tie-resolution problem for broad visual-only, anatomy, pose/state, composition, and environment concepts.

Strong self-retrieval families included canonical-subject-plus-visual, subject roles, multi-subject scenes, representation/cameo, printing expansion, and metadata-plus-visual. `12/12` negative queries returned zero results.

## Performance Finding

- Query-local median latency: approximately `4,116 ms`
- Query-local p95 latency: approximately `4,540 ms`
- Query-local maximum latency: approximately `4,936 ms`
- End-to-end artifact completion: approximately `10.4 minutes`

The current bootstrap scans every artwork group for every query. It is an evaluation reference implementation, not an acceptable production retrieval path. Functional search requires an inverted lexical/structured candidate index before API work.

## Deterministic Replay Note

The command host timed out while child Node processes continued. This created two complete local runs from the same producing SHA. No provider or database operation was involved.

Both runs produced identical hashes for:

- `query_suite.jsonl`: `76268725e798fdc8d5d7ec7af4220058d9877605d364493bb77867f7c72a2afc`
- `holdout_judgment_seals.jsonl`: `d02999d18454384e5d9c48fec9e64f5334e43186677df38b0eda693179cda866`
- `evaluation_failures.jsonl`: `42668007732c5cb5cf621271e8bc300ab84dcb724c167ce73784d2c168514e05`

`ranked_outputs.jsonl` differs only in measured latency values. The candidate suite, result semantics, evaluations, and failure classifications are unchanged.

## Current Truths

- Projection V1.5 remains the locked retrieval source.
- The query suite is a deterministic candidate suite, not an approved gold set.
- Structured retrieval safely preserves evidence explanations and valid-zero behavior.
- Broad-query ranking is not good enough to claim search readiness.
- Official Precision@10, nDCG@10, unsupported-match rate, role-confusion rate, and alias-overreach rate remain unmeasured.
- The holdout remains sealed and unexecuted.

## Invariants

- Human relevance authority remains separate from source-derived candidate expectations.
- Results are grouped by artwork identity before printing expansion.
- Every explanation cites existing projected evidence.
- Tier and guard metadata remain available to ranking.
- Holdout expectations remain sealed until the release candidate and thresholds are frozen.

## What Must Never Be Broken

- Never report bootstrap self-retrieval as official search quality.
- Never tune against the sealed holdout.
- Never let duplicate printings crowd artwork-first results.
- Never remove evidence references to simplify ranking.
- Never add embeddings to hide lexical, structured-filter, or projection failures.
- Never resume provider extraction as a substitute for retrieval evaluation.

## Boundaries Proven

No provider calls, database connections or writes, approvals, embeddings, index writes, holdout execution, or public reads occurred.

## Artifacts

Canonical bootstrap artifact:

`docs/audits/card_visual_search_evaluation_bootstrap_v1/2026-07-21T17-35-53-660Z_bootstrap_cdb21c1d49da/`

The artifact manifest verifies seven permanent files. The second same-SHA local replay is retained as execution evidence but is not the canonical baseline directory.

## Tests

- Corpus, eligibility, eligibility-audit, artwork-grouping, grouping-audit, projection, and bootstrap contracts: `63/63` passed.
- Bootstrap-specific contracts: `5/5` passed.
- Syntax/import check: passed.
- `git diff --check`: passed.
- Full repository shipcheck was not run because `SUPABASE_DB_URL` is unavailable; no database-dependent result is claimed.

## Explicit Next Gate

Build a local artwork-first judgment packet and reviewer workflow for the `200` calibration queries while implementing an inverted structured/lexical candidate index with result-semantic equivalence tests. Freeze human relevance judgments and baseline thresholds before executing the sealed `50`-query holdout. Do not create embeddings, write database index tables, expose public search, or resume extraction in this gate.
