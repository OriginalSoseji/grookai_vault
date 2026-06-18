# Smart Search Phase 8 - Active Filter Chips V1

Date: 2026-06-17

## Objective

Make active Explore filters visible, countable, and removable.

## What Changed

- Added an `Active filters` panel above results.
- Shows the number of active filters and the current narrowed result count.
- Added removable chips for:
  - search text
  - set
  - year
  - year range
  - finish
  - stamp or special label
  - image truth/image confidence
  - vault ownership state
  - artist
  - identity filter
- Added a `Clear all` action when more than one filter is active.
- Preserved existing Smart Search interpretation and Smart Filters editor behavior.

## Safety Notes

- UI-only change.
- No database writes.
- No migrations.
- No resolver truth changes.
- No vault mutations.
- No API contract changes.

## Verification

Commands run:

```powershell
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
git diff --check -- apps/web/src/components/explore/ExplorePageClient.tsx
```

Results:

- Typecheck passed.
- Lint passed with the pre-existing warehouse `<img>` warning.
- Strict web build passed.
- Diff whitespace check passed.

## Remaining Follow-Up

Next high-value step:

- Add saved searches / preset searches for common collector workflows.
- Then layer AI-assisted query translation on top of the deterministic Smart Search contract.
