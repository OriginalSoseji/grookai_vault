# Web Dex Landing Parity Phase 2 V1

Date: 2026-06-17

Status: implemented

## Objective

Move the web Dex landing away from a table/admin layout and closer to the actual Grookai app Dex experience.

## Changes

Updated:

- `apps/web/src/app/dex/page.tsx`

Implemented:

- Replaced the table-style species list with app-style progress cards.
- Added a premium Dex hero surface.
- Preserved the existing server data path and pagination behavior.
- Kept completion percentage visible on every species row.
- Kept owned/total print counts visible on every species row.
- Added clear status labels:
  - `Complete`
  - `Started`
  - `Open`
- Reused shared Grookai visual primitives:
  - `gv-page-shell`
  - `gv-page-container`
  - `gv-page-rhythm`
  - `gv-hero-section`
  - `gv-soft-surface`
  - `gv-visual-card`
  - `gv-secondary-button`

## Not Changed

- No database logic changed.
- No Dex query logic changed.
- No routing changed.
- No vault ownership logic changed.
- No species detail page redesign yet.

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

This warning existed outside this Dex landing change.

## Next Recommended Step

Redesign the web Sets landing page to match the actual app Sets screen pattern:

```text
premium discovery surface, search/filter controls, and collector-focused set tiles.
```
