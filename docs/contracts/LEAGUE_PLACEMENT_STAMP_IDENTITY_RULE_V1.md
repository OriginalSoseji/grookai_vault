# LEAGUE_PLACEMENT_STAMP_IDENTITY_RULE_V1

Status: Active
Type: Printed Identity Rule Extension
Scope: Pokemon League special-print cards whose stamp text includes placement wording

## Purpose

Some Pokemon League special-print cards carry explicit placement wording such as:

- First Place
- Second Place
- Third Place
- Fourth Place

These are not safely modeled as one generic `league_stamp` identity. The placement text is printed identity evidence and must remain visible to collectors.

## Identity Basis

When source evidence explicitly names placement, the canonical parent identity is:

```text
underlying base card identity
+ placement-specific printed identity modifier
```

Allowed placement modifiers:

```text
first_place_league_stamp
second_place_league_stamp
third_place_league_stamp
fourth_place_league_stamp
```

These modifiers are parent identity modifiers. They are not child finish keys.

## Finish Basis

The child printing finish remains the source-backed active finish, such as:

```text
normal
reverse
cosmos
```

The placement stamp does not create a new finish. A row may be inserted only when exact evidence supports:

```text
set + card number + card name + placement stamp + finish
```

## Inclusion

This rule applies only when all of the following are true:

1. A source explicitly says First Place, Second Place, Third Place, or Fourth Place.
2. The underlying base card is uniquely resolved.
3. The target finish is active and source-backed.
4. The base parent already has the target finish available for safe child-finish inheritance, or a separate source-backed finish insertion package has already made that finish available.
5. No existing placement-specific parent identity already owns the target identity.

## Exclusion

Do not apply this rule when:

- the source says only `League`, `Pokemon League`, or another generic league family label
- placement wording is inferred from product context
- the source title contains multiple placement claims that cannot be separated into exact rows
- the base parent lacks the target child finish
- the source supports a finish family that Grookai has not mapped into an active canonical finish key
- there is an existing parent identity collision

## Generic League Stamp Rule

`league_stamp` remains valid only for source evidence that proves a generic Pokemon League stamp and does not expose placement-specific wording.

If placement-specific wording exists, the row must not be collapsed into `league_stamp`.

## Display

Public display labels should preserve the placement wording.

Examples:

```text
First Place League Stamp
Second Place League Stamp
Third Place League Stamp
Fourth Place League Stamp
```

## Result

Rows that satisfy this rule may leave stamp-label granularity review and enter the normal guarded readiness pipeline as placement-specific parent identity candidates.

This rule does not authorize direct DB writes. It only defines identity strategy for later guarded dry-run packages.
