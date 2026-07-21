# Card Visual Search Negation Repair Calibration Packet

Status: COMPLETE - CORRECTED HUMAN REVIEW PACKET READY; OFFICIAL METRICS NOT RUN

Date: 2026-07-21

## Context

The first local search lab made the locked visual projection directly testable. Inspection of the existing calibration dashboard exposed one deterministic lexical defect before human review began: positive concept matching could use evidence that directly negated the same concept.

## Problem

The `standing` query included a result whose only matching evidence stated `not standing: floating`. Token presence was being treated as support without considering concept-scoped negation.

## Decision

Add concept-scoped contradiction handling at producing commit:

`b6aa1b053192a83572e37e2d64d46d2aabeb3d45`

The ranker now rejects direct forms such as:

- `not <concept>`
- `no visible <concept>`
- `without <concept>`
- `lacks <concept>`
- `absence of <concept>`
- `<concept> not visible`

Negation of a different detail remains valid evidence. For example, `floating pose, no visible feet` still supports `floating` because the negated claim is `visible feet`, not `floating`.

## Offline Replay

- Calibration queries executed: `200`
- Holdout queries executed: `0`
- Rankings changed: `3/200`
- Rankings unchanged: `197/200`
- Changed queries: `terrain standing`, plus the two fixed-suite `standing` queries
- Directly contradicted `not standing` artwork removed: yes
- Valid floating evidence preserved: yes
- Missing observation references: `0`

## Corrected Bootstrap

Artifact:

`docs/audits/card_visual_search_evaluation_bootstrap_v1/2026-07-21T22-59-32-984Z_bootstrap_17b074d45810/`

- Producing commit: `b6aa1b053192a83572e37e2d64d46d2aabeb3d45`
- Query definitions: `250`
- Calibration executed: `200`
- Sealed holdout defined: `50`
- Holdout executed: `0`
- Reconciled: `true`
- Explanation-reference validity: `100%`

The source-derived bootstrap failure count remains diagnostic and is not human relevance evaluation.

## Corrected Review Packet

Artifact:

`docs/audits/card_visual_search_judgment_packet_v1/2026-07-21T23-00-10-686Z_packet_daaea33a8140/`

- Packet run key: `daaea33a8140d186ca946e7291ef3880eb4f714575cee8a0f0d1c22f5e47fec6`
- Calibration queries: `200`
- Holdout queries: `0`
- Top-result slots: `1,195`
- Required card images: `753`
- Resolved images: `753/753`
- Missing images: `0`
- Artifact hashes: `5/5` verified by the readiness evaluator
- Official gold status: `awaiting_human_judgments`

## Evaluator Readiness

Artifact:

`docs/audits/card_visual_search_calibration_evaluator_v1/2026-07-21T23-00-33-305Z_readiness_aa31ed2f7b85/`

- Ready: `true`
- Imported submissions: `0`
- Official metrics: `not_run_awaiting_human_judgments`
- Holdout exposed or executed: `false`

## Current Truths

- The corrected packet supersedes the earlier `f4d102548641` packet for new review work.
- Existing source expectations are not human gold.
- No relevance threshold has been locked.
- No holdout result has been exposed.
- The local product lab remains functional from the repaired ranker.

## Invariants

- A claim cannot support itself when directly negated.
- Negation is scoped to the requested concept, not treated as a blanket banned word.
- Human judgments authorize relevance gold.
- The fixed query suite cannot lose queries because they expose failures.
- Calibration and holdout execution remain separate.

## Boundaries Proven

No provider calls, database connections or writes, approvals, embeddings, persistent index writes, holdout execution, or public search release occurred.

## Tests

- Full relevant visual-search contract chain: `61/61` passed.
- Scoped contradiction fixtures: passed.
- Syntax checks: passed.
- `git diff --check`: passed.
- 200-query offline calibration replay: passed.

The full repository shipcheck was not run because `SUPABASE_DB_URL` is unavailable; no database-dependent result is claimed.

## Explicit Next Gate

Complete and export the primary review from the corrected `daaea33a8140` dashboard. Then complete the independent review of the seven difficult families, run the evaluator, adjudicate disagreements, and lock official calibration thresholds. Do not use the superseded packet and do not execute the sealed holdout yet.
