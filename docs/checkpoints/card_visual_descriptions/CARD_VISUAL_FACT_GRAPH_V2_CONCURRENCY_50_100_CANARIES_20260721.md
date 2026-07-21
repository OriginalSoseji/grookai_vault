# Card Visual Fact Graph V2 Concurrency 50/100 Canaries

Status: COMPLETE; 100-WORKER SAFETY PROVEN; THROUGHPUT PLATEAU OBSERVED

Date: 2026-07-21

## Context

The prior partial 2,000-card harvest proved stable generation at 10 workers but projected an unacceptable full-catalog duration. The agent therefore needed bounded, measured evidence at 50 concurrent workers and, if safe, 100 concurrent workers.

Adaptive concurrency, image-fetch isolation, provider telemetry, durable per-card artifacts, retry backoff, and circuit breakers were implemented before the paid canaries. Two disjoint 250-card high-value non-Energy selections were then processed from the same frozen code commit.

## Problem

The project needed to determine whether substantially more workers could reduce catalog harvest time without causing provider throttling, retry storms, duplicate or missing outcomes, cost-control failures, or database writes.

## Risk

- Higher concurrency could exceed OpenAI request or token limits.
- Provider timeouts could be mistaken for permanent failures.
- Out-of-order completion could corrupt selected-card order or reconciliation.
- Image retrieval could consume all available sockets before provider calls begin.
- A short canary could overstate sustained full-catalog throughput.
- Increasing worker count could add cost without improving throughput.

## Decision

Accept up to 100 adaptive provider workers as operationally safe for future bounded dry-run harvesting. Do not increase above 100 yet.

The 100-worker canary completed faster overall than the 50-worker canary, but the fully ramped stage improved only about 2 percent. This indicates a throughput plateau near 30 cards per minute for these 250-card runs. The next gate must measure sustained middle-window behavior over a larger 2,000-card sample before any full-catalog authorization.

## Alternatives Rejected

- Jump directly from 10 workers to a full-catalog 100-worker run: rejected because provider and reconciliation behavior had not been measured at that concurrency.
- Increase beyond 100 immediately: rejected because the 50-worker and 100-worker target stages had nearly identical throughput.
- Treat quarantined payloads as failed batch execution: rejected because harvest mode is designed to preserve valid rows and isolate invalid payloads for later offline repair.
- Apply generated rows during the canaries: rejected because concurrency proof must remain separate from database apply and approval gates.

## Migration Applied

No migration was created or applied. Both canaries were artifact-only OpenAI dry-run harvests.

## Producing Code

- Branch: `feature/card-visual-description-agent`
- Producing commit: `9cc306020ba9156cc8103d49a5fcfa1735d30e0f`
- Prompt: `CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2`
- Schema: `CARD_VISUAL_FACT_GRAPH_SCHEMA_V2`
- Provider/model: `openai` / `gpt-4.1-mini`
- Image detail: `high`
- Energy cards: excluded
- Database writes: disabled

## 50-Worker Canary

- Selection: `250` cards
- Selection ID SHA-256: `7592c0de698b97af8dc03af7929dad3ac294b575a28aa13f00b203bfca31bbbc`
- Adaptive concurrency: `20 -> 30 -> 40 -> 50`
- Maximum provider overlap observed: `50`
- Image concurrency: `20`
- Validated: `244`
- Quarantined: `6`
- Skipped: `0`
- Pending: `44`
- Needs review: `200`
- Provider requests: `256`
- Retries: `6` (`2.34375%`)
- HTTP 429 responses: `0`
- Provider exceptions: `0`
- Input/output/total tokens: `2,266,408` / `1,248,670` / `3,515,078`
- Cached input tokens: `1,050,368`
- Estimated cost: `$2.5893248`
- Wall time: `10.254333` minutes
- Overall throughput: `24.379937` cards/minute
- Fully ramped 50-worker throughput: `29.975249` cards/minute
- Reconciliation mismatches: `0`
- Database run/description rows: `0` / `0`

## 100-Worker Canary

- Selection: `250` cards, with `0` overlap with the 50-worker selection
- Selection ID SHA-256: `5782e1c9ed3ee140e77738a6765f0badbd54f04cc63a73f1487b86a7c07ea4e4`
- Adaptive concurrency: `50 -> 75 -> 100`
- Maximum provider overlap observed: `100`
- Image concurrency: `30`
- Validated: `239`
- Quarantined: `11`
- Skipped: `0`
- Pending: `58`
- Needs review: `181`
- Provider requests: `254`
- Retries: `4` (`1.574803%`)
- HTTP 429 responses: `0`
- Provider exceptions: `0`
- Input/output/total tokens: `2,314,368` / `1,254,853` / `3,569,221`
- Cached input tokens: `1,182,592`
- Estimated cost: `$2.5787344`
- Wall time: `7.64395` minutes
- Overall throughput: `32.705604` cards/minute
- Fully ramped 100-worker throughput: `30.563074` cards/minute
- Reconciliation mismatches: `0`
- Database run/description rows: `0` / `0`

## Combined Result

- Selected and attempted: `500`
- Validated: `483`
- Quarantined: `17`
- Skipped: `0`
- Energy cards: `0`
- Provider requests: `510`
- Retries: `10`
- HTTP 429 responses: `0`
- Provider exceptions: `0`
- Input/output/total tokens: `4,580,776` / `2,503,523` / `7,084,299`
- Cached input tokens: `2,232,960`
- Estimated cost: `$5.1680592`
- Selection overlap: `0`
- Reconciliation mismatches: `0`
- Database writes: `0`

All 500 selected card-print IDs appear exactly once as a durable valid or quarantined outcome. The 17 quarantined payloads remain preserved for grouped offline repair and were not written as valid outputs.

## Throughput Decision

The 100-worker run was `34.15%` faster end to end than the 50-worker run because it began at a higher concurrency and ramped sooner. Once both runs reached their configured maximum, however, throughput changed from `29.975249` to `30.563074` cards per minute, only a `1.96%` improvement.

At the measured 100-worker canary rate:

- `50,000` cards project to approximately `25.48` hours.
- Estimated cost projects to approximately `$515.75` at the observed per-card rate.

These are planning projections, not a full-catalog authorization or guaranteed billing result.

## Current Truths

- The agent can sustain 100 overlapping OpenAI requests without measured rate limiting in a 250-card canary.
- Adaptive ramping, retry recovery, durable outcomes, and artifact reconciliation work at 50 and 100 workers.
- The observed bottleneck is no longer the configured worker limit alone.
- Increasing above 100 is unlikely to materially improve throughput without first profiling provider latency, output size, and image-fetch behavior over a longer run.
- Harvest quarantine remains necessary: 17 of 500 payloads did not structurally validate.
- Energy cards remain deferred.

## Invariants

- Freeze commit, selection, model, image detail, concurrency policy, retry policy, cost ceiling, and no-write boundary before provider calls.
- Preserve every valid, failed, skipped, and unprocessed outcome distinctly.
- Never patch or rerun individual cards inside a frozen paid batch.
- Never treat quarantine rows as valid saved-system outputs.
- Never approve, embed, or write generated rows as a side effect of throughput testing.
- Never use shared artwork evidence to assert unobserved variant-specific print markers.
- Never describe a throughput projection as a measured full-catalog result.

## Tests

- Agent syntax/import check: passed.
- Visual-agent and importer targeted contract tests: `78/78` passed.
- `git diff --check`: passed before the paid runs.
- Artifact reconciliation and hash verification: passed for both canaries.
- Full repository suite: not run for this isolated Node/provider concurrency gate.

## Artifacts

50-worker selection and plan:

- `docs/audits/card_visual_50_worker_canary/2026-07-21T03-57-10-821Z_selection`
- `docs/audits/card_visual_50_worker_canary/2026-07-21T03-57-11-103Z_plan_8d1ea935d8f0`

50-worker run:

- `docs/audits/card_visual_50_worker_canary/2026-07-21T03-57-55-552Z_harvest_5798c4de6b34`
- Run key: `5798c4de6b341211faf197255962d2f864c7b4577905e5f045674684eb0aa596`
- Artifact manifest SHA-256: `861f6e124e488a7bd3b8576bff3473241034c367b74ec346999dff58ce39ea1d`

100-worker selection and plan:

- `docs/audits/card_visual_100_worker_canary/2026-07-21T04-10-49-238Z_selection`
- `docs/audits/card_visual_100_worker_canary/2026-07-21T04-10-49-520Z_plan_571225946fc1`

100-worker run:

- `docs/audits/card_visual_100_worker_canary/2026-07-21T04-11-21-183Z_harvest_bd342eb263d7`
- Run key: `bd342eb263d799768c6369ce90bfbc9604bcbccd1f952221c29b53931f8c9600`
- Artifact manifest SHA-256: `0135c083879e5e73f14e9b7d45984ce80da1ecfc65f87250070c638469a9d153`

Each run directory contains its summary, generated outputs, raw validation failures, quarantine, saved-system export, reconciliation report, concurrency telemetry, scaling analysis, database boundary readback, per-card artifacts, and artifact hashes.

## Why This Remains Derived Intelligence

Concurrency, validation, and reconciliation prove that extraction can run safely; they do not make model observations canonical truth. Fact graphs remain image-derived, review-routed intelligence and cannot define card identity, printing identity, ownership, price, lore, or approval.

## What Must Never Be Broken

- Never trade exact reconciliation for speed.
- Never silently drop or duplicate selected card IDs.
- Never convert a failed payload into a valid row without deterministic validation.
- Never let generated facts overwrite canonical or human-reviewed data.
- Never infer database apply safety from a dry-run concurrency result.
- Never increase concurrency merely because the provider did not return HTTP 429s; measured throughput must justify the increase.

## Explicit Next Gate

Run a separately frozen 2,000-card high-value non-Energy dry-run harvest with adaptive concurrency `75 -> 100`, ramping every `100` clean outcomes, image concurrency `40`, the established retry and circuit-breaker policy, a `$30` ceiling, no database writes, and exact durable reconciliation. Use sustained middle-window throughput rather than startup/drain averages to decide whether 100 workers should become the full-harvest operating limit. Do not increase above 100 before that evidence exists.
