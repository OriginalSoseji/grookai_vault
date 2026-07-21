# CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_V1

Status: Active - calibration judgments and metrics only

Date: 2026-07-21

## Purpose

Validate human judgment exports from `CARD_VISUAL_SEARCH_JUDGMENT_PACKET_V1`, reconcile independent reviews, produce an explicit adjudication queue, and calculate official calibration metrics. This contract does not authorize holdout execution or release activation.

## Submission Rules

- The primary reviewer completes all `200` calibration queries.
- A second independent reviewer completes subject-role, multi-subject, object/count, representation/cameo, alias, printing-expansion, and negative/zero-result families.
- Every completed result receives one governed relevance label.
- Source-derived candidates outside the top 10 receive a separate human judgment.
- `valid_zero_result` cannot coexist with a positive result or source-candidate judgment.
- Query-invalid decisions require a note and block official metrics until repaired under suite governance.
- Packet version, judgment version, producing commit, run key, query IDs, result ranks, and artwork-group IDs must reconcile exactly.

## Adjudication

Independent disagreement never resolves by majority or model output. It enters `ADJUDICATION_QUEUE.jsonl` and requires an explicit adjudicator export. Notes do not need to match; query decisions, result labels, source-candidate labels, and failure labels do.

## Metrics

Once all `200` final judgments reconcile, report global and per-family Precision@10, Recall@10, Recall@25, nDCG@10, MRR, zero-result accuracy, unsupported-match rate, role confusion, count violations, canonical-filter violations, printing-expansion errors, explanation validity, duplicate-artwork rate, failure classes, and Tier A/B rank distribution.

## Boundaries

No provider calls, database connections or writes, corpus approvals, embeddings, persistent index writes, holdout exposure or execution, or public search reads.

## Exact Next Gate

Use the reconciled calibration metrics to propose and freeze numeric release thresholds. Only then may one frozen release candidate execute the sealed `50`-query holdout once.
