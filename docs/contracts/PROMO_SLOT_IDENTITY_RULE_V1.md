# PROMO_SLOT_IDENTITY_RULE_V1

Status: ACTIVE
Type: Printed Identity Routing Contract
Scope: source-backed stamped promo-family rows with slash-number printed identity

## Rule

When all of the following are true:

1. the source-backed candidate comes from `black-and-white-promos-pokemon`
2. the declared source-family set code is `bwp`
3. the printed identity uses slash numbering such as `12/99`
4. the stamped identity rule resolved the row as `RESOLVED_STAMPED_IDENTITY`
5. stamped evidence carries a `PROVEN` underlying base row with a different live `set_code`

then canonical routing must use the proven underlying base `set_code` for identity-slot
audit, staging, and executor planning.

## Invariants

- `BW12` and `12/99` are not the same printed identity.
- Black Star promo slot codes such as `BW12` remain authoritative for true promo-slot rows.
- Slash-number stamped promo-family rows must not collapse onto occupied `BW##` promo slots.
- Source-family provenance remains on the warehouse candidate, but canonical routing follows the
  proven underlying base row.

## Examples

- `black-and-white-promos-pokemon / Arcanine / 12/99 / prerelease_stamp`
  - declared source-family set: `bwp`
  - proven underlying base set: `bw4`
  - lawful routing target: `bw4`

- `black-and-white-promos-pokemon / Tropical Beach / BW28 / worlds_11_staff_stamp`
  - printed identity is already a true promo-slot row
  - lawful routing target remains `bwp`

## Non-Goals

This contract does not:

- redesign global promo identity
- rewrite canonical rows
- auto-promote stamped rows
- widen beyond the bounded promo-slot conflict class proved in `STAMPED_BASE_REPAIR_V1`
