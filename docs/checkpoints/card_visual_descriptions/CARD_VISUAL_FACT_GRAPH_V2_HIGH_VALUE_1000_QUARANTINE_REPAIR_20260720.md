# Card Visual Fact Graph V2 High-Value 1,000 Quarantine Repair

Status: OFFLINE REPLAY PASSED; APPLY READINESS NOT YET PROVEN

Date: 2026-07-20

## Context

The frozen 1,000-card non-Energy harvest produced 962 validated saved-system rows and quarantined 38 outcomes. The source run was produced from commit `ebe9d36b4e8ed7ad2f0e275242a8c8243700287d` on `feature/card-visual-description-agent`.

Source run:

`docs/audits/card_visual_descriptions/2026-07-20T19-11-36-562Z_harvest_71eceb32b2dd`

## Problem

The quarantine contained repeated deterministic normalization and evidence-policy failures rather than 38 independent model-quality failures. Repairing each row manually would not scale. One provider exception also had no raw payload.

## Risk

Broad cleanup could silently accept unsupported visual claims, remove useful evidence-backed semantics, destabilize the 962 valid rows, or make normalized payloads look apply-ready without preserving the exact image evidence used by the paid run.

## Decision

Repair only observed failure classes, lock each class with contract tests, replay every preserved failed payload, and replay all 962 valid rows as controls. Keep structural payload recovery separate from exact saved-row apply readiness.

The repair includes:

- evidence-backed facial and sleepy-appearance semantics
- supported scene, pose, object-use, silhouette, laboratory, and motif language
- generic identity/category semantic removal
- stale observation-reference recovery only when matching evidence exists
- subject-kind cleanup for nonliving settings and phenomena
- count-word/range reconciliation through twenty
- claimless typed-fact cleanup
- card UI/artwork observation partition repair
- explicit empty search-module handling
- complete image-provenance preservation for future validation failures

## Alternatives Rejected

- Rerun all 38 cards through OpenAI: rejected because 37 payloads already contained recoverable evidence and a paid rerun was unnecessary.
- Approve all normalized payloads after structural replay: rejected because historical failure artifacts lack complete image provenance.
- Add broad banned-word or allow-word lists: rejected because the governing policy is claim plus field plus evidence plus contradictions.
- Rewrite the extraction prompt: rejected because the failures were deterministic validator/normalizer classes.

## Migration Applied

None. No schema or database migration was required.

## Replay Proof

Audit:

`docs/audits/card_visual_descriptions/2026-07-20T21-39-56-960Z_quarantine_repair_replay_1465817074ff`

Results:

- selected: 1,000
- original valid controls: 962
- original valid controls still valid: 962
- replayable quarantined payloads: 37
- replayable payloads recovered: 37
- remaining quarantine: 1
- skipped: 0
- duplicate selected IDs: 0
- duplicate outcome IDs: 0
- reconciliation mismatches: 0

The remaining outcome is `GV-PK-PL-76` Happiny (`0848dd13-a194-4538-87fe-3dc74021129a`). Its provider request was aborted and no raw payload exists.

## Current Truths

- The 962 source `generated_outputs.jsonl` rows remain the exact saved-system artifacts produced by the paid run.
- The 37 preserved failed payloads now validate structurally under the repaired deterministic policy.
- None of those 37 are exact apply artifacts yet because the historical failure format did not preserve complete image provenance.
- Future validation failures now preserve image source, source key, SHA-256, dimensions, MIME type, quality score, and quality flags.
- Happiny requires one separately bounded provider retry because there is no generated payload to recover.
- No database reads or writes occurred in this repair gate.

## Invariants

- Energy cards remain deferred.
- Raw observations remain the evidence backbone.
- Evidence-backed semantic claims may pass; unsupported or circular claims may not.
- Subject identity, depicted subject, and character representation remain separate.
- Original valid paid-run artifacts are never rewritten during offline replay.
- Payload validity does not imply approval or public visibility.

## Token And Cost Result

This offline repair used 0 provider requests, 0 tokens, and $0 new model cost.

The source paid run remains:

- requests: 1,022
- retries: 22
- input tokens: 9,050,330
- output tokens: 5,152,032
- total tokens: 14,202,362
- estimated cost: $10.5361256

## Why This Remains Derived Intelligence

The graph records model-extracted visual observations and deterministic concepts. It does not define canonical card identity, printing truth, image ownership, market truth, or approved collector knowledge. Human review and governed apply boundaries remain authoritative.

## What Must Never Be Broken

- Never infer facts from canonical metadata without visible evidence.
- Never treat a successful offline normalization as proof of the source image.
- Never overwrite approved or human-reviewed rows.
- Never write recovered payloads without exact image/version/telemetry reconciliation.
- Never approve, embed, publish, or integrate these rows implicitly.
- Never silently drop a selected card ID or duplicate an outcome.

## Explicit Next Gate

Reconstruct and verify image provenance for the 37 recovered payloads from the frozen source selection and self-hosted image store, build exact saved-system rows, and run apply-readiness reconciliation. Retry Happiny only in a separately bounded one-card provider gate. Stop before any database apply until those proofs reconcile.
