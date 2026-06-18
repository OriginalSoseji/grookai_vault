# Smart Search Phase 3 Pinnable Filters V1

Date: 2026-06-17

Status: implemented

## Objective

Make interpreted Smart Search filters easier to preserve and refine after a sentence search.

## Files Updated

- `apps/web/src/app/api/resolver/search/route.ts`
- `apps/web/src/components/explore/ExplorePageClient.tsx`

## What Changed

Added explicit URL-backed filter support for:

- `year_min`
- `year_max`
- `finish`
- `stamp`
- `owned`
- `image_state`
- `illustrator`

Added a `Pin smart filters` action in the Smart Search interpretation panel.

When clicked, a sentence query can be converted into a more structured URL.

Example sentence:

```text
Give me all reverse holos, Pikachus, from 2014-2026.
```

Can now be pinned toward:

```text
/explore?q=reverse+holo+pikachu&year_min=2014&year_max=2026&finish=reverse
```

## Refine Actions

The interpretation panel may now show:

- `Pin smart filters`
- `Search text only`
- `Pin artist filter`
- `Pin image filter`

These actions make parsing transparent instead of hidden.

## Safety

No DB writes.

No migrations.

No arbitrary SQL.

No card identity mutation.

Ownership-aware filters still use private cache behavior.

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

## Deferred

The next improvement should add visible advanced filter controls so users can edit pinned filters directly without manually changing the URL.
