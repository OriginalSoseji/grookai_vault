# MEE-11V Adaptive Acquisition Yield Offline Replay

## Decision

The acquisition scheduler must optimize actual provider calls and unique usable evidence, not the count of statically planned pages.

The current 4,000-call run consumed the full request budget but fetched only 284,384 rows from an 800,000-row theoretical envelope. The loss was caused by an inefficient strategy mix and static pagination:

- `set_shelf_broad`: 815 calls, 157,997 rows, 193.86 rows/call.
- `set_shelf_singles`: 509 calls, 91,119 rows, 179.02 rows/call.
- `variant_finish`: 2,150 calls, 34,309 rows, 15.96 rows/call.
- `set_shelf_slabs`: 246 calls, 959 rows, 3.90 rows/call.
- `set_shelf_language`: 140 calls, zero rows.
- `set_shelf_sealed`: 140 calls, zero rows.

## Repair

`MEE_11V_MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_V1` adds:

- a 4,000-call hard provider ceiling independent of candidate count;
- a planning pool deeper than the provider-call budget;
- 90% discovery and 10% precision call budgets, with spillover when a lane is exhausted;
- provider-total, short-final-page, zero-result, and exact repeated-page stopping;
- replacement candidates when a page is skipped;
- a separate `skipped_requests.jsonl` artifact that is never treated as a provider response or backfill input;
- removal of language, sealed, and slab shelf templates from the single-card category plan;
- separate reporting for raw rows, unique listings, fill rate, calls, skips, retries/errors, strategies, and lanes.

The precision lane remains protected because a low-row exact-printing query can still be more useful than a broad result page.

## Offline Evidence

Production source artifact:

`/var/lib/grookai/mee/audits/mee_11l_market_listing_acquisition_daily_batch_fetch_2026-08-03T14-57-55-083Z/raw_snapshots.jsonl`

The offline replay made no provider calls and no database writes.

| Metric | Current run | MEE-11V projection |
| --- | ---: | ---: |
| Provider calls | 4,000 | 4,000 ceiling |
| Theoretical envelope | 800,000 | 800,000 |
| Fetched rows | 284,384 | 714,081 |
| Envelope fill | 35.55% | 89.26% |
| Unique listings | 232,630 | 584,128 estimated |
| Discovery calls | 1,324 | 3,600 |
| Precision calls | 2,150 | 400 |

The unique-listing projection applies the prior run's observed overlap ratio. It is an estimate, not a promise; actual unique yield is bounded by available live inventory and overlap between set queries.

The existing request mix contained:

- 338 pagination calls that the adaptive state machine would have skipped after prior page evidence;
- 526 low/zero-yield shelf calls producing only 959 rows;
- 2,276 calls that the proposed policy reallocates to high-yield discovery.

## Candidate Depth Proof

The prior dry-run target payload was regenerated through the repaired planner without provider calls:

- 7,031 frozen candidates;
- 5,831 discovery candidates;
- 1,200 precision candidates;
- 3,600 discovery call ceiling;
- 400 precision call ceiling;
- zero disabled shelf strategies;
- no provider calls or database writes.

This provides enough replacement depth for observed exhaustion rates while retaining a hard 4,000-call maximum.

## Artifacts

Ignored machine-readable artifacts remain in the local audit directory under repository convention:

- `mee_11v_adaptive_yield_replay_2026-08-03.json`
  - SHA-256: `19fd4b52f28f4567f226a406001e43082286e3b3df790f4f9a9b908d44225e39`
- `mee_11v_adaptive_candidate_replay_2026-08-03.json`
  - SHA-256: `bf2f9e97a7336081770d32f4199cba1806cd70587d73501f0e815d46859a2185`

## Boundaries

- No eBay provider calls were made for this repair or replay.
- No database writes occurred.
- No production worker, timer, service, migration, pricing read model, or app surface changed.
- The 800,000 value is a theoretical row envelope, not 800,000 API calls and not a guaranteed unique-listing count.

## Next Gate

Run a bounded 200-call provider canary from a frozen commit using the adaptive candidate plan and local artifacts only. Require:

- no more than 200 actual provider calls;
- no database writes;
- skipped pages replaced by later candidates;
- exact reconciliation across attempted, skipped, failed, fetched, and unprocessed candidates;
- no disabled shelf strategies;
- both discovery and precision lanes represented;
- raw and unique yield reported separately;
- no repeated final-page rows accepted into projected observations.

Only after that canary reconciles should MEE-11V be considered for the 4,000-call nightly worker.
