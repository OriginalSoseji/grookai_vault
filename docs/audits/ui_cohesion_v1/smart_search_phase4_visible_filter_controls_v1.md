# Smart Search Phase 4 - Visible Filter Controls V1

Date: 2026-06-17

## Objective

Make the Smart Search filters directly editable from the Explore page instead of requiring users to understand URL parameters.

## What Changed

- Added a compact `Smart filters` editor to Explore search results.
- Exposed URL-backed filters for:
  - release year range
  - finish
  - image truth state
  - vault ownership state
  - illustrator
  - stamp or special label
- Preserved query, compare tray, view mode, sort mode, set filters, identity filters, and image confidence filters while applying smart filters.
- Added a `Clear smart filters` action that removes only the smart filter parameters.
- Updated Explore client requests so explicit smart filters are sent to `/api/resolver/search`.
- Kept natural-language interpretation intact while giving users a stable, shareable filter URL.

## Safety Notes

- No database writes.
- No API contract break.
- No resolver truth-rule changes.
- No pricing, vault, routing, or identity mutations.
- Filters remain constrained to the governed API parameters.

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
- Diff whitespace check passed for the changed Explore client.

## Remaining Follow-Up

The visible controls now make governed smart filters usable. The next higher-value step is to improve broad no-text filter discovery, such as "all exact images" or "all missing images", so filter-only searches can browse the whole catalog without requiring a query term.
