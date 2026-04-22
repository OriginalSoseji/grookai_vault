# PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1

Status: ACTIVE
Type: Printed Identity Rule Extension
Scope: Prize Pack rows that explicitly print a `Prize Pack Series N` marker

## Purpose

Generic Prize Pack family rows remain blocked when the source only says the card
came from Prize Pack. That family hint is not enough by itself.

This rule activates only when the row carries an explicit series marker such as:

- `Prize Pack Series 1`
- `Prize Pack Series 2`

That explicit printed marker is identity-bearing and may become the stamped
modifier once the underlying base card is proven.

## Identity Basis

The stamped identity is:

- unique underlying base canonical row
- plus deterministic series-marker `variant_key`

Examples:

- `prize_pack_series_1_stamp`
- `prize_pack_series_2_stamp`

## Underlying Base Resolution

The base card is resolved from:

1. stripped base printed name
2. printed number
3. printed total when present

The route must reduce to exactly one canonical base row.

## Inclusion

A Prize Pack row is eligible only when:

1. the printed row includes an explicit `Prize Pack Series N` marker
2. the stamped modifier is already resolved deterministically
3. the underlying base match is unique

## Exclusion

This rule does not activate for:

- family-only Prize Pack source rows with no explicit series marker
- rows whose base route is still ambiguous

Those rows remain outside the ready queue until stronger printed evidence is captured.

## Result

Prize Pack rows with an explicit printed series marker may move from manual review
to the stamped ready queue without widening to the much larger family-only Prize Pack pool.
