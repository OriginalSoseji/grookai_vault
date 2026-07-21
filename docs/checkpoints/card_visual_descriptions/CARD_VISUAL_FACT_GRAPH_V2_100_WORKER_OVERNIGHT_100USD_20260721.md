# Card Visual Fact Graph V2 100-Worker Overnight $100 Harvest

Status: COMPLETE WITH QUARANTINE; GLOBAL BUDGET HELD; PROVIDER CIRCUIT BREAKER STOP

Date: 2026-07-21

## Context

The 50-worker and 100-worker canaries proved that the agent could reach 100 overlapping OpenAI requests without reconciliation or database-write failures. The user then approved an overnight high-value non-Energy harvest with a hard `$100` total spend ceiling.

The run selected 10,000 previously unselected card-print IDs and used a `$98.50` completed-response scheduler target plus a `$1.50` reserve for requests already in flight. The work remained artifact-only throughout.

## Problem

The project needed to convert concurrency proof into a materially larger visual-intelligence harvest without requiring repeated human approval, while preserving exact card selection, cost controls, quarantine, restart safety, and the no-write boundary.

## Risk

- One hundred concurrent requests can exceed a local cost threshold through already in-flight work.
- Provider latency can create timeout retries even without HTTP rate limiting.
- Repeated HTTP 429 responses can make continuing unsafe or inefficient.
- Restarting a stopped segment can duplicate paid work unless exact durable IDs are excluded.
- Image gaps can be misrepresented as completed model failures.
- Scale success can be mistaken for canonical truth or approval.

## Decision

Freeze exactly 10,000 high-value non-Energy card-print IDs that did not occur in prior frozen audit plans. Process them through separately reconciled segments, always excluding every durable outcome before a continuation.

Use adaptive concurrency with 100 as the maximum. After two segments stopped on rolling timeout retry rates, repair the scheduler so a retry spike first halves concurrency and pauses rather than immediately terminating the batch. Retain hard circuit breakers after repeated unsuccessful backoffs or repeated HTTP 429 responses.

Stop permanently when the final segment reaches the rate-limit circuit breaker near the approved cost boundary. Do not spend the remaining `$1.49` on another segment.

## Alternatives Rejected

- Run without a fixed dollar ceiling: rejected because the API does not provide a reliable live account-balance control.
- Disable TLS certificate verification: rejected; Node's system CA store resolved the local certificate chain while keeping verification enabled.
- Rerun whole stopped segments: rejected because that would duplicate paid work.
- Ignore timeout retry spikes: rejected because unbounded retries can understate cost and destabilize the provider path.
- Continue after repeated HTTP 429 responses: rejected because the circuit breaker is a required safety boundary.

## Migration Applied

No migration was created or applied. This was an artifact-only OpenAI harvest.

## Frozen Selection

- Branch: `feature/card-visual-description-agent`
- Initial producing commit: `8e927a0ca78fda9bcb45640ce42b18b637a30fcc`
- Adaptive retry repair commit: `bd16d7465f36d9f5b2527f60e8a1c6b9d21abe81`
- Selected card prints: `10,000`
- Selection SHA-256: `ce191a581e85ff5c8add0ff7a26fc7a4d594ecff03e88585da7e154059149719`
- Prior frozen-plan IDs excluded: `7,173`
- Pokemon: `8,819`
- Trainer: `751`
- Item/Tool/Supporter: `349`
- Stadium: `81`
- Energy: `0`
- Duplicate selected IDs: `0`
- Provider/model: `openai` / `gpt-4.1-mini`
- Image detail: `high`
- Maximum concurrency: `100`
- Database writes: disabled

## TLS Preflight

The first launch failed local certificate validation before any model response:

- Failure: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
- Durable failures: `124`
- Tokens: `0`
- Estimated model cost: `$0`
- Circuit breaker: `adaptive_retry_rate_circuit_breaker`

A non-billed OpenAI models probe passed with Node's `--use-system-ca`. TLS verification remained enabled. The identical selection then restarted without changing model, prompt, schema, or image settings.

## Paid Segments

### Segment 1

- Run key: `69d980427f4cebc31ea8d9762f0592592c1e2baa7f7a6f0e2ae4738a6f0b0163`
- Producing commit: `8e927a0ca78fda9bcb45640ce42b18b637a30fcc`
- Durable outcomes: `700`
- Validated: `681`
- Quarantined: `19`
- Skipped: `0`
- Requests/retries: `734` / `34`
- Cost: `$7.3383656`
- Duration: `14.2852` minutes
- Stop: `adaptive_retry_rate_circuit_breaker`
- Reconciliation mismatches: `0`

### Segment 2

- Run key: `a455ace34eed57ef3b76a75c2b3edaaaa983a376e3dc8105bf54a0b3324c6dc5`
- Producing commit: `8e927a0ca78fda9bcb45640ce42b18b637a30fcc`
- Durable outcomes: `1,205`
- Validated: `1,158`
- Quarantined: `47`
- Skipped: `0`
- Requests/retries: `1,235` / `30`
- Cost: `$12.856028`
- Duration: `22.2722` minutes
- Stop: `adaptive_retry_rate_circuit_breaker`
- Reconciliation mismatches: `0`

### Segment 3

- Run key: `d6a3c5fabc26371c22a14a7302393d36e1e18d3f87fce602dfb6dcb3b2da441e`
- Producing commit: `bd16d7465f36d9f5b2527f60e8a1c6b9d21abe81`
- Durable outcomes: `7,822`
- Validated: `7,537`
- Quarantined: `236`
- Skipped: `49`
- Requests/retries: `7,905` / `132`
- Cost: `$78.315258`
- Duration: `107.1866` minutes
- Maximum concurrency reached: `100`
- Stop: `adaptive_rate_limit_circuit_breaker`
- HTTP 429 stop detail: `5` rolling 429 events with concurrency already reduced to `12`
- Local segment ceiling variance: `$0.015258` from already in-flight completions
- Identity/count reconciliation mismatches: `0`

The local segment cost variance is explicitly preserved. It did not breach the global user-approved `$100` envelope.

## Combined Result

- Selected: `10,000`
- Durable outcomes: `9,727`
- Validated fact graphs: `9,376`
- Quarantined validation failures: `302`
- Skipped images: `49`
- Unprocessed: `273`
- Pending: `2,526`
- Needs review: `6,850`
- Approved: `0`
- Energy: `0`
- Duplicate durable IDs: `0`
- Missing/extra identity mismatches: `0`
- Active provider time: `143.7440` minutes
- End-to-end wall time: `149.8540` minutes
- Durable throughput including repair gaps: `64.9098` cards/minute

The 273 unprocessed IDs are preserved exactly in `unprocessed_cards.jsonl`. They were never substituted or silently treated as complete.

## Token And Cost Result

- Provider requests: `9,874`
- Retries: `196`
- Retry rate: `1.9850%`
- Input tokens: `87,837,113`
- Output tokens: `48,492,950`
- Total tokens: `136,330,063`
- Cached input tokens: `47,379,712`
- Estimated cost: `$98.5096516`
- Approved ceiling: `$100`
- Remaining approved envelope: `$1.4903484`

Provider attempt statuses:

- HTTP 200: `9,652`
- HTTP 429: `32`
- HTTP 502: `3`
- HTTP 503: `2`
- Transport/unknown: `185`

The estimated cost is based on returned response telemetry. Interrupted transport attempts may be billed by the provider without returning usage data, so account billing remains the final external authority.

## Adaptive Retry Repair

The scheduler now evaluates a fresh 50-outcome retry window. Above a 10 percent retry rate it:

1. Halves current concurrency, bounded at 10.
2. Pauses for 30 seconds.
3. Clears the retry decision window.
4. Reassesses before restoring concurrency through clean-completion ramps.
5. Hard-stops after three consecutive unsuccessful retry backoffs.

Repeated HTTP 429 responses retain their separate hard circuit breaker. The repaired third segment sustained 100 workers for most of the run and did not stop on timeout retry rate.

## Database Boundary

Direct readback for the zero-cost TLS attempt and all three paid run keys returned:

- `card_visual_description_runs`: `0`
- `card_print_visual_descriptions`: `0`

No descriptions, approvals, embeddings, canonical records, or downstream rows were written.

## Tests

- Agent syntax/import check: passed.
- Visual-agent and importer targeted contracts before launch: `78/78` passed.
- Adaptive retry-backoff contract after repair: `79/79` passed.
- `git diff --check`: passed.
- Full repository suite: not run for this isolated Node/provider harvest.

## Artifact Verification

- Segment 1: `715/715` files verified; manifest SHA-256 `c37f80abeec611a286cca5c732cc8198562b1eacb0e72e14d05678019c027b6d`.
- Segment 2: `1,220/1,220` files verified; manifest SHA-256 `116bd3d2b186fe3be23e35b419a474d54a73a3d3daa67c90da6b747e6eb1f543`.
- Segment 3: `7,837/7,837` files verified; manifest SHA-256 `822c060912fa3e45007cab5b4282b7881f8bcce42c7e23e4d2d3f5d65e8aad59`.
- Combined reconciliation manifest: `5/5` files; manifest SHA-256 `22329b9a052ee3e74ca2c69561cbfd88fc9a01badf49572f91b0c47875f7352c`.
- Bad hashes: `0`.

## Artifacts

Selection:

`docs/audits/card_visual_100_worker_overnight_100usd/2026-07-21T10-53-48.757Z_selection`

Paid segment directories:

- `docs/audits/card_visual_100_worker_overnight_100usd/2026-07-21T10-56-14-142Z_harvest_69d980427f4c`
- `docs/audits/card_visual_100_worker_overnight_100usd/2026-07-21T11-12-27-982Z_harvest_a455ace34eed`
- `docs/audits/card_visual_100_worker_overnight_100usd/2026-07-21T11-38-54-185Z_harvest_d6a3c5fabc26`

Combined reconciliation:

`docs/audits/card_visual_100_worker_overnight_100usd/2026-07-21T13-28-34.820Z_combined_reconciliation`

The combined directory contains the exact 10,000-ID outcome index, exact 273-card unprocessed list, combined telemetry/reconciliation, database boundary readback, and SHA-256 manifest. Full generated payloads remain in their producing segment directories and are referenced from the outcome index without duplicating them.

## Current Truths

- One hundred workers can materially process the catalog: 9,727 durable outcomes were produced in about 2.5 hours including repair gaps.
- Sustained 100-worker operation is viable, but provider rate limits eventually require adaptive reduction and a hard stop.
- The global `$100` user ceiling held.
- Quarantine and image-gap handling remain necessary at scale.
- No generated row is approved or stored in the database.
- Energy cards remain deferred.

## Invariants

- Every continuation must exclude all prior durable IDs and preserve original selection order.
- Global spend must reconcile across every segment, not only within the latest process.
- In-flight cost variance must be reserved and reported.
- Provider 429 and retry circuit breakers must remain enabled.
- Validation failures, image skips, and unprocessed IDs must remain distinct.
- Generated rows remain `pending` or `needs_review` until a separate apply/review gate.

## Why This Remains Derived Intelligence

Scale, validation, and exact reconciliation do not make model observations canonical truth. Fact graphs remain image-derived, evidence-backed, review-routed intelligence. They do not define printing identity, ownership, price, lore, or approval.

## What Must Never Be Broken

- Never silently rerun or duplicate paid card IDs.
- Never spend through a provider circuit breaker.
- Never hide cost variance, transport failures, skipped images, quarantine, or unprocessed rows.
- Never let a dry-run harvest write or approve database rows.
- Never treat shared artwork as proof of variant-specific print markers.
- Never claim the frozen 10,000-card selection is complete while 273 IDs remain unprocessed.

## Explicit Next Gate

Perform one offline-only quarantine repair and replay over the `302` preserved validation failures, then reconcile the repaired rows with the `9,376` original valid rows and `49` image skips. Do not make OpenAI calls or database writes in that gate. Preserve the `273` unprocessed IDs for a separately budgeted future harvest; no additional paid run is authorized under this `$100` envelope.
