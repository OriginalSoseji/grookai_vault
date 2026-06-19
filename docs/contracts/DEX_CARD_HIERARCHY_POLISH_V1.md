# DEX_CARD_HIERARCHY_POLISH_V1

## Goal

Make the Dex landing list feel like a premium Pokemon completion tracker, not a database row list.

The species card must make the collector value obvious:

```text
0 / 28 printings collected
```

is the primary information, while Dex number, type/category, and route affordance are secondary.

## Scope

In scope:

- Dex landing species cards
- Dex landing card spacing and hierarchy
- Dex landing mobile presentation
- Existing Dex routes and search behavior

Out of scope:

- Navigation renames
- Supabase schema changes
- Backend contract changes
- DB writes
- Route changes
- Vault logic
- Search logic outside Dex
- Non-Dex visual redesigns

## Card Hierarchy

Each Dex species card should present:

1. Large Pokemon sprite/image
2. Species name
3. National Dex number as secondary metadata
4. Primary completion metric
5. Known, owned, and missing print counts
6. Completion state and progress bar
7. Type/category chip as secondary context

The whole card may remain clickable. A separate `OPEN` button is not required.

## Mobile Requirements

- The species image must be large enough to read as the visual anchor.
- Names must not be aggressively truncated.
- The completion metric must be visible without hunting.
- Progress must be directly tied to the metric.
- No horizontal overflow.
- Bottom navigation must not cover important card content.

## Guardrails

- Keep nav labels: Search, Feed, Scan, Dex, Wall, Vault.
- Preserve dark mode tokens and safe-area behavior.
- Preserve existing Dex search.
- Preserve existing Dex routes.
- Do not add backend dependencies.
- Do not change card identity or vault ownership logic.

## Acceptance Criteria

- Ivysaur on mobile no longer looks cramped.
- A user immediately understands the screen tracks completion of every known printing for each Pokemon.
- `npm --prefix apps/web run typecheck` passes.
- `npm --prefix apps/web run lint` passes.
- `npm run web:build:strict` passes.
