# MTG Sealed Pricing Refresh V1

**Status:** Read-only candidate

**Date:** 2026-09-04

## Purpose

Define a repeatable pricing refresh for the existing exact English MTG sealed
catalog without rebuilding canonical identity or granting publication
authority.

## Inputs

- existing exact TCGPlayer sealed variant mappings;
- the latest completed current-full-sync warehouse authority;
- latest price observations by exact source product and subtype;
- the current frozen MTG sealed release and exact qualification rows;
- the frozen Gate A image-eligible variant set.

## Qualification

A proposed member must have an active current exact mapping, exactly one
`normal` source lane, a positive USD `market_price`, an observation no more
than seven days older than the source authority, and membership in the frozen
Gate A image-eligible set. Low, mid, high, inferred, cross-product, and
non-normal fallbacks are forbidden.

The warehouse authority itself must be no more than two days old at execution.
This prevents an internally fresh observation from masking a stopped source
pipeline.

## Delta Model

Every existing canonical variant receives one deterministic disposition:

- `added`
- `removed`
- `price_changed`
- `observation_refreshed_same_price`
- `unchanged`
- `held`

Qualification holds remain explicit, including missing observations, stale
prices, inactive source products, non-USD prices, ambiguous lanes, and missing
Gate A image coverage.

## Anomaly Stops

The read-only gate blocks before any future write plan when the source authority
is stale, canonical/current rows are duplicated or orphaned, the proposed
release is empty, more than ten percent of current members would be removed,
or more than eighty percent of qualified rows change price in one run.

## Execution Boundary

The workflow and audit use one repeatable-read read-only database transaction.
They produce artifacts only. They have no provider-call, Storage, pricing,
release-pointer, visibility, Vault, migration, canonical, or database-write
authority. A successful audit does not authorize applying its projected delta.

## Exact Next Gate

Run the read-only audit from an exact merged clean SHA. If it reconciles without
findings, preserve the live evidence and separately design rollback-proven,
compare-and-swap release application. Do not activate it with this contract.
