# CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_V1

Status: Active - candidate suite and offline self-retrieval baseline only

Date: 2026-07-21

## Purpose

Bootstrap the governed `CARD_VISUAL_SEARCH_EVALUATION_V1` process without mislabeling source-derived expectations as human gold judgments.

## Scope

- Build exactly `250` deterministic candidate queries across every required family.
- Assign `200` calibration and `50` holdout queries deterministically.
- Preserve only checksummed expectation seals for holdout queries.
- Run the structured and lexical baseline over calibration queries only.
- Produce artwork-group-first results, printing expansion, decomposed scores, evidence explanations, latency, failures, and hashes.

## Authority Boundary

Calibration positives are source-derived self-retrieval candidates. They prove that known evidence can flow through projection, filtering, ranking, explanation, and printing expansion. They do not prove that every other returned result is relevant.

This gate cannot report official Precision@10, nDCG@10, unsupported-match rate, semantic false-positive rate, or release eligibility. Those require human artwork-first judgments under `CARD_VISUAL_SEARCH_EVALUATION_V1`.

Holdout results must not be executed during bootstrap. Thresholds must not be tuned against holdout.

## Query Families

The candidate suite totals exactly `250` queries across canonical-plus-visual, visual-only, subject roles, multi-subject, anatomy, human appearance, pose/action/state, environment, objects/counts, color/light, composition/style, effects, representation/cameo, alias, metadata-plus-visual, printing expansion, and negative/zero-result families.

## Boundaries

No provider calls, database connections or writes, approvals, embeddings, index writes, holdout execution, or public reads.

## Exact Next Gate

Review and freeze the candidate suite, collect human gold judgments, lock baseline thresholds, and only then run the sealed 50-query holdout against a frozen release candidate.
