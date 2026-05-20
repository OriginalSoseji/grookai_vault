# INTERACTION_HIERARCHY_V1

## Purpose

Define what visually matters most across Grookai Vault so future polish does not accidentally make secondary metadata louder than collector identity and ownership.

## Default Priority Order

1. Card identity
2. Selected finish / variant
3. Ownership state
4. Primary interaction / action
5. Price
6. Cameo or search context
7. Metadata
8. Secondary diagnostics

## Rules

### Card Identity

Card name, image, set, and number are always the anchor of a card surface.

Identity must not be visually displaced by:

- price
- badges
- cameo labels
- diagnostics
- warehouse/image status

### Selected Finish / Variant

When a finish or child printing is selected, the selected version should be visible near the card identity and repeated near actions when needed.

Selected finish labels may be visually strong, but must not replace parent card identity.

### Ownership State

Ownership should be clearer than price.

Examples:

- Owned
- Missing
- In vault
- Finish not selected
- Owned: 1

### Actions

Primary action controls should be discoverable and stable. Actions should not shift layout after data loads.

### Price

Pricing is supporting context unless the page is explicitly a pricing view.

Price should not visually overpower:

- card name
- owned/missing state
- selected finish

### Cameo / Search Context

Cameo labels explain why a search result matched. They are not card identity.

Allowed:

- compact label
- secondary chip
- muted context row

Not allowed:

- replacing card name
- appearing as a primary badge above card identity
- changing card route identity

### Metadata

Rarity, artist, release date, source, and diagnostics should support inspection without crowding repeated cards.

### Secondary Diagnostics

Diagnostics include image fallback, source state, deferred debt, and review status. They should be visible only when useful and visually quiet by default.

## Verification Questions

Before shipping UI polish, each changed surface should answer:

- Can the user identify the card in under one second?
- Can the user identify selected finish/variant without reading diagnostics?
- Is owned/missing state clearer than price?
- Are cameo labels visibly secondary?
- Are actions stable and obvious?
- Does mobile preserve the same priority order?

