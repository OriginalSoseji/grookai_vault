# Grookai Signature Roadmap V1

Status: future project. Not part of the card visual description agent v1 implementation.

Grookai Signature is the future personalization layer that explains how a collector's taste evolves over time. It should feel personal and collectible without reducing the collector to a single favorite Pokemon, set, or price bracket.

## Product Idea

Every collector develops a unique collecting signature over time.

Early copy:

```text
We're still learning your Signature.
```

Later copy:

```text
Your Signature has evolved.
```

The experience should help a collector recognize patterns in their collecting behavior and receive better recommendations because Grookai understands what they visually, economically, and behaviorally gravitate toward.

## Signature Dimensions

### Visual Signature

Derived from approved visual-description rows, semantic tags, and user interactions with visually described cards.

Examples:

- Warm palettes
- Storybook compositions
- Food scenes
- Cozy interiors
- Rain
- Domestic Pokemon
- Illustration Rares

### Market Signature

Derived from collection, wishlist, pricing, scarcity, and market behavior signals.

Examples:

- Vintage
- Low population
- Japanese promos
- Artist collections
- High-condition copies
- Sealed-adjacent interest

### Collector Signature

Derived from behavior over time, without making the product feel judgmental or manipulative.

Examples:

- Trades often
- Never sells
- Buys artist collections
- Completes visual themes
- Saves cards before buying
- Prefers exact-copy memories over public sharing

## Product Boundaries

- Grookai Signature is not part of the visual-description agent v1.
- The visual-description agent should only create versioned card-level visual intelligence.
- Signature should consume approved downstream signals later; it should not change canonical identity.
- Signature must not expose private behavior in public profiles unless a separate explicit sharing design exists.
- Signature copy should avoid pressure, gamification guilt, or rank language.
- Signature should explain recommendations, not override exact identity evidence.

## Future System Shape

```text
Canonical card identity
        +
Approved visual descriptions
        +
Collector interactions
        +
Market and scarcity signals
        ↓
Grookai Signature
        ↓
Personalized discovery, taste explanations, and recommendations
```

The important distinction is that Grookai Signature is collector-level personalization, while card visual descriptions are card-level derived intelligence.

## Success Criteria For A Future Build

- A new collector sees honest learning-state copy, not fake certainty.
- An active collector sees stable but evolving visual, market, and behavior themes.
- Recommendations can explain why a card fits their Signature.
- Private behavior remains private by default.
- Signature data is derived, versioned, and reversible.
- The system never claims a collector's taste is fixed.
