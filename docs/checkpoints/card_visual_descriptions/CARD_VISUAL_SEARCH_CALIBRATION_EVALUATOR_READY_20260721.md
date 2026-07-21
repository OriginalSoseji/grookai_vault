# Card Visual Search Calibration Evaluator Ready

Status: COMPLETE - HUMAN-JUDGMENT IMPORT READY; OFFICIAL METRICS NOT RUN

Date: 2026-07-21

## Context

The indexed baseline and local dashboard made the fixed `200`-query calibration set reviewable without approving individual source graphs. The remaining operational gap was converting browser exports into governed gold judgments and official metrics without manual file surgery.

## Problem

An incomplete, stale, single-reviewer, or provenance-mismatched export must never produce official metrics. High-risk subject-role, multi-subject, count, representation, alias, printing, and zero-result decisions need independent review, and reviewer disagreement needs explicit adjudication.

## Decision

Implement `CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_V1` at producing commit:

`b04ee1e9a06a03f2d2af2054c25bc37ef5e24db5`

The evaluator validates exact packet version, judgment version, producing commit, run key, query IDs, artwork-group IDs, ranks, labels, reviewer identity, completion timestamps, failure labels, source-candidate judgments, and valid-zero consistency.

## Review Governance

- One primary reviewer completes all `200` calibration queries.
- A second independent reviewer completes the seven difficult families.
- Matching independent decisions reconcile automatically.
- Disagreements enter `ADJUDICATION_QUEUE.jsonl`.
- An explicit adjudicator export resolves disagreements.
- `query_invalid`, incomplete labels, duplicate IDs, stale provenance, reused reviewer keys, missing second review, or unadjudicated disagreement blocks official metrics.

## Metrics Ready

When all final judgments reconcile, the evaluator reports globally and by family:

- Precision@10
- Recall@10 and Recall@25
- nDCG@10
- Mean Reciprocal Rank
- valid-zero result accuracy
- unsupported-match rate
- subject-role confusion rate
- count-constraint violation rate
- canonical-filter violation rate
- wrong-printing-expansion rate
- explanation validity
- duplicate artwork rate
- failure classes
- Tier A/B distribution by rank

## Readiness Proof

- Packet run key: `f4d10254864199039bc28d77336bbd777497c324dd0c103754d4a6e102eb0908`
- Calibration queries: `200`
- Holdout queries exposed: `0`
- Top-result slots: `1,195`
- Images resolved: `752/752`
- Imported submissions: `0`
- Ready for judgment import: `true`
- Official metrics: `not_run_awaiting_human_judgments`
- Artifact hash mismatches: `0`

This is intentionally a readiness result. No labels were inferred or preapproved.

## Commands

Primary review validation:

```powershell
npm run card-visual:search-calibration-evaluator -- --judgments="C:\path\primary-review.jsonl"
```

Independent review reconciliation:

```powershell
npm run card-visual:search-calibration-evaluator -- --judgments="C:\path\primary-review.jsonl,C:\path\secondary-review.jsonl"
```

Adjudicated evaluation:

```powershell
npm run card-visual:search-calibration-evaluator -- --judgments="C:\path\primary-review.jsonl,C:\path\secondary-review.jsonl" --adjudication="C:\path\adjudication.jsonl"
```

## Current Truths

- Search execution is fast enough for local product prototyping.
- Search relevance is not yet officially measured.
- The calibration dashboard is the active human input surface.
- The evaluator is ready to reject incomplete or inconsistent exports.
- The sealed holdout remains unexposed and unexecuted.

## Invariants

- Human judgments, not source expectations or model output, authorize gold relevance.
- Difficult families require two independent reviewer keys.
- Disagreement blocks metrics until adjudicated.
- Metric results retain packet, judgment, query-suite, commit, and run provenance.
- No calibration failure can be hidden by removing a query.

## Boundaries Proven

No provider calls, database connections or writes, corpus approvals, embeddings, persistent index writes, holdout exposure or execution, or public search reads occurred.

## Artifacts

Readiness proof:

`docs/audits/card_visual_search_calibration_evaluator_v1/2026-07-21T18-16-17-776Z_readiness_6eed94c35487/`

Review dashboard:

`docs/audits/card_visual_search_judgment_packet_v1/2026-07-21T18-02-26-067Z_packet_f4d102548641/CALIBRATION_REVIEW_DASHBOARD.html`

## Tests

- Full relevant visual-search contract chain: `75/75` passed.
- Syntax/import checks: passed.
- `git diff --check`: passed.
- Readiness artifact hashes: `3/3` verified.
- Full repository shipcheck was not run because `SUPABASE_DB_URL` is unavailable; no database-dependent result is claimed.

## Explicit Next Gate

Complete and export the primary dashboard review, then complete an independent review of the seven difficult families. Run the evaluator, adjudicate any generated disagreement queue, compute official calibration metrics, and freeze release thresholds. Do not execute the sealed holdout, create embeddings, write search tables, or expose public search before those thresholds are locked.
