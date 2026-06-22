# PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1

Status: Active
Type: Printed Identity Rule Extension
Scope: English physical Pokemon cards with Play! Pokemon logo, Pokemon League, or Player Rewards stamped/crosshatch identity

## Purpose

Some special-print cards are described by sources with overlapping wording:

- Play! Pokemon Logo stamp
- Pokemon League stamp
- Player Rewards Program
- crosshatch pattern from League or Player Rewards distribution

These rows need explicit source governance so Grookai does not collapse distinct identity families or invent child finishes.

## Identity Basis

When source evidence explicitly identifies the printed identity, the canonical parent identity is:

```text
underlying base card identity
+ source-backed printed identity modifier
```

Allowed modifiers include:

```text
play_pokemon_stamp
player_rewards_crosshatch_stamp
league_stamp
```

Use the most specific source-backed modifier available.

## Finish Basis

The child printing finish remains the active source-backed finish:

```text
normal
holo
reverse
cosmos
```

Crosshatch is a foil-pattern/source descriptor until a future finish taxonomy explicitly promotes it. It may be preserved in evidence and display metadata, but must not be inserted as a child finish key.

## Inclusion

This rule applies only when all of the following are true:

1. The exact card is resolved by set, card number, and card name.
2. A source explicitly identifies Play! Pokemon, Pokemon League, Player Rewards, or equivalent printed/stamped wording.
3. The active child finish is source-backed and maps to an existing active `finish_key`.
4. The modifier chosen is the most specific wording supported by the sources.
5. No existing parent identity already owns the exact printed identity.

## Exclusion

Do not apply this rule when:

- the source only proves generic crosshatch without source/distribution wording
- the source wording conflicts between Play! Pokemon, Player Rewards, and generic League in a way that cannot be resolved deterministically
- the active finish would require inventing a new `finish_key`
- the underlying base parent is unresolved
- there is an existing parent identity collision

## Synonym Handling

Source wording may vary:

```text
Play! Pokemon Logo
Play Pokemon Logo
Pokemon League stamp
Player Rewards Program
```

These may be treated as synonym candidates only when the source evidence and surrounding set/card context do not expose a more specific tournament identity.

If source evidence names City, State, Regional, National, or placement-specific tournament wording, use the corresponding championship or placement identity rule instead.

## Display

Public display labels should preserve the source-backed wording.

Examples:

```text
Play! Pokemon Stamp
Player Rewards Crosshatch Stamp
League Stamp
```

When crosshatch wording exists, it may be shown as descriptive metadata:

```text
Crosshatch Play! Pokemon promo
```

but the collector-facing finish selector should still use the active child finish until crosshatch has an explicit canonical finish strategy.

## Result

Rows that satisfy this rule may leave broad source acquisition and enter taxonomy-governed readiness.

This rule does not authorize direct DB writes. It only defines identity strategy for later guarded dry-run packages.
