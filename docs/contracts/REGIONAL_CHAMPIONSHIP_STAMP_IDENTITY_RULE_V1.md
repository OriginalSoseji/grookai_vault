# REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1

Status: Active
Type: Printed Identity Rule Extension
Scope: English physical Pokemon cards with Regional Championships or Regional Championships Staff printed/stamped tournament identity

## Purpose

Some tournament special-print cards are described by sources as Regional Championships, Spring Regional Championships, Winter Regional Championships, State/Province/Territory Championships, or Staff Regional Championships cards.

These rows must not collapse into a generic `league_stamp` identity when the source evidence exposes a more specific tournament identity.

## Identity Basis

When source evidence explicitly identifies Regional Championships wording, the canonical parent identity is:

```text
underlying base card identity
+ regional-championship printed identity modifier
```

Allowed modifiers:

```text
regional_championships_stamp
regional_championships_staff_stamp
```

Staff and non-Staff rows are separate parent identities.

## Finish Basis

Regional Championships wording and crosshatch wording do not create a child `finish_key` by themselves.

The child printing finish remains the source-backed active finish, such as:

```text
holo
reverse
cosmos
normal
```

Crosshatch is a foil-pattern/source descriptor until a future finish taxonomy explicitly promotes it. It may be preserved in evidence and display metadata, but it must not be inserted as a child finish key unless the active finish taxonomy later allows it.

## Inclusion

This rule applies only when all of the following are true:

1. A source explicitly says Regional Championships, Spring Regional Championships, Winter Regional Championships, State/Province/Territory Championships, or a direct regional-equivalent tournament label.
2. The exact card is resolved by set, card number, and card name.
3. The source distinguishes Staff from non-Staff when Staff wording is present.
4. The active child finish is source-backed and maps to an existing active `finish_key`.
5. No existing parent identity already owns the exact tournament identity.

## Exclusion

Do not apply this rule when:

- the source says only `League`, `Pokemon League`, or another generic league-family label
- the source only proves crosshatch without identifying the tournament/stamp family
- the source mixes Staff and non-Staff wording ambiguously
- sources disagree on the active child finish and the disagreement cannot be resolved deterministically
- the active finish would require inventing a new `finish_key`
- the underlying base parent is unresolved
- there is an existing parent identity collision

## Generic League Stamp Rule

`league_stamp` remains valid only when source evidence proves a generic Pokemon League stamp and does not expose a more specific tournament identity.

If Regional Championships or Staff Regional Championships wording exists, the row must not be collapsed into `league_stamp`.

## Display

Public display labels should preserve the tournament wording.

Examples:

```text
Regional Championships Stamp
Regional Championships Staff Stamp
Spring Regional Championships Stamp
Winter Regional Championships Stamp
```

When crosshatch wording exists, it may be shown as descriptive metadata:

```text
Crosshatch Holofoil Regional Championships promo
```

but the collector-facing finish selector should still use the active child finish until crosshatch has an explicit canonical finish strategy.

## Result

Rows that satisfy this rule may leave generic `league_stamp` source acquisition and enter taxonomy-governed readiness.

This rule does not authorize direct DB writes. It only defines identity strategy for later guarded dry-run packages.
