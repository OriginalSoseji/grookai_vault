# Pricing Checkpoint 21: TCGPlayer Market Read Performance

## Context

The exact 100-printing signed-in canary was active while Production V1
readiness work continued. The shared pricing RPC was functionally correct and
used by both web and Flutter, but its original implementation joined broad
listing-evidence views before restricting the query to requested cards.

The production listing warehouse contains millions of rows. A one-card request
therefore exceeded the PostgREST statement timeout even though the customer
needed only one current price.

## Problem

The original read path coupled customer latency to the size of the raw listing
warehouse:

- one parent detail request took approximately `25.7` seconds in direct
  production testing
- one exact-printing detail request took approximately `26.2` seconds
- a PostgREST detail request timed out with PostgreSQL code `57014`
- parent summaries scanned broad listing evidence to calculate the optional
  active-ask signal

The price contract was correct, but it was not production-usable.

## Risk

- card detail, search, set grids, and vault totals could time out
- warehouse growth would continuously worsen customer latency
- dropping the active-ask lane would violate the governed product contract
- computing active asks inline would make ordinary price reads depend on eBay
  warehouse health
- changing the shared RPC contract could create divergent web and Flutter
  behavior
- deploying new scheduler code during the active 72-hour canary would destroy
  same-SHA operational provenance

## Decision

Customer reads must never scan the raw listing warehouse.

Migration `20260728060000_tcgplayer_market_read_model_performance_v1.sql`:

- creates request-scoped current-price and latest-decision work
- adds the indexed
  `mv_market_listing_active_ask_current_v1` materialized snapshot
- preserves the existing `get_market_pricing_read_model_v1(uuid[], uuid[])`
  signature and response contract
- keeps TCGPlayer Market and available-today active ask as separately labeled
  evidence
- grants the shared RPC to `authenticated` and `service_role`
- denies the shared RPC to `anon`
- grants direct materialized-view reads only to `service_role`

The active-ask snapshot is refreshed by a separate governed worker. The
scheduler integration exists in repository code, but the production scheduler
checkout remains frozen at the run-producing canary SHA until the 72-hour
window completes.

## Alternatives Rejected

- removing the active-ask fields from the product contract
- increasing the PostgREST statement timeout
- scanning raw listing evidence in every detail or batch request
- creating separate price implementations for web and Flutter
- returning cached application memory without database provenance
- deploying later pipeline code into the frozen canary scheduler checkout
- accepting detail-only performance while leaving grid and vault batches
  unmeasured

## Migration Applied

The linked production ledger was in exact parity through
`20260728050000`. Only `20260728060000` was pending.

`supabase db push --linked` applied the single migration successfully in
`46` seconds. Production ledger readback then showed local/remote parity
through `20260728060000`.

Migration-producing commit:

`fde6f6db675c4ca72d2eac9ac38ed9ad4467e6ec`

## Schema And Security Readback

Production readback proved:

- the active-ask relation exists with PostgreSQL relation kind `m`
- the unique exact-printing index exists
- the parent lookup index exists
- the optimized function references the materialized active-ask relation
- the function contains request-scoped parent and printing CTEs
- the function is `SECURITY DEFINER`
- `authenticated`: RPC execute granted, snapshot select denied
- `service_role`: RPC execute and snapshot select granted
- `anon`: RPC execute and snapshot select denied

The snapshot contained `0` rows at readback because no exact active-listing
evidence met the current 72-hour freshness window. This is valid absence, not
fabricated availability.

## Performance Result

The production audit executed:

- `3` warmups per case
- `30` measured requests per case
- `6` representative detail and batch cases
- `180` measured PostgREST requests total

All cases passed the `p95 <= 500 ms` requirement:

| Case | IDs | p50 ms | p95 ms | Errors |
| --- | ---: | ---: | ---: | ---: |
| parent detail | 1 | 82.100 | 85.968 | 0 |
| parent grid | 25 | 84.064 | 98.581 | 0 |
| all current parents | 99 | 87.524 | 108.263 | 0 |
| printing detail | 1 | 81.922 | 87.986 | 0 |
| printing batch | 50 | 85.002 | 90.533 | 0 |
| all current printings | 100 | 88.953 | 106.880 | 0 |

There were:

- `0` request errors
- `0` row-count mismatches
- `0` failed cases

The same RPC also returned the expected row counts under the direct
`authenticated` database role. HTTP timings use the service credential to
measure the exact production PostgREST transport and are not represented as an
end-user JWT timing claim.

## Canary Boundary Proof

The post-migration canary observation remained healthy:

- current exact prices: `100`
- current parent cards: `99`
- positive USD prices: `100`
- missing provenance: `0`
- broken trace rows: `0`
- current publication set unchanged:
  `ad858441-036d-4ec5-ad06-42d9936c7534`
- current publication run unchanged:
  `87b13fc1-3639-47cb-843f-2f5d8b29d3b0`
- anonymous runtime denied with `42501`
- source health: `healthy`
- terminal alerts: `0`

At observation time only `1.131` of the required `72` hours had elapsed.
This checkpoint does not claim the canary time gate has passed.

## Current Truths

- the shared production pricing RPC now satisfies the Product V1 performance
  target for detail and representative batch reads
- customer reads no longer scan the raw listing warehouse
- web and Flutter retain one shared database contract
- exact TCGPlayer Market publication remains unchanged
- unavailable active-ask evidence remains null rather than guessed
- the canary scheduler remains frozen at
  `c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d`
- fixed-denominator coverage remains `90.712%`, below the `95%` gate
- the 72-hour canary window remains active

## Invariants

1. Product reads never scan raw listing warehouse tables or broad listing
   aggregation views.
2. TCGPlayer Market and available-today active asks remain separately labeled.
3. Absence of a fresh active ask remains null, never zero or fabricated.
4. The shared RPC signature and client-facing semantics remain stable.
5. Anonymous pricing remains denied until the licensing/display gate passes.
6. Snapshot refresh is a governed background operation with explicit artifacts.
7. Performance changes cannot alter the current publication pointer or price
   provenance.
8. The frozen canary scheduler SHA cannot be replaced during its 72-hour
   observation window.

## What Must Never Be Broken

- exact card, language, printing, and finish authority
- source-to-client provenance
- TCGPlayer Market as the Product V1 closing-price authority
- the separate active-ask evidence lane
- authenticated versus anonymous access boundaries
- one shared pricing read contract across clients
- deterministic publication and rollback behavior
- truthful reporting of the still-failed coverage and time gates

## Evidence

Permanent performance and migration audit:

`docs/audits/pricing/mee_pricing_platform_production_v1/read_performance_gate/2026-07-28T09-47-20-239Z`

Post-migration canary observation:

`docs/audits/pricing/mee_pricing_platform_production_v1/canary_observation/2026-07-28T09-49-08-044Z`

Both directories contain SHA-256 artifact hashes.

## Explicit Next Gate

Keep the exact 100-printing canary and its scheduler SHA unchanged through
`2026-07-31T08:40:15.793Z`.

In parallel, repair at least `1,474` exact Production V1 mapping/finish gaps,
starting with the highest-yield modern sets, then run a new full shadow cycle
and rerun the fixed coverage policy.

Do not expand to the full eligible signed-in catalog until:

- the 72-hour canary observation gate passes
- fixed-denominator coverage reaches at least `95%`
- source-to-client reconciliation remains exact

Do not enable anonymous pricing until TCGPlayer licensing, attribution, and
display authority are recorded and verified.
