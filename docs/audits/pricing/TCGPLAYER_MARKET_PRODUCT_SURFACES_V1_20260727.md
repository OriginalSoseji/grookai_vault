# TCGPlayer Market Product Surfaces V1 - 2026-07-27

## Producing State

- Branch: `pricing/mee-productization-v1`
- Base commit: `cfe925fa`
- Database: isolated local Supabase
- Production writes: none

## Scope

This integration slice routes supported collector-facing price reads through
the governed TCGPlayer Market V1 contract.

Covered surfaces:

- web Card Detail pricing rail
- web exact-printing Market History
- web Search, Explore, Sets, and Vault through their existing shared helpers
- Flutter card grids, Card Detail, Vault, Sets, Collector, and Network through
  the existing shared service
- Flutter Compare
- live-price request freshness classification

## Boundary Decisions

- The headline remains the qualified TCGPlayer `marketPrice`.
- A parent card may show a clearly labeled from-price.
- Card Detail loads parent and exact-printing rows in one signed-in request.
- Market History selects one exact printing and never blends printings.
- eBay active asks remain a separate availability lane.
- The live-price request may use TCGPlayer Market as a freshness/value anchor,
  but it does not publish or alter the market close.
- No supported product surface reads `v_best_prices_all_gv_v1`.

## Local Readback

The existing local publication smoke fixture was read through both governed
RPCs:

- card print: `3458295b-e7d1-4926-af9f-a931ba49be54`
- card printing: `1fe3c8d3-1ec7-41f0-9cdc-9f64c4cecb9a`
- parent read: `$12.34`, `tcgplayer`, `fresh`
- exact-printing read: `$12.34`, `tcgplayer`, `fresh`
- 30-day exact-printing history rows: `1`
- history source label: `TCGPlayer Market`

## Verification

- web TypeScript typecheck: passed
- web lint: passed
- focused Flutter analysis: passed
- Deno edge-function check: passed
- pricing bridge and variant-aware contracts: `17/17` passed
- repository diff check: passed
- full repository Node contracts: `731/731` passed
- runtime health, quarantine, and deferred reports: passed
- strict Next.js production build: passed
- full Flutter analysis: passed
- full Flutter suite: `302/302` passed
