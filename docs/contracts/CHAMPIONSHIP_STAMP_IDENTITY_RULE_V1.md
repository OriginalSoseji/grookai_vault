# CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1

Status: Active
Type: Printed Identity Rule Extension
Scope: English physical Pokemon cards with City, State, National, or Staff Championship printed/stamped tournament identity

## Purpose

Some tournament special-print cards are described by sources as City Championships, State Championships, National Championships, or Staff Championship cards.

These rows must not collapse into generic `league_stamp` when source evidence exposes a more specific tournament identity.

## Identity Basis

When source evidence explicitly identifies City, State, or National Championships wording, the canonical parent identity is:

```text
underlying base card identity
+ championship printed identity modifier
```

Allowed modifiers:

```text
city_championships_stamp
city_championships_staff_stamp
states_championships_stamp
states_championships_staff_stamp
national_championships_stamp
national_championships_staff_stamp
```

Staff and non-Staff rows are separate parent identities.

## Finish Basis

Championship wording does not create a child `finish_key` by itself.

The child printing finish remains the source-backed active finish, such as:

```text
normal
holo
reverse
cosmos
```

Crosshatch, mirror pattern, and stamp text may be preserved as evidence/display metadata, but they are not child finish keys unless the active finish taxonomy later allows them.

## Inclusion

This rule applies only when all of the following are true:

1. A source explicitly says City Championships, State Championships, National Championships, or equivalent Staff Championship wording.
2. The exact card is resolved by set, card number, and card name.
3. Staff and non-Staff wording are distinguishable.
4. The active child finish is source-backed and maps to an existing active `finish_key`.
5. No existing parent identity already owns the exact tournament identity.

## Exclusion

Do not apply this rule when:

- the source says only `League`, `Pokemon League`, or generic league-family wording
- the source only proves crosshatch without identifying the championship/stamp family
- Staff and non-Staff wording are mixed ambiguously
- sources disagree on the active child finish and the disagreement cannot be resolved deterministically
- the active finish would require inventing a new `finish_key`
- the underlying base parent is unresolved
- there is an existing parent identity collision

## Generic League Stamp Rule

`league_stamp` remains valid only when source evidence proves a generic Pokemon League stamp and does not expose a more specific tournament identity.

If City, State, National, or Staff Championship wording exists, the row must not be collapsed into `league_stamp`.

## Display

Public display labels should preserve the tournament wording.

Examples:

```text
City Championships Stamp
City Championships Staff Stamp
State Championships Stamp
State Championships Staff Stamp
National Championships Stamp
National Championships Staff Stamp
```

## Result

Rows that satisfy this rule may leave generic `league_stamp` source acquisition and enter taxonomy-governed readiness.

This rule does not authorize direct DB writes. It only defines identity strategy for later guarded dry-run packages.
