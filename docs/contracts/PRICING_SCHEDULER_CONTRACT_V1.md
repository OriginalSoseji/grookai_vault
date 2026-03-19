# Pricing Scheduler Contract V1

## Purpose

The Grookai Pricing Scheduler maintains freshness for important cards that already have pricing.

It runs on the VPS backend highway and enqueues jobs into `pricing_jobs`.

It does not fetch market data itself.

## Responsibilities

The scheduler has one responsibility:

- maintain freshness of important cards that already have pricing

The scheduler must not:

- fetch listings
- recompute prices
- bypass freshness rules
- bypass cooldown rules
- exceed API budget

The scheduler only inserts jobs into `pricing_jobs`.

## Canonical Pipeline

The scheduler feeds the existing pricing pipeline:

`pricing_jobs`
`-> pricing_job_runner_v1`
`-> ebay_browse_prices_worker`
`-> ebay_active_price_snapshots`
`-> ebay_active_prices_latest`
`-> card_print_price_curves`
`-> card_print_active_prices`
`-> v_grookai_value_v1`

## Trigger Type

Scheduler jobs use:

- `reason = scheduled_refresh`
- `priority = scheduled`

Priority order:

- `user > scheduled > backfill`

## Scheduler Input Data

Scheduler candidate selection uses:

- `card_print_active_prices.updated_at`
- `ebay_active_prices_latest.listing_count`
- `v_grookai_value_v1.grookai_value_nm`
- `vault_items.qty`

These fields determine:

- freshness
- importance
- tier

## Freshness Eligibility

Scheduler V1 only targets cards that already have an active price.

Meaning:

- a `card_print_active_prices` row exists

Scheduler V1 does not price cards with no price yet.

Coverage expansion remains the responsibility of `backfill_v1`.

## Staleness Rules

Scheduler reuses the freshness tiers defined in:

- `docs/contracts/PRICING_FRESHNESS_CONTRACT_V1.md`

Tier refresh windows:

- `hot` -> 6 hours
- `normal` -> 24 hours
- `long_tail` -> 72 hours
- `cold_catalog` -> 7 days

A card becomes scheduler-eligible when:

- `current_time - updated_at > tier TTL`

## Scheduler Run Frequency

Scheduler execution cadence:

- every 15 minutes

Each run may enqueue a limited number of jobs.

Default limit:

- 100 jobs per run

This prevents queue flooding.

## Job Guardrails

Before enqueueing a scheduler job, the scheduler must verify:

1. No open job exists for the same `card_print_id`
2. The most recent job request is older than the cooldown window
3. Scheduler budget is still available for the current day

Open-job rule:

- check `pricing_jobs`
- if `status IN ('pending', 'running')` for the same `card_print_id`, do not enqueue

Cooldown rule:

- last job request must be older than 2 hours

Budget rule:

- scheduler must not enqueue beyond its share of the daily API budget

## Importance Ranking

When choosing among eligible candidates, scheduler ordering is:

1. `vault ownership count DESC`
2. `grookai_value_nm DESC`
3. `listing_count ASC`
4. `updated_at ASC`

This prioritizes:

- cards users own
- high-value cards
- thin markets
- oldest prices

## Daily API Budget Model

Conceptual daily API limit:

- 5000 API calls

Budget allocation:

- 50% user-demand refresh
- 30% scheduler refresh
- 20% backfill

Budget enforcement is active at the Browse client boundary and scheduler enqueue boundary.

Current operational env defaults:

- `EBAY_BROWSE_DAILY_BUDGET=4200`
- `EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT=3`
- `PRICING_JOB_MIN_START_DELAY_MS=45000`

## Failure Handling

If the pricing worker fails, the job status becomes:

- `failed`

Scheduler does not retry failed jobs automatically.

Retry behavior remains the responsibility of the existing runner logic.

## VPS Deployment Model

Scheduler runs on the VPS alongside the pricing worker.

Recommended deployment models:

- systemd timer
- cron job
- long-running loop process

Scheduler must remain a separate process from the pricing worker.

## Operating Principle

Scheduler is an orchestration layer only.

It decides which already-priced cards should be refreshed and inserts guarded jobs into `pricing_jobs`.

It does not change pricing algorithms, pricing workers, or pricing storage lanes.
