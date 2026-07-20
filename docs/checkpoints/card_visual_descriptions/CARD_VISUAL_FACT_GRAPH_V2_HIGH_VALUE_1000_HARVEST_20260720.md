# CARD_VISUAL_FACT_GRAPH_V2_HIGH_VALUE_1000_HARVEST_20260720

Status: COMPLETE WITH QUARANTINE

Date: 2026-07-20

## Context

The bounded Fact Graph V2 artifact importer was proven on `25` non-Energy rows. The next approved gate was a larger paid harvest that could preserve valid outputs while quarantining invalid payloads, without database writes, approvals, embeddings, or downstream integration.

## Problem

Small calibration batches did not prove sustained provider concurrency, artifact durability, cost behavior, or validator performance over a materially larger and previously unattempted card set. The project needed evidence that a `1,000`-card run could complete without manual micro-approval or loss of failed payloads.

## Risk

A large run could repeat earlier selections, include Energy cards, exceed its cost ceiling, lose or duplicate IDs, conceal validation failures, produce irreconcilable token totals, mutate database state, or create artifacts that cannot be audited independently.

## Decision

Run exactly `1,000` frozen, previously unattempted, high-value non-Energy card-print IDs with `10` workers, `gpt-4.1-mini`, high image detail, one retry per card, and a `$15` ceiling. Preserve valid outputs and quarantine failures. Do not patch or rerun individual failures during the paid batch.

## Alternatives Rejected

- Reuse the highest-value plan directly: rejected because `999/1,000` cards overlapped prior harvest attempts.
- Run the entire catalog: rejected because selection, cost, and quarantine behavior first needed a larger bounded proof.
- Include Energy cards: deferred by explicit product decision.
- Apply generated rows during the harvest: rejected because generation and database apply remain separate gates.
- Require `1,000/1,000` live validation: rejected because the governed harvest policy safely preserves valid rows and quarantines bounded failures.

## Migration Applied

No migration was created or applied. This was an artifact-only paid harvest.

## Run Proof

- Producing commit: `ebe9d36b4e8ed7ad2f0e275242a8c8243700287d`
- Branch: `feature/card-visual-description-agent`
- Run key: `71eceb32b2dd6f34fb806edf2492edab649bb8465e8aeaa94310aa053303c594`
- Model: `gpt-4.1-mini`
- Image detail: `high`
- Concurrency: `10`
- Runtime: `2h 1m 45.191s`
- Selected and attempted: `1,000`
- Structurally validated: `962`
- Quarantined: `38`
- Skipped: `0`
- Validation failure rate: `3.8%`, below the `15%` harvest ceiling
- Review routing among validated rows: `236 pending`, `726 needs_review`, `0 approved`

## Selection Proof

- Frozen selection SHA-256: `b9e601a929e48dccdf2f88c4c7647a951088dfb0bb4c1610cd0d16b7e02d1375`
- Selection fingerprint: `c2c6e61a0d2e06bf12369148d2991d32c11d5e49afc603866af96954adbc26b6`
- Selected-ID SHA-256: `3d03f40812d857458b0771172f352e9baa3a87cc52bfae6b0a20b0f4bc399124`
- Unique selected IDs: `1,000`
- Overlap with `1,500` prior attempted harvest IDs: `0`
- Energy cards: `0`
- Pokémon: `856`
- Trainer: `109`
- Item / Tool / Supporter: `23`
- Stadium: `12`
- Frozen selected order matched the run plan exactly.

## Quarantine Result

- Unsupported or unrecognized semantic fact: `24`
- Structural validation failure: `8`
- Missing reference or backbone integrity: `5`
- Provider or generation exception: `1`

All `38` failed payloads remain present in `validation_failures.jsonl`, `validation_quarantine.jsonl`, the full saved-system export, and their per-card artifacts. No failed card was silently dropped or individually rerun.

## Reconciliation

- Generated outputs: `962`
- Validation failures: `38`
- Skipped images: `0`
- Final saved-system export records: `1,000`
- Unique final export IDs: `1,000`
- Per-card checkpoint files: `1,000`
- Missing selected IDs: `0`
- Extra selected IDs: `0`
- Duplicate final export IDs: `0`
- Usage or cost mismatches: `0`
- Total reconciliation mismatches: `0`
- Run artifact manifest entries: `1,014`
- Independently verified artifact hash mismatches: `0`

## Token And Cost Result

- Provider requests: `1,022`
- Retries: `22`
- Input tokens: `9,050,330`
- Cached input tokens: `4,424,192`
- Output tokens: `5,152,032`
- Total tokens: `14,202,362`
- Reasoning output tokens: `0`
- Estimated cost: `$10.5361256`
- Cost ceiling: `$15`
- Average cost per validated description: `$0.01095231`

## Database Boundary Proof

Post-run readback returned `8` persisted runs, `78` description rows, `73` current rows, `0` approved rows, and `0` embedding rows. The latest persisted database run was created at `2026-07-20T18:53:39.212Z`, before this harvest started at `2026-07-20T19:11:36.562Z`. The harvest therefore created no database run or description row.

## Current Truths

- The `962` validated rows are reusable paid artifacts, not approved database knowledge.
- The `38` quarantined rows are preserved evidence and are not apply-ready.
- Fact Graph V2 remains private derived intelligence.
- Canonical card identity and image ownership remain outside the model output.
- Energy extraction remains deferred.
- The producing SHA remains the frozen pre-run commit; no post-run code commit produced these results.

## Invariants

- Every selected ID must appear exactly once in the final saved-system export.
- Quarantined payloads must never be silently accepted or discarded.
- Validation repair must preserve raw evidence and cannot create unsupported facts.
- `pending` and `needs_review` are not human approval.
- Generation and database apply remain separate operations.
- No approved/current human-reviewed row may be overwritten by a future importer.
- No embeddings or public reads may be enabled by this workstream without a separate gate.

## Why The Visual Layer Remains Derived Intelligence

The graph records model-extracted observations and deterministic concepts tied to a specific image. It does not define canonical identity, printing truth, lore, rarity, market value, collector preference, or approval. Those authorities remain in their owning systems and human review workflow.

## What Must Never Be Broken

- Never let visual output mutate canonical card identity.
- Never treat model confidence as human approval.
- Never copy variant-specific print markers without image evidence for that printing.
- Never turn `not observed` into `not present`.
- Never regenerate a validated artifact merely to apply it.
- Never hide reconciliation, token, cost, or quarantine mismatches.

## Tests

- Visual-agent contracts: `63/63` passed.
- Agent syntax check: passed.
- Artifact importer syntax check: passed.
- `git diff --check`: passed.
- Run artifact hashes: `1,014/1,014` verified.
- Full repository contract suite: not run for this isolated Node/artifact harvest.

## Artifacts

Frozen selection:

`docs/audits/card_visual_descriptions/2026-07-20T19-09-41-155Z_next1000_selection_c2c6e61a0d2e/FROZEN_SELECTION.json`

Paid run:

`docs/audits/card_visual_descriptions/2026-07-20T19-11-36-562Z_harvest_71eceb32b2dd/`

Key run artifacts:

- `run_plan.json`
- `summary.json`
- `generated_outputs.jsonl`
- `validation_failures.jsonl`
- `validation_quarantine.jsonl`
- `skipped_images.jsonl`
- `ALL_1000_SAVED_SYSTEM_JSON.json`
- `HARVEST_REPORT.json`
- `RECONCILIATION_REPORT.json`
- `FACT_GRAPH_V2_REVIEW_PACKET.md`
- `artifact_hashes.json`
- `per_card/`

Independent verification:

`docs/audits/card_visual_descriptions/2026-07-20T21-17-19-760Z_next1000_post_run_verification/POST_RUN_VERIFICATION.json`

## Explicit Next Gate

Run one deterministic offline quarantine-repair pass over all `38` failed payloads plus a regression sample of validated rows. Add tests only for recurring failure classes, make zero provider calls and zero database writes, and produce an apply-readiness reconciliation package. Stop before applying additional rows or starting another paid harvest.
