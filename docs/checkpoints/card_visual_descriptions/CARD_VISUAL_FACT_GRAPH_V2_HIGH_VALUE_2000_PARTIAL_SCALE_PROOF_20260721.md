# Card Visual Fact Graph V2 High-Value 2,000 Partial Scale Proof

Status: PARTIAL RUN RECONCILED; 10-WORKER SCALE PROVEN

Date: 2026-07-21

## Context

The prior 1,000-card high-value non-Energy harvest and private database import proved durable Fact Graph V2 generation, quarantine recovery, and bounded artifact apply. The next gate selected 2,000 previously unattempted high-value non-Energy card prints and started a frozen dry-run harvest at 10 concurrent workers.

The user determined that 50% completion was sufficient to decide whether the workload can scale and whether more workers should be tested. The paid run was therefore stopped intentionally after crossing that threshold.

## Problem

The project needed measured production-like throughput and provider stability over substantially more than a 50-card calibration sample. It also needed a durable answer about whether concurrency could increase without waiting for all 2,000 selected cards.

## Risk

- A force-stopped process could leave durable outcomes unaccounted for or duplicated.
- In-flight calls could finish out of order, creating gaps in selected indices.
- Aggregate telemetry could disagree with per-card checkpoints.
- Interrupted requests might incur provider usage without returning response telemetry.
- Projected 20-worker performance could be mistaken for measured behavior.
- A dry run could accidentally write generated rows to the database.

## Decision

Treat the per-card checkpoint files as the authoritative durable outcome set. Reconcile every checkpoint against the frozen 2,000-card plan, preserve all valid rows and raw failed payloads, record every unprocessed ID, verify the database boundary by run key, and stop the original paid run permanently.

Use the resulting 10-worker measurements to decide the next concurrency gate. Do not resume the same frozen run with altered concurrency. Test 20 workers separately on a frozen 100-card canary drawn from the 960 unprocessed IDs.

## Alternatives Rejected

- Finish all 2,000 cards before evaluating throughput: rejected because 1,039 provider outcomes are sufficient to measure 10-worker behavior.
- Resume the interrupted run at 20 workers: rejected because that would change a frozen run setting and contaminate the comparison.
- Infer 20-worker safety from linear projection: rejected because projections do not measure rate limits, retries, or provider latency at higher concurrency.
- Discard the partial run: rejected because all 1,040 durable outcomes reconcile exactly and contain paid, reusable evidence.

## Migration Applied

No migration was created or applied. This was an artifact-only OpenAI dry-run harvest.

## Frozen Run

- Producing commit: `809051a88f499274ac7c9392d80080ac79d4331e`
- Branch: `feature/card-visual-description-agent`
- Run key: `a168000dd61faeba0a64a51e61a5669b3952ace9f6f547a30783ac0aa2282cb6`
- Selected card prints: `2,000`
- Energy cards: `0`
- Provider/model: `openai` / `gpt-4.1-mini`
- Image detail: `high`
- Concurrency: `10`
- Provider retry limit: `1`
- Cost ceiling: `$30`
- Database writes: disabled

## Durable Outcomes

- Durable per-card checkpoints: `1,040`
- Validated generated rows: `1,002`
- Quarantined validation failures: `37`
- Skipped images: `1`
- Unprocessed selected cards: `960`
- Completion: `52.00%`
- Duplicate selected indices: `0`
- Duplicate completed card-print IDs: `0`
- Selected-index/card-ID mismatches: `0`
- Partial reconciliation mismatches: `0`

Three selected indices below the highest completed index have no durable result because calls were interrupted during shutdown. They remain explicitly unprocessed; no replacement or synthetic outcome was created.

## Quality Routing

- Pending generated rows: `206`
- Needs-review generated rows: `796`
- Approved rows: `0`
- Structural validation failure rate: `3.56%`
- Unsupported or unrecognized semantic fact failures: `26`
- Other structural validation failures: `6`
- Missing reference or backbone integrity failures: `5`
- Provider or generation exceptions: `0`

The 37 failed payloads are preserved in `validation_failures.jsonl` and `validation_quarantine.jsonl`. They are not counted as saved valid rows.

## Throughput And Stability

- Elapsed wall time: `128.15 minutes`
- Provider outcomes: `1,039`
- Durable throughput: `8.12 cards/minute`
- Provider requests: `1,054`
- Retries: `15`
- Retry rate: `1.42%`
- Provider exceptions: `0`
- Observed estimated cost: `$10.827524`
- Average observed cost per provider outcome: `$0.010421101`
- Average observed cost per validated row: `$0.010805912`

At the measured 10-worker rate, 2,000 cards project to approximately `246.45 minutes`. Ideal linear projection puts the remaining 960 cards at approximately `118.29 minutes` with 10 workers or `59.15 minutes` with 20 workers. The 20-worker estimate is not a measured result.

Observed usage includes only responses captured in durable checkpoints. Because the process was force-stopped, provider billing may include interrupted in-flight requests whose response telemetry was never written.

## Current Truths

- Ten-worker dry-run harvesting is stable enough to scale: more than 1,000 provider outcomes completed with no provider exceptions and a low retry rate.
- Twenty-worker stability is not yet proven.
- All 1,040 durable outcomes reconcile to the frozen selection exactly.
- The original 2,000-card run is intentionally incomplete and must never be represented as complete.
- The 960 unprocessed IDs remain available for a separately frozen follow-up gate.
- Energy cards remain deferred.

## Invariants

- Every paid batch must freeze its exact selection, producing SHA, model, image detail, concurrency, retry policy, cost ceiling, and no-write boundary before provider calls.
- Completed, failed, skipped, and unprocessed IDs must remain mutually exclusive and reconcile to the frozen selection.
- Raw validation failures must be preserved; they must not be silently converted into valid rows.
- Increasing concurrency requires a separate canary and must not modify a run in progress.
- Generated rows remain `pending` or `needs_review`; no automated approval is implied by throughput success.

## Database Boundary

Direct readback by this harvest run key returned:

- `card_visual_description_runs`: `0`
- `card_print_visual_descriptions`: `0`

No descriptions, approvals, embeddings, canonical records, or downstream integration rows were written by this run.

## Tests

Before the paid run:

- Visual agent targeted contracts: `66/66` passed.
- Artifact importer targeted contracts: `10/10` passed.
- Agent syntax/import check: passed.
- `git diff --check`: passed.

The full repository suite was not run for this isolated Node/provider scaling gate.

## Artifacts

Audit directory:

`docs/audits/card_visual_descriptions/2026-07-21T01-19-55-711Z_harvest_a168000dd61f`

The directory contains the frozen run plan, 1,040 per-card checkpoints, generated outputs, raw validation failures, quarantine rows, skipped-image row, exact 960-card unprocessed list, partial saved-system export, summary, reconciliation report, throughput analysis, database boundary readback, checkpoint metadata, and SHA-256 manifest covering `1,053` permanent files.

Artifact manifest SHA-256:

`54ef57271db8440029ddac1ba4190fffe12537d5aa570db23abafb9c60428bce`

## Why This Remains Derived Intelligence

Scale and reconciliation do not make model-extracted observations canonical truth. The fact graphs remain image-derived, review-routed intelligence. They do not define card identity, printing identity, ownership, price, approval, lore, or collector preference.

## What Must Never Be Broken

- Never claim a partial run is complete.
- Never treat projected concurrency as measured concurrency.
- Never hide interrupted, failed, skipped, duplicated, or missing outcomes in aggregate totals.
- Never persist or approve generated rows as a side effect of harvesting.
- Never let artwork facts overwrite canonical identity or variant-specific print evidence.
- Never resume an interrupted frozen run with changed settings.

## Explicit Next Gate

Run a frozen 100-card OpenAI dry-run canary at 20 workers using the first 100 IDs from `unprocessed_cards.jsonl`, with Energies excluded, no retries beyond the established per-card limit, a `$2.00` cost ceiling, per-card durable checkpoints, no database writes, and exact reconciliation. Compare throughput, retry rate, provider exceptions, validation failure rate, and cost against this 10-worker baseline. If the canary reconciles cleanly without severe rate limiting or provider instability, process the remaining 860 cards at 20 workers in a separately frozen dry-run harvest.
