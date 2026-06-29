# MEE Public Price Bridge V1

Status: app-facing authenticated read bridge

This contract is the first app-facing pricing bridge from the Market Evidence Engine.

It exposes only approved internal raw-single active-listing estimates. It does not expose sold comps, reference API prices, slabs, special lanes, or provider truth.

## Public Wording

The app may describe these values as:

- "Market estimate from active listing evidence"
- "Active listing evidence"

The app must not describe them as:

- sold price
- verified sale
- market truth
- guaranteed value

## Eligibility

A row may enter the bridge only when it:

- exists in `v_market_evidence_internal_approved_price_signals_v1`
- is `source_type = active_listing`
- is `evidence_lane = raw_single`
- is USD
- has a signal less than 14 days old
- has no internal public-boundary flags set

## Excluded

Reference APIs, slabs, promos, MEP, McDonald's, World Championship, Trainer Kit, Base print-run lanes, high-value/manual-review rows, and stale rows remain held.

## Boundary

This bridge creates read-only views. It does not write `pricing_observations`, `ebay_active_prices_latest`, identity tables, vault tables, or image tables.
