# EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1

Status: ACTIVE
Type: Printed Identity Rule Extension
Scope: explicit event, prerelease, and prerelease-kit overlays that do not name a routed set directly

## Purpose

Some stamped rows already satisfy `STAMPED_IDENTITY_RULE_V1` because the overlay
itself is explicit:

- `Prerelease`
- `Staff`
- `SDCC 2007 Staff`

What remained missing was a deterministic base route when the overlay did not
also name the underlying set.

This rule closes that gap only when the printed evidence uniquely identifies one
underlying canonical base row.

## Identity Basis

The stamped identity remains:

- unique underlying base canonical row
- plus the existing stamped `variant_key`

Examples:

- `prerelease_stamp`
- `staff_prerelease_stamp`
- `sdcc_2007_staff_stamp`

## Base Route Rule

When the overlay does not name a set directly, the base row may be resolved from:

1. stripped base printed name
2. printed number
3. printed total

This route is lawful only if it reduces to exactly one canonical row across all sets.

## Inclusion

This rule applies only when:

1. the overlay marker is explicit and already parsed
2. the base row is unique by stripped name plus printed number and total

## Exclusion

Do not apply this rule when:

- multiple canonical rows still match
- the printed total is missing and uniqueness cannot be proven
- the source only suggests a family or product context without an explicit overlay phrase

## Result

Explicit event and prerelease overlays can leave manual review once the global
printed-evidence route proves a unique base row.
