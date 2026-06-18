# Web Sets And Dex Search Parity Phase 3 V1

Date: 2026-06-17

Status: implemented

## Objective

Continue moving the web experience toward the actual Grookai app feel.

This phase addressed two user-facing gaps:

- Sets landing felt too generic.
- Dex landing needed Pokemon character search.

## Changes

Updated:

- `apps/web/src/app/sets/page.tsx`
- `apps/web/src/components/sets/PublicSetTile.tsx`
- `apps/web/src/app/dex/page.tsx`
- `apps/web/src/lib/grookaiDex/getGrookaiDexSpecies.ts`
- `apps/web/src/app/globals.css`

## Sets Landing

Implemented:

- Replaced the generic Sets intro with an app-style premium hero.
- Added high-level collector stats:
  - total sets
  - total catalog rows
  - special set count
- Added a collector discovery section with recent sets.
- Preserved the existing set search, filters, result loading, and routes.
- Improved set tile dark-mode logo wash so set cards do not rely on a hardcoded white overlay.

Not changed:

- No set data query logic changed.
- No route changes.
- No DB writes.

## Dex Search

Implemented:

- Added server-backed Pokemon character search on `/dex`.
- Search supports:
  - display name
  - slug
  - National Dex number
- Search preserves pagination.
- Empty search results now render a clear app-style empty state.

Not changed:

- No ownership logic changed.
- No species detail page redesign.
- No vault logic changed.

## Verification

Passed:

```text
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
git diff --check
```

Known warning:

```text
apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx uses <img>.
```

This warning existed outside this phase.

## Next Recommended Step

Redesign the search/results grid hierarchy so card search feels less database-heavy and more like the actual app card surface.
