# CARD_VISUAL_SEARCH_JUDGMENT_PACKET_V1

Status: Active - calibration review workflow only

Date: 2026-07-21

## Purpose

Create a local artwork-first review packet for the `200` calibration queries from the frozen candidate suite. This workflow collects human relevance judgments at the search-result boundary without requiring approval of every source fact graph.

## Rules

- Include calibration queries only. The `50` sealed holdout queries and their expected judgments must not appear.
- Show the top `10` unique artwork groups, representative self-hosted image, canonical printing label, score components, and evidence-backed why-matched terms.
- Show a source-derived candidate outside the top 10 as an unjudged candidate, never as gold truth.
- Accept only the evaluation-contract labels: `highly_relevant`, `relevant`, `acceptable_alternate`, `not_relevant`, and `must_exclude`, plus query-level `valid_zero_result` or `query_invalid` decisions.
- Preserve reviewer key, timestamp, notes, failure labels, producing commit, query-suite version, and source run key.
- Save browser progress locally and export versioned JSONL. The dashboard does not update repository or database state.

## Image Boundary

Image paths come from immutable source artifacts and are converted to Grookai `/api/canon/image` URLs. Packet generation does not fetch remote images. Missing image evidence must be reported rather than substituted.

## Boundaries

No provider calls, database connections or writes, corpus approvals, embeddings, persistent index writes, holdout exposure, or public search reads.

## Exact Next Gate

Collect and adjudicate the calibration judgments, compute official calibration metrics, and freeze numeric release thresholds before one execution of the sealed holdout.
