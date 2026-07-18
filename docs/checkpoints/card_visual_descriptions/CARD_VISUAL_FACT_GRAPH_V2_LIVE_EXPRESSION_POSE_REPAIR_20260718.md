# CARD_VISUAL_FACT_GRAPH_V2_LIVE_EXPRESSION_POSE_REPAIR_20260718

## Context

After the evidence-backed claim repair, the next gated step was one fresh paid OpenAI dry run over the same 25 explicit launch-value card-print IDs. Energies remained excluded, code was frozen during the paid run, and the run was artifact-only.

The paid proof completed all `25` cards and stayed under the `$0.35` run ceiling, but it did not lock. A narrow deterministic repair was then applied and replayed offline against the exact paid payloads.

## Problem

The fresh paid proof produced `3` structural validation failures out of `25` attempted rows:

- `GV-PK-JPN-M5-101 Mega Excadrill ex`: `face side profile visible` was emitted as an expression semantic fact, but it is evidence-only facial-position data.
- `GV-PK-JPN-M5-096 Mega Zeraora ex`: `upright` was emitted as a state semantic fact with visible pose/body-position evidence, but the validator did not yet treat upright as an evidence-backed pose/state label.
- `GV-PK-JPN-M5-110 Rust Syndicate Grunt`: `smirking` was emitted as an expression semantic fact with mouth evidence, but the validator did not yet recognize smirking as a supported expression class.

## Risk

If unrepaired, valid visible facts would keep failing live validation even when properly evidence-backed.

If over-repaired, unsupported facial expressions or pose labels could enter semantic visual facts without evidence, weakening the observable fact boundary.

## Decision

Apply a deterministic expression/pose repair only.

The repair:

- treats `face side profile visible` and `side profile visible` as evidence-only labels that are dropped from semantic visual facts
- allows `upright` only when supported by visible pose, posture, body-position, or orientation evidence
- allows `smirking` only when supported by visible mouth evidence
- removes unsupported `smirking` when mouth or facial evidence is absent or contradictory

## Alternatives Rejected

- Broadly accepting all expression labels: rejected because expressions must be evidence-backed.
- Treating facial-position labels as reusable semantic concepts: rejected because side profile belongs in facial evidence/anatomy, not semantic visual facts.
- Running another paid sample before replay: rejected because the three failed payloads were sufficient offline fixtures.
- Changing the extraction prompt: rejected because this was validator vocabulary drift, not prompt architecture failure.

## Migration Applied

No migration was applied.

## One-Card Apply Proof

No database apply was performed in this gate.

The earlier one-card apply proof remains unchanged. This gate inserted no rows, updated no rows, approved no rows, and generated no embeddings.

## Current Truths

- Fact Graph V2 remains active.
- `visual_attributes.fact_graph` remains source truth.
- `artwork_description` remains compatibility-only digest text.
- Energies remain deferred.
- The latest paid proof failed live lock with `22/25` structurally valid rows.
- The deterministic offline replay recovered all `3` failed payloads and preserved all `22` previously valid rows.
- Offline replay success is not a live lock.

## Invariants

- Every typed fact must cite valid observations.
- Every search term must cite observation-backed facts.
- Semantic expression labels are allowed only with visible facial evidence.
- Pose/state labels are allowed only with visible pose, posture, body-position, or orientation evidence.
- Evidence-only facial observations must not become semantic meaning facts.
- Scene subjects, depicted subjects, and character representations remain separate.
- Actual physical card-surface claims require reliable card evidence.
- No database writes, approvals, embeddings, public reads, or downstream integrations are allowed in this calibration gate.

## Token And Cost Result

Source paid run artifact:

`docs/audits/card_visual_fact_graph_v2_evidence_backed_claim_repair_live_25_dry_run/2026-07-18T21-10-40-349Z_dry_run_1975a670b3f2/`

Paid run usage:

- Requests: `26`
- Retries: `1`
- Input tokens: `222756`
- Output tokens: `101674`
- Total tokens: `324430`
- Cached input tokens: `29184`
- Estimated cost: `$0.2430256`
- Average estimated cost per structurally validated description: `$0.01104662`

Offline replay usage:

- OpenAI calls: `0`
- Database writes: `0`
- Estimated replay model cost: `$0`

## Repair Result

Repair artifact:

`docs/audits/card_visual_fact_graph_v2_live_expression_pose_repair/2026-07-18T21-39-23-197Z_deterministic_repair_4981bb84a7ad/`

Replay result:

- Previous failures replayed: `3`
- Previous failures now valid: `3`
- Previous failures still failed: `0`
- Previously valid rows replayed: `22`
- Previously valid rows still valid: `22`
- Previously valid rows now failed: `0`
- Total after replay: `25/25` valid
- Replayed status mix: `20 needs_review`, `5 pending`

## Why The Visual Layer Remains Derived Intelligence

The fact graph is generated from card images and deterministic validators. It is reviewable derived intelligence for future search, matching, recommendations, Grookai Signature, cameo discovery, and visual systems.

It is not canonical card identity truth, print-variant truth, pricing truth, human approval, or app-facing public data.

## What Must Never Be Broken

- Do not approve generated rows automatically.
- Do not generate embeddings from unapproved rows.
- Do not expose private visual facts publicly.
- Do not merge artwork facts with card UI print-marker evidence.
- Do not copy variant-specific print marker claims across shared artwork variants without direct variant image evidence.
- Do not store story, lore, personality, or unsupported substance-state claims as facts.
- Do not run 125 cards or database apply until a fresh paid 25-card proof validates structurally.

## Artifacts

- Source paid run summary: `docs/audits/card_visual_fact_graph_v2_evidence_backed_claim_repair_live_25_dry_run/2026-07-18T21-10-40-349Z_dry_run_1975a670b3f2/summary.json`
- Source paid run packet: `docs/audits/card_visual_fact_graph_v2_evidence_backed_claim_repair_live_25_dry_run/2026-07-18T21-10-40-349Z_dry_run_1975a670b3f2/FACT_GRAPH_V2_REVIEW_PACKET.md`
- Source paid run failures: `docs/audits/card_visual_fact_graph_v2_evidence_backed_claim_repair_live_25_dry_run/2026-07-18T21-10-40-349Z_dry_run_1975a670b3f2/validation_failures.jsonl`
- Source artifact hashes: `docs/audits/card_visual_fact_graph_v2_evidence_backed_claim_repair_live_25_dry_run/2026-07-18T21-10-40-349Z_dry_run_1975a670b3f2/artifact_hashes.json`
- Repair replay summary: `docs/audits/card_visual_fact_graph_v2_live_expression_pose_repair/2026-07-18T21-39-23-197Z_deterministic_repair_4981bb84a7ad/replay_summary.json`
- Repair replay report: `docs/audits/card_visual_fact_graph_v2_live_expression_pose_repair/2026-07-18T21-39-23-197Z_deterministic_repair_4981bb84a7ad/REPAIR_REPLAY_REPORT.md`
- Repair replay results: `docs/audits/card_visual_fact_graph_v2_live_expression_pose_repair/2026-07-18T21-39-23-197Z_deterministic_repair_4981bb84a7ad/replay_results.jsonl`
- Repair artifact hashes: `docs/audits/card_visual_fact_graph_v2_live_expression_pose_repair/2026-07-18T21-39-23-197Z_deterministic_repair_4981bb84a7ad/artifact_hashes.json`

## Tests

- `node --check backend/card_descriptions/card_visual_description_agent_v1.mjs` passed.
- `node --test tests/contracts/card_visual_description_agent_v1.test.mjs` passed, `49/49`.
- `git diff --check` passed.

## Explicit Next Gate

Run one fresh paid OpenAI dry run over the same 25 explicit card-print IDs with this repair applied.

Constraints:

- Energies excluded.
- Code frozen during the run.
- Maximum run cost: `$0.35`.
- No database writes.
- No approvals.
- No embeddings.
- No semantic search, Taste Engine, Listing Resolver, public read, or app integration.
- Do not run 125 cards or database apply until that fresh paid 25-card proof validates structurally.
