# Pricing Freshness Contract V1

## Canonical Pricing Surface

All user-facing pricing reads from:

`v_grookai_value_v1`

## Freshness Model

Cards are refreshed based on tiered TTL rules.

### Tier A — Hot / high demand

Conditions:
- `listing_count` between `1` and `10`
- or `vault_count >= 10`
- or `grookai_value_nm >= 100`

Refresh window:

- 6 hours

### Tier B — Normal activity

Conditions:
- not Tier A
- and (`listing_count` between `11` and `25` or `vault_count >= 3` or `grookai_value_nm >= 25`)

Refresh window:

- 24 hours

### Tier C — Long tail

Conditions:
- not Tier A or Tier B
- and (`listing_count > 25` or `vault_count > 0` or `grookai_value_nm is not null`)

Refresh window:

- 72 hours

### Tier D — Cold catalog

Conditions:
- cached active pricing exists
- and none of the Tier A / B / C signals apply

Refresh window:

- 7 days

### No Cached Active Price

If a card has no `ebay_active_prices_latest` freshness timestamp, it is treated as stale and may enqueue immediately if the queue guards pass.

## Cooldown Rule

A card cannot enqueue another refresh job if:

`last_job_requested_at < cooldown_window`

Cooldown window:

- 2 hours

## Open Job Rule

Before enqueueing a job:

Check `pricing_jobs`.

If any job exists with:

- `status IN ('pending', 'running')`
- and the same `card_print_id`

Then do not enqueue.

## Budget Model

Conceptual daily API budget split:

- 50% reserved for user-demand refresh
- 30% scheduled refresh
- 20% backfill

Budget enforcement is not implemented in V1.

## Trigger Types

Three pricing triggers exist in V1:

- `live_price_request`
- `scheduled_refresh`
- `backfill_v1`

Priority order:

- `user > scheduled > backfill`

## UI Behavior

All product surfaces display cached GV price immediately.

Live refresh occurs asynchronously.

UI must never block on upstream API calls.

## Guard Summary

`pricing-live-request` may create a job only when all of the following are true:

- cached active price is stale for the card’s freshness tier, or no cached active price exists
- no open `pending` or `running` job exists for the same `card_print_id`
- the last pricing job request for that `card_print_id` is outside the 2-hour cooldown window
